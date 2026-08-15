import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { GolfIndex } from "./GolfIndex";

export const metadata: Metadata = {
  title: "Golf — vim·dojo",
  description: "Reach the target buffer in as few keystrokes as you can.",
};

export default function GolfPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar active="golf" />
      <GolfIndex />
    </div>
  );
}
