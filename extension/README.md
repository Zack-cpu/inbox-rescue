# Inbox Rescue browser extension

Review Gmail messages misplaced in Spam and Promotions, beside your inbox. No Python installation or local server is required.

## Use it

1. Install the extension and open its side panel from the browser toolbar.
2. Click **Connect Gmail**, choose your Google account, and approve Gmail access.
3. Your first scan starts automatically. Switch between **Spam** and **Promotions** to review results.
4. Open a message in Gmail to check it, then confirm **Restore to Primary** if appropriate. Use **Undo restore** to reverse that action.

You do not need a Google Cloud project, JSON file, terminal command, or client ID. **Try a demo instead** is optional and never touches real mail.

This is a test release. The project maintainer must register the package's redirect URL and permit test accounts in Google Cloud. Public availability still requires the applicable Google verification and browser-store review.

## Install the test package

Extract the configured ZIP first. Open `edge://extensions` or `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select the extracted folder containing `manifest.json`. Pin Inbox Rescue to your toolbar.

The configured package uses a fixed test extension ID, so its callback does not depend on the installation folder. It is separate from the older source-folder installation. Disable the old test extension before using the package. The fixed test key does not guarantee the same ID for a future store publication.

Developers may still load this repository's `extension/` folder for development. Its public client ID is preconfigured, but without the release manifest's key its redirect is specific to that installation. This setup is for maintainers, not end users; see [MAINTAINERS.md](MAINTAINERS.md).

## Connection and privacy

- The actual authorized Gmail address is shown after the profile check. The extension does not read the Gmail web page or infer its active account.
- The public project client ID is bundled with the app and takes precedence over legacy local settings. There are no client-ID or redirect fields in the normal panel.
- Google authorization uses a browser identity window with callback, random-state, expiry, and scope validation. Edge uses the documented client-side access-token flow, not Chrome-only getAuthToken. No client secret or refresh token is distributed.
- Access tokens and account details are kept in browser-session storage. Access is temporary; click Connect Gmail when asked to reconnect. The app does not open authorization automatically on startup.
- Disconnect clears local authorization and requests Google revocation. If offline, finish revoking access in Google Account connections. Existing mail changes remain in place.
- Mail is processed in your browser, with requests only to Google. There are no content scripts, telemetry, remote scripts, third-party AI requests, or email image/attachment rendering. Sender and subject text use textContent.
- Google requests the broad gmail.modify permission; it technically permits sending, but this extension implements no send operation.

## Review behavior

A scan checks up to 300 sent messages from 90 days for To/Cc address and conversation matches, then up to 100 Spam/Promotions messages from 7 days, excluding Trash. Progress reports completed message counts; limits are disclosed. Rules can miss important mail, especially from new senders.

Both queues initially show all checked messages. Uncheck **Show all checked messages** to see only correspondence matches. Spam wins if both labels exist. Counts reflect the active filter and dismissals. Correspondence and authentication header text are evidence, not proof of safety.

Confirmed restores reread labels and apply only the required changes. Undo reverses that delta, preserves unrelated labels, and rejects obvious conflicts. Undo state and metadata live in the current panel; clearing results, rescanning, reloading, disconnecting, or reconnecting removes undo buttons. Restored messages stay in the original review category to keep undo accessible. Updates are not transactional with concurrent Gmail changes. After a failed update, inspect Gmail before retrying because its outcome may be uncertain.

## Development

Node.js 22+; no build dependencies:

```sh
node --test extension/tests/*.test.mjs
```

Tests simulate Google/browser APIs, including the actual panel's connect-to-scan flow. They do not perform real OAuth or mailbox mutations. Manual browser checks are still required. Maintainer configuration and packaging instructions are in [MAINTAINERS.md](MAINTAINERS.md).
