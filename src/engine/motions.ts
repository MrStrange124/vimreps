import type { EditorState, Position, RangeKind } from "./types";
import {
  bigCharClass,
  charAt,
  charClass,
  clampPosition,
  firstNonBlank,
  lastLine,
  lastNonBlank,
  lineAt,
  maxCol,
  nextPosition,
  prevPosition,
} from "./text";

/**
 * The motion table.
 *
 * A motion returns where the cursor lands *and* how an operator should read the
 * span it covers. That second field is the whole reason `dw` and `de` differ:
 * `w` is exclusive so it stops short of the character it landed on, `e` is
 * inclusive so it takes it. Getting this wrong is the single most common way a
 * hand-rolled Vim feels "almost right".
 */

export type MotionResult = {
  pos: Position;
  kind: RangeKind;
  /** True when the motion should keep the cursor's remembered column (j/k). */
  keepDesiredCol?: boolean;
  /** True when an operator should treat an exclusive motion ending at col 0 as linewise. */
  allowExclusiveLinewise?: boolean;
};

export type MotionContext = {
  count: number;
  /** Present for f/t/F/T/`/'/r-style motions that consume one more key. */
  arg?: string;
  /** True when the motion is being consumed by an operator rather than moving the cursor. */
  forOperator?: boolean;
};

export type MotionFn = (
  state: EditorState,
  ctx: MotionContext,
) => MotionResult | null;

function isEmptyLine(state: EditorState, line: number): boolean {
  return lineAt(state, line).length === 0;
}

/* ------------------------------------------------------------------ words -- */

function wordForwardOnce(
  state: EditorState,
  pos: Position,
  big: boolean,
): Position {
  const cl = big ? bigCharClass : charClass;
  let p = pos;
  const start = cl(charAt(state, p));

  let n = nextPosition(state, p);
  if (!n) return p;

  if (start !== "blank") {
    while (n && n.line === p.line && cl(charAt(state, n)) === start) {
      p = n;
      n = nextPosition(state, p);
    }
    if (!n) return p;
  }
  p = n;

  while (true) {
    if (isEmptyLine(state, p.line)) return p;
    if (cl(charAt(state, p)) !== "blank") return p;
    const nx = nextPosition(state, p);
    if (!nx) return p;
    p = nx;
  }
}

function wordBackwardOnce(
  state: EditorState,
  pos: Position,
  big: boolean,
): Position {
  const cl = big ? bigCharClass : charClass;
  let p = prevPosition(state, pos);
  if (!p) return pos;

  while (true) {
    if (isEmptyLine(state, p.line)) return p;
    if (cl(charAt(state, p)) !== "blank") break;
    const pv = prevPosition(state, p);
    if (!pv) return p;
    p = pv;
  }

  const cur = cl(charAt(state, p));
  while (true) {
    const pv = prevPosition(state, p);
    if (!pv || pv.line !== p.line || cl(charAt(state, pv)) !== cur) return p;
    p = pv;
  }
}

function wordEndOnce(state: EditorState, pos: Position, big: boolean): Position {
  const cl = big ? bigCharClass : charClass;
  let p = nextPosition(state, pos);
  if (!p) return pos;

  while (cl(charAt(state, p)) === "blank") {
    const n = nextPosition(state, p);
    if (!n) return p;
    p = n;
  }

  const cur = cl(charAt(state, p));
  while (true) {
    const n = nextPosition(state, p);
    if (!n || n.line !== p.line || cl(charAt(state, n)) !== cur) return p;
    p = n;
  }
}

function wordEndBackwardOnce(
  state: EditorState,
  pos: Position,
  big: boolean,
): Position {
  const cl = big ? bigCharClass : charClass;
  let p = prevPosition(state, pos);
  if (!p) return pos;

  const orig = cl(charAt(state, pos));
  if (orig !== "blank") {
    while (p.line === pos.line && cl(charAt(state, p)) === orig) {
      const pv = prevPosition(state, p);
      if (!pv) return p;
      p = pv;
    }
  }
  while (cl(charAt(state, p)) === "blank") {
    const pv = prevPosition(state, p);
    if (!pv) return p;
    p = pv;
  }
  return p;
}

function repeat(
  state: EditorState,
  count: number,
  once: (s: EditorState, p: Position) => Position,
): Position {
  let p = state.cursor;
  for (let i = 0; i < count; i++) p = once(state, p);
  return p;
}

