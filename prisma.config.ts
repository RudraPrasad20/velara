// prisma.config.ts
// Prisma 7 requires this file — env vars are NOT auto-loaded from .env anymore.
// The "import dotenv/config" line does the loading explicitly.

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use DIRECT_URL for CLI operations (prisma push, migrate)
    // Neon's pooler connection doesn't support DDL statements
    url: env("DIRECT_URL"),
  },
});