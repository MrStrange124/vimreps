"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GENERATORS, chooseGenerator, makeRng } from "@/drills/generate";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { loadProgress, recordDrill, type Progress } from "@/progress/store";

/**
 * Lessons teach a command once; drills are what put it in your hands. The
 * scheduler leans toward whatever you keep getting wrong, so practice drifts
 * toward your weak spots on its own.
 */
export function PracticeView() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [round, setRound] = useState(0);
  const [seed, setSeed] = useState<number | null>(null);
  const [session, setSession] = useState({ done: 0, solved: 0 });

  // The first seed is chosen on the client so the server and client markup match.
  useEffect(() => {
    setProgress(loadProgress());
    setSeed(Math.floor(Math.random() * 2 ** 31));
  }, []);

  const current = useMemo(() => {
    if (seed === null) return null;
    const rng = makeRng(seed);
    const generator = chooseGenerator(rng, progress?.drills.perSkill ?? {});
    return { generator, exercise: generator.make(rng) };
  }, [seed, progress, round]);

  const onSolved = useCallback(() => {
    if (!current) return;
    setProgress(recordDrill([current.generator.skill], true));
    setSession((s) => ({ done: s.done + 1, solved: s.solved + 1 }));
  }, [current]);

  const nextDrill = useCallback(() => {
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setRound((r) => r + 1);
  }, []);

  const skip = useCallback(() => {
    if (current) setProgress(recordDrill([current.generator.skill], false));
    setSession((s) => ({ ...s, done: s.done + 1 }));
    nextDrill();
  }, [current, nextDrill]);

  const accuracy =
    session.done === 0 ? null : Math.round((session.solved / session.done) * 100);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-9">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-sans text-[28px] font-semibold text-white">Practice</h1>
          <p className="mt-1 text-[13px] text-muted">
            {current ? current.generator.label : "loading"} · drills keep coming until you
            stop
          </p>
        </div>
        <div className="text-right text-[12.5px] text-muted">
          <div>
            {session.solved} solved
            {accuracy !== null && <span className="text-faint"> · {accuracy}% this session</span>}
          </div>
          <button
            type="button"
            onClick={skip}
            className="mt-1 rounded border border-rule px-2 py-0.5 text-[11px] text-muted hover:text-ink"
          >
            skip this one
          </button>
        </div>
      </div>

      {current ? (
        <ExerciseRunner
          key={`${seed}-${round}`}
          exercises={[current.exercise]}
          onSolved={onSolved}
          onFinished={nextDrill}
          label={current.generator.skill}
        />
      ) : (
        <div className="rounded border border-rule bg-panel p-6 text-[13px] text-muted">
          Shuffling a drill…
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-[10.5px] font-semibold tracking-[0.16em] text-faint uppercase">
          What gets drilled
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set(GENERATORS.map((generator) => generator.skill))].map((skill) => {
            const record = progress?.drills.perSkill[skill];
            const rate =
              record && record.seen > 0
                ? Math.round(((record.seen - record.failed) / record.seen) * 100)
                : null;
            return (
              <span key={skill} className="keycap">
                {skill}
                {rate !== null && (
                  <span
                    className="pl-1.5"
                    style={{
                      color: rate >= 80 ? "var(--color-pass)" : "var(--color-warn)",
                    }}
                  >
                    {rate}%
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-faint">
          Skills you miss come round more often.
        </p>
      </section>
    </main>
  );
}
