import type {
  EditorState,
  EngineEvent,
  KeyToken,
  Position,
  StepResult,
} from "./types";
import {
  charAt,
  charClass,
  clampPosition,
  firstNonBlank,
  lastLine,
  lineAt,
  maxCol,
  spliceBuffer,
} from "./text";
import { pushUndo } from "./state";
import { applyMotion, searchBuffer, wordUnderCursor } from "./motions";
import { resolveTextObject } from "./textobjects";
import {
  NormalRange,
  blockColumns,
  normalizeRange,
  opCase,
  opChange,
  opDelete,
  opDeleteBlock,
  opIndent,
  opInsertBlock,
  opJoin,
  opPaste,
  opReplaceChar,
  opYank,
  rangeFromTextObject,
  readRegister,
  redo,
  undo,
  writeRegister,
} from "./operators";
import { isPrintable, parseKeys, printableChar } from "./keys";
import { parseCommand, type Command, type OperatorName, type Target } from "./parser";
import { registerNormalRunner, runExCommand } from "./ex";

/**
 * The reducer. Every keystroke in the application flows through `step`.
 *
 * Normal and visual mode work by accumulation: keys pile up in `pendingKeys`
 * until the parser says they form a command, at which point the whole buffer is
 * executed and cleared. Insert and command-line modes consume keys directly.
 */

const MAX_MACRO_DEPTH = 20;

function ok(state: EditorState, events: EngineEvent[] = []): StepResult {
  return { state, events };
}

export function step(state: EditorState, key: KeyToken): StepResult {
  const recorded = recordKey(state, key);
  const result = dispatch(recorded.state, key);
  return { ...result, events: [...recorded.events, ...result.events] };
}

/** Feed a whole key sequence, as macros, `.`, and exercise solutions all do. */
export function feedKeys(state: EditorState, keys: KeyToken[]): EditorState {
  return keys.reduce((acc, key) => step(acc, key).state, state);
}

/** Convenience for tests and exercise fixtures: `feed(state, "ciwhi<Esc>")`. */
export function feed(state: EditorState, source: string): EditorState {
  return feedKeys(state, parseKeys(source));
}

/* ------------------------------------------------------------- recording -- */

function recordKey(state: EditorState, key: KeyToken): StepResult {
  if (!state.macros.recording) return ok(state);
  // The `q` that ends a recording is not itself part of the macro.
  if (key === "q" && state.mode === "normal" && state.pendingKeys.length === 0) {
    return ok(state);
  }
  return ok({
    ...state,
    macros: { ...state.macros, buffer: [...state.macros.buffer, key] },
  });
}

/* -------------------------------------------------------------- dispatch -- */

function dispatch(state: EditorState, key: KeyToken): StepResult {
  if (state.mode === "insert" || state.mode === "replace") {
    return insertStep(state, key);
  }
  if (state.mode === "command") return commandLineStep(state, key);
  return normalStep(state, key);
}

/* ------------------------------------------------------------ insert -- */

function insertStep(state: EditorState, key: KeyToken): StepResult {
  const tracked = state.changeBuffer
    ? { ...state, changeBuffer: [...state.changeBuffer, key] }
    : state;

  // `<C-r>x` inserts the contents of register x.
  if (tracked.pendingKeys[0] === "<C-r>") {
    const register = readRegister(tracked, key);
    const cleared = { ...tracked, pendingKeys: [] };
    if (!register) return ok(cleared, [{ type: "bell" }]);
    return ok(insertText(cleared, register.text.replace(/\n$/, "")));
  }
  if (key === "<C-r>") {
    return ok({ ...tracked, pendingKeys: ["<C-r>"] });
  }

  if (key === "<Esc>") {
    const replicated = tracked.blockInsert ? replicateBlockInsert(tracked) : tracked;
    const line = replicated.cursor.line;
    const col = Math.max(0, replicated.cursor.col - 1);
    const exited: EditorState = {
      ...replicated,
      mode: "normal",
      pendingKeys: [],
      insertAnchor: null,
      blockInsert: null,
      lastChange: tracked.changeBuffer ?? tracked.lastChange,
      changeBuffer: null,
      cursor: clampPosition(replicated, { line, col }),
      desiredCol: col,
    };
    return ok(exited);
  }

  if (key === "<CR>") return ok(splitLine(tracked));
  if (key === "<BS>") return ok(backspace(tracked));

  if (isPrintable(key)) {
    const char = printableChar(key);
    if (tracked.mode === "replace") return ok(replaceText(tracked, char));
    return ok(insertText(tracked, char));
  }

  if (key === "<Left>") return ok(moveInInsert(tracked, 0, -1));
  if (key === "<Right>") return ok(moveInInsert(tracked, 0, 1));
  if (key === "<Up>") return ok(moveInInsert(tracked, -1, 0));
  if (key === "<Down>") return ok(moveInInsert(tracked, 1, 0));

  return ok(tracked, [{ type: "bell" }]);
}

