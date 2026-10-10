import { Component } from 'react';
import type { ExperienceType } from '../services/ApiClient';

export class ExperienceTypeBadge extends Component<{ type: ExperienceType }> {
  render() {
    return this.props.type === 'PROJECT'
      ? <span className="type-badge project">Project</span>
      : <span className="type-badge work">Work experience</span>;
  }
}
