"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "./ui/calendar";
import { Loader2, AlertCircle, CalendarIcon } from "lucide-react";

type CreatedEvent = {
  id: string;
  name: string;
  slug: string;
  date: string;
  isActive: boolean;
  createdAt: string;
  _count: { photos: number };
};

type Props = {
  onClose: () => void;
  onCreated: (event: CreatedEvent) => void;
};

export function CreateEventModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Live slug preview
  const slugPreview = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
    if (!name.trim()) {
      setError("Event name is required");
      setLoading(false);
      return;
    }
    if (!selectedDate) {
      setError("Event date is required");
      setLoading(false);
      return;
    }

    const dateStr = selectedDate.toISOString().split("T")[0];

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), date: dateStr }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to create event");
      setLoading(false);
      return;
    }

    // Success
    setLoading(false);
    setName("");
    setSelectedDate(undefined);
    onCreated({ ...data.event, _count: { photos: 0 } });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new event</DialogTitle>
          <DialogDescription>
            A unique gallery URL and QR code will be generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Event name */}
          <div className="space-y-2">
            <Label htmlFor="event-name">Event name</Label>
            <Input
              id="event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Sharma Wedding, Priya's Birthday"
            />
            {slugPreview && (
              <p className="text-muted-foreground text-xs font-mono pl-1">
                Gallery URL: /gallery/{slugPreview}...
              </p>
            )}
          </div>

          {/* Date Picker - Popup style (recommended) */}
          <div className="space-y-2">
            <Label>Event date</Label>
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !selectedDate ? "text-muted-foreground" : ""
                  }`}
                >
                  {selectedDate ? (
                    selectedDate.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="cursor-pointer"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creating..." : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}