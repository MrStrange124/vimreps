import type { Exercise } from "@/exercise/types";

/**
 * Drill generators.
 *
 * Lessons teach; drills are what make a command stick. Each generator produces a
 * fresh exercise from a seeded random number generator, so a drill is
 * reproducible from its seed — which is what lets a test replay thousands of
 * generated exercises and assert every one is solvable.
 */

export type Rng = () => number;

/** mulberry32 — small, fast, and good enough to make drills feel varied. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function pickInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

const WORDS = [
  "alpha", "bravo", "cursor", "delta", "engine", "filter", "gamma", "handler",
  "index", "juniper", "kernel", "lambda", "module", "north", "octet", "parser",
  "quartz", "render", "socket", "target", "unwind", "vector", "widget", "yield",
] as const;

const IDENTIFIERS = [
  "total", "count", "value", "result", "buffer", "config", "handler", "payload",
] as const;

function sentence(rng: Rng, length: number): string[] {
  const words: string[] = [];
  while (words.length < length) {
    const word = pick(rng, WORDS);
    if (!words.includes(word)) words.push(word);
  }
  return words;
}

function columnOf(words: string[], index: number): number {
  let col = 0;
  for (let i = 0; i < index; i++) col += words[i].length + 1;
  return col;
}

export type Generator = {
  skill: string;
  label: string;
  make: (rng: Rng) => Exercise;
};

export const GENERATORS: Generator[] = [
  {
    skill: "word-motions",
    label: "word motions",
    make: (rng) => {
      const words = sentence(rng, 5);
      const target = pickInt(rng, 1, 4);
      return {
        id: `drill-w-${words.join("-")}-${target}`,
        prompt: `Move to the start of "${words[target]}".`,
        buffer: [words.join(" ")],
        goal: { kind: "cursor", at: { line: 0, col: columnOf(words, target) } },
        constraints: {
          forbiddenKeys: ["<Left>", "<Right>", "<Up>", "<Down>"],
          maxKeystrokes: target + 2,
        },
        solution: target === 1 ? "w" : `${target}w`,
        par: target === 1 ? 1 : 2,
      };
    },
  },

  {
    skill: "word-motions",
    label: "word motions back",
    make: (rng) => {
      const words = sentence(rng, 5);
      const target = pickInt(rng, 0, 3);
      const steps = 4 - target;
      return {
        id: `drill-b-${words.join("-")}-${target}`,
        prompt: `Move back to the start of "${words[target]}".`,
        buffer: [words.join(" ")],
        cursor: { line: 0, col: columnOf(words, 4) },
        goal: { kind: "cursor", at: { line: 0, col: columnOf(words, target) } },
        constraints: {
          forbiddenKeys: ["<Left>", "<Right>", "<Up>", "<Down>"],
          maxKeystrokes: steps + 2,
        },
        solution: steps === 1 ? "b" : `${steps}b`,
        par: steps === 1 ? 1 : 2,
      };
    },
  },

  {
    skill: "find-char",
    label: "find a character",
    make: (rng) => {
      const words = sentence(rng, 4);
      const text = words.join(" ");
      // Pick a character that appears exactly once, so the target is unambiguous.
      const counts = new Map<string, number>();
      for (const char of text) counts.set(char, (counts.get(char) ?? 0) + 1);
      const unique = [...counts.entries()]
        .filter(([char, n]) => n === 1 && char !== " " && text.indexOf(char) > 0)
        .map(([char]) => char);
      const target = unique.length > 0 ? pick(rng, unique) : text[text.length - 1];
      return {
        id: `drill-f-${text}-${target}`,
        prompt: `Jump to the "${target}".`,
        buffer: [text],
        goal: { kind: "cursor", at: { line: 0, col: text.indexOf(target) } },
        constraints: {
          forbiddenKeys: ["<Left>", "<Right>", "<Up>", "<Down>"],
          maxKeystrokes: 3,
        },
        solution: `f${target}`,
        par: 2,
      };
    },
  },

  {
    skill: "delete-word",
    label: "delete a word",
    make: (rng) => {
      const words = sentence(rng, 4);
      const target = pickInt(rng, 0, 2);
      const remaining = words.filter((_, i) => i !== target);
      return {
        id: `drill-dw-${words.join("-")}-${target}`,
        prompt: `Delete "${words[target]}" and the space after it.`,
        buffer: [words.join(" ")],
        cursor: { line: 0, col: columnOf(words, target) },
        goal: { kind: "buffer", lines: [remaining.join(" ")] },
        constraints: {
          maxKeystrokes: 4,
          requiredKeys: /^\d*dw$/,
          requiredKeysMessage: "Use `dw` rather than deleting a character at a time.",
        },
        solution: "dw",
        par: 2,
      };
    },
  },

  {
    skill: "textobjects",
    label: "change a word in place",
    make: (rng) => {
      const words = sentence(rng, 4);
      const target = pickInt(rng, 0, 3);
      const replacement = pick(rng, IDENTIFIERS);
      const inside = columnOf(words, target) + Math.min(2, words[target].length - 1);
      const after = [...words];
      after[target] = replacement;
      return {
        id: `drill-ciw-${words.join("-")}-${target}-${replacement}`,
        prompt: `Replace "${words[target]}" with "${replacement}" — the cursor is already inside it.`,
        buffer: [words.join(" ")],
        cursor: { line: 0, col: inside },
        goal: { kind: "buffer", lines: [after.join(" ")] },
        constraints: {
          requiredKeys: new RegExp(`^ciw${replacement}<Esc>$`),
          requiredKeysMessage: "`ciw` works from anywhere inside the word.",
        },
        solution: `ciw${replacement}<Esc>`,
        par: replacement.length + 4,
      };
    },
  },

  {
    skill: "textobjects",
    label: "empty the brackets",
    make: (rng) => {
      const name = pick(rng, IDENTIFIERS);
      const args = sentence(rng, 2).join(", ");
      const text = `${name}(${args})`;
      return {
        id: `drill-dip-${text}`,
        prompt: "Empty the argument list, keeping the brackets.",
        buffer: [text],
        cursor: { line: 0, col: name.length + 2 },
        goal: { kind: "buffer", lines: [`${name}()`] },
        constraints: { maxKeystrokes: 5, requiredKeys: /^di[()b]$/ },
        solution: "di(",
        par: 3,
      };
    },
  },

  {
    skill: "textobjects",
    label: "rewrite a string",
    make: (rng) => {
      const name = pick(rng, IDENTIFIERS);
      const before = pick(rng, WORDS);
      const after = pick(rng, WORDS);
      return {
        id: `drill-ciq-${name}-${before}-${after}`,
        prompt: `Change the string to "${after}".`,
        buffer: [`const ${name} = "${before}"`],
        cursor: { line: 0, col: 9 + name.length },
        goal: { kind: "buffer", lines: [`const ${name} = "${after}"`] },
        constraints: { requiredKeys: new RegExp(`^ci"${after}<Esc>$`) },
        solution: `ci"${after}<Esc>`,
        par: after.length + 4,
      };
    },
  },

  {
    skill: "linewise",
    label: "delete a line",
    make: (rng) => {
      const lines = sentence(rng, 4);
      const target = pickInt(rng, 0, 3);
      return {
        id: `drill-dd-${lines.join("-")}-${target}`,
        prompt: `Delete the line reading "${lines[target]}".`,
        buffer: [...lines],
        cursor: { line: target, col: 0 },
        goal: { kind: "buffer", lines: lines.filter((_, i) => i !== target) },
        constraints: { maxKeystrokes: 4, requiredKeys: /^\d*dd$/ },
        solution: "dd",
        par: 2,
      };
    },
  },

  {
    skill: "linewise",
    label: "duplicate a line",
    make: (rng) => {
      const lines = sentence(rng, 3);
      const target = pickInt(rng, 0, 2);
      const after = [...lines];
      after.splice(target + 1, 0, lines[target]);
      return {
        id: `drill-yyp-${lines.join("-")}-${target}`,
        prompt: `Duplicate the line reading "${lines[target]}".`,
        buffer: [...lines],
        cursor: { line: target, col: 0 },
        goal: { kind: "buffer", lines: after },
        constraints: { maxKeystrokes: 5, requiredKeys: /^yyp$/ },
        solution: "yyp",
        par: 3,
      };
    },
  },

  {
    skill: "join",
    label: "join two lines",
    make: (rng) => {
      const a = pick(rng, WORDS);
      const b = pick(rng, WORDS);
      return {
        id: `drill-J-${a}-${b}`,
        prompt: "Join the two lines with a single space between them.",
        buffer: [a, b],
        goal: { kind: "buffer", lines: [`${a} ${b}`] },
        constraints: { maxKeystrokes: 2, requiredKeys: /^J$/ },
        solution: "J",
        par: 1,
      };
    },
  },

  {
    skill: "line-motions",
    label: "end of the line",
    make: (rng) => {
      const words = sentence(rng, 4);
      const text = `    ${words.join(" ")}`;
      return {
        id: `drill-eol-${text}`,
        prompt: "Move to the last character of the line.",
        buffer: [text],
        goal: { kind: "cursor", at: { line: 0, col: text.length - 1 } },
        constraints: {
          forbiddenKeys: ["<Left>", "<Right>", "<Up>", "<Down>"],
          maxKeystrokes: 2,
        },
        solution: "$",
        par: 1,
      };
    },
  },

  {
    skill: "case",
    label: "uppercase a word",
    make: (rng) => {
      const words = sentence(rng, 3);
      const target = pickInt(rng, 0, 2);
      const after = [...words];
      after[target] = words[target].toUpperCase();
      return {
        id: `drill-gU-${words.join("-")}-${target}`,
        prompt: `Uppercase "${words[target]}".`,
        buffer: [words.join(" ")],
        cursor: { line: 0, col: columnOf(words, target) + 1 },
        goal: { kind: "buffer", lines: [after.join(" ")] },
        constraints: { maxKeystrokes: 6, requiredKeys: /^gUiw$/ },
        solution: "gUiw",
        par: 4,
      };
    },
  },
];

/**
 * Choose a generator, leaning toward whatever the learner keeps getting wrong.
 * With no history everything is equally likely.
 */
export function chooseGenerator(
  rng: Rng,
  perSkill: Record<string, { seen: number; failed: number }>,
  allowed?: Set<string>,
): Generator {
  const pool = allowed
    ? GENERATORS.filter((generator) => allowed.has(generator.skill))
    : GENERATORS;
  const usable = pool.length > 0 ? pool : GENERATORS;

  const weights = usable.map((generator) => {
    const record = perSkill[generator.skill];
    if (!record || record.seen === 0) return 1;
    // Failure rate drives the weight; every skill keeps a floor so nothing
    // disappears from rotation once you get good at it.
    return 0.4 + 3 * (record.failed / record.seen);
  });

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;
  for (let i = 0; i < usable.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return usable[i];
  }
  return usable[usable.length - 1];
}
