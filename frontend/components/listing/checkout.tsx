"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, LockKeyhole } from "lucide-react";
import { api, ApiError, preciseMoney } from "@/lib/api";
import { dateLabel } from "@/lib/dates";
import type { Booking, Listing, Quote } from "@/lib/types";
import { Modal } from "@/components/modal";
import { useApp } from "@/components/providers";
import { PropertyPhoto } from "./gallery";
import { PriceBreakdown } from "./price-breakdown";

export function Checkout({
  listing,
  quote,
  userId,
  onClose,
  onConflict,
}: {
  listing: Listing;
  quote: Quote;
  userId: number;
  onClose: () => void;
  onConflict: () => void;
}) {
  const router = useRouter(),
    { user } = useApp();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false);
  const inFlight = useRef(false);
  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || user?.id !== userId || stale) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const booking = await api<Booking>(
        "/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            listing_id: listing.id,
            check_in: quote.check_in,
            check_out: quote.check_out,
            guests: quote.guests,
            expected_total_cents: quote.total_cents,
          }),
        },
        userId,
      );
      onConflict();
      router.push(`/bookings/${booking.id}`);
      // Keep the dialog locked until navigation completes to prevent duplicate clicks.
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
        if ([409, 404, 422].includes(error.status)) {
          setStale(true);
          onConflict();
        }
      } else
        setError(
          "We could not confirm the response. Refresh availability before trying again; your booking may have been saved.",
        );
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <Modal
      title="Confirm and pay"
      onClose={() => {
        if (!inFlight.current) onClose();
      }}
    >
      <form className="checkout-content" onSubmit={confirm} aria-busy={pending}>
        <div className="checkout-property">
          <PropertyPhoto src={listing.photos[0]} alt={listing.title} />
          <div>
            <p className="muted">
              {listing.property_type} in {listing.city}
            </p>
            <h3>{listing.title}</h3>
            <p>Hosted by {listing.host.name}</p>
          </div>
        </div>
        <section>
          <h2>Your trip</h2>
          <div className="checkout-line">
            <div>
              <strong>Dates</strong>
              <p>
                {dateLabel(quote.check_in)} – {dateLabel(quote.check_out)}
              </p>
            </div>
            <button
              disabled={pending}
              type="button"
              className="text-button"
              onClick={onClose}
            >
              Edit
            </button>
          </div>
          <div className="checkout-line">
            <div>
              <strong>Guests</strong>
              <p>
                {quote.guests} {quote.guests === 1 ? "guest" : "guests"}
              </p>
            </div>
            <span className="muted">{quote.nights} nights</span>
          </div>
        </section>
        <section>
          <h2>Price details</h2>
          <PriceBreakdown quote={quote} />
        </section>
        <section>
          <h2>Pay with</h2>
          <div className="mock-payment">
            <CreditCard size={24} />
            <div>
              <strong>Demo payment</strong>
              <p>No card details needed. You won’t be charged.</p>
            </div>
            <LockKeyhole size={19} />
          </div>
        </section>
        <section>
          <h2>Before you book</h2>
          <p>
            You can cancel an unstarted stay before the check-in date. This demo
            does not process payments or refunds.
          </p>
          <label className="checkout-agree">
            <input type="checkbox" required disabled={pending} />I agree to the
            house rules and understand this is a demo reservation.
          </label>
        </section>
        {user?.id !== userId && (
          <p className="error-text" role="alert">
            Your account changed. Close checkout and review your stay again.
          </p>
        )}
        {error && (
          <div role="alert" className="booking-error">
            <p>{error}</p>
            {stale && (
              <button type="button" className="text-button" onClick={onClose}>
                Review dates and price
              </button>
            )}
          </div>
        )}
        <button
          type="submit"
          className="button-brand full-width"
          disabled={pending || stale || user?.id !== userId}
        >
          {pending
            ? "Confirming your stay…"
            : `Confirm · ${preciseMoney(quote.total_cents, quote.currency)}`}
        </button>
        <p className="checkout-note">
          Booking as {user?.name}. Your dates are reserved only after
          confirmation.
        </p>
      </form>
    </Modal>
  );
}
