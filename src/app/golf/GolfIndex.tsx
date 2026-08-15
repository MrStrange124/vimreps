"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHALLENGES } from "@/golf/challenges";
import { loadProgress, type Progress } from "@/progress/store";

export function GolfIndex() {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    const refresh = () => setProgress(loadProgress());
    refresh();
    window.addEventListener("vim-dojo:progress", refresh);
    return () => window.removeEventListener("vim-dojo:progress", refresh);
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-9">
      <h1 className="font-sans text-[28px] font-semibold text-white">Golf</h1>
      <p className="prose mt-2 mb-7">
        A starting buffer and a target. Get from one to the other in as few keystrokes as
        you can — any route counts, so this is where the commands you have learned start
        competing with each other.
      </p>

      <ol className="space-y-2">
        {CHALLENGES.map((challenge) => {
          const best = progress?.golf[challenge.slug];
          const underPar = best !== undefined && best <= (challenge.par ?? Infinity);
          return (
            <li key={challenge.slug}>
              <Link
                href={`/golf/${challenge.slug}`}
                className="flex items-center gap-4 rounded border border-rule bg-panel px-4 py-3 hover:border-accent-dim"
              >
                <div className="min-w-0">
                  <div className="font-sans text-[15px] font-semibold text-ink">
                    {challenge.title}
                  </div>
                  <div className="truncate text-[12.5px] text-muted">{challenge.blurb}</div>
                </div>

                <div className="ml-auto shrink-0 text-right text-[12px]">
                  <div className="text-faint">par {challenge.par}</div>
                  {best !== undefined ? (
                    <div style={{ color: underPar ? "var(--color-pass)" : "var(--color-warn)" }}>
                      best {best}
                    </div>
                  ) : (
                    <div className="text-faint">unplayed</div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
