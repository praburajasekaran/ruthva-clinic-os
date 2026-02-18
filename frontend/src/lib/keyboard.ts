/**
 * Returns true if a keyboard shortcut should be suppressed.
 * Guards against:
 * - Tamil IME mid-composition (e.isComposing)
 * - User typing in an input/textarea/select
 * - User typing in a contenteditable element
 */
export function isShortcutSuppressed(e: KeyboardEvent): boolean {
  if (e.isComposing) return true;
  const target = e.target as HTMLElement;
  const tag = target.tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return true;
  if (target.isContentEditable) return true;
  return false;
}
