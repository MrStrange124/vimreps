import type { Exercise } from "@/exercise/types";

/**
 * Golf challenges: get from the start buffer to the target in as few keystrokes
 * as possible. No required-keys constraint — any route counts. Par is what a
 * fluent user would spend, and beating it should be possible but awkward.
 */

export type Challenge = Exercise & {
  slug: string;
  title: string;
  blurb: string;
  /** Commands worth knowing for this hole, shown after a solve. */
  teaches: string[];
};

export const CHALLENGES: Challenge[] = [
  {
    slug: "swap-two-lines",
    title: "Out of order",
    blurb: "Two lines, the wrong way round.",
    id: "golf-swap-two-lines",
    prompt: "Put the lines in the right order.",
    buffer: ["second", "first"],
    goal: { kind: "buffer", lines: ["first", "second"] },
    solution: "ddp",
    par: 3,
    teaches: ["dd", "p"],
  },

  {
    slug: "strip-blank-lines",
    title: "Airy",
    blurb: "Too much room to breathe.",
    id: "golf-strip-blank-lines",
    prompt: "Remove every blank line.",
    buffer: ["alpha", "", "bravo", "", "", "charlie"],
    goal: { kind: "buffer", lines: ["alpha", "bravo", "charlie"] },
    solution: ":g/^$/d<CR>",
    par: 10,
    teaches: [":g", "^$"],
  },

  {
    slug: "clear-todos",
    title: "Bankruptcy",
    blurb: "Declare it on the whole file.",
    id: "golf-clear-todos",
    prompt: "Delete every line mentioning TODO.",
    buffer: ["ship it", "TODO write tests", "works fine", "TODO refactor", "done"],
    goal: { kind: "buffer", lines: ["ship it", "works fine", "done"] },
    solution: ":g/TODO/d<CR>",
    par: 12,
    teaches: [":g"],
  },

  {
    slug: "comment-the-block",
    title: "Silenced",
    blurb: "Four lines, one column.",
    id: "golf-comment-the-block",
    prompt: "Comment out all four lines by prefixing each with `// `.",
    buffer: ["setup();", "run();", "check();", "teardown();"],
    goal: {
      kind: "buffer",
      lines: ["// setup();", "// run();", "// check();", "// teardown();"],
    },
    solution: "<C-v>3jI// <Esc>",
    par: 9,
    teaches: ["Ctrl-v", "I"],
  },

  {
    slug: "trailing-commas",
    title: "Ragged right",
    blurb: "Every line wants a comma, and the lines are different lengths.",
    id: "golf-trailing-commas",
    prompt: "Add a comma to the end of every line.",
    buffer: ["one", "seventeen", "four"],
    goal: { kind: "buffer", lines: ["one,", "seventeen,", "four,"] },
    solution: ":%normal A,<CR>",
    par: 15,
    teaches: [":normal", "A"],
  },

  {
    slug: "transpose",
    title: "Fat fingers",
    blurb: "Two letters, the wrong way round.",
    id: "golf-transpose",
    prompt: "Fix the typo in the first word.",
    buffer: ["teh quick brown fox"],
    goal: { kind: "buffer", lines: ["the quick brown fox"] },
    solution: "lxp",
    par: 3,
    teaches: ["x", "p"],
  },

  {
    slug: "empty-the-body",
    title: "Gutted",
    blurb: "Keep the signature, lose the body.",
    id: "golf-empty-the-body",
    prompt: "Delete everything inside the braces, leaving them on their own lines.",
    buffer: ["function run() {", "  setup();", "  work();", "  done();", "}"],
    goal: { kind: "buffer", lines: ["function run() {", "}"] },
    solution: "jdi{",
    par: 5,
    teaches: ["i{"],
  },

  {
    slug: "shout-the-constants",
    title: "Louder",
    blurb: "Screaming snake case, the hard way.",
    id: "golf-shout-the-constants",
    prompt: "Uppercase all three names.",
    buffer: ["alpha", "bravo", "charlie"],
    goal: { kind: "buffer", lines: ["ALPHA", "BRAVO", "CHARLIE"] },
    solution: ":%normal gUU<CR>",
    par: 17,
    teaches: [":normal", "gU"],
  },

  {
    slug: "quote-the-values",
    title: "Unquoted",
    blurb: "A list that forgot its quotes.",
    id: "golf-quote-the-values",
    prompt: "Wrap each value in double quotes.",
    buffer: ["red", "green", "blue"],
    goal: { kind: "buffer", lines: ['"red"', '"green"', '"blue"'] },
    solution: ':%normal I"<CR>:%normal A"<CR>',
    par: 32,
    teaches: [":normal", "I", "A"],
  },

  {
    slug: "renumber",
    title: "Off by one",
    blurb: "Every reference points at the wrong thing.",
    id: "golf-renumber",
    prompt: 'Change every "v1" to "v2".',
    buffer: ["import v1/alpha", "import v1/bravo", "call(v1)"],
    goal: { kind: "buffer", lines: ["import v2/alpha", "import v2/bravo", "call(v2)"] },
    solution: ":%s/v1/v2/g<CR>",
    par: 13,
    teaches: [":%s"],
  },

  {
    slug: "collapse-the-list",
    title: "One line",
    blurb: "Four lines that belong together.",
    id: "golf-collapse-the-list",
    prompt: "Join all four lines into one.",
    buffer: ["north", "south", "east", "west"],
    goal: { kind: "buffer", lines: ["north south east west"] },
    solution: "4J",
    par: 3,
    teaches: ["J", "counts"],
  },

  {
    slug: "indent-the-inner",
    title: "Flat",
    blurb: "The body forgot to indent.",
    id: "golf-indent-the-inner",
    prompt: "Indent the three inner lines by one level.",
    buffer: ["function run() {", "setup();", "work();", "done();", "}"],
    goal: {
      kind: "buffer",
      lines: ["function run() {", "  setup();", "  work();", "  done();", "}"],
    },
    solution: "j3>>",
    par: 5,
    teaches: [">>", "counts"],
  },
];

export function challengeBySlug(slug: string): Challenge | undefined {
  return CHALLENGES.find((challenge) => challenge.slug === slug);
}
