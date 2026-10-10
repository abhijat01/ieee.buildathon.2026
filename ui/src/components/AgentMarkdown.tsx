import { Component } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export class AgentMarkdown extends Component<{ text: string }> {
  render() {
    return <div className="agent-markdown"><Markdown remarkPlugins={[remarkGfm]} components={{
      a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer"/>,
      table: ({ node: _node, ...props }) => <div className="markdown-table"><table {...props}/></div>,
    }}>{this.props.text}</Markdown></div>;
  }
}
