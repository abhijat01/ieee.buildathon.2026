import pytest
from ieee.resume.keyword_check_service import KeywordCheckService
from .resume_samples import item_view, work_view


def test_each_keyword_goes_into_the_correct_group():
    included = [item_view(text="Built the pipeline with Python.", skills=["React"])]
    excluded = [work_view(text="Moved 12 services to Kubernetes.", skills=["Java"])]
    check = KeywordCheckService().check(["Python", "React", "Kubernetes", "Java", "AWS"], included, excluded)
    assert check.in_resume == ["Python", "React"]
    assert check.in_excluded_items == ["Kubernetes", "Java"]
    assert check.not_in_portfolio == ["AWS"]


def test_a_keyword_in_both_groups_of_items_counts_for_the_resume():
    check = KeywordCheckService().check(["Python"], [item_view(text="Python")], [work_view(text="Python")])
    assert (check.in_resume, check.in_excluded_items) == (["Python"], [])


def test_empty_and_repeated_keywords_are_removed():
    check = KeywordCheckService().check(["Python", " python ", "", "AWS"], [item_view(text="Python")], [])
    assert (check.in_resume, check.not_in_portfolio) == (["Python"], ["AWS"])


@pytest.mark.parametrize("text, keyword, expected", [
    ("Built reports with PostgreSQL.", "SQL", False),
    ("Built reports with SQL (PostgreSQL).", "SQL", True),
    ("Built data pipelines for sales.", "Data pipelines", True),
    ("Built data\n  pipelines for sales.", "data pipelines", True),
    ("Built a data pipeline for sales.", "Data pipelines", False),
    ("Built REST APIs.", "REST API", False),
    ("I use PYTHON each day.", "python", True),
    ("Wrote services in C++ and C#.", "C++", True),
    ("Wrote services in JavaScript.", "Java", False),
    ("Any text.", "  ", False),
])
def test_the_match_rule_uses_the_full_keyword_on_word_limits(text, keyword, expected):
    assert KeywordCheckService().contains(text, keyword) is expected


def test_the_match_reads_the_title_of_an_item():
    items = [item_view(title="Kubernetes platform engineer", text="No keyword here.", skills=[])]
    assert KeywordCheckService().check(["Kubernetes"], items, []).in_resume == ["Kubernetes"]


def test_the_match_reads_the_skills_of_an_item():
    check = KeywordCheckService().check(["Team lead"], [item_view(text="No keyword here.", skills=["Team lead"])], [])
    assert check.in_resume == ["Team lead"]
