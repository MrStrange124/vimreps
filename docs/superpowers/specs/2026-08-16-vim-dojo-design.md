# Vim Dojo — Design

**Date:** 2026-08-16
**Status:** Approved, in implementation

## What this is

An interactive browser-based Vim trainer: a curriculum of ~70 lessons that teach Vim
from modes through macros, each backed by a real editor pane where the learner types
actual Vim commands and is graded on both the result and the keystrokes used. Plus
randomized drills, keystroke-golf challenges, a generated cheatsheet, and a progress
dashboard.

It is inspired by the shape of VimHero (sidebar curriculum, editor pane, keystroke
grading) but all lesson prose, exercises, curriculum ordering, engine, and visual design
are original to this project. Nothing is gated — every lesson and mode is available.

## Non-goals

- No accounts, no backend, no database. Progress is local to the browser.
- Not a full Vim implementation. The engine implements the subset the curriculum
  teaches, correctly, and refuses to pretend otherwise.
- No plugin system, no user-authored lessons, no multiplayer.

## Stack

Next.js 15 (App Router) + React 19 + Tailwind v4 + TypeScript. Vitest for tests.
Static-exportable: no server-side data, no API routes.

## Architecture

### Layer 1 — the engine (`src/engine/`)

Pure TypeScript, no DOM, no React, no I/O. The entire editor is one function:

```ts
step(state: EditorState, key: KeyToken): StepResult
```

`EditorState` is an immutable snapshot:

```ts
type EditorState = {
  lines: string[]
  cursor: Position            // { line, col }
  mode: Mode                  // normal | insert | visual | visual-line | visual-block | command | replace
  pending: Pending            // count, register, operator, awaiting-char
  registers: Registers        // { [name]: { text, linewise } }
  marks: Record<string, Position>
  visualAnchor: Position | null
  lastSearch: Search | null
  lastFind: Find | null       // for ; and ,
  lastChange: KeyToken[]      // for .
  undo: UndoStack
  cmdline: string             // : / ? buffer
  macros: MacroState
  desiredCol: number          // sticky column for j/k
}
```

Modules:

| Module | Responsibility |
|---|---|
| `keys.ts` | `KeyboardEvent` → `KeyToken` (`d`, `<Esc>`, `<C-r>`, `<CR>`, `<Space>`) |
| `state.ts` | Types + `createState()` |
| `text.ts` | Buffer primitives: char classes, line access, position clamping |
| `motions.ts` | Motion table. Each returns `{ target, kind }` where kind is inclusive / exclusive / linewise — the distinction that makes `dw` differ from `de` |
| `textobjects.ts` | `iw aw i( a( i" a" ip ap it at` → a range |
| `operators.ts` | `d c y p > < gu gU ~ J` applied to a range |
| `interpreter.ts` | The state machine over Vim's grammar: `[count][reg] op [count] motion` |
| `ex.ts` | `:` command line — ranges, `:s`, `:g`, `:d`, `:y`, `:normal` |
| `undo.ts` | Snapshot stack, change coalescing for insert sessions |
| `macros.ts` | Record to register, replay by re-feeding keys through `step` |

Purity buys two features for free: **macros** are a recorded key list re-fed through
`step`, and **undo** is a snapshot stack. Neither needs special handling in the
interpreter.

### Layer 2 — exercises and grading (`src/exercise/`)

```ts
type Exercise = {
  id: string
  prompt: string
  buffer: string[]
  cursor: Position
  goal: Goal
  constraints?: Constraints
  par?: number
  solution: string          // reference key sequence, used by tests
  hint?: string
}

type Goal =
  | { kind: 'buffer'; lines: string[] }
  | { kind: 'cursor'; at: Position }
  | { kind: 'bufferAndCursor'; lines: string[]; at: Position }
  | { kind: 'register'; name: string; text: string }
  | { kind: 'mode'; mode: Mode }
  | { kind: 'predicate'; test: (s: EditorState) => boolean }

type Constraints = {
  requiredKeys?: RegExp      // regex over the recorded keystroke log
  forbiddenKeys?: KeyToken[]
  maxKeystrokes?: number
}
```

The grading rule, stated once:

> **The goal is a predicate over the final state. The constraint is a regex over how you
> got there.**

