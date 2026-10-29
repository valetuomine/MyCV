using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using Microsoft.Win32.SafeHandles;

namespace CV.WebApi.HostedServices
{
    /// <summary>
    /// A Windows job object that ends every process in it when it is disposed, or when the API ends without
    /// disposing it, such as with Stop Debugging in Visual Studio. The processes that a process in the job
    /// starts join the job too, so it ends a whole process tree. <c>Process.Kill(entireProcessTree: true)</c>
    /// can miss a grandchild on Windows, because it looks for a process's children only after ending it.
    /// </summary>
    internal sealed class KillOnCloseJob : IDisposable
    {
        private const int JobObjectExtendedLimitInformation = 9;
        private const uint JobObjectLimitKillOnJobClose = 0x2000;

        private readonly SafeFileHandle _handle;

        private KillOnCloseJob(SafeFileHandle handle)
        {
            _handle = handle;
        }

        /// <summary>
        /// Creates the job, or returns null when Windows refuses.
        /// </summary>
        [SupportedOSPlatform("windows")]
        public static KillOnCloseJob? TryCreate()
        {
            var handle = CreateJobObject(IntPtr.Zero, null);
            var limits = new ExtendedLimitInformation();
            limits.BasicLimitInformation.LimitFlags = JobObjectLimitKillOnJobClose;

            if (handle.IsInvalid
                || !SetInformationJobObject(handle, JobObjectExtendedLimitInformation, ref limits, (uint)Marshal.SizeOf<ExtendedLimitInformation>()))
            {
                handle.Dispose();
                return null;
            }

            return new KillOnCloseJob(handle);
        }

        /// <summary>
        /// Adds a started process to the job. Add it right after starting it, before it starts processes of its own.
        /// </summary>
        public bool TryAdd(Process process)
        {
            return AssignProcessToJobObject(_handle, process.SafeHandle);
        }

        public void Dispose()
        {
            _handle.Dispose();
        }

        [DllImport("kernel32.dll", EntryPoint = "CreateJobObjectW", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern SafeFileHandle CreateJobObject(IntPtr jobAttributes, string? name);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetInformationJobObject(SafeFileHandle job, int infoClass, ref ExtendedLimitInformation info, uint infoLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool AssignProcessToJobObject(SafeFileHandle job, SafeProcessHandle process);

        /// <summary>
        /// JOBOBJECT_BASIC_LIMIT_INFORMATION.
        /// </summary>
        [StructLayout(LayoutKind.Sequential)]
        private struct BasicLimitInformation
        {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        /// <summary>
        /// IO_COUNTERS.
        /// </summary>
        [StructLayout(LayoutKind.Sequential)]
        private struct IoCounters
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        /// <summary>
        /// JOBOBJECT_EXTENDED_LIMIT_INFORMATION.
        /// </summary>
        [StructLayout(LayoutKind.Sequential)]
        private struct ExtendedLimitInformation
        {
            public BasicLimitInformation BasicLimitInformation;
            public IoCounters IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }
    }
}
