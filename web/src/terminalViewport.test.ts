import { describe, expect, it, vi } from "vitest";
import {
  isVisualKeyboardOpen,
  observeTerminalViewport,
  updateLayoutViewportBaseline,
} from "./terminalViewport";

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

describe("isVisualKeyboardOpen", () => {
  it("detects a software keyboard from the obscured viewport height", () => {
    expect(isVisualKeyboardOpen(844, { height: 540, offsetTop: 24 })).toBe(true);
  });

  it("ignores browser chrome and small viewport offsets", () => {
    expect(isVisualKeyboardOpen(844, { height: 740, offsetTop: 25 })).toBe(false);
  });

  it("stays closed when visual viewport metrics are unavailable", () => {
    expect(isVisualKeyboardOpen(844, null)).toBe(false);
  });
});

describe("updateLayoutViewportBaseline", () => {
  it("keeps the full viewport height while the keyboard shrinks innerHeight", () => {
    expect(updateLayoutViewportBaseline({ width: 390, height: 844 }, 390, 540)).toEqual({
      width: 390,
      height: 844,
    });
  });

  it("resets the baseline when the viewport width changes", () => {
    expect(updateLayoutViewportBaseline({ width: 390, height: 844 }, 844, 390)).toEqual({
      width: 844,
      height: 390,
    });
  });
});

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
