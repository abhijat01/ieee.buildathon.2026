from ag_ui.core import BaseEvent, EventType


class ToolCallEventFilter:
    """Drops repeated TOOL_CALL_START and TOOL_CALL_END events of one run.

    MAF sends these events a second time for parallel browser tool calls. The browser needs each event once.
    """

    def __init__(self):
        self.seen: set[tuple[EventType, str]] = set()

    def accepts(self, event: BaseEvent) -> bool:
        if event.type not in (EventType.TOOL_CALL_START, EventType.TOOL_CALL_END):
            return True
        key = (event.type, getattr(event, "tool_call_id", ""))
        if key in self.seen:
            return False
        self.seen.add(key)
        return True
