import { describe, expect, it } from "vitest";
import { isImeKeyboardEvent } from "./keyboardEvents";

describe("isImeKeyboardEvent", () => {
  it("recognizes standard and legacy IME keyboard events", () => {
    expect(isImeKeyboardEvent({ isComposing: true, keyCode: 0 })).toBe(true);
    expect(isImeKeyboardEvent({ isComposing: false, keyCode: 229 })).toBe(true);
    expect(isImeKeyboardEvent({ isComposing: false, keyCode: 65 })).toBe(false);
  });
});
