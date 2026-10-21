# Inbox Rescue browser extension — demo

A Manifest V3 side panel for desktop Chrome and Microsoft Edge. This milestone demonstrates the review flow with fictional messages only. It does not connect to Gmail, read web pages, restore real mail, or contact a server. No Python installation is needed.

## Load it locally

1. Use a current desktop Chrome or Edge release (Chrome 116+ API baseline).
2. Open `chrome://extensions` in Chrome, or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this `extension/` folder, which contains `manifest.json`. If using the ZIP, extract it first. Do not select the repository root or the ZIP itself.
5. Open Gmail as usual, then click the browser's Extensions menu and select **Inbox Rescue — Demo**. Pin it to the toolbar for easier access. The review panel opens beside your page.

The panel can also open beside other websites. It does not inspect the current page or its signed-in account.

## Try the flow

- Click **Try a demo scan**: five fictional messages load.
- **Spam (2)** and **Promotions (1)** initially show only messages with correspondence evidence.
- Enable **Show all checked messages** to see **Spam (3)** and **Promotions (2)**.
- Select **Restore to Primary**, confirm in the dialog, then **Undo restore**. Only simulated label state changes.
- **Dismiss for now** hides a message from this demo scan. Restored messages retain an undo button rather than a dismiss button.
- **Reset demo** clears results. Reloading the panel also clears all demo state. A new scan resets the fixtures.

Counts follow the active filter and exclude dismissed messages. A message with both Spam and Promotions labels appears only under Spam. Restored messages remain in their original review category so you can undo them.

After changing extension code, click **Reload** on its extensions-page card, close the panel, and reopen it. This extension is separate from the Python app and does not use localhost ports.

## Privacy and permissions

Only `sidePanel` is requested. No identity, storage, tabs, content scripts, or website access permissions are requested. The extension CSP blocks network connections. There is no Connect Gmail button until an actual authorization flow is implemented; the demo badge is always visible.

## Development

No build step or dependencies. With Node.js 18+:

```sh
node --test extension/tests/demo.test.mjs
```

Run from the repository root. The suite covers category precedence, filtering, dismissals, reversible label changes, clean reset, and the manifest's permission boundary. Actual side-panel opening and installation still need a manual check in Chrome and Edge.

## Next milestone

Implement browser-specific OAuth configuration, Connect/Disconnect, and real Gmail API calls. The previous desktop OAuth JSON and Python tokens are not reused. Public distribution also needs the relevant Google OAuth verification and browser-store review. This demo is not a published or verified Gmail integration.

References: [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [Edge sidebar extensions](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/sidebar).