That is what makes this a teacher rather than a puzzle. "Delete this word" carries
`requiredKeys: /^\d*dw$/`, so pressing `x` five times produces the correct text and
still fails, with a message explaining why. The hjkl lesson sets
`forbiddenKeys: ['<Left>','<Right>','<Up>','<Down>']`.

Grading runs after every keystroke. Success reports keystrokes used against `par`.

### Layer 3 — content (`src/content/`)

One TypeScript module per lesson: markdown prose plus a typed exercise array. A single
`curriculum.ts` index lists tiers and lessons and is the only source of truth — the
sidebar, routing, prerequisites, cheatsheet cross-links, and the progress dashboard all
read from it, so they cannot drift apart.

Tiers:

1. **Foundations** — modes, `hjkl`, insert/append, escape, `x`, `u`
2. **Motions** — `w b e W B E`, `0 ^ $`, `gg G {n}G`, `f t F T ; ,`, `{ }`, `%`
3. **Operators** — `d c y p P`, operator+motion grammar, counts, `dd cc yy`, `D C Y`, `.`
4. **Search** — `/ ? n N * #`, `:noh`
5. **Text objects** — `iw aw`, `i( a(`, `i" a"`, `i{ a{`, `ip ap`, `it at`
6. **Visual mode** — `v V <C-v>`, operators in visual, `o`, block insert `I A`
7. **Power** — registers (`"a`, `"0`, `"+`), marks (`m` `` ` `` `'`), macros (`q @ @@`),
   ex commands (`:s` with ranges and flags, `:g`, `:norm`), `>> <<`, `J`, `gu gU`

### Layer 4 — UI (`src/app/`, `src/components/`)

Dark IDE chrome: file-tree-style lesson sidebar, tabbed content pane, status bar along
the bottom showing mode, pending keys, lesson position, and exercise progress dots.

| Route | Purpose |
|---|---|
| `/` | Landing: what it is, start button, tier overview |
| `/lessons/[slug]` | Prose + editor + exercise stepper |
| `/practice` | Randomized drills over unlocked skills |
| `/golf` | Challenge list |
| `/golf/[slug]` | One golf challenge |
| `/cheatsheet` | Generated from the engine command table |
| `/progress` | Completion, efficiency, streak heatmap |

The editor component owns key capture (`keydown`, `preventDefault` on everything the
engine claims), renders lines with a block cursor and visual-selection highlight, and
delegates every decision to the engine.

### Layer 5 — progress (`src/progress/`)

A single versioned JSON blob in `localStorage` under `vim-dojo:progress:v1`:

```ts
type Progress = {
  version: 1
  lessons: Record<string, { completed: boolean; bestKeystrokes: Record<string, number> }>
  drills: { attempts: number; correct: number; perSkill: Record<string, { seen: number; failed: number }> }
  golf: Record<string, number>       // best score
  days: string[]                     // ISO dates practised, for the streak heatmap
}
```

Unknown or newer `version` is discarded rather than migrated, so a schema change cannot
corrupt a session. Reads are guarded — `localStorage` throws in private browsing.

### Drill generation

Each skill exposes `generate(rng: Rng): Exercise`. The RNG is seeded so a drill is
reproducible and shareable by URL. The drill scheduler weights toward skills with the
worst recent accuracy, falling back to uniform over unlocked skills when there is no
history.

## Testing

Vitest, weighted heavily toward the engine.

- **Table-driven engine tests.** `{ buffer, cursor, keys, expected }` rows per module.
  Motions, operators, text objects, counts, registers, undo, macros, ex commands.
- **Exercise conformance.** Every exercise ships a `solution` key sequence; a single
  test replays it through the engine and asserts the exercise passes. No unsolvable
  lesson can ship, and an engine regression surfaces as a named broken lesson rather
  than silently.
- **Curriculum integrity.** Slugs unique, prerequisites resolve, every command in the
  cheatsheet is reachable by some lesson.

## Build order

1. Engine core — state, keys, text, motions, operators, counts, undo
2. Editor React component, key capture, status line
3. Lesson shell, curriculum index, exercise runner and grader
4. Foundations + Motions + Operators content
5. Text objects, visual mode — engine then content
6. Registers, marks, macros, ex — engine then content
7. Drills, golf, cheatsheet, progress dashboard
