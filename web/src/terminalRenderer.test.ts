/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { GhosttyRenderer } from "./terminalRenderer";

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
