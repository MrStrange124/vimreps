import type { Tier } from "../types";

export const power: Tier = {
  id: "power",
  title: "Power tools",
  blurb:
    "Registers, marks, macros and the command line. This is the tier where Vim stops being a faster text editor and starts being a small programming environment for text.",
  lessons: [
    {
      slug: "registers",
      title: "Named registers",
      keys: '"a',
      summary: "More than one clipboard.",
      skills: ["registers"],
      prose: `
Every yank and delete goes into a register. By default that is the unnamed
register, which is why \`dd\` then \`p\` works — and why the next \`dd\` overwrites what
you were holding.

Prefix a command with \`"\` and a letter to use a named register instead:

- \`"ayy\` — yank this line into register **a**
- \`"ap\` — put register **a** back

Twenty-six registers means you can carry several things at once. Use a capital
letter to **append** rather than replace: \`"Ayy\` adds another line to register a,
which is a neat way to collect scattered lines before pasting them together.
      `,
      commands: [
        { keys: '"{reg}y', what: "yank into a named register" },
        { keys: '"{reg}p', what: "put from a named register" },
        { keys: '"{REG}y', what: "append to a named register" },
      ],
      exercises: [
        {
          id: "named-register",
          prompt:
            "Save the first line in register a, delete the second, then put your saved line back.",
          buffer: ["keep", "junk"],
          goal: { kind: "buffer", lines: ["keep", "keep"] },
          constraints: {
            requiredKeys: /"a/,
            requiredKeysMessage:
              'Use a named register — the plain unnamed one gets clobbered by the delete.',
          },
          solution: '"ayyjdd"ap',
          par: 10,
        },
      ],
    },

    {
      slug: "the-yank-register",
      title: "The yank register",
      keys: '"0',
      summary: "The fix for the most annoying thing in Vim.",
      skills: ["registers"],
      prose: `
Here is the classic frustration. You yank a word. You delete the word you want to
replace. You press \`p\` — and you get back the text you just deleted, because the
delete overwrote the unnamed register.

Register \`0\` solves this. **Yanks go into register 0; deletes do not.** So the
last thing you deliberately copied is always sitting in \`"0\`, no matter how much
you have deleted since.

\`"0p\` is the paste you actually wanted. It is worth learning this the moment you
hit the problem, which will be soon.
      `,
      commands: [
        { keys: '"0p', what: "put the last yanked text, ignoring deletes" },
        { keys: '"-p', what: "put the last small delete" },
      ],
      exercises: [
        {
          id: "yank-register",
          prompt:
            "Yank the first line, delete the second, then put the yanked line back with register 0.",
          buffer: ["keep me", "junk"],
          goal: { kind: "buffer", lines: ["keep me", "keep me"] },
          constraints: {
            requiredKeys: /"0p$/,
            requiredKeysMessage: 'A plain `p` would give back the deleted line. Use `"0p`.',
          },
          solution: 'yyjdd"0p',
          par: 8,
        },
      ],
    },

    {
      slug: "marks",
      title: "Marks",
      keys: "m  `",
      summary: "Drop a pin and come back to it.",
      skills: ["marks"],
      prose: `
\`m\` followed by a letter sets a mark at the cursor. A backtick followed by the
same letter jumps back to it.

Marks survive edits elsewhere in the file, so this is how you hold your place
while you go and look at something. Set \`ma\` where you are working, go read a
function at the bottom of the file, then press backtick-a to return exactly
where you were — same line, same column.

\`'a\` (with an apostrophe) jumps to the same line but to its first non-blank
character. Use the backtick when the column matters.

Marks are also motions, so \`d\` backtick \`a\` deletes from the cursor to the mark.
      `,
      commands: [
        { keys: "m{letter}", what: "set a mark" },
        { keys: "`{letter}", what: "jump to the mark, exact column" },
        { keys: "'{letter}", what: "jump to the mark's line" },
      ],
      exercises: [
        {
          id: "set-and-jump-mark",
          prompt:
            "Move down to the last line and along a few characters, drop a mark, jump to the top, then return to your mark.",
          buffer: ["alpha", "beta", "gamma delta"],
          goal: { kind: "cursor", at: { line: 2, col: 3 } },
          constraints: { requiredKeys: /m.*`/ },
          solution: "jjlllmagg`a",
          par: 11,
          hint: "`ma` sets it, `gg` goes to the top, backtick-a comes back.",
        },
      ],
    },

    {
      slug: "macros",
      title: "Macros",
      keys: "q  @",
      summary: "Record a sequence of keys and replay it.",
      skills: ["macros"],
      prose: `
\`q\` followed by a letter starts recording into that register. Everything you type
is captured. Press \`q\` again to stop. Then \`@\` and the letter replays it.

Because a macro is literally a list of keystrokes stored in a register, there is
nothing new to learn — every command you already know works inside one.

The discipline that makes macros reliable:

1. Start from a **predictable position**, usually column zero via \`0\`.
2. Do the edit with commands that do not depend on where things happen to be —
   text objects and finds, rather than counted \`l\` presses.
3. **End by moving to the next target**, usually \`j\`, so the macro can chain.

Get those right and \`@a\` works ten times in a row. Get them wrong and it works
once and then wrecks the file — at which point \`u\` puts it back and you re-record.
      `,
      commands: [
        { keys: "q{reg}", what: "start recording into a register" },
        { keys: "q", what: "stop recording" },
        { keys: "@{reg}", what: "replay the macro" },
        { keys: "@@", what: "replay the last macro again" },
      ],
      exercises: [
        {
          id: "record-and-play",
          prompt:
            "Record a macro that prefixes a line with a dash and moves down, then replay it once.",
          buffer: ["one", "two", "three"],
          goal: { kind: "buffer", lines: ["-one", "-two", "three"] },
          constraints: {
            requiredKeys: /^q.*q@/,
            requiredKeysMessage: "Record with `q{letter}` … `q`, then replay with `@{letter}`.",
          },
          solution: "qqI-<Esc>jq@q",
          par: 12,
        },
        {
          id: "macro-with-count",
          prompt: "Record the same macro, then replay it twice with a single command.",
          buffer: ["one", "two", "three", "four"],
          goal: { kind: "buffer", lines: ["-one", "-two", "-three", "four"] },
          constraints: {
            requiredKeys: /2@/,
            requiredKeysMessage: "Counts work on `@` too: `2@q`.",
          },
          solution: "qqI-<Esc>jq2@q",
          par: 13,
        },
      ],
    },

    {
      slug: "substitute",
      title: "Substitute",
      keys: ":s",
      summary: "Find and replace, with ranges.",
      skills: ["substitute"],
      prose: `
\`:s/old/new/\` replaces the first occurrence of "old" on the current line.

Add the \`g\` flag — \`:s/old/new/g\` — to replace **every** occurrence on the line.
The \`g\` stands for global-within-the-line, which is a historical wart worth just
memorising.

Add \`i\` to ignore case.

The pattern is a regular expression, so \`:s/\\s\\+$//\` strips trailing whitespace.
Vim's regex dialect escapes its groups: \`\\(\` and \`\\)\` make a group, and \`\\1\`
refers back to it in the replacement. \`&\` in the replacement means the whole
match, so \`:s/error/[&]/\` wraps it in brackets.
      `,
      commands: [
        { keys: ":s/old/new/", what: "replace the first match on this line" },
        { keys: ":s/old/new/g", what: "replace every match on this line" },
        { keys: ":s/old/new/gi", what: "replace every match, ignoring case" },
      ],
      exercises: [
        {
          id: "substitute-line",
          prompt: 'Replace the first "cat" on this line with "dog".',
          buffer: ["cat and cat"],
          goal: { kind: "buffer", lines: ["dog and cat"] },
          solution: ":s/cat/dog<CR>",
          par: 11,
        },
        {
          id: "substitute-global-line",
          prompt: 'Replace every "cat" on this line with "dog".',
          buffer: ["cat and cat"],
          goal: { kind: "buffer", lines: ["dog and dog"] },
          constraints: {
            requiredKeys: /g<CR>$/,
            requiredKeysMessage: "Add the `g` flag to catch every match on the line.",
          },
          solution: ":s/cat/dog/g<CR>",
          par: 13,
        },
        {
          id: "substitute-capture",
          prompt: 'Swap the two words using a capture group, so it reads "smith john".',
          buffer: ["john smith"],
          goal: { kind: "buffer", lines: ["smith john"] },
          solution: ":s/\\(\\w\\+\\) \\(\\w\\+\\)/\\2 \\1<CR>",
          par: 30,
          hint: "Vim escapes its groups: `\\(` and `\\)`, referred to as `\\1` and `\\2`.",
        },
      ],
    },

    {
      slug: "substitute-ranges",
      title: "Ranges",
      keys: ":%s",
      summary: "Say which lines a command applies to.",
      skills: ["substitute", "ranges"],
      prose: `
Any \`:\` command can be prefixed with a range:

- \`:%\` — the whole file
- \`:1,10\` — lines 1 to 10
- \`:.\` — the current line
- \`:$\` — the last line
- \`:'a,'b\` — from mark a to mark b

So \`:%s/old/new/g\` is the everyday find-and-replace across a file, and it is
worth reading as three separate ideas rather than one incantation: the range
\`%\`, the command \`s\`, the flag \`g\`.

Ranges work on more than substitute. \`:1,5d\` deletes the first five lines,
\`:%>\` indents the whole file.
      `,
      commands: [
        { keys: ":%s/old/new/g", what: "replace everywhere in the file" },
        { keys: ":1,10s/old/new/g", what: "replace within a line range" },
        { keys: ":{range}d", what: "delete a range of lines" },
      ],
      exercises: [
        {
          id: "substitute-file",
          prompt: 'Replace every "foo" in the file with "bar".',
          buffer: ["foo one", "two foo", "foo foo"],
          goal: { kind: "buffer", lines: ["bar one", "two bar", "bar bar"] },
          constraints: {
            requiredKeys: /^:%s/,
            requiredKeysMessage: "Use the `%` range to reach the whole file.",
          },
          solution: ":%s/foo/bar/g<CR>",
          par: 14,
        },
        {
          id: "delete-range",
          prompt: "Delete lines 2 and 3 with a single command-line command.",
          buffer: ["keep", "drop", "drop", "keep"],
          goal: { kind: "buffer", lines: ["keep", "keep"] },
          solution: ":2,3d<CR>",
          par: 7,
        },
      ],
    },

    {
      slug: "global-command",
      title: "The global command",
      keys: ":g",
      summary: "Run a command on every matching line.",
      skills: ["global"],
      prose: `
\`:g/pattern/command\` runs a command on every line matching a pattern.

\`:g/TODO/d\` deletes every line mentioning TODO. \`:g/^$/d\` removes every blank
line — that is the pattern for an empty line, and it is worth knowing.

\`:v/pattern/command\` is the inverse: run on every line **not** matching. \`:v/keep/d\`
throws away everything except the lines you wanted.

This is the sharpest tool in the editor and the easiest to regret, so make a
habit of checking what matched before you run it with \`d\`.
      `,
      commands: [
        { keys: ":g/pat/d", what: "delete every matching line" },
        { keys: ":v/pat/d", what: "delete every line that does not match" },
        { keys: ":g/^$/d", what: "delete all blank lines" },
      ],
      exercises: [
        {
          id: "global-delete",
          prompt: "Delete every line containing TODO.",
          buffer: ["real code", "TODO fix this", "more code", "TODO and this"],
          goal: { kind: "buffer", lines: ["real code", "more code"] },
          constraints: { requiredKeys: /^:g\// },
          solution: ":g/TODO/d<CR>",
          par: 12,
        },
        {
          id: "global-inverse",
          prompt: 'Keep only the lines mentioning "keep".',
          buffer: ["keep one", "drop this", "keep two", "drop that"],
          goal: { kind: "buffer", lines: ["keep one", "keep two"] },
          constraints: { requiredKeys: /^:v\// },
          solution: ":v/keep/d<CR>",
          par: 12,
        },
      ],
    },

    {
      slug: "normal-over-a-range",
      title: "Normal mode over a range",
      keys: ":normal",
      summary: "Apply a keystroke sequence to many lines.",
      skills: ["global", "macros"],
      prose: `
\`:%normal I// \` runs the normal-mode keys \`I// \` on every line of the file — the
same effect as a macro, without recording one.

This is the bridge between the command line and everything you have learned. Any
keys that work in normal mode work here, applied line by line.

Combined with \`:g\` it gets genuinely powerful: \`:g/TODO/normal A <done>\` appends
a note to every line mentioning TODO, and nothing else.
      `,
      commands: [
        { keys: ":%normal {keys}", what: "run normal-mode keys on every line" },
        { keys: ":{range}normal {keys}", what: "run them over a range" },
      ],
      exercises: [
        {
          id: "normal-over-file",
          prompt: "Put a dash in front of every line using a single command.",
          buffer: ["one", "two", "three"],
          goal: { kind: "buffer", lines: ["-one", "-two", "-three"] },
          constraints: { requiredKeys: /normal/ },
          solution: ":%normal I-<CR>",
          par: 15,
        },
      ],
    },

    {
      slug: "indent-and-join",
      title: "Indenting and joining",
      keys: ">>  <<  J",
      summary: "Two small commands you will use constantly.",
      skills: ["indent", "join"],
      prose: `
\`>>\` indents the current line, \`<<\` outdents it. With a count, \`3>>\` shifts three
lines. In visual mode, \`>\` shifts the whole selection.

\`J\` joins the line below onto the current one, putting a single space between
them and tidying up any leftover whitespace. It is much better than going to the
end of the line and pressing delete.

\`gJ\` joins without adding the space, for when you are stitching a broken string
back together.
      `,
      commands: [
        { keys: ">>", what: "indent the line" },
        { keys: "<<", what: "outdent the line" },
        { keys: "J", what: "join the next line up, with a space" },
        { keys: "gJ", what: "join without adding a space" },
      ],
      exercises: [
        {
          id: "join-lines",
          prompt: "Join the two lines into one.",
          buffer: ["hello", "world"],
          goal: { kind: "buffer", lines: ["hello world"] },
          constraints: {
            maxKeystrokes: 2,
            requiredKeys: /^J$/,
            requiredKeysMessage: "One key: `J`.",
          },
          solution: "J",
          par: 1,
        },
        {
          id: "join-without-space",
          prompt: "Join the two halves of the word with no space between them.",
          buffer: ["some", "thing"],
          goal: { kind: "buffer", lines: ["something"] },
          constraints: { requiredKeys: /^gJ$/ },
          solution: "gJ",
          par: 2,
        },
        {
          id: "indent-lines",
          prompt: "Indent all three lines with one command.",
          buffer: ["one", "two", "three"],
          goal: { kind: "buffer", lines: ["  one", "  two", "  three"] },
          constraints: { maxKeystrokes: 4, requiredKeys: /^3>>$/ },
          solution: "3>>",
          par: 3,
        },
      ],
    },

    {
      slug: "changing-case",
      title: "Changing case",
      keys: "gU  gu  ~",
      summary: "Upper, lower, and flip.",
      skills: ["case"],
      prose: `
\`gU\` and \`gu\` are operators like any other, so they take a motion: \`gUiw\`
uppercases the word under the cursor, \`guu\` lowercases the whole line.

\`~\` flips the case of the character under the cursor and moves on, which is handy
for a single wrong letter.

In visual mode, \`U\` and \`u\` do the same to the selection — worth knowing because
in visual mode \`u\` is *not* undo.
      `,
      commands: [
        { keys: "gU{motion}", what: "uppercase over the motion" },
        { keys: "gu{motion}", what: "lowercase over the motion" },
        { keys: "gUiw", what: "uppercase the word under the cursor" },
        { keys: "~", what: "flip the case of one character" },
      ],
      exercises: [
        {
          id: "uppercase-word",
          prompt: "Uppercase the constant's name.",
          buffer: ["const maxRetries = 3"],
          cursor: { line: 0, col: 8 },
          goal: { kind: "buffer", lines: ["const MAXRETRIES = 3"] },
          constraints: { requiredKeys: /^gU(iw|w|e)$/ },
          solution: "gUiw",
          par: 4,
        },
        {
          id: "lowercase-line",
          prompt: "Lowercase the whole line.",
          buffer: ["SHOUTING AT THE READER"],
          goal: { kind: "buffer", lines: ["shouting at the reader"] },
          constraints: { requiredKeys: /^(guu|gugu)$/ },
          solution: "guu",
          par: 3,
        },
      ],
    },
  ],
};
