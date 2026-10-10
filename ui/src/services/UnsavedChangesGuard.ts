/** The part of `window` that the guard uses. Tests give a simple object. */
export interface UnloadTarget {
  addEventListener(type: 'beforeunload', listener: (event: BeforeUnloadEvent) => void): void;
  removeEventListener(type: 'beforeunload', listener: (event: BeforeUnloadEvent) => void): void;
}

/**
 * Protects a form with unsaved changes when the member leaves it.
 *
 * The form reports its unsaved state. Each navigation in the app runs through `leave`.
 * With unsaved changes, the guard asks first. The browser asks before a reload or a close of the tab.
 */
export class UnsavedChangesGuard {
  private unsaved = false;
  private waiting: (() => void) | null = null;

  /** `ask` shows or hides the question "Discard your changes?". */
  constructor(private readonly ask: (open: boolean) => void, private readonly target: UnloadTarget = window) {}

  setUnsaved(unsaved: boolean): void {
    if (unsaved === this.unsaved) return;
    this.unsaved = unsaved;
    if (unsaved) this.target.addEventListener('beforeunload', this.beforeUnload);
    else this.target.removeEventListener('beforeunload', this.beforeUnload);
  }

  /** Runs the navigation now, or after the member confirms that the changes can go. */
  leave(navigation: () => void): void {
    if (!this.unsaved) { navigation(); return; }
    this.waiting = navigation;
    this.ask(true);
  }

  /** The member selected "Discard changes". */
  confirm(): void {
    const navigation = this.waiting;
    this.waiting = null;
    this.setUnsaved(false);
    this.ask(false);
    navigation?.();
  }

  /** The member selected "Keep editing". */
  cancel(): void {
    this.waiting = null;
    this.ask(false);
  }

  /** Some browsers need `returnValue` and not only `preventDefault` to ask the question. */
  private beforeUnload = (event: BeforeUnloadEvent): void => { event.preventDefault(); event.returnValue = ''; };
}
