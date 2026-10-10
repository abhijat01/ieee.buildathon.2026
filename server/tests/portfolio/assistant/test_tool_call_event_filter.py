from ag_ui.core import TextMessageContentEvent, ToolCallArgsEvent, ToolCallEndEvent, ToolCallStartEvent
from ieee.portfolio.assistant.tool_call_event_filter import ToolCallEventFilter


def test_a_repeated_start_or_end_event_of_one_call_is_dropped():
    repeated = ToolCallEventFilter()
    events = [ToolCallStartEvent(tool_call_id="call-1", tool_call_name="proposeText"),
              ToolCallStartEvent(tool_call_id="call-2", tool_call_name="proposeSkills"),
              ToolCallStartEvent(tool_call_id="call-1", tool_call_name="proposeText"),
              ToolCallEndEvent(tool_call_id="call-1"), ToolCallEndEvent(tool_call_id="call-1"),
              ToolCallEndEvent(tool_call_id="call-2")]
    assert [repeated.accepts(event) for event in events] == [True, True, False, True, False, True]


def test_other_events_are_never_dropped():
    repeated = ToolCallEventFilter()
    arguments = ToolCallArgsEvent(tool_call_id="call-1", delta="{}")
    text = TextMessageContentEvent(message_id="m1", delta="Hello")
    assert [repeated.accepts(event) for event in (arguments, arguments, text, text)] == [True] * 4


def test_each_run_has_a_new_filter():
    start = ToolCallStartEvent(tool_call_id="call-1", tool_call_name="proposeText")
    assert ToolCallEventFilter().accepts(start) and ToolCallEventFilter().accepts(start)
