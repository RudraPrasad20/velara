// lib/auth.ts
// Fixed: added cookieCache to dramatically reduce DB lookups on every request.
// Without cookieCache, every API route call to auth.api.getSession() hits
// the database. With it, Better Auth caches the session in the cookie itself
// (encrypted) and only re-validates against the DB every 60 seconds.
// This is what eliminates the repeated session expiry / logout loops.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },

  user: {
    additionalFields: {
      studioName: {
        type: "string",
        required: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,   // 30 days
    updateAge: 60 * 60 * 24 * 7,    // Only refresh session if older than 7 days
                                     // (was 1 day — too aggressive, caused logouts)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,               // Cache session in cookie for 5 minutes
    },
  },

  // This must match your actual deployed domain exactly — no trailing slash.
  // In dev: http://localhost:3000
  // In prod: https://yourdomain.com
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
});