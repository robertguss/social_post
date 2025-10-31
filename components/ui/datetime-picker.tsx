"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function DateTimePicker({
  date,
  setDate,
  disabled = false,
  placeholder = "Pick a date and time",
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [time, setTime] = React.useState("12:00");

  // Initialize time from date if provided
  React.useEffect(() => {
    if (date) {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}`);
    }
  }, [date]);

  // Handle date selection from calendar
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Parse current time
      const [hours, minutes] = time.split(":").map(Number);

      // Create new date with selected date and current time
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes, 0, 0);

      setDate(newDate);
    } else {
      setDate(undefined);
    }
  };

  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);

    if (date) {
      const [hours, minutes] = newTime.split(":").map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      setDate(newDate);
    }
  };

  // Get minimum date/time (current time)
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "PPP 'at' p")
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={(date) => {
                // Disable dates in the past
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              initialFocus
            />
            <div className="flex items-center gap-2 border-t pt-3">
              <label htmlFor="time-picker" className="text-sm font-medium">
                Time:
              </label>
              <Input
                id="time-picker"
                type="time"
                value={time}
                onChange={handleTimeChange}
                className="w-auto"
              />
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              className="w-full"
              size="sm"
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
