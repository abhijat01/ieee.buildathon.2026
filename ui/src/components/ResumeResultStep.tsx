import { Component, type ReactNode } from 'react';
import { ArrowLeft, Check, Code, Copy, Download, Eye } from 'lucide-react';
import type { Resume } from '../services/ApiClient';
import { ResumeFile } from '../services/ResumeFile';
import { AtsCheckPanel } from './AtsCheckPanel';
import { ImprovedDescriptions } from './ImprovedDescriptions';
import { MarkdownView } from './MarkdownView';

interface Props { resume: Resume; onBack: () => void; onRestart: () => void }
interface State { tab: 'preview' | 'markdown'; copied: boolean; copyFailed: boolean }

/** Step 3 of the resume builder: the resume, the ATS check, and the improved descriptions. */
export class ResumeResultStep extends Component<Props, State> {
  private static readonly copiedMilliseconds = 2000;
  private copiedTimer: number | undefined;
  state: State = { tab: 'preview', copied: false, copyFailed: false };

  componentWillUnmount(): void { window.clearTimeout(this.copiedTimer); }

  private file(): ResumeFile { return new ResumeFile(this.props.resume.markdown, this.props.resume.fileName); }

  private copy = async (): Promise<void> => {
    try {
      await this.file().copy();
      this.setState({ copied: true, copyFailed: false });
      window.clearTimeout(this.copiedTimer);
      this.copiedTimer = window.setTimeout(() => this.setState({ copied: false }), ResumeResultStep.copiedMilliseconds);
    } catch { this.setState({ copied: false, copyFailed: true, tab: 'markdown' }); }
  };

  private tabButton(tab: State['tab'], label: string, icon: ReactNode) {
    return <button type="button" role="tab" aria-selected={this.state.tab === tab} onClick={() => this.setState({ tab })}>{icon} {label}</button>;
  }

  render() {
    const { resume, onBack, onRestart } = this.props;
    const { tab, copied, copyFailed } = this.state;
    return <>
      <div className="resume-layout">
        <section className="panel" aria-label="Your resume">
          <div className="panel-heading"><h2>Your resume</h2>
            <div className="tabs" role="tablist" aria-label="Resume view">
              {this.tabButton('preview', 'Preview', <Eye size={13}/>)}{this.tabButton('markdown', 'Markdown', <Code size={13}/>)}</div>
            <div className="resume-tools">
              <button type="button" className="outline-button" onClick={() => void this.copy()}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy Markdown'}</button>
              <button type="button" className="primary-button" onClick={() => this.file().download()}><Download size={15}/> Download .md</button>
            </div></div>
          {copyFailed && <p className="rs-note rs-copy-note" role="status">The browser did not permit the copy. Select the text below and copy it.</p>}
          {tab === 'preview'
            ? <div className="resume-paper" aria-label="Resume preview"><MarkdownView text={resume.markdown}/></div>
            : <pre className="md-source" aria-label="Resume Markdown">{resume.markdown}</pre>}
        </section>
        <AtsCheckPanel check={resume.atsCheck}/>
      </div>
      <ImprovedDescriptions descriptions={resume.descriptions}/>
      <div className="actions"><button type="button" className="text-button" onClick={onBack}><ArrowLeft size={14}/> Change the selection</button><span className="spacer"/>
        <button type="button" className="outline-button" onClick={onRestart}>Start a new resume</button></div>
    </>;
  }
}
