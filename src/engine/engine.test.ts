import { describe, expect, it } from "vitest";
import { createState } from "./state";
import { feed } from "./interpreter";
import type { EditorState, Position } from "./types";

/**
 * Table-driven engine tests.
 *
 * Each row is "start with this buffer and cursor, type these keys, expect this
 * buffer and cursor". Keys are written in the same notation macros and exercise
 * solutions use, so a failing row reads like something you could type yourself.
 */

function run(
  lines: string[],
  keys: string,
  cursor: Position = { line: 0, col: 0 },
): EditorState {
  return feed(createState(lines, cursor), keys);
}

type Row = {
  name: string;
  lines: string[];
  cursor?: Position;
  keys: string;
  expect?: string[];
  at?: Position;
  mode?: string;
};

function table(rows: Row[]) {
  for (const row of rows) {
    it(row.name, () => {
      const state = run(row.lines, row.keys, row.cursor);
      if (row.expect) expect(state.lines).toEqual(row.expect);
      if (row.at) expect(state.cursor).toEqual(row.at);
      if (row.mode) expect(state.mode).toBe(row.mode);
    });
  }
}

describe("motions", () => {
  table([
    { name: "l moves right", lines: ["abc"], keys: "l", at: { line: 0, col: 1 } },
    { name: "h moves left", lines: ["abc"], cursor: { line: 0, col: 2 }, keys: "h", at: { line: 0, col: 1 } },
    { name: "l stops at end of line", lines: ["ab"], keys: "lll", at: { line: 0, col: 1 } },
    { name: "h stops at column zero", lines: ["ab"], keys: "hhh", at: { line: 0, col: 0 } },
    { name: "j moves down", lines: ["abc", "def"], keys: "j", at: { line: 1, col: 0 } },
    { name: "k moves up", lines: ["abc", "def"], cursor: { line: 1, col: 0 }, keys: "k", at: { line: 0, col: 0 } },
    {
      name: "j remembers the desired column across a short line",
      lines: ["abcdef", "ab", "abcdef"],
      cursor: { line: 0, col: 5 },
      keys: "jj",
      at: { line: 2, col: 5 },
    },
    { name: "w moves to next word", lines: ["foo bar baz"], keys: "w", at: { line: 0, col: 4 } },
    { name: "w counts", lines: ["foo bar baz"], keys: "2w", at: { line: 0, col: 8 } },
    { name: "w stops at punctuation", lines: ["foo.bar"], keys: "w", at: { line: 0, col: 3 } },
    { name: "W skips punctuation", lines: ["foo.bar baz"], keys: "W", at: { line: 0, col: 8 } },
    { name: "w crosses lines", lines: ["foo", "bar"], cursor: { line: 0, col: 1 }, keys: "w", at: { line: 1, col: 0 } },
    { name: "b moves back a word", lines: ["foo bar"], cursor: { line: 0, col: 4 }, keys: "b", at: { line: 0, col: 0 } },
    { name: "e moves to word end", lines: ["foo bar"], keys: "e", at: { line: 0, col: 2 } },
    { name: "e crosses into the next word", lines: ["foo bar"], cursor: { line: 0, col: 2 }, keys: "e", at: { line: 0, col: 6 } },
    { name: "ge moves to previous word end", lines: ["foo bar"], cursor: { line: 0, col: 4 }, keys: "ge", at: { line: 0, col: 2 } },
    { name: "0 goes to column zero", lines: ["  foo"], cursor: { line: 0, col: 4 }, keys: "0", at: { line: 0, col: 0 } },
    { name: "^ goes to first non-blank", lines: ["  foo"], cursor: { line: 0, col: 4 }, keys: "^", at: { line: 0, col: 2 } },
    { name: "$ goes to last character", lines: ["foo"], keys: "$", at: { line: 0, col: 2 } },
    { name: "gg goes to first line", lines: ["a", "b", "c"], cursor: { line: 2, col: 0 }, keys: "gg", at: { line: 0, col: 0 } },
    { name: "G goes to last line", lines: ["a", "b", "c"], keys: "G", at: { line: 2, col: 0 } },
    { name: "3G goes to line three", lines: ["a", "b", "c", "d"], keys: "3G", at: { line: 2, col: 0 } },
    { name: "f finds a character", lines: ["hello world"], keys: "fw", at: { line: 0, col: 6 } },
    { name: "t stops before a character", lines: ["hello world"], keys: "tw", at: { line: 0, col: 5 } },
    { name: "F finds backwards", lines: ["hello world"], cursor: { line: 0, col: 10 }, keys: "Fo", at: { line: 0, col: 7 } },
    { name: "2fl finds the second l", lines: ["hello world"], keys: "2fl", at: { line: 0, col: 3 } },
    { name: "; repeats a find", lines: ["a.b.c.d"], keys: "f.;", at: { line: 0, col: 3 } },
    { name: ", reverses a find", lines: ["a.b.c.d"], keys: "2f.,", at: { line: 0, col: 1 } },
    { name: "; repeats t without sticking", lines: ["a.b.c.d"], keys: "t.;", at: { line: 0, col: 2 } },
    { name: "} jumps to the blank line", lines: ["a", "b", "", "c"], keys: "}", at: { line: 2, col: 0 } },
    { name: "{ jumps back to the blank line", lines: ["a", "", "b", "c"], cursor: { line: 3, col: 0 }, keys: "{", at: { line: 1, col: 0 } },
    { name: "% matches a bracket", lines: ["foo(bar)"], keys: "%", at: { line: 0, col: 7 } },
    { name: "% matches back", lines: ["foo(bar)"], cursor: { line: 0, col: 7 }, keys: "%", at: { line: 0, col: 3 } },
    { name: "| goes to a column", lines: ["abcdef"], keys: "4|", at: { line: 0, col: 3 } },
  ]);
});

