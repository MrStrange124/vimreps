import type { Lesson, Tier } from "./types";
import { foundations } from "./tiers/foundations";
import { motions } from "./tiers/motions";
import { operators } from "./tiers/operators";
import { search } from "./tiers/search";
import { textobjects } from "./tiers/textobjects";
import { visual } from "./tiers/visual";
import { power } from "./tiers/power";

/**
 * The single source of truth for the course.
 *
 * The sidebar, the routes, prerequisites, the cheatsheet, and the progress
 * dashboard all read from this one list. Nothing else keeps its own copy, so
 * they cannot drift apart.
 */
export const TIERS: Tier[] = [foundations, motions, operators, search, textobjects, visual, power];

export const LESSONS: Lesson[] = TIERS.flatMap((tier) => tier.lessons);

export function lessonBySlug(slug: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.slug === slug);
}

export function tierOf(slug: string): Tier | undefined {
  return TIERS.find((tier) => tier.lessons.some((lesson) => lesson.slug === slug));
}

export function lessonIndex(slug: string): number {
  return LESSONS.findIndex((lesson) => lesson.slug === slug);
}

export function neighbours(slug: string): { prev?: Lesson; next?: Lesson } {
  const i = lessonIndex(slug);
  if (i === -1) return {};
  return { prev: LESSONS[i - 1], next: LESSONS[i + 1] };
}

export const ALL_EXERCISES = LESSONS.flatMap((lesson) =>
  lesson.exercises.map((exercise) => ({ lesson, exercise })),
);
