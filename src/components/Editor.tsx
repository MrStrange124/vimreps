"use client";

import type { EditorState } from "@/engine/types";

/**
 * Renders an EditorState. Purely presentational — it decides nothing, which is
 * what keeps the engine the only place editing behaviour lives.
 */

function selectionBounds(state: EditorState) {
  if (!state.visualAnchor) return null;
  const a = state.visualAnchor;
  const b = state.cursor;
  const [start, end] =
    a.line < b.line || (a.line === b.line && a.col <= b.col) ? [a, b] : [b, a];
  return { start, end };
}

function isSelected(state: EditorState, line: number, col: number): boolean {
  const bounds = selectionBounds(state);
  if (!bounds) return false;
  const { start, end } = bounds;

  if (state.mode === "visual-line") return line >= start.line && line <= end.line;

  if (state.mode === "visual-block") {
    const left = Math.min(state.visualAnchor!.col, state.cursor.col);
    const right = Math.max(state.visualAnchor!.col, state.cursor.col);
    return line >= start.line && line <= end.line && col >= left && col <= right;
  }

  if (state.mode !== "visual") return false;
  if (line < start.line || line > end.line) return false;
  if (line === start.line && col < start.col) return false;
  if (line === end.line && col > end.col) return false;
  return true;
}

type Props = {
  state: EditorState;
  /** Rows to pad out to with `~`, the way Vim shows end-of-buffer. */
  minRows?: number;
  /** Dims the pane and hides the cursor when the exercise is over. */
  inert?: boolean;
};

export function Editor({ state, minRows = 8, inert = false }: Props) {
  const insertLike = state.mode === "insert" || state.mode === "replace";
  const rows = Math.max(minRows, state.lines.length);

  return (
    <div className="buffer select-none" aria-hidden={false}>
      {Array.from({ length: rows }, (_, line) => {
        if (line >= state.lines.length) {
          return (
            <div className="buffer-line" key={`tilde-${line}`}>
              <span className="gutter" />
              <span className="tilde">~</span>
            </div>
          );
        }

        const text = state.lines[line];
        const onThisLine = state.cursor.line === line;
        const cells = [...text];

        return (
          <div className="buffer-line" key={line}>
            <span className="gutter">{line + 1}</span>
            <span>
              {cells.map((char, col) => {
                const isCursor = !inert && onThisLine && state.cursor.col === col;
                const classes = [
                  "cell",
                  isSelected(state, line, col) ? "selected" : "",
                  isCursor && !insertLike ? "cursor-block" : "",
                  isCursor && insertLike ? "cursor-bar" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <span className={classes} key={col}>
                    {char}
                  </span>
                );
              })}

              {/* The cursor can sit one past the end of the line: at the end of
                  an empty line in normal mode, and while appending in insert. */}
              {!inert && onThisLine && state.cursor.col >= cells.length && (
                <span className={`cell ${insertLike ? "cursor-bar" : "cursor-block"}`}> </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
