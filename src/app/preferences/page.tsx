import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { PreferencesView } from "./PreferencesView";

export const metadata: Metadata = {
  title: "Preferences — vim·reps",
  description: "Pick a dark variant and set how big everything is.",
};

export default function PreferencesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar active="preferences" />
      <PreferencesView />
    </div>
  );
}
