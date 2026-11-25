import csv
import io
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..database import get_conn
from ..schemas import CATEGORIES, DISTRICTS

router = APIRouter(prefix="/api", tags=["Dashboard & Reports"])


def _rows(conn, sql, params=()):
    return [dict(r) for r in conn.execute(sql, params)]


@router.get("/dashboard")
def dashboard():
    with get_conn() as conn:
        counts = conn.execute(
            """SELECT
                 COUNT(*) AS total,
                 SUM(status = 'Open') AS open,
                 SUM(status = 'In Progress') AS in_progress,
                 SUM(status = 'On Hold') AS on_hold,
                 SUM(status = 'Completed') AS completed,
                 SUM(status = 'Rejected') AS rejected,
                 SUM(priority = 'Urgent' AND status IN ('Open','In Progress','On Hold')) AS urgent_pending,
                 SUM(date(created_at) = date('now','localtime')) AS today
               FROM complaints"""
        ).fetchone()
        vols = conn.execute(
            "SELECT COUNT(*) AS total, SUM(status = 'Active') AS active FROM volunteers"
        ).fetchone()
        cat_counts = {r["name"]: r for r in _rows(
            conn,
            """SELECT category AS name, COUNT(*) AS total,
                      SUM(status IN ('Open','In Progress','On Hold')) AS pending,
                      SUM(status = 'Completed') AS completed
               FROM complaints GROUP BY category""",
        )}
        vol_counts = {r["name"]: r for r in _rows(
            conn,
            """SELECT district AS name, COUNT(*) AS total, SUM(status = 'Active') AS active
               FROM volunteers GROUP BY district""",
        )}
        empty = {"total": 0, "pending": 0, "completed": 0, "active": 0}

        # category x district matrix – used by the per-category district graph
        cd = {}
        for r in conn.execute(
            """SELECT category, district, COUNT(*) AS total,
                      SUM(status IN ('Open','In Progress','On Hold')) AS pending,
                      SUM(status = 'Completed') AS completed
               FROM complaints GROUP BY category, district"""
        ):
            cd[(r["category"], r["district"])] = {"total": r["total"], "pending": r["pending"] or 0, "completed": r["completed"] or 0}
        dist_counts = {r["name"]: r for r in _rows(
            conn,
            """SELECT district AS name, COUNT(*) AS total,
                      SUM(status IN ('Open','In Progress','On Hold')) AS pending,
                      SUM(status = 'Completed') AS completed,
                      SUM(status = 'Rejected') AS rejected
               FROM complaints GROUP BY district""",
        )}
        by_district = [
            {"name": d, "total": 0, "pending": 0, "completed": 0, "rejected": 0,
             **{k: (v or 0) for k, v in dist_counts.get(d, {}).items() if k != "name"}}
            for d in DISTRICTS
        ]
        status_by_district = {d: [] for d in DISTRICTS}
        for r in conn.execute("SELECT district, status AS name, COUNT(*) AS value FROM complaints GROUP BY district, status"):
            status_by_district.setdefault(r["district"], []).append({"name": r["name"], "value": r["value"]})
        category_district = {
            c: [{"name": d, "total": 0, "pending": 0, "completed": 0, **cd.get((c, d), {})} for d in DISTRICTS]
            for c in CATEGORIES
        }
        return {
            "complaints": {k: (counts[k] or 0) for k in counts.keys()},
            "volunteers": {"total": vols["total"] or 0, "active": vols["active"] or 0},
            # every category / district is always returned (0 if no data) so the cards never disappear
            "by_category": [{**empty, **cat_counts.get(c, {}), "name": c} for c in CATEGORIES],
            "category_district": category_district,
            "by_district": by_district,
            "status_by_district": status_by_district,
            "volunteers_by_district": [{**empty, **vol_counts.get(d, {}), "name": d} for d in DISTRICTS],
            "by_status": _rows(conn, "SELECT status AS name, COUNT(*) AS value FROM complaints GROUP BY status"),
            "trend": _rows(
                conn,
                """SELECT date(created_at) AS date, COUNT(*) AS received,
                          SUM(status = 'Completed') AS resolved
                   FROM complaints WHERE date(created_at) >= date('now','localtime','-13 days')
                   GROUP BY date(created_at) ORDER BY date""",
            ),
            "recent": _rows(
                conn,
                """SELECT c.id, c.ticket_no, c.citizen_name, c.subject, c.status, c.priority, c.created_at,
                          v.name AS volunteer_name
                   FROM complaints c LEFT JOIN volunteers v ON v.id = c.volunteer_id
                   ORDER BY c.id DESC LIMIT 6""",
            ),
        }


