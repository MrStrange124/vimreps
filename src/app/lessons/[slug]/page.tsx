import { notFound } from "next/navigation";
import { LESSONS, lessonBySlug } from "@/content/curriculum";
import { LessonView } from "./LessonView";

export function generateStaticParams() {
  return LESSONS.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = lessonBySlug(slug);
  return {
    title: lesson ? `${lesson.title} — vim·dojo` : "vim·dojo",
    description: lesson?.summary,
  };
}

/**
 * Only the slug crosses into the client. Exercises carry RegExp constraints and
 * predicate goals, and neither survives serialisation from a server component —
 * so the client resolves the lesson from the curriculum itself.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!lessonBySlug(slug)) notFound();
  return <LessonView slug={slug} />;
}
