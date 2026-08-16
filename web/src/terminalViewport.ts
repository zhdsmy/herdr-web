const VIEWPORT_SETTLE_DELAY_MS = 180;
const VISUAL_KEYBOARD_MIN_HEIGHT_PX = 80;
const VISUAL_VIEWPORT_OFFSET_ALLOWANCE_PX = 40;

type TerminalViewport = Pick<EventTarget, "addEventListener" | "removeEventListener">;
type VisualViewportGeometry = Pick<VisualViewport, "height" | "offsetTop">;
type ViewportScheduler = Pick<
  Window,
  "cancelAnimationFrame" | "clearTimeout" | "requestAnimationFrame" | "setTimeout"
>;

export type LayoutViewportBaseline = {
  width: number;
  height: number;
};

export function updateLayoutViewportBaseline(
  baseline: LayoutViewportBaseline | null,
  width: number,
  height: number,
): LayoutViewportBaseline {
  if (!baseline || baseline.width !== width) {
    return { width, height };
  }
  return { width, height: Math.max(baseline.height, height) };
}

export function isVisualKeyboardOpen(
  layoutViewportHeight: number,
  visualViewport: VisualViewportGeometry | null | undefined,
) {
  if (!visualViewport) {
    return false;
  }
  // iOS can pan the visual viewport far down while keeping the keyboard open.
  const obscuredHeight =
    layoutViewportHeight -
    visualViewport.height -
    Math.min(visualViewport.offsetTop, VISUAL_VIEWPORT_OFFSET_ALLOWANCE_PX);
  return obscuredHeight >= VISUAL_KEYBOARD_MIN_HEIGHT_PX;
}

export function observeTerminalViewport(
  viewport: TerminalViewport,
  scheduler: ViewportScheduler,
  refit: () => void,
) {
  let animationFrame: number | null = null;
  let settleTimer: number | null = null;

  const cancelPendingRefit = () => {
    if (animationFrame !== null) {
      scheduler.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (settleTimer !== null) {
      scheduler.clearTimeout(settleTimer);
      settleTimer = null;
    }
  };

  const scheduleRefit = () => {
    cancelPendingRefit();
    animationFrame = scheduler.requestAnimationFrame(() => {
      animationFrame = null;
      refit();
    });
    settleTimer = scheduler.setTimeout(() => {
      settleTimer = null;
      refit();
    }, VIEWPORT_SETTLE_DELAY_MS);
  };

  viewport.addEventListener("resize", scheduleRefit);
  viewport.addEventListener("scroll", scheduleRefit);

  return () => {
    viewport.removeEventListener("resize", scheduleRefit);
    viewport.removeEventListener("scroll", scheduleRefit);
    cancelPendingRefit();
  };
}
