import { notFound } from "next/navigation";
import { CHALLENGES, challengeBySlug } from "@/golf/challenges";
import { TopBar } from "@/components/TopBar";
import { GolfHole } from "./GolfHole";

export function generateStaticParams() {
  return CHALLENGES.map((challenge) => ({ slug: challenge.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = challengeBySlug(slug);
  return {
    title: challenge ? `${challenge.title} — golf — vim·reps` : "Golf — vim·reps",
    description: challenge?.blurb,
  };
}

export default async function GolfHolePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!challengeBySlug(slug)) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar active="golf" />
      <GolfHole slug={slug} />
    </div>
  );
}
