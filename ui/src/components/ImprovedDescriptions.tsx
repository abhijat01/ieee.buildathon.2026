import { Component } from 'react';
import { ChevronDown, ShieldCheck, Sparkles } from 'lucide-react';
import type { ItemDescription } from '../services/ApiClient';
import { MarkdownView } from './MarkdownView';

interface State { open: string[] }

/** Lists the included items. An open row compares the portfolio text with the text in the resume. */
export class ImprovedDescriptions extends Component<{ descriptions: ItemDescription[] }, State> {
  state: State = { open: [] };

  private toggle = (itemId: string): void => this.setState(state => ({
    open: state.open.includes(itemId) ? state.open.filter(id => id !== itemId) : [...state.open, itemId] }));

  private row(description: ItemDescription) {
    const open = this.state.open.includes(description.itemId);
    return <li key={description.itemId}>
      <button type="button" className="improved-toggle" aria-expanded={open} onClick={() => this.toggle(description.itemId)}>
        <strong>{description.title}</strong>{description.company && <small>{description.company}</small>}<ChevronDown size={15}/></button>
      {open && <div className="compare">
        <div className="compare-side"><div className="compare-label">IN YOUR PORTFOLIO</div><MarkdownView text={description.originalText}/></div>
        <div className="compare-side improved"><div className="compare-label"><Sparkles size={12}/> IN THE RESUME</div><MarkdownView text={description.improvedText}/></div>
      </div>}
    </li>;
  }

  render() {
    return <section className="panel rs-improved" aria-label="Improved descriptions">
      <div className="panel-heading"><h2>Improved descriptions</h2><span className="hint">Open an item to compare the two versions.</span></div>
      <ul className="improved-list">{this.props.descriptions.map(description => this.row(description))}</ul>
      <p className="ai-note"><ShieldCheck size={14}/><span>The AI changes the words for the job. It does not add or change facts. Your portfolio stays unchanged.</span></p>
    </section>;
  }
}
