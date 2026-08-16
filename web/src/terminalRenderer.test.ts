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

  it("holds IME keystrokes and emits the committed Chinese text once", async () => {
    const { renderer, sentData, terminalInput, textarea } = await mountInputTerminal();
    const disposeInput = renderer.onInput((data) => sentData.push(data));

    textarea.dispatchEvent(new FocusEvent("focus"));
    expect(textarea.classList.contains("ghostty-keyboard-input")).toBe(true);

    const legacyCompositionKey = new KeyboardEvent("keydown", { key: "n", bubbles: true });
    Object.defineProperty(legacyCompositionKey, "keyCode", { value: 229 });
    textarea.dispatchEvent(legacyCompositionKey);
    expect(sentData).toEqual([]);

    textarea.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    expect(textarea.classList.contains("ghostty-composing")).toBe(true);
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "n", isComposing: true, bubbles: true }),
    );
    textarea.value = "n";
    textarea.dispatchEvent(
      new InputEvent("input", { data: "n", inputType: "insertCompositionText", isComposing: true }),
    );
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "i", isComposing: true, bubbles: true }),
    );
    textarea.value = "ni";
    textarea.dispatchEvent(
      new InputEvent("input", { data: "i", inputType: "insertCompositionText", isComposing: true }),
    );

    expect(sentData).toEqual([]);

    textarea.value = "你";
    textarea.dispatchEvent(
      new CompositionEvent("compositionend", { data: "你", bubbles: true }),
    );
    const trailingBeforeInput = new InputEvent("beforeinput", {
      data: "你",
      inputType: "insertText",
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(trailingBeforeInput);

    expect(trailingBeforeInput.defaultPrevented).toBe(true);
    expect(sentData).toEqual(["你"]);
    expect(terminalInput).not.toHaveBeenCalled();

    disposeInput();
    renderer.dispose();
  });
});

async function mountInputTerminal() {
  const { InputHandler } = await vi.importActual<typeof import("ghostty-web")>("ghostty-web");
  const textarea = document.createElement("textarea");
  const canvas = document.createElement("canvas");
  const sentData: string[] = [];
  let customKeyHandler: ((event: KeyboardEvent) => boolean) | null = null;
  let dataHandler: ((data: string) => void) | null = null;
  let inputHandler: InstanceType<typeof InputHandler> | null = null;
  const emitData = (data: string) => dataHandler?.(data);
  const terminalInput = vi.fn((data: string) => emitData(data));
  const terminal = {
    cols: 80,
    rows: 24,
    options: {},
    textarea,
    renderer: {
      getCanvas: () => canvas,
      remeasureFont: vi.fn(),
    },
    loadAddon: vi.fn(),
    open: vi.fn((container: HTMLElement) => {
      container.append(textarea, canvas);
      inputHandler = new InputHandler(
        {
          createKeyEncoder: () => ({
            encode: vi.fn(() => new Uint8Array()),
            setOption: vi.fn(),
          }),
        } as never,
        container,
        emitData,
        vi.fn(),
        undefined,
        customKeyHandler ?? undefined,
      );
    }),
    attachCustomKeyEventHandler: vi.fn((handler: (event: KeyboardEvent) => boolean) => {
      customKeyHandler = handler;
      inputHandler?.setCustomKeyEventHandler(handler);
    }),
    attachCustomWheelEventHandler: vi.fn(),
    hasMouseTracking: vi.fn(() => false),
    input: terminalInput,
    onData: vi.fn((handler: (data: string) => void) => {
      dataHandler = handler;
      return { dispose: () => (dataHandler = null) };
    }),
    clearSelection: vi.fn(),
    scrollLines: vi.fn(),
    dispose: vi.fn(() => inputHandler?.dispose()),
  };
  const fitAddon = { fit: vi.fn(), dispose: vi.fn() };
  ghosttyMocks.terminal.mockImplementation(function TerminalMock() {
    return terminal;
  });
  ghosttyMocks.fitAddon.mockImplementation(function FitAddonMock() {
    return fitAddon;
  });

  const renderer = new GhosttyRenderer();
  await renderer.mount(document.createElement("div"));
  return { renderer, sentData, terminalInput, textarea };
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
