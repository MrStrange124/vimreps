import { describe, expect, it } from "vitest";
import { ALL_EXERCISES, LESSONS, TIERS } from "./curriculum";
import { replay } from "@/exercise/grader";
import { describeGoal } from "@/exercise/grader";
import { parseKeys } from "@/engine/keys";

/**
 * The test that keeps the course honest.
 *
 * Every exercise ships a reference solution. Here it is replayed through the
 * real engine and asserted to pass its own grader. No unsolvable exercise can
 * reach a learner, and an engine regression shows up as a named broken lesson
 * rather than as silence.
 */

describe("every exercise is solvable by its own reference solution", () => {
  for (const { lesson, exercise } of ALL_EXERCISES) {
    it(`${lesson.slug} / ${exercise.id}`, () => {
      const attempt = replay(exercise, exercise.solution);
      expect(
        attempt.status,
        `"${exercise.prompt}" — solution ${JSON.stringify(exercise.solution)} ` +
          `left the buffer as ${JSON.stringify(attempt.editor.lines)} ` +
          `in ${attempt.editor.mode} mode; the goal wants ${describeGoal(exercise.goal)}. ` +
          `Grader said: ${attempt.message ?? "still in progress"}`,
      ).toBe("passed");
    });
  }
});

describe("exercise definitions are coherent", () => {
  it("has no duplicate exercise ids", () => {
    const ids = ALL_EXERCISES.map(({ exercise }) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate lesson slugs", () => {
    const slugs = LESSONS.map((lesson) => lesson.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("states a par that the reference solution can actually meet", () => {
    for (const { lesson, exercise } of ALL_EXERCISES) {
      if (exercise.par === undefined) continue;
      const used = parseKeys(exercise.solution).length;
      expect(
        used,
        `${lesson.slug}/${exercise.id}: solution takes ${used} keys but par is ${exercise.par}`,
      ).toBeLessThanOrEqual(exercise.par);
    }
  });

  it("never sets a keystroke budget the reference solution would blow", () => {
    for (const { lesson, exercise } of ALL_EXERCISES) {
      const max = exercise.constraints?.maxKeystrokes;
      if (max === undefined) continue;
      const used = parseKeys(exercise.solution).length;
      expect(
        used,
        `${lesson.slug}/${exercise.id}: solution takes ${used} keys, budget is ${max}`,
      ).toBeLessThanOrEqual(max);
    }
  });

  it("gives every lesson at least one exercise and one documented command", () => {
    for (const lesson of LESSONS) {
      expect(lesson.exercises.length, `${lesson.slug} has no exercises`).toBeGreaterThan(0);
      expect(lesson.commands.length, `${lesson.slug} documents no commands`).toBeGreaterThan(0);
    }
  });

  it("keeps every lesson inside a tier", () => {
    const inTiers = TIERS.flatMap((tier) => tier.lessons).length;
    expect(inTiers).toBe(LESSONS.length);
  });
});
