from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import auth
from .database import init_db
from .routers import complaints, constituencies, dashboard, volunteers

app = FastAPI(title="SevaSetu API", description="Grievance & Volunteer Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    auth.init_auth()


# Login API is open; every other API needs a valid login token
app.include_router(auth.router)
protected = [Depends(auth.current_user)]
app.include_router(dashboard.router, dependencies=protected)
app.include_router(complaints.router, dependencies=protected)
app.include_router(volunteers.router, dependencies=protected)
app.include_router(constituencies.router, dependencies=protected)


@app.get("/")
def root():
    return {"app": "SevaSetu API", "docs": "/docs"}
