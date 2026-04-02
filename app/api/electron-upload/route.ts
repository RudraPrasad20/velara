import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { prisma } from "@/lib/prisma";
import type { Server as SocketIOServer } from "socket.io";

// Typed global declaration — matches server.ts
declare global {

  var io: SocketIOServer | undefined;
}

const utapi = new UTApi();

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");

    console.log("[electron-upload] Received raw header:", JSON.stringify(apiKey));
    console.log("[electron-upload] Starts with slk_?", apiKey?.startsWith("slk_"));
    
    if (!apiKey) {
      console.log("[electron-upload] No x-api-key header found");
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    if (!apiKey.startsWith("slk_")) {
      console.log("[electron-upload] Wrong key format:", apiKey.slice(0, 8));
      return NextResponse.json({ error: "Invalid API key format" }, { status: 401 });
    }

    // prisma — NOT prisma (lib/prisma doesn't exist, lib/prisma does)
    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: { id: true, email: true },
    });

    if (!user) {
      console.log("[electron-upload] No user found for API key");
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    console.log(`[electron-upload] Auth OK for: ${user.email}`);

    const body = await req.json();
    const { fileName, mimeType, base64, eventId } = body;

    if (!fileName || !mimeType || !base64 || !eventId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const estimatedSizeBytes = (base64.length * 3) / 4;
    if (estimatedSizeBytes > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 413 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.studioId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!event.isActive) return NextResponse.json({ error: "Event has ended" }, { status: 403 });

    const buffer = Buffer.from(base64, "base64");
    const blob = new Blob([buffer], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });

    const uploaded = await utapi.uploadFiles([file]);
    const result = uploaded[0];
    if (result.error) throw new Error(result.error.message);

    const { ufsUrl: url, key } = result.data;

    const photo = await prisma.photo.create({
      data: { url, key, fileName, eventId },
    });

    // Use typed global.io instead of (global as any).io
    if (global.io) {
      global.io.to(event.slug).emit("new-photo", {
        id: photo.id,
        url: photo.url,
        fileName: photo.fileName,
        uploadedAt: photo.uploadedAt,
        eventId: photo.eventId,
      });
    }

    return NextResponse.json({ photo }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[electron-upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}