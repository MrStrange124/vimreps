import type { Tier } from "../types";

export const textobjects: Tier = {
  id: "textobjects",
  title: "Text objects",
  blurb:
    "Act on a thing rather than on a direction. The point where Vim stops feeling like a game of cursor golf.",
  lessons: [
    {
      slug: "inner-and-around",
      title: "Inner and around",
      keys: "iw  aw",
      summary: "Operate on a word without standing at its start.",
      skills: ["textobjects"],
      prose: `
Motions describe a **direction**: from here to there. Text objects describe a
**thing**: this word, these brackets, this paragraph. They can only be used with
an operator, and they do not care where in the object the cursor sits.

\`diw\` deletes the word under the cursor from anywhere inside it. Compare that
with \`dw\`, which deletes from the cursor **forward** — so on the "r" of "world"
it leaves "wo" behind. Text objects remove the positioning step entirely.

Every object comes in two flavours:

- \`i\` — **inner**: just the thing itself
- \`a\` — **around**: the thing plus its surroundings

For a word, "around" means the trailing whitespace as well. So \`diw\` on a word in
a list leaves a double space; \`daw\` leaves the list correctly spaced.

\`ciw\` is the single most useful command in this course. Cursor anywhere in a
word, \`ciw\`, type the replacement. Learn this one properly.
      `,
      commands: [
        { keys: "iw", what: "inner word" },
        { keys: "aw", what: "a word, plus surrounding whitespace" },
        { keys: "diw", what: "delete the word under the cursor" },
        { keys: "ciw", what: "change the word under the cursor" },
      ],
      exercises: [
        {
          id: "change-inner-word",
          prompt: 'The cursor is in the middle of "wrong". Replace it with "right".',
          buffer: ["a wrong answer"],
          cursor: { line: 0, col: 4 },
          goal: { kind: "buffer", lines: ["a right answer"] },
          constraints: {
            requiredKeys: /^ciwright<Esc>$/,
            requiredKeysMessage:
              "`ciw` works from anywhere inside the word — no need to travel to its start.",
          },
          solution: "ciwright<Esc>",
          par: 9,
        },
        {
          id: "delete-inner-word",
          prompt: 'Delete "middle", leaving both spaces behind.',
          buffer: ["first middle last"],
          cursor: { line: 0, col: 8 },
          goal: { kind: "buffer", lines: ["first  last"] },
          constraints: { requiredKeys: /^diw$/ },
          solution: "diw",
          par: 3,
        },
        {
          id: "delete-around-word",
          prompt: 'Delete "middle" and its trailing space, leaving the spacing correct.',
          buffer: ["first middle last"],
          cursor: { line: 0, col: 8 },
          goal: { kind: "buffer", lines: ["first last"] },
          constraints: {
            requiredKeys: /^daw$/,
            requiredKeysMessage: "`aw` takes the word and the whitespace with it.",
          },
          solution: "daw",
          par: 3,
        },
      ],
    },

    {
      slug: "bracket-objects",
      title: "Inside brackets",
      keys: "i(  a(",
      summary: "Replace an argument list without selecting it.",
      skills: ["textobjects"],
      prose: `
\`i(\` is everything between a pair of parentheses. \`a(\` includes the parentheses
themselves.

The cursor can be anywhere inside the pair — or on either bracket — and Vim
finds the enclosing pair for you. Nesting is handled properly: inside
\`f(g(x))\`, \`di(\` removes the innermost contents.

\`ci(\` is how you rewrite a function's arguments. \`di(\` is how you empty them.

\`i)\` and \`a)\` mean exactly the same thing as \`i(\` and \`a(\` — use whichever
bracket your fingers reach first. \`ib\` and \`ab\` also work, if you prefer letters.
      `,
      commands: [
        { keys: "i(", what: "inside the parentheses" },
        { keys: "a(", what: "the parentheses and their contents" },
        { keys: "ci(", what: "change what is inside the parentheses" },
      ],
      exercises: [
        {
          id: "change-inside-parens",
          prompt: 'Replace the arguments with "x, y".',
          buffer: ["draw(old, args, here)"],
          cursor: { line: 0, col: 8 },
          goal: { kind: "buffer", lines: ["draw(x, y)"] },
          constraints: {
            requiredKeys: /^ci\(x, y<Esc>$/,
            requiredKeysMessage: "`ci(` clears everything between the brackets in one command.",
          },
          solution: "ci(x, y<Esc>",
          par: 8,
        },
        {
          id: "delete-inside-parens",
          prompt: "Empty the argument list, keeping the brackets.",
          buffer: ["reset(a, b, c)"],
          cursor: { line: 0, col: 9 },
          goal: { kind: "buffer", lines: ["reset()"] },
          constraints: { requiredKeys: /^di[()b]$/ },
          solution: "di(",
          par: 3,
        },
        {
          id: "delete-around-parens",
          prompt: "Remove the brackets and everything in them.",
          buffer: ["value(unwanted)"],
          cursor: { line: 0, col: 8 },
          goal: { kind: "buffer", lines: ["value"] },
          constraints: { requiredKeys: /^da[()b]$/ },
          solution: "da(",
          par: 3,
        },
        {
          id: "nested-parens",
          prompt: "The cursor is inside the inner call. Empty only the inner brackets.",
          buffer: ["outer(inner(deep))"],
          cursor: { line: 0, col: 13 },
          goal: { kind: "buffer", lines: ["outer(inner())"] },
          solution: "di(",
          par: 3,
          hint: "Vim finds the nearest enclosing pair.",
        },
      ],
    },

    {
      slug: "quote-objects",
      title: "Inside quotes",
      keys: 'i"  a"',
      summary: "Rewrite a string in three keystrokes.",
      skills: ["textobjects"],
      prose: `
\`i"\` is the contents of a double-quoted string; \`a"\` includes the quotes. \`i'\` and
the single-quote and backtick versions work the same way for those quote characters.

\`ci"\` is the command. Cursor anywhere on the line at or before the string, type
\`ci"\`, and you are inserting inside empty quotes.

Quote objects only look at the current line, and they pair quotes from the left.
That is a simplification, and occasionally it guesses wrong on a line with an
apostrophe in it — but for the ninety-nine percent case it is exactly right.
      `,
      commands: [
        { keys: 'i"', what: "inside the double quotes" },
        { keys: 'a"', what: "the quoted string including its quotes" },
        { keys: "i'", what: "inside the single quotes" },
      ],
      exercises: [
        {
          id: "change-inside-quotes",
          prompt: 'Change the greeting to "goodbye".',
          buffer: ['const msg = "hello"'],
          cursor: { line: 0, col: 14 },
          goal: { kind: "buffer", lines: ['const msg = "goodbye"'] },
          constraints: {
            requiredKeys: /^ci"goodbye<Esc>$/,
            requiredKeysMessage: '`ci"` clears the string and leaves you typing inside the quotes.',
          },
          solution: 'ci"goodbye<Esc>',
          par: 11,
        },
        {
          id: "delete-inside-single-quotes",
          prompt: "Empty the single-quoted string.",
          buffer: ["load('path/to/file')"],
          cursor: { line: 0, col: 8 },
          goal: { kind: "buffer", lines: ["load('')"] },
          constraints: { requiredKeys: /^di'$/ },
          solution: "di'",
          par: 3,
        },
      ],
    },

    {
      slug: "block-objects",
      title: "Inside blocks",
      keys: "i{  a{",
      summary: "A whole function body as one object.",
      skills: ["textobjects"],
      prose: `
\`i{\` is everything between a pair of braces, across as many lines as it spans.
\`a{\` includes the braces.

Because it works across lines, \`di{\` empties a function body from anywhere inside
it, and \`ya{\` copies a whole block including its braces. On real code this is
the difference between a single command and a careful visual selection.

\`i[\` and \`i<\` do the same for square and angle brackets, which covers arrays,
generics, and JSX attributes.
      `,
      commands: [
        { keys: "i{", what: "inside the braces" },
        { keys: "a{", what: "the braces and their contents" },
        { keys: "i[", what: "inside the square brackets" },
      ],
      exercises: [
        {
          id: "delete-inside-braces",
          prompt: "Empty the object literal, keeping the braces.",
          buffer: ["const config = { debug: true }"],
          cursor: { line: 0, col: 20 },
          goal: { kind: "buffer", lines: ["const config = {}"] },
          constraints: { requiredKeys: /^di[{}B]$/ },
          solution: "di{",
          par: 3,
        },
        {
          id: "delete-inside-array",
          prompt: "Empty the array.",
          buffer: ["const items = [1, 2, 3]"],
          cursor: { line: 0, col: 16 },
          goal: { kind: "buffer", lines: ["const items = []"] },
          constraints: { requiredKeys: /^di[[\]]$/ },
          solution: "di[",
          par: 3,
        },
      ],
    },

    {
      slug: "paragraph-objects",
      title: "Whole paragraphs",
      keys: "ip  ap",
      summary: "Grab a block of lines at once.",
      skills: ["textobjects"],
      prose: `
\`ip\` is the run of non-blank lines the cursor is in. \`ap\` also takes the blank
lines that follow it.

For prose this is a paragraph. For code it is usually a function or a group of
related statements, since blank lines are how we separate those anyway.

\`dap\` is the fastest way to delete a block of code and leave the spacing around
it intact. \`yip\` copies a block without its trailing blank line.
      `,
      commands: [
        { keys: "ip", what: "the paragraph, without surrounding blank lines" },
        { keys: "ap", what: "the paragraph and the blank lines after it" },
      ],
      exercises: [
        {
          id: "delete-inner-paragraph",
          prompt: "Delete the first block, leaving the blank line behind.",
          buffer: ["first line", "second line", "", "later block"],
          goal: { kind: "buffer", lines: ["", "later block"] },
          constraints: { requiredKeys: /^dip$/ },
          solution: "dip",
          par: 3,
        },
        {
          id: "yank-paragraph",
          prompt: "Copy the whole first block, then put a copy below the blank line.",
          buffer: ["alpha", "beta", "", "gamma"],
          goal: {
            kind: "buffer",
            lines: ["alpha", "beta", "", "alpha", "beta", "gamma"],
          },
          solution: "yipjjp",
          par: 6,
          hint: "`yip` copies the block; move down onto the blank line and `p` puts it below.",
        },
      ],
    },

    {
      slug: "tag-objects",
      title: "Inside tags",
      keys: "it  at",
      summary: "For anyone who touches HTML.",
      skills: ["textobjects"],
      prose: `
\`it\` is the content between an opening and closing tag. \`at\` is the tag pair and
everything in it.

Vim matches tags properly, including nesting, so from inside a deeply nested
element \`dit\` empties the element you are actually in.

\`cit\` is how you rewrite the text of a link or a heading without touching the
markup around it.
      `,
      commands: [
        { keys: "it", what: "inside the surrounding tag" },
        { keys: "at", what: "the tag pair and its contents" },
      ],
      exercises: [
        {
          id: "change-inside-tag",
          prompt: "Change the heading text to Welcome.",
          buffer: ["<h1>Untitled</h1>"],
          cursor: { line: 0, col: 6 },
          goal: { kind: "buffer", lines: ["<h1>Welcome</h1>"] },
          constraints: {
            requiredKeys: /^citWelcome<Esc>$/,
            requiredKeysMessage: "`cit` replaces the tag's contents and leaves the tags alone.",
          },
          solution: "citWelcome<Esc>",
          par: 11,
        },
        {
          id: "delete-around-tag",
          prompt: "Remove the emphasis element entirely, tags and all.",
          buffer: ["keep <em>drop</em> keep"],
          cursor: { line: 0, col: 10 },
          goal: { kind: "buffer", lines: ["keep  keep"] },
          constraints: { requiredKeys: /^dat$/ },
          solution: "dat",
          par: 3,
        },
      ],
    },
  ],
};
