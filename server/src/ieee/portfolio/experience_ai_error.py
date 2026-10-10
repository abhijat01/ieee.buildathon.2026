class ExperienceAiError(Exception):
    """The AI did not return a usable result. The message is safe to show to the member."""
    MESSAGE = "The AI is not available at this time. Your text is safe. Try again."

    def __init__(self) -> None:
        super().__init__(self.MESSAGE)
