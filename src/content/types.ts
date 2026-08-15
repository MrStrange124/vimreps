import type { Exercise } from "@/exercise/types";

/** One command as it appears in the generated cheatsheet. */
export type CommandDoc = {
  keys: string;
  what: string;
};

export type Lesson = {
  slug: string;
  title: string;
  /** The keys this lesson is about, shown beside its name in the sidebar. */
  keys: string;
  /** One line, shown under the title and on the tier overview. */
  summary: string;
  /** Markdown. Rendered by the tiny renderer in `src/components/Markdown.tsx`. */
  prose: string;
  exercises: Exercise[];
  commands: CommandDoc[];
  /** Skill ids this lesson unlocks, used by the drill scheduler. */
  skills: string[];
};

export type Tier = {
  id: string;
  title: string;
  blurb: string;
  lessons: Lesson[];
};
