from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from ..database import get_conn
from ..schemas import ComplaintCreate, ComplaintUpdate

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

SELECT_SQL = """
SELECT c.*, v.name AS volunteer_name
FROM complaints c LEFT JOIN volunteers v ON v.id = c.volunteer_id
"""


@router.get("")
def list_complaints(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    district: Optional[str] = None,
    constituency: Optional[str] = None,
    search: Optional[str] = Query(None, description="ticket, name, phone or subject"),
):
    where, params = [], []
    for col, val in (("c.status", status), ("c.category", category), ("c.priority", priority), ("c.district", district), ("c.constituency", constituency)):
        if val:
            where.append(f"{col} = ?")
            params.append(val)
    if search:
        where.append("(c.ticket_no LIKE ? OR c.citizen_name LIKE ? OR c.phone LIKE ? OR c.subject LIKE ? OR c.voter_id LIKE ?)")
        params += [f"%{search}%"] * 5
    sql = SELECT_SQL + (" WHERE " + " AND ".join(where) if where else "") + " ORDER BY c.id DESC"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(sql, params)]


@router.get("/track/{ticket_no}")
def track(ticket_no: str):
    """Public-style lookup by ticket number (e.g. GRV-00012)."""
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM complaints WHERE upper(ticket_no) = upper(?)", (ticket_no.strip(),)).fetchone()
    if not row:
        raise HTTPException(404, "Ee ticket number tho complaint ledu")
    return get_complaint(row["id"])


@router.get("/{cid}")
def get_complaint(cid: int):
    with get_conn() as conn:
        row = conn.execute(SELECT_SQL + " WHERE c.id = ?", (cid,)).fetchone()
        if not row:
            raise HTTPException(404, "Complaint not found")
        updates = conn.execute(
            "SELECT * FROM complaint_updates WHERE complaint_id = ? ORDER BY id DESC", (cid,)
        ).fetchall()
        return {**dict(row), "updates": [dict(u) for u in updates]}


@router.post("", status_code=201)
def create_complaint(data: ComplaintCreate):
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO complaints (citizen_name, phone, category, subject, description, district,
                                      village, mandal, source, voter_id, priority, constituency)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (data.citizen_name, data.phone, data.category, data.subject, data.description, data.district,
             data.village, data.mandal, data.source, (data.voter_id or "").upper(), data.priority, data.constituency),
        )
        cid = cur.lastrowid
        ticket = f"GRV-{cid:05d}"
        conn.execute("UPDATE complaints SET ticket_no = ? WHERE id = ?", (ticket, cid))
        conn.execute(
            "INSERT INTO complaint_updates (complaint_id, note, status) VALUES (?,?,?)",
            (cid, "Grievance registered", "Open"),
        )
    return get_complaint(cid)


@router.patch("/{cid}")
def update_complaint(cid: int, data: ComplaintUpdate):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM complaints WHERE id = ?", (cid,)).fetchone()
        if not row:
            raise HTTPException(404, "Complaint not found")

        sets, params, notes = [], [], []
        if data.status and data.status != row["status"]:
            sets.append("status = ?")
            params.append(data.status)
            notes.append(f"Status changed to {data.status}")
            if data.status == "Completed":
                sets.append("resolved_at = datetime('now','localtime')")
        if data.priority and data.priority != row["priority"]:
            sets.append("priority = ?")
            params.append(data.priority)
            notes.append(f"Priority set to {data.priority}")
        if data.volunteer_id is not None and data.volunteer_id != row["volunteer_id"]:
            if data.volunteer_id == 0:
                sets.append("volunteer_id = NULL")
                notes.append("Volunteer unassigned")
            else:
                vol = conn.execute("SELECT name FROM volunteers WHERE id = ?", (data.volunteer_id,)).fetchone()
                if not vol:
                    raise HTTPException(400, "Volunteer not found")
                sets.append("volunteer_id = ?")
                params.append(data.volunteer_id)
                notes.append(f"Assigned to {vol['name']}")
                if row["status"] == "Open" and not data.status:
                    sets.append("status = 'In Progress'")

        if sets:
            sets.append("updated_at = datetime('now','localtime')")
            conn.execute(f"UPDATE complaints SET {', '.join(sets)} WHERE id = ?", (*params, cid))
        if data.note:
            notes.append(data.note)
        for n in notes:
            conn.execute(
                "INSERT INTO complaint_updates (complaint_id, note, status) VALUES (?,?,?)",
                (cid, n, data.status),
            )
    return get_complaint(cid)


@router.delete("/{cid}", status_code=204)
def delete_complaint(cid: int):
    with get_conn() as conn:
        if conn.execute("DELETE FROM complaints WHERE id = ?", (cid,)).rowcount == 0:
            raise HTTPException(404, "Complaint not found")
