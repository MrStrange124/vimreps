import type { Tier } from "../types";

export const operators: Tier = {
  id: "operators",
  title: "Operators",
  blurb:
    "The idea the whole editor is built on: an operator plus a motion is a sentence. Learn six operators and every motion you know doubles in value.",
  lessons: [
    {
      slug: "operator-grammar",
      title: "Verb plus noun",
      keys: "d + motion",
      summary: "The one idea that makes the rest of Vim small.",
      skills: ["operators"],
      prose: `
Here is the whole design of Vim in one line:

**operator + motion = change**

An operator is a verb: \`d\` delete, \`c\` change, \`y\` yank. A motion is a noun
phrase: \`w\` a word, \`$\` to the end of the line, \`}\` to the next blank line.

Put them together and you get a sentence. \`d\` + \`w\` is "delete word". \`d\` + \`$\`
is "delete to end of line". \`y\` + \`}\` is "yank this paragraph".

Nothing about this is special-cased. Every motion in the last tier already works
as the object of every operator in this one, which is why learning one new motion
makes six commands better at once. This is also why counts need no new rules:
\`d2w\` is just "delete, two words".

When you press an operator, Vim waits. The status line shows it pending, and the
next keys you type are read as the motion. Press \`Esc\` to back out.
      `,
      commands: [
        { keys: "d{motion}", what: "delete over the motion" },
        { keys: "c{motion}", what: "change over the motion" },
        { keys: "y{motion}", what: "yank over the motion" },
      ],
      exercises: [
        {
          id: "grammar-delete-to-end",
          prompt: "Delete from the cursor to the end of the line.",
          buffer: ["keep this and drop the rest"],
          cursor: { line: 0, col: 14 },
          goal: { kind: "buffer", lines: ["keep this and "] },
          constraints: {
            maxKeystrokes: 3,
            requiredKeys: /^d\$$/,
            requiredKeysMessage: "Compose it: `d` for delete, `$` for to-end-of-line.",
          },
          solution: "d$",
          par: 2,
        },
        {
          id: "grammar-delete-word-end",
          prompt: 'Delete the word "hello" but leave the space after it.',
          buffer: ["hello world"],
          goal: { kind: "buffer", lines: [" world"] },
          constraints: {
            maxKeystrokes: 3,
            requiredKeys: /^de$/,
            requiredKeysMessage:
              "`e` stops on the last character of the word, so `de` leaves the space.",
          },
          solution: "de",
          par: 2,
        },
      ],
    },

    {
      slug: "deleting-words",
      title: "Deleting words",
      keys: "dw  de  db",
      summary: "The most-used operator meets the most-used motions.",
      skills: ["operators", "word-motions"],
      prose: `
\`dw\` deletes from the cursor to the start of the next word — which means it takes
the word **and** the space after it. That is usually what you want when removing
a word from a list.

\`de\` stops on the last character of the word, leaving the space behind. Reach for
it when the spacing matters.

\`db\` deletes backwards to the start of the previous word.

There is one wrinkle worth knowing now, because it will otherwise surprise you:
if the word you are deleting is the last one on its line, \`dw\` stops at the end
of that line rather than eating the line break. Vim assumes you did not mean to
join two lines together by accident.
      `,
      commands: [
        { keys: "dw", what: "delete to the start of the next word" },
        { keys: "de", what: "delete to the end of this word" },
        { keys: "db", what: "delete back to the previous word" },
      ],
      exercises: [
        {
          id: "delete-word",
          prompt: 'Delete "quick" and the space after it.',
          buffer: ["the quick brown fox"],
          cursor: { line: 0, col: 4 },
          goal: { kind: "buffer", lines: ["the brown fox"] },
          constraints: {
            maxKeystrokes: 3,
            requiredKeys: /^\d*dw$/,
            requiredKeysMessage:
              "That is the right text, but one character at a time is the habit this replaces. Undo with `u` and use `dw`.",
          },
          solution: "dw",
          par: 2,
        },
        {
          id: "delete-two-words",
          prompt: 'Delete both "quick" and "brown" in one command.',
          buffer: ["the quick brown fox"],
          cursor: { line: 0, col: 4 },
          goal: { kind: "buffer", lines: ["the fox"] },
          constraints: {
            maxKeystrokes: 4,
            requiredKeys: /^(d2w|2dw)$/,
            requiredKeysMessage: "Use a count: `d2w`.",
          },
          solution: "d2w",
          par: 3,
        },
        {
          id: "delete-word-back",
          prompt: 'Delete the word "brown" backwards from where the cursor sits.',
          buffer: ["the quick brown fox"],
          cursor: { line: 0, col: 16 },
          goal: { kind: "buffer", lines: ["the quick fox"] },
          constraints: { maxKeystrokes: 4, requiredKeys: /^db$/ },
          solution: "db",
          par: 2,
        },
      ],
    },

    {
      slug: "deleting-lines",
      title: "Deleting lines",
      keys: "dd  D",
      summary: "Doubling an operator makes it act on the line.",
      skills: ["operators", "linewise"],
      prose: `
Type an operator twice and it applies to the whole line. \`dd\` deletes the line
the cursor is on, indentation and line break included.

This doubling rule is general: \`yy\` yanks a line, \`cc\` changes one, \`>>\` indents
one. Once you know it for \`d\`, you know it for all of them.

\`D\` is different, and worth keeping straight: it deletes from the cursor to the
**end of the line**, leaving the line itself in place. It is a shorthand for
\`d$\`.

So: \`dd\` removes the line; \`D\` empties the rest of it.
      `,
      commands: [
        { keys: "dd", what: "delete the whole line" },
        { keys: "{n}dd", what: "delete n lines" },
        { keys: "D", what: "delete to the end of the line" },
      ],
      exercises: [
        {
          id: "delete-line",
          prompt: "Delete the middle line.",
          buffer: ["keep this", "delete this", "keep this too"],
          cursor: { line: 1, col: 0 },
          goal: { kind: "buffer", lines: ["keep this", "keep this too"] },
          constraints: {
            maxKeystrokes: 3,
            requiredKeys: /^\d*dd$/,
            requiredKeysMessage: "Double the operator: `dd`.",
          },
          solution: "dd",
          par: 2,
        },
        {
          id: "delete-three-lines",
          prompt: "Delete the three lines of dead code in one command.",
          buffer: ["good", "dead", "dead", "dead", "good"],
          cursor: { line: 1, col: 0 },
          goal: { kind: "buffer", lines: ["good", "good"] },
          constraints: {
            maxKeystrokes: 4,
            requiredKeys: /^3dd$/,
            requiredKeysMessage: "Counts work here too: `3dd`.",
          },
          solution: "3dd",
          par: 3,
        },
        {
          id: "delete-rest-of-line",
          prompt: "Drop the trailing comment, leaving the code and the space before it.",
          buffer: ["const x = 1; // this comment is noise"],
          cursor: { line: 0, col: 13 },
          goal: { kind: "buffer", lines: ["const x = 1; "] },
          constraints: {
            maxKeystrokes: 3,
            requiredKeys: /^(D|d\$)$/,
            requiredKeysMessage: "`D` deletes to the end of the line in one key.",
          },
          solution: "D",
          par: 1,
        },
      ],
    },

    {
      slug: "changing-text",
      title: "Changing text",
      keys: "cw  cc  C",
      summary: "Delete and insert, in one motion.",
      skills: ["operators", "change"],
      prose: `
\`c\` works exactly like \`d\` but leaves you in insert mode. \`cw\` removes a word and
puts the cursor where it was so you can type the replacement.

This saves a keystroke over \`dw\` then \`i\`, but the real reason to prefer it is
\`.\` — the repeat command in two lessons' time replays a change as a single unit,
text and all.

\`cc\` changes the whole line while **keeping its indentation**, which is what
makes it the right way to rewrite a line of code. \`C\` changes from the cursor to
the end of the line.

One quirk: \`cw\` behaves like \`ce\`. It does not eat the space after the word, even
though \`dw\` does. Vim decided that when replacing a word you almost never want to
swallow the space, and it was right.
      `,
      commands: [
        { keys: "cw", what: "change to the end of the word" },
        { keys: "cc", what: "change the whole line, keeping indentation" },
        { keys: "C", what: "change to the end of the line" },
        { keys: "s", what: "substitute one character" },
      ],
      exercises: [
        {
          id: "change-word",
          prompt: 'Replace "old" with "new".',
          buffer: ["the old value"],
          cursor: { line: 0, col: 4 },
          goal: { kind: "buffer", lines: ["the new value"] },
          constraints: {
            requiredKeys: /^cwnew<Esc>$/,
            requiredKeysMessage: "Use `cw`, type the replacement, then `Esc`.",
          },
          solution: "cwnew<Esc>",
          par: 6,
        },
        {
          id: "change-line",
          prompt: "Rewrite the body of the function, keeping the indentation.",
          buffer: ["function run() {", "    todo();", "}"],
          cursor: { line: 1, col: 4 },
          goal: { kind: "buffer", lines: ["function run() {", "    done();", "}"] },
          constraints: {
            requiredKeys: /^ccdone\(\);<Esc>$/,
            requiredKeysMessage: "`cc` clears the line but keeps its indentation.",
          },
          solution: "ccdone();<Esc>",
          par: 10,
        },
        {
          id: "change-to-end",
          prompt: 'Replace everything from "wrong" onwards with "right".',
          buffer: ["the answer is wrong here"],
          cursor: { line: 0, col: 14 },
          goal: { kind: "buffer", lines: ["the answer is right"] },
          constraints: {
            requiredKeys: /^Cright<Esc>$/,
            requiredKeysMessage: "`C` changes from the cursor to the end of the line.",
          },
          solution: "Cright<Esc>",
          par: 7,
        },
      ],
    },

    {
      slug: "yank-and-put",
      title: "Copy and paste",
      keys: "y  p  P",
      summary: "Vim's word for copy is yank.",
      skills: ["yank", "paste"],
      prose: `
\`y\` yanks — copies. It takes a motion like any operator: \`yw\` a word, \`y}\` a
paragraph, \`yy\` a whole line.

\`p\` puts the text back. Where it lands depends on what you copied:

- Copied **whole lines**? \`p\` puts them on the line **below**, \`P\` above.
- Copied **part of a line**? \`p\` puts it **after** the cursor, \`P\` before.

That sounds like two rules to remember but in practice it is one: put it where it
obviously goes. Line-sized things go on their own line.

\`yyp\` — yank a line, put it below — is the fastest way to duplicate a line, and
worth committing to muscle memory now.

Deletes also fill the paste buffer. \`dd\` then \`p\` moves a line rather than
copying it.
      `,
      commands: [
        { keys: "yy", what: "yank the current line" },
        { keys: "yw", what: "yank a word" },
        { keys: "p", what: "put after the cursor, or on the line below" },
        { keys: "P", what: "put before the cursor, or on the line above" },
      ],
      exercises: [
        {
          id: "duplicate-line",
          prompt: "Duplicate the line.",
          buffer: ["copy me"],
          goal: { kind: "buffer", lines: ["copy me", "copy me"] },
          constraints: {
            maxKeystrokes: 4,
            requiredKeys: /^yyp$/,
            requiredKeysMessage: "`yy` to yank the line, `p` to put it below.",
          },
          solution: "yyp",
          par: 3,
        },
        {
          id: "move-line-down",
          prompt: "Move the first line below the second, using delete and put.",
          buffer: ["second", "first"],
          goal: { kind: "buffer", lines: ["first", "second"] },
          constraints: {
            maxKeystrokes: 4,
            requiredKeys: /^ddp$/,
            requiredKeysMessage: "A delete fills the paste buffer too, so `ddp` moves a line.",
          },
          solution: "ddp",
          par: 3,
        },
        {
          id: "put-above",
          prompt: "Copy the line and put the copy above it.",
          buffer: ["header", "body"],
          goal: { kind: "buffer", lines: ["header", "header", "body"] },
          constraints: { maxKeystrokes: 4, requiredKeys: /^yyP$/ },
          solution: "yyP",
          par: 3,
        },
      ],
    },

    {
      slug: "repeat-with-dot",
      title: "Repeat",
      keys: ".",
      summary: "The most valuable key on the keyboard.",
      skills: ["dot-repeat"],
      prose: `
\`.\` repeats your last change.

Not the last keystroke — the last **change**, as a unit. If you pressed
\`cwtotal\` then \`Esc\`, \`.\` replays the whole thing: delete a word, type "total",
leave insert mode. Move to another word, press \`.\`, and it happens again.

This is why the earlier advice to prefer \`cw\` over \`dw\`+\`i\` matters. A change
made as one command is repeatable as one command; the same edit assembled from
pieces is not.

The pattern that follows is the core Vim workflow, and it is worth naming:

**make the change once, then move and press \`.\`**

For three or four repetitions it beats writing a substitution, and unlike a
substitution you see each one before you commit to it. \`u\` undoes any that
landed wrong.
      `,
      commands: [{ keys: ".", what: "repeat the last change" }],
      exercises: [
        {
          id: "dot-repeat-delete",
          prompt: "Delete the first two words — do the second one with a single key.",
          buffer: ["drop drop keep"],
          goal: { kind: "buffer", lines: ["keep"] },
          constraints: {
            maxKeystrokes: 3,
            requiredKeys: /^dw\.$/,
            requiredKeysMessage: "Delete once with `dw`, then press `.` to do it again.",
          },
          solution: "dw.",
          par: 3,
        },
        {
          id: "dot-repeat-change",
          prompt: 'Change both instances of "old" to "new" — the second with `.`.',
          buffer: ["old and old"],
          goal: { kind: "buffer", lines: ["new and new"] },
          constraints: {
            requiredKeys: /^cwnew<Esc>.*\.$/,
            requiredKeysMessage:
              "Change the first with `cw`, move to the second, then press `.`.",
          },
          solution: "cwnew<Esc>ww.",
          par: 9,
          hint: "After `Esc`, use `ww` to reach the second one.",
        },
      ],
    },
  ],
};
