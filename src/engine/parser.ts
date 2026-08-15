import type { KeyToken, Mode } from "./types";
import { MOTIONS, MOTIONS_NEEDING_ARG } from "./motions";
import { TEXT_OBJECT_KEYS } from "./textobjects";

/**
 * A parser for Vim's normal-mode grammar.
 *
 * Rather than a tangle of "am I waiting for a motion?" flags, the interpreter
 * accumulates raw keys and re-parses the whole buffer on every keystroke. The
 * parser answers one of three things: this is a finished command, this is a
 * valid prefix of one, or this is nonsense. That makes the hard part — Vim's
 * `[count]["reg]operator[count]motion` grammar — a pure function over a string
 * of keys, which is trivially testable and also exactly what `.` and macros
 * need to replay.
 */

export type OperatorName =
  | "d"
  | "c"
  | "y"
  | ">"
  | "<"
  | "gu"
  | "gU"
  | "g~";

export const OPERATORS = new Set<string>(["d", "c", "y", ">", "<", "gu", "gU", "g~"]);

/**
 * Counts are nullable rather than defaulted to 1, because some commands need to
 * distinguish "no count" from "count of 1" — `G` with no count means the last
 * line, but `1G` means the first.
 */
export type Target =
  | { kind: "motion"; name: string; count: number | null; arg?: string }
  | { kind: "textobject"; scope: "i" | "a"; key: string; count: number }
  | { kind: "line"; count: number }
  | { kind: "visual" };

export type Command =
  | { type: "motion"; name: string; count: number | null; arg?: string }
  | {
      type: "operator";
      op: OperatorName;
      count: number | null;
      register: string | null;
      target: Target;
    }
  | {
      type: "action";
      name: string;
      count: number | null;
      register: string | null;
      arg?: string;
    };

export type ParseResult =
  | { status: "incomplete" }
  | { status: "invalid" }
  | { status: "complete"; command: Command };

const INCOMPLETE: ParseResult = { status: "incomplete" };
const INVALID: ParseResult = { status: "invalid" };

/** Multi-key atoms introduced by `g`. */
const G_ATOMS = new Set([
  "gg",
  "ge",
  "gE",
  "g_",
  "gu",
  "gU",
  "g~",
  "gJ",
  "gv",
  "gi",
  "gp",
]);

/** Actions that swallow the next key as a literal argument. */
const ACTIONS_WITH_CHAR_ARG = new Set(["r", "m", "q", "@", "`", "'"]);

/** Normal-mode commands that are neither motions nor operators. */
const ACTIONS = new Set([
  "i",
  "I",
  "a",
  "A",
  "o",
  "O",
  "x",
  "X",
  "s",
  "S",
  "D",
  "C",
  "Y",
  "p",
  "P",
  "u",
  ".",
  "~",
  "J",
  "gJ",
  "v",
  "V",
  "<C-v>",
  "<C-r>",
  "<C-d>",
  "<C-u>",
  "<C-f>",
  "<C-b>",
  "<C-o>",
  "R",
  ":",
  "/",
  "?",
  "*",
  "#",
  "gv",
  "gi",
  "gp",
  "r",
  "m",
  "q",
  "@",
  "`",
  "'",
  "<Esc>",
  "<CR>",
  "<Del>",
]);

/** Visual-mode commands that have no normal-mode equivalent. */
const VISUAL_ACTIONS = new Set(["o", "O", "I", "A", "x", "s", "u", "U", "~", "J", "p", "r", "v", "V", "<C-v>", "<Esc>", "y", "d", "c"]);

type Reader = { keys: KeyToken[]; i: number };

function peek(r: Reader): KeyToken | undefined {
  return r.keys[r.i];
}

function readCount(r: Reader): number | null {
  // A leading `0` is the start-of-line motion, never a count — but `10` is ten.
  let digits = "";
  while (r.i < r.keys.length && /^[0-9]$/.test(r.keys[r.i])) {
    if (digits === "" && r.keys[r.i] === "0") break;
    digits += r.keys[r.i];
    r.i += 1;
  }
  return digits === "" ? null : parseInt(digits, 10);
}

function readRegisterPrefix(r: Reader): { register: string | null } | "incomplete" {
  if (peek(r) !== '"') return { register: null };
  r.i += 1;
  const name = peek(r);
  if (name === undefined) return "incomplete";
  r.i += 1;
  return { register: name };
}

type AtomResult = { atom: string } | "incomplete" | "invalid";

function readAtom(r: Reader): AtomResult {
  const key = peek(r);
  if (key === undefined) return "incomplete";

  if (key === "g") {
    const next = r.keys[r.i + 1];
    if (next === undefined) return "incomplete";
    const combined = `g${next}`;
    if (!G_ATOMS.has(combined)) return "invalid";
    r.i += 2;
    return { atom: combined };
  }

  if (key === "Z") {
    const next = r.keys[r.i + 1];
    if (next === undefined) return "incomplete";
    r.i += 2;
    return { atom: `Z${next}` };
  }

  r.i += 1;
  return { atom: key };
}

function readMotionArg(r: Reader, atom: string): { arg?: string } | "incomplete" {
  if (!MOTIONS_NEEDING_ARG.has(atom)) return {};
  const arg = peek(r);
  if (arg === undefined) return "incomplete";
  r.i += 1;
  return { arg: arg.length === 1 ? arg : arg === "<Space>" ? " " : arg };
}

