/** Runs a task at most once in each animation frame. Many stream events then cause one render. */
export class FrameScheduler {
  private handle: number | null = null;

  constructor(private readonly task: () => void) {}

  request(): void {
    if (this.handle !== null) return;
    const run = () => { this.handle = null; this.task(); };
    this.handle = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(run) : window.setTimeout(run, 16);
  }

  /** Run a waiting task now, for example when the run ends. */
  flush(): void {
    if (this.handle === null) return;
    this.cancel(); this.task();
  }

  cancel(): void {
    if (this.handle === null) return;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.handle); else window.clearTimeout(this.handle);
    this.handle = null;
  }
}
