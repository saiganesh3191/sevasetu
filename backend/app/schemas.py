from typing import Literal, Optional, get_args
from pydantic import BaseModel, Field

Category = Literal[
    "Roads & Drainage", "Drinking Water", "Education", "Healthcare",
    "Employment & Skill Development", "Agriculture", "Public Transport", "Municipal Services",
]
Priority = Literal["Low", "Medium", "High", "Urgent"]
Status = Literal["Open", "In Progress", "On Hold", "Completed", "Rejected"]
Source = Literal["Walk-in", "Phone", "WhatsApp", "Email", "Field Visit"]
VolStatus = Literal["Active", "Inactive", "On Leave"]


class ComplaintCreate(BaseModel):
    citizen_name: str = Field(min_length=2)
    phone: str = Field(min_length=10, max_length=15)
    category: Category
    subject: str = Field(min_length=3)
    description: Optional[str] = ""
    district: str = Field(min_length=2)
    constituency: Optional[str] = ""
    village: Optional[str] = ""
    mandal: Optional[str] = ""
    source: Source = "Walk-in"
    voter_id: Optional[str] = ""
    priority: Priority = "Medium"


class ComplaintUpdate(BaseModel):
    status: Optional[Status] = None
    priority: Optional[Priority] = None
    volunteer_id: Optional[int] = None
    note: Optional[str] = None


class VolunteerCreate(BaseModel):
    name: str = Field(min_length=2)
    phone: str = Field(min_length=10, max_length=15)
    email: Optional[str] = ""
    district: str = Field(min_length=2)
    skills: Optional[str] = ""
    status: VolStatus = "Active"


class VolunteerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    district: Optional[str] = None
    skills: Optional[str] = None
    status: Optional[VolStatus] = None


CATEGORIES = list(get_args(Category))

# Districts list – maarchali ante ikkada and frontend/src/api/client.js lo maarchandi
DISTRICTS = ["Hyderabad", "Rangareddy", "Medchal-Malkajgiri", "Warangal", "Karimnagar", "Khammam", "Nalgonda", "Nizamabad"]

# District -> Assembly (MLA) constituencies.
# SAMPLE list – mee real list ikkada maarchandi (frontend ee list ni API nunchi teesukuntundi)
CONSTITUENCIES = {
    "Hyderabad": ["Khairatabad", "Jubilee Hills", "Secunderabad", "Charminar", "Malakpet", "Amberpet"],
    "Rangareddy": ["Rajendranagar", "Serilingampally", "LB Nagar", "Ibrahimpatnam", "Maheshwaram", "Chevella"],
    "Medchal-Malkajgiri": ["Malkajgiri", "Medchal", "Quthbullapur", "Kukatpally", "Uppal"],
    "Warangal": ["Warangal East", "Narsampet", "Wardhannapet"],
    "Karimnagar": ["Karimnagar", "Choppadandi", "Manakondur", "Huzurabad"],
    "Khammam": ["Khammam", "Palair", "Madhira", "Wyra", "Sathupalli"],
    "Nalgonda": ["Nalgonda", "Nakrekal", "Miryalaguda", "Devarakonda", "Munugode"],
    "Nizamabad": ["Nizamabad Urban", "Nizamabad Rural", "Armur", "Bodhan", "Balkonda"],
}
