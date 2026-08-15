import type { KeyToken } from "./types";

/**
 * Translation between browser keyboard events and the engine's key tokens.
 *
 * A token is either a single printable character (`d`, `2`, `"`) or a bracketed
 * name (`<Esc>`, `<CR>`, `<C-r>`). Keeping tokens as plain strings means a
 * recorded macro, the `.` register, and an exercise's reference solution are all
 * the same thing: a list of strings.
 */

const NAMED: Record<string, KeyToken> = {
  Escape: "<Esc>",
  Enter: "<CR>",
  Backspace: "<BS>",
  Tab: "<Tab>",
  Delete: "<Del>",
  ArrowLeft: "<Left>",
  ArrowRight: "<Right>",
  ArrowUp: "<Up>",
  ArrowDown: "<Down>",
  Home: "<Home>",
  End: "<End>",
  PageUp: "<PageUp>",
  PageDown: "<PageDown>",
  " ": "<Space>",
};

/** Keys that only ever modify, and never produce a token of their own. */
const MODIFIERS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "NumLock",
  "ScrollLock",
  "Dead",
]);

export type BrowserKeyEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

/**
 * Returns null for keys the engine does not consume — modifier presses on their
 * own, and anything held with Meta so browser shortcuts still work.
 */
export function tokenFromEvent(event: BrowserKeyEvent): KeyToken | null {
  if (MODIFIERS.has(event.key)) return null;
  if (event.metaKey) return null;

  if (event.ctrlKey) {
    const base = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (base.length === 1) return `<C-${base}>`;
    const named = NAMED[event.key];
    return named ? `<C-${named.slice(1, -1)}>` : null;
  }

  const named = NAMED[event.key];
  if (named) return named;

  if (event.key.length === 1) return event.key;
  return null;
}

/** True if the token stands for a single literal character the buffer can hold. */
export function isPrintable(token: KeyToken): boolean {
  return token.length === 1 || token === "<Space>" || token === "<Tab>";
}

/** The literal character a printable token inserts. */
export function printableChar(token: KeyToken): string {
  if (token === "<Space>") return " ";
  if (token === "<Tab>") return "\t";
  return token;
}

/**
 * Parse a written key sequence — `"dw"`, `"2<C-r>"`, `"ciw<Esc>"` — into tokens.
 * Exercise solutions and macro fixtures are authored in this notation.
 */
export function parseKeys(source: string): KeyToken[] {
  const tokens: KeyToken[] = [];
  let i = 0;
  while (i < source.length) {
    if (source[i] === "<") {
      const close = source.indexOf(">", i);
      if (close !== -1) {
        tokens.push(source.slice(i, close + 1));
        i = close + 1;
        continue;
      }
    }
    tokens.push(source[i]);
    i += 1;
  }
  return tokens;
}

/** Render a token list back to the notation `parseKeys` accepts. */
export function formatKeys(tokens: KeyToken[]): string {
  return tokens.join("");
}
