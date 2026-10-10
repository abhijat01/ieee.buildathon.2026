import { describe, expect, it, vi } from 'vitest';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';

class Fixture {
  readonly ask = vi.fn();
  readonly target = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
  readonly guard = new UnsavedChangesGuard(this.ask, this.target);
}

describe('UnsavedChangesGuard', () => {
  it('runs a navigation at once when the form has no unsaved changes', () => {
    const { guard, ask } = new Fixture(); const navigation = vi.fn();
    guard.leave(navigation);
    expect(navigation).toHaveBeenCalledTimes(1);
    expect(ask).not.toHaveBeenCalled();
  });

  it('asks before a navigation with unsaved changes, and runs it only after the member confirms', () => {
    const { guard, ask } = new Fixture(); const navigation = vi.fn();
    guard.setUnsaved(true);
    guard.leave(navigation);
    expect(ask).toHaveBeenLastCalledWith(true);
    expect(navigation).not.toHaveBeenCalled();
    guard.confirm();
    expect(ask).toHaveBeenLastCalledWith(false);
    expect(navigation).toHaveBeenCalledTimes(1);
    guard.leave(navigation);
    expect(navigation).toHaveBeenCalledTimes(2);
  });

  it('keeps the form when the member selects Keep editing', () => {
    const { guard, ask } = new Fixture(); const navigation = vi.fn();
    guard.setUnsaved(true);
    guard.leave(navigation);
    guard.cancel();
    expect(ask).toHaveBeenLastCalledWith(false);
    guard.confirm();
    expect(navigation).not.toHaveBeenCalled();
  });

  it('lets the browser ask before a reload or a close of the tab only while changes are unsaved', () => {
    const { guard, target } = new Fixture();
    guard.setUnsaved(true); guard.setUnsaved(true);
    expect(target.addEventListener).toHaveBeenCalledTimes(1);
    const listener = target.addEventListener.mock.calls[0][1];
    const event = { preventDefault: vi.fn(), returnValue: undefined as unknown };
    listener(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('');
    guard.setUnsaved(false);
    expect(target.removeEventListener).toHaveBeenCalledWith('beforeunload', listener);
  });
});
