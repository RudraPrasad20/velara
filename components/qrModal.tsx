"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  Copy,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";

type Event = {
  id: string;
  name: string;
  slug: string;
  date: string;
  isActive: boolean;
};

type Props = {
  event: Event;
  onClose: () => void;
};

export function QRCodeModal({ event, onClose }: Props) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const galleryUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/gallery/${event.slug}`
    : `http://localhost:3000/gallery/${event.slug}`;

  const eventDate = new Date(event.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    async function fetchQR() {
      const res = await fetch(`/api/events/${event.id}/qr`);
      if (res.ok) {
        const data = await res.json();
        setQrCode(data.qrCode);
      }
      setLoading(false);
    }
    fetchQR();
  }, [event.id]);

  async function copyUrl() {
    await navigator.clipboard.writeText(galleryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQR() {
    if (!qrCode) return;
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `${event.slug}-qr.png`;
    link.click();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-base">{event.name}</DialogTitle>
            <Badge
              variant={event.isActive ? "default" : "secondary"}
              className={
                event.isActive
                  ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10 text-xs"
                  : "text-xs"
              }
            >
              {event.isActive ? "Live" : "Ended"}
            </Badge>
          </div>
          <DialogDescription>{eventDate}</DialogDescription>
        </DialogHeader>

        {/* QR code display */}
    {/* QR code */}
<div className="flex items-center justify-center bg-white rounded-xl p-4 sm:p-5 min-h-[200px] border">
  {loading ? (
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  ) : qrCode ? (
    <div className="relative w-[160px] h-[160px] sm:w-[190px] sm:h-[190px]">
      <Image
        src={qrCode}
        alt={`QR code for ${event.name}`}
        fill
        sizes="(max-width: 640px) 160px, 190px"
        className="object-contain"
      />
    </div>
  ) : (
    <p className="text-muted-foreground text-sm">Failed to load QR</p>
  )}
</div>

        <Separator />

        {/* Gallery URL row */}
       {/* URL row fix overflow */}
<div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2.5 overflow-hidden">
          <p className="text-xs font-mono text-muted-foreground flex-1 truncate">
            {galleryUrl}
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 cursor-pointer"
                  onClick={copyUrl}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy URL"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  
                >
                  <a href={galleryUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open gallery</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Download */}
        <Button
          onClick={downloadQR}
          disabled={!qrCode || loading}
          className="w-full gap-2 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Download QR code
        </Button>

        <p className="text-muted-foreground text-xs text-center">
          Print or display this QR at the venue entrance for guests to scan.
        </p>
      </DialogContent>
    </Dialog>
  );
}