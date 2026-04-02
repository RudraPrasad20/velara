// lib/auth.ts
// Better Auth server instance.
// Uses prisma from @/lib/prisma — which imports from app/generated/prisma.
// This is the ONLY auth instance — all API routes import from here.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";


export const auth = betterAuth({
  database: prismaAdapter(prisma, {
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
    expiresIn: 60 * 60 * 24 * 30,  // 30 days
    updateAge: 60 * 60 * 24 * 7,   // Only refresh token every 7 days
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,              // Cache session in cookie for 5 min
    },
  },

  trustedOrigins: [
    "http://localhost:3000",
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ],

  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
});