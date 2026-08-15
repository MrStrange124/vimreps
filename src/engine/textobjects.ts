import type { EditorState, Position, Range } from "./types";
import {
  bigCharClass,
  charAt,
  charClass,
  firstNonBlank,
  lastLine,
  lastNonBlank,
  lineAt,
  maxCol,
  nextPosition,
  prevPosition,
} from "./text";

/**
 * Text objects resolve to a range without reference to the cursor's direction of
 * travel — that is what makes `ciw` work identically from any character in the
 * word, and why they are worth teaching before visual mode.
 *
 * Ranges returned here are inclusive: `end` is the last character covered.
 * A zero-width object (`i(` on `()`) is signalled by `end` preceding `start`.
 */

export type TextObjectResult = Range | null;

const PAIRS: Record<string, [string, string]> = {
  "(": ["(", ")"],
  ")": ["(", ")"],
  b: ["(", ")"],
  "{": ["{", "}"],
  "}": ["{", "}"],
  B: ["{", "}"],
  "[": ["[", "]"],
  "]": ["[", "]"],
  "<": ["<", ">"],
  ">": ["<", ">"],
};

const QUOTES = new Set(['"', "'", "`"]);

function inclusive(start: Position, end: Position): Range {
  return { start, end, kind: "inclusive" };
}

function empty(at: Position): Range {
  return { start: at, end: { line: at.line, col: at.col - 1 }, kind: "inclusive" };
}

/* ----------------------------------------------------------------- word -- */

function wordObject(
  state: EditorState,
  around: boolean,
  big: boolean,
): TextObjectResult {
  const cl = big ? bigCharClass : charClass;
  const text = lineAt(state, state.cursor.line);
  const line = state.cursor.line;
  if (text.length === 0) return empty({ line, col: 0 });

  const col = Math.min(state.cursor.col, text.length - 1);
  const target = cl(text[col]);

  let start = col;
  while (start > 0 && cl(text[start - 1]) === target) start -= 1;
  let end = col;
  while (end < text.length - 1 && cl(text[end + 1]) === target) end += 1;

  if (!around) return inclusive({ line, col: start }, { line, col: end });

  // `aw` takes the trailing run of whitespace; failing that, the leading one.
  let extendedEnd = end;
  while (extendedEnd < text.length - 1 && cl(text[extendedEnd + 1]) === "blank") {
    extendedEnd += 1;
  }
  if (extendedEnd > end) {
    return inclusive({ line, col: start }, { line, col: extendedEnd });
  }
  let extendedStart = start;
  while (extendedStart > 0 && cl(text[extendedStart - 1]) === "blank") {
    extendedStart -= 1;
  }
  return inclusive({ line, col: extendedStart }, { line, col: end });
}

/* ---------------------------------------------------------------- pairs -- */

function findEnclosingPair(
  state: EditorState,
  open: string,
  close: string,
): { open: Position; close: Position } | null {
  const cursorChar = charAt(state, state.cursor);

  // Standing on the opening bracket counts as being inside it.
  let openPos: Position | null = null;
  if (cursorChar === open) {
    openPos = state.cursor;
  } else {
    let depth = 0;
    let p: Position | null = cursorChar === close ? prevPosition(state, state.cursor) : state.cursor;
    while (p) {
      const c = charAt(state, p);
      if (c === close && !(p.line === state.cursor.line && p.col === state.cursor.col)) {
        depth += 1;
      } else if (c === open) {
        if (depth === 0) {
          openPos = p;
          break;
        }
        depth -= 1;
      }
      p = prevPosition(state, p);
    }
  }
  if (!openPos) return null;

  let depth = 0;
  let q: Position | null = openPos;
  while (q) {
    const c = charAt(state, q);
    if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) return { open: openPos, close: q };
    }
    q = nextPosition(state, q);
  }
  return null;
}

function pairObject(
  state: EditorState,
  key: string,
  around: boolean,
): TextObjectResult {
  const pair = PAIRS[key];
  if (!pair) return null;
  const found = findEnclosingPair(state, pair[0], pair[1]);
  if (!found) return null;

  if (around) return inclusive(found.open, found.close);

  const start = nextPosition(state, found.open);
  const end = prevPosition(state, found.close);
  if (!start || !end) return empty(found.close);
  // `i(` on an empty pair covers nothing.
  if (start.line > end.line || (start.line === end.line && start.col > end.col)) {
    return empty(start);
  }

  // When the brackets sit on their own lines — a block, rather than an
  // expression — the inner object is the lines between them. Treating it
  // characterwise would delete the text but leave an empty line where the body
  // was, which is not what `di{` does in Vim.
  const openIsLast = found.open.col >= lastNonBlank(state, found.open.line);
  const closeIsFirst = found.close.col <= firstNonBlank(state, found.close.line);
  if (openIsLast && closeIsFirst && found.close.line > found.open.line + 1) {
    return {
      start: { line: found.open.line + 1, col: 0 },
      end: { line: found.close.line - 1, col: maxCol(state, found.close.line - 1) },
      kind: "linewise",
    };
  }

  return inclusive(start, end);
}

