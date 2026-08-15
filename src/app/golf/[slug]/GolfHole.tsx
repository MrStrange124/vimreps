"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CHALLENGES, challengeBySlug } from "@/golf/challenges";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { recordGolf } from "@/progress/store";

export function GolfHole({ slug }: { slug: string }) {
  const challenge = challengeBySlug(slug)!;
  const index = CHALLENGES.findIndex((item) => item.slug === slug);
  const next = CHALLENGES[index + 1];
  const [score, setScore] = useState<number | null>(null);

  const onSolved = useCallback(
    (_: unknown, keystrokes: number) => {
      recordGolf(slug, keystrokes);
      setScore(keystrokes);
    },
    [slug],
  );

  const target = challenge.goal.kind === "buffer" ? challenge.goal.lines : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-9">
      <Link href="/golf" className="text-[0.75rem] text-faint hover:text-ink">
        ← all holes
      </Link>

      <div className="mt-3 mb-1 flex flex-wrap items-baseline gap-3">
        <h1 className="font-sans text-[1.625rem] font-semibold text-white">{challenge.title}</h1>
        <span className="keycap">par {challenge.par}</span>
      </div>
      <p className="prose mb-6">{challenge.blurb}</p>

      {target && (
        <section className="mb-6">
          <h2 className="mb-2 text-[0.65625rem] font-semibold tracking-[0.16em] text-faint uppercase">
            Target
          </h2>
          <pre className="overflow-x-auto rounded border border-rule bg-panel px-3 py-2 text-[0.84375rem] leading-relaxed text-muted">
            {target.join("\n") || "(empty)"}
          </pre>
        </section>
      )}

      <ExerciseRunner
        exercises={[challenge]}
        onSolved={onSolved}
        label="hole"
        onFinished={() => {}}
      />

      {score !== null && (
        <div className="mt-5 rounded border border-rule bg-panel px-4 py-3 text-[0.8125rem]">
          <span
            style={{
              color:
                score <= (challenge.par ?? Infinity)
                  ? "var(--color-pass)"
                  : "var(--color-warn)",
            }}
          >
            {score} keystrokes
            {score < (challenge.par ?? Infinity)
              ? " — under par."
              : score === challenge.par
                ? " — exactly par."
                : ` — par is ${challenge.par}.`}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.75rem] text-faint">
            <span>worth knowing here:</span>
            {challenge.teaches.map((keys) => (
              <span key={keys} className="keycap">
                {keys}
              </span>
            ))}
          </div>
          {next && (
            <Link
              href={`/golf/${next.slug}`}
              className="mt-3 inline-block text-[0.78125rem] text-accent underline"
            >
              Next hole: {next.title} →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
