import type { EditorState, KeyToken, Mode, Position } from "@/engine/types";

/**
 * The grading model, stated once:
 *
 *   the **goal** is a predicate over the final state;
 *   the **constraint** is a regex over how you got there.
 *
 * That split is what separates a teacher from a puzzle. "Delete this word"
 * carries `requiredKeys: /^\d*dw$/`, so mashing `x` five times produces exactly
 * the right text and still does not pass — with a message saying why.
 */

export type Goal =
  | { kind: "buffer"; lines: string[] }
  | { kind: "cursor"; at: Position }
  | { kind: "register"; name: string; text: string }
  | { kind: "mode"; mode: Mode }
  | { kind: "predicate"; describe: string; test: (state: EditorState) => boolean }
  | { kind: "all"; goals: Goal[] };

export type Constraints = {
  /** Must match the whole recorded key sequence for the attempt to pass. */
  requiredKeys?: RegExp;
  /** Pressing any of these fails the attempt immediately. */
  forbiddenKeys?: KeyToken[];
  /** Exceeding this fails the attempt. */
  maxKeystrokes?: number;
  /** Why the required keys matter, shown when the buffer is right but the route was not. */
  requiredKeysMessage?: string;
};

export type Exercise = {
  id: string;
  prompt: string;
  buffer: string[];
  cursor?: Position;
  goal: Goal;
  constraints?: Constraints;
  /** Keystrokes an expert would use. Shown after a pass, and verified by tests. */
  par?: number;
  /**
   * A reference solution in macro notation. Every exercise has one, and a test
   * replays it through the engine — so no unsolvable exercise can ship.
   */
  solution: string;
  hint?: string;
};

export type AttemptStatus = "in-progress" | "passed" | "failed";

export type Attempt = {
  exercise: Exercise;
  editor: EditorState;
  keys: KeyToken[];
  status: AttemptStatus;
  /** Explanation shown on a failure, or the congratulation on a pass. */
  message: string | null;
};
