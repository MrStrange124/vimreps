"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/exercise/types";
import { applyKey, startAttempt } from "@/exercise/grader";
import { tokenFromEvent } from "@/engine/keys";
import { Editor } from "./Editor";
import { StatusBar } from "./StatusBar";

type Props = {
  exercises: Exercise[];
  /** Called when an exercise is solved, with the keystrokes it took. */
  onSolved?: (exercise: Exercise, keystrokes: number) => void;
  /** Called once every exercise in the set is solved. */
  onFinished?: () => void;
  label?: string;
};

export function ExerciseRunner({ exercises, onSolved, onFinished, label }: Props) {
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const exercise = exercises[index];

  const [attempt, setAttempt] = useState(() => startAttempt(exercise));
  const surface = useRef<HTMLDivElement>(null);

  // Starting a different exercise means a fresh attempt, not a mutated one.
  useEffect(() => {
    setAttempt(startAttempt(exercises[index]));
    setShowHint(false);
  }, [index, exercises]);

  const reset = useCallback(() => {
    setAttempt(startAttempt(exercises[index]));
  }, [exercises, index]);

  const advance = useCallback(() => {
    if (index + 1 < exercises.length) {
      setIndex(index + 1);
    } else {
      onFinished?.();
    }
  }, [index, exercises.length, onFinished]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Let the browser keep its own shortcuts and tab navigation.
      if (event.metaKey || event.ctrlKey === false && event.key === "Tab") return;

      const token = tokenFromEvent(event.nativeEvent);
      if (token === null) return;
      event.preventDefault();

      if (attempt.status === "passed") {
        if (token === "<CR>") advance();
        return;
      }
      if (attempt.status === "failed") {
        if (token === "<CR>") reset();
        return;
      }

      const next = applyKey(attempt, token);
      setAttempt(next);

      if (next.status === "passed") {
        setSolved((previous) => new Set(previous).add(next.exercise.id));
        onSolved?.(next.exercise, next.keys.length);
      }
    },
    [attempt, advance, reset, onSolved],
  );

  const doneCount = useMemo(
    () => exercises.filter((item) => solved.has(item.id)).length,
    [exercises, solved],
  );

  const tone =
    attempt.status === "passed"
      ? "text-pass"
      : attempt.status === "failed"
        ? "text-fail"
        : "text-warn";

  return (
    <section className="overflow-hidden rounded-lg border border-rule bg-panel">
      <header className="flex items-center gap-3 border-b border-rule px-3 py-2 text-[12px] text-muted">
        <span className="text-faint">{label ?? "exercise"}</span>
        <span className="text-ink">
          {index + 1}/{exercises.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {exercise.hint && (
            <button
              type="button"
              onClick={() => setShowHint((value) => !value)}
              className="rounded border border-rule px-2 py-0.5 text-[11px] text-muted hover:text-ink"
            >
              {showHint ? "hide hint" : "hint"}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="rounded border border-rule px-2 py-0.5 text-[11px] text-muted hover:text-ink"
          >
            reset
          </button>
        </div>
      </header>

      <p className="px-4 pt-3 pb-2 text-[13.5px] text-ink">{exercise.prompt}</p>

      {showHint && exercise.hint && (
        <p className="mx-4 mb-2 rounded border border-rule bg-raised px-3 py-2 text-[12.5px] text-muted">
          {exercise.hint}
        </p>
      )}

      <div
        ref={surface}
        tabIndex={0}
        role="application"
        aria-label="Vim practice buffer. Click to focus, then type Vim commands."
        onKeyDown={onKeyDown}
        className="cursor-text bg-ground px-3 py-3 outline-none focus:ring-1 focus:ring-accent-dim"
      >
        <Editor
          state={attempt.editor}
          minRows={Math.max(4, exercise.buffer.length + 1)}
          inert={attempt.status !== "in-progress"}
        />
      </div>

      <StatusBar
        state={attempt.editor}
        keystrokes={attempt.keys.length}
        par={exercise.par}
        dots={{ total: exercises.length, index, done: doneCount }}
      />

      <footer className="flex min-h-[42px] items-center gap-3 px-4 py-2 text-[12.5px]">
        {attempt.message ? (
          <span className={tone}>{attempt.message}</span>
        ) : (
          <span className="text-faint">
            Click the buffer and type. Everything you have learned works here.
          </span>
        )}

        {attempt.status === "passed" && (
          <button
            type="button"
            onClick={advance}
            className="ml-auto rounded bg-accent px-3 py-1 text-[12px] font-semibold text-ground hover:brightness-110"
          >
            {index + 1 < exercises.length ? "Next exercise ⏎" : "Finish ⏎"}
          </button>
        )}
        {attempt.status === "failed" && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto rounded border border-rule px-3 py-1 text-[12px] text-ink hover:bg-raised"
          >
            Try again ⏎
          </button>
        )}
      </footer>
    </section>
  );
}
