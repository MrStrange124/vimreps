import type { EditorState, Position } from "./types";

/**
 * Buffer primitives. Vim's motions are almost entirely defined in terms of
 * character classes, so getting `charClass` right is what makes `w`, `b`, `e`
 * and the word text objects agree with real Vim.
 */

export type CharClass = "blank" | "word" | "punct";

export function charClass(ch: string | undefined): CharClass {
  if (ch === undefined || ch === "" || ch === " " || ch === "\t") return "blank";
  if (/[A-Za-z0-9_]/.test(ch)) return "word";
  return "punct";
}

/** WORD (capital-letter motions) classes: anything non-blank is one class. */
export function bigCharClass(ch: string | undefined): CharClass {
  return charClass(ch) === "blank" ? "blank" : "word";
}

export function lineAt(state: EditorState, line: number): string {
  return state.lines[line] ?? "";
}

export function charAt(state: EditorState, pos: Position): string | undefined {
  return lineAt(state, pos.line)[pos.col];
}

export function lastLine(state: EditorState): number {
  return Math.max(0, state.lines.length - 1);
}

/**
 * Highest column the cursor may occupy. Normal mode rests *on* a character, so
 * the last valid column is `length - 1`; insert mode may sit one past the end.
 */
export function maxCol(state: EditorState, line: number, forInsert = false): number {
  const len = lineAt(state, line).length;
  return forInsert ? len : Math.max(0, len - 1);
}

export function clampPosition(
  state: EditorState,
  pos: Position,
  forInsert = false,
): Position {
  const line = Math.min(Math.max(0, pos.line), lastLine(state));
  const col = Math.min(Math.max(0, pos.col), maxCol(state, line, forInsert));
  return { line, col };
}

export function samePosition(a: Position, b: Position): boolean {
  return a.line === b.line && a.col === b.col;
}

/** Ordering over positions: -1 if a precedes b, 1 if it follows, 0 if equal. */
export function comparePositions(a: Position, b: Position): number {
  if (a.line !== b.line) return a.line < b.line ? -1 : 1;
  if (a.col !== b.col) return a.col < b.col ? -1 : 1;
  return 0;
}

export function sortPositions(a: Position, b: Position): [Position, Position] {
  return comparePositions(a, b) <= 0 ? [a, b] : [b, a];
}

export function isBlankLine(state: EditorState, line: number): boolean {
  return lineAt(state, line).trim() === "";
}

/** Column of the first non-blank character, or 0 for an all-blank line. */
export function firstNonBlank(state: EditorState, line: number): number {
  const text = lineAt(state, line);
  const idx = text.search(/\S/);
  return idx === -1 ? 0 : idx;
}

/** Column of the last non-blank character, or 0. */
export function lastNonBlank(state: EditorState, line: number): number {
  const text = lineAt(state, line);
  for (let i = text.length - 1; i >= 0; i--) {
    if (charClass(text[i]) !== "blank") return i;
  }
  return 0;
}

/** Step one character forward, wrapping to the next line. Null at end of buffer. */
export function nextPosition(state: EditorState, pos: Position): Position | null {
  if (pos.col < lineAt(state, pos.line).length - 1) {
    return { line: pos.line, col: pos.col + 1 };
  }
  if (pos.line < lastLine(state)) return { line: pos.line + 1, col: 0 };
  return null;
}

/** Step one character back, wrapping to the previous line. Null at start of buffer. */
export function prevPosition(state: EditorState, pos: Position): Position | null {
  if (pos.col > 0) return { line: pos.line, col: pos.col - 1 };
  if (pos.line > 0) {
    const prev = pos.line - 1;
    return { line: prev, col: Math.max(0, lineAt(state, prev).length - 1) };
  }
  return null;
}

/** Extract the text between two positions, end-exclusive. */
export function sliceBuffer(
  lines: string[],
  start: Position,
  end: Position,
): string {
  if (start.line === end.line) {
    return (lines[start.line] ?? "").slice(start.col, end.col);
  }
  const parts: string[] = [(lines[start.line] ?? "").slice(start.col)];
  for (let l = start.line + 1; l < end.line; l++) parts.push(lines[l] ?? "");
  parts.push((lines[end.line] ?? "").slice(0, end.col));
  return parts.join("\n");
}

/** Replace the text between two positions, end-exclusive, with `replacement`. */
export function spliceBuffer(
  lines: string[],
  start: Position,
  end: Position,
  replacement: string,
): string[] {
  const head = (lines[start.line] ?? "").slice(0, start.col);
  const tail = (lines[end.line] ?? "").slice(end.col);
  const merged = (head + replacement + tail).split("\n");
  return [...lines.slice(0, start.line), ...merged, ...lines.slice(end.line + 1)];
}
