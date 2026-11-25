#!/bin/sh
cd "$(dirname "$0")"
[ -d venv ] || python3 -m venv venv
. venv/bin/activate
pip install -r requirements.txt
[ -f sevasetu.db ] || python seed.py
uvicorn app.main:app --reload --port 8000
