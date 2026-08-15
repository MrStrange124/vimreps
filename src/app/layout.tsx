import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vim·dojo",
  description:
    "Learn Vim by using it: seventy lessons from modes to macros, each graded on the keys you press, not just the text you end up with.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
