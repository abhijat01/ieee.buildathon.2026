class ExperienceValidationException(Exception):
    """Carries one message for each invalid field."""

    def __init__(self, fields: dict[str, str]):
        super().__init__("Check the highlighted fields.")
        self.message = "Check the highlighted fields."
        self.fields = dict(fields)
