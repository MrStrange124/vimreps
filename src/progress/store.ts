"use client";

/**
 * Progress lives entirely in the browser: one versioned JSON blob in
 * localStorage, no accounts and no backend. Every read is guarded, because
 * localStorage throws rather than returning null in private browsing and on
 * some locked-down mobile browsers.
 *
 * An unrecognised version is discarded rather than migrated, so a schema change
 * can never leave a half-readable record behind.
 */

const KEY = "vim-dojo:progress:v1";

export type SkillRecord = { seen: number; failed: number };

export type Progress = {
  version: 1;
  lessons: Record<string, { completed: boolean; best: Record<string, number> }>;
  drills: { attempts: number; correct: number; perSkill: Record<string, SkillRecord> };
  golf: Record<string, number>;
  days: string[];
};

export function emptyProgress(): Progress {
  return {
    version: 1,
    lessons: {},
    drills: { attempts: 0, correct: 0, perSkill: {} },
    golf: {},
    days: [],
  };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Progress;
    if (parsed?.version !== 1) return emptyProgress();
    return { ...emptyProgress(), ...parsed };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
    window.dispatchEvent(new Event("vim-dojo:progress"));
  } catch {
    // Storage is full or blocked. Losing progress is better than losing the app.
  }
}

/** Local date, not UTC — a practice streak should follow the learner's midnight. */
export function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function touchDay(progress: Progress): Progress {
  const stamp = today();
  if (progress.days.includes(stamp)) return progress;
  return { ...progress, days: [...progress.days, stamp] };
}

export function recordExercise(
  lessonSlug: string,
  exerciseId: string,
  keystrokes: number,
): Progress {
  const progress = touchDay(loadProgress());
  const lesson = progress.lessons[lessonSlug] ?? { completed: false, best: {} };
  const previous = lesson.best[exerciseId];
  const next: Progress = {
    ...progress,
    lessons: {
      ...progress.lessons,
      [lessonSlug]: {
        ...lesson,
        best: {
          ...lesson.best,
          [exerciseId]: previous === undefined ? keystrokes : Math.min(previous, keystrokes),
        },
      },
    },
  };
  saveProgress(next);
  return next;
}

export function markLessonComplete(lessonSlug: string): Progress {
  const progress = touchDay(loadProgress());
  const lesson = progress.lessons[lessonSlug] ?? { completed: false, best: {} };
  const next: Progress = {
    ...progress,
    lessons: { ...progress.lessons, [lessonSlug]: { ...lesson, completed: true } },
  };
  saveProgress(next);
  return next;
}

export function recordDrill(skills: string[], passed: boolean): Progress {
  const progress = touchDay(loadProgress());
  const perSkill = { ...progress.drills.perSkill };
  for (const skill of skills) {
    const record = perSkill[skill] ?? { seen: 0, failed: 0 };
    perSkill[skill] = { seen: record.seen + 1, failed: record.failed + (passed ? 0 : 1) };
  }
  const next: Progress = {
    ...progress,
    drills: {
      attempts: progress.drills.attempts + 1,
      correct: progress.drills.correct + (passed ? 1 : 0),
      perSkill,
    },
  };
  saveProgress(next);
  return next;
}

export function recordGolf(slug: string, keystrokes: number): Progress {
  const progress = touchDay(loadProgress());
  const previous = progress.golf[slug];
  const next: Progress = {
    ...progress,
    golf: {
      ...progress.golf,
      [slug]: previous === undefined ? keystrokes : Math.min(previous, keystrokes),
    },
  };
  saveProgress(next);
  return next;
}

export function resetProgress(): Progress {
  const fresh = emptyProgress();
  saveProgress(fresh);
  return fresh;
}

/** Longest run of consecutive days ending today or yesterday. */
export function currentStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const set = new Set(days);
  const cursor = new Date();
  let streak = 0;

  for (let i = 0; i < 400; i++) {
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    const stamp = `${cursor.getFullYear()}-${month}-${day}`;
    if (set.has(stamp)) {
      streak += 1;
    } else if (i > 0 || !set.has(stamp)) {
      // A gap ends the streak, except that today not being practised yet is fine.
      if (i > 0) break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
