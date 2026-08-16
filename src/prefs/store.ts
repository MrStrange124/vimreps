"use client";

/**
 * Display preferences: which dark variant, and how big everything is.
 *
 * Stored alongside progress but in their own key, so clearing progress does not
 * reset how the app looks. Like progress, every read is guarded and an
 * unrecognised version is discarded rather than migrated.
 */

const KEY = "vimreps:prefs:v1";

export const THEMES = [
  {
    id: "slate",
    name: "Slate",
    note: "Cool blue-grey, warm amber. The default.",
    swatch: ["#12161f", "#c9d3e3", "#e8a33d"],
  },
  {
    id: "ink",
    name: "Ink",
    note: "Near-black with brighter text. The highest contrast.",
    swatch: ["#08090c", "#e4ebf5", "#f2b455"],
  },
  {
    id: "ember",
    name: "Ember",
    note: "Warm brown ground, orange accent. Easier late at night.",
    swatch: ["#1a1512", "#ded2c6", "#e0844a"],
  },
  {
    id: "iris",
    name: "Iris",
    note: "Deep indigo with a soft violet accent.",
    swatch: ["#14131f", "#d0cbe6", "#b49ae8"],
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const SCALES = [
  { id: 0.9, label: "Compact" },
  { id: 1, label: "Default" },
  { id: 1.15, label: "Large" },
  { id: 1.3, label: "Larger" },
  { id: 1.5, label: "Largest" },
] as const;

export type Prefs = {
  version: 1;
  theme: ThemeId;
  scale: number;
};

export function defaultPrefs(): Prefs {
  return { version: 1, theme: "slate", scale: 1 };
}

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Prefs;
    if (parsed?.version !== 1) return defaultPrefs();
    return { ...defaultPrefs(), ...parsed };
  } catch {
    return defaultPrefs();
  }
}

/** Write the preference onto the document so CSS can react to it. */
export function applyPrefs(prefs: Prefs): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = prefs.theme;
  document.documentElement.style.setProperty("--app-scale", String(prefs.scale));
}

export function savePrefs(prefs: Prefs): Prefs {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // Blocked storage still gets the live update below; it just will not persist.
    }
  }
  applyPrefs(prefs);
  return prefs;
}

/**
 * Runs before first paint, inlined into the document head. Without it the page
 * renders in the default theme and size for a frame and then jumps.
 */
export const PREFS_BOOT_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(KEY)});
    if (!raw) return;
    var prefs = JSON.parse(raw);
    if (!prefs || prefs.version !== 1) return;
    if (prefs.theme) document.documentElement.dataset.theme = prefs.theme;
    if (prefs.scale) document.documentElement.style.setProperty('--app-scale', String(prefs.scale));
  } catch (e) {}
})();
`.trim();
