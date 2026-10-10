/** The resume as a Markdown file. It owns the clipboard copy and the file download in the browser. */
export class ResumeFile {
  static readonly mediaType = 'text/markdown';

  constructor(private readonly markdown: string, private readonly fileName: string) {}

  /** Copies the Markdown to the clipboard. The promise rejects when the browser does not permit the copy. */
  async copy(): Promise<void> {
    await navigator.clipboard.writeText(this.markdown);
  }

  /** Starts the download of the `.md` file with the file name of the server. */
  download(): void {
    const url = URL.createObjectURL(new Blob([this.markdown], { type: ResumeFile.mediaType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = this.fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