/* --------------------------------------------------------------- quotes -- */

function quoteObject(
  state: EditorState,
  quote: string,
  around: boolean,
): TextObjectResult {
  const line = state.cursor.line;
  const text = lineAt(state, line);

  const positions: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === quote && text[i - 1] !== "\\") positions.push(i);
  }
  if (positions.length < 2) return null;

  for (let i = 0; i + 1 < positions.length; i += 2) {
    const open = positions[i];
    const close = positions[i + 1];
    if (state.cursor.col <= close) {
      if (around) {
        // `a"` also swallows trailing whitespace, matching Vim.
        let end = close;
        while (end + 1 < text.length && /\s/.test(text[end + 1])) end += 1;
        return inclusive({ line, col: open }, { line, col: end });
      }
      if (close - open === 1) return empty({ line, col: open + 1 });
      return inclusive({ line, col: open + 1 }, { line, col: close - 1 });
    }
  }
  return null;
}

/* ------------------------------------------------------------ paragraph -- */

function paragraphObject(state: EditorState, around: boolean): TextObjectResult {
  const isBlank = (l: number) => lineAt(state, l).length === 0;
  const startBlank = isBlank(state.cursor.line);

  let top = state.cursor.line;
  while (top > 0 && isBlank(top - 1) === startBlank) top -= 1;
  let bottom = state.cursor.line;
  while (bottom < lastLine(state) && isBlank(bottom + 1) === startBlank) bottom += 1;

  if (around) {
    let extended = bottom;
    while (extended < lastLine(state) && isBlank(extended + 1) !== startBlank) {
      extended += 1;
      if (isBlank(extended) === startBlank) {
        extended -= 1;
        break;
      }
    }
    bottom = extended;
  }

  return {
    start: { line: top, col: 0 },
    end: { line: bottom, col: maxCol(state, bottom) },
    kind: "linewise",
  };
}

/* ------------------------------------------------------------------ tag -- */

function tagObject(state: EditorState, around: boolean): TextObjectResult {
  const flat = state.lines.join("\n");
  const offset = toOffset(state, state.cursor);
  const tagRe = /<(\/?)([A-Za-z][-A-Za-z0-9]*)[^>]*?(\/?)>/g;

  type Open = { name: string; start: number; end: number };
  const stack: Open[] = [];
  let best: { inner: [number, number]; outer: [number, number] } | null = null;

  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(flat)) !== null) {
    const [full, slash, name, selfClose] = m;
    if (selfClose === "/") continue;
    if (slash === "") {
      stack.push({ name, start: m.index, end: m.index + full.length });
    } else {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name !== name) continue;
        const open = stack[i];
        stack.length = i;
        const inner: [number, number] = [open.end, m.index];
        const outer: [number, number] = [open.start, m.index + full.length];
        if (offset >= outer[0] && offset < outer[1]) {
          if (!best || outer[1] - outer[0] < best.outer[1] - best.outer[0]) {
            best = { inner, outer };
          }
        }
        break;
      }
    }
  }
  if (!best) return null;

  const [from, to] = around ? best.outer : best.inner;
  if (to <= from) return empty(fromOffset(state, from));
  return inclusive(fromOffset(state, from), fromOffset(state, to - 1));
}

function toOffset(state: EditorState, pos: Position): number {
  let n = 0;
  for (let l = 0; l < pos.line; l++) n += lineAt(state, l).length + 1;
  return n + pos.col;
}

function fromOffset(state: EditorState, offset: number): Position {
  let remaining = offset;
  for (let l = 0; l < state.lines.length; l++) {
    const len = lineAt(state, l).length;
    if (remaining <= len) return { line: l, col: remaining };
    remaining -= len + 1;
  }
  const last = lastLine(state);
  return { line: last, col: maxCol(state, last) };
}

/* ------------------------------------------------------------ front door -- */

/** Keys that may follow `i` or `a` to name an object. */
export const TEXT_OBJECT_KEYS = new Set([
  "w",
  "W",
  "p",
  "t",
  "(",
  ")",
  "b",
  "{",
  "}",
  "B",
  "[",
  "]",
  "<",
  ">",
  '"',
  "'",
  "`",
]);

export function resolveTextObject(
  state: EditorState,
  scope: "i" | "a",
  key: string,
): TextObjectResult {
  const around = scope === "a";
  if (key === "w") return wordObject(state, around, false);
  if (key === "W") return wordObject(state, around, true);
  if (key === "p") return paragraphObject(state, around);
  if (key === "t") return tagObject(state, around);
  if (QUOTES.has(key)) return quoteObject(state, key, around);
  if (PAIRS[key]) return pairObject(state, key, around);
  return null;
}
