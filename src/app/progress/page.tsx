import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { ProgressView } from "./ProgressView";

export const metadata: Metadata = {
  title: "Progress — vim·dojo",
  description: "Lessons cleared, drill accuracy, best golf scores, and your practice streak.",
};

export default function ProgressPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar active="progress" />
      <ProgressView />
    </div>
  );
}
