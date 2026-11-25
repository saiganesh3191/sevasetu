"""Fill the database with sample data.  Run:  python seed.py"""
import random
from datetime import datetime, timedelta

from app.database import DB_PATH, get_conn, init_db
from app.schemas import CONSTITUENCIES

random.seed(7)

DISTRICTS = ["Hyderabad", "Rangareddy", "Medchal-Malkajgiri", "Warangal", "Karimnagar", "Khammam", "Nalgonda", "Nizamabad"]
CATS = {
    "Roads & Drainage": ["Potholes on main road", "Drainage overflow in colony", "Road damaged after rains"],
    "Drinking Water": ["No drinking water supply", "Pipeline leakage", "Contaminated water"],
    "Education": ["School building repair needed", "Teacher shortage in ZPHS", "Scholarship not received"],
    "Healthcare": ["PHC doctor unavailable", "Ambulance delay", "Medicines not available"],
    "Employment & Skill Development": ["Need skill training centre", "Job mela request", "Loan for self-employment"],
    "Agriculture": ["Crop loss compensation pending", "Fertilizer shortage", "Irrigation canal repair"],
    "Public Transport": ["Bus service stopped to village", "Bus stop shelter needed", "Need more buses for students"],
    "Municipal Services": ["Garbage not collected", "Street light not working", "Stray dog menace"],
}
NAMES = ["Ramesh Kumar", "Lakshmi Devi", "Suresh Reddy", "Anitha Rao", "Venkatesh", "Padma",
         "Srinivas Goud", "Kavitha", "Mahesh Babu", "Sunitha", "Raju Naidu", "Swathi", "Prakash", "Bhavani"]
FIRST = ["Arjun", "Divya", "Kiran", "Manasa", "Naveen", "Priya", "Sai", "Harika", "Ravi", "Sravani",
         "Vamsi", "Keerthi", "Ganesh", "Pooja", "Rahul", "Sneha", "Ajay", "Deepika", "Teja", "Bindu"]
LAST = ["Reddy", "Rao", "Goud", "Yadav", "Varma", "Naidu", "Kumar", "Chary"]
SKILLS = ["Field survey", "Data entry", "Counselling", "Health camps", "Social media", "Logistics", "Agriculture support"]
VOLS, _used = [], set()
for d in DISTRICTS:
    for _ in range(random.randint(3, 7)):
        name = f"{random.choice(FIRST)} {random.choice(LAST)}"
        while name in _used:
            name = f"{random.choice(FIRST)} {random.choice(LAST)}"
        _used.add(name)
        VOLS.append((name, d, ", ".join(random.sample(SKILLS, 2))))


VILLAGES = ["Kondapur", "Ameenpur", "Gajularamaram", "Bachupally", "Narsampet", "Jangaon", "Sircilla", "Kothagudem"]
SOURCES = ["Walk-in", "Phone", "WhatsApp", "Email", "Field Visit"]


def phone():
    return "9" + "".join(random.choices("0123456789", k=9))


def main():
    # reset tables (old data clear) and recreate with the latest schema
    with get_conn() as conn:
        conn.executescript("DROP TABLE IF EXISTS complaint_updates; DROP TABLE IF EXISTS complaints; DROP TABLE IF EXISTS volunteers;")
    init_db()
    now = datetime.now()
    with get_conn() as conn:
        for i, (name, district, skills) in enumerate(VOLS):
            status = random.choices(["Active", "On Leave", "Inactive"], [80, 10, 10])[0]
            conn.execute(
                "INSERT INTO volunteers (name, phone, email, district, skills, status, joined_at) VALUES (?,?,?,?,?,?,?)",
                (name, phone(), name.split()[0].lower() + str(i + 1) + "@sevasetu.org", district, skills, status,
                 (now - timedelta(days=random.randint(30, 300))).strftime("%Y-%m-%d %H:%M:%S")),
            )

        for i in range(1, 121):
            cat = random.choice(list(CATS))
            created = now - timedelta(days=random.randint(0, 45), hours=random.randint(0, 10))
            status = random.choices(["Open", "In Progress", "On Hold", "Completed", "Rejected"], [20, 25, 10, 40, 5])[0]
            dist = random.choice(DISTRICTS)
            local = [j + 1 for j, v in enumerate(VOLS) if v[1] == dist]
            vol = None if status == "Open" else random.choice(local)
            resolved = (created + timedelta(days=random.randint(1, 6))) if status == "Completed" else None
            if resolved and resolved > now:
                resolved = now
            fmt = lambda d: d.strftime("%Y-%m-%d %H:%M:%S") if d else None
            conn.execute(
                """INSERT INTO complaints (ticket_no, citizen_name, phone, category, subject, description, district,
                       priority, status, volunteer_id, created_at, updated_at, resolved_at, village, mandal, source, constituency)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (f"GRV-{i:05d}", random.choice(NAMES), phone(), cat, random.choice(CATS[cat]),
                 "Citizen reported this issue at the office.", dist,
                 random.choices(["Low", "Medium", "High", "Urgent"], [20, 45, 25, 10])[0],
                 status, vol, fmt(created), fmt(resolved or created), fmt(resolved),
                 random.choice(VILLAGES), dist + " Urban", random.choice(SOURCES),
                 random.choice(CONSTITUENCIES[dist])),
            )
            conn.execute("INSERT INTO complaint_updates (complaint_id, note, status, created_at) VALUES (?,?,?,?)",
                         (i, "Grievance registered", "Open", fmt(created)))
            if vol:
                conn.execute("INSERT INTO complaint_updates (complaint_id, note, status, created_at) VALUES (?,?,?,?)",
                             (i, f"Assigned to {VOLS[vol - 1][0]}", "In Progress", fmt(created + timedelta(hours=3))))
            if resolved:
                conn.execute("INSERT INTO complaint_updates (complaint_id, note, status, created_at) VALUES (?,?,?,?)",
                             (i, f"Status changed to {status}", status, fmt(resolved)))
    print(f"Seeded database at {DB_PATH}")


if __name__ == "__main__":
    main()
