"""SQLite database setup (no external DB needed)."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "sevasetu.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS volunteers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT,
    district        TEXT NOT NULL,
    skills      TEXT,
    status      TEXT NOT NULL DEFAULT 'Active',
    joined_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS complaints (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_no       TEXT UNIQUE,
    citizen_name    TEXT NOT NULL,
    phone           TEXT NOT NULL,
    category        TEXT NOT NULL,
    subject         TEXT NOT NULL,
    description     TEXT,
    district            TEXT NOT NULL,
    constituency    TEXT,
    village         TEXT,
    mandal          TEXT,
    source          TEXT DEFAULT 'Walk-in',
    voter_id        TEXT,
    priority        TEXT NOT NULL DEFAULT 'Medium',
    status          TEXT NOT NULL DEFAULT 'Open',
    volunteer_id    INTEGER REFERENCES volunteers(id) ON DELETE SET NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    resolved_at     TEXT
);

CREATE TABLE IF NOT EXISTS complaint_updates (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id  INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    note          TEXT NOT NULL,
    status        TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
"""


# columns added after v1 – old databases get them automatically
NEW_COLUMNS = {"complaints": [("village", "TEXT"), ("mandal", "TEXT"), ("source", "TEXT DEFAULT 'Walk-in'"), ("voter_id", "TEXT"), ("constituency", "TEXT")]}


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        for table, cols in NEW_COLUMNS.items():
            existing = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
            for name, typ in cols:
                if name not in existing:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {typ}")
