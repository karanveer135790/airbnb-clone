"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayUnavailable, validDate } from "@/lib/dates";
import type { AvailabilityRange } from "@/lib/types";
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function DatePicker({
  start,
  end,
  onChange,
  blocked = [],
}: {
  start: string;
  end: string;
  blocked?: AvailabilityRange[];
  onChange: (start: string, end: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const now = validDate(start) ? new Date(`${start}T12:00:00Z`) : new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const today = new Date().toISOString().slice(0, 10);
  const select = (day: string) => {
    if (!start || end || day <= start) onChange(day, "");
    else onChange(start, day);
  };
  return (
    <div className="date-picker">
      <div className="calendar-controls">
        <button
          type="button"
          className="icon-button"
          aria-label="Previous month"
          disabled={iso(month).slice(0, 7) <= today.slice(0, 7)}
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <ChevronLeft size={19} />
        </button>
        <span>Select your travel dates</span>
        <button
          type="button"
          className="icon-button"
          aria-label="Next month"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <ChevronRight size={19} />
        </button>
      </div>
      <div className="calendars">
        {[0, 1].map((offset) => {
          const current = new Date(
            month.getFullYear(),
            month.getMonth() + offset,
            1,
          );
          const count = new Date(
            current.getFullYear(),
            current.getMonth() + 1,
            0,
          ).getDate();
          return (
            <section key={offset} className={offset ? "second-calendar" : ""}>
              <h3>
                {current.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <div className="calendar-grid">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span className="weekday" key={d}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: current.getDay() }, (_, i) => (
                  <span key={`blank${i}`} />
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const day = iso(
                    new Date(current.getFullYear(), current.getMonth(), i + 1),
                  );
                  const selected = day === start || day === end;
                  return (
                    <button
                      type="button"
                      aria-label={day}
                      aria-pressed={selected}
                      disabled={dayUnavailable(day, start, end, blocked, today)}
                      key={day}
                      className={`calendar-day ${selected ? "selected" : ""} ${start && end && day > start && day < end ? "in-range" : ""}`}
                      onClick={() => select(day)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <button
        type="button"
        className="text-button"
        onClick={() => onChange("", "")}
      >
        Clear dates
      </button>
    </div>
  );
}