/**
 * Copy whatever was typed on the first line of a visual-block insert down the
 * rest of the block. `A` pads lines that are too short to reach the column;
 * `I` skips them, which is what Vim does and what you want on ragged text.
 */
function replicateBlockInsert(state: EditorState): EditorState {
  const block = state.blockInsert;
  if (!block) return state;

  const typed = lineAt(state, block.startLine).slice(block.col, state.cursor.col);
  if (typed === "" || typed.includes("\n")) return state;

  const lines = [...state.lines];
  for (let l = block.top; l <= block.bottom; l++) {
    if (l === block.startLine) continue;
    const text = lines[l] ?? "";
    if (block.col > text.length) {
      if (!block.append) continue;
      lines[l] = text.padEnd(block.col, " ") + typed;
    } else {
      lines[l] = text.slice(0, block.col) + typed + text.slice(block.col);
    }
  }
  return { ...state, lines };
}

function insertText(state: EditorState, text: string): EditorState {
  const at = state.cursor;
  const lines = spliceBuffer(state.lines, at, at, text);
  const next = { ...state, lines };
  const added = text.split("\n");
  const cursor =
    added.length === 1
      ? { line: at.line, col: at.col + text.length }
      : { line: at.line + added.length - 1, col: added[added.length - 1].length };
  return { ...next, cursor: clampPosition(next, cursor, true) };
}

function replaceText(state: EditorState, char: string): EditorState {
  const text = lineAt(state, state.cursor.line);
  const lines = [...state.lines];
  lines[state.cursor.line] =
    text.slice(0, state.cursor.col) + char + text.slice(state.cursor.col + 1);
  const next = { ...state, lines };
  return {
    ...next,
    cursor: clampPosition(next, { line: state.cursor.line, col: state.cursor.col + 1 }, true),
  };
}

function splitLine(state: EditorState): EditorState {
  const text = lineAt(state, state.cursor.line);
  const head = text.slice(0, state.cursor.col);
  const tail = text.slice(state.cursor.col);
  const lines = [
    ...state.lines.slice(0, state.cursor.line),
    head,
    tail,
    ...state.lines.slice(state.cursor.line + 1),
  ];
  return { ...state, lines, cursor: { line: state.cursor.line + 1, col: 0 } };
}

function backspace(state: EditorState): EditorState {
  if (state.cursor.col > 0) {
    const text = lineAt(state, state.cursor.line);
    const lines = [...state.lines];
    lines[state.cursor.line] =
      text.slice(0, state.cursor.col - 1) + text.slice(state.cursor.col);
    return {
      ...state,
      lines,
      cursor: { line: state.cursor.line, col: state.cursor.col - 1 },
    };
  }
  if (state.cursor.line === 0) return state;
  const prev = lineAt(state, state.cursor.line - 1);
  const cur = lineAt(state, state.cursor.line);
  const lines = [
    ...state.lines.slice(0, state.cursor.line - 1),
    prev + cur,
    ...state.lines.slice(state.cursor.line + 1),
  ];
  return { ...state, lines, cursor: { line: state.cursor.line - 1, col: prev.length } };
}

