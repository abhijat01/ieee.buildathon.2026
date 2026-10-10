import pytest
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.resume.improved_description import ImprovedDescription
from ieee.resume.keyword_check_service import KeywordCheckService
from ieee.resume.tailored_resume import TailoredResume
from ieee.resume.tailored_resume_check import TailoredResumeCheck
from .resume_samples import item_view, keyword_check, tailored, work_view

INCLUDED = [item_view("p1"), work_view("w1")]
KEYWORDS = keyword_check(in_resume=["Python"], in_excluded_items=["Airflow"], not_in_portfolio=["AWS", "Snowflake"])


def check(result: TailoredResume) -> None:
    TailoredResumeCheck(KeywordCheckService()).check(result, INCLUDED, KEYWORDS)


def test_a_result_with_one_text_for_each_included_item_is_valid():
    check(tailored({"w1": "- Moved 12 services to Kubernetes", "p1": "- Built the pipeline with Python"}))


@pytest.mark.parametrize("item_ids", [["p1"], ["p1", "w1", "unknown"], ["p1", "p1"], ["p1", "w1", "w1"], ["p1", "x1"]])
def test_a_missing_unknown_or_repeated_item_identifier_is_rejected(item_ids):
    result = TailoredResume(summary="Summary.", descriptions=[
        ImprovedDescription(item_id=item_id, text="- Text") for item_id in item_ids])
    with pytest.raises(ExperienceAiError):
        check(result)


def test_a_text_over_20000_characters_is_rejected():
    long_text = ImprovedDescription.model_construct(item_id="p1", text="t" * 20001)
    result = TailoredResume.model_construct(summary="Summary.", descriptions=[
        long_text, ImprovedDescription(item_id="w1", text="- Text")])
    with pytest.raises(ExperienceAiError):
        check(result)


def test_an_empty_text_is_rejected():
    with pytest.raises(ExperienceAiError):
        check(tailored({"p1": "   ", "w1": "- Text"}))


@pytest.mark.parametrize("texts, summary", [
    ({"p1": "- Ran the services on AWS", "w1": "- Text"}, "Summary."),
    ({"p1": "- Text", "w1": "- Loaded the data into snowflake"}, "Summary."),
    ({"p1": "- Text", "w1": "- Text"}, "Engineer with experience in AWS."),
    ({"p1": "- Ran the pipeline with Airflow", "w1": "- Text"}, "Summary."),
])
def test_a_keyword_that_the_included_items_do_not_support_is_rejected(texts, summary):
    with pytest.raises(ExperienceAiError):
        check(tailored(texts, summary))


def test_a_longer_word_that_contains_an_unsupported_keyword_is_valid():
    check(tailored({"p1": "- Wrote the LAWS module", "w1": "- Text"}))
