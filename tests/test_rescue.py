from fastapi.testclient import TestClient
from rescue import app as module
from rescue.rules import assess


def message(sender="Alex <alex@example.com>", labels=None):
    return {"id": "a", "threadId": "t", "labelIds": labels or ["SPAM"], "payload": {"headers": [{"name": "From", "value": sender}, {"name": "Subject", "value": "<script>test</script>"}]}}


def test_display_name_is_not_a_relationship():
    assert not assess(message("alex@example.com <attacker@example.net>"), {"alex@example.com"}, set())["candidate"]


def test_relationship_does_not_hide_auth_failure():
    m = message()
    m["payload"]["headers"].append({"name": "Authentication-Results", "value": "mx.google.com; dmarc=fail"})
    result = assess(m, {"alex@example.com"}, set())
    assert result["candidate"] and result["warnings"]


def test_local_api_requires_session_token():
    with TestClient(module.app) as client:
        assert client.post("/api/scan").status_code == 403
        token = client.get("/api/session").json()["token"]
        assert client.post("/api/scan", headers={"x-rescue-token": token}).status_code == 200
        assert client.get("/", headers={"host": "evil.example"}).status_code == 400


class Call:
    def __init__(self, value): self.value = value
    def execute(self): return self.value


class FakeGmail:
    def __init__(self): self.labels = {"SPAM", "UNREAD", "STARRED"}; self.changes = []
    def users(self): return self
    def messages(self): return self
    def get(self, **kwargs): return Call(message(labels=sorted(self.labels)))
    def modify(self, body, **kwargs):
        self.labels.update(body["addLabelIds"])
        self.labels.difference_update(body["removeLabelIds"])
        self.changes.append(body)
        return Call({})


def test_restore_undo_preserves_unrelated_labels(monkeypatch, tmp_path):
    fake = FakeGmail()
    monkeypatch.setattr(module, "DEMO", False)
    monkeypatch.setattr(module.gmail, "client", lambda: fake)
    monkeypatch.setattr(module.store, "DATA", tmp_path)
    with TestClient(module.app) as client:
        h = {"x-rescue-token": client.get("/api/session").json()["token"]}
        restored = client.post("/api/restore/a", headers=h)
        aid = restored.json()["action_id"]
        assert fake.labels == {"INBOX", "CATEGORY_PERSONAL", "UNREAD", "STARRED"}
        fake.labels.add("custom")
        assert client.post(f"/api/undo/{aid}", headers=h).status_code == 200
        assert fake.labels == {"SPAM", "UNREAD", "STARRED", "custom"}
        assert client.post(f"/api/undo/{aid}", headers=h).status_code == 409


def test_undo_refuses_conflicting_change(monkeypatch, tmp_path):
    fake = FakeGmail()
    monkeypatch.setattr(module, "DEMO", False)
    monkeypatch.setattr(module.gmail, "client", lambda: fake)
    monkeypatch.setattr(module.store, "DATA", tmp_path)
    aid = module.restore("a")["action_id"]
    fake.labels.add("TRASH")
    with TestClient(module.app) as client:
        h = {"x-rescue-token": client.get("/api/session").json()["token"]}
        assert client.post(f"/api/undo/{aid}", headers=h).status_code == 409


def test_scan_respects_pagination_limit():
    from rescue.gmail import list_ids

    class Pages:
        def users(self): return self
        def messages(self): return self
        def list(self, pageToken=None, maxResults=100, **kwargs):
            start = 100 if pageToken else 0
            return Call({"messages": [{"id": str(i)} for i in range(start, start + maxResults)], "nextPageToken": "next"})

    ids, limited = list_ids(Pages(), "query", 150)
    assert len(ids) == 150 and len(set(ids)) == 150 and limited


def test_static_assets_and_demo_roundtrip():
    with TestClient(module.app) as client:
        for path in ["/", "/ui.js", "/style.css"]:
            response = client.get(path)
            assert response.status_code == 200
            assert response.headers["cache-control"] == "no-store"
        h = {"x-rescue-token": client.get("/api/session").json()["token"]}
        assert client.post("/api/restore/demo", headers=h).json()["demo"]
        assert client.post("/api/undo/0", headers=h).json()["ok"]
