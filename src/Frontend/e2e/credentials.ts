import { execFile } from "node:child_process"
import { inspect, promisify } from "node:util"
import type { E2EProvider } from "./settings.ts"

/** Runs a program and resolves with its output, without a shell. */
const run = promisify(execFile)

/** A test user's sign-in name and password, read from Windows Credential Manager. */
export interface TestCredentials {
  readonly username: string
  readonly password: string
}

/**
 * Names the Windows Credential Manager entry that holds a sign-in method's
 * test user, such as `MyCV-e2e-microsoft`.
 *
 * @param provider - The sign-in method.
 * @returns The generic credential's target name.
 */
export function credentialTarget(provider: E2EProvider): string {
  return `MyCV-e2e-${provider.name}`
}

/**
 * Tells how to save a sign-in method's test user in Credential Manager.
 * `cmdkey /pass` asks for the password, so it stays out of the command
 * history.
 *
 * @param provider - The sign-in method.
 * @returns The instruction, without any credential.
 */
export function saveCredentialsHint(provider: E2EProvider): string {
  return `To let the session renew itself, save the ${provider.label} test user once in Windows Credential Manager: cmdkey /generic:${credentialTarget(provider)} /user:<test user's sign-in name> /pass (it asks for the password).`
}

/**
 * Builds the PowerShell script that reads one generic credential with the
 * Windows CredRead API. It prints nothing when the entry doesn't exist, and
 * otherwise the sign-in name and password as Base64 of UTF-8 JSON, so any
 * character survives the console's code page. The script holds no secret,
 * only the target name, which comes from a fixed list.
 *
 * @param target - The credential's target name.
 * @returns The script.
 */
function buildCredReadScript(target: string): string {
  return String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class MyCvCredentialReader {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  private struct Credential {
    public int Flags;
    public int Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize;
    public IntPtr CredentialBlob;
    public int Persist;
    public int AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }
  [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern bool CredRead(string target, int type, int flags, out IntPtr credential);
  [DllImport("advapi32.dll")]
  private static extern void CredFree(IntPtr buffer);
  public static string[] Read(string target) {
    IntPtr pointer;
    if (!CredRead(target, 1, 0, out pointer)) {
      int error = Marshal.GetLastWin32Error();
      if (error == 1168) { return null; }
      throw new Win32Exception(error);
    }
    try {
      Credential credential = (Credential)Marshal.PtrToStructure(pointer, typeof(Credential));
      string secret = credential.CredentialBlobSize > 0
        ? Marshal.PtrToStringUni(credential.CredentialBlob, credential.CredentialBlobSize / 2)
        : "";
      return new string[] { credential.UserName ?? "", secret };
    } finally {
      CredFree(pointer);
    }
  }
}
'@
$entry = [MyCvCredentialReader]::Read('${target}')
if ($null -eq $entry) { exit 0 }
$json = ConvertTo-Json -Compress @{ username = $entry[0]; password = $entry[1] }
[Console]::Out.Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json)))
`
}

/**
 * Runs the CredRead script in a child PowerShell without the user's profile.
 * The script goes in `-EncodedCommand`, which holds no secret; the credential
 * comes back only on the child's standard output, into memory. A failure
 * never repeats that output, so the password can't reach an error message.
 *
 * @param provider - The sign-in method whose entry to read.
 * @returns The script's standard output, or null when not on Windows.
 */
async function runCredRead(provider: E2EProvider): Promise<string | null> {
  if (process.platform !== "win32") {
    return null
  }
  /** The entry's target name, checked so the script never reads another entry. */
  const target = credentialTarget(provider)
  if (!/^MyCV-e2e-[a-z]+$/.test(target)) {
    throw new Error(`Refused to read the unexpected credential name ${target}.`)
  }
  /** The script as Base64 of UTF-16LE, the encoding that `-EncodedCommand` expects. */
  const encodedScript = Buffer.from(
    buildCredReadScript(target),
    "utf16le",
  ).toString("base64")
  try {
    const { stdout } = await run(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedScript],
      { windowsHide: true, timeout: 60_000, maxBuffer: 64 * 1024 },
    )
    return stdout.trim()
  } catch {
    throw new Error(
      `Couldn't read the Windows credential ${target}. Check it with cmdkey /list:${target}.`,
    )
  }
}

/**
 * Wraps a sign-in name and password so that logging or serialising the
 * object by mistake shows neither: both fields are non-enumerable, and
 * `JSON.stringify` and `console.log` print a placeholder.
 *
 * @param username - The test user's sign-in name.
 * @param password - The test user's password.
 * @returns The credentials.
 */
function protectCredentials(
  username: string,
  password: string,
): TestCredentials {
  /** The placeholder that shows instead of the credentials. */
  const redacted = "[TestCredentials redacted]"
  return Object.defineProperties(
    {},
    {
      username: { value: username, enumerable: false },
      password: { value: password, enumerable: false },
      toJSON: { value: () => redacted, enumerable: false },
      toString: { value: () => redacted, enumerable: false },
      [inspect.custom]: { value: () => redacted, enumerable: false },
    },
  ) as TestCredentials
}

/**
 * Removes the sign-in name and password from a text, such as a Playwright
 * error whose call log quotes a filled field, before it is shown.
 *
 * @param text - The text to clean.
 * @param credentials - The credentials to remove.
 * @returns The text with every occurrence replaced by `[redacted]`.
 */
export function redactCredentials(
  text: string,
  credentials: TestCredentials,
): string {
  return [credentials.password, credentials.username]
    .filter((secret) => secret.length > 0)
    .reduce((cleaned, secret) => cleaned.split(secret).join("[redacted]"), text)
}

/**
 * Reads a sign-in method's test user from Credential Manager. Only the
 * session recording script calls this, and nothing writes the result to a
 * file, a log or an error.
 *
 * @param provider - The sign-in method.
 * @returns The credentials, or null when the entry doesn't exist or this isn't Windows.
 */
export async function readCredentials(
  provider: E2EProvider,
): Promise<TestCredentials | null> {
  const output = await runCredRead(provider)
  if (!output) {
    return null
  }
  let entry: unknown
  try {
    entry = JSON.parse(Buffer.from(output, "base64").toString("utf8"))
  } catch {
    throw new Error(
      `Couldn't decode the Windows credential ${credentialTarget(provider)}.`,
    )
  }
  if (
    typeof entry !== "object" ||
    entry === null ||
    !("username" in entry) ||
    !("password" in entry) ||
    typeof entry.username !== "string" ||
    typeof entry.password !== "string" ||
    !entry.username ||
    !entry.password
  ) {
    throw new Error(
      `The Windows credential ${credentialTarget(provider)} has no sign-in name or password. ${saveCredentialsHint(provider)}`,
    )
  }
  return protectCredentials(entry.username, entry.password)
}
