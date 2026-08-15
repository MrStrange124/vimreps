import type { Tier } from "../types";

const ARROWS = ["<Left>", "<Right>", "<Up>", "<Down>"];

export const foundations: Tier = {
  id: "foundations",
  title: "Foundations",
  blurb:
    "Modes, movement, and the two or three commands you need before anything else makes sense.",
  lessons: [
    {
      slug: "modes",
      title: "Modes",
      keys: "i  Esc",
      summary: "Why the same key does two different things.",
      skills: ["insert-basic"],
      prose: `
Most editors have one mode. You press a key, the key appears. Vim has several,
and the one you are in decides what your keys mean.

**Normal mode** is where Vim starts, and where you spend most of your time. Keys
here are commands, not text. \`x\` deletes a character. \`w\` jumps forward a word.
Nothing you type lands in the file.

**Insert mode** is the one you already know. Keys become text. You get there with
\`i\`, and you leave with \`Esc\`.

That is the whole trick, and it is the reason Vim feels hostile for about a day.
The payoff is that in normal mode every key on the keyboard is free to be a
command, because none of them are needed for typing. Watch the mode indicator at
the bottom of the editor as you work — when a key does something surprising, it
is almost always because you were in the other mode.

A habit worth building now: **return to normal mode the moment you stop typing.**
Normal mode is the resting state, not insert.
      `,
      commands: [
        { keys: "i", what: "enter insert mode before the cursor" },
        { keys: "Esc", what: "return to normal mode" },
      ],
      exercises: [
        {
          id: "modes-enter-insert",
          prompt: "Enter insert mode.",
          buffer: ["the mode indicator is below"],
          goal: { kind: "mode", mode: "insert" },
          solution: "i",
          par: 1,
          hint: "One key.",
        },
        {
          id: "modes-type-and-leave",
          prompt: 'Insert "hello " before the word, then return to normal mode.',
          buffer: ["world"],
          goal: {
            kind: "all",
            goals: [
              { kind: "buffer", lines: ["hello world"] },
              { kind: "mode", mode: "normal" },
            ],
          },
          solution: "ihello <Esc>",
          par: 8,
          hint: "`i`, type the text, then `Esc`.",
        },
      ],
    },

    {
      slug: "basic-movement",
      title: "Basic movement",
      keys: "h j k l",
      summary: "Moving without leaving the home row.",
      skills: ["hjkl"],
      prose: `
In normal mode the arrow keys work, and you should stop using them. Not out of
purity — because your right hand has to leave the home row to reach them, and
you move the cursor thousands of times a day.

The four keys sit under your right hand:

- \`h\` — left
- \`j\` — down
- \`k\` — up
- \`l\` — right

\`j\` and \`k\` are the ones people mix up. The one that looks like it has a
descender hanging below the line is \`j\`, and it goes down.

The arrow keys are disabled in these exercises. It will feel slow for a few
minutes and then it will not.
      `,
      commands: [
        { keys: "h", what: "move left" },
        { keys: "j", what: "move down" },
        { keys: "k", what: "move up" },
        { keys: "l", what: "move right" },
      ],
      exercises: [
        {
          id: "hjkl-right",
          prompt: "Move the cursor onto the X.",
          buffer: ["..X"],
          goal: { kind: "cursor", at: { line: 0, col: 2 } },
          constraints: { forbiddenKeys: ARROWS },
          solution: "ll",
          par: 2,
        },
        {
          id: "hjkl-down",
          prompt: "Move the cursor onto the X.",
          buffer: [".", ".", "X"],
          goal: { kind: "cursor", at: { line: 2, col: 0 } },
          constraints: { forbiddenKeys: ARROWS },
          solution: "jj",
          par: 2,
        },
        {
          id: "hjkl-diagonal",
          prompt: "Reach the X.",
          buffer: ["....", "....", "..X."],
          goal: { kind: "cursor", at: { line: 2, col: 2 } },
          constraints: { forbiddenKeys: ARROWS },
          solution: "jjll",
          par: 4,
        },
        {
          id: "hjkl-back",
          prompt: "Reach the X — you will need to go up and left.",
          buffer: [".X..", "....", "...."],
          cursor: { line: 2, col: 3 },
          goal: { kind: "cursor", at: { line: 0, col: 1 } },
          constraints: { forbiddenKeys: ARROWS },
          solution: "kkhh",
          par: 4,
        },
      ],
    },

    {
      slug: "insert-and-append",
      title: "Insert and append",
      keys: "i  a",
      summary: "Two ways in, one character apart.",
      skills: ["insert-basic"],
      prose: `
\`i\` enters insert mode **before** the cursor. \`a\` enters it **after**. That single
character of difference is the one that trips everyone up at the end of a word.

If the cursor is on the \`d\` of \`word\` and you press \`i\`, your text goes in front
of the \`d\`. Press \`a\` and it goes behind it. When the cursor sits on the last
character of a line, \`a\` is the only one of the two that can reach the end.

Say it as "insert" and "append" and it stops being confusing.
      `,
      commands: [
        { keys: "i", what: "insert before the cursor" },
        { keys: "a", what: "append after the cursor" },
      ],
      exercises: [
        {
          id: "append-end",
          prompt: 'The cursor is on the last character. Append "!" to the line.',
          buffer: ["done"],
          cursor: { line: 0, col: 3 },
          goal: {
            kind: "all",
            goals: [
              { kind: "buffer", lines: ["done!"] },
              { kind: "mode", mode: "normal" },
            ],
          },
          constraints: {
            requiredKeys: /^a!<Esc>$/,
            requiredKeysMessage:
              "Use `a` here. `i` would put the `!` before the `e`, which is why append exists.",
          },
          solution: "a!<Esc>",
          par: 3,
        },
        {
          id: "insert-before",
          prompt: 'The cursor is on the "c". Insert "abc" so the line reads "abcd".',
          buffer: ["d"],
          goal: {
            kind: "all",
            goals: [
              { kind: "buffer", lines: ["abcd"] },
              { kind: "mode", mode: "normal" },
            ],
          },
          solution: "iabc<Esc>",
          par: 5,
        },
      ],
    },

    {
      slug: "line-insert",
      title: "Jumping to the ends of a line",
      keys: "I  A",
      summary: "The capitals go to the ends of the line.",
      skills: ["insert-line"],
      prose: `
The capital versions of \`i\` and \`a\` do the same job from the ends of the line:

- \`I\` — insert at the **first non-blank character** of the line
- \`A\` — append at the **end** of the line

\`A\` is the one you will reach for constantly. Adding a semicolon, closing a
bracket, finishing a sentence — none of it needs you to travel to the end of the
line first. \`A\` gets there and puts you in insert mode in one keystroke.

Note that \`I\` skips leading whitespace. On an indented line it drops you in front
of the first real character, not at column one, which is nearly always what you
meant.
      `,
      commands: [
        { keys: "I", what: "insert at the first non-blank character" },
        { keys: "A", what: "append at the end of the line" },
      ],
      exercises: [
        {
          id: "append-line-end",
          prompt: "Add a semicolon to the end of the line, without moving there first.",
          buffer: ["const total = a + b"],
          goal: { kind: "buffer", lines: ["const total = a + b;"] },
          constraints: {
            requiredKeys: /^A;<Esc>$/,
            requiredKeysMessage:
              "Use `A` — it travels to the end of the line and enters insert mode in one keystroke.",
          },
          solution: "A;<Esc>",
          par: 3,
        },
        {
          id: "insert-line-start",
          prompt: 'Comment the line out by putting "// " in front of the code.',
          buffer: ["    broken();"],
          cursor: { line: 0, col: 8 },
          goal: { kind: "buffer", lines: ["    // broken();"] },
          constraints: {
            requiredKeys: /^I\/\/ <Esc>$/,
            requiredKeysMessage:
              "Use `I`. It lands in front of the first non-blank character, so the indentation survives.",
          },
          solution: "I// <Esc>",
          par: 6,
        },
      ],
    },

    {
      slug: "open-lines",
      title: "Opening new lines",
      keys: "o  O",
      summary: "Make a line and start typing on it.",
      skills: ["open-line"],
      prose: `
\`o\` opens a new line **below** the current one and puts you in insert mode on it.
\`O\` opens one **above**.

Neither cares where the cursor is on the line, so you never need to press \`A\` and
then \`Enter\`. Both carry the current line's indentation down with them, which is
what makes \`o\` the natural way to add a statement inside a block.
      `,
      commands: [
        { keys: "o", what: "open a line below and insert" },
        { keys: "O", what: "open a line above and insert" },
      ],
      exercises: [
        {
          id: "open-below",
          prompt: 'Add a line reading "second" below the first.',
          buffer: ["first"],
          goal: {
            kind: "all",
            goals: [
              { kind: "buffer", lines: ["first", "second"] },
              { kind: "mode", mode: "normal" },
            ],
          },
          constraints: {
            requiredKeys: /^osecond<Esc>$/,
            requiredKeysMessage: "Use `o` — it makes the line and starts insert mode together.",
          },
          solution: "osecond<Esc>",
          par: 8,
        },
        {
          id: "open-above",
          prompt: 'Add a line reading "first" above.',
          buffer: ["second"],
          goal: {
            kind: "all",
            goals: [
              { kind: "buffer", lines: ["first", "second"] },
              { kind: "mode", mode: "normal" },
            ],
          },
          constraints: {
            requiredKeys: /^Ofirst<Esc>$/,
            requiredKeysMessage: "Use `O` for a line above.",
          },
          solution: "Ofirst<Esc>",
          par: 7,
        },
        {
          id: "open-keeps-indent",
          prompt: 'Add a call to "cleanup();" after the existing one, keeping the indentation.',
          buffer: ["function run() {", "    setup();", "}"],
          cursor: { line: 1, col: 4 },
          goal: {
            kind: "buffer",
            lines: ["function run() {", "    setup();", "    cleanup();", "}"],
          },
          solution: "ocleanup();<Esc>",
          par: 12,
          hint: "`o` carries the indentation of the current line.",
        },
      ],
    },

    {
      slug: "deleting-characters",
      title: "Deleting characters",
      keys: "x  X",
      summary: "The smallest edit there is.",
      skills: ["delete-char"],
      prose: `
\`x\` deletes the character **under** the cursor. \`X\` deletes the one **before** it —
the same relationship as backspace and delete, and worth knowing so you do not
have to move the cursor before removing something.

\`x\` is the first command most people learn and, eventually, one of the least
used: nearly always there is an operator that removes exactly the thing you
meant, rather than one character at a time. But for a stray bracket or a doubled
letter it is still the shortest route.
      `,
      commands: [
        { keys: "x", what: "delete the character under the cursor" },
        { keys: "X", what: "delete the character before the cursor" },
      ],
      exercises: [
        {
          id: "delete-char",
          prompt: "Remove the doubled letter.",
          buffer: ["hellllo"],
          cursor: { line: 0, col: 2 },
          goal: { kind: "buffer", lines: ["hello"] },
          solution: "xx",
          par: 2,
        },
        {
          id: "delete-char-back",
          prompt: "The cursor is on the closing bracket. Delete the stray one before it.",
          buffer: ["value))"],
          cursor: { line: 0, col: 6 },
          goal: { kind: "buffer", lines: ["value)"] },
          constraints: {
            requiredKeys: /^X$/,
            requiredKeysMessage: "`X` deletes backwards, so the cursor never has to move.",
          },
          solution: "X",
          par: 1,
        },
      ],
    },

    {
      slug: "undo-and-redo",
      title: "Undo and redo",
      keys: "u  Ctrl-r",
      summary: "Permission to experiment.",
      skills: ["undo"],
      prose: `
\`u\` undoes the last change. \`Ctrl-r\` redoes it.

Vim groups changes the way you would expect rather than by keystroke: everything
you type in one visit to insert mode is a single undo step. Enter insert, type a
sentence, press \`Esc\`, press \`u\` — the whole sentence goes, not the last letter.

This matters more than it sounds. Every command in the rest of this course is
safe to try on real text, because \`u\` puts it back.
      `,
      commands: [
        { keys: "u", what: "undo the last change" },
        { keys: "Ctrl-r", what: "redo" },
      ],
      exercises: [
        {
          id: "undo-once",
          prompt: "Delete a character, then undo it.",
          buffer: ["intact"],
          goal: {
            kind: "all",
            goals: [
              { kind: "buffer", lines: ["intact"] },
              { kind: "predicate", describe: "you must actually undo something", test: (s) => s.redo.length > 0 },
            ],
          },
          solution: "xu",
          par: 2,
        },
        {
          id: "undo-insert-session",
          prompt:
            'Insert "very " before the word, then undo — notice the whole insert goes at once.',
          buffer: ["bad"],
          goal: {
            kind: "all",
            goals: [
              { kind: "buffer", lines: ["bad"] },
              { kind: "predicate", describe: "you must actually undo something", test: (s) => s.redo.length > 0 },
            ],
          },
          solution: "ivery <Esc>u",
          par: 8,
        },
        {
          id: "redo",
          prompt: "Delete the character, undo it, then redo it.",
          buffer: ["gone"],
          goal: { kind: "buffer", lines: ["one"] },
          constraints: { requiredKeys: /u.*<C-r>/ },
          solution: "xu<C-r>",
          par: 3,
        },
      ],
    },

    {
      slug: "counts",
      title: "Counts",
      keys: "3x  5j",
      summary: "Every command takes a number.",
      skills: ["counts"],
      prose: `
Type a number before a command and it happens that many times. \`3x\` deletes three
characters. \`5j\` moves down five lines. \`12l\` moves right twelve.

This is not a special feature of a few commands — it is part of the grammar, and
it works on nearly everything you will learn from here on. Once operators arrive
in a couple of lessons, counts compose with them too: \`d3w\` deletes three words.

The honest advice is to not overuse them. Counting out fourteen lines to press
\`14j\` is slower than a search. Counts earn their keep at small numbers, where you
can see the target without thinking about it.
      `,
      commands: [
        { keys: "{n}x", what: "delete n characters" },
        { keys: "{n}j", what: "move down n lines" },
        { keys: "{n}l", what: "move right n characters" },
      ],
      exercises: [
        {
          id: "count-delete",
          prompt: "Delete the four leading dashes in one command.",
          buffer: ["----keep"],
          goal: { kind: "buffer", lines: ["keep"] },
          constraints: {
            maxKeystrokes: 2,
            requiredKeys: /^4x$/,
            requiredKeysMessage: "Put the count first: `4x`.",
          },
          solution: "4x",
          par: 2,
        },
        {
          id: "count-move",
          prompt: "Reach the X in a single command.",
          buffer: [".", ".", ".", ".", "X"],
          goal: { kind: "cursor", at: { line: 4, col: 0 } },
          constraints: { maxKeystrokes: 2, forbiddenKeys: ARROWS },
          solution: "4j",
          par: 2,
        },
      ],
    },
  ],
};
