import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { PracticeView } from "./PracticeView";

export const metadata: Metadata = {
  title: "Practice — vim·reps",
  description: "Endless generated drills, weighted toward whatever you keep getting wrong.",
};

export default function PracticePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar active="practice" />
      <PracticeView />
    </div>
  );
}
