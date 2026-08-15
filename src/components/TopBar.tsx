import Link from "next/link";

const TABS = [
  { href: "/lessons/modes", label: "lessons" },
  { href: "/practice", label: "practice" },
  { href: "/golf", label: "golf" },
  { href: "/cheatsheet", label: "cheatsheet" },
  { href: "/progress", label: "progress" },
  { href: "/preferences", label: "preferences" },
];

export function TopBar({ active }: { active?: string }) {
  return (
    <header className="flex items-center gap-1 border-b border-rule bg-panel px-3 py-1.5 text-[0.75rem]">
      <Link href="/" className="pr-3 font-semibold tracking-[0.1em] text-ink">
        vim<span className="text-accent">·</span>dojo
      </Link>
      {TABS.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          aria-current={active === tab.label ? "page" : undefined}
          className={`rounded px-2.5 py-1 ${
            active === tab.label
              ? "bg-raised text-ink"
              : "text-muted hover:bg-raised hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </header>
  );
}
