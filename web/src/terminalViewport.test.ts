import { describe, expect, it, vi } from "vitest";
import { observeTerminalViewport } from "./terminalViewport";

function createScheduler() {
  let nextHandle = 1;
  const frames = new Map<number, FrameRequestCallback>();
  const timers = new Map<number, () => void>();
  const scheduler = {
    cancelAnimationFrame: vi.fn((handle: number) => frames.delete(handle)),
    clearTimeout: vi.fn((handle: number) => timers.delete(handle)),
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      const handle = nextHandle++;
      frames.set(handle, callback);
      return handle;
    }),
    setTimeout: vi.fn((callback: TimerHandler) => {
      const handle = nextHandle++;
      if (typeof callback === "function") {
        timers.set(handle, () => callback());
      }
      return handle;
    }),
  };
  return { frames, scheduler, timers };
}

describe("observeTerminalViewport", () => {
  it("refits on the next frame and after the viewport settles", () => {
    const viewport = new EventTarget();
    const { frames, scheduler, timers } = createScheduler();
    const refit = vi.fn();
    observeTerminalViewport(viewport, scheduler, refit);

    viewport.dispatchEvent(new Event("resize"));
    frames.values().next().value?.(0);
    expect(refit).toHaveBeenCalledTimes(1);

    timers.values().next().value?.();
    expect(refit).toHaveBeenCalledTimes(2);
  });

  it("replaces pending work when viewport events repeat", () => {
    const viewport = new EventTarget();
    const { frames, scheduler, timers } = createScheduler();
    const refit = vi.fn();
    observeTerminalViewport(viewport, scheduler, refit);

    viewport.dispatchEvent(new Event("resize"));
    viewport.dispatchEvent(new Event("scroll"));

    expect(scheduler.cancelAnimationFrame).toHaveBeenCalledOnce();
    expect(scheduler.clearTimeout).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
    expect(timers.size).toBe(1);
  });

  it("removes listeners and cancels pending work when disposed", () => {
    const viewport = new EventTarget();
    const { frames, scheduler, timers } = createScheduler();
    const refit = vi.fn();
    const dispose = observeTerminalViewport(viewport, scheduler, refit);
    viewport.dispatchEvent(new Event("resize"));

    dispose();
    viewport.dispatchEvent(new Event("resize"));

    expect(frames.size).toBe(0);
    expect(timers.size).toBe(0);
    expect(scheduler.requestAnimationFrame).toHaveBeenCalledOnce();
    expect(refit).not.toHaveBeenCalled();
  });
});