function moveInInsert(state: EditorState, dLine: number, dCol: number): EditorState {
  return {
    ...state,
    cursor: clampPosition(
      state,
      { line: state.cursor.line + dLine, col: state.cursor.col + dCol },
      true,
    ),
  };
}

/* ------------------------------------------------------- command line -- */

function commandLineStep(state: EditorState, key: KeyToken): StepResult {
  if (key === "<Esc>") {
    return ok({ ...state, mode: "normal", cmdline: "", cmdlinePrefix: null });
  }
  if (key === "<BS>") {
    if (state.cmdline.length === 0) {
      return ok({ ...state, mode: "normal", cmdline: "", cmdlinePrefix: null });
    }
    return ok({ ...state, cmdline: state.cmdline.slice(0, -1) });
  }
  if (key === "<CR>") return submitCommandLine(state);
  if (isPrintable(key)) {
    return ok({ ...state, cmdline: state.cmdline + printableChar(key) });
  }
  return ok(state, [{ type: "bell" }]);
}

function submitCommandLine(state: EditorState): StepResult {
  const prefix = state.cmdlinePrefix;
  const text = state.cmdline;
  const cleared: EditorState = {
    ...state,
    mode: "normal",
    cmdline: "",
    cmdlinePrefix: null,
  };

  if (prefix === "/" || prefix === "?") {
    const backwards = prefix === "?";
    const pattern = text === "" ? state.lastSearch?.pattern : text;
    if (!pattern) return ok(cleared, [{ type: "error", text: "No previous search" }]);
    const target = searchBuffer(cleared, pattern, backwards, 1);
    const searched: EditorState = {
      ...cleared,
      lastSearch: { pattern, backwards },
      searchHighlight: true,
    };
    if (!target) {
      return ok(searched, [{ type: "error", text: `Pattern not found: ${pattern}` }]);
    }
    return ok({ ...searched, cursor: target, desiredCol: target.col });
  }

  return runExCommand(cleared, text);
}

/* ------------------------------------------------------------- normal -- */

function normalStep(state: EditorState, key: KeyToken): StepResult {
  const buffer = [...state.pendingKeys, key];
  const parsed = parseCommand(buffer, state.mode, {
    recordingMacro: state.macros.recording !== null,
  });

  if (parsed.status === "incomplete") {
    return ok({ ...state, pendingKeys: buffer });
  }
  if (parsed.status === "invalid") {
    return ok({ ...state, pendingKeys: [] }, [{ type: "invalid", keys: buffer }]);
  }

  const cleared: EditorState = { ...state, pendingKeys: [] };
  return execute(cleared, parsed.command, buffer);
}

function execute(
  state: EditorState,
  command: Command,
  keys: KeyToken[],
): StepResult {
  if (command.type === "motion") return executeMotion(state, command);
  if (command.type === "operator") return executeOperator(state, command, keys);
  return executeAction(state, command, keys);
}

/* ------------------------------------------------------------- motions -- */

function executeMotion(
  state: EditorState,
  command: Extract<Command, { type: "motion" }>,
): StepResult {
  const result = applyMotion(state, command.name, {
    count: command.count ?? (command.name === "G" ? 0 : 1),
    arg: command.arg,
  });
  if (!result) return ok(state, [{ type: "bell" }]);

  const remembered = rememberFind(state, command.name, command.arg);
  return ok({
    ...remembered,
    cursor: result.pos,
    desiredCol: result.keepDesiredCol ? state.desiredCol : result.pos.col,
  });
}

function rememberFind(
  state: EditorState,
  name: string,
  arg: string | undefined,
): EditorState {
  if (!arg) return state;
  if (name !== "f" && name !== "t" && name !== "F" && name !== "T") return state;
  return { ...state, lastFind: { op: name, char: arg } };
}

/* ----------------------------------------------------------- operators -- */

