// app/api/events/[eventId]/qr/route.ts
// Returns the QR code for a specific event as a base64 PNG.
// Called by the dashboard when rendering event cards.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateQRCode } from "@/lib/qr";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.studioId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const qrCode = await generateQRCode(event.slug);

    return NextResponse.json({ qrCode, slug: event.slug });
  } catch (error) {
    console.error("[GET /api/events/[eventId]/qr]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}