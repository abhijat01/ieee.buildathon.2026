import { Component } from 'react';
import Markdown from 'react-markdown';

/** Shows Markdown as formatted text. It drops raw HTML, and react-markdown removes unsafe link targets. */
export class MarkdownView extends Component<{ text: string }> {
  render() {
    return <div className="markdown"><Markdown skipHtml components={{
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    }}>{this.props.text}</Markdown></div>;
  }
}
