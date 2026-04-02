// lib/auth-client.ts
// Client-side Better Auth instance.
// Used in React components (client components only).
// Do NOT import this in server components or API routes — use lib/auth.ts there.

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;