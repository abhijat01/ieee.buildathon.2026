import { Component } from 'react';
import { Check, ChevronRight, LoaderCircle } from 'lucide-react';
import type { ToolActivity } from '../services/AgentTranscript';

interface Props { activities: ToolActivity[]; working: boolean; answering: boolean }

/** One compact line for the tool activity of an assistant turn. The details list opens on request. */
export class AgentActivity extends Component<Props> {
  private static describe(activity: ToolActivity): string {
    return activity.detail ? `${activity.label} · ${activity.detail}` : activity.label;
  }

  private status(): { text: string; busy: boolean } {
    const running = this.props.activities.filter(activity => !activity.done);
    if (this.props.working && running.length) return { text: `${AgentActivity.describe(running[running.length - 1]!)}…`, busy: true };
    if (this.props.working && !this.props.answering) return { text: 'Preparing the answer…', busy: true };
    const count = this.props.activities.reduce((total, activity) => total + activity.count, 0);
    return { text: count === 1 ? AgentActivity.describe(this.props.activities[0]!) : `Used ${count} tools`, busy: false };
  }

  render() {
    if (!this.props.activities.length) return null;
    const status = this.status();
    return <details className="agent-activity">
      <summary aria-live="off">
        {status.busy ? <LoaderCircle size={13} className="spin" aria-hidden="true"/> : <Check size={13} aria-hidden="true"/>}
        <span className="activity-status">{status.text}</span>
        <ChevronRight size={13} className="activity-chevron" aria-hidden="true"/>
      </summary>
      <ul>{this.props.activities.map(activity => <li key={activity.key}>
        {activity.done ? <Check size={12} aria-hidden="true"/> : <LoaderCircle size={12} className="spin" aria-hidden="true"/>}
        <span>{AgentActivity.describe(activity)}</span>{activity.count > 1 && <span className="activity-count">×{activity.count}</span>}
      </li>)}</ul>
    </details>;
  }
}
