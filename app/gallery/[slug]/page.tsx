
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Camera, Users, WifiOff, ImageIcon, Loader2, Radio,
  X, ChevronLeft, ChevronRight, Copy, Check,
} from "lucide-react";

type Photo = { id: string; url: string; fileName: string; uploadedAt: string; };
type EventInfo = { id: string; name: string; slug: string; isActive: boolean; date: string; };

export default function GalleryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set());
  const [viewerCount, setViewerCount] = useState(1);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPhotographerUploading, setIsPhotographerUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const socketRef = useRef(getSocket());
  const touchStartX = useRef(0);

  const galleryUrl = typeof window !== "undefined" ? window.location.href : "";

  // Load photos
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const res = await fetch(`/api/photos?slug=${slug}`);
      if (cancelled) return;
      if (!res.ok) { setNotFound(true); setLoading(false); return; }

      const data = await res.json();
      if (cancelled) return;
      setEvent(data.event);
      setPhotos(data.photos);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Socket.io
  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => { setConnected(true); socket.emit("join-event", slug); };
    const onDisconnect = () => { setConnected(false); };

    const onNewPhoto = (photo: Photo) => {
      setPhotos((prev) => {
        if (prev.some((p) => p.id === photo.id)) return prev;
        return [photo, ...prev];
      });
      setNewPhotoIds((prev) => { const s = new Set(prev); s.add(photo.id); return s; });
      setTimeout(() => {
        setNewPhotoIds((prev) => { const s = new Set(prev); s.delete(photo.id); return s; });
      }, 2500);
    };

    const onViewerCount = (count: number) => setViewerCount(count);
    const onPhotographerUploading = ({ uploading }: { uploading: boolean }) => {
      setIsPhotographerUploading(uploading);
      // Auto-clear the uploading banner after 10s in case the done signal is missed
      if (uploading) {
        setTimeout(() => setIsPhotographerUploading(false), 10000);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new-photo", onNewPhoto);
    socket.on("viewer-count", onViewerCount);
    socket.on("photographer-uploading", onPhotographerUploading);
    socket.connect();

    return () => {
      socket.emit("leave-event", slug);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new-photo", onNewPhoto);
      socket.off("viewer-count", onViewerCount);
      socket.off("photographer-uploading", onPhotographerUploading);
      socket.disconnect();
    };
  }, [slug]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => i !== null ? (i - 1 + photos.length) % photos.length : null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => i !== null ? (i + 1) % photos.length : null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, photos.length]);

  async function copyGalleryLink() {
    await navigator.clipboard.writeText(galleryUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Camera className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Gallery not found</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          This event link is invalid or has been removed.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) return null;

  const eventDate = new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm leading-tight truncate">{event.name}</h1>
              <p className="text-muted-foreground text-xs hidden sm:block">{eventDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Share link */}
            <Button
              variant="outline" size="sm" className="gap-1.5 text-xs h-8 cursor-pointer"
              onClick={copyGalleryLink}
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink ? "Copied!" : "Copy link"}
            </Button>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{viewerCount}</span>
            </div>

            <Separator orientation="vertical" className="h-4" />

            {!connected ? (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                <WifiOff className="h-3 w-3" />Reconnecting
              </Badge>
            ) : event.isActive ? (
              <Badge variant="default" className="gap-1.5 text-xs bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Live
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Event ended</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Event ended banner */}
        {!event.isActive && (
          <div className="flex items-center gap-3 bg-muted/50 border rounded-xl px-4 py-3">
            <Radio className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">This event has ended. The gallery below is the final collection.</p>
          </div>
        )}

        {/* Photographer uploading indicator */}
        {isPhotographerUploading && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">Photographer is uploading new photos...</p>
          </div>
        )}

        {/* Photo count */}
        {photos.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-semibold">{photos.length}</span>{" "}
              {photos.length === 1 ? "photo" : "photos"}
            </p>
            {event.isActive && connected && (
              <p className="text-xs text-muted-foreground">New photos appear automatically</p>
            )}
          </div>
        )}

        {/* Empty state */}
        {photos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="font-semibold mb-1">No photos yet</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              {event.isActive ? "Photos will appear here the moment they are uploaded. Stay on this page!" : "No photos were uploaded to this event."}
            </p>
            {event.isActive && (
              <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Waiting for photos...</span>
              </div>
            )}
          </div>
        )}

        {/* Photo masonry grid */}
        {photos.length > 0 && (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => setLightboxIndex(index)}
                className={`
                  break-inside-avoid rounded-xl overflow-hidden bg-muted border cursor-pointer
                  transition-all duration-500
                  ${newPhotoIds.has(photo.id)
                    ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background scale-[1.02] shadow-lg"
                    : "hover:opacity-90 scale-100"
                  }
                `}
                style={{ animation: newPhotoIds.has(photo.id) ? "fadeSlideIn 0.4s ease-out" : "none" }}
              >
                <Image
                  src={photo.url}
                  alt={photo.fileName}
                  width={1200}
                  height={800}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        {photos.length > 0 && (
          <div className="text-center pt-4 pb-2">
            <p className="text-muted-foreground text-xs">
              Powered by <span className="text-foreground font-medium">SnapLive</span>
            </p>
          </div>
        )}
      </main>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
              if (diff > 0) setLightboxIndex((i) => i !== null ? (i + 1) % photos.length : null);
              else setLightboxIndex((i) => i !== null ? (i - 1 + photos.length) % photos.length : null);
            }
          }}
        >
          {/* Close */}
          <Button
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Prev */}
          {photos.length > 1 && (
            <Button
              className="absolute left-3 sm:left-6 text-white/60 hover:text-white transition-colors z-10 bg-black/30 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i !== null ? (i - 1 + photos.length) % photos.length : null); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Image */}
          <Image
            src={photos[lightboxIndex].url}
            alt={photos[lightboxIndex].fileName}
            width={1600}
            height={1200}
            className="max-h-[90vh] max-w-[90vw] h-auto w-auto object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
            unoptimized
          />

          {/* Next */}
          {photos.length > 1 && (
            <Button
              className="absolute right-3 sm:right-6 text-white/60 hover:text-white transition-colors z-10 bg-black/30 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i !== null ? (i + 1) % photos.length : null); }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm tabular-nums">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Filename */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-xs truncate max-w-xs">
            {photos[lightboxIndex].fileName}
          </div>
        </div>
      )}
    </div>
  );
}







