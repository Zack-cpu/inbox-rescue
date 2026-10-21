import json
import os
import secrets
import threading
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from . import gmail, store
from .rules import addresses, assess, headers

app = FastAPI(title="Inbox Rescue", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "testserver"])
CSRF = secrets.token_urlsafe(32)
LOCK = threading.Lock()
DEMO = os.environ.get("INBOX_RESCUE_DEMO", "1") == "1"
ALLOWED = {"SPAM", "CATEGORY_PROMOTIONS"}


@app.middleware("http")
async def protect(request: Request, call_next):
    if request.method != "GET" and not secrets.compare_digest(request.headers.get("x-rescue-token", ""), CSRF):
        return JSONResponse({"detail": "Invalid session token"}, status_code=403)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'"
    return response


@app.exception_handler(Exception)
async def unavailable(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse({"detail": "The operation could not be completed. Check your local Gmail authorization and network connection, then retry. If a restore failed, verify the message status in Gmail first."}, status_code=503)


@app.get("/")
def home():
    return FileResponse(Path(__file__).parent / "static/index.html")


@app.get("/ui.js")
def script():
    return FileResponse(Path(__file__).parent / "static/ui.js", media_type="text/javascript")


@app.get("/style.css")
def style():
    return FileResponse(Path(__file__).parent / "static/style.css", media_type="text/css")


@app.get("/api/session")
def session():
    return {"token": CSRF, "demo": DEMO}


@app.post("/api/scan")
def scan():
    if DEMO:
        return {"limited": False, "checked": 2, "items": [
            {"id": "demo", "sender": "Alex <alex@example.com>", "subject": "Re: Friday meeting plans", "labels": ["SPAM"], "reasons": ["This conversation includes a message you sent"], "warnings": ["Demo message; your real mailbox will not be changed"], "candidate": True},
            {"id": "demo2", "sender": "Deals <deals@example.com>", "subject": "This week's offers", "labels": ["CATEGORY_PROMOTIONS", "INBOX"], "reasons": [], "warnings": [], "candidate": False},
        ]}
    service = gmail.client()
    sent_ids, sent_limited = gmail.list_ids(service, "in:sent newer_than:90d", 300)
    sent_addresses, sent_threads = set(), set()
    for mid in sent_ids:
        m = gmail.get_message(service, mid)
        sent_addresses.update(addresses(headers(m).get("to", "")))
        sent_threads.add(m["threadId"])
    ids, limited = gmail.list_ids(service, "newer_than:7d {in:spam category:promotions} -in:trash", 100)
    return {"limited": limited or sent_limited, "checked": len(ids), "items": [assess(gmail.get_message(service, mid), sent_addresses, sent_threads) for mid in ids]}


@app.post("/api/restore/{message_id}")
def restore(message_id: str):
    if DEMO:
        return {"action_id": 0, "demo": True}
    with LOCK:
        service = gmail.client()
        current = set(gmail.get_message(service, message_id).get("labelIds", []))
        removed = sorted(current & ALLOWED)
        if not removed or "TRASH" in current:
            raise HTTPException(409, "This message is no longer in a restorable category. Scan again.")
        added = [label for label in ["INBOX", "CATEGORY_PERSONAL"] if label not in current]
        aid = store.prepare(message_id, added, removed)
        service.users().messages().modify(userId="me", id=message_id, body={"addLabelIds": added, "removeLabelIds": removed}).execute()
        store.mark(aid, "done")
        return {"action_id": aid}


@app.post("/api/undo/{action_id}")
def undo(action_id: int):
    if DEMO:
        return {"ok": True}
    with LOCK:
        row = store.action(action_id)
        if not row or row[3] != "done":
            raise HTTPException(409, "This action does not exist or has already been undone.")
        mid, added, removed, _ = row
        service = gmail.client()
        current = set(gmail.get_message(service, mid).get("labelIds", []))
        if not set(json.loads(added)) <= current or set(json.loads(removed)) & current or "TRASH" in current:
            raise HTTPException(409, "The message labels have changed. Check Gmail to avoid overwriting later changes.")
        service.users().messages().modify(userId="me", id=mid, body={"addLabelIds": json.loads(removed), "removeLabelIds": json.loads(added)}).execute()
        store.mark(action_id, "undone")
        return {"ok": True}
