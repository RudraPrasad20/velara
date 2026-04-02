// app/api/events/[eventId]/route.ts
// Handles PATCH (toggle isActive) and DELETE for a specific event.
// Ownership is verified — studios can only modify their own events.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = { params: Promise<{ eventId: string }> };

// PATCH /api/events/[eventId]
// Toggle isActive or update event name/date
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const body = await req.json();

    // Verify ownership before updating
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.studioId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update data — only update fields that were sent
    const updateData: { isActive?: boolean; name?: string; date?: Date } = {};

    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }
    if (body.name) {
      updateData.name = body.name.trim();
    }
    if (body.date) {
      updateData.date = new Date(body.date);
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    return NextResponse.json({ event: updated });
  } catch (error) {
    console.error("[PATCH /api/events/[eventId]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]
// Deletes the event and all its photos
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.studioId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete photos first (foreign key constraint), then the event
    await prisma.photo.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/events/[eventId]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}