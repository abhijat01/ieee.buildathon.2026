from typing import Any

REQUIRED_FIELDS: dict[str, dict[str, type]] = {
    "RUN_STARTED": {"threadId": str, "runId": str},
    "RUN_FINISHED": {"threadId": str, "runId": str},
    "RUN_ERROR": {"message": str},
    "TEXT_MESSAGE_START": {"messageId": str},
    "TEXT_MESSAGE_CONTENT": {"messageId": str, "delta": str},
    "TEXT_MESSAGE_END": {"messageId": str},
    "TOOL_CALL_START": {"toolCallId": str, "toolCallName": str},
    "TOOL_CALL_ARGS": {"toolCallId": str, "delta": str},
    "TOOL_CALL_END": {"toolCallId": str},
    "TOOL_CALL_RESULT": {"messageId": str, "toolCallId": str, "content": str},
}


class AgUiEvents:
    """Checks events against the required fields of the @ag-ui/core 0.0.57 zod schemas."""

    @staticmethod
    def check(event: dict[str, Any]) -> None:
        required = REQUIRED_FIELDS[event["type"]]
        for name, kind in required.items():
            assert isinstance(event.get(name), kind), f"{event['type']} needs {name}: {event}"
        if event["type"] == "TEXT_MESSAGE_START":
            assert event.get("role", "assistant") in ("developer", "system", "assistant", "user")
        if event["type"] == "TOOL_CALL_RESULT":
            assert event.get("role", "tool") == "tool"
        if event["type"] == "RUN_ERROR":
            assert isinstance(event.get("code", ""), str)
