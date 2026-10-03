import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHoldConfirm } from './holdConfirm';

describe('createHoldConfirm', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('feuert onComplete genau einmal nach holdMs', () => {
    const onComplete = vi.fn();
    const hold = createHoldConfirm(1500, onComplete);
    hold.start();
    vi.advanceTimersByTime(1499);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('vorzeitiges Loslassen bricht ab — kein Callback', () => {
    const onComplete = vi.fn();
    const hold = createHoldConfirm(1500, onComplete);
    hold.start();
    vi.advanceTimersByTime(1000);
    hold.cancel();
    vi.advanceTimersByTime(10_000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(hold.isHolding()).toBe(false);
  });

  it('ignoriert start() während eines laufenden Holds (Multi-Touch)', () => {
    const onComplete = vi.fn();
    const hold = createHoldConfirm(1500, onComplete);
    hold.start();
    vi.advanceTimersByTime(1000);
    hold.start(); // zweiter Finger — muss den laufenden Hold nicht verlängern oder doppelt feuern
    vi.advanceTimersByTime(500);
    expect(onComplete).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cancel() nach gefeuertem Callback ist ein No-op', () => {
    const onComplete = vi.fn();
    const hold = createHoldConfirm(1500, onComplete);
    hold.start();
    vi.advanceTimersByTime(1500);
    hold.cancel();
    vi.advanceTimersByTime(10_000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('nach Abort lässt sich neu halten und dann wird gefeuert', () => {
    const onComplete = vi.fn();
    const hold = createHoldConfirm(1500, onComplete);
    hold.start();
    vi.advanceTimersByTime(500);
    hold.cancel();
    hold.start();
    vi.advanceTimersByTime(1499);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('isHolding spiegelt den Zustand', () => {
    const hold = createHoldConfirm(1500, vi.fn());
    expect(hold.isHolding()).toBe(false);
    hold.start();
    expect(hold.isHolding()).toBe(true);
    hold.cancel();
    expect(hold.isHolding()).toBe(false);
  });
});
