from ieee.portfolio.assistant.assistant_request_error import AssistantRequestError


class AssistantThreadError(AssistantRequestError):
    """The new turn does not agree with the stored thread. The browser starts a new thread to continue."""
