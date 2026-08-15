"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TIERS } from "@/content/curriculum";
import { loadProgress, type Progress } from "@/progress/store";

/**
 * The curriculum as a file tree. Completion is read from localStorage on the
 * client only — rendering it on the server would produce a hydration mismatch
 * the moment a returning learner loads the page.
 */
export function Sidebar({ activeSlug }: { activeSlug?: string }) {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    const refresh = () => setProgress(loadProgress());
    refresh();
    window.addEventListener("vim-dojo:progress", refresh);
    return () => window.removeEventListener("vim-dojo:progress", refresh);
  }, []);

  return (
    <nav
      className="scroll-thin h-full overflow-y-auto border-r border-rule bg-panel py-3 text-[12.5px]"
      aria-label="Lessons"
    >
      {TIERS.map((tier) => (
        <div key={tier.id} className="mb-4">
          <div className="px-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.16em] text-faint uppercase">
            {tier.title}
          </div>

          {tier.lessons.map((lesson) => {
            const done = progress?.lessons[lesson.slug]?.completed ?? false;
            const active = lesson.slug === activeSlug;
            return (
              <Link
                key={lesson.slug}
                href={`/lessons/${lesson.slug}`}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 px-3 py-[3px] ${
                  active ? "bg-raised text-ink" : "text-muted hover:bg-raised hover:text-ink"
                }`}
                style={
                  active ? { boxShadow: "inset 2px 0 0 var(--color-accent)" } : undefined
                }
              >
                <span
                  aria-hidden
                  className="w-[9px] shrink-0 text-[10px]"
                  style={{ color: done ? "var(--color-pass)" : "var(--color-faint)" }}
                >
                  {done ? "●" : "○"}
                </span>
                <span className="truncate">{lesson.title}</span>
                <span className="ml-auto shrink-0 pl-2 text-[11px] text-faint">
                  {lesson.keys}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
