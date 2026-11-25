from typing import Optional
from fastapi import APIRouter, HTTPException

from ..database import get_conn
from ..schemas import VolunteerCreate, VolunteerUpdate

router = APIRouter(prefix="/api/volunteers", tags=["Volunteers"])

SELECT_SQL = """
SELECT v.*,
  (SELECT COUNT(*) FROM complaints c WHERE c.volunteer_id = v.id) AS total_assigned,
  (SELECT COUNT(*) FROM complaints c WHERE c.volunteer_id = v.id AND c.status IN ('Open','In Progress','On Hold')) AS active_cases,
  (SELECT COUNT(*) FROM complaints c WHERE c.volunteer_id = v.id AND c.status = 'Completed') AS resolved_cases
FROM volunteers v
"""


@router.get("")
def list_volunteers(status: Optional[str] = None, district: Optional[str] = None, search: Optional[str] = None):
    where, params = [], []
    if status:
        where.append("v.status = ?")
        params.append(status)
    if district:
        where.append("v.district = ?")
        params.append(district)
    if search:
        where.append("(v.name LIKE ? OR v.phone LIKE ? OR v.skills LIKE ?)")
        params += [f"%{search}%"] * 3
    sql = SELECT_SQL + (" WHERE " + " AND ".join(where) if where else "") + " ORDER BY v.name"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(sql, params)]


@router.get("/{vid}")
def get_volunteer(vid: int):
    with get_conn() as conn:
        row = conn.execute(SELECT_SQL + " WHERE v.id = ?", (vid,)).fetchone()
        if not row:
            raise HTTPException(404, "Volunteer not found")
        cases = conn.execute(
            "SELECT id, ticket_no, subject, status, priority, created_at FROM complaints WHERE volunteer_id = ? ORDER BY id DESC",
            (vid,),
        ).fetchall()
        return {**dict(row), "cases": [dict(c) for c in cases]}


@router.post("", status_code=201)
def create_volunteer(data: VolunteerCreate):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO volunteers (name, phone, email, district, skills, status) VALUES (?,?,?,?,?,?)",
            (data.name, data.phone, data.email, data.district, data.skills, data.status),
        )
        vid = cur.lastrowid
    return get_volunteer(vid)


@router.patch("/{vid}")
def update_volunteer(vid: int, data: VolunteerUpdate):
    fields = data.model_dump(exclude_none=True)
    if fields:
        with get_conn() as conn:
            cols = ", ".join(f"{k} = ?" for k in fields)
            if conn.execute(f"UPDATE volunteers SET {cols} WHERE id = ?", (*fields.values(), vid)).rowcount == 0:
                raise HTTPException(404, "Volunteer not found")
    return get_volunteer(vid)


@router.delete("/{vid}", status_code=204)
def delete_volunteer(vid: int):
    with get_conn() as conn:
        if conn.execute("DELETE FROM volunteers WHERE id = ?", (vid,)).rowcount == 0:
            raise HTTPException(404, "Volunteer not found")
