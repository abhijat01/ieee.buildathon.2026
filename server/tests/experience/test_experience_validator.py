import pytest
from ieee.experience.experience_fields import ExperienceFields
from ieee.experience.experience_type import ExperienceType
from ieee.experience.experience_validation_exception import ExperienceValidationException
from ieee.experience.experience_validator import ExperienceValidator

validator = ExperienceValidator()


def fields(company=None, project=None, start=None, end=None, description=None) -> ExperienceFields:
    return ExperienceFields(company=company, project_name=project, start_date=start, end_date=end,
                            description=description)


def test_input_limits_and_required_type():
    assert validator.input(ExperienceType.PROJECT, " x ") == "x"
    assert len(validator.input(ExperienceType.PROJECT, "x" * 4000)) == 4000
    for value in (" ", "x" * 4001, None):
        with pytest.raises(ExperienceValidationException) as error:
            validator.input(ExperienceType.PROJECT, value)
        assert error.value.fields == {"originalInput": "Enter 1–4,000 characters."}
    with pytest.raises(ExperienceValidationException) as error:
        validator.input(None, "x")
    assert error.value.fields == {"type": "Choose an experience type."}
    assert str(error.value) == "Check the highlighted fields."


def test_dates_keep_precision_and_only_definite_contradictions_fail():
    for value in ("2024", "2024-02", "2024-02-29"):
        assert validator.fields(fields(project="Atlas", start=value, description="Built a dashboard"), True).start_date == value
    assert validator.fields(fields("Acme", None, "2024-12", "2024", "Built"), True).end_date == "2024"
    assert validator.fields(fields("Acme", None, "2024-02-10", "2024-02", "Built"), True).end_date == "2024-02"
    for value in ("0000", "2023-02-29", "2024-13", "2024-00", "2024-02-30", "3/4/2024", "２０２４"):
        with pytest.raises(ExperienceValidationException) as error:
            validator.fields(fields(start=value), False)
        assert error.value.fields == {"startDate": "Use a valid YYYY, YYYY-MM, or YYYY-MM-DD date."}
    with pytest.raises(ExperienceValidationException) as error:
        validator.fields(fields(start="2025", end="2024"), False)
    assert error.value.fields == {"endDate": "The end date precedes the start date."}


def test_extraction_allows_null_but_save_needs_a_name_and_description():
    assert validator.fields(fields(), False).description is None
    with pytest.raises(ExperienceValidationException) as error:
        validator.fields(fields(" ", None, None, None, " "), True)
    assert error.value.fields == {"company": "Enter a company or project name.", "description": "Enter a description."}
    with pytest.raises(ExperienceValidationException) as error:
        validator.fields(fields("x" * 161, None, None, None, "ok"), True)
    assert error.value.fields == {"company": "Use at most 160 characters."}


def test_values_are_trimmed():
    result = validator.fields(fields(" Acme ", " Atlas ", " 2022 ", None, " Built "), True)
    assert (result.company, result.project_name, result.start_date, result.description) == ("Acme", "Atlas", "2022", "Built")
