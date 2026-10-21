import os
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

DATA = Path(os.environ.get("INBOX_RESCUE_DATA", "data"))
SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]


def save_token(creds):
    DATA.mkdir(parents=True, exist_ok=True)
    path = DATA / "token.json"
    path.write_text(creds.to_json(), encoding="utf-8")
    path.chmod(0o600)


def connect():
    flow = InstalledAppFlow.from_client_secrets_file(str(DATA / "credentials.json"), SCOPES)
    save_token(flow.run_local_server(host="localhost", port=0))


def client():
    path = DATA / "token.json"
    if not path.exists():
        raise RuntimeError("Connect Gmail first: python -m rescue.auth")
    creds = Credentials.from_authorized_user_file(str(path), SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        save_token(creds)
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def list_ids(service, query, limit):
    result, token = [], None
    while len(result) < limit:
        page = service.users().messages().list(
            userId="me", q=query, includeSpamTrash=True,
            maxResults=min(100, limit - len(result)), pageToken=token,
        ).execute()
        result.extend(m["id"] for m in page.get("messages", []))
        token = page.get("nextPageToken")
        if not token:
            break
    return result, bool(token)


def get_message(service, message_id):
    return service.users().messages().get(
        userId="me", id=message_id, format="metadata",
        metadataHeaders=["From", "To", "Subject", "Authentication-Results"],
    ).execute()
