"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { Exercise } from "@/exercise/types";
import { lessonBySlug, neighbours, tierOf } from "@/content/curriculum";
import { Markdown } from "@/components/Markdown";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { markLessonComplete, recordExercise } from "@/progress/store";

export function LessonView({ slug }: { slug: string }) {
  const [complete, setComplete] = useState(false);
  const lesson = lessonBySlug(slug)!;
  const tierTitle = tierOf(slug)?.title ?? "";
  const { prev, next } = neighbours(slug);

  const onSolved = useCallback(
    (exercise: Exercise, keystrokes: number) => {
      recordExercise(lesson.slug, exercise.id, keystrokes);
    },
    [lesson.slug],
  );

  const onFinished = useCallback(() => {
    markLessonComplete(lesson.slug);
    setComplete(true);
  }, [lesson.slug]);

  return (
    <div className="flex h-screen flex-col">
      <TopBar active="lessons" />

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(200px,240px)_1fr]">
        <div className="hidden min-h-0 md:block">
          <Sidebar activeSlug={lesson.slug} />
        </div>

        <main className="scroll-thin min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-5 py-7">
            <div className="mb-1 text-[10.5px] font-semibold tracking-[0.16em] text-faint uppercase">
              {tierTitle}
            </div>

            <div className="mb-5 flex flex-wrap items-baseline gap-3">
              <h1 className="font-sans text-[26px] leading-tight font-semibold text-white">
                {lesson.title}
              </h1>
              <span className="keycap">{lesson.keys}</span>
            </div>

            <Markdown source={lesson.prose} />

            <div className="my-7">
              <ExerciseRunner
                exercises={lesson.exercises}
                onSolved={onSolved}
                onFinished={onFinished}
                label="exercise"
              />
            </div>

            {complete && (
              <div className="mb-6 rounded border border-pass/40 bg-raised px-4 py-3 text-[13px]">
                <span className="text-pass">Lesson complete.</span>{" "}
                {next ? (
                  <>
                    Next up:{" "}
                    <Link href={`/lessons/${next.slug}`} className="text-accent underline">
                      {next.title}
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    That is the whole course. Keep the keys warm in{" "}
                    <Link href="/practice" className="text-accent underline">
                      practice
                    </Link>
                    .
                  </>
                )}
              </div>
            )}

            <section className="mb-8">
              <h2 className="mb-2 text-[10.5px] font-semibold tracking-[0.16em] text-faint uppercase">
                Commands in this lesson
              </h2>
              <dl className="divide-y divide-rule rounded border border-rule">
                {lesson.commands.map((command) => (
                  <div key={command.keys} className="flex gap-4 px-3 py-2 text-[13px]">
                    <dt className="w-32 shrink-0 text-accent">{command.keys}</dt>
                    <dd className="text-muted">{command.what}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <nav className="flex items-center justify-between border-t border-rule pt-4 text-[12.5px]">
              {prev ? (
                <Link href={`/lessons/${prev.slug}`} className="text-muted hover:text-ink">
                  ← {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link href={`/lessons/${next.slug}`} className="text-muted hover:text-ink">
                  {next.title} →
                </Link>
              )}
            </nav>
          </div>
        </main>
      </div>
    </div>
  );
}