function resolveTarget(
  state: EditorState,
  op: OperatorName,
  target: Target,
  totalCount: number | null,
): NormalRange | null {
  if (target.kind === "line") {
    const lines = (totalCount ?? 1) * target.count;
    const last = Math.min(lastLine(state), state.cursor.line + lines - 1);
    return normalizeRange(
      state,
      { line: state.cursor.line, col: 0 },
      { line: last, col: 0 },
      "linewise",
    );
  }

  if (target.kind === "textobject") {
    const range = resolveTextObject(state, target.scope, target.key);
    if (!range) return null;
    return rangeFromTextObject(state, range);
  }

  if (target.kind === "visual") {
    if (!state.visualAnchor) return null;
    const kind = state.mode === "visual-line" ? "linewise" : "inclusive";
    return normalizeRange(state, state.visualAnchor, state.cursor, kind);
  }

  return resolveMotionTarget(state, op, target, totalCount);
}

/**
 * Two Vim quirks live here, and both matter enough to teach:
 * `cw` on a non-blank behaves like `ce`, and a `w` that would spill onto the
 * next line stops at the end of the current one.
 */
function resolveMotionTarget(
  state: EditorState,
  op: OperatorName,
  target: Extract<Target, { kind: "motion" }>,
  totalCount: number | null,
): NormalRange | null {
  // `dG` with no count anywhere means "to the last line", not "to line 1".
  const noCount = totalCount === null && target.count === null;
  const count = noCount && target.name === "G" ? 0 : (totalCount ?? 1) * (target.count ?? 1);
  let name = target.name;

  if (
    op === "c" &&
    (name === "w" || name === "W") &&
    charClass(charAt(state, state.cursor)) !== "blank"
  ) {
    name = name === "w" ? "e" : "E";
  }

  const result = applyMotion(state, name, {
    count,
    arg: target.arg,
    forOperator: true,
  });
  if (!result) return null;

  let end = result.pos;
  let kind = result.kind;

  if (
    (name === "w" || name === "W") &&
    end.line > state.cursor.line &&
    end.col <= firstNonBlank(state, end.line)
  ) {
    const stopLine = end.line - 1;
    end = { line: stopLine, col: lineAt(state, stopLine).length };
    kind = "exclusive";
  }

  return normalizeRange(state, state.cursor, end, kind);
}

function executeOperator(
  state: EditorState,
  command: Extract<Command, { type: "operator" }>,
  keys: KeyToken[],
): StepResult {
  const range = resolveTarget(state, command.op, command.target, command.count);
  if (!range) return ok(exitVisual(state), [{ type: "bell" }]);

  // Visual block delete and change are rectangular, not span-based.
  if (command.target.kind === "visual" && state.mode === "visual-block") {
    if (command.op === "d" || command.op === "c") {
      const deleted = opDeleteBlock(state, state.visualAnchor!, command.register);
      if (command.op === "c") {
        return ok({
          ...deleted,
          mode: "insert",
          visualAnchor: state.visualAnchor,
          changeBuffer: keys,
        });
      }
      return ok({ ...exitVisual(deleted), lastChange: keys });
    }
  }

  const remembered = rememberFindFromTarget(state, command.target);
  let next: EditorState;

  switch (command.op) {
    case "d":
      next = exitVisual(opDelete(remembered, range, command.register));
      break;
    case "c":
      next = { ...opChange(remembered, range, command.register), visualAnchor: null };
      break;
    case "y":
      next = exitVisual(opYank(remembered, range, command.register));
      break;
    // A count on `>` selects how many lines to shift, not how far to shift them,
    // so the shift width is always one.
    case ">":
      next = exitVisual(opIndent(remembered, range, 1, 1));
      break;
    case "<":
      next = exitVisual(opIndent(remembered, range, -1, 1));
      break;
    case "gu":
      next = exitVisual(opCase(remembered, range, "lower"));
      break;
    case "gU":
      next = exitVisual(opCase(remembered, range, "upper"));
      break;
    case "g~":
      next = exitVisual(opCase(remembered, range, "toggle"));
      break;
  }

  if (command.op === "c") {
    return ok({ ...next, changeBuffer: keys });
  }
  if (command.op !== "y") {
    return ok({ ...next, lastChange: keys });
  }
  return ok(next);
}

function rememberFindFromTarget(state: EditorState, target: Target): EditorState {
  if (target.kind !== "motion") return state;
  return rememberFind(state, target.name, target.arg);
}

