// // lib/uploadthing.ts
// // Defines the Uploadthing file router.
// // The "photoUploader" route accepts images up to 16MB, max 20 at once.
// // The middleware verifies the session and attaches the eventId + studioId
// // to the upload so the onUploadComplete callback knows where to save it.

// import { createUploadthing, type FileRouter } from "uploadthing/next";
// import { auth } from "@/lib/auth";
// import { headers } from "next/headers";

// const f = createUploadthing();

// /** Parsed client `startUpload(files, { eventId })` payload */
// const photoUploadInput = {
//   _input: {} as { eventId: string },
//   _output: {} as { eventId: string },
//   async parseAsync(input: unknown) {
//     if (typeof input !== "object" || input === null)
//       throw new Error("Invalid input");
//     const eventId = (input as { eventId?: unknown }).eventId;
//     if (typeof eventId !== "string" || !eventId.trim())
//       throw new Error("eventId is required");
//     return { eventId };
//   },
// };

// export const ourFileRouter = {
//   photoUploader: f({
//     image: {
//       maxFileSize: "16MB",
//       maxFileCount: 20, // allow batch uploads
//     },
//   })
//     .input(photoUploadInput)
//     .middleware(async ({ input }) => {
//       // Verify session — unauthenticated uploads are rejected
//       const session = await auth.api.getSession({
//         headers: await headers(),
//       });

//       if (!session) throw new Error("Unauthorized");

//       const { eventId } = input;

//       // Everything returned here is available in onUploadComplete
//       return {
//         studioId: session.user.id,
//         eventId,
//       };
//     })
//     .onUploadComplete(async ({ metadata, file }) => {
//       // This runs SERVER-SIDE after Uploadthing confirms the upload.
//       // We return metadata to the client-side callback.
//       // The actual DB save + Socket.io emit happens in POST /api/photos
//       // because onUploadComplete doesn't have easy access to the io instance.
//       console.log("[Uploadthing] Upload complete:", file.name, "for event:", metadata.eventId);

//       return {
//         url: file.ufsUrl,
//         key: file.key,
//         name: file.name,
//         eventId: metadata.eventId,
//       };
//     }),
// } satisfies FileRouter;

// export type OurFileRouter = typeof ourFileRouter;


// app/api/uploadthing/core.ts
// Uploadthing file router — defines what's accepted, who can upload,
// and what metadata flows through.
//
// KEY FIX: Uses .input(z.object({eventId})) instead of reading URL query params.
// This is the correct Uploadthing v7 pattern — the client passes eventId as the
// second argument to startUpload() and Uploadthing delivers it to middleware
// via `input`. The query-param approach was unreliable.

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

const f = createUploadthing();

export const ourFileRouter = {
  photoUploader: f({
    image: {
      maxFileSize: "16MB",
      maxFileCount: 20,
    },
  })
    // Declare the input schema — client must pass { eventId: string }
    .input(z.object({ eventId: z.string().min(1) }))
    .middleware(async ({ input }) => {
      // Verify the session server-side
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) throw new UploadThingError("Unauthorized");

      // input.eventId comes directly from startUpload(files, { eventId })
      // No manual URL parsing needed
      return {
        userId: session.user.id,
        eventId: input.eventId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UT] Upload complete:", file.name, "| event:", metadata.eventId);

      // Return this to the client's onClientUploadComplete callback
      return {
        url: file.ufsUrl,
        key: file.key,
        name: file.name,
        eventId: metadata.eventId,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;