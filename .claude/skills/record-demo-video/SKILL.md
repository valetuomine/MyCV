---
name: record-demo-video
description: 'Record a smooth demo video (MP4, 60 fps) of the running MyCV app with the Playwright MCP browser, as a signed-in user, without browser chrome. Use when asked for a demo video, walkthrough video, screen recording or showcase of the current state of the app.'
argument-hint: '[what the video should show]'
user-invocable: true
---

# Record A Demo Video

Records the running app in the `playwright` MCP server's own Chrome window and encodes a 60 fps H.264 MP4. The result goes to `.playwright-mcp/` (git-ignored). Nothing is committed, and no tracked file stores the video.

## Why this way

Three simpler routes were tried and rejected:

- `page.screencast.start({ path })` of Playwright produces a 25 fps VP9 `.webm` that looks choppy, and its `showActions` overlay ("Mouse move") stays in the page and leaks into later recordings. Call `page.screencast.hideActions()` before recording.
- Screen capture with ffmpeg `gdigrab` shows the taskbar, the "controlled by automated software" infobar and any window on top, because the window is not in real F11 fullscreen.
- Playwright's bundled ffmpeg cannot encode H.264.

What works: take the browser's own frame stream over CDP (`Page.startScreencast`, about 65 to 90 frames per second while something animates, frames only arrive on change), save every JPEG with its timestamp, and rebuild a constant 60 fps video from the timestamps with ffmpeg's concat demuxer.

## Prerequisites

This skill is written for Windows (`ffmpeg.exe`, `netstat`, `taskkill`). On another system, swap those commands for their equivalents.

1. The frontend (`http://localhost:3000`) and API (`http://localhost:5062`) run. Check with `curl`, and reuse what is running.
2. The user has signed in in the `playwright` MCP browser if the video needs an admin view. Ask them to, and wait. Sign-in lives in that browser, so record in that same session. Do not start a new browser.
3. A full ffmpeg with `libx264`, in the scratchpad directory, never installed system-wide:

   ```bash
   mkdir -p "$S/ff" && cd "$S/ff" && npm init -y && npm i ffmpeg-static
   ```

   `$S` is the scratchpad directory. The binary is `$S/ff/node_modules/ffmpeg-static/ffmpeg.exe`.

## Local scripts

The three scripts in `scripts/` (`recv.mjs`, `build.mjs`, `record.template.js`) are git-ignored, because the skill is used only now and then. A fresh clone or a cloud session does not have them. If `scripts/` is empty, write them again from this description in the scratchpad directory and adjust the paths in the steps:

- `recv.mjs <frames dir> [port]`: a local HTTP server on 127.0.0.1. `POST /frame?i=<index>&t=<seconds>` validates both parameters (400 otherwise) and saves the body as `<index padded to 6>_<t>.jpg`. `POST /clear` deletes only the `.jpg` files. It allows CORS and exits with an error if it cannot start.
- `build.mjs <frames dir> [concat.txt]`: lists the `.jpg` files in order and writes an ffmpeg concat list whose durations are the differences of the timestamps in the file names (last frame 1.5 s). It exits with a usage message on a missing or empty directory.
- `record.template.js`: the `browser_run_code_unsafe` script described in step 4.

## Steps

1. **Plan the flow** with the user: which pages and interactions, and what must not be saved. Use data that is already in the database and never save anything. The video may show real data, so keep personal data such as the account's e-mail address (shown in the admin view's sign-in methods section) out of frame by not scrolling to it.
2. **Go fullscreen** through `browser_run_code_unsafe`:

   ```js
   const s = await page.context().newCDPSession(page);
   const { windowId } = await s.send('Browser.getWindowForTarget');
   await s.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'fullscreen' } });
   ```

   F11 does not reach a browser driven over CDP. The frame stream contains only the page, so the browser chrome never appears in the video either way.
3. **Start the frame receiver.** The `browser_run_code_unsafe` sandbox has `fetch` and `Buffer` but no `fs`, so it posts each frame to a small local server. Run it as a background Bash command (`run_in_background`) with an empty directory in the scratchpad:

   ```bash
   node .claude/skills/record-demo-video/scripts/recv.mjs "<frames dir>" 5599
   ```

   `POST /clear` empties the directory.
