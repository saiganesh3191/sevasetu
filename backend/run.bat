@echo off
cd /d %~dp0
if not exist venv ( python -m venv venv )
call venv\Scripts\activate
pip install -r requirements.txt
if not exist sevasetu.db ( python seed.py )
uvicorn app.main:app --reload --port 8000
