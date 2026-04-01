// app/api/photos/route.ts
// Called by the upload page AFTER Uploadthing confirms each file.
// Does two things:
//   1. Saves the photo record to Neon DB
//   2. Emits 'new-photo' via Socket.io to all guests watching that event
//
// Why separate from Uploadthing's onUploadComplete?
// Because onUploadComplete runs in Uploadthing's context and doesn't have
// access to our Socket.io instance. This route runs on our custom server
// which has `global.io` attached.

import { NextRequest, NextResponse } from "next/server";
import type { Server as SocketIOServer } from "socket.io";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const globalForIo = globalThis as typeof globalThis & { io?: SocketIOServer };

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url, key, fileName, eventId } = body;

    // Basic validation
    if (!url || !key || !fileName || !eventId) {
      return NextResponse.json(
        { error: "url, key, fileName and eventId are required" },
        { status: 400 }
      );
    }

    // Verify the event belongs to this studio
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.studioId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!event.isActive) {
      return NextResponse.json(
        { error: "This event has ended — uploads are disabled" },
        { status: 403 }
      );
    }

    // Save photo to database
    const photo = await db.photo.create({
      data: {
        url,
        key,
        fileName,
        eventId,
      },
    });

    // Emit to all guests watching this event via Socket.io.
    // global.io is attached in server.ts when the custom server starts.
    // We emit to the room named after the event's slug so the gallery
    // page can join by slug without knowing the internal eventId.
    const io = globalForIo.io;

    if (io) {
      io.to(event.slug).emit("new-photo", {
        id: photo.id,
        url: photo.url,
        fileName: photo.fileName,
        uploadedAt: photo.uploadedAt,
        eventId: photo.eventId,
      });
      console.log(`[Socket.io] Emitted new-photo to room: ${event.slug}`);
    } else {
      console.warn("[Socket.io] io instance not found on global — photo saved but not broadcast");
    }

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/photos]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/photos?eventId=xxx
// Returns all photos for an event. Used by the gallery page on initial load
// to populate existing photos before the Socket.io listener takes over.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const slug = searchParams.get("slug");

    if (!eventId && !slug) {
      return NextResponse.json(
        { error: "eventId or slug is required" },
        { status: 400 }
      );
    }

    // Look up by slug (used by public gallery) or eventId (used by upload page)
    const event = await db.event.findUnique({
      where: eventId ? { id: eventId } : { slug: slug! },
      include: {
        photos: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      photos: event.photos,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        isActive: event.isActive,
        date: event.date,
      },
    });
  } catch (error) {
    console.error("[GET /api/photos]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}