4. **Record.** Paste `scripts/record.template.js` into `browser_run_code_unsafe`, replace the `FLOW` section with the planned steps and run it. It:
   - calls `hideActions()` and clears the frames directory,
   - injects a visible white cursor, because CDP mouse events draw no pointer,
   - moves the mouse with `glide` in small eased steps (about 125 Hz), because teleporting the pointer makes hover effects jump,
   - posts every frame as `<index>_<timestamp>.jpg` and acknowledges each one, so the stream keeps coming,
   - aborts every write request (anything but GET, HEAD and OPTIONS) to the API with `page.route`, because it also accepts every dialog and a misplaced click must not save real data. Remove the route only if the flow has to save,
   - starts the mouse at the viewport's lower middle, and returns `scale` for the encoder.

   Re-inject the cursor after any full page load (`injectCursor` is idempotent). An open edit form raises a `beforeunload` dialog on `goto`, and the template accepts dialogs. If a dialog is raised while the script runs, the tool call may return early while the script keeps running, so wait until the frame count in the directory stops growing before encoding.
5. **Encode.** `concat.txt` goes to the scratchpad, never the repository root, because it holds local paths. Take `scale` from the `scale` value that the recording returned (the page size scaled to fit 2560 pixels, even numbers):

   ```bash
   node .claude/skills/record-demo-video/scripts/build.mjs "<frames dir>" "$S/concat.txt"
   "$S/ff/node_modules/ffmpeg-static/ffmpeg.exe" -y -f concat -safe 0 -i "$S/concat.txt" \
     -vf "fps=60,scale=<scale>:flags=lanczos,format=yuv420p" \
     -c:v libx264 -preset medium -crf 16 -movflags +faststart -r 60 .playwright-mcp/demo.mp4
   ```

   Encoding takes about as long as the video lasts, so run it in the background.
6. **Check** a few frames and look at them: no overlay text, no browser chrome, error states and PDFs rendered, no personal data. Re-record if something is wrong.

   ```bash
   "$S/ff/node_modules/ffmpeg-static/ffmpeg.exe" -ss <s> -i .playwright-mcp/demo.mp4 -frames:v 1 -vf scale=1280:-2 "$S/frame.png"
   ```

7. **Clean up:** stop the receiver (find it with `netstat -ano | grep :5599`, then `taskkill //F //PID <pid>`), and delete the frames, `concat.txt` and the probe images. Leave the ffmpeg in the scratchpad.

## Flow notes for this app

- The CV page is `/<public url segment>`, the admin form opens from its "Muokkaa profiilia" button, and the PDF view is `/<segment>/pdf`. The API prints the PDF and caches it for an hour, so wait for its `canvas` to appear and then pause about 5 s.
- The UI is Finnish by default. Button and link names: "Avaa CV", "Kopioi CV:n linkki", "Näytä PDF:nä", "Takaisin CV:hen", "Muokkaa profiilia", "Tallenna", "Peruuta". The theme button matches `/Vaihda .* teemaan/`, and the language buttons are "Suomeksi" and "In English".
- An empty "Koko nimi" plus "Tallenna" shows the required-field error without sending anything. Typing the name back and pressing "Peruuta" closes the form without a confirmation. Cancelling with real edits shows a "Hylätäänkö tallentamattomat muutokset?" bar that needs "Hylkää".
- Tabbing from "Ammattinimike (suomeksi)" visits "Tiivistelmä" and "Sijainti" and shows the focus animation.
- The name's weight wave follows the pointer over the `h1`, and the profile picture reacts to hover. Move slowly across them.
- Hold each state for 1.5 to 3 s so a viewer can read it. The whole video should stay around 1 to 1.5 minutes.

## Known limits

- Frames only arrive when the page repaints, so very fast animations can still look slightly steppy. This was judged good enough.
- An ultrawide display gives a very wide video. For 16:9, set a fixed window size with `Browser.setWindowBounds` (`windowState: 'normal'`, `width`, `height`) instead of fullscreen. The returned `scale` follows the window.