/* -------------------------------------------------------------- paragraph -- */

function paragraphForward(state: EditorState, count: number): Position {
  let line = state.cursor.line;
  for (let i = 0; i < count; i++) {
    let found = -1;
    for (let l = line + 1; l <= lastLine(state); l++) {
      if (isEmptyLine(state, l)) {
        found = l;
        break;
      }
    }
    if (found === -1) {
      return { line: lastLine(state), col: maxCol(state, lastLine(state)) };
    }
    line = found;
  }
  return { line, col: 0 };
}

function paragraphBackward(state: EditorState, count: number): Position {
  let line = state.cursor.line;
  for (let i = 0; i < count; i++) {
    let found = -1;
    for (let l = line - 1; l >= 0; l--) {
      if (isEmptyLine(state, l)) {
        found = l;
        break;
      }
    }
    if (found === -1) return { line: 0, col: 0 };
    line = found;
  }
  return { line, col: 0 };
}

/* ----------------------------------------------------------------- pairs -- */

const OPENERS = "([{";
const CLOSERS = ")]}";

function matchPair(state: EditorState, from: Position): Position | null {
  const text = lineAt(state, from.line);
  let col = from.col;
  while (col < text.length && !OPENERS.includes(text[col]) && !CLOSERS.includes(text[col])) {
    col += 1;
  }
  if (col >= text.length) return null;

  const ch = text[col];
  const openerIdx = OPENERS.indexOf(ch);
  const forward = openerIdx !== -1;
  const open = forward ? ch : OPENERS[CLOSERS.indexOf(ch)];
  const close = forward ? CLOSERS[openerIdx] : ch;

  let depth = 0;
  let p: Position | null = { line: from.line, col };
  while (p) {
    const c = charAt(state, p);
    if (c === open) depth += forward ? 1 : -1;
    else if (c === close) depth += forward ? -1 : 1;
    if (depth === 0) return p;
    p = forward ? nextPosition(state, p) : prevPosition(state, p);
  }
  return null;
}

/* ---------------------------------------------------------------- find -- */

export function findInLine(
  state: EditorState,
  op: "f" | "t" | "F" | "T",
  char: string,
  count: number,
  from: Position = state.cursor,
  skipAdjacent = false,
): Position | null {
  const text = lineAt(state, from.line);
  const forward = op === "f" || op === "t";
  let col = from.col;
  let remaining = count;

  // A repeated `t` would otherwise stick one short of the same target forever.
  // Only `;` and `,` step over it — a fresh `t` must not skip a hit.
  let searchFrom = col;
  if (skipAdjacent && op === "t" && text[col + 1] === char) searchFrom = col + 1;
  if (skipAdjacent && op === "T" && text[col - 1] === char) searchFrom = col - 1;

  col = searchFrom;
  while (remaining > 0) {
    col = forward ? text.indexOf(char, col + 1) : text.lastIndexOf(char, col - 1);
    if (col === -1) return null;
    remaining -= 1;
  }
  if (op === "t") col -= 1;
  if (op === "T") col += 1;
  if (col < 0 || col >= text.length) return null;
  return { line: from.line, col };
}

/* --------------------------------------------------------------- search -- */

export function searchBuffer(
  state: EditorState,
  pattern: string,
  backwards: boolean,
  count = 1,
  from: Position = state.cursor,
): Position | null {
  let re: RegExp;
  try {
    re = new RegExp(pattern);
  } catch {
    return null;
  }

  const total = state.lines.length;
  let found: Position | null = null;
  let remaining = count;
  let cur = from;

  for (let step = 0; step < total * 2 + 2 && remaining > 0; step++) {
    const hit = backwards
      ? searchBackwardFrom(state, re, cur)
      : searchForwardFrom(state, re, cur);
    if (!hit) return null;
    remaining -= 1;
    found = hit;
    cur = hit;
  }
  return found;
}

function searchForwardFrom(
  state: EditorState,
  re: RegExp,
  from: Position,
): Position | null {
  const total = state.lines.length;
  for (let i = 0; i <= total; i++) {
    const line = (from.line + i) % total;
    const text = lineAt(state, line);
    const startCol = i === 0 ? from.col + 1 : 0;
    if (startCol > text.length) continue;
    const m = re.exec(text.slice(startCol));
    if (m && m[0].length > 0) return { line, col: startCol + m.index };
    if (m && m[0].length === 0) continue;
  }
  return null;
}

