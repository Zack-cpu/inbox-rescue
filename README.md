# Inbox Rescue ✉

Find important Gmail messages misplaced in Spam and Promotions. Self-hosted, explainable rules, and manual review before restoring.

**Early local prototype:** one account, manual scans, no AI service, no automatic restores, and no mail sending.

## Try the demo

**Browser extension:** To try the side panel without Python, follow [extension/README.md](extension/README.md). Version 0.2 includes demo mode and a real Gmail connection flow requiring one-time developer OAuth configuration. Live browser validation is still required. The instructions below describe the separate Python prototype.

Install Python 3.11+ and run from the project directory:

```sh
python -m venv .venv
```

Activate the environment on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

On macOS / Linux:

```sh
source .venv/bin/activate
```

Then install and start the app:

```sh
python -m pip install -e '.[dev]'
python -m uvicorn rescue.app:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. Demo mode is enabled by default and uses fictional messages. Try scanning, restoring, and undoing without connecting a mailbox.

If PowerShell blocks activation, use `.venv\Scripts\python.exe` instead of `python` in the commands above.

## Connect your Gmail account

1. Create a Google Cloud project and enable the Gmail API.
2. Configure the Google Auth consent screen. For personal Gmail, choose External; in Testing mode, add your address as a test user. Configure the scope `https://www.googleapis.com/auth/gmail.modify`.
3. Create an OAuth client of type **Desktop app**. Download the JSON file and save it as `data/credentials.json`, creating the `data/` directory first. Never upload this file.
4. In your activated local environment, run `python -m rescue.auth` and complete Google authorization in the browser. The token is saved in `data/token.json`.
5. Enable real mailbox mode and start the app:

```powershell
# Windows PowerShell
$env:INBOX_RESCUE_DEMO="0"
python -m uvicorn rescue.app:app --host 127.0.0.1 --port 8000
```

```sh
# macOS / Linux
INBOX_RESCUE_DEMO=0 python -m uvicorn rescue.app:app --host 127.0.0.1 --port 8000
```

The authorization flow follows the [official Gmail Python quickstart](https://developers.google.com/workspace/gmail/api/quickstart/python). Each self-hosting user configures their own OAuth project. A publicly hosted service requires a separate assessment of Google's app verification and user-data policies. Testing-mode authorizations may expire and require reconnecting.

The `gmail.modify` scope is broad: it permits reading and modifying mail, and technically also permits sending. This project implements no sending operation. Modification access supports user-confirmed restores and undo.

## How the first version works

- Scans up to 100 messages in Spam and Promotions from the last 7 days, excluding Trash.
- Checks up to 300 sent messages from the last 90 days for recipient-address and conversation matches.
- Shows the correspondence evidence for each candidate. Authentication failures reported in headers trigger a warning. Neither correspondence nor authentication headers prove a message is safe.
- Separates the review queue into Spam and Promotions, with counts reflecting the active correspondence filter. Messages with both labels appear under Spam.
- Lets you review all checked messages. Messages without correspondence evidence may still be important. Reaching a scan limit is disclosed as incomplete coverage.
- After you confirm a restore, removes `SPAM` / `CATEGORY_PROMOTIONS`, adds `INBOX` / `CATEGORY_PERSONAL`, and records the label delta in local SQLite storage.
- Undo reverses only that delta, preserves unrelated labels, and refuses obvious later conflicts. Its button remains available until a refresh or rescan. Dismissals apply only to the current scan.

New senders usually have no correspondence history. This project cannot guarantee that it finds every missed message or controls future Gmail classification. Gmail links use the first account in your browser; switch to the authorized account if necessary.

## Privacy

Mail is processed locally without AI analysis or analytics services. Gmail API responses may contain snippets, but these are not displayed or stored. The local database stores only action message IDs and label changes. Authorization tokens are stored unencrypted in `data/`; protect the directory with your operating system's account permissions. It is excluded from Git and Docker image builds.

Use this prototype only on a trusted personal computer. Do not expose its port to your LAN or the internet. See [SECURITY.md](SECURITY.md) for limitations, disconnect instructions, and failure handling.

## Docker

```sh
docker compose up --build
```

This starts demo mode at http://127.0.0.1:8000. For real mailbox mode, authorize on the host first, then set `INBOX_RESCUE_DEMO=0` before starting Compose. The container's non-root user needs write access to the mounted `data/` directory. Docker deployment has not been verified on every platform.

## Development and contributions

```sh
python -m pytest -q
```

`rescue/gmail.py` handles the mailbox API, `rules.py` evaluates correspondence, `store.py` records actions, and `app.py` serves the local interface and API. Tests use simulated Gmail responses and never change real messages. Live authorization and mailbox changes still require validation with a test account.

See the [contribution guide](CONTRIBUTING.md). MIT licensed.

Next priorities: test-account validation → persistent review and undo history → configurable and incremental scans → Outlook support.
