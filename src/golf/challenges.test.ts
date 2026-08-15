import { describe, expect, it } from "vitest";
import { CHALLENGES } from "./challenges";
import { describeGoal, replay } from "@/exercise/grader";
import { parseKeys } from "@/engine/keys";

describe("every golf hole is reachable", () => {
  for (const challenge of CHALLENGES) {
    it(challenge.slug, () => {
      const attempt = replay(challenge, challenge.solution);
      expect(
        attempt.status,
        `${challenge.slug}: solution ${JSON.stringify(challenge.solution)} left ` +
          `${JSON.stringify(attempt.editor.lines)}; goal wants ${describeGoal(challenge.goal)}. ` +
          `Grader said: ${attempt.message ?? "still in progress"}`,
      ).toBe("passed");
    });
  }
});

describe("par is honest", () => {
  it("is meetable by the published solution", () => {
    for (const challenge of CHALLENGES) {
      const used = parseKeys(challenge.solution).length;
      expect(
        used,
        `${challenge.slug}: solution takes ${used} keys but par is ${challenge.par}`,
      ).toBeLessThanOrEqual(challenge.par!);
    }
  });

  it("has unique slugs", () => {
    const slugs = CHALLENGES.map((challenge) => challenge.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
