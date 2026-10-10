class ExperienceExtractionException(Exception):
    """The model could not produce a valid extraction."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message
