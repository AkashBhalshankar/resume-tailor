from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class Link(BaseModel):
    label: str = ""
    url: str = ""


class Contact(BaseModel):
    email: str = ""
    phone: str = ""
    location: str = ""
    links: list[Link] = []


class Education(BaseModel):
    school: str = ""
    degree: str = ""
    location: str = ""
    dates: str = ""


class Experience(BaseModel):
    company: str = ""
    role: str = ""
    location: str = ""
    dates: str = ""
    bullets: list[str] = []


class Project(BaseModel):
    name: str = ""
    tech: str = ""
    dates: str = ""
    bullets: list[str] = []


class SkillGroup(BaseModel):
    category: str = ""
    items: list[str] = []


class Resume(BaseModel):
    name: str = ""
    title: str = ""
    contact: Contact = Contact()
    summary: str = ""
    profileSummary: str = ""
    education: list[Education] = []
    experience: list[Experience] = []
    projects: list[Project] = []
    skills: list[SkillGroup] = []
    certifications: list[str] = []
    leadership: list[str] = []

    @model_validator(mode="before")
    @classmethod
    def migrate_additional(cls, value):
        if isinstance(value, dict) and "leadership" not in value and "additional" in value:
            value = {**value, "leadership": value["additional"]}
        return value



class Target(BaseModel):
    section: Literal["experience", "projects", "skills"]
    index: int = 0
    bullet_index: Optional[int] = None


class Suggestion(BaseModel):
    id: str = ""
    kind: Literal["add", "swap", "skill"]
    target: Target
    text: str
    original: str = ""
    why: str = ""
    jd_line: str = ""
    keywords: list[str] = []
    impact: int = 2
    needs_metric: bool = False
    verified: bool = True


class Keyword(BaseModel):
    term: str
    tier: Literal["must", "nice"] = "must"
    matched: bool = False


class Analysis(BaseModel):
    match_score: int = 0
    summary: str = ""
    keywords: list[Keyword] = []
    suggestions: list[Suggestion] = []


class AnalyzeIn(BaseModel):
    resume: Resume
    jd: str = Field(min_length=40)


class RenderIn(BaseModel):
    resume: Resume


class CoverIn(BaseModel):
    resume: Resume
    jd: str = Field(min_length=40)
    company: str = ""
    role: str = ""
    tone: Literal["formal", "friendly"] = "formal"
    highlights: list[str] = []
    format_type: Literal["Cover Letter", "Outreach Summary", "LinkedIn Note"] = "Cover Letter"


class ShortenIn(BaseModel):
    bullets: list[str] = Field(min_length=1, max_length=12)


class RefineIn(BaseModel):
    note: str = Field(min_length=1)
    instructions: str = Field(min_length=1)
    tone: Literal["formal", "friendly"] = "formal"


class RenderTextIn(BaseModel):
    text: str = Field(min_length=1)

