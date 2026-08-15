import type { EditorState, KeyToken } from "@/engine/types";
import type { Mode } from "@/engine/types";
import { createState } from "@/engine/state";
import { step } from "@/engine/interpreter";
import { formatKeys, parseKeys } from "@/engine/keys";
import type { Attempt, Exercise, Goal } from "./types";

export function goalMet(state: EditorState, goal: Goal): boolean {
  switch (goal.kind) {
    case "buffer":
      return (
        state.lines.length === goal.lines.length &&
        state.lines.every((line, i) => line === goal.lines[i])
      );
    case "cursor":
      return state.cursor.line === goal.at.line && state.cursor.col === goal.at.col;
    case "register": {
      const stored = state.registers[goal.name.toLowerCase()];
      return stored !== undefined && stored.text.replace(/\n$/, "") === goal.text.replace(/\n$/, "");
    }
    case "mode":
      return state.mode === goal.mode;
    case "predicate":
      return goal.test(state);
    case "all":
      return goal.goals.every((inner) => goalMet(state, inner));
  }
}

/** A human-readable statement of what the exercise is asking for. */
export function describeGoal(goal: Goal): string {
  switch (goal.kind) {
    case "buffer":
      return "the text should read as shown";
    case "cursor":
      return `the cursor should sit at line ${goal.at.line + 1}, column ${goal.at.col + 1}`;
    case "register":
      return `register ${goal.name} should hold "${goal.text.replace(/\n$/, "")}"`;
    case "mode":
      return `you should end in ${goal.mode} mode`;
    case "predicate":
      return goal.describe;
    case "all":
      return goal.goals.map(describeGoal).join(", and ");
  }
}

/** Modes named anywhere in a goal, so a goal about insert mode can be judged in it. */
function modesMentioned(goal: Goal, found: Set<string> = new Set()): Set<string> {
  if (goal.kind === "mode") found.add(goal.mode);
  if (goal.kind === "all") goal.goals.forEach((inner) => modesMentioned(inner, found));
  return found;
}

/**
 * An edit is not finished until you are back in normal mode — pressing `A;`
 * makes the text correct one keystroke before `<Esc>` makes it *done*. Judging
 * mid-insert would pass the exercise early and reward leaving insert mode open,
 * which is the opposite of the habit being taught.
 *
 * The exception is a goal that talks about a mode: "enter insert mode" has to be
 * judgeable while in it.
 */
function settled(state: EditorState, goal: Goal): boolean {
  if (state.mode === "normal") return true;
  if (state.mode.startsWith("visual")) return true;
  return modesMentioned(goal).has(state.mode);
}

export function startAttempt(exercise: Exercise): Attempt {
  return {
    exercise,
    editor: createState(exercise.buffer, exercise.cursor ?? { line: 0, col: 0 }),
    keys: [],
    status: "in-progress",
    message: null,
  };
}

export function resetAttempt(attempt: Attempt): Attempt {
  return startAttempt(attempt.exercise);
}

const DEFAULT_REQUIRED_MESSAGE =
  "That got the right text, but not the way this lesson is teaching. Undo and try the command in the prompt.";

export function applyKey(attempt: Attempt, key: KeyToken): Attempt {
  if (attempt.status !== "in-progress") return attempt;

  const constraints = attempt.exercise.constraints ?? {};

  if (constraints.forbiddenKeys?.includes(key)) {
    return {
      ...attempt,
      status: "failed",
      message: `${key} is off-limits here — that is the habit this lesson is trying to replace.`,
    };
  }

  const editor = step(attempt.editor, key).state;
  const keys = [...attempt.keys, key];

  if (constraints.maxKeystrokes !== undefined && keys.length > constraints.maxKeystrokes) {
    return {
      ...attempt,
      editor,
      keys,
      status: "failed",
      message: `Over budget — this one is doable in ${constraints.maxKeystrokes} keystrokes.`,
    };
  }

  const next: Attempt = { ...attempt, editor, keys, status: "in-progress", message: null };
  if (!goalMet(editor, attempt.exercise.goal)) return next;
  if (!settled(editor, attempt.exercise.goal)) return next;

  // The text is right. Was the route right too?
  //
  // A mismatch here is a nudge, not a failure. Some goals are satisfied by an
  // early prefix of the intended solution — after `x` the text may already be
  // correct on the way to `xu<C-r>` — so failing on the spot would make correct
  // work impossible. The keystroke budget is what actually rules out brute force.
  if (constraints.requiredKeys && !constraints.requiredKeys.test(formatKeys(keys))) {
    return {
      ...next,
      message: constraints.requiredKeysMessage ?? DEFAULT_REQUIRED_MESSAGE,
    };
  }

  return { ...next, status: "passed", message: passMessage(keys.length, attempt.exercise.par) };
}

function passMessage(used: number, par: number | undefined): string {
  if (par === undefined) return `Solved in ${used} keystrokes.`;
  if (used < par) return `Solved in ${used} — under par of ${par}.`;
  if (used === par) return `Solved in ${used}, exactly par.`;
  return `Solved in ${used}. Par is ${par} — there is a shorter route.`;
}

/** Replay a written key sequence, as the conformance tests and hints do. */
export function replay(exercise: Exercise, keys: string): Attempt {
  return parseKeys(keys).reduce(applyKey, startAttempt(exercise));
}