describe("operators", () => {
  table([
    { name: "x deletes a character", lines: ["abc"], keys: "x", expect: ["bc"] },
    { name: "3x deletes three", lines: ["abcdef"], keys: "3x", expect: ["def"] },
    { name: "X deletes backwards", lines: ["abc"], cursor: { line: 0, col: 2 }, keys: "X", expect: ["ac"] },
    { name: "dw deletes a word", lines: ["foo bar"], keys: "dw", expect: ["bar"] },
    { name: "dw at line end stops at the newline", lines: ["foo bar", "baz"], cursor: { line: 0, col: 4 }, keys: "dw", expect: ["foo ", "baz"] },
    { name: "de deletes to word end", lines: ["foo bar"], keys: "de", expect: [" bar"] },
    { name: "d2w deletes two words", lines: ["foo bar baz"], keys: "d2w", expect: ["baz"] },
    { name: "2dw deletes two words", lines: ["foo bar baz"], keys: "2dw", expect: ["baz"] },
    { name: "dd deletes a line", lines: ["a", "b", "c"], keys: "dd", expect: ["b", "c"] },
    { name: "2dd deletes two lines", lines: ["a", "b", "c"], keys: "2dd", expect: ["c"] },
    { name: "dd on the last line leaves an empty buffer", lines: ["only"], keys: "dd", expect: [""] },
    { name: "d$ deletes to end of line", lines: ["foo bar"], cursor: { line: 0, col: 3 }, keys: "d$", expect: ["foo"] },
    { name: "D deletes to end of line", lines: ["foo bar"], cursor: { line: 0, col: 3 }, keys: "D", expect: ["foo"] },
    { name: "d0 deletes to start", lines: ["foo bar"], cursor: { line: 0, col: 4 }, keys: "d0", expect: ["bar"] },
    { name: "dj deletes two lines linewise", lines: ["a", "b", "c"], keys: "dj", expect: ["c"] },
    { name: "dG deletes to the end", lines: ["a", "b", "c"], cursor: { line: 1, col: 0 }, keys: "dG", expect: ["a"] },
    { name: "df. deletes through the character", lines: ["a.b"], keys: "df.", expect: ["b"] },
    { name: "dt. stops before it", lines: ["ab.c"], keys: "dt.", expect: [".c"] },
    { name: "cw changes to word end, not past the space", lines: ["foo bar"], keys: "cwbaz<Esc>", expect: ["baz bar"] },
    { name: "cc keeps indentation", lines: ["  foo"], keys: "ccbar<Esc>", expect: ["  bar"] },
    { name: "C changes to end of line", lines: ["foo bar"], cursor: { line: 0, col: 4 }, keys: "Cbaz<Esc>", expect: ["foo baz"] },
    { name: "s substitutes a character", lines: ["abc"], keys: "sX<Esc>", expect: ["Xbc"] },
    { name: "r replaces a character", lines: ["abc"], keys: "rX", expect: ["Xbc"] },
    { name: "3rx replaces three", lines: ["abcdef"], keys: "3rx", expect: ["xxxdef"] },
    { name: "~ toggles case and advances", lines: ["abc"], keys: "~", expect: ["Abc"], at: { line: 0, col: 1 } },
    { name: "J joins lines with a space", lines: ["foo", "bar"], keys: "J", expect: ["foo bar"] },
    { name: "gJ joins without a space", lines: ["foo", "bar"], keys: "gJ", expect: ["foobar"] },
    { name: "3J joins three lines", lines: ["a", "b", "c"], keys: "3J", expect: ["a b c"] },
    { name: ">> indents", lines: ["foo"], keys: ">>", expect: ["  foo"] },
    { name: "<< outdents", lines: ["    foo"], keys: "<<", expect: ["  foo"] },
    { name: "guw lowercases a word", lines: ["FOO bar"], keys: "guw", expect: ["foo bar"] },
    { name: "gUU uppercases the line", lines: ["foo bar"], keys: "gUU", expect: ["FOO BAR"] },
  ]);
});

