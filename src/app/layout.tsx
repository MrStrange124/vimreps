import type { Metadata } from "next";
import { PREFS_BOOT_SCRIPT } from "@/prefs/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "vim·dojo",
  description:
    "Learn Vim by using it: a full course from modes to macros, each lesson graded on the keys you press, not just the text you end up with.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Applies the saved theme and scale before first paint. Without it the
            page renders at the default for a frame and then jumps. */}
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
