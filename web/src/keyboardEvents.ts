export type ImeKeyboardEvent = Pick<KeyboardEvent, "isComposing" | "keyCode">;

/** Browsers use either the standard flag or legacy key code while an IME owns the keyboard. */
export function isImeKeyboardEvent(event: ImeKeyboardEvent) {
  return event.isComposing || event.keyCode === 229;
}