function readTarget(r: Reader, op: OperatorName): ParseResult | { target: Target } {
  const explicitCount = readCount(r);
  const targetCount = explicitCount ?? 1;
  const key = peek(r);
  if (key === undefined) return INCOMPLETE;

  // `d/foo<CR>` — a search used as an operator target. The pattern runs to the
  // <CR>, so the whole thing parses as one command rather than opening the
  // command line and losing the pending operator.
  if (key === "/" || key === "?") {
    const end = r.keys.indexOf("<CR>", r.i + 1);
    if (end === -1) return INCOMPLETE;
    const pattern = r.keys
      .slice(r.i + 1, end)
      .map((t) => (t === "<Space>" ? " " : t))
      .join("");
    r.i = end + 1;
    return {
      target: { kind: "motion", name: key, count: explicitCount, arg: pattern },
    };
  }

  // `dd`, `yy`, `>>` — and `guu` / `gugu` for the two-key operators.
  if (key === op || (op.length === 2 && key === op[1])) {
    r.i += 1;
    return { target: { kind: "line", count: targetCount } };
  }
  if (op.length === 2 && key === "g") {
    const doubled = `g${r.keys[r.i + 1] ?? ""}`;
    if (r.keys[r.i + 1] === undefined) return INCOMPLETE;
    if (doubled === op) {
      r.i += 2;
      return { target: { kind: "line", count: targetCount } };
    }
  }

  if (key === "i" || key === "a") {
    const objectKey = r.keys[r.i + 1];
    if (objectKey === undefined) return INCOMPLETE;
    if (!TEXT_OBJECT_KEYS.has(objectKey)) return INVALID;
    r.i += 2;
    return {
      target: { kind: "textobject", scope: key, key: objectKey, count: targetCount },
    };
  }

  const atom = readAtom(r);
  if (atom === "incomplete") return INCOMPLETE;
  if (atom === "invalid") return INVALID;
  if (!MOTIONS[atom.atom]) return INVALID;

  const arg = readMotionArg(r, atom.atom);
  if (arg === "incomplete") return INCOMPLETE;

  return {
    target: { kind: "motion", name: atom.atom, count: explicitCount, arg: arg.arg },
  };
}

/**
 * A little engine state the grammar genuinely depends on: while a macro is
 * recording, `q` is a complete command that stops it, rather than the start of
 * `q{register}`.
 */
export type ParseContext = { recordingMacro?: boolean };

export function parseCommand(
  keys: KeyToken[],
  mode: Mode,
  ctx: ParseContext = {},
): ParseResult {
  if (keys.length === 0) return INCOMPLETE;
  const r: Reader = { keys, i: 0 };
  const visual = mode === "visual" || mode === "visual-line" || mode === "visual-block";

  let count = readCount(r);
  const reg = readRegisterPrefix(r);
  if (reg === "incomplete") return INCOMPLETE;
  const secondCount = readCount(r);
  if (secondCount !== null) count = (count ?? 1) * secondCount;

  const atom = readAtom(r);
  if (atom === "incomplete") return INCOMPLETE;
  if (atom === "invalid") return INVALID;
  const name = atom.atom;

  // In visual mode an operator applies to the selection with no motion to wait for.
  if (visual && OPERATORS.has(name)) {
    return {
      status: "complete",
      command: {
        type: "operator",
        op: name as OperatorName,
        count,
        register: reg.register,
        target: { kind: "visual" },
      },
    };
  }

  if (visual && (name === "i" || name === "a")) {
    const objectKey = peek(r);
    if (objectKey === undefined) return INCOMPLETE;
    if (!TEXT_OBJECT_KEYS.has(objectKey)) return INVALID;
    r.i += 1;
    return {
      status: "complete",
      command: {
        type: "action",
        name: `select-${name}`,
        count,
        register: reg.register,
        arg: objectKey,
      },
    };
  }

  if (!visual && OPERATORS.has(name)) {
    const target = readTarget(r, name as OperatorName);
    if ("status" in target) return target;
    return {
      status: "complete",
      command: {
        type: "operator",
        op: name as OperatorName,
        count,
        register: reg.register,
        target: target.target,
      },
    };
  }

  // A bare `/` or `?` opens the command line; as an operator target it is a
  // search motion, which `readTarget` has already dealt with.
  if (MOTIONS[name] && name !== "/" && name !== "?") {
    const arg = readMotionArg(r, name);
    if (arg === "incomplete") return INCOMPLETE;
    return {
      status: "complete",
      command: { type: "motion", name, count, arg: arg.arg },
    };
  }

  const allowed = visual ? VISUAL_ACTIONS.has(name) || ACTIONS.has(name) : ACTIONS.has(name);
  if (!allowed) return INVALID;

  if (name === "q" && ctx.recordingMacro) {
    return {
      status: "complete",
      command: { type: "action", name: "q", count, register: reg.register },
    };
  }

  if (ACTIONS_WITH_CHAR_ARG.has(name)) {
    const arg = peek(r);
    if (arg === undefined) return INCOMPLETE;
    r.i += 1;
    return {
      status: "complete",
      command: {
        type: "action",
        name,
        count,
        register: reg.register,
        arg: arg === "<Space>" ? " " : arg,
      },
    };
  }

  return {
    status: "complete",
    command: { type: "action", name, count, register: reg.register },
  };
}