// "use client";

// import { useState, useEffect, useRef } from "react";
// import Image from "next/image";
// import { useParams } from "next/navigation";
// import { getSocket } from "@/lib/socket-client";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import { Button } from "@/components/ui/button";
// import {
//   Camera, Users, WifiOff, ImageIcon, Loader2, Radio,
//   X, ChevronLeft, ChevronRight, Copy, Check,
// } from "lucide-react";

// type Photo = { id: string; url: string; fileName: string; uploadedAt: string; };
// type EventInfo = { id: string; name: string; slug: string; isActive: boolean; date: string; };

// export default function GalleryPage() {
//   const params = useParams();
//   const slug = params.slug as string;

//   const [event, setEvent] = useState<EventInfo | null>(null);
//   const [photos, setPhotos] = useState<Photo[]>([]);
//   const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set());
//   const [viewerCount, setViewerCount] = useState(1);
//   const [connected, setConnected] = useState(false);
//   const [isConnecting, setIsConnecting] = useState(true);   // New: separate connecting state
//   const [loading, setLoading] = useState(true);
//   const [notFound, setNotFound] = useState(false);
//   const [isPhotographerUploading, setIsPhotographerUploading] = useState(false);
//   const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
//   const [copiedLink, setCopiedLink] = useState(false);

//   const socketRef = useRef(getSocket());
//   const touchStartX = useRef(0);

//   const galleryUrl = typeof window !== "undefined" ? window.location.href : "";

//   // Load initial photos
//   useEffect(() => {
//     let cancelled = false;

//     const loadPhotos = async () => {
//       try {
//         const res = await fetch(`/api/photos?slug=${slug}`);
//         if (cancelled) return;

//         if (!res.ok) {
//           setNotFound(true);
//           setLoading(false);
//           return;
//         }

//         const data = await res.json();
//         if (cancelled) return;

//         setEvent(data.event);
//         setPhotos(data.photos || []);
//       } catch (err) {
//         console.error("Failed to load photos:", err);
//         setNotFound(true);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     };

//     void loadPhotos();

//     return () => { cancelled = true; };
//   }, [slug]);

//   // Socket.io connection
//   useEffect(() => {
//     const socket = socketRef.current;
//     if (!socket) return;

//     console.log(`[Gallery] Initializing socket for slug: ${slug}`);

//     const onConnect = () => {
//       console.log(`[Gallery] Connected! ID: ${socket.id}`);
//       setConnected(true);
//       setIsConnecting(false);
//       socket.emit("join-event", slug);
//     };

//     const onDisconnect = (reason: string) => {
//       console.log(`[Gallery] Disconnected: ${reason}`);
//       setConnected(false);
//       setIsConnecting(false);
//     };

