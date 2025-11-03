"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface PreferenceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimeRange {
  startHour: number;
  endHour: number;
}

export function PreferenceForm({ open, onOpenChange }: PreferenceFormProps) {
  const [platform, setPlatform] = useState<"twitter" | "linkedin">("twitter");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Default to Monday
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([
    { startHour: 9, endHour: 11 }, // Default 9-11am
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setPreference = useMutation(api.postingPreferences.setPostingPreference);

  const handleSubmit = async () => {
    // Validation
    if (timeRanges.length === 0) {
      toast.error("Please add at least one time range");
      return;
    }

    for (const range of timeRanges) {
      if (range.startHour >= range.endHour) {
        toast.error("Start time must be before end time");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await setPreference({
        platform,
        dayOfWeek,
        customTimeRanges: timeRanges,
      });

      toast.success("Preference saved!", {
        description: "Your scheduler will now prioritize this time window",
      });

      // Reset form
      setPlatform("twitter");
      setDayOfWeek(1);
      setTimeRanges([{ startHour: 9, endHour: 11 }]);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save preference", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTimeRange = () => {
    setTimeRanges([...timeRanges, { startHour: 14, endHour: 16 }]); // Default 2-4pm
  };

  const removeTimeRange = (index: number) => {
    setTimeRanges(timeRanges.filter((_, i) => i !== index));
  };

  const updateTimeRange = (index: number, field: "startHour" | "endHour", value: number) => {
    const newRanges = [...timeRanges];
    newRanges[index][field] = value;
    setTimeRanges(newRanges);
  };

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Posting Preference</DialogTitle>
          <DialogDescription>
            Define your preferred posting time for a specific platform and day. Times are in your
            timezone: {userTimezone}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as "twitter" | "linkedin")}>
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day of Week Selection */}
          <div className="space-y-2">
            <Label htmlFor="day">Day of Week</Label>
            <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
              <SelectTrigger id="day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Ranges */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Time Windows</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTimeRange}>
                <Plus className="mr-2 h-4 w-4" />
                Add Window
              </Button>
            </div>

            <div className="space-y-3">
              {timeRanges.map((range, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {/* Start Hour */}
                      <div className="flex-1">
                        <Label htmlFor={`start-${index}`} className="text-xs">
                          Start
                        </Label>
                        <Select
                          value={range.startHour.toString()}
                          onValueChange={(v) => updateTimeRange(index, "startHour", parseInt(v))}
                        >
                          <SelectTrigger id={`start-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {formatHour(i)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* End Hour */}
                      <div className="flex-1">
                        <Label htmlFor={`end-${index}`} className="text-xs">
                          End
                        </Label>
                        <Select
                          value={range.endHour.toString()}
                          onValueChange={(v) => updateTimeRange(index, "endHour", parseInt(v))}
                        >
                          <SelectTrigger id={`end-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {formatHour(i)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {timeRanges.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTimeRange(index)}
                      className="mt-5"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              You can add multiple time windows for the same day (e.g., 7-9am and 5-7pm)
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm font-medium">Preview:</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {platform === "twitter" ? "Twitter" : "LinkedIn"} on {getDayName(dayOfWeek)}:
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
              {timeRanges.map((range, index) => (
                <li key={index}>
                  {formatHour(range.startHour)} - {formatHour(range.endHour)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Preference"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getDayName(dayOfWeek: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayOfWeek];
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}
