"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Minus, Plus, X } from "lucide-react";
import { SearchFilters } from "@/lib/types";
import { DatePicker } from "./date-picker";
const displayDate = (date: string) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Add dates";
export function SearchBar({
  filters,
  onApply,
  openSignal,
}: {
  filters: SearchFilters;
  onApply: (f: Partial<SearchFilters>) => void;
  openSignal: number;
}) {
  const [active, setActive] = useState<"where" | "dates" | "guests" | null>(
      null,
    ),
    [draft, setDraft] = useState(filters),
    [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setDraft(filters), [filters]);
  useEffect(() => {
    if (openSignal) setActive("where");
  }, [openSignal]);
  useEffect(() => {
    const handle = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setActive(null);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("pointerdown", handle);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", handle);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  function submit() {
    if (Boolean(draft.check_in) !== Boolean(draft.check_out)) {
      setError("Choose both check-in and check-out.");
      setActive("dates");
      return;
    }
    setError("");
    onApply({
      location: draft.location,
      check_in: draft.check_in,
      check_out: draft.check_out,
      guests: draft.guests,
    });
    setActive(null);
  }
  return (
    <div className="search-section" ref={root}>
      <div className={`search-bar ${active ? "expanded" : ""}`}>
        <button
          aria-expanded={active === "where"}
          className={`search-cell where ${active === "where" ? "selected" : ""}`}
          onClick={() => setActive(active === "where" ? null : "where")}
        >
          <strong>Where</strong>
          <span>{draft.location || "Search destinations"}</span>
        </button>
        <button
          aria-expanded={active === "dates"}
          className={`search-cell date-cell ${active === "dates" ? "selected" : ""}`}
          onClick={() => setActive(active === "dates" ? null : "dates")}
        >
          <strong>Check in</strong>
          <span>{displayDate(draft.check_in)}</span>
        </button>
        <button
          className="search-cell date-cell"
          onClick={() => setActive("dates")}
        >
          <strong>Check out</strong>
          <span>{displayDate(draft.check_out)}</span>
        </button>
        <button
          aria-expanded={active === "guests"}
          className={`search-cell guests ${active === "guests" ? "selected" : ""}`}
          onClick={() => setActive(active === "guests" ? null : "guests")}
        >
          <strong>Who</strong>
          <span>
            {draft.guests > 1 ? `${draft.guests} guests` : "Add guests"}
          </span>
        </button>
        <button
          className="search-submit"
          aria-label="Search stays"
          onClick={submit}
        >
          <Search size={20} />
          {active && <span>Search</span>}
        </button>
      </div>
      {active && (
        <section
          className={`search-popover ${active}`}
          aria-label={`${active} search`}
        >
          <button
            className="popover-close icon-button"
            aria-label="Close search panel"
            onClick={() => setActive(null)}
          >
            <X size={18} />
          </button>
          <div className="mobile-search-tabs">
            {(["where", "dates", "guests"] as const).map((tab) => (
              <button
                key={tab}
                className={active === tab ? "active" : ""}
                onClick={() => setActive(tab)}
              >
                {tab === "where" ? "Where" : tab === "dates" ? "When" : "Who"}
              </button>
            ))}
          </div>
          {active === "where" && (
            <>
              <h2>Search by destination</h2>
              <label className="destination-input">
                <Search size={20} />
                <input
                  autoFocus
                  placeholder="Search cities, countries, or homes"
                  value={draft.location}
                  onChange={(e) =>
                    setDraft({ ...draft, location: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setActive("dates");
                  }}
                />
              </label>
              {["Malibu", "Lisbon", "Ubud", "Kyoto"]
                .filter(
                  (c) =>
                    !draft.location ||
                    c.toLowerCase().includes(draft.location.toLowerCase()),
                )
                .map((city, i) => (
                  <button
                    key={city}
                    className="destination-option"
                    onClick={() => {
                      setDraft({ ...draft, location: city });
                      setActive("dates");
                    }}
                  >
                    <span className={`destination-icon tone-${i}`}>
                      <MapPin size={23} />
                    </span>
                    <span>
                      <strong>{city}</strong>
                      <small>
                        {
                          [
                            "Beach days and ocean views",
                            "A city full of character",
                            "Slow down in the tropics",
                            "Discover something new",
                          ][i]
                        }
                      </small>
                    </span>
                  </button>
                ))}
            </>
          )}
          {active === "dates" && (
            <>
              <DatePicker
                start={draft.check_in}
                end={draft.check_out}
                onChange={(check_in, check_out) =>
                  setDraft({ ...draft, check_in, check_out })
                }
              />
              <button
                className="button-dark float-right"
                onClick={() => {
                  if (draft.check_in && !draft.check_out) {
                    setError("Choose a check-out date.");
                    return;
                  }
                  setError("");
                  setActive("guests");
                }}
              >
                Next
              </button>
            </>
          )}
          {active === "guests" && (
            <>
              <h2>Who’s coming?</h2>
              <div className="guest-row">
                <span>
                  <strong>Guests</strong>
                  <small>How many people are staying?</small>
                </span>
                <div className="counter">
                  <button
                    className="icon-button"
                    aria-label="Remove guest"
                    disabled={draft.guests <= 1}
                    onClick={() =>
                      setDraft({ ...draft, guests: draft.guests - 1 })
                    }
                  >
                    <Minus size={17} />
                  </button>
                  <span>{draft.guests}</span>
                  <button
                    className="icon-button"
                    aria-label="Add guest"
                    disabled={draft.guests >= 30}
                    onClick={() =>
                      setDraft({ ...draft, guests: draft.guests + 1 })
                    }
                  >
                    <Plus size={17} />
                  </button>
                </div>
              </div>
              <button className="button-brand full-width" onClick={submit}>
                Search stays
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
