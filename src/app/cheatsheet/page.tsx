import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { CheatsheetView } from "./CheatsheetView";

export const metadata: Metadata = {
  title: "Cheatsheet — vim·reps",
  description: "Every command the course teaches, grouped and searchable.",
};

export default function CheatsheetPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar active="cheatsheet" />
      <CheatsheetView />
    </div>
  );
}