function exitVisual(state: EditorState): EditorState {
  if (state.mode === "normal") return state;
  return { ...state, mode: "normal", visualAnchor: null };
}

/* ------------------------------------------------------------- actions -- */

/**
 * One undo point is taken as insert mode is entered, and none per character, so
 * `u` after typing a word undoes the word rather than the last letter. Callers
 * that already changed the buffer on the way in (`o`, `O`) pass
 * `takeUndoPoint: false`, having pushed their own snapshot first.
 */
function enterInsert(
  state: EditorState,
  cursor: Position,
  keys: KeyToken[],
  takeUndoPoint = true,
): EditorState {
  const base = takeUndoPoint ? pushUndo(state) : state;
  return {
    ...base,
    mode: "insert",
    cursor: clampPosition(base, cursor, true),
    visualAnchor: null,
    changeBuffer: keys,
  };
}

function executeAction(
  state: EditorState,
  command: Extract<Command, { type: "action" }>,
  keys: KeyToken[],
): StepResult {
  const { name, register, arg } = command;
  const count = command.count ?? 1;
  const visual = state.mode !== "normal";
  const line = state.cursor.line;

  // Visual-block `I` and `A` have to be caught before the normal-mode cases
  // below, which would otherwise treat them as an ordinary insert.
  if (state.mode === "visual-block" && (name === "I" || name === "A") && state.visualAnchor) {
    const { top, bottom, left, right } = blockColumns(state.visualAnchor, state.cursor);
    const col = name === "A" ? right + 1 : left;
    return ok({
      ...pushUndo(state),
      mode: "insert",
      visualAnchor: null,
      cursor: clampPosition(state, { line: top, col }, true),
      blockInsert: { top, bottom, col, startLine: top, append: name === "A" },
      changeBuffer: keys,
    });
  }

  switch (name) {
    /* ------------------------------------------------ entering insert -- */
    case "i":
      return ok(enterInsert(state, state.cursor, keys));
    case "I":
      return ok(enterInsert(state, { line, col: firstNonBlank(state, line) }, keys));
    case "a":
      return ok(enterInsert(state, { line, col: state.cursor.col + 1 }, keys));
    case "A":
      return ok(enterInsert(state, { line, col: lineAt(state, line).length }, keys));
    case "o":
    case "O": {
      if (visual && name === "o") return ok(swapVisualEnds(state));
      const indent = lineAt(state, line).match(/^\s*/)?.[0] ?? "";
      const at = name === "o" ? line + 1 : line;
      const lines = [...state.lines.slice(0, at), indent, ...state.lines.slice(at)];
      const opened = { ...pushUndo(state), lines };
      return ok(enterInsert(opened, { line: at, col: indent.length }, keys, false));
    }
    case "R":
      return ok({ ...enterInsert(state, state.cursor, keys), mode: "replace" });

    /* ------------------------------------------------------- deletion -- */
    case "x":
    case "<Del>": {
      if (visual) return deleteVisual(state, register, keys);
      const end = Math.min(lineAt(state, line).length, state.cursor.col + count);
      if (end === state.cursor.col) return ok(state, [{ type: "bell" }]);
      const range = normalizeRange(
        state,
        state.cursor,
        { line, col: end },
        "exclusive",
      );
      return ok({ ...opDelete(state, range, register), lastChange: keys });
    }
    case "X": {
      const start = Math.max(0, state.cursor.col - count);
      if (start === state.cursor.col) return ok(state, [{ type: "bell" }]);
      const range = normalizeRange(
        state,
        { line, col: start },
        state.cursor,
        "exclusive",
      );
      return ok({ ...opDelete(state, range, register), lastChange: keys });
    }
    case "D": {
      const range = normalizeRange(
        state,
        state.cursor,
        { line, col: lineAt(state, line).length },
        "exclusive",
      );
      return ok({ ...opDelete(state, range, register), lastChange: keys });
    }
    case "s": {
      if (visual) return changeVisual(state, register, keys);
      const end = Math.min(lineAt(state, line).length, state.cursor.col + count);
      const range = normalizeRange(state, state.cursor, { line, col: end }, "exclusive");
      return ok({ ...opChange(state, range, register), changeBuffer: keys });
    }
    case "S":
    case "C": {
      const range =
        name === "S"
          ? normalizeRange(
              state,
              { line, col: 0 },
              { line: Math.min(lastLine(state), line + count - 1), col: 0 },
              "linewise",
            )
          : normalizeRange(
              state,
              state.cursor,
              { line, col: lineAt(state, line).length },
              "exclusive",
            );
      return ok({ ...opChange(state, range, register), changeBuffer: keys });
    }

    /* ---------------------------------------------------------- yank -- */
    case "Y": {
      const range = normalizeRange(
        state,
        { line, col: 0 },
        { line: Math.min(lastLine(state), line + count - 1), col: 0 },
        "linewise",
      );
      return ok(opYank(state, range, register));
    }

    /* --------------------------------------------------------- paste -- */
    case "p":
    case "P": {
      if (visual) return pasteOverVisual(state, register, keys);
      return ok({ ...opPaste(state, register, name === "P", count), lastChange: keys });
    }
    case "gp":
      return ok({ ...opPaste(state, register, false, count), lastChange: keys });

    /* ---------------------------------------------------------- undo -- */
    case "u": {
      if (visual) return ok({ ...exitVisual(caseVisual(state, "lower")), lastChange: keys });
      let next = state;
      for (let i = 0; i < count; i++) next = undo(next);
      return ok(next);
    }
    case "U":
      if (visual) return ok({ ...exitVisual(caseVisual(state, "upper")), lastChange: keys });
      return ok(state, [{ type: "bell" }]);
    case "<C-r>": {
      let next = state;
      for (let i = 0; i < count; i++) next = redo(next);
      return ok(next);
    }

    /* -------------------------------------------------------- repeat -- */
    case ".": {
      if (!state.lastChange) return ok(state, [{ type: "bell" }]);
      if (state.macros.depth >= MAX_MACRO_DEPTH) {
        return ok(state, [{ type: "error", text: "Recursion too deep" }]);
      }
      const deeper = { ...state, macros: { ...state.macros, depth: state.macros.depth + 1 } };
      const replayed = feedKeys(deeper, state.lastChange);
      return ok({ ...replayed, macros: { ...replayed.macros, depth: state.macros.depth } });
    }

    /* ----------------------------------------------------- case & join -- */
    case "~": {
      if (visual) return ok({ ...exitVisual(caseVisual(state, "toggle")), lastChange: keys });
      const text = lineAt(state, line);
      const end = Math.min(text.length, state.cursor.col + count);
      const range = normalizeRange(state, state.cursor, { line, col: end }, "exclusive");
      const cased = opCase(state, range, "toggle");
      return ok({
        ...cased,
        cursor: clampPosition(cased, { line, col: end }),
        lastChange: keys,
      });
    }
    case "J":
    case "gJ": {
      if (visual && state.visualAnchor) {
        const top = Math.min(state.visualAnchor.line, state.cursor.line);
        const span = Math.abs(state.visualAnchor.line - state.cursor.line) + 1;
        const positioned = { ...state, cursor: { line: top, col: 0 } };
        return ok({
          ...exitVisual(opJoin(positioned, Math.max(2, span), name === "J")),
          lastChange: keys,
        });
      }
      return ok({ ...opJoin(state, Math.max(2, count), name === "J"), lastChange: keys });
    }

    /* ------------------------------------------------------- replace -- */
    case "r": {
      if (!arg) return ok(state, [{ type: "bell" }]);
      const char = arg.length === 1 ? arg : arg === "<CR>" ? "\n" : null;
      if (char === null) return ok(state, [{ type: "bell" }]);
      if (visual) return ok({ ...exitVisual(replaceVisual(state, char)), lastChange: keys });
      return ok({ ...opReplaceChar(state, char, count), lastChange: keys });
    }

    /* --------------------------------------------------- visual modes -- */
    case "v":
    case "V":
    case "<C-v>": {
      const wanted =
        name === "v" ? "visual" : name === "V" ? "visual-line" : "visual-block";
      if (state.mode === wanted) return ok(exitVisual(state));
      return ok({
        ...state,
        mode: wanted,
        visualAnchor: state.visualAnchor ?? { ...state.cursor },
      });
    }
    case "gv": {
      if (!state.marks["<"] || !state.marks[">"]) return ok(state, [{ type: "bell" }]);
      return ok({
        ...state,
        mode: "visual",
        visualAnchor: state.marks["<"],
        cursor: clampPosition(state, state.marks[">"]),
      });
    }
    case "select-i":
    case "select-a": {
      if (!arg) return ok(state, [{ type: "bell" }]);
      const range = resolveTextObject(state, name === "select-i" ? "i" : "a", arg);
      if (!range) return ok(state, [{ type: "bell" }]);
      return ok({
        ...state,
        visualAnchor: range.start,
        cursor: clampPosition(state, range.end),
      });
    }
    /* --------------------------------------------------------- marks -- */
    case "m": {
      if (!arg) return ok(state, [{ type: "bell" }]);
      return ok({ ...state, marks: { ...state.marks, [arg]: { ...state.cursor } } });
    }
    case "`":
    case "'": {
      if (!arg) return ok(state, [{ type: "bell" }]);
      const mark = state.marks[arg];
      if (!mark) return ok(state, [{ type: "error", text: `Mark not set: ${arg}` }]);
      const target =
        name === "`"
          ? mark
          : { line: mark.line, col: firstNonBlank(state, mark.line) };
      return ok({ ...state, cursor: clampPosition(state, target), desiredCol: target.col });
    }

    /* -------------------------------------------------------- macros -- */
    case "q": {
      if (state.macros.recording) {
        const name = state.macros.recording;
        return ok({
          ...state,
          registers: writeRegister(
            state.registers,
            name,
            { text: state.macros.buffer.join(""), linewise: false },
            "yank",
          ),
          macros: { ...state.macros, recording: null, buffer: [] },
        });
      }
      if (!arg || !/^[a-zA-Z0-9]$/.test(arg)) return ok(state, [{ type: "bell" }]);
      return ok({
        ...state,
        macros: { ...state.macros, recording: arg, buffer: [] },
      });
    }
    case "@": {
      if (!arg) return ok(state, [{ type: "bell" }]);
      const target = arg === "@" ? state.macros.lastPlayed : arg;
      if (!target) return ok(state, [{ type: "bell" }]);
      const stored = readRegister(state, target);
      if (!stored) return ok(state, [{ type: "error", text: `Register empty: ${target}` }]);
      if (state.macros.depth >= MAX_MACRO_DEPTH) {
        return ok(state, [{ type: "error", text: "Recursion too deep" }]);
      }
      const tokens = parseKeys(stored.text);
      let next: EditorState = {
        ...state,
        macros: { ...state.macros, lastPlayed: target, depth: state.macros.depth + 1 },
      };
      for (let i = 0; i < count; i++) next = feedKeys(next, tokens);
      return ok({ ...next, macros: { ...next.macros, depth: state.macros.depth } });
    }

    /* -------------------------------------------------------- search -- */
    case "/":
    case "?":
      return ok({ ...state, mode: "command", cmdline: "", cmdlinePrefix: name });
    case ":":
      return ok({ ...state, mode: "command", cmdline: "", cmdlinePrefix: ":" });
    case "*":
    case "#": {
      const word = wordUnderCursor(state);
      if (!word) return ok(state, [{ type: "bell" }]);
      const pattern = `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`;
      const backwards = name === "#";
      const target = searchBuffer(state, pattern, backwards, count);
      const searched = {
        ...state,
        lastSearch: { pattern, backwards },
        searchHighlight: true,
      };
      if (!target) return ok(searched, [{ type: "error", text: "Pattern not found" }]);
      return ok({ ...searched, cursor: target, desiredCol: target.col });
    }

    /* -------------------------------------------------------- scroll -- */
    case "<C-d>":
    case "<C-u>":
    case "<C-f>":
    case "<C-b>": {
      const page = name === "<C-d>" || name === "<C-u>" ? 10 : 20;
      const delta = name === "<C-d>" || name === "<C-f>" ? page : -page;
      const target = Math.min(lastLine(state), Math.max(0, line + delta));
      return ok({
        ...state,
        cursor: clampPosition(state, { line: target, col: state.desiredCol }),
      });
    }

    /* ---------------------------------------------------------- misc -- */
    case "<Esc>":
      return ok({ ...exitVisual(state), pendingKeys: [] });
    case "<CR>": {
      const target = Math.min(lastLine(state), line + count);
      return ok({
        ...state,
        cursor: { line: target, col: firstNonBlank(state, target) },
      });
    }
    default:
      return ok(state, [{ type: "bell" }]);
  }
}