function searchBackwardFrom(
  state: EditorState,
  re: RegExp,
  from: Position,
): Position | null {
  const total = state.lines.length;
  for (let i = 0; i <= total; i++) {
    const line = (from.line - i + total * 2) % total;
    const text = lineAt(state, line);
    const limit = i === 0 ? from.col : text.length;
    let best = -1;
    let scan = 0;
    while (scan < text.length) {
      const m = re.exec(text.slice(scan));
      if (!m || m[0].length === 0) break;
      const at = scan + m.index;
      if (at < limit) best = at;
      else break;
      scan = at + 1;
    }
    if (best !== -1) return { line, col: best };
  }
  return null;
}

/** The word under the cursor, used by `*` and `#`. */
export function wordUnderCursor(state: EditorState): string | null {
  const text = lineAt(state, state.cursor.line);
  let start = state.cursor.col;
  if (charClass(text[start]) !== "word") {
    while (start < text.length && charClass(text[start]) !== "word") start += 1;
    if (start >= text.length) return null;
  }
  while (start > 0 && charClass(text[start - 1]) === "word") start -= 1;
  let end = start;
  while (end < text.length && charClass(text[end]) === "word") end += 1;
  return text.slice(start, end) || null;
}

/* ------------------------------------------------------------ the table -- */

const linewiseTo = (line: number, state: EditorState): MotionResult => ({
  pos: { line, col: firstNonBlank(state, line) },
  kind: "linewise",
});

