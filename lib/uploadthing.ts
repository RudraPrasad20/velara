// lib/uploadthing.ts
// Client-side typed helpers generated from OurFileRouter.
// Import UploadButton and UploadDropzone from HERE in your components.
// Never import directly from @uploadthing/react without the type parameter.

import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

// These components are fully typed to OurFileRouter —
// TypeScript will catch if you pass the wrong endpoint name.
export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();