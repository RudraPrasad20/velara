// lib/prisma.ts
// THE single Prisma client for the entire app.
// Imports from app/generated/prisma — the output path in schema.prisma.
// Every other file that needs the database imports { prisma } from "@/lib/prisma".
// There should be NO lib/prisma.ts — delete that file if it exists.

import { PrismaClient } from "@/app/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}