describe("insert mode", () => {
  table([
    { name: "i inserts before the cursor", lines: ["bc"], keys: "ia<Esc>", expect: ["abc"] },
    { name: "a inserts after the cursor", lines: ["ac"], keys: "ab<Esc>", expect: ["abc"] },
    { name: "A appends at end of line", lines: ["ab"], keys: "Ac<Esc>", expect: ["abc"] },
    { name: "I inserts at first non-blank", lines: ["  bc"], keys: "Ia<Esc>", expect: ["  abc"] },
    { name: "o opens a line below", lines: ["a"], keys: "ob<Esc>", expect: ["a", "b"] },
    { name: "O opens a line above", lines: ["b"], keys: "Oa<Esc>", expect: ["a", "b"] },
    { name: "o keeps indentation", lines: ["  a"], keys: "ob<Esc>", expect: ["  a", "  b"] },
    { name: "Esc steps the cursor back", lines: ["ab"], keys: "ix<Esc>", at: { line: 0, col: 0 } },
    { name: "CR splits the line", lines: ["ab"], cursor: { line: 0, col: 1 }, keys: "i<CR><Esc>", expect: ["a", "b"] },
    { name: "backspace deletes back", lines: ["ac"], cursor: { line: 0, col: 1 }, keys: "ib<BS><Esc>", expect: ["ac"] },
    { name: "R overwrites", lines: ["abcd"], keys: "RXY<Esc>", expect: ["XYcd"] },
  ]);
});

describe("registers and paste", () => {
  it("yy then p pastes the line below", () => {
    const state = run(["a", "b"], "yyp");
    expect(state.lines).toEqual(["a", "a", "b"]);
  });

  it("dd then P pastes above", () => {
    const state = run(["a", "b"], "ddP");
    expect(state.lines).toEqual(["a", "b"]);
  });

  it("yw then p pastes characterwise after the cursor", () => {
    // `yw` grabs "ab " including the space; `p` drops it after the cursor.
    const state = run(["ab cd"], "ywp");
    expect(state.lines).toEqual(["aab b cd"]);
  });

  it("a named register survives an intervening delete", () => {
    const state = run(["keep", "junk"], '"ayyjdd"ap');
    expect(state.lines).toEqual(["keep", "keep"]);
  });

  it("yank fills register 0 while delete does not", () => {
    const state = run(["yanked", "deleted"], "yyjdd");
    expect(state.registers["0"]?.text).toBe("yanked\n");
    expect(state.registers['"']?.text).toBe("deleted\n");
  });

  it("3p pastes three copies", () => {
    const state = run(["x"], "yy3p");
    expect(state.lines).toEqual(["x", "x", "x", "x"]);
  });
});

describe("undo and redo", () => {
  it("u reverts a delete", () => {
    const state = run(["abc"], "xu");
    expect(state.lines).toEqual(["abc"]);
  });

  it("ctrl-r reapplies it", () => {
    const state = run(["abc"], "xu<C-r>");
    expect(state.lines).toEqual(["bc"]);
  });

  it("u reverts a whole insert session", () => {
    const state = run(["a"], "ihello<Esc>u");
    expect(state.lines).toEqual(["a"]);
  });

  it("u with a count reverts several changes", () => {
    const state = run(["abcd"], "xxx2u");
    expect(state.lines).toEqual(["bcd"]);
  });
});

