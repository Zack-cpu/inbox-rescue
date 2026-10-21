import json
import sqlite3
from contextlib import contextmanager
from .gmail import DATA


@contextmanager
def db():
    DATA.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DATA / "rescue.sqlite3")
    try:
        with con:
            con.execute("CREATE TABLE IF NOT EXISTS actions (id INTEGER PRIMARY KEY, message TEXT, added TEXT, removed TEXT, status TEXT)")
            yield con
    finally:
        con.close()


def prepare(message_id, added, removed):
    with db() as con:
        row = con.execute("INSERT INTO actions(message, added, removed, status) VALUES (?, ?, ?, 'pending')", (message_id, json.dumps(added), json.dumps(removed)))
        return row.lastrowid


def mark(action_id, status):
    with db() as con:
        con.execute("UPDATE actions SET status=? WHERE id=?", (status, action_id))


def action(action_id):
    with db() as con:
        return con.execute("SELECT message, added, removed, status FROM actions WHERE id=?", (action_id,)).fetchone()
