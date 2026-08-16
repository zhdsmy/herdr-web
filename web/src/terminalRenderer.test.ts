/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { GhosttyRenderer, remapLightTerminalCell } from "./terminalRenderer";

const ghosttyMocks = vi.hoisted(() => ({
  fitAddon: vi.fn(),
  init: vi.fn(async () => undefined),
  terminal: vi.fn(),
}));

vi.mock("ghostty-web", () => ({
  FitAddon: ghosttyMocks.fitAddon,
  Terminal: ghosttyMocks.terminal,
  init: ghosttyMocks.init,
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const originalFontsDescriptor = Object.getOwnPropertyDescriptor(document, "fonts");

afterEach(() => {
  if (originalFontsDescriptor) {
    Object.defineProperty(document, "fonts", originalFontsDescriptor);
  } else {
    Reflect.deleteProperty(document, "fonts");
  }
  vi.clearAllMocks();
});

describe("GhosttyRenderer", () => {
  it("maps the fixed Codex dark prompt surface to the light terminal surface", () => {
    const promptCell = { bg_r: 57, bg_g: 57, bg_b: 71 };
    const unrelatedCell = { bg_r: 61, bg_g: 48, bg_b: 40 };

    remapLightTerminalCell(promptCell);
    remapLightTerminalCell(unrelatedCell);

    expect(promptCell).toEqual({ bg_r: 240, bg_g: 232, bg_b: 216 });
    expect(unrelatedCell).toEqual({ bg_r: 61, bg_g: 48, bg_b: 40 });
  });

  it("does not mount a terminal after disposal while its font is loading", async () => {
    const fontLoad = deferred<FontFace[]>();
    const load = vi.fn(() => fontLoad.promise);
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load },
    });

    const renderer = new GhosttyRenderer();
    const mount = renderer.mount(document.createElement("div"));

    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(load).toHaveBeenNthCalledWith(1, '13px "Noto Sans Mono Variable"');
    expect(load).toHaveBeenNthCalledWith(2, '13px "Noto Sans SC"', "中文");
    renderer.dispose();
    const rejectedMount = expect(mount).rejects.toThrow("terminal renderer disposed");
    fontLoad.resolve([]);

    await rejectedMount;
    expect(ghosttyMocks.terminal).not.toHaveBeenCalled();
  });
});

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
