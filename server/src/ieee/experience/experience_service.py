from ieee.database import Database
from ieee.experience.experience_entry import ExperienceEntry
from ieee.experience.experience_validator import ExperienceValidator
from ieee.experience.save_experience import SaveExperience
from ieee.experience.saved_experience import SavedExperience


class ExperienceService:
    """Validates reviewed values and stores one experience for the signed-in member."""

    def __init__(self, database: Database, validator: ExperienceValidator):
        self.database = database
        self.validator = validator

    def save(self, owner: str, request: SaveExperience) -> SavedExperience:
        original_input = self.validator.input(request.type, request.original_input)
        fields = self.validator.fields(request.fields(), True)
        entry = ExperienceEntry.create(owner, request.type, original_input, fields)
        with self.database.session() as session, session.begin():
            session.add(entry)
        return entry.response()