describe("text objects", () => {
  table([
    { name: "diw deletes the inner word", lines: ["foo bar baz"], cursor: { line: 0, col: 5 }, keys: "diw", expect: ["foo  baz"] },
    { name: "daw takes the trailing space", lines: ["foo bar baz"], cursor: { line: 0, col: 5 }, keys: "daw", expect: ["foo baz"] },
    { name: "ciw works from any character in the word", lines: ["foo bar"], cursor: { line: 0, col: 6 }, keys: "ciwX<Esc>", expect: ["foo X"] },
    { name: "di( empties the parens", lines: ["foo(bar)baz"], cursor: { line: 0, col: 5 }, keys: "di(", expect: ["foo()baz"] },
    { name: "da( removes the parens too", lines: ["foo(bar)baz"], cursor: { line: 0, col: 5 }, keys: "da(", expect: ["foobaz"] },
    { name: "di( from the opening bracket", lines: ["foo(bar)"], cursor: { line: 0, col: 3 }, keys: "di(", expect: ["foo()"] },
    { name: "di( handles nesting", lines: ["a(b(c)d)e"], cursor: { line: 0, col: 4 }, keys: "di(", expect: ["a(b()d)e"] },
    { name: 'di" empties the quotes', lines: ['say "hi" now'], cursor: { line: 0, col: 6 }, keys: 'di"', expect: ['say "" now'] },
    { name: 'da" takes the trailing space', lines: ['say "hi" now'], cursor: { line: 0, col: 6 }, keys: 'da"', expect: ["say now"] },
    { name: "di{ empties braces", lines: ["fn { body }"], cursor: { line: 0, col: 6 }, keys: "di{", expect: ["fn {}"] },
    { name: "dit empties a tag", lines: ["<p>hello</p>"], cursor: { line: 0, col: 4 }, keys: "dit", expect: ["<p></p>"] },
    { name: "dat removes the tag", lines: ["x<p>hi</p>y"], cursor: { line: 0, col: 5 }, keys: "dat", expect: ["xy"] },
    { name: "dip deletes the paragraph", lines: ["a", "b", "", "c"], keys: "dip", expect: ["", "c"] },
  ]);
});

describe("visual mode", () => {
  it("v then l then d deletes the selection", () => {
    const state = run(["abcdef"], "vlld");
    expect(state.lines).toEqual(["def"]);
  });

  it("V then d deletes whole lines", () => {
    const state = run(["a", "b", "c"], "Vjd");
    expect(state.lines).toEqual(["c"]);
  });

  it("viw selects the inner word", () => {
    const state = run(["foo bar"], "wviwd");
    expect(state.lines).toEqual(["foo "]);
  });

  it("v y copies the selection", () => {
    const state = run(["abc"], "vly$p");
    expect(state.lines).toEqual(["abcab"]);
  });

  it("o swaps the ends so the selection can grow backwards", () => {
    // Select c-d forwards, then `o` moves to the far end so `h` extends left.
    const state = run(["abcdef"], "llvlohd");
    expect(state.lines).toEqual(["aef"]);
  });

  it("visual U uppercases", () => {
    const state = run(["abc"], "vlU");
    expect(state.lines).toEqual(["ABc"]);
  });

  it("visual block deletes a rectangle", () => {
    const state = run(["abcd", "efgh", "ijkl"], "l<C-v>jjld");
    expect(state.lines).toEqual(["ad", "eh", "il"]);
  });

  it("visual block I inserts on every line", () => {
    const state = run(["one", "two", "six"], "<C-v>jjI# <Esc>");
    expect(state.lines).toEqual(["# one", "# two", "# six"]);
  });

  it("visual block A appends on every line", () => {
    const state = run(["a", "b", "c"], "<C-v>jjA;<Esc>");
    expect(state.lines).toEqual(["a;", "b;", "c;"]);
  });

  it("visual block A pads short lines out to the column", () => {
    const state = run(["long line", "s", "also long"], "$<C-v>jjA!<Esc>");
    expect(state.lines).toEqual(["long line!", "s        !", "also long!"]);
  });

  it("Esc leaves visual mode", () => {
    const state = run(["abc"], "vl<Esc>");
    expect(state.mode).toBe("normal");
  });
});

describe("search", () => {
  it("/ jumps to the match", () => {
    const state = run(["alpha", "beta", "gamma"], "/beta<CR>");
    expect(state.cursor).toEqual({ line: 1, col: 0 });
  });

  it("n repeats the search", () => {
    const state = run(["x", "hit", "y", "hit"], "/hit<CR>n");
    expect(state.cursor.line).toBe(3);
  });

  it("N reverses it", () => {
    const state = run(["x", "hit", "y", "hit"], "/hit<CR>nN");
    expect(state.cursor.line).toBe(1);
  });

  it("* searches for the word under the cursor", () => {
    const state = run(["foo", "bar", "foo"], "*");
    expect(state.cursor.line).toBe(2);
  });

  it("search wraps around the buffer", () => {
    const state = run(["hit", "x", "y"], "jj/hit<CR>");
    expect(state.cursor.line).toBe(0);
  });

  it("d/ deletes up to the match", () => {
    const state = run(["one two three"], "d/three<CR>");
    expect(state.lines).toEqual(["three"]);
  });
});

