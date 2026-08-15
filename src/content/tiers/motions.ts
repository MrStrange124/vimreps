import type { Tier } from "../types";

const ARROWS = ["<Left>", "<Right>", "<Up>", "<Down>"];

export const motions: Tier = {
  id: "motions",
  title: "Motions",
  blurb:
    "Getting the cursor where you want it in one or two keys instead of ten. Everything here becomes an operator target later.",
  lessons: [
    {
      slug: "word-motions",
      title: "Moving by words",
      keys: "w  b  e",
      summary: "Three keys that cover most horizontal travel.",
      skills: ["word-motions"],
      prose: `
Pressing \`l\` eleven times to cross a word is the beginner's tax. Three keys
replace it:

- \`w\` — forward to the **start of the next word**
- \`b\` — **back** to the start of the previous word
- \`e\` — forward to the **end** of the current or next word

\`w\` and \`b\` are mirror images and you will use them constantly. \`e\` is the odd
one out, and it earns its place later: when you want an operator to include the
last character of a word, \`e\` is the motion that reaches it.

Vim counts punctuation as its own word. In \`user.name\`, \`w\` stops on the dot,
then on \`name\` — three stops, not two. That is deliberate, and the next lesson
gives you the version that ignores it.
      `,
      commands: [
        { keys: "w", what: "forward to the start of the next word" },
        { keys: "b", what: "back to the start of the previous word" },
        { keys: "e", what: "forward to the end of the word" },
      ],
      exercises: [
        {
          id: "word-forward",
          prompt: 'Move to the start of "brown".',
          buffer: ["the quick brown fox"],
          goal: { kind: "cursor", at: { line: 0, col: 10 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 4 },
          solution: "ww",
          par: 2,
        },
        {
          id: "word-back",
          prompt: 'Move back to the start of "quick".',
          buffer: ["the quick brown fox"],
          cursor: { line: 0, col: 16 },
          goal: { kind: "cursor", at: { line: 0, col: 4 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 4 },
          solution: "bb",
          par: 2,
        },
        {
          id: "word-end",
          prompt: 'Move to the last character of "the".',
          buffer: ["the quick brown fox"],
          goal: { kind: "cursor", at: { line: 0, col: 2 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "e",
          par: 1,
        },
        {
          id: "word-punctuation",
          prompt: 'Move to the start of "name" — notice the dot counts as a word.',
          buffer: ["user.name"],
          goal: { kind: "cursor", at: { line: 0, col: 5 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 4 },
          solution: "ww",
          par: 2,
        },
      ],
    },

    {
      slug: "big-word-motions",
      title: "Moving by WORDS",
      keys: "W  B  E",
      summary: "The capitals ignore punctuation.",
      skills: ["word-motions"],
      prose: `
\`W\`, \`B\` and \`E\` do the same jobs as their lowercase versions, but they treat
anything that is not whitespace as part of a word.

That makes them the right choice for text where punctuation is structural rather
than meaningful — file paths, URLs, flags, function calls. On
\`src/engine/motions.ts\`, \`w\` visits nine stops. \`W\` visits one.

The rule of thumb: lowercase when you are moving inside a word, uppercase when
you are stepping over whole things.
      `,
      commands: [
        { keys: "W", what: "forward a WORD, ignoring punctuation" },
        { keys: "B", what: "back a WORD" },
        { keys: "E", what: "to the end of a WORD" },
      ],
      exercises: [
        {
          id: "big-word-forward",
          prompt: "Move to the second path in one keystroke.",
          buffer: ["src/engine/motions.ts src/engine/parser.ts"],
          goal: { kind: "cursor", at: { line: 0, col: 22 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "W",
          par: 1,
        },
        {
          id: "big-word-end",
          prompt: "Move to the last character of the first path.",
          buffer: ["src/engine/motions.ts is long"],
          goal: { kind: "cursor", at: { line: 0, col: 20 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "E",
          par: 1,
        },
      ],
    },

    {
      slug: "line-motions",
      title: "The ends of a line",
      keys: "0  ^  $",
      summary: "Three keys, no travel.",
      skills: ["line-motions"],
      prose: `
- \`0\` — the very first column, whitespace included
- \`^\` — the first character that is not whitespace
- \`$\` — the last character of the line

\`^\` is almost always the one you want on indented code; \`0\` matters when you
care about the indentation itself.

\`$\` is worth a moment. It does not mean "column 80" or any fixed place — it
tracks the actual end of whatever line you are on, which is why \`d$\` is a
reliable "delete the rest of this line" no matter how long it is.
      `,
      commands: [
        { keys: "0", what: "to column zero" },
        { keys: "^", what: "to the first non-blank character" },
        { keys: "$", what: "to the end of the line" },
      ],
      exercises: [
        {
          id: "line-end",
          prompt: "Move to the last character of the line.",
          buffer: ["    indented code here"],
          goal: { kind: "cursor", at: { line: 0, col: 21 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "$",
          par: 1,
        },
        {
          id: "line-first-nonblank",
          prompt: "Move to the first real character, skipping the indentation.",
          buffer: ["    indented code here"],
          cursor: { line: 0, col: 21 },
          goal: { kind: "cursor", at: { line: 0, col: 4 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "^",
          par: 1,
        },
        {
          id: "line-column-zero",
          prompt: "Move to column zero, in front of the indentation.",
          buffer: ["    indented code here"],
          cursor: { line: 0, col: 10 },
          goal: { kind: "cursor", at: { line: 0, col: 0 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "0",
          par: 1,
        },
      ],
    },

    {
      slug: "file-motions",
      title: "The ends of a file",
      keys: "gg  G",
      summary: "Top, bottom, or any line by number.",
      skills: ["file-motions"],
      prose: `
\`gg\` goes to the first line. \`G\` goes to the last.

Give \`G\` a count and it goes to that line number instead: \`42G\` lands on line 42.
This is the fastest way to act on a compiler error that told you exactly where
the problem is.

Both land on the first non-blank character of their target line, not column zero.
      `,
      commands: [
        { keys: "gg", what: "to the first line" },
        { keys: "G", what: "to the last line" },
        { keys: "{n}G", what: "to line n" },
      ],
      exercises: [
        {
          id: "file-bottom",
          prompt: "Jump to the last line.",
          buffer: ["one", "two", "three", "four", "five"],
          goal: { kind: "cursor", at: { line: 4, col: 0 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "G",
          par: 1,
        },
        {
          id: "file-top",
          prompt: "Jump back to the first line.",
          buffer: ["one", "two", "three", "four", "five"],
          cursor: { line: 4, col: 0 },
          goal: { kind: "cursor", at: { line: 0, col: 0 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 3 },
          solution: "gg",
          par: 2,
        },
        {
          id: "file-line-number",
          prompt: "Jump straight to line 3.",
          buffer: ["one", "two", "three", "four", "five"],
          goal: { kind: "cursor", at: { line: 2, col: 0 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 3 },
          solution: "3G",
          par: 2,
        },
      ],
    },

    {
      slug: "find-character",
      title: "Finding a character",
      keys: "f  t  F  T",
      summary: "Jump to any character you can see on the line.",
      skills: ["find-char"],
      prose: `
\`f\` followed by a character jumps forward to the next occurrence of it on this
line. \`fq\` means "find q".

\`t\` does the same but stops one short — "till" rather than "find". The
difference looks pedantic and is not: \`t\` is what you want when the character is
a delimiter you intend to keep, like \`dt,\` to delete up to but not including a
comma.

\`F\` and \`T\` are the backward versions.

All four are line-local. They never jump to another line, which makes them
predictable in a way that searching is not.
      `,
      commands: [
        { keys: "f{char}", what: "forward to the next {char} on this line" },
        { keys: "t{char}", what: "forward to just before the next {char}" },
        { keys: "F{char}", what: "backward to the previous {char}" },
        { keys: "T{char}", what: "backward to just after the previous {char}" },
      ],
      exercises: [
        {
          id: "find-forward",
          prompt: "Jump to the equals sign.",
          buffer: ["const answer = 42"],
          goal: { kind: "cursor", at: { line: 0, col: 13 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 3 },
          solution: "f=",
          par: 2,
        },
        {
          id: "till-forward",
          prompt: "Stop just before the opening bracket.",
          buffer: ["callFunction(arg)"],
          goal: { kind: "cursor", at: { line: 0, col: 11 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 3 },
          solution: "t(",
          par: 2,
        },
        {
          id: "find-backward",
          prompt: "Jump back to the comma.",
          buffer: ["alpha, beta"],
          cursor: { line: 0, col: 10 },
          goal: { kind: "cursor", at: { line: 0, col: 5 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 3 },
          solution: "F,",
          par: 2,
        },
        {
          id: "find-second",
          prompt: "Jump to the second comma using a count.",
          buffer: ["a, b, c, d"],
          goal: { kind: "cursor", at: { line: 0, col: 4 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 4 },
          solution: "2f,",
          par: 3,
        },
      ],
    },

    {
      slug: "repeating-a-find",
      title: "Repeating a find",
      keys: ";  ,",
      summary: "Do it again without retyping it.",
      skills: ["find-char"],
      prose: `
After any \`f\`, \`t\`, \`F\` or \`T\`, the semicolon repeats it and the comma repeats it
in the opposite direction.

This is the honest way to use finds: press \`f,\` once, then tap \`;\` until you land
where you meant. It is faster than counting occurrences in your head, and it
degrades gracefully when you miscount — \`,\` steps back.
      `,
      commands: [
        { keys: ";", what: "repeat the last f/t/F/T" },
        { keys: ",", what: "repeat it in the opposite direction" },
      ],
      exercises: [
        {
          id: "repeat-find",
          prompt: "Land on the third comma, using a find and then repeats.",
          buffer: ["a, b, c, d"],
          goal: { kind: "cursor", at: { line: 0, col: 7 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 5 },
          solution: "f,;;",
          par: 4,
        },
        {
          id: "reverse-find",
          prompt:
            "Repeat your way out to the third comma, overshoot, then step back to the second with `,`.",
          buffer: ["a, b, c, d"],
          goal: { kind: "cursor", at: { line: 0, col: 4 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 6 },
          solution: "f,;;,",
          par: 5,
          hint: "`,` only works once a find is on the clock — start with `f,`.",
        },
      ],
    },

    {
      slug: "paragraph-motions",
      title: "Moving by paragraph",
      keys: "{  }",
      summary: "Jump between blank lines.",
      skills: ["paragraph-motions"],
      prose: `
\`}\` jumps forward to the next blank line, \`{\` back to the previous one.

Vim's definition of a paragraph is simply "text between blank lines", which in
code means it lands neatly between functions, imports, and logical blocks
without knowing anything about the language.

For scrolling through a file you half-remember, \`}\` beats holding \`j\`.
      `,
      commands: [
        { keys: "}", what: "forward to the next blank line" },
        { keys: "{", what: "back to the previous blank line" },
      ],
      exercises: [
        {
          id: "paragraph-forward",
          prompt: "Jump forward to the blank line between the two blocks.",
          buffer: ["import a", "import b", "", "function run() {}", ""],
          goal: { kind: "cursor", at: { line: 2, col: 0 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "}",
          par: 1,
        },
        {
          id: "paragraph-back",
          prompt: "Jump back to the blank line above.",
          buffer: ["import a", "", "function run() {}", "function stop() {}"],
          cursor: { line: 3, col: 0 },
          goal: { kind: "cursor", at: { line: 1, col: 0 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "{",
          par: 1,
        },
      ],
    },

    {
      slug: "matching-pairs",
      title: "Matching brackets",
      keys: "%",
      summary: "Hop between a bracket and its partner.",
      skills: ["match-pair"],
      prose: `
\`%\` jumps to the bracket matching the one under the cursor — parentheses, square
brackets, or braces. Press it again and you come back.

If the cursor is not on a bracket, \`%\` looks forward on the line for the first
one and jumps from there. That means you rarely have to position precisely: put
the cursor anywhere before an opening bracket and press \`%\`.

It counts nesting properly, so on \`f(g(x))\` the outer pair matches the outer
pair.
      `,
      commands: [{ keys: "%", what: "jump to the matching bracket" }],
      exercises: [
        {
          id: "match-forward",
          prompt: "Jump to the closing parenthesis.",
          buffer: ["call(a, b)"],
          cursor: { line: 0, col: 4 },
          goal: { kind: "cursor", at: { line: 0, col: 9 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "%",
          par: 1,
        },
        {
          id: "match-nested",
          prompt: "From the outer opening bracket, jump to its partner.",
          buffer: ["f(g(x))"],
          cursor: { line: 0, col: 1 },
          goal: { kind: "cursor", at: { line: 0, col: 6 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "%",
          par: 1,
        },
        {
          id: "match-braces",
          prompt: "Jump from the opening brace to the closing one.",
          buffer: ["function run() {", "  work();", "}"],
          cursor: { line: 0, col: 15 },
          goal: { kind: "cursor", at: { line: 2, col: 0 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 2 },
          solution: "%",
          par: 1,
        },
      ],
    },

    {
      slug: "counted-motions",
      title: "Counts on motions",
      keys: "3w  2f,",
      summary: "The grammar starts to show.",
      skills: ["counts", "word-motions"],
      prose: `
Every motion you have learned takes a count, and it means what you would guess:
\`3w\` moves three words, \`2}\` skips two paragraphs, \`2f,\` finds the second comma.

This is the first half of Vim's grammar. The second half arrives in the next
tier, when operators learn to take a motion as their target — and because counts
already work on motions, \`d3w\` needs no new rule to mean "delete three words".

That composability is the actual argument for Vim. There is no separate
"delete three words" command to memorise; there is \`d\`, there is \`w\`, and there
are numbers.
      `,
      commands: [
        { keys: "{n}w", what: "forward n words" },
        { keys: "{n}f{char}", what: "to the nth occurrence of {char}" },
      ],
      exercises: [
        {
          id: "count-words",
          prompt: 'Reach "fourth" in one command.',
          buffer: ["first second third fourth"],
          goal: { kind: "cursor", at: { line: 0, col: 19 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 3 },
          solution: "3w",
          par: 2,
        },
        {
          id: "count-back",
          prompt: 'Move back to "second" in one command.',
          buffer: ["first second third fourth"],
          cursor: { line: 0, col: 19 },
          goal: { kind: "cursor", at: { line: 0, col: 6 } },
          constraints: { forbiddenKeys: ARROWS, maxKeystrokes: 3 },
          solution: "2b",
          par: 2,
        },
      ],
    },
  ],
};
