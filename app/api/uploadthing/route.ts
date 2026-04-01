// app/api/uploadthing/route.ts
// Mounts the Uploadthing file router as a Next.js API route.
// Uploadthing uses this to handle presigned URL generation,
// upload confirmation webhooks, and file management.

import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";


export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});