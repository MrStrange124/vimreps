import { describe, expect, it } from "vitest";
import { GENERATORS, makeRng } from "./generate";
import { replay } from "@/exercise/grader";
import { describeGoal } from "@/exercise/grader";
import { parseKeys } from "@/engine/keys";

/**
 * The same guarantee the lessons get, extended to generated content: for every
 * generator, across many seeds, the exercise it produces must be solvable by the
 * solution it ships. A generator that can emit an impossible drill fails here
 * rather than in front of a learner.
 */

const SEEDS = 250;

describe("generated drills are always solvable", () => {
  for (const generator of GENERATORS) {
    it(`${generator.skill} / ${generator.label}`, () => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const exercise = generator.make(makeRng(seed));
        const attempt = replay(exercise, exercise.solution);
        expect(
          attempt.status,
          `seed ${seed}: "${exercise.prompt}" with solution ${JSON.stringify(exercise.solution)} ` +
            `left ${JSON.stringify(attempt.editor.lines)} at ` +
            `${JSON.stringify(attempt.editor.cursor)}; goal wants ${describeGoal(exercise.goal)}. ` +
            `Grader said: ${attempt.message ?? "still in progress"}`,
        ).toBe("passed");
      }
    });
  }
});

describe("generated drills state honest budgets", () => {
  for (const generator of GENERATORS) {
    it(`${generator.skill} / ${generator.label}`, () => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const exercise = generator.make(makeRng(seed));
        const used = parseKeys(exercise.solution).length;
        const max = exercise.constraints?.maxKeystrokes;
        if (max !== undefined) {
          expect(used, `seed ${seed}: ${used} keys against a budget of ${max}`).toBeLessThanOrEqual(max);
        }
        if (exercise.par !== undefined) {
          expect(used, `seed ${seed}: ${used} keys against par ${exercise.par}`).toBeLessThanOrEqual(
            exercise.par,
          );
        }
      }
    });
  }
});

describe("a seed reproduces the same drill", () => {
  it("is deterministic", () => {
    for (const generator of GENERATORS) {
      const first = generator.make(makeRng(42));
      const second = generator.make(makeRng(42));
      expect(second).toEqual(first);
    }
  });
});