def _date_filter(date_from: Optional[str], date_to: Optional[str]):
    where, params = [], []
    if date_from:
        where.append("date(c.created_at) >= date(?)")
        params.append(date_from)
    if date_to:
        where.append("date(c.created_at) <= date(?)")
        params.append(date_to)
    return (" WHERE " + " AND ".join(where) if where else ""), params


@router.get("/reports")
def reports(date_from: Optional[str] = None, date_to: Optional[str] = None):
    w, p = _date_filter(date_from, date_to)
    with get_conn() as conn:
        summary = conn.execute(
            f"""SELECT COUNT(*) AS total,
                       SUM(status = 'Completed') AS resolved,
                       SUM(status IN ('Open','In Progress','On Hold')) AS pending,
                       ROUND(AVG(CASE WHEN resolved_at IS NOT NULL
                             THEN julianday(resolved_at) - julianday(created_at) END), 1) AS avg_resolution_days
                FROM complaints c {w}""",
            p,
        ).fetchone()
        s = {k: (summary[k] or 0) for k in summary.keys()}
        s["resolution_rate"] = round(100 * s["resolved"] / s["total"], 1) if s["total"] else 0
        return {
            "summary": s,
            "by_district": _rows(
                conn,
                f"""SELECT district AS name, COUNT(*) AS total,
                           SUM(status = 'Completed') AS resolved,
                           SUM(status IN ('Open','In Progress','On Hold')) AS pending
                    FROM complaints c {w} GROUP BY district ORDER BY total DESC""",
                p,
            ),
            "by_category": _rows(
                conn,
                f"""SELECT category AS name, COUNT(*) AS total,
                           SUM(status = 'Completed') AS resolved
                    FROM complaints c {w} GROUP BY category ORDER BY total DESC""",
                p,
            ),
            "by_priority": _rows(conn, f"SELECT priority AS name, COUNT(*) AS value FROM complaints c {w} GROUP BY priority", p),
            "volunteer_performance": _rows(
                conn,
                f"""SELECT v.id, v.name, v.district, COUNT(c.id) AS assigned,
                           SUM(c.status = 'Completed') AS resolved
                    FROM volunteers v
                    LEFT JOIN complaints c ON c.volunteer_id = v.id {w.replace(' WHERE ', ' AND ', 1)}
                    GROUP BY v.id ORDER BY resolved DESC, assigned DESC""",
                p,
            ),
        }


@router.get("/reports/export")
def export_csv(date_from: Optional[str] = None, date_to: Optional[str] = None):
    w, p = _date_filter(date_from, date_to)
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT c.ticket_no, c.citizen_name, c.phone, c.category, c.subject, c.district, c.priority,
                       c.status, v.name AS volunteer, c.created_at, c.resolved_at
                FROM complaints c LEFT JOIN volunteers v ON v.id = c.volunteer_id {w} ORDER BY c.id""",
            p,
        ).fetchall()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Ticket", "Citizen", "Phone", "Category", "Subject", "District", "Priority",
                     "Status", "Volunteer", "Created", "Resolved"])
    writer.writerows([tuple(r) for r in rows])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=complaints_report.csv"},
    )
