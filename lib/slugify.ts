// lib/slugify.ts
// Converts an event name + date into a unique, URL-safe slug.
// Example: "Sharma Wedding", "2025-02-14" → "sharma-wedding-feb-2025"
// If that slug already exists in the DB, appends a short random suffix.

import { db } from "@/lib/db";

function baseSlug(name: string, date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" }).toLowerCase();
  const year = date.getFullYear();

  const namePart = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")   // remove special chars
    .replace(/\s+/g, "-")            // spaces to hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .slice(0, 40);                   // cap length

  return `${namePart}-${month}-${year}`;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6); // 4 char e.g. "k3x9"
}

export async function generateUniqueSlug(
  name: string,
  date: Date
): Promise<string> {
  const base = baseSlug(name, date);

  // Check if base slug is already taken
  const existing = await db.event.findUnique({
    where: { slug: base },
  });

  if (!existing) return base;

  // Keep trying with suffixes until unique
  let candidate = "";
  let attempts = 0;

  while (attempts < 10) {
    candidate = `${base}-${randomSuffix()}`;
    const conflict = await db.event.findUnique({
      where: { slug: candidate },
    });
    if (!conflict) return candidate;
    attempts++;
  }

  // Fallback: timestamp suffix (always unique)
  return `${base}-${Date.now()}`;
}