/* ------------------------------------------------------- visual helpers -- */

function visualRange(state: EditorState): NormalRange | null {
  if (!state.visualAnchor) return null;
  const kind = state.mode === "visual-line" ? "linewise" : "inclusive";
  return normalizeRange(state, state.visualAnchor, state.cursor, kind);
}

function deleteVisual(
  state: EditorState,
  register: string | null,
  keys: KeyToken[],
): StepResult {
  if (state.mode === "visual-block" && state.visualAnchor) {
    return ok({
      ...exitVisual(opDeleteBlock(state, state.visualAnchor, register)),
      lastChange: keys,
    });
  }
  const range = visualRange(state);
  if (!range) return ok(state, [{ type: "bell" }]);
  return ok({ ...exitVisual(opDelete(state, range, register)), lastChange: keys });
}

function changeVisual(
  state: EditorState,
  register: string | null,
  keys: KeyToken[],
): StepResult {
  const range = visualRange(state);
  if (!range) return ok(state, [{ type: "bell" }]);
  return ok({ ...opChange(state, range, register), visualAnchor: null, changeBuffer: keys });
}

function pasteOverVisual(
  state: EditorState,
  register: string | null,
  keys: KeyToken[],
): StepResult {
  const range = visualRange(state);
  if (!range) return ok(state, [{ type: "bell" }]);
  const stored = readRegister(state, register);
  if (!stored) return ok(state, [{ type: "bell" }]);
  const deleted = opDelete(state, range, null);
  const pasted = range.linewise
    ? opPaste({ ...deleted, registers: state.registers }, register, true, 1)
    : opPaste(
        { ...deleted, registers: state.registers, cursor: clampPosition(deleted, range.start) },
        register,
        true,
        1,
      );
  return ok({ ...exitVisual(pasted), lastChange: keys });
}

