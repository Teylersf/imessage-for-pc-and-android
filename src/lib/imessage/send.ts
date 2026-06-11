import { execFile } from "node:child_process";

function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) {
        const detail = (stderr || err.message || "").trim();
        if (/not authorized|not allowed|-1743|errAEEventNotPermitted/i.test(detail)) {
          reject(
            new Error(
              "Automation permission denied. Allow your terminal app to control Messages in System Settings → Privacy & Security → Automation."
            )
          );
          return;
        }
        reject(new Error(detail || "osascript failed"));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function escapeAS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Send to a 1:1 conversation by handle (phone/email). */
export async function sendToBuddy(
  handle: string,
  service: string,
  message: string
): Promise<void> {
  const svc = service.toLowerCase().includes("sms") ? "SMS" : "iMessage";
  const script = `
    tell application "Messages"
      set targetService to 1st account whose service type = ${svc}
      set targetBuddy to participant "${escapeAS(handle)}" of targetService
      send "${escapeAS(message)}" to targetBuddy
    end tell
  `;
  await runAppleScript(script);
}

/** Send to an existing chat (group or 1:1) by its chat guid. */
export async function sendToChat(guid: string, message: string): Promise<void> {
  const script = `
    tell application "Messages"
      send "${escapeAS(message)}" to chat id "${escapeAS(guid)}"
    end tell
  `;
  await runAppleScript(script);
}

/** Send a file (image/video/etc.) to a 1:1 conversation by handle. */
export async function sendFileToBuddy(
  handle: string,
  service: string,
  filePath: string
): Promise<void> {
  const svc = service.toLowerCase().includes("sms") ? "SMS" : "iMessage";
  const script = `
    set theFile to POSIX file "${escapeAS(filePath)}"
    tell application "Messages"
      set targetService to 1st account whose service type = ${svc}
      set targetBuddy to participant "${escapeAS(handle)}" of targetService
      send theFile to targetBuddy
    end tell
  `;
  await runAppleScript(script);
}

/** Send a file to an existing chat (group or 1:1) by its chat guid. */
export async function sendFileToChat(guid: string, filePath: string): Promise<void> {
  const script = `
    set theFile to POSIX file "${escapeAS(filePath)}"
    tell application "Messages"
      send theFile to chat id "${escapeAS(guid)}"
    end tell
  `;
  await runAppleScript(script);
}