//     const onConnectError = (err: Error) => {
//       console.error("[Gallery] Connect error:", err.message);
//       setIsConnecting(false);
//     };

//     const onNewPhoto = (photo: Photo) => {
//       setPhotos((prev) => {
//         if (prev.some((p) => p.id === photo.id)) return prev;
//         return [photo, ...prev];
//       });

//       setNewPhotoIds((prev) => {
//         const s = new Set(prev);
//         s.add(photo.id);
//         return s;
//       });

//       setTimeout(() => {
//         setNewPhotoIds((prev) => {
//           const s = new Set(prev);
//           s.delete(photo.id);
//           return s;
//         });
//       }, 2500);
//     };

//     const onViewerCount = (count: number) => setViewerCount(count);

//     const onPhotographerUploading = ({ uploading }: { uploading: boolean }) => {
//       setIsPhotographerUploading(uploading);
//       if (uploading) {
//         setTimeout(() => setIsPhotographerUploading(false), 10000);
//       }
//     };

//     // Attach listeners
//     socket.on("connect", onConnect);
//     socket.on("disconnect", onDisconnect);
//     socket.on("connect_error", onConnectError);
//     socket.on("new-photo", onNewPhoto);
//     socket.on("viewer-count", onViewerCount);
//     socket.on("photographer-uploading", onPhotographerUploading);

//     // Connect
//     if (!socket.connected) {
//       setIsConnecting(true);
//       socket.connect();
//     } else {
//       setConnected(true);
//       setIsConnecting(false);
//       socket.emit("join-event", slug);
//     }

//     return () => {
//       console.log(`[Gallery] Cleaning up socket for slug: ${slug}`);
//       socket.emit("leave-event", slug);

//       socket.off("connect", onConnect);
//       socket.off("disconnect", onDisconnect);
//       socket.off("connect_error", onConnectError);
//       socket.off("new-photo", onNewPhoto);
//       socket.off("viewer-count", onViewerCount);
//       socket.off("photographer-uploading", onPhotographerUploading);

//       // Optional: don't fully disconnect if you want persistent connection
//       // socket.disconnect();
//     };
//   }, [slug]);

//   // Lightbox keyboard navigation
//   useEffect(() => {
//     if (lightboxIndex === null) return;

//     const handleKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") setLightboxIndex(null);
//       if (e.key === "ArrowLeft")
//         setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null));
//       if (e.key === "ArrowRight")
//         setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null));
//     };

//     window.addEventListener("keydown", handleKey);
//     return () => window.removeEventListener("keydown", handleKey);
//   }, [lightboxIndex, photos.length]);

//   async function copyGalleryLink() {
//     await navigator.clipboard.writeText(galleryUrl);
//     setCopiedLink(true);
//     setTimeout(() => setCopiedLink(false), 2000);
//   }

//   // ... (rest of your UI code remains the same until the badge part)

//   if (notFound) {
//     // ... your not found UI
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//       </div>
//     );
//   }

//   if (!event) return null;

//   const eventDate = new Date(event.date).toLocaleDateString("en-IN", {
//     day: "numeric",
//     month: "long",
//     year: "numeric",
//   });

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header - Updated badge logic */}
//       <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
//         <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
//           {/* ... same as before ... */}

//           <div className="flex items-center gap-2 shrink-0">
//             {/* Share button - same */}

//             <div className="flex items-center gap-1.5 text-muted-foreground">
//               <Users className="h-3.5 w-3.5" />
//               <span className="text-xs font-medium">{viewerCount}</span>
//             </div>

//             <Separator orientation="vertical" className="h-4" />

//             {/* Improved connection badge */}
//             {isConnecting ? (
//               <Badge variant="secondary" className="gap-1.5 text-xs">
//                 <Loader2 className="h-3 w-3 animate-spin" />
//                 Connecting...
//               </Badge>
//             ) : !connected ? (
//               <Badge variant="secondary" className="gap-1.5 text-xs">
//                 <WifiOff className="h-3 w-3" /> Reconnecting
//               </Badge>
//             ) : event.isActive ? (
//               <Badge variant="default" className="gap-1.5 text-xs bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
//                 <span className="relative flex h-2 w-2">
//                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
//                   <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
//                 </span>
//                 Live
//               </Badge>
//             ) : (
//               <Badge variant="secondary" className="text-xs">Event ended</Badge>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* Rest of your main content stays exactly the same */}
//       {/* ... (photographer uploading banner, photo count, empty state, grid, lightbox) ... */}
//     </div>
//   );
// }