describe("marks", () => {
  it("backtick returns to the exact position", () => {
    const state = run(["abcdef", "ghijkl"], "llmajj0`a");
    expect(state.cursor).toEqual({ line: 0, col: 2 });
  });

  it("quote returns to the line's first non-blank", () => {
    const state = run(["  abc", "def"], "llmaj'a");
    expect(state.cursor).toEqual({ line: 0, col: 2 });
  });

  it("d backtick mark deletes to the mark", () => {
    const state = run(["abcdef"], "mall ld`a");
    expect(state.lines).toEqual(["abcdef"]);
  });
});

describe("macros", () => {
  it("records and replays a simple edit", () => {
    const state = run(["a", "b", "c"], "qqI-<Esc>jq@q");
    expect(state.lines).toEqual(["-a", "-b", "c"]);
  });

  it("replays with a count", () => {
    const state = run(["a", "b", "c", "d"], "qqI-<Esc>jq2@q");
    expect(state.lines).toEqual(["-a", "-b", "-c", "d"]);
  });

  it("@@ repeats the last macro", () => {
    const state = run(["a", "b", "c"], "qqI-<Esc>jq@q@@");
    expect(state.lines).toEqual(["-a", "-b", "-c"]);
  });
});

describe("dot repeat", () => {
  it("repeats a delete", () => {
    const state = run(["foo bar baz"], "dw.");
    expect(state.lines).toEqual(["baz"]);
  });

  it("repeats an insert", () => {
    const state = run(["a", "b"], "I-<Esc>j.");
    expect(state.lines).toEqual(["-a", "-b"]);
  });

  it("repeats a change", () => {
    const state = run(["one two"], "ciwX<Esc>w.");
    expect(state.lines).toEqual(["X X"]);
  });
});

describe("ex commands", () => {
  it("substitutes on the current line", () => {
    const state = run(["foo foo"], ":s/foo/bar<CR>");
    expect(state.lines).toEqual(["bar foo"]);
  });

  it("substitutes globally on the line", () => {
    const state = run(["foo foo"], ":s/foo/bar/g<CR>");
    expect(state.lines).toEqual(["bar bar"]);
  });

  it("substitutes across the file", () => {
    const state = run(["foo", "foo"], ":%s/foo/bar/g<CR>");
    expect(state.lines).toEqual(["bar", "bar"]);
  });

  it("honours a line range", () => {
    const state = run(["a", "a", "a"], ":1,2s/a/b/<CR>");
    expect(state.lines).toEqual(["b", "b", "a"]);
  });

  it("supports capture groups", () => {
    const state = run(["john smith"], ":s/\\(\\w\\+\\) \\(\\w\\+\\)/\\2 \\1/<CR>");
    expect(state.lines).toEqual(["smith john"]);
  });

  it("& inserts the whole match", () => {
    const state = run(["cat"], ":s/cat/[&]/<CR>");
    expect(state.lines).toEqual(["[cat]"]);
  });

  it("deletes matching lines with :g", () => {
    const state = run(["keep", "drop me", "keep"], ":g/drop/d<CR>");
    expect(state.lines).toEqual(["keep", "keep"]);
  });

  it("keeps matching lines with :v", () => {
    const state = run(["keep", "drop", "keep"], ":v/keep/d<CR>");
    expect(state.lines).toEqual(["keep", "keep"]);
  });

  it("runs :normal over a range", () => {
    const state = run(["a", "b"], ":%normal I-<CR>");
    expect(state.lines).toEqual(["-a", "-b"]);
  });

  it("deletes a range", () => {
    const state = run(["a", "b", "c"], ":2,3d<CR>");
    expect(state.lines).toEqual(["a"]);
  });

  it("moves a line", () => {
    const state = run(["a", "b", "c"], ":1m$<CR>");
    expect(state.lines).toEqual(["b", "c", "a"]);
  });

  it("copies a line", () => {
    const state = run(["a", "b"], ":1t$<CR>");
    expect(state.lines).toEqual(["a", "b", "a"]);
  });

  it("a bare number jumps to that line", () => {
    const state = run(["a", "b", "c"], ":3<CR>");
    expect(state.cursor.line).toBe(2);
  });
});

describe("counts compose", () => {
  it("2d3w deletes six words", () => {
    const state = run(["a b c d e f g"], "2d3w");
    expect(state.lines).toEqual(["g"]);
  });

  it("3>> indents three lines", () => {
    const state = run(["a", "b", "c"], "3>>");
    expect(state.lines).toEqual(["  a", "  b", "  c"]);
  });
});
