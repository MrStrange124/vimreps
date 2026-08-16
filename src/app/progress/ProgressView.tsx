"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LESSONS, TIERS } from "@/content/curriculum";
import { CHALLENGES } from "@/golf/challenges";
import {
  currentStreak,
  loadProgress,
  resetProgress,
  today,
  type Progress,
} from "@/progress/store";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded border border-rule bg-panel px-4 py-3">
      <div className="font-sans text-[1.625rem] leading-none font-semibold text-ink tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 text-[0.6875rem] tracking-[0.1em] text-faint uppercase">{label}</div>
    </div>
  );
}

/** The last 12 weeks, most recent column on the right. */
function heatmapDays(): string[] {
  const days: string[] = [];
  const cursor = new Date();
  for (let i = 0; i < 84; i++) {
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    days.push(`${cursor.getFullYear()}-${month}-${day}`);
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
}

export function ProgressView() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [days, setDays] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => setProgress(loadProgress());
    refresh();
    setDays(heatmapDays());
    window.addEventListener("vimreps:progress", refresh);
    return () => window.removeEventListener("vimreps:progress", refresh);
  }, []);

  if (!progress) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-9 text-[0.8125rem] text-muted">
        Reading your progress…
      </main>
    );
  }

  const completed = LESSONS.filter((lesson) => progress.lessons[lesson.slug]?.completed);
  const accuracy =
    progress.drills.attempts === 0
      ? null
      : Math.round((progress.drills.correct / progress.drills.attempts) * 100);
  const streak = currentStreak(progress.days);
  const practised = new Set(progress.days);

  const weakest = Object.entries(progress.drills.perSkill)
    .filter(([, record]) => record.seen >= 3)
    .map(([skill, record]) => ({ skill, rate: (record.seen - record.failed) / record.seen }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 5);

  const golfPlayed = CHALLENGES.filter(
    (challenge) => progress.golf[challenge.slug] !== undefined,
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-9">
      <h1 className="font-sans text-[1.75rem] font-semibold text-white">Progress</h1>
      <p className="prose mt-2 mb-6">
        Kept in this browser only. Clearing your site data clears this.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={`${completed.length}/${LESSONS.length}`} label="lessons" />
        <Stat value={accuracy === null ? "—" : `${accuracy}%`} label="drill accuracy" />
        <Stat value={`${golfPlayed.length}/${CHALLENGES.length}`} label="golf holes" />
        <Stat value={streak === 0 ? "—" : `${streak}d`} label="streak" />
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-[0.65625rem] font-semibold tracking-[0.16em] text-faint uppercase">
          Last twelve weeks
        </h2>
        <div className="flex flex-wrap gap-[0.1875rem] rounded border border-rule bg-panel p-3">
          {days.map((day) => (
            <span
              key={day}
              title={day}
              className="h-[0.6875rem] w-[0.6875rem] rounded-[0.125rem]"
              style={{
                background: practised.has(day)
                  ? "var(--color-accent)"
                  : "var(--color-raised)",
                outline: day === today() ? "1px solid var(--color-muted)" : undefined,
              }}
            />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-[0.65625rem] font-semibold tracking-[0.16em] text-faint uppercase">
          Course
        </h2>
        <div className="space-y-2">
          {TIERS.map((tier) => {
            const done = tier.lessons.filter(
              (lesson) => progress.lessons[lesson.slug]?.completed,
            ).length;
            const pct = Math.round((done / tier.lessons.length) * 100);
            return (
              <div key={tier.id} className="rounded border border-rule bg-panel px-3 py-2">
                <div className="flex items-baseline gap-3 text-[0.8125rem]">
                  <span className="text-ink">{tier.title}</span>
                  <span className="ml-auto text-[0.75rem] text-faint tabular-nums">
                    {done}/{tier.lessons.length}
                  </span>
                </div>
                <div className="mt-1.5 h-[0.1875rem] overflow-hidden rounded bg-raised">
                  <div
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      background: pct === 100 ? "var(--color-pass)" : "var(--color-accent)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {weakest.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-[0.65625rem] font-semibold tracking-[0.16em] text-faint uppercase">
            Worth drilling
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {weakest.map((entry) => (
              <span key={entry.skill} className="keycap">
                {entry.skill}
                <span className="pl-1.5 text-warn">{Math.round(entry.rate * 100)}%</span>
              </span>
            ))}
          </div>
          <Link href="/practice" className="mt-3 inline-block text-[0.78125rem] text-accent underline">
            Drill these →
          </Link>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          if (window.confirm("Clear all progress? This cannot be undone.")) {
            setProgress(resetProgress());
          }
        }}
        className="rounded border border-rule px-3 py-1.5 text-[0.75rem] text-muted hover:border-fail hover:text-fail"
      >
        Clear progress
      </button>
    </main>
  );
}
