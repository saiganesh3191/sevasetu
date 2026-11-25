from fastapi import APIRouter

from ..database import get_conn
from ..schemas import CONSTITUENCIES

router = APIRouter(prefix="/api/constituencies", tags=["Constituencies"])


@router.get("")
def list_constituencies():
    """District -> Assembly constituencies, with complaint counts for each."""
    with get_conn() as conn:
        counts = {
            (r["district"], r["constituency"]): dict(r)
            for r in conn.execute(
                """SELECT district, constituency, COUNT(*) AS total,
                          SUM(status IN ('Open','In Progress','On Hold')) AS pending,
                          SUM(status = 'Completed') AS completed,
                          SUM(status = 'Rejected') AS rejected
                   FROM complaints WHERE constituency IS NOT NULL AND constituency != ''
                   GROUP BY district, constituency"""
            )
        }
        unmapped = conn.execute(
            "SELECT COUNT(*) FROM complaints WHERE constituency IS NULL OR constituency = ''"
        ).fetchone()[0]

    districts = []
    for district, names in CONSTITUENCIES.items():
        items = []
        for n in names:
            c = counts.get((district, n), {})
            items.append({
                "name": n,
                "total": c.get("total", 0),
                "pending": c.get("pending") or 0,
                "completed": c.get("completed") or 0,
                "rejected": c.get("rejected") or 0,
            })
        districts.append({
            "name": district,
            "constituencies": items,
            "count": len(items),
            "total": sum(i["total"] for i in items),
            "pending": sum(i["pending"] for i in items),
            "completed": sum(i["completed"] for i in items),
        })

    return {
        "total_constituencies": sum(d["count"] for d in districts),
        "total_districts": len(districts),
        "unmapped_complaints": unmapped,
        "districts": districts,
    }
