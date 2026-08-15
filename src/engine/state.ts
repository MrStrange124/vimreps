import type { EditorState, Position, Snapshot } from "./types";
import { clampPosition } from "./text";

export function createState(
  lines: string[] = [""],
  cursor: Position = { line: 0, col: 0 },
): EditorState {
  const base: EditorState = {
    lines: lines.length > 0 ? [...lines] : [""],
    cursor: { ...cursor },
    mode: "normal",
    pendingKeys: [],
    registers: {},
    marks: {},
    visualAnchor: null,
    lastSearch: null,
    lastFind: null,
    lastChange: null,
    changeBuffer: null,
    undo: [],
    redo: [],
    insertAnchor: null,
    cmdline: "",
    cmdlinePrefix: null,
    macros: { recording: null, buffer: [], lastPlayed: null, depth: 0 },
    desiredCol: cursor.col,
    searchHighlight: false,
  };
  return { ...base, cursor: clampPosition(base, base.cursor) };
}

export function snapshot(state: EditorState): Snapshot {
  return { lines: [...state.lines], cursor: { ...state.cursor } };
}

/**
 * Push an undo point and clear the redo stack. Call this immediately before any
 * command that changes the buffer, never after.
 */
export function pushUndo(state: EditorState): EditorState {
  return { ...state, undo: [...state.undo, snapshot(state)], redo: [] };
}

/** Text of the whole buffer, for goal comparison and register capture. */
export function bufferText(state: EditorState): string {
  return state.lines.join("\n");
}
