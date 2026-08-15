import Link from "next/link";
import { LESSONS, TIERS } from "@/content/curriculum";
import { TopBar } from "@/components/TopBar";

const exerciseCount = LESSONS.reduce((total, lesson) => total + lesson.exercises.length, 0);

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-14">
        {/* The thesis: the same three keys mean different things depending on
            the mode, which is the whole reason Vim needs teaching at all. */}
        <div className="mb-3 text-[10.5px] font-semibold tracking-[0.16em] text-faint uppercase">
          {LESSONS.length} lessons · {exerciseCount} exercises · nothing locked
        </div>

        <h1 className="font-sans text-[40px] leading-[1.1] font-semibold text-white sm:text-[52px]">
          Learn Vim by
          <br />
          <span className="text-accent">using</span> Vim.
        </h1>

        <p className="prose mt-5 mb-8">
          Every lesson gives you a real editor and grades what you actually pressed —
          not just the text you ended up with. Delete a word with five taps of{" "}
          <code>x</code> and it will tell you to use <code>dw</code>. That is the
          difference between knowing the commands and having them in your hands.
        </p>

        <div className="mb-14 flex flex-wrap gap-3">
          <Link
            href="/lessons/modes"
            className="rounded bg-accent px-4 py-2 text-[13px] font-semibold text-ground hover:brightness-110"
          >
            Start at the beginning
          </Link>
          <Link
            href="/practice"
            className="rounded border border-rule px-4 py-2 text-[13px] text-ink hover:bg-raised"
          >
            Drill what I know
          </Link>
          <Link
            href="/cheatsheet"
            className="rounded border border-rule px-4 py-2 text-[13px] text-muted hover:bg-raised hover:text-ink"
          >
            Cheatsheet
          </Link>
        </div>

        <h2 className="mb-4 text-[10.5px] font-semibold tracking-[0.16em] text-faint uppercase">
          The course
        </h2>

        <ol className="space-y-3">
          {TIERS.map((tier, index) => (
            <li
              key={tier.id}
              className="rounded border border-rule bg-panel p-4 transition-colors hover:border-accent-dim"
            >
              <div className="flex items-baseline gap-3">
                {/* These are genuinely sequential — each tier depends on the last. */}
                <span className="text-[12px] text-faint tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-sans text-[17px] font-semibold text-ink">{tier.title}</h3>
                <span className="ml-auto text-[11.5px] text-faint">
                  {tier.lessons.length} lessons
                </span>
              </div>

              <p className="prose mt-2 mb-3 text-[14px]">{tier.blurb}</p>

              <div className="flex flex-wrap gap-1.5">
                {tier.lessons.map((lesson) => (
                  <Link
                    key={lesson.slug}
                    href={`/lessons/${lesson.slug}`}
                    className="keycap hover:border-accent-dim hover:text-accent"
                    title={lesson.title}
                  >
                    {lesson.keys}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-[12.5px] text-faint">
          Progress is kept in this browser only. No account, no server.
        </p>
      </main>
    </div>
  );
}
