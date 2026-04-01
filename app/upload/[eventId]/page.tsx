"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUploadThing } from "@/lib/uploadthing-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Upload,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  WifiOff,
} from "lucide-react";
import { QRCodeModal } from "@/components/qrModal";
import Image from "next/image";


type Photo = {
  id: string;
  url: string;
  fileName: string;
  uploadedAt: string;
};

type UploadItem = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

type EventInfo = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  date: string;
};

export default function UploadPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [showQR, setShowQR] = useState(false);

  // Keep a ref in sync with uploadQueue so callbacks always see current state.
  // Without this, onClientUploadComplete captures the initial empty array
  // and find() always returns undefined — photos never get saved to DB.
  const uploadQueueRef = useRef<UploadItem[]>([]);
  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
  }, [uploadQueue]);

  // Load event info + existing photos on mount
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/photos?eventId=${eventId}`);
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setEvent(data.event);
      setPhotos(data.photos);
      setLoadingEvent(false);
    }
    load();
  }, [eventId, router]);

  // Save photo to DB + trigger Socket.io broadcast
  const savePhoto = useCallback(
    async (url: string, key: string, fileName: string, itemId: string) => {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, key, fileName, eventId }),
      });

      if (res.ok) {
        const data = await res.json();
        setPhotos((prev) => [data.photo, ...prev]);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, status: "done", progress: 100 }
              : item,
          ),
        );
      } else {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, status: "error", error: "Failed to save photo" }
              : item,
          ),
        );
      }
    },
    [eventId],
  );

  const { startUpload } = useUploadThing("photoUploader", {
    onUploadProgress: (progress) => {
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.status === "uploading" ? { ...item, progress } : item,
        ),
      );
    },

    onClientUploadComplete: (res) => {
      // Use uploadQueueRef.current (not uploadQueue) to avoid stale closure.
      // At the time this callback fires, uploadQueue from the outer closure
      // is the snapshot from when useUploadThing was initialised — always [].
      res?.forEach((file) => {
        const queueItem = uploadQueueRef.current.find(
          (item) => item.file.name === file.name && item.status === "uploading",
        );
        if (queueItem) {
          void savePhoto(file.ufsUrl, file.key, file.name, queueItem.id);
        }
      });
    },

    onUploadError: (error) => {
      console.error("[UT error]", error.message);
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.status === "uploading"
            ? { ...item, status: "error", error: error.message }
            : item,
        ),
      );
    },
  });

  async function handleFiles(files: FileList | File[]) {
    if (!event?.isActive) return;
    const fileArray = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!fileArray.length) return;

    const newItems: UploadItem[] = fileArray.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: "uploading",
      progress: 0,
    }));

    setUploadQueue((prev) => [...newItems, ...prev]);

    // Pass eventId via Uploadthing's input schema (second arg to startUpload)
    await startUpload(fileArray, { eventId });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  }
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) void handleFiles(e.target.files);
    e.target.value = "";
  }

  const activeUploads = uploadQueue.filter(
    (i) => i.status === "uploading",
  ).length;

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm truncate">{event.name}</h1>
                <Badge
                  variant={event.isActive ? "default" : "secondary"}
                  className={
                    event.isActive
                      ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10 text-xs shrink-0"
                      : "text-xs shrink-0"
                  }
                >
                  {event.isActive ? "Live" : "Ended"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                {photos.length} photos uploaded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeUploads > 0 && (
              <Badge variant="secondary" className="gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                {activeUploads} uploading
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQR(true)}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View QR code</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Event ended banner */}
        {!event.isActive && (
          <div className="flex items-center gap-3 bg-muted/50 border rounded-xl px-4 py-3">
            <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              This event has ended. Reactivate it from the dashboard to enable
              uploads.
            </p>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() =>
            event.isActive && document.getElementById("file-input")?.click()
          }
          className={`
            relative border-2 border-dashed rounded-2xl transition-all
            flex flex-col items-center justify-center text-center
            min-h-[240px] p-8
            ${
              event.isActive
                ? isDragging
                  ? "border-primary bg-primary/5 scale-[1.01] cursor-copy"
                  : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                : "border-border bg-muted/20 opacity-60 cursor-not-allowed"
            }
          `}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
            disabled={!event.isActive}
          />
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              isDragging ? "bg-primary/10" : "bg-muted"
            }`}
          >
            <Upload
              className={`h-6 w-6 ${
                isDragging ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
          {isDragging ? (
            <p className="text-primary font-semibold text-lg">
              Drop photos here
            </p>
          ) : (
            <>
              <p className="font-semibold text-base mb-1">
                {event.isActive ? "Drop photos here" : "Uploads disabled"}
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                {event.isActive
                  ? "JPEG, PNG, HEIC up to 16MB — 20 files at a time"
                  : "This event has ended"}
              </p>
              {event.isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                  Browse files
                </Button>
              )}
            </>
          )}
        </div>

        {/* Upload queue */}
        {uploadQueue.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Upload queue</h2>
            {uploadQueue.slice(0, 8).map((item) => (
              <Card key={item.id} className="border-border">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {item.status === "done" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {item.status === "error" && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      {item.status === "uploading" && (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground w-12 text-right">
                      {item.status === "uploading" && `${item.progress}%`}
                      {item.status === "done" && (
                        <span className="text-green-600">Done</span>
                      )}
                      {item.status === "error" && (
                        <span className="text-destructive">Failed</span>
                      )}
                    </div>
                  </div>
                  {item.status === "uploading" && (
                    <Progress value={item.progress} className="mt-2 h-1" />
                  )}
                  {item.status === "error" && item.error && (
                    <p className="text-xs text-destructive mt-1">
                      {item.error}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {uploadQueue.length > 8 && (
              <p className="text-xs text-muted-foreground text-center">
                +{uploadQueue.length - 8} more
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Photo grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium">
            Uploaded photos{" "}
            <span className="text-muted-foreground font-normal">
              ({photos.length})
            </span>
          </h2>

          {photos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                No photos yet — drop some above to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-xl overflow-hidden bg-muted border border-border group relative"
                >
                  <Image src={photo.url} alt={photo.fileName}     
                   width={800}
      height={500}
       placeholder="empty" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>

                  {/* <img
                    src={photo.url}
                    alt={photo.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  /> */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-white text-xs truncate">
                      {photo.fileName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showQR && <QRCodeModal event={event} onClose={() => setShowQR(false)} />}
    </div>
  );
}
