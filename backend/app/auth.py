"""Simple, secure login: PBKDF2-hashed passwords + random session tokens stored in SQLite."""
import hashlib
import hmac
import os
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from .database import get_conn

# Default admin account – created automatically on first start.
# Change the password after first login in a real deployment
# (or set ADMIN_USERNAME / ADMIN_PASSWORD environment variables before the first run).
DEFAULT_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
DEFAULT_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin@123")

SESSION_HOURS = 12

AUTH_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    full_name     TEXT,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TEXT NOT NULL
);
"""


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()
    return f"pbkdf2${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt, _digest = stored.split("$")
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), stored)


def init_auth() -> None:
    with get_conn() as conn:
        conn.executescript(AUTH_SCHEMA)
        if not conn.execute("SELECT 1 FROM users WHERE username = ?", (DEFAULT_USERNAME,)).fetchone():
            conn.execute(
                "INSERT INTO users (username, full_name, password_hash) VALUES (?,?,?)",
                (DEFAULT_USERNAME, "Office Admin", hash_password(DEFAULT_PASSWORD)),
            )
        conn.execute("DELETE FROM sessions WHERE expires_at < datetime('now','localtime')")


def _token_from(request: Request) -> Optional[str]:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    # allows plain links (e.g. CSV download) to send ?token=...
    return request.query_params.get("token")


def current_user(request: Request) -> dict:
    token = _token_from(request)
    if not token:
        raise HTTPException(401, "Login required")
    with get_conn() as conn:
        row = conn.execute(
            """SELECT u.id, u.username, u.full_name FROM sessions s JOIN users u ON u.id = s.user_id
               WHERE s.token = ? AND s.expires_at > datetime('now','localtime')""",
            (token,),
        ).fetchone()
    if not row:
        raise HTTPException(401, "Session expired – please login again")
    return dict(row)


router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginIn(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(data: LoginIn):
    with get_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE username = ?", (data.username.strip(),)).fetchone()
        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(401, "Username leda password tappu")
        token = secrets.token_urlsafe(32)
        conn.execute(
            f"INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now','localtime','+{SESSION_HOURS} hours'))",
            (token, user["id"]),
        )
    return {"token": token, "user": {"username": user["username"], "full_name": user["full_name"]}}


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return user


@router.post("/logout")
def logout(request: Request):
    token = _token_from(request)
    if token:
        with get_conn() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    return {"ok": True}


class PasswordIn(BaseModel):
    old_password: str
    new_password: str


class ProfileIn(BaseModel):
    username: str
    full_name: str


@router.put("/profile")
def update_profile(data: ProfileIn, user: dict = Depends(current_user)):
    username = data.username.strip()
    full_name = data.full_name.strip()
    if len(username) < 3:
        raise HTTPException(400, "Username kanisam 3 characters undali")
    if not full_name:
        raise HTTPException(400, "Full name enter cheyandi")
    with get_conn() as conn:
        clash = conn.execute("SELECT 1 FROM users WHERE username = ? AND id != ?", (username, user["id"])).fetchone()
        if clash:
            raise HTTPException(400, "Ee username already use lo undi")
        conn.execute("UPDATE users SET username = ?, full_name = ? WHERE id = ?", (username, full_name, user["id"]))
    return {"username": username, "full_name": full_name}


@router.post("/change-password")
def change_password(data: PasswordIn, user: dict = Depends(current_user)):
    if len(data.new_password) < 6:
        raise HTTPException(400, "New password kanisam 6 characters undali")
    with get_conn() as conn:
        row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],)).fetchone()
        if not verify_password(data.old_password, row["password_hash"]):
            raise HTTPException(400, "Old password tappu")
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(data.new_password), user["id"]))
    return {"ok": True}
