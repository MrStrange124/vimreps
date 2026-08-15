"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TIERS } from "@/content/curriculum";

/**
 * Built from the lessons themselves rather than kept as its own list, so the
 * cheatsheet cannot document a command the course does not teach — or quietly
 * miss one it does.
 */
const ROWS = TIERS.flatMap((tier) =>
  tier.lessons.flatMap((lesson) =>
    lesson.commands.map((command) => ({
      ...command,
      tier: tier.title,
      lessonTitle: lesson.title,
      lessonSlug: lesson.slug,
    })),
  ),
);

export function CheatsheetView() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? ROWS.filter(
          (row) =>
            row.keys.toLowerCase().includes(needle) ||
            row.what.toLowerCase().includes(needle) ||
            row.lessonTitle.toLowerCase().includes(needle),
        )
      : ROWS;

    const byTier = new Map<string, typeof ROWS>();
    for (const row of matched) {
      const list = byTier.get(row.tier) ?? [];
      list.push(row);
      byTier.set(row.tier, list);
    }
    return [...byTier.entries()];
  }, [query]);

  const total = groups.reduce((sum, [, rows]) => sum + rows.length, 0);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-9">
      <h1 className="font-sans text-[28px] font-semibold text-white">Cheatsheet</h1>
      <p className="prose mt-2 mb-6">
        Every command the course teaches, in the order it teaches them. Each row links
        back to the lesson it comes from.
      </p>

      <label className="mb-6 block">
        <span className="sr-only">Filter commands</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter — try 'delete', 'word', or 'ci'"
          className="w-full rounded border border-rule bg-panel px-3 py-2 text-[13px] text-ink placeholder:text-faint focus:border-accent-dim focus:outline-none"
        />
      </label>

      {total === 0 && (
        <p className="text-[13px] text-muted">
          Nothing matches “{query}”. Try a shorter search.
        </p>
      )}

      {groups.map(([tier, rows]) => (
        <section key={tier} className="mb-7">
          <h2 className="mb-2 text-[10.5px] font-semibold tracking-[0.16em] text-faint uppercase">
            {tier}
          </h2>
          <div className="divide-y divide-rule rounded border border-rule">
            {rows.map((row, index) => (
              <div
                key={`${row.lessonSlug}-${row.keys}-${index}`}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-2 text-[13px]"
              >
                <span className="w-36 shrink-0 text-accent">{row.keys}</span>
                <span className="min-w-[16ch] flex-1 text-muted">{row.what}</span>
                <Link
                  href={`/lessons/${row.lessonSlug}`}
                  className="text-[11.5px] text-faint hover:text-ink"
                >
                  {row.lessonTitle}
                </Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
