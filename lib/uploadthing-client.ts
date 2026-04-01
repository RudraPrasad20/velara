// lib/uploadthing-client.ts
// Generates the useUploadThing hook typed to OurFileRouter.
// Import useUploadThing from HERE in client components.

import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();