from ieee.portfolio.experience_type import ExperienceType
from ieee.portfolio.extracted_fields import ExtractedFields
from ieee.portfolio.save_item_request import SaveItemRequest
from ieee.portfolio.update_item_request import UpdateItemRequest

ORIGINAL = "At **Acme Corp** I led the build of Atlas from March 2022 to June 2023."


def atlas_fields(**changes) -> ExtractedFields:
    values = {"title": "Atlas analytics dashboard", "type": ExperienceType.PROJECT, "company": "Acme Corp",
              "start_date": "2022-03", "end_date": "2023-06", "skills": ["Python", "React"]}
    return ExtractedFields(**{**values, **changes})


def save_request(**changes) -> SaveItemRequest:
    values = {"type": ExperienceType.PROJECT, "title": "Atlas analytics dashboard", "company": "Acme Corp",
              "start_date": "2022-03", "end_date": "2023-06", "skills": ["Python", "React"],
              "original_text": ORIGINAL, "final_text": ORIGINAL}
    return SaveItemRequest(**{**values, **changes})


def update_request(**changes) -> UpdateItemRequest:
    values = {"type": ExperienceType.WORK, "title": "Atlas for the sales team", "company": "Acme Corporation",
              "start_date": "2022-04", "end_date": "2023-07", "skills": ["Python", "Kubernetes"],
              "final_text": "Led the build of Atlas at **Acme Corporation**."}
    return UpdateItemRequest(**{**values, **changes})
