from datetime import datetime, timezone
from ieee.portfolio.experience_type import ExperienceType
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.portfolio.portfolio_service import PortfolioService
from ieee.portfolio.save_item_request import SaveItemRequest
from ieee.resume.improved_description import ImprovedDescription
from ieee.resume.item_review import ItemReview
from ieee.resume.job_analysis import JobAnalysis
from ieee.resume.keyword_check import KeywordCheck
from ieee.resume.relevance_level import RelevanceLevel
from ieee.resume.tailored_resume import TailoredResume

JOB_TEXT = "Senior Full-Stack Engineer at Contoso Analytics. Python, SQL, React, AWS."
JOB_KEYWORDS = ["Python", "SQL", "React", "Kubernetes", "AWS"]
ATLAS_TEXT = "At **Acme Corp** I led the build of Atlas.\n\n- Built the data pipeline with Python and PostgreSQL"
NORTHWIND_TEXT = "I worked in the platform team.\n\n- Moved 12 services to Kubernetes"


def item_view(item_id: str = "p1", **changes) -> PortfolioItemView:
    values = {"id": item_id, "type": ExperienceType.PROJECT, "title": "Atlas analytics dashboard", "company": "Acme Corp",
              "start_date": "2022-03", "end_date": "2023-06", "skills": ["Python", "React"], "text": ATLAS_TEXT,
              "created_at": datetime(2026, 9, 12, tzinfo=timezone.utc)}
    return PortfolioItemView(**{**values, **changes})


def work_view(item_id: str = "w1", **changes) -> PortfolioItemView:
    values = {"type": ExperienceType.WORK, "title": "Senior Software Engineer", "company": "Northwind Labs",
              "start_date": "2019-01", "end_date": "2021-05", "skills": ["Java", "Kubernetes"], "text": NORTHWIND_TEXT}
    return item_view(item_id, **{**values, **changes})


def save_atlas(portfolio: PortfolioService, owner: str = "owner") -> PortfolioItemView:
    return portfolio.save_item(owner, SaveItemRequest(
        type=ExperienceType.PROJECT, title="Atlas analytics dashboard", company="Acme Corp", start_date="2022-03",
        end_date="2023-06", skills=["Python", "React"], original_text=ATLAS_TEXT, final_text=ATLAS_TEXT))


def save_northwind(portfolio: PortfolioService, owner: str = "owner") -> PortfolioItemView:
    return portfolio.save_item(owner, SaveItemRequest(
        type=ExperienceType.WORK, title="Senior Software Engineer", company="Northwind Labs", start_date="2019-01",
        end_date="2021-05", skills=["Java", "Kubernetes"], original_text=NORTHWIND_TEXT, final_text=NORTHWIND_TEXT))


def review(item_id: str, relevance: RelevanceLevel = RelevanceLevel.HIGH) -> ItemReview:
    return ItemReview(item_id=item_id, relevance=relevance, reason="Shows Python.", matched_keywords=["Python"])


def job_analysis(reviews: list[ItemReview]) -> JobAnalysis:
    return JobAnalysis(job_title="Senior Full-Stack Engineer", company="Contoso Analytics",
                       requirements=["Build data pipelines with Python"], keywords=JOB_KEYWORDS, reviews=reviews)


def tailored(texts: dict[str, str], summary: str = "Software engineer with experience in Python.") -> TailoredResume:
    return TailoredResume(summary=summary, descriptions=[
        ImprovedDescription(item_id=item_id, text=text) for item_id, text in texts.items()])


def keyword_check(in_resume: list[str] | None = None, in_excluded_items: list[str] | None = None,
                  not_in_portfolio: list[str] | None = None) -> KeywordCheck:
    return KeywordCheck(in_resume=in_resume or [], in_excluded_items=in_excluded_items or [],
                        not_in_portfolio=not_in_portfolio or [])
