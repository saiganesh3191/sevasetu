# SevaSetu – Grievance & Volunteer Management System

```
SevaSetu/
├── backend/    Python (FastAPI + SQLite)   → http://localhost:8000  (API docs: /docs)
└── frontend/   React (JSX + Vite)          → http://localhost:5173
```

## Pages
| Page | Em chestundi |
|---|---|
| Dashboard | Total / Open / In-progress / Resolved counts, 14-day trend, status & category charts, recent complaints |
| Grievance | New citizen grievance register form – ticket number (GRV-00001) auto generate |
| Complaints | All complaints list – search, filters, click chesi status/priority update, volunteer assign, notes, timeline |
| Volunteers | Volunteer add / edit / remove, area & skills, active/resolved case count, assigned cases view |
| Reports | Date range filter, ward-wise, category-wise, priority, volunteer performance, CSV export, print |

## Run cheyadam (2 terminals)

**1. Backend** (Python 3.10+ kavali)
```
cd backend
python -m venv venv
venv\Scripts\activate          # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python seed.py                 # sample data (60 complaints, 8 volunteers) – optional
uvicorn app.main:app --reload --port 8000
```
Windows lo `run.bat` double-click chesina chalu (Mac/Linux: `./run.sh`).

**2. Frontend** (Node 18+ kavali)
```
cd frontend
npm install
npm run dev
```
Browser lo http://localhost:5173 open cheyandi.

## API endpoints
- `GET /api/dashboard`
- `GET/POST /api/complaints`, `GET/PATCH/DELETE /api/complaints/{id}`
- `GET/POST /api/volunteers`, `GET/PATCH/DELETE /api/volunteers/{id}`
- `GET /api/reports?date_from=&date_to=`, `GET /api/reports/export` (CSV)

Areas / categories maarchali ante: `frontend/src/api/client.js` lo `AREAS`, `CATEGORIES` and `backend/app/schemas.py` lo `Category`.
