import type { EditorState, EngineEvent, KeyToken, StepResult } from "./types";
import { clampPosition, firstNonBlank, lastLine, lineAt } from "./text";
import { pushUndo } from "./state";
import { opYank, writeRegister } from "./operators";
import { normalizeRange } from "./operators";

/**
 * The `:` command line — ranges, `:substitute`, `:global`, and friends.
 *
 * `:normal` needs to run normal-mode keys, which lives in the interpreter. Rather
 * than import it and create a cycle, the interpreter registers its runner here at
 * load time. The dependency points one way: interpreter → ex.
 */

type NormalRunner = (state: EditorState, keys: KeyToken[]) => EditorState;

let normalRunner: NormalRunner | null = null;

export function registerNormalRunner(fn: NormalRunner): void {
  normalRunner = fn;
}

function ok(state: EditorState, events: EngineEvent[] = []): StepResult {
  return { state, events };
}

/* ------------------------------------------------------- vim regex -> js -- */

/**
 * Vim's "magic" regex flavour differs from JavaScript's in a handful of places:
 * groups and alternation are backslash-escaped, and literal parens are not. We
 * teach Vim's syntax, so we translate rather than pretend.
 */
export function vimRegexToJs(pattern: string): string {
  let out = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "\\") {
      const next = pattern[i + 1];
      switch (next) {
        case "(":
        case ")":
        case "|":
        case "+":
        case "?":
        case "{":
        case "}":
          out += next;
          i += 2;
          continue;
        case "<":
        case ">":
          out += "\\b";
          i += 2;
          continue;
        case undefined:
          out += "\\\\";
          i += 1;
          continue;
        default:
          out += `\\${next}`;
          i += 2;
          continue;
      }
    }
    if ("()|+?{}".includes(ch)) {
      out += `\\${ch}`;
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** `\1`-`\9` become `$1`-`$9`; `&` becomes the whole match. */
export function vimReplacementToJs(replacement: string): string {
  let out = "";
  let i = 0;
  while (i < replacement.length) {
    const ch = replacement[i];
    if (ch === "\\") {
      const next = replacement[i + 1];
      if (next && /[0-9]/.test(next)) {
        out += next === "0" ? "$&" : `$${next}`;
        i += 2;
        continue;
      }
      if (next === "&") {
        out += "&";
        i += 2;
        continue;
      }
      if (next === "n") {
        out += "\n";
        i += 2;
        continue;
      }
      out += next ?? "\\";
      i += 2;
      continue;
    }
    if (ch === "&") {
      out += "$&";
      i += 1;
      continue;
    }
    if (ch === "$") {
      out += "$$";
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/* ----------------------------------------------------------------- range -- */

type ParsedRange = { first: number; last: number; explicit: boolean };

function parseAddress(
  state: EditorState,
  text: string,
  cursor: { i: number },
): number | null {
  let value: number | null = null;
  const ch = text[cursor.i];

  if (ch === undefined) return null;

  if (/[0-9]/.test(ch)) {
    let digits = "";
    while (cursor.i < text.length && /[0-9]/.test(text[cursor.i])) {
      digits += text[cursor.i];
      cursor.i += 1;
    }
    value = parseInt(digits, 10) - 1;
  } else if (ch === ".") {
    cursor.i += 1;
    value = state.cursor.line;
  } else if (ch === "$") {
    cursor.i += 1;
    value = lastLine(state);
  } else if (ch === "'") {
    const markName = text[cursor.i + 1];
    if (!markName) return null;
    cursor.i += 2;
    const mark = state.marks[markName];
    if (!mark) return null;
    value = mark.line;
  }

  // Trailing +n / -n offsets.
  while (cursor.i < text.length && (text[cursor.i] === "+" || text[cursor.i] === "-")) {
    const sign = text[cursor.i] === "+" ? 1 : -1;
    cursor.i += 1;
    let digits = "";
    while (cursor.i < text.length && /[0-9]/.test(text[cursor.i])) {
      digits += text[cursor.i];
      cursor.i += 1;
    }
    const amount = digits === "" ? 1 : parseInt(digits, 10);
    value = (value ?? state.cursor.line) + sign * amount;
  }

  return value;
}

function parseRange(
  state: EditorState,
  text: string,
): { range: ParsedRange; rest: string } {
  const cursor = { i: 0 };

  if (text[0] === "%") {
    return {
      range: { first: 0, last: lastLine(state), explicit: true },
      rest: text.slice(1),
    };
  }

  const first = parseAddress(state, text, cursor);
  if (first === null) {
    return {
      range: { first: state.cursor.line, last: state.cursor.line, explicit: false },
      rest: text,
    };
  }

  if (text[cursor.i] === ",") {
    cursor.i += 1;
    const second = parseAddress(state, text, cursor);
    return {
      range: {
        first: Math.max(0, Math.min(first, second ?? first)),
        last: Math.min(lastLine(state), Math.max(first, second ?? first)),
        explicit: true,
      },
      rest: text.slice(cursor.i),
    };
  }

  return {
    range: {
      first: Math.max(0, Math.min(first, lastLine(state))),
      last: Math.max(0, Math.min(first, lastLine(state))),
      explicit: true,
    },
    rest: text.slice(cursor.i),
  };
}

/* ------------------------------------------------------------ substitute -- */

function runSubstitute(
  state: EditorState,
  range: ParsedRange,
  body: string,
): StepResult {
  const delimiter = body[0];
  if (!delimiter || /[a-zA-Z0-9\\"|]/.test(delimiter)) {
    return ok(state, [{ type: "error", text: "Invalid substitute delimiter" }]);
  }

  const parts: string[] = [];
  let current = "";
  for (let i = 1; i < body.length; i++) {
    if (body[i] === "\\" && body[i + 1] === delimiter) {
      current += delimiter;
      i += 1;
      continue;
    }
    if (body[i] === delimiter) {
      parts.push(current);
      current = "";
      continue;
    }
    current += body[i];
  }
  parts.push(current);

  const [rawPattern = "", rawReplacement = "", flags = ""] = parts;
  const pattern = rawPattern === "" ? state.lastSearch?.pattern : rawPattern;
  if (!pattern) return ok(state, [{ type: "error", text: "No previous pattern" }]);

  const global = flags.includes("g");
  const ignoreCase = flags.includes("i");

  let re: RegExp;
  try {
    re = new RegExp(vimRegexToJs(pattern), ignoreCase ? "gi" : "g");
  } catch {
    return ok(state, [{ type: "error", text: `Invalid pattern: ${pattern}` }]);
  }
  const replacement = vimReplacementToJs(rawReplacement);

  const lines = [...state.lines];
  let matched = 0;
  let lastTouched = state.cursor.line;

  for (let l = range.first; l <= range.last; l++) {
    const text = lines[l] ?? "";
    re.lastIndex = 0;
    if (!re.test(text)) continue;
    re.lastIndex = 0;

    let replacedCount = 0;
    const replaced = text.replace(re, (...args) => {
      replacedCount += 1;
      if (!global && replacedCount > 1) return args[0] as string;
      const groups = args.slice(0, -2) as string[];
      return replacement.replace(/\$(&|\$|[1-9])/g, (_, token: string) => {
        if (token === "&") return groups[0];
        if (token === "$") return "$";
        return groups[Number(token)] ?? "";
      });
    });

    if (replaced !== text) {
      matched += 1;
      lastTouched = l;
      lines[l] = replaced;
    }
  }

  if (matched === 0) {
    return ok({ ...state, lastSearch: { pattern, backwards: false } }, [
      { type: "error", text: `Pattern not found: ${pattern}` },
    ]);
  }

  // A substitution may split lines when the replacement contains a newline.
  const flattened = lines.join("\n").split("\n");
  const next: EditorState = {
    ...pushUndo(state),
    lines: flattened,
    lastSearch: { pattern, backwards: false },
  };
  return ok(
    {
      ...next,
      cursor: clampPosition(next, {
        line: Math.min(lastTouched, lastLine(next)),
        col: firstNonBlank(next, Math.min(lastTouched, lastLine(next))),
      }),
    },
    [{ type: "message", text: `${matched} substitution${matched === 1 ? "" : "s"}` }],
  );
}

/* ---------------------------------------------------------------- global -- */

function runGlobal(
  state: EditorState,
  range: ParsedRange,
  body: string,
  invert: boolean,
): StepResult {
  const delimiter = body[0];
  if (!delimiter) return ok(state, [{ type: "error", text: "Missing pattern" }]);

  const close = body.indexOf(delimiter, 1);
  const pattern = close === -1 ? body.slice(1) : body.slice(1, close);
  const command = close === -1 ? "d" : body.slice(close + 1).trim() || "d";

  let re: RegExp;
  try {
    re = new RegExp(vimRegexToJs(pattern));
  } catch {
    return ok(state, [{ type: "error", text: `Invalid pattern: ${pattern}` }]);
  }

  const targets: number[] = [];
  for (let l = range.first; l <= range.last; l++) {
    const hit = re.test(lineAt(state, l));
    if (hit !== invert) targets.push(l);
  }
  if (targets.length === 0) {
    return ok(state, [{ type: "error", text: `Pattern not found: ${pattern}` }]);
  }

  // Bottom-up so earlier line numbers stay valid as lines are removed.
  let next = state;
  for (let i = targets.length - 1; i >= 0; i--) {
    const line = Math.min(targets[i], lastLine(next));
    next = { ...next, cursor: { line, col: 0 } };
    next = execute(next, command).state;
  }
  return ok({ ...next, cursor: clampPosition(next, next.cursor) }, [
    { type: "message", text: `${targets.length} line${targets.length === 1 ? "" : "s"}` },
  ]);
}

/* ------------------------------------------------------------- dispatch -- */

const NO_FILESYSTEM = "This editor has no files — nothing to write.";

function execute(state: EditorState, input: string): StepResult {
  const text = input.trim();
  if (text === "") return ok(state);

  const { range, rest } = parseRange(state, text);
  const trimmed = rest.trim();

  // A bare range jumps to its last line.
  if (trimmed === "") {
    if (!range.explicit) return ok(state);
    const line = Math.min(range.last, lastLine(state));
    return ok({ ...state, cursor: { line, col: firstNonBlank(state, line) } });
  }

  const match = /^([a-zA-Z]+|&|~|<+|>+)\s*(.*)$/s.exec(trimmed);
  if (!match) return ok(state, [{ type: "error", text: `Not a command: ${trimmed}` }]);
  const [, name, argsRaw] = match;
  const args = argsRaw ?? "";

  // `:s/…` — the name regex splits `s` from its delimiter for us.
  if (name === "s" || name === "su" || name === "sub" || name === "substitute") {
    return runSubstitute(state, range, trimmed.slice(name.length));
  }
  // `:g` and `:v` scan the whole file unless given an explicit range — unlike
  // `:s` and `:d`, which default to the current line.
  const wholeFile: ParsedRange = { first: 0, last: lastLine(state), explicit: true };
  if (name === "g" || name === "global") {
    return runGlobal(state, range.explicit ? range : wholeFile, trimmed.slice(name.length), false);
  }
  if (name === "v" || name === "vglobal") {
    return runGlobal(state, range.explicit ? range : wholeFile, trimmed.slice(name.length), true);
  }

  switch (name) {
    case "d":
    case "delete": {
      const value = {
        text: `${state.lines.slice(range.first, range.last + 1).join("\n")}\n`,
        linewise: true,
      };
      const lines = [
        ...state.lines.slice(0, range.first),
        ...state.lines.slice(range.last + 1),
      ];
      const next: EditorState = {
        ...pushUndo(state),
        lines: lines.length > 0 ? lines : [""],
        registers: writeRegister(state.registers, args.trim() || null, value, "delete"),
      };
      const line = Math.min(range.first, lastLine(next));
      return ok({
        ...next,
        cursor: clampPosition(next, { line, col: firstNonBlank(next, line) }),
      });
    }

    case "y":
    case "yank": {
      const r = normalizeRange(
        state,
        { line: range.first, col: 0 },
        { line: range.last, col: 0 },
        "linewise",
      );
      return ok(opYank(state, r, args.trim() || null));
    }

    case "m":
    case "move":
    case "t":
    case "co":
    case "copy": {
      const dest = parseAddress(state, args.trim(), { i: 0 });
      if (dest === null) return ok(state, [{ type: "error", text: "Invalid destination" }]);
      const body = state.lines.slice(range.first, range.last + 1);
      const moving = name === "m" || name === "move";

      let remaining = moving
        ? [...state.lines.slice(0, range.first), ...state.lines.slice(range.last + 1)]
        : [...state.lines];

      let at = dest + 1;
      if (moving && dest > range.last) at -= body.length;
      at = Math.max(0, Math.min(at, remaining.length));

      const lines = [...remaining.slice(0, at), ...body, ...remaining.slice(at)];
      const next: EditorState = { ...pushUndo(state), lines };
      const landing = Math.min(at + body.length - 1, lastLine(next));
      return ok({
        ...next,
        cursor: clampPosition(next, { line: landing, col: firstNonBlank(next, landing) }),
      });
    }

    case "normal":
    case "norm": {
      if (!normalRunner) return ok(state, [{ type: "error", text: "normal unavailable" }]);
      const keys = argsRaw.startsWith(" ") ? argsRaw.slice(1) : argsRaw;
      const tokens = tokenize(keys);
      let next = state;
      for (let l = range.first; l <= Math.min(range.last, lastLine(next)); l++) {
        next = { ...next, cursor: { line: l, col: 0 }, mode: "normal", pendingKeys: [] };
        next = normalRunner(next, tokens);
        if (next.mode !== "normal") {
          next = normalRunner(next, ["<Esc>"]);
        }
      }
      return ok(next);
    }

    case "noh":
    case "nohl":
    case "nohlsearch":
      return ok({ ...state, searchHighlight: false });

    case "undo":
    case "u":
      return ok(state, [{ type: "message", text: "Use u in normal mode" }]);

    case "set":
    case "se":
      return ok(state, [{ type: "message", text: `set ${args} (ignored)` }]);

    case "w":
    case "write":
    case "wq":
    case "x":
    case "q":
    case "q!":
    case "quit":
      return ok(state, [{ type: "message", text: NO_FILESYSTEM }]);

    case ">":
    case ">>":
    case "<":
    case "<<": {
      const width = 2 * name.length;
      const lines = [...state.lines];
      for (let l = range.first; l <= range.last; l++) {
        const line = lines[l] ?? "";
        lines[l] =
          name[0] === ">"
            ? " ".repeat(width) + line
            : line.replace(new RegExp(`^ {1,${width}}`), "");
      }
      const next: EditorState = { ...pushUndo(state), lines };
      return ok({
        ...next,
        cursor: clampPosition(next, {
          line: range.first,
          col: firstNonBlank(next, range.first),
        }),
      });
    }

    default:
      return ok(state, [{ type: "error", text: `Not a command: ${name}` }]);
  }
}

/** `:normal` arguments are written in the same notation as macros. */
function tokenize(source: string): KeyToken[] {
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

export function runExCommand(state: EditorState, input: string): StepResult {
  return execute(state, input);
}
