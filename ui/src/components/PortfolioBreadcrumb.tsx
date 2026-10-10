import { Component } from 'react';
import { LayoutGrid } from 'lucide-react';

interface Props { current?: string; onPortfolio: () => void }

/** The breadcrumb of the portfolio screens. Without `current`, Portfolio is the current page. */
export class PortfolioBreadcrumb extends Component<Props> {
  render() {
    const { current, onPortfolio } = this.props;
    return <div className="breadcrumb"><LayoutGrid size={13}/> Workspace <span>/</span>
      {current ? <><button type="button" onClick={onPortfolio}>Portfolio</button><span>/</span><strong>{current}</strong></> : <strong>Portfolio</strong>}
    </div>;
  }
}
