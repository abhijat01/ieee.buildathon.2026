import { Component, type KeyboardEvent } from 'react';

/** `discard` restores the saved version on the page. `leave` removes the form with its changes. */
interface Props { reason: 'discard' | 'leave'; onKeep: () => void; onDiscard: () => void }

/** Asks the member before the app discards unsaved changes. The focus starts on the safe choice. */
export class DiscardDialog extends Component<Props> {
  private keep: HTMLButtonElement | null = null;
  private trigger: HTMLElement | null = null;

  componentDidMount(): void {
    this.trigger = document.activeElement as HTMLElement | null;
    this.keep?.focus();
  }

  componentWillUnmount(): void { this.trigger?.focus?.(); }

  private keys = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') { event.stopPropagation(); this.props.onKeep(); }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button'));
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  render() {
    const { reason, onKeep, onDiscard } = this.props;
    return <div className="modal-backdrop confirm" onClick={event => { if (event.target === event.currentTarget) onKeep(); }}>
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onKeyDown={this.keys}>
        <h2 id="confirm-title">Discard your changes?</h2>
        <p>{reason === 'leave'
          ? 'You have unsaved changes. If you leave this page, the app does not keep them.'
          : 'The app restores the saved version of this experience. The conversation with the assistant also starts new.'}</p>
        <div className="actions">
          <button type="button" className="outline-button" ref={element => { this.keep = element; }} onClick={onKeep}>Keep editing</button>
          <button type="button" className="primary-button" onClick={onDiscard}>Discard changes</button></div>
      </section></div>;
  }
}
