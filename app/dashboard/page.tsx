
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { QRCodeModal } from "@/components/qrModal";
import { CreateEventModal } from "@/components/createEventModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Upload, MoreVertical, Plus, Images, LogOut, Trash2, Power, PowerOff, Camera, Copy, Check, Key, RefreshCw, Eye, EyeOff, Loader2, Info } from "lucide-react";

type Event = {
  id: string;
  name: string;
  slug: string;
  date: string;
  isActive: boolean;
  createdAt: string;
  _count: { photos: number };
};

type SessionUserWithStudio = {
  name?: string | null;
  studioName?: string | null;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [qrEvent, setQrEvent] = useState<Event | null>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [serverUrl] = useState(() => (
    typeof window !== "undefined" ? window.location.origin : ""
  ));
  const sessionUser = session?.user as SessionUserWithStudio | undefined;

  useEffect(() => {
    fetch("/api/studio/api-key")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.apiKey) setApiKey(data.apiKey); });
  }, []);

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) { const data = await res.json(); setEvents(data.events); }
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchEvents();
    })();
  }, [fetchEvents]);

  async function generateApiKey() {
    setApiKeyLoading(true);
    const res = await fetch("/api/studio/api-key", { method: "POST" });
    if (res.ok) { const data = await res.json(); setApiKey(data.apiKey); setApiKeyVisible(true); }
    setApiKeyLoading(false);
  }

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function toggleActive(event: Event) {
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !event.isActive }),
    });
    if (res.ok) setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, isActive: !e.isActive } : e));
  }

  async function deleteEvent(eventId: string) {
    if (!confirm("Delete this event and all its photos? This cannot be undone.")) return;
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  function handleEventCreated(newEvent: Event) { setEvents((prev) => [newEvent, ...prev]); setShowCreate(false); }

  async function handleSignOut() { await signOut(); router.push("/signin"); }

  const liveCount = events.filter((e) => e.isActive).length;
  const maskedKey = apiKey ? `slk_${"•".repeat(32)}` : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SnapLive</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm hidden sm:block border-2 px-6 rounded-2xl">{sessionUser?.studioName ?? sessionUser?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground cursor-pointer">
              <LogOut className="h-4 w-4 mr-1.5" />Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total events", value: events.length },
            { label: "Live now", value: liveCount },
            { label: "Total photos", value: events.reduce((a, e) => a + e._count.photos, 0) },
            { label: "Ended events", value: events.filter((e) => !e.isActive).length },
          ].map((s) => (
            <Card key={s.label} className="border-border">
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{loading ? "—" : s.value}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Photographer Setup */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Setup Guide</CardTitle>
            </div>
            <CardDescription>
              Give your photographer these 3 values to configure the SnapLive desktop app. One API key works for all events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Server URL */}
              <div>
  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">1. Server URL</p>
  <div className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-2.5">
    
    {/* 1. Added suppressHydrationWarning */}
    <code suppressHydrationWarning className="text-xs flex-1 truncate">
      {serverUrl || "..."}
    </code>
    
      <Tooltip>
        {/* 2. Added asChild here */}
        <TooltipTrigger>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 shrink-0 cursor-pointer" 
            // 3. Added fallback empty string for TypeScript
            onClick={() => copyText(serverUrl || "", "url")} 
          >
            {copiedId === "url" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy URL</TooltipContent>
      </Tooltip>
  </div>
</div>

              {/* API Key */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">2. API key</p>
                {apiKey ? (
                  <div className="flex items-center gap-1 bg-muted/50 border rounded-lg px-3 py-2.5">
                    <code className="text-xs flex-1 truncate font-mono">{apiKeyVisible ? apiKey : maskedKey}</code>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 cursor-pointer" onClick={() => setApiKeyVisible(!apiKeyVisible)}>
                            {apiKeyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{apiKeyVisible ? "Hide" : "Show"}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 cursor-pointer" onClick={() => copyText(apiKey, "apikey")}>
                            {copiedId === "apikey" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy key</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 cursor-pointer" onClick={generateApiKey} disabled={apiKeyLoading}>
                            <RefreshCw className={`h-3.5 w-3.5 ${apiKeyLoading ? "animate-spin" : ""}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rotate key</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={generateApiKey} disabled={apiKeyLoading} className="gap-1.5">
                    {apiKeyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                    Generate API key
                  </Button>
                )}
              </div>
            </div>

            <Alert className="border-muted py-2">
              <Info className="h-3.5 w-3.5 mt-0.5" />
              <AlertDescription className="text-xs text-muted-foreground">
                The <strong>Event ID</strong> (step 3) is shown on each event card below — click the copy button next to it.
                Rotating the API key disconnects any running desktop app sessions.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Events */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your events</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your live photo streaming events</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" />New event
          </Button>
        </div>

        <Separator />

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-5 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2 mt-2" /></CardHeader>
                <CardContent><div className="h-8 bg-muted rounded w-1/3" /></CardContent>
                <CardFooter><div className="h-9 bg-muted rounded w-full" /></CardFooter>
              </Card>
            ))}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Camera className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No events yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">Create your first event to get a QR code and start streaming photos live.</p>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="h-4 w-4" />Create your first event</Button>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                copiedId={copiedId}
                onCopy={copyText}
                onToggleActive={() => toggleActive(event)}
                onDelete={() => deleteEvent(event.id)}
                onShowQR={() => setQrEvent(event)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreated={handleEventCreated} />}
      {qrEvent && <QRCodeModal event={qrEvent} onClose={() => setQrEvent(null)} />}
    </div>
  );
}

type EventCardProps = {
  event: Event;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onShowQR: () => void;
};

function EventCard({ event, copiedId, onCopy, onToggleActive, onDelete, onShowQR }: EventCardProps) {
  const date = new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{event.name}</CardTitle>
            <p className="text-muted-foreground text-xs mt-1">{date}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={event.isActive ? "default" : "secondary"} className={event.isActive ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10" : ""}>
              {event.isActive ? "Live" : "Ended"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onToggleActive} className="cursor-pointer">
                  {event.isActive ? <><PowerOff className="mr-2 h-4 w-4" />End event</> : <><Power className="mr-2 h-4 w-4" />Reactivate</>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive cursor-pointer">
                  <Trash2 className="mr-2 h-4 w-4" />Delete event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4 flex-1 space-y-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Images className="h-4 w-4" />
          <span className="text-sm font-medium text-foreground">{event._count.photos}</span>
          <span className="text-xs">photos</span>
        </div>

        {/* Event ID with copy — step 3 for Electron setup */}
        <TooltipProvider>
          <div className="flex items-center gap-2 bg-muted/50 border rounded-lg px-2.5 py-1.5">
            <p className="text-xs text-muted-foreground shrink-0">Event ID</p>
            <code className="text-xs font-mono flex-1 truncate">{event.id}</code>
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 cursor-pointer" onClick={() => onCopy(event.id, `id-${event.id}`)}>
                  {copiedId === `id-${event.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy Event ID</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
      <Button variant="outline" size="sm" className="flex-1 p-0">
  <Link
    href="#"
    onClick={onShowQR}
    className="flex items-center justify-center gap-1.5 w-full h-full px-3 py-2 cursor-pointer"
  >
    <QrCode className="h-3.5 w-3.5" />
    QR code
  </Link>
</Button>
<Button variant="outline" size="sm" className="flex-1 p-0">
  <Link
    href={`/upload/${event.id}`}
    className="flex items-center justify-center gap-1.5 w-full h-full px-3 py-2 cursor-pointer"
  >
    <Upload className="h-3.5 w-3.5" />
    Upload
  </Link>
</Button>
      </CardFooter>
    </Card>
  );
}