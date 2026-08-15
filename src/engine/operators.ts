import type {
  EditorState,
  Position,
  Range,
  RangeKind,
  Register,
  Registers,
} from "./types";
import {
  clampPosition,
  firstNonBlank,
  lastLine,
  lineAt,
  maxCol,
  sliceBuffer,
  sortPositions,
  spliceBuffer,
} from "./text";
import { pushUndo } from "./state";

/**
 * Operators consume a range and rewrite the buffer.
 *
 * Everything upstream — motions, text objects, visual selections — funnels into
 * `normalizeRange`, so an operator never has to care whether it was handed `dw`,
 * `diw`, or a visual selection. One code path means `d` and `c` and `y` cannot
 * disagree about what "this word" means.
 */

export type NormalRange = {
  start: Position;
  /** Exclusive end. For linewise ranges this is the start of the line after the last. */
  end: Position;
  linewise: boolean;
  /** Lines covered, for linewise operations. */
  firstLine: number;
  lastLine: number;
};

export function normalizeRange(
  state: EditorState,
  from: Position,
  to: Position,
  kind: RangeKind,
): NormalRange {
  const [a, b] = sortPositions(from, to);

  if (kind === "linewise") {
    return {
      start: { line: a.line, col: 0 },
      end: { line: b.line + 1, col: 0 },
      linewise: true,
      firstLine: a.line,
      lastLine: b.line,
    };
  }

  const end =
    kind === "inclusive" ? { line: b.line, col: b.col + 1 } : { line: b.line, col: b.col };

  return {
    start: a,
    end,
    linewise: false,
    firstLine: a.line,
    lastLine: b.line,
  };
}

export function rangeFromTextObject(state: EditorState, range: Range): NormalRange {
  return normalizeRange(state, range.start, range.end, range.kind);
}

/* ------------------------------------------------------------- registers -- */

/**
 * Vim's register shuffle, kept honest in one place: a yank fills `0`, a
 * multi-line delete pushes `1` and shifts `1`-`9` down, a small delete fills
 * `-`. Every write also lands in the unnamed register.
 */
export function writeRegister(
  registers: Registers,
  name: string | null,
  value: Register,
  operation: "yank" | "delete",
): Registers {
  const next: Registers = { ...registers };

  if (name) {
    const lower = name.toLowerCase();
    if (name !== lower && next[lower]) {
      const existing = next[lower];
      next[lower] = {
        text: existing.linewise
          ? `${existing.text.replace(/\n$/, "")}\n${value.text}`
          : existing.text + value.text,
        linewise: existing.linewise || value.linewise,
      };
    } else {
      next[lower] = value;
    }
    next['"'] = next[lower];
    return next;
  }

  next['"'] = value;
  if (operation === "yank") {
    next["0"] = value;
    return next;
  }

  if (value.linewise || value.text.includes("\n")) {
    for (let i = 9; i > 1; i--) {
      if (next[String(i - 1)]) next[String(i)] = next[String(i - 1)];
    }
    next["1"] = value;
  } else {
    next["-"] = value;
  }
  return next;
}

export function readRegister(state: EditorState, name: string | null): Register | null {
  const key = name ? name.toLowerCase() : '"';
  return state.registers[key] ?? null;
}

/* --------------------------------------------------------------- yank -- */

export function textOfRange(state: EditorState, range: NormalRange): Register {
  if (range.linewise) {
    const lines = state.lines.slice(range.firstLine, range.lastLine + 1);
    return { text: `${lines.join("\n")}\n`, linewise: true };
  }
  return { text: sliceBuffer(state.lines, range.start, range.end), linewise: false };
}

export function opYank(
  state: EditorState,
  range: NormalRange,
  register: string | null,
): EditorState {
  const value = textOfRange(state, range);
  const cursor = range.linewise
    ? { line: range.firstLine, col: state.cursor.col }
    : range.start;
  return {
    ...state,
    registers: writeRegister(state.registers, register, value, "yank"),
    cursor: clampPosition(state, cursor),
  };
}

/* -------------------------------------------------------------- delete -- */

export function opDelete(
  state: EditorState,
  range: NormalRange,
  register: string | null,
  { keepCursorColumn = false }: { keepCursorColumn?: boolean } = {},
): EditorState {
  const value = textOfRange(state, range);
  const withUndo = pushUndo(state);

  if (range.linewise) {
    const lines = [
      ...state.lines.slice(0, range.firstLine),
      ...state.lines.slice(range.lastLine + 1),
    ];
    const next: EditorState = {
      ...withUndo,
      lines: lines.length > 0 ? lines : [""],
      registers: writeRegister(state.registers, register, value, "delete"),
    };
    const line = Math.min(range.firstLine, lastLine(next));
    return {
      ...next,
      cursor: clampPosition(next, { line, col: firstNonBlank(next, line) }),
    };
  }

  const lines = spliceBuffer(state.lines, range.start, range.end, "");
  const next: EditorState = {
    ...withUndo,
    lines,
    registers: writeRegister(state.registers, register, value, "delete"),
  };
  const cursor = keepCursorColumn ? state.cursor : range.start;
  return { ...next, cursor: clampPosition(next, cursor) };
}

