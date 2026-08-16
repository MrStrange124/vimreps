# vim·reps

An interactive Vim trainer: a course of lessons from modes through macros, each
backed by a real editor pane where you type actual Vim commands and are graded on
**both the result and the keystrokes you used**. Plus generated drills, keystroke
golf, a cheatsheet, and a progress dashboard.

Nothing is gated. Every lesson and every mode is available.

```bash
npm install     # uses .npmrc to reach the public registry
npm run dev     # http://localhost:3000
npm test        # 301 tests
npm run build
```

## What makes it a teacher rather than a toy

Grading splits in two:

> The **goal** is a predicate over the final state.
> The **constraint** is a regex over how you got there.

"Delete this word" carries `requiredKeys: /^\d*dw$/`, so mashing `x` five times
produces exactly the right text and still does not pass. The `hjkl` lesson sets
`forbiddenKeys` on the arrow keys. Both are one line in a lesson file.

Two rules the tests forced out, documented where they live in `src/exercise/grader.ts`:

- **Goals are judged only once the editor settles back to normal mode.** Pressing
  `A;` makes the text correct one keystroke before `Esc` makes it *done*, and
  passing early would reward leaving insert mode open.
- **A required-keys mismatch is a nudge, not a failure.** Some goals are satisfied
  by an early prefix of the intended solution, so failing on the spot would make
  the correct answer unreachable. The keystroke budget rules out brute force.

## Architecture

### The engine is a pure reducer

```ts
step(state: EditorState, key: KeyToken): StepResult
```

No DOM, no React, no I/O anywhere beneath it. That purity is load-bearing rather
than stylistic: **macros are a recorded key list re-fed through `step`**, and
**undo is a snapshot stack**. Neither needed special handling in the interpreter.

Normal and visual mode accumulate keys and re-parse the whole buffer on every
keystroke. The parser answers one of three things — finished command, valid
prefix, or nonsense — so Vim's `[count]["reg]operator[count]motion` grammar is a
pure function over a string of keys. That is also exactly what `.` and macros need
to replay.

| Module | Responsibility |
|---|---|
| `keys.ts` | `KeyboardEvent` → token (`d`, `<Esc>`, `<C-r>`) |
| `motions.ts` | Motion table, each returning inclusive / exclusive / linewise |
| `textobjects.ts` | `iw aw i( i" ip it` → a range |
| `operators.ts` | `d c y p > < gu gU ~ J` over a range, plus the register shuffle |
| `parser.ts` | The grammar, as a pure function |
| `interpreter.ts` | The reducer |
| `ex.ts` | `:` line — ranges, `:s`, `:g`, `:normal` |

The inclusive/exclusive distinction in `motions.ts` is what makes `dw` and `de`
differ, and getting it wrong is the most common way a hand-rolled Vim feels
"almost right".

`ex.ts` never imports the interpreter. `:normal` needs to run normal-mode keys, so
the interpreter registers its runner at load time and the dependency points one
way.

### Tests

Nearly all of them aim at the engine, table-driven: buffer + cursor + keys →
expected buffer + cursor. Beyond that, two conformance suites carry most of the
weight:

- **Every lesson exercise ships a reference solution**, and a test replays it
  through the real engine and asserts it passes its own grader. No unsolvable
  lesson can reach a learner, and an engine regression surfaces as a named broken
  lesson rather than as silence.
- **Every drill generator is replayed across 250 seeds**, with the same assertion.
  A generator that can emit an impossible drill fails in CI.

Writing content this way found real engine bugs — `q` could not stop a macro
recording because the parser always waited for a register name, `:g` defaulted to
the current line instead of the whole file, and `di{` left a blank line where a
block body had been.

### Content

One TypeScript module per tier under `src/content/tiers/`, each holding markdown
prose plus typed exercises. `curriculum.ts` is the single source of truth — the
sidebar, routes, cheatsheet, and dashboard all read from it, so they cannot drift.

### Interface

Cool slate ground, one warm amber accent. Mono for all chrome, system sans for
lesson prose: the interface speaks machine, the teaching speaks human.

The status bar is the signature. It renders the pending command buffer as it
assembles, so typing `d` then `2` then `w` shows `d`, `d2`, `d2w` waiting and
firing. Vim's grammar is invisible in a real terminal, and watching an operator
sit there waiting for its motion is what makes verb-plus-noun land.

Only the slug crosses into the client on a lesson route: exercises carry `RegExp`
constraints and predicate goals, and neither survives serialisation out of a
server component, so the client resolves the lesson from the curriculum itself.

### Progress

One versioned JSON blob in `localStorage`, no accounts and no backend. Every read
is guarded — `localStorage` throws rather than returning null in private browsing.
An unrecognised version is discarded rather than migrated, so a schema change
cannot leave a half-readable record behind.

## Notes

- `.npmrc` pins the public npm registry. Without it, npm here resolves an internal
  corporate registry that is unreachable off-VPN and every install stalls on DNS
  retries.
- The engine implements the subset the curriculum teaches, correctly. It is not a
  complete Vim, and does not pretend to be.
