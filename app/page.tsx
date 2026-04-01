// app/page.tsx
// Landing page — shown to visitors who open the root URL.
// Redirects logged-in studios to dashboard automatically.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Nav */}
      <header className="border-b px-6 h-14 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">SnapLive</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <Badge variant="secondary" className="mb-6 gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Live photo streaming for events
        </Badge>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl mb-6 leading-tight">
          Guests see photos the moment they are taken
        </h1>

        <p className="text-muted-foreground text-lg max-w-xl mb-10 leading-relaxed">
          Create an event, display the QR code at your venue. Guests scan it and
          watch photos appear live in their browser — no app download needed.
        </p>

        <div className="flex items-center gap-3">
          <Button size="lg">
            <Link href="/signup">Start for free</Link>
          </Button>
          <Button size="lg" variant="outline">
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
          {[
            "Real-time updates",
            "No app download",
            "QR code sharing",
            "Works on any phone",
            "Wedding ready",
          ].map((f) => (
            <span
              key={f}
              className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full border"
            >
              {f}
            </span>
          ))}
        </div>
      </main>

      <footer className="border-t px-6 h-12 flex items-center justify-center">
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} SnapLive. Built for Indian wedding studios.
        </p>
      </footer>
    </div>
  );
}