/* -------------------------------------------------------------- change -- */

/**
 * `c` is a delete that leaves you in insert mode. On a linewise range it keeps
 * the line and its indentation rather than removing it, which is why `cc` and
 * `dd` cannot share an implementation.
 */
export function opChange(
  state: EditorState,
  range: NormalRange,
  register: string | null,
): EditorState {
  const value = textOfRange(state, range);

  if (range.linewise) {
    const indent = lineAt(state, range.firstLine).match(/^\s*/)?.[0] ?? "";
    const lines = [
      ...state.lines.slice(0, range.firstLine),
      indent,
      ...state.lines.slice(range.lastLine + 1),
    ];
    const next: EditorState = {
      ...pushUndo(state),
      lines,
      registers: writeRegister(state.registers, register, value, "delete"),
    };
    return {
      ...next,
      cursor: { line: range.firstLine, col: indent.length },
      mode: "insert",
    };
  }

  const deleted = opDelete(state, range, register);
  return { ...deleted, mode: "insert", cursor: clampPosition(deleted, range.start, true) };
}

/* --------------------------------------------------------------- paste -- */

export function opPaste(
  state: EditorState,
  register: string | null,
  before: boolean,
  count: number,
): EditorState {
  const value = readRegister(state, register);
  if (!value || value.text === "") return state;

  const withUndo = pushUndo(state);

  if (value.linewise) {
    const body = value.text.replace(/\n$/, "").split("\n");
    const payload: string[] = [];
    for (let i = 0; i < count; i++) payload.push(...body);
    const at = before ? state.cursor.line : state.cursor.line + 1;
    const lines = [
      ...state.lines.slice(0, at),
      ...payload,
      ...state.lines.slice(at),
    ];
    const next: EditorState = { ...withUndo, lines };
    return { ...next, cursor: { line: at, col: firstNonBlank(next, at) } };
  }

  const payload = value.text.repeat(count);
  const col = before ? state.cursor.col : Math.min(state.cursor.col + 1, lineAt(state, state.cursor.line).length);
  const at: Position = { line: state.cursor.line, col };
  const lines = spliceBuffer(state.lines, at, at, payload);
  const next: EditorState = { ...withUndo, lines };

  if (payload.includes("\n")) {
    const tail = payload.split("\n");
    const endLine = at.line + tail.length - 1;
    return { ...next, cursor: clampPosition(next, { line: endLine, col: 0 }) };
  }
  return {
    ...next,
    cursor: clampPosition(next, { line: at.line, col: col + payload.length - 1 }),
  };
}

/* -------------------------------------------------------------- indent -- */

const SHIFT_WIDTH = 2;

export function opIndent(
  state: EditorState,
  range: NormalRange,
  direction: 1 | -1,
  count = 1,
): EditorState {
  const lines = [...state.lines];
  for (let l = range.firstLine; l <= range.lastLine; l++) {
    const text = lines[l] ?? "";
    if (direction === 1) {
      if (text.trim() === "") continue;
      lines[l] = " ".repeat(SHIFT_WIDTH * count) + text;
    } else {
      const strip = new RegExp(`^ {1,${SHIFT_WIDTH * count}}`);
      lines[l] = text.replace(strip, "");
    }
  }
  const next: EditorState = { ...pushUndo(state), lines };
  return {
    ...next,
    cursor: clampPosition(next, {
      line: range.firstLine,
      col: firstNonBlank(next, range.firstLine),
    }),
  };
}

/* ---------------------------------------------------------------- case -- */

export type CaseOp = "upper" | "lower" | "toggle";

function transformCase(text: string, op: CaseOp): string {
  if (op === "upper") return text.toUpperCase();
  if (op === "lower") return text.toLowerCase();
  return [...text]
    .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
    .join("");
}

export function opCase(
  state: EditorState,
  range: NormalRange,
  op: CaseOp,
): EditorState {
  const original = textOfRange(state, range);
  const replaced = transformCase(original.text, op);

  if (range.linewise) {
    const body = replaced.replace(/\n$/, "").split("\n");
    const lines = [
      ...state.lines.slice(0, range.firstLine),
      ...body,
      ...state.lines.slice(range.lastLine + 1),
    ];
    const next: EditorState = { ...pushUndo(state), lines };
    return { ...next, cursor: clampPosition(next, { line: range.firstLine, col: 0 }) };
  }

  const lines = spliceBuffer(state.lines, range.start, range.end, replaced);
  const next: EditorState = { ...pushUndo(state), lines };
  return { ...next, cursor: clampPosition(next, range.start) };
}

/* ---------------------------------------------------------------- join -- */

export function opJoin(
  state: EditorState,
  count: number,
  withSpace: boolean,
): EditorState {
  const joins = Math.max(1, count - 1);
  let lines = [...state.lines];
  const at = state.cursor.line;
  let cursorCol = state.cursor.col;

  for (let i = 0; i < joins; i++) {
    if (at + 1 >= lines.length) break;
    const head = lines[at];
    const tail = lines[at + 1];
    if (withSpace) {
      const trimmed = tail.replace(/^\s+/, "");
      const separator = head.length === 0 || /\s$/.test(head) || trimmed === "" ? "" : " ";
      cursorCol = head.length;
      lines = [
        ...lines.slice(0, at),
        head + separator + trimmed,
        ...lines.slice(at + 2),
      ];
    } else {
      cursorCol = head.length;
      lines = [...lines.slice(0, at), head + tail, ...lines.slice(at + 2)];
    }
  }

  const next: EditorState = { ...pushUndo(state), lines };
  return { ...next, cursor: clampPosition(next, { line: at, col: cursorCol }) };
}

/* -------------------------------------------------------------- replace -- */

export function opReplaceChar(
  state: EditorState,
  char: string,
  count: number,
): EditorState {
  const text = lineAt(state, state.cursor.line);
  if (state.cursor.col + count > text.length) return state;

  const replaced =
    text.slice(0, state.cursor.col) +
    char.repeat(count) +
    text.slice(state.cursor.col + count);

  const lines = [...state.lines];
  lines[state.cursor.line] = replaced;
  const next: EditorState = { ...pushUndo(state), lines };
  return {
    ...next,
    cursor: clampPosition(next, {
      line: state.cursor.line,
      col: state.cursor.col + count - 1,
    }),
  };
}

/* ----------------------------------------------------------------- undo -- */

export function undo(state: EditorState): EditorState {
  const previous = state.undo[state.undo.length - 1];
  if (!previous) return state;
  const redoEntry = { lines: [...state.lines], cursor: { ...state.cursor } };
  const next: EditorState = {
    ...state,
    lines: [...previous.lines],
    undo: state.undo.slice(0, -1),
    redo: [...state.redo, redoEntry],
  };
  return { ...next, cursor: clampPosition(next, previous.cursor) };
}

export function redo(state: EditorState): EditorState {
  const entry = state.redo[state.redo.length - 1];
  if (!entry) return state;
  const undoEntry = { lines: [...state.lines], cursor: { ...state.cursor } };
  const next: EditorState = {
    ...state,
    lines: [...entry.lines],
    redo: state.redo.slice(0, -1),
    undo: [...state.undo, undoEntry],
  };
  return { ...next, cursor: clampPosition(next, entry.cursor) };
}

/** Visual-block ranges are rectangles, not spans, so they get their own path. */
export function blockColumns(
  anchor: Position,
  cursor: Position,
): { top: number; bottom: number; left: number; right: number } {
  return {
    top: Math.min(anchor.line, cursor.line),
    bottom: Math.max(anchor.line, cursor.line),
    left: Math.min(anchor.col, cursor.col),
    right: Math.max(anchor.col, cursor.col),
  };
}

export function opDeleteBlock(
  state: EditorState,
  anchor: Position,
  register: string | null,
): EditorState {
  const { top, bottom, left, right } = blockColumns(anchor, state.cursor);
  const lines = [...state.lines];
  const captured: string[] = [];

  for (let l = top; l <= bottom; l++) {
    const text = lines[l] ?? "";
    captured.push(text.slice(left, right + 1));
    lines[l] = text.slice(0, left) + text.slice(right + 1);
  }

  const next: EditorState = {
    ...pushUndo(state),
    lines,
    registers: writeRegister(
      state.registers,
      register,
      { text: captured.join("\n"), linewise: false, blockwise: true },
      "delete",
    ),
  };
  return { ...next, cursor: clampPosition(next, { line: top, col: left }) };
}

export function opInsertBlock(
  state: EditorState,
  anchor: Position,
  text: string,
  append: boolean,
): EditorState {
  const { top, bottom, left, right } = blockColumns(anchor, state.cursor);
  const col = append ? right + 1 : left;
  const lines = [...state.lines];

  for (let l = top; l <= bottom; l++) {
    const line = lines[l] ?? "";
    if (col > line.length) {
      if (!append) continue;
      lines[l] = line.padEnd(col, " ") + text;
    } else {
      lines[l] = line.slice(0, col) + text + line.slice(col);
    }
  }
  const next: EditorState = { ...state, lines };
  return { ...next, cursor: clampPosition(next, { line: top, col }) };
}

export function maxColumnFor(state: EditorState, line: number): number {
  return maxCol(state, line);
}
