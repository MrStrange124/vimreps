"use client";

import { useEffect, useState } from "react";
import { createState } from "@/engine/state";
import { feed } from "@/engine/interpreter";
import { Editor } from "@/components/Editor";
import { StatusBar } from "@/components/StatusBar";
import {
  SCALES,
  THEMES,
  defaultPrefs,
  loadPrefs,
  savePrefs,
  type Prefs,
  type ThemeId,
} from "@/prefs/store";

/**
 * Both settings are applied to the document the moment they change, so this page
 * is its own preview — the sample buffer below is a real editor showing the mode
 * colours, cursor, and selection you are actually choosing between.
 */
const SAMPLE = feed(
  createState(["function greet(name) {", '  return "hello " + name;', "}"], {
    line: 1,
    col: 9,
  }),
  "vt+",
);

export function PreferencesView() {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
  }, []);

  function update(patch: Partial<Prefs>) {
    setPrefs(savePrefs({ ...prefs, ...patch }));
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-9">
      <h1 className="font-sans text-[1.75rem] font-semibold text-white">Preferences</h1>
      <p className="prose mt-2 mb-8">
        Kept in this browser, separately from your progress — clearing one does not
        touch the other.
      </p>

      <section className="mb-9">
        <h2 className="mb-1 text-[0.65625rem] font-semibold tracking-[0.16em] text-faint uppercase">
          Theme
        </h2>
        <p className="mb-3 text-[0.78125rem] text-muted">
          All dark. This is an editor, so the design commits to that rather than hedging.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {THEMES.map((theme) => {
            const selected = ready && prefs.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ theme: theme.id as ThemeId })}
                className={`flex items-center gap-3 rounded border px-3 py-2.5 text-left ${
                  selected
                    ? "border-accent bg-raised"
                    : "border-rule bg-panel hover:border-accent-dim"
                }`}
              >
                <span className="flex shrink-0 overflow-hidden rounded border border-rule">
                  {theme.swatch.map((colour) => (
                    <span
                      key={colour}
                      className="block h-6 w-3"
                      style={{ background: colour }}
                    />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] text-ink">{theme.name}</span>
                  <span className="block text-[0.71875rem] text-faint">{theme.note}</span>
                </span>
                {selected && <span className="ml-auto shrink-0 text-accent">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-9">
        <h2 className="mb-1 text-[0.65625rem] font-semibold tracking-[0.16em] text-faint uppercase">
          Size
        </h2>
        <p className="mb-3 text-[0.78125rem] text-muted">
          Scales the whole app together — prose, chrome, and the editor — not just
          the text inside unchanged boxes.
        </p>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Interface size">
          {SCALES.map((scale) => {
            const selected = ready && prefs.scale === scale.id;
            return (
              <button
                key={scale.id}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ scale: scale.id })}
                className={`rounded border px-3 py-1.5 text-[0.8125rem] ${
                  selected
                    ? "border-accent bg-raised text-ink"
                    : "border-rule bg-panel text-muted hover:border-accent-dim hover:text-ink"
                }`}
              >
                {scale.label}
                <span className="pl-2 text-[0.6875rem] text-faint">
                  {Math.round(scale.id * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-9">
        <h2 className="mb-3 text-[0.65625rem] font-semibold tracking-[0.16em] text-faint uppercase">
          Preview
        </h2>
        <div className="overflow-hidden rounded-lg border border-rule bg-panel">
          <div className="bg-ground px-3 py-3">
            <Editor state={SAMPLE} minRows={4} />
          </div>
          <StatusBar state={SAMPLE} keystrokes={3} par={2} />
        </div>
        <p className="mt-2 text-[0.71875rem] text-faint">
          A real buffer in visual mode, so you can see the cursor, selection, and
          status line in the theme you pick.
        </p>
      </section>

      <button
        type="button"
        onClick={() => setPrefs(savePrefs(defaultPrefs()))}
        className="rounded border border-rule px-3 py-1.5 text-[0.75rem] text-muted hover:text-ink"
      >
        Reset to defaults
      </button>
    </main>
  );
}
