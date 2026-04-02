// app/api/events/route.ts
// Handles GET (list studio's events) and POST (create new event).
// Both routes are protected — requires a valid Better Auth session.

import { NextRequest, NextResponse } from "next/server";


import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slugify";
import { generateQRCode } from "@/lib/qr";

// GET /api/events
// Returns all events belonging to the logged-in studio, newest first.
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await prisma.event.findMany({
      where: { studioId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { photos: true }, // include photo count per event
        },
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("[GET /api/events]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/events
// Creates a new event. Generates slug and QR code automatically.
// Body: { name: string, date: string (ISO) }
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, date } = body;

    // --- Validation ---
    if (!name || !date) {
      return NextResponse.json(
        { error: "Event name and date are required" },
        { status: 400 }
      );
    }

    if (name.trim().length < 3) {
      return NextResponse.json(
        { error: "Event name must be at least 3 characters" },
        { status: 400 }
      );
    }

    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // --- Slug generation ---
    const slug = await generateUniqueSlug(name.trim(), eventDate);

    // --- Create event in DB ---
    const event = await prisma.event.create({
      data: {
        name: name.trim(),
        slug,
        date: eventDate,
        isActive: true,
        studioId: session.user.id,
      },
    });

    // --- Generate QR code ---
    // We generate after creation so we have the real slug confirmed
    const qrCode = await generateQRCode(slug);

    return NextResponse.json(
      {
        message: "Event created successfully",
        event: {
          ...event,
          qrCode, // base64 PNG data URL
          photoCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/events]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}