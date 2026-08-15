import type { Tier } from "../types";

export const search: Tier = {
  id: "search",
  title: "Search",
  blurb:
    "Moving by what the text says rather than by counting. The fastest long-distance motion there is.",
  lessons: [
    {
      slug: "searching",
      title: "Searching",
      keys: "/  ?",
      summary: "Type what you are looking for.",
      skills: ["search"],
      prose: `
\`/\` opens a search prompt at the bottom of the editor. Type what you are looking
for, press Enter, and the cursor jumps to the next occurrence.

\`?\` does the same thing backwards.

Search is the honest answer to long-distance movement. Counting fourteen lines to
press \`14j\` requires you to count; \`/\` requires you to remember roughly what the
line said, which you usually do. It also survives the file changing under you in
a way line numbers do not.

Searches wrap around the end of the file, so you never need to know whether your
target is above or below the cursor — \`/\` will find it either way.
      `,
      commands: [
        { keys: "/{pattern}", what: "search forward" },
        { keys: "?{pattern}", what: "search backward" },
      ],
      exercises: [
        {
          id: "search-forward",
          prompt: 'Search for "gamma" to jump to it.',
          buffer: ["alpha", "beta", "gamma", "delta"],
          goal: { kind: "cursor", at: { line: 2, col: 0 } },
          constraints: { requiredKeys: /^\/gamma<CR>$/ },
          solution: "/gamma<CR>",
          par: 7,
        },
        {
          id: "search-backward",
          prompt: 'From the bottom, search backwards for "alpha".',
          buffer: ["alpha", "beta", "gamma", "delta"],
          cursor: { line: 3, col: 0 },
          goal: { kind: "cursor", at: { line: 0, col: 0 } },
          constraints: { requiredKeys: /^\?alpha<CR>$/ },
          solution: "?alpha<CR>",
          par: 7,
        },
        {
          id: "search-wraps",
          prompt: 'Search forward for "alpha" — the search wraps past the end of the file.',
          buffer: ["alpha", "beta", "gamma"],
          cursor: { line: 2, col: 0 },
          goal: { kind: "cursor", at: { line: 0, col: 0 } },
          solution: "/alpha<CR>",
          par: 7,
        },
      ],
    },

    {
      slug: "repeating-a-search",
      title: "Repeating a search",
      keys: "n  N",
      summary: "Step through the matches.",
      skills: ["search"],
      prose: `
\`n\` jumps to the next match of your last search. \`N\` jumps to the previous one.

This turns search into a way of walking a file: search once for the thing you
care about, then tap \`n\` to visit every occurrence in turn. Combined with \`.\` from
the last tier, \`n\` and \`.\` alternating is the workhorse pattern for making the
same small edit in a dozen places, with your eyes on each one.
      `,
      commands: [
        { keys: "n", what: "next match" },
        { keys: "N", what: "previous match" },
      ],
      exercises: [
        {
          id: "search-next",
          prompt: 'Search for "todo" and step to the second occurrence.',
          buffer: ["clean", "todo one", "clean", "todo two"],
          goal: { kind: "cursor", at: { line: 3, col: 0 } },
          solution: "/todo<CR>n",
          par: 7,
        },
        {
          id: "search-previous",
          prompt: "Step forward through the matches, then back one with `N`.",
          buffer: ["todo a", "clean", "todo b", "todo c"],
          goal: { kind: "cursor", at: { line: 2, col: 0 } },
          solution: "/todo<CR>nN",
          par: 9,
          hint: "`/todo` lands on the second one; `n` goes on, `N` comes back.",
        },
      ],
    },

    {
      slug: "search-word-under-cursor",
      title: "Searching for what is under the cursor",
      keys: "*  #",
      summary: "Search without typing the word.",
      skills: ["search"],
      prose: `
\`*\` searches forward for the word the cursor is sitting on. \`#\` searches
backward.

No typing, no spelling mistakes. Put the cursor on a variable name and press \`*\`
to walk every use of it in the file.

Both match whole words only, so pressing \`*\` on \`id\` will not stop on \`width\`.
That restriction is the entire reason these keys are better than typing the same
word after \`/\`.
      `,
      commands: [
        { keys: "*", what: "search forward for the word under the cursor" },
        { keys: "#", what: "search backward for the word under the cursor" },
      ],
      exercises: [
        {
          id: "star-search",
          prompt: "Jump to the next use of this variable without typing its name.",
          buffer: ["let count = 0", "let other = 1", "count += 1"],
          goal: { kind: "cursor", at: { line: 2, col: 0 } },
          cursor: { line: 0, col: 4 },
          constraints: {
            maxKeystrokes: 2,
            requiredKeys: /^\*$/,
            requiredKeysMessage: "One key: `*`.",
          },
          solution: "*",
          par: 1,
        },
        {
          id: "hash-search",
          prompt: "Jump back to the previous use of this variable.",
          buffer: ["let count = 0", "let other = 1", "count += 1"],
          cursor: { line: 2, col: 0 },
          goal: { kind: "cursor", at: { line: 0, col: 4 } },
          constraints: { maxKeystrokes: 2, requiredKeys: /^#$/ },
          solution: "#",
          par: 1,
        },
      ],
    },

    {
      slug: "search-as-a-motion",
      title: "Search as a motion",
      keys: "d/  y/",
      summary: "Operators take searches too.",
      skills: ["search", "operators"],
      prose: `
Search is a motion, and every motion is an operator target. So \`d/end\` deletes
everything from the cursor up to the next occurrence of "end".

This is the payoff of the grammar. Nobody had to add a "delete until text"
command — \`d\` already knew how to consume a motion, and \`/\` already was one.

The deletion stops **before** the match, leaving the text you searched for
intact. That is usually what you want: you are describing where to stop, not
what to remove.
      `,
      commands: [
        { keys: "d/{pattern}", what: "delete up to the next match" },
        { keys: "y/{pattern}", what: "yank up to the next match" },
      ],
      exercises: [
        {
          id: "delete-to-search",
          prompt: 'Delete everything before "three".',
          buffer: ["one two three"],
          goal: { kind: "buffer", lines: ["three"] },
          constraints: {
            requiredKeys: /^d\/three<CR>$/,
            requiredKeysMessage: "Compose it: `d` then `/three` and Enter.",
          },
          solution: "d/three<CR>",
          par: 8,
        },
        {
          id: "delete-to-search-multiline",
          prompt: 'Delete from here down to the line beginning "end".',
          buffer: ["start", "middle", "end"],
          goal: { kind: "buffer", lines: ["end"] },
          solution: "d/end<CR>",
          par: 6,
        },
      ],
    },
  ],
};
