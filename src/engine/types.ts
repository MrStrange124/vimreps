/**
 * Core types for the Vim engine.
 *
 * The engine is a pure reducer: `step(state, key) -> StepResult`. Nothing here
 * touches the DOM, React, or storage. That purity is not decoration — macros are
 * implemented by re-feeding a recorded key list through `step`, and undo is a
 * snapshot stack. Both fall out for free only because state is a plain value.
 */

export type Mode =
  | "normal"
  | "insert"
  | "replace"
  | "visual"
  | "visual-line"
  | "visual-block"
  | "command";

/** A normalised key. Printable characters are themselves; everything else is bracketed. */
export type KeyToken = string;

export type Position = { line: number; col: number };

export type Register = { text: string; linewise: boolean; blockwise?: boolean };

export type Registers = Record<string, Register>;

/** How a motion's range is interpreted when an operator consumes it. */
export type RangeKind = "exclusive" | "inclusive" | "linewise";

export type Range = { start: Position; end: Position; kind: RangeKind };

export type FindCommand = { op: "f" | "t" | "F" | "T"; char: string };

export type SearchState = { pattern: string; backwards: boolean };

/** Snapshot pushed onto the undo stack before each change. */
export type Snapshot = { lines: string[]; cursor: Position };

/**
 * An in-flight visual-block insert. Vim shows you typing on one line and
 * replicates it down the block when you press Esc, so the block bounds and the
 * column the text started at have to survive the whole insert session.
 */
export type BlockInsert = {
  top: number;
  bottom: number;
  col: number;
  startLine: number;
  /** True for `A`, which pads short lines out to the column. */
  append: boolean;
};

export type MacroState = {
  /** Register currently being recorded into, or null. */
  recording: string | null;
  /** Keys captured so far in the active recording. */
  buffer: KeyToken[];
  /** Register played by a bare `@@`. */
  lastPlayed: string | null;
  /** Guards against a macro that recurses forever. */
  depth: number;
};

export type EditorState = {
  lines: string[];
  cursor: Position;
  mode: Mode;

  /** Keys typed toward a command that is not yet complete (e.g. `d` awaiting a motion). */
  pendingKeys: KeyToken[];

  registers: Registers;
  marks: Record<string, Position>;

  /** Where the current visual selection was started. */
  visualAnchor: Position | null;

  lastSearch: SearchState | null;
  lastFind: FindCommand | null;

  /** Key sequence of the last buffer-changing command, replayed by `.`. */
  lastChange: KeyToken[] | null;
  /** Keys accumulated toward the change currently in progress. */
  changeBuffer: KeyToken[] | null;

  undo: Snapshot[];
  redo: Snapshot[];
  /** Snapshot taken when the current insert session began, so `u` undoes the whole insert. */
  insertAnchor: Snapshot | null;

  /** Contents of the `:` / `/` / `?` line while in command mode. */
  cmdline: string;
  cmdlinePrefix: ":" | "/" | "?" | null;

  macros: MacroState;

  /** Set while a visual-block `I`/`A` insert is being typed. */
  blockInsert: BlockInsert | null;

  /** Column `j` and `k` try to return to after passing through shorter lines. */
  desiredCol: number;

  /** Set by `:noh`-able searches; drives highlight rendering. */
  searchHighlight: boolean;
};

export type EngineEvent =
  | { type: "invalid"; keys: KeyToken[] }
  | { type: "message"; text: string }
  | { type: "error"; text: string }
  | { type: "bell" };

export type StepResult = {
  state: EditorState;
  events: EngineEvent[];
};
