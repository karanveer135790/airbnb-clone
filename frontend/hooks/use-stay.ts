"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { AvailabilityRange, Listing, Quote } from "@/lib/types";
import { stayError, validDate } from "@/lib/dates";
import { useApp } from "@/components/providers";

export function useStay(listing: Listing) {
  const params = useSearchParams();
  const { user } = useApp();
  const [start, setStart] = useState(() =>
    validDate(params.get("check_in") || "") ? params.get("check_in")! : "",
  );
  const [end, setEnd] = useState(() =>
    validDate(params.get("check_out") || "") ? params.get("check_out")! : "",
  );
  const [guests, setGuests] = useState(() =>
    Math.min(
      listing.max_guests,
      Math.max(1, Math.trunc(Number(params.get("guests"))) || 1),
    ),
  );
  const [blocked, setBlocked] = useState<AvailabilityRange[]>([]),
    [availabilityReady, setAvailabilityReady] = useState(false),
    [availabilityError, setAvailabilityError] = useState("");
  const [quoteResult, setQuote] = useState<{
      value: Quote;
      userId: number;
    } | null>(null),
    [quoteError, setQuoteError] = useState(""),
    [quoting, setQuoting] = useState(false),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    api<AvailabilityRange[]>(`/listings/${listing.id}/availability`, {
      signal: controller.signal,
    })
      .then((ranges) => {
        setBlocked(ranges);
        setAvailabilityReady(true);
        setAvailabilityError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setAvailabilityReady(false);
          setAvailabilityError(
            "Availability could not be loaded. Please retry.",
          );
        }
      });
    return () => controller.abort();
  }, [listing.id, revision]);
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) refresh();
    };
    const timer = setInterval(tick, 30000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, [refresh]);
  const validation = stayError(start, end, blocked);
  useEffect(() => {
    setQuote(null);
    setQuoteError("");
    setQuoting(false);
    if (
      !start ||
      !end ||
      validation ||
      !availabilityReady ||
      !user ||
      user.id === listing.host_id
    )
      return;
    const controller = new AbortController();
    setQuoting(true);
    const timer = setTimeout(
      () =>
        api<Quote>(
          "/bookings/quote",
          {
            method: "POST",
            signal: controller.signal,
            body: JSON.stringify({
              listing_id: listing.id,
              check_in: start,
              check_out: end,
              guests,
            }),
          },
          user.id,
        )
          .then((value) => {
            if (!controller.signal.aborted)
              setQuote({ value, userId: user.id });
          })
          .catch((error) => {
            if (error.name !== "AbortError") setQuoteError(error.message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setQuoting(false);
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    start,
    end,
    guests,
    user?.id,
    listing.id,
    listing.host_id,
    validation,
    availabilityReady,
    revision,
  ]);
  const quote =
    quoteResult &&
    quoteResult.userId === user?.id &&
    quoteResult.value.check_in === start &&
    quoteResult.value.check_out === end &&
    quoteResult.value.guests === guests &&
    !validation
      ? quoteResult.value
      : null;
  const selectDates = (checkIn: string, checkOut: string) => {
    setStart(checkIn);
    setEnd(checkOut);
  };
  return {
    start,
    end,
    guests,
    setGuests,
    selectDates,
    blocked,
    availabilityReady,
    refresh,
    quote,
    quoting,
    error: availabilityError || validation || quoteError,
  };
}
