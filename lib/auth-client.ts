// import { createAuthClient } from "better-auth/react";

// export const authClient = createAuthClient({
//   baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
// });

// // Named exports so you can import exactly what you need
// export const { signIn, signUp, signOut, useSession } = authClient;



// lib/auth-client.ts
// Better Auth client instance for use in React components (client side).
// Import signIn, signUp, signOut, useSession from HERE — not from better-auth directly.

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
});

// Named exports so components import only what they need
export const { signIn, signUp, signOut, useSession } = authClient;