function caseVisual(state: EditorState, op: "upper" | "lower" | "toggle"): EditorState {
  const range = visualRange(state);
  if (!range) return state;
  return opCase(state, range, op);
}

function replaceVisual(state: EditorState, char: string): EditorState {
  const range = visualRange(state);
  if (!range) return state;
  const lines = [...state.lines];
  for (let l = range.firstLine; l <= range.lastLine; l++) {
    const text = lines[l] ?? "";
    const from = l === range.firstLine && !range.linewise ? range.start.col : 0;
    const to =
      l === range.lastLine && !range.linewise ? range.end.col : text.length;
    lines[l] = text.slice(0, from) + char.repeat(Math.max(0, to - from)) + text.slice(to);
  }
  const next = { ...pushUndo(state), lines };
  return { ...next, cursor: clampPosition(next, range.start) };
}

function swapVisualEnds(state: EditorState): EditorState {
  if (!state.visualAnchor) return state;
  return { ...state, visualAnchor: state.cursor, cursor: state.visualAnchor };
}

// `:normal` needs to run normal-mode keys. Registering here rather than having
// ex.ts import the interpreter keeps the dependency pointing one way.
registerNormalRunner(feedKeys);

/** Exposed for the UI's status line and for the cheatsheet generator. */
export function pendingDisplay(state: EditorState): string {
  return state.pendingKeys.join("");
}

export function maxColumn(state: EditorState, line: number): number {
  return maxCol(state, line, state.mode === "insert" || state.mode === "replace");
}
