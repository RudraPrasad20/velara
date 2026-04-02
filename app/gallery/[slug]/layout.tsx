// app/gallery/[slug]/layout.tsx
// Generates dynamic metadata for each gallery so when guests
// share the link on WhatsApp it shows the event name properly.

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { name: true, date: true },
  });

  if (!event) {
    return {
      title: "Gallery not found — SnapLive",
    };
  }

  const date = new Date(event.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    title: `${event.name} — Live Gallery`,
    description: `Watch photos from ${event.name} on ${date} appear in real time. Powered by SnapLive.`,
    openGraph: {
      title: `${event.name} — Live Photo Gallery`,
      description: `Live photos from ${event.name} · ${date}`,
      type: "website",
    },
  };
}

export default function GalleryLayout({ children }: Props) {
  return <>{children}</>;
}