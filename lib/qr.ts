// lib/qrcode.ts
// Generates a QR code as a base64 PNG data URL.
// The QR encodes the full public gallery URL for the event.
// Usage: const qr = await generateQRCode("sharma-wedding-feb-2025")
// Returns: "data:image/png;base64,iVBOR..."

import QRCode from "qrcode";

export async function generateQRCode(slug: string): Promise<string> {
  const galleryUrl = `${process.env.BETTER_AUTH_URL}/gallery/${slug}`;

  const dataUrl = await QRCode.toDataURL(galleryUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H", // High — survives partial damage when printed
  });

  return dataUrl;
}