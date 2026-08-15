"use client";

import type { EditorState } from "@/engine/types";

/**
 * A working Vim status line, and the one piece of this interface that is doing
 * real teaching.
 *
 * The pending-keys readout is the point: type `d`, then `2`, then `w` and you
 * watch `d`, `d2`, `d2w` assemble and fire. Vim's grammar is invisible in a real
 * terminal, and seeing the operator sit there waiting for its motion is what
 * makes "verb plus noun" click.
 */

const MODE_LABEL: Record<string, string> = {
  normal: "NORMAL",
  insert: "INSERT",
  replace: "REPLACE",
  visual: "VISUAL",
  "visual-line": "V-LINE",
  "visual-block": "V-BLOCK",
  command: "COMMAND",
};

function modeColor(mode: string): string {
  if (mode === "insert" || mode === "replace") return "var(--color-mode-insert)";
  if (mode.startsWith("visual")) return "var(--color-mode-visual)";
  if (mode === "command") return "var(--color-mode-command)";
  return "var(--color-muted)";
}

type Props = {
  state: EditorState;
  keystrokes: number;
  par?: number;
  /** One dot per exercise; index of the current one and which are done. */
  dots?: { total: number; index: number; done: number };
};

export function StatusBar({ state, keystrokes, par, dots }: Props) {
  const colour = modeColor(state.mode);
  const pending = state.pendingKeys.join("");
  const recording = state.macros.recording;

  return (
    <div className="flex items-center gap-4 border-t border-rule bg-panel px-3 py-1.5 text-[12px]">
      <span
        className="font-semibold tracking-[0.14em]"
        style={{ color: colour }}
        aria-live="polite"
      >
        {state.mode === "command"
          ? `${state.cmdlinePrefix ?? ":"}${state.cmdline}`
          : MODE_LABEL[state.mode] ?? state.mode.toUpperCase()}
      </span>

      {/* The command being assembled, one key at a time. */}
      <span className="min-w-[6ch] text-accent" aria-label="pending command">
        {pending}
      </span>

      {recording && (
        <span className="text-fail" aria-live="polite">
          recording @{recording}
        </span>
      )}

      <span className="ml-auto flex items-center gap-3 text-muted">
        <span>
          {keystrokes} {keystrokes === 1 ? "key" : "keys"}
          {par !== undefined && <span className="text-faint"> · par {par}</span>}
        </span>

        {dots && (
          <span className="flex items-center gap-1" aria-label={`exercise ${dots.index + 1} of ${dots.total}`}>
            {Array.from({ length: dots.total }, (_, i) => (
              <span
                key={i}
                className="inline-block h-[6px] w-[6px] rounded-full"
                style={{
                  background:
                    i < dots.done
                      ? "var(--color-pass)"
                      : i === dots.index
                        ? "var(--color-accent)"
                        : "var(--color-rule)",
                }}
              />
            ))}
          </span>
        )}
      </span>
    </div>
  );
}