export const MOTIONS: Record<string, MotionFn> = {
  h: (s, { count }) => ({
    pos: { line: s.cursor.line, col: Math.max(0, s.cursor.col - count) },
    kind: "exclusive",
  }),
  l: (s, { count, forOperator }) => ({
    pos: {
      line: s.cursor.line,
      col: Math.min(maxCol(s, s.cursor.line, forOperator), s.cursor.col + count),
    },
    kind: "exclusive",
  }),
  j: (s, { count }) => {
    const line = Math.min(lastLine(s), s.cursor.line + count);
    return {
      pos: { line, col: Math.min(s.desiredCol, maxCol(s, line)) },
      kind: "linewise",
      keepDesiredCol: true,
    };
  },
  k: (s, { count }) => {
    const line = Math.max(0, s.cursor.line - count);
    return {
      pos: { line, col: Math.min(s.desiredCol, maxCol(s, line)) },
      kind: "linewise",
      keepDesiredCol: true,
    };
  },

  w: (s, { count }) => ({
    pos: repeat(s, count, (st, p) => wordForwardOnce(st, p, false)),
    kind: "exclusive",
  }),
  W: (s, { count }) => ({
    pos: repeat(s, count, (st, p) => wordForwardOnce(st, p, true)),
    kind: "exclusive",
  }),
  b: (s, { count }) => ({
    pos: repeat(s, count, (st, p) => wordBackwardOnce(st, p, false)),
    kind: "exclusive",
  }),
  B: (s, { count }) => ({
    pos: repeat(s, count, (st, p) => wordBackwardOnce(st, p, true)),
    kind: "exclusive",
  }),
  e: (s, { count }) => ({
    pos: repeat(s, count, (st, p) => wordEndOnce(st, p, false)),
    kind: "inclusive",
  }),
  E: (s, { count }) => ({
    pos: repeat(s, count, (st, p) => wordEndOnce(st, p, true)),
    kind: "inclusive",
  }),
  ge: (s, { count }) => ({
    pos: repeat(s, count, (st, p) => wordEndBackwardOnce(st, p, false)),
    kind: "inclusive",
  }),
  gE: (s, { count }) => ({
    pos: repeat(s, count, (st, p) => wordEndBackwardOnce(st, p, true)),
    kind: "inclusive",
  }),

  "0": (s) => ({ pos: { line: s.cursor.line, col: 0 }, kind: "exclusive" }),
  "^": (s) => ({
    pos: { line: s.cursor.line, col: firstNonBlank(s, s.cursor.line) },
    kind: "exclusive",
  }),
  $: (s, { count, forOperator }) => {
    const line = Math.min(lastLine(s), s.cursor.line + count - 1);
    return {
      pos: { line, col: maxCol(s, line, forOperator) },
      kind: "inclusive",
    };
  },
  g_: (s, { count }) => {
    const line = Math.min(lastLine(s), s.cursor.line + count - 1);
    return { pos: { line, col: lastNonBlank(s, line) }, kind: "inclusive" };
  },
  "|": (s, { count }) => ({
    pos: { line: s.cursor.line, col: Math.min(maxCol(s, s.cursor.line), count - 1) },
    kind: "exclusive",
  }),

  gg: (s, ctx) => linewiseTo(Math.min(lastLine(s), Math.max(0, ctx.count - 1)), s),
  G: (s, ctx) =>
    linewiseTo(
      ctx.count === 0 ? lastLine(s) : Math.min(lastLine(s), ctx.count - 1),
      s,
    ),

  "+": (s, { count }) => linewiseTo(Math.min(lastLine(s), s.cursor.line + count), s),
  "-": (s, { count }) => linewiseTo(Math.max(0, s.cursor.line - count), s),

  H: (s, { count }) => linewiseTo(Math.min(lastLine(s), count - 1), s),
  M: (s) => linewiseTo(Math.floor(lastLine(s) / 2), s),
  L: (s, { count }) => linewiseTo(Math.max(0, lastLine(s) - (count - 1)), s),

  "}": (s, { count }) => ({ pos: paragraphForward(s, count), kind: "exclusive" }),
  "{": (s, { count }) => ({ pos: paragraphBackward(s, count), kind: "exclusive" }),

  "%": (s) => {
    const target = matchPair(s, s.cursor);
    return target ? { pos: target, kind: "inclusive" } : null;
  },

  f: (s, { count, arg }) => {
    if (!arg) return null;
    const pos = findInLine(s, "f", arg, count);
    return pos ? { pos, kind: "inclusive" } : null;
  },
  t: (s, { count, arg }) => {
    if (!arg) return null;
    const pos = findInLine(s, "t", arg, count);
    return pos ? { pos, kind: "inclusive" } : null;
  },
  F: (s, { count, arg }) => {
    if (!arg) return null;
    const pos = findInLine(s, "F", arg, count);
    return pos ? { pos, kind: "exclusive" } : null;
  },
  T: (s, { count, arg }) => {
    if (!arg) return null;
    const pos = findInLine(s, "T", arg, count);
    return pos ? { pos, kind: "exclusive" } : null;
  },
  ";": (s, { count }) => {
    if (!s.lastFind) return null;
    const { op, char } = s.lastFind;
    const pos = findInLine(s, op, char, count, s.cursor, true);
    if (!pos) return null;
    return { pos, kind: op === "f" || op === "t" ? "inclusive" : "exclusive" };
  },
  ",": (s, { count }) => {
    if (!s.lastFind) return null;
    const flip = { f: "F", F: "f", t: "T", T: "t" } as const;
    const op = flip[s.lastFind.op];
    const pos = findInLine(s, op, s.lastFind.char, count, s.cursor, true);
    if (!pos) return null;
    return { pos, kind: op === "f" || op === "t" ? "inclusive" : "exclusive" };
  },

  // Reachable only as an operator target (`d/foo<CR>`); a bare `/` opens the
  // command line instead, which the parser handles before it gets here.
  "/": (s, { count, arg }) => {
    if (arg === undefined) return null;
    const pos = searchBuffer(s, arg, false, count);
    return pos ? { pos, kind: "exclusive" } : null;
  },
  "?": (s, { count, arg }) => {
    if (arg === undefined) return null;
    const pos = searchBuffer(s, arg, true, count);
    return pos ? { pos, kind: "exclusive" } : null;
  },

  n: (s, { count }) => {
    if (!s.lastSearch) return null;
    const pos = searchBuffer(s, s.lastSearch.pattern, s.lastSearch.backwards, count);
    return pos ? { pos, kind: "exclusive" } : null;
  },
  N: (s, { count }) => {
    if (!s.lastSearch) return null;
    const pos = searchBuffer(s, s.lastSearch.pattern, !s.lastSearch.backwards, count);
    return pos ? { pos, kind: "exclusive" } : null;
  },
};

/** Motions that must consume one further key before they can run. */
export const MOTIONS_NEEDING_ARG = new Set(["f", "t", "F", "T"]);

export function applyMotion(
  state: EditorState,
  name: string,
  ctx: MotionContext,
): MotionResult | null {
  const fn = MOTIONS[name];
  if (!fn) return null;
  const result = fn(state, ctx);
  if (!result) return null;
  return {
    ...result,
    pos: clampPosition(state, result.pos, ctx.forOperator),
  };
}
