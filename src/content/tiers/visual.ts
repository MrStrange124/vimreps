import type { Tier } from "../types";

export const visual: Tier = {
  id: "visual",
  title: "Visual mode",
  blurb:
    "Select first, act second — for the times when you want to see the damage before you do it.",
  lessons: [
    {
      slug: "visual-mode",
      title: "Selecting text",
      keys: "v",
      summary: "Highlight, then operate.",
      skills: ["visual"],
      prose: `
\`v\` enters visual mode. Move around with any motion and the text between where
you started and where you are is selected. Then press an operator — \`d\`, \`y\`, \`c\`
— and it acts on the selection instead of asking for a motion.

Visual mode is the inverse of the operator grammar: instead of "verb then noun",
it is "noun then verb". Everything you can do with \`d{motion}\` you can also do by
selecting and pressing \`d\`.

So which should you use? Operators are faster and repeatable with \`.\`. Visual
mode is better when you are not sure exactly how far the change should reach —
you can see the selection grow and adjust before committing. Experienced users
lean on operators for known edits and visual mode for exploratory ones.

\`Esc\` leaves visual mode without doing anything.
      `,
      commands: [
        { keys: "v", what: "start a character-wise selection" },
        { keys: "Esc", what: "cancel the selection" },
      ],
      exercises: [
        {
          id: "visual-delete",
          prompt: "Select the first three characters and delete them.",
          buffer: ["abcdef"],
          goal: { kind: "buffer", lines: ["def"] },
          constraints: {
            requiredKeys: /^v.*d$/,
            requiredKeysMessage: "Start with `v`, extend the selection, then press `d`.",
          },
          solution: "vlld",
          par: 4,
        },
        {
          id: "visual-yank",
          prompt: 'Select "ab", copy it, then put a copy at the end of the line.',
          buffer: ["abc"],
          goal: { kind: "buffer", lines: ["abcab"] },
          solution: "vly$p",
          par: 5,
          hint: "`vly` selects and yanks, `$` goes to the end, `p` puts after the cursor.",
        },
      ],
    },

    {
      slug: "visual-line-mode",
      title: "Selecting lines",
      keys: "V",
      summary: "The version you will actually use most.",
      skills: ["visual"],
      prose: `
\`V\` selects whole lines at a time. Move up or down and the selection grows by
lines, never by characters.

This is the most-used visual mode by a distance, because most of the time when
you want to see a selection you are working with lines: moving a block of code,
deleting a few statements, indenting a section.

\`V\` then \`j\` a few times then \`d\` is the thing your hands will learn first. \`>\`
on a line selection indents it, which is the tidiest way to re-indent a block.
      `,
      commands: [
        { keys: "V", what: "start a line-wise selection" },
        { keys: "V then >", what: "indent the selected lines" },
      ],
      exercises: [
        {
          id: "visual-line-delete",
          prompt: "Select the first two lines and delete them.",
          buffer: ["drop", "drop", "keep"],
          goal: { kind: "buffer", lines: ["keep"] },
          constraints: {
            requiredKeys: /^V.*d$/,
            requiredKeysMessage: "`V` selects whole lines; extend with `j`, then `d`.",
          },
          solution: "Vjd",
          par: 3,
        },
        {
          id: "visual-line-indent",
          prompt: "Select all three lines and indent them.",
          buffer: ["one", "two", "three"],
          goal: { kind: "buffer", lines: ["  one", "  two", "  three"] },
          constraints: { requiredKeys: /^V.*>$/ },
          solution: "Vjj>",
          par: 4,
        },
      ],
    },

    {
      slug: "adjusting-a-selection",
      title: "Adjusting a selection",
      keys: "o",
      summary: "Change your mind about which end to grow.",
      skills: ["visual"],
      prose: `
Once you are in visual mode, the selection has a fixed end where you started and
a moving end at the cursor. If you selected in the wrong direction, \`o\` swaps
them — the cursor jumps to the other end, and now that is the one that moves.

This saves you cancelling and starting over, which is exactly the sort of small
friction that decides whether you actually use a feature.
      `,
      commands: [{ keys: "o", what: "jump to the other end of the selection" }],
      exercises: [
        {
          id: "visual-swap-ends",
          prompt:
            'Select "bcde" and delete it — you will have to grow the selection backwards to reach the "b".',
          buffer: ["abcdef"],
          cursor: { line: 0, col: 2 },
          goal: { kind: "buffer", lines: ["af"] },
          constraints: { requiredKeys: /^v.*o.*d$/ },
          solution: "vllohd",
          par: 6,
          hint: "Select forward to the `e`, press `o` to move to the far end, then `h`.",
        },
      ],
    },

    {
      slug: "visual-text-objects",
      title: "Selecting objects",
      keys: "viw  vi(",
      summary: "Text objects work in visual mode too.",
      skills: ["visual", "textobjects"],
      prose: `
Text objects are not limited to operators. In visual mode, \`iw\` selects the word
under the cursor, \`i(\` selects inside the brackets, and so on for every object
you learned.

This is the discoverable way to use objects when you are not yet sure they will
grab what you expect: press \`viw\`, look at what highlighted, then press the
operator. Once you trust them, drop the \`v\` and go straight to \`diw\`.

Pressing the object again from within a selection expands it, so \`vi(\` then
\`i(\` climbs out to the next pair of brackets.
      `,
      commands: [
        { keys: "viw", what: "select the word under the cursor" },
        { keys: "vi(", what: "select inside the brackets" },
        { keys: "vip", what: "select the paragraph" },
      ],
      exercises: [
        {
          id: "visual-select-word",
          prompt: 'Select the word "bar" and delete it.',
          buffer: ["foo bar"],
          goal: { kind: "buffer", lines: ["foo "] },
          constraints: { requiredKeys: /^w?viwd$/ },
          solution: "wviwd",
          par: 5,
        },
        {
          id: "visual-select-parens",
          prompt: "Select what is inside the brackets and change it to nothing.",
          buffer: ["call(remove me)"],
          cursor: { line: 0, col: 8 },
          goal: { kind: "buffer", lines: ["call()"] },
          solution: "vi(d",
          par: 4,
        },
      ],
    },

    {
      slug: "visual-block-mode",
      title: "Selecting a rectangle",
      keys: "Ctrl-v",
      summary: "Columns, not lines.",
      skills: ["visual-block"],
      prose: `
\`Ctrl-v\` selects a rectangle. Move down and right and you get a block spanning
several lines and several columns — the only selection mode that does not follow
the text's own shape.

This is the tool for column-shaped problems: a leading character on every line,
a column in an aligned table, a trailing comma. Nothing else in Vim does this
nearly as well.

Operators apply to the rectangle: \`d\` cuts the block out of every line at once.
      `,
      commands: [
        { keys: "Ctrl-v", what: "start a block selection" },
        { keys: "Ctrl-v then d", what: "delete the rectangle" },
      ],
      exercises: [
        {
          id: "block-delete",
          prompt: "Delete the middle two columns from all three lines.",
          buffer: ["abcd", "efgh", "ijkl"],
          goal: { kind: "buffer", lines: ["ad", "eh", "il"] },
          constraints: { requiredKeys: /<C-v>.*d$/ },
          solution: "l<C-v>jjld",
          par: 6,
        },
      ],
    },

    {
      slug: "block-insert",
      title: "Typing on many lines at once",
      keys: "Ctrl-v I  A",
      summary: "The trick worth learning visual block for.",
      skills: ["visual-block"],
      prose: `
Make a block selection, then:

- \`I\` — insert at the left edge of the block, on **every** line
- \`A\` — append at the right edge, on every line

You type on the first line only, and the text appears on the rest when you press
\`Esc\`. It looks like nothing is happening until it does.

This is how you comment out ten lines, or add a trailing comma to a column of
values, without a macro and without a substitution. \`Ctrl-v\`, \`j\` down the block,
\`I\`, type \`// \`, \`Esc\`.

One difference between the two: \`A\` will pad short lines with spaces so the text
lands in the same column, while \`I\` skips lines too short to reach. That is
almost always the behaviour you want from each.
      `,
      commands: [
        { keys: "Ctrl-v then I", what: "insert on every line of the block" },
        { keys: "Ctrl-v then A", what: "append on every line of the block" },
      ],
      exercises: [
        {
          id: "block-insert-prefix",
          prompt: "Comment out all three lines by putting `// ` in front of each.",
          buffer: ["one();", "two();", "six();"],
          goal: {
            kind: "buffer",
            lines: ["// one();", "// two();", "// six();"],
          },
          constraints: {
            requiredKeys: /<C-v>.*I\/\/ <Esc>$/,
            requiredKeysMessage:
              "Select the block with `Ctrl-v` and `j`, then `I`, type `// `, and press `Esc`.",
          },
          solution: "<C-v>jjI// <Esc>",
          par: 9,
        },
        {
          id: "block-append-suffix",
          prompt: "Add a semicolon to the end of all three lines.",
          buffer: ["a", "b", "c"],
          goal: { kind: "buffer", lines: ["a;", "b;", "c;"] },
          constraints: { requiredKeys: /<C-v>.*A;<Esc>$/ },
          solution: "<C-v>jjA;<Esc>",
          par: 7,
        },
      ],
    },
  ],
};
