# Install Inbox Rescue Preview

**Time:** about one minute after downloading. **Browsers:** current desktop Chrome or Microsoft Edge.

Anyone can use the fictional demo. Real Gmail requires an invited test account while the project's Google app is in Testing. Downloading the extension does not automatically grant that invitation. Public self-service Gmail sign-up is not open yet.

## 1. Download and extract

Open https://github.com/Zack-cpu/inbox-rescue/releases and download the asset named `inbox-rescue-extension-v0.3.0-preview.zip`.

Do not download GitHub's automatically generated **Source code (zip)** for installation. The configured extension asset includes the fixed test identity and public OAuth configuration. If no asset is listed, the Preview release has not been published yet.

Extract the ZIP to a permanent folder. Inside it, find the `inbox-rescue-extension` folder containing `manifest.json`. Keep this folder after installation; your browser loads files from it.

## 2. Load the extension

| Browser | Open in the address bar |
| --- | --- |
| Microsoft Edge | `edge://extensions` |
| Google Chrome | `chrome://extensions` |

Enable **Developer mode**, click **Load unpacked**, and select the folder that directly contains `manifest.json`.

If an older Inbox Rescue test extension is installed from another folder, disable it first to avoid opening the wrong version. You do not need to remove unrelated extensions or change your Gmail settings.

## 3. Open beside Gmail

Open Gmail as usual. Click the browser's Extensions (puzzle) menu, find **Inbox Rescue**, and pin it. Click its toolbar icon to open the side panel.

- **Try a demo instead:** fictional mail only; no account authorization needed.
- **Connect Gmail:** for invited accounts. Choose the invited Google account and review the requested permission. Your first scan starts automatically after connection.

No client ID, JSON file, Python process, terminal command, or local server is needed.

## 4. Review messages

Switch between Spam and Promotions. All checked messages are shown initially; uncheck **Show all checked messages** to filter to correspondence matches.

Use **View in Gmail** to inspect a message. Verify that Gmail is showing the connected account. Only choose **Restore to Primary** after checking the sender. **Undo restore** remains available until the results are cleared, rescanned, or the panel reloads.

## Update

Download a new configured release, extract it, and replace only the old extension application's files with the new release files. Return to your browser's extensions page and click **Reload**, then close and reopen the panel. Alternatively load the new folder and disable the old installation.

Reconnect if prompted. The preview does not automatically update from GitHub. The checked-in test key keeps the configured package identity stable; future store identities may differ.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Cannot find `manifest.json` | Extract the ZIP first and select its inner extension folder. |
| No side panel | Use a current desktop browser, reload the extension, and click its toolbar icon. |
| Google says access is blocked / app is in testing | Real access requires an invited test account. Confirm the account with the maintainer; do not create your own Cloud project just to use the release. |
| `redirect_uri_mismatch` | Check that you installed the configured release asset, not the source ZIP. Report the issue; this is a maintainer configuration problem. |
| Connection expires | Click Connect Gmail again. Tokens are temporary. |
| Scan fails | Check the connection, then retry. A failed read does not mean there are no messages. |
| Restore/undo fails | Inspect the message in Gmail before retrying; its label update may already have succeeded. |
| No recommendations | Switch categories or show all checked messages. No correspondence match does not mean unimportant. |

Report problems at https://github.com/Zack-cpu/inbox-rescue/issues/new/choose. Do not post tokens, OAuth JSON, full email addresses, or private message contents. Read the privacy summary at https://github.com/Zack-cpu/inbox-rescue/blob/main/docs/PRIVACY.md.
