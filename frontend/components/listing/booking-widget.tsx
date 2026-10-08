"use client";
import { useState } from "react";
import { CalendarDays, Star, Flag } from "lucide-react";
import type { Listing, Quote } from "@/lib/types";
import { preciseMoney } from "@/lib/api";
import { dateLabel, nightsBetween } from "@/lib/dates";
import { useStay } from "@/hooks/use-stay";
import { useApp } from "@/components/providers";
import { Modal } from "@/components/modal";
import { DatePicker } from "@/components/date-picker";
import { PriceBreakdown } from "./price-breakdown";
import { Checkout } from "./checkout";
export type StayState = ReturnType<typeof useStay>;
export function BookingWidget({
  listing,
  stay,
}: {
  listing: Listing;
  stay: StayState;
}) {
  const { user, notify } = useApp();
  const [datesOpen, setDatesOpen] = useState(false),
    [checkout, setCheckout] = useState<{ quote: Quote; userId: number } | null>(
      null,
    );
  const ownListing = user?.id === listing.host_id;
  const ready = Boolean(
    stay.quote &&
      stay.availabilityReady &&
      !stay.error &&
      !stay.quoting &&
      user &&
      !ownListing,
  );
  const reserve = () => {
    if (!stay.start || !stay.end) {
      setDatesOpen(true);
      return;
    }
    if (ready && stay.quote && user)
      setCheckout({ quote: stay.quote, userId: user.id });
  };
  const buttonText = ownListing
    ? "This is your listing"
    : !user
      ? "Choose an account"
      : !stay.start || !stay.end
        ? "Check availability"
        : stay.quoting
          ? "Checking your stay…"
          : "Reserve";
  return (
    <>
      <aside className="booking-aside">
        <div className="booking-widget" id="booking">
          <div className="booking-head">
            <p>
              <strong>
                {preciseMoney(
                  stay.quote?.nightly_rate_cents ?? listing.nightly_rate_cents,
                  listing.currency,
                )}
              </strong>{" "}
              <span>night</span>
            </p>
            <a href="#reviews">
              <Star size={13} fill="currentColor" />
              {listing.rating?.toFixed(2) || "New"}{" "}
              <span className="muted">· {listing.review_count} reviews</span>
            </a>
          </div>
          <div className="booking-inputs">
            <div className="booking-date-inputs">
              <button onClick={() => setDatesOpen(true)}>
                <strong>CHECK-IN</strong>
                <span>{dateLabel(stay.start)}</span>
              </button>
              <button onClick={() => setDatesOpen(true)}>
                <strong>CHECKOUT</strong>
                <span>{dateLabel(stay.end)}</span>
              </button>
            </div>
            <label>
              <strong>GUESTS</strong>
              <select
                aria-label="Number of guests"
                value={stay.guests}
                onChange={(event) => stay.setGuests(Number(event.target.value))}
              >
                {Array.from({ length: listing.max_guests }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {i === 0 ? "guest" : "guests"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {stay.error && (
            <div className="booking-error" role="alert">
              <p>{stay.error}</p>
              <button className="text-button" onClick={stay.refresh}>
                Refresh availability
              </button>
            </div>
          )}
          <button
            className="button-brand full-width reserve-button"
            onClick={reserve}
            disabled={
              ownListing ||
              !user ||
              !stay.availabilityReady ||
              Boolean(stay.start && stay.end && !ready)
            }
          >
            {buttonText}
          </button>
          {!user && (
            <p className="muted widget-note">
              Use the account menu to choose a demo guest.
            </p>
          )}
          <p className="widget-note">You won’t be charged yet</p>
          {stay.quote ? (
            <PriceBreakdown quote={stay.quote} />
          ) : (
            <div className="widget-placeholder">
              <CalendarDays size={20} />
              <p>
                {stay.start && stay.end && !stay.error
                  ? `${nightsBetween(stay.start, stay.end)} nights · getting your price`
                  : "Add dates for your total price"}
              </p>
            </div>
          )}
        </div>
        <button
          className="report-listing"
          onClick={() => notify("Report a listing is coming soon.")}
        >
          <Flag size={15} />
          Report this listing
        </button>
      </aside>
      <div className="mobile-booking-bar">
        <div>
          <strong>
            {preciseMoney(
              stay.quote?.total_cents ?? listing.nightly_rate_cents,
              listing.currency,
            )}
          </strong>
          <span>{stay.quote ? "total" : " / night"}</span>
          <button className="text-button" onClick={() => setDatesOpen(true)}>
            {stay.start && stay.end
              ? `${dateLabel(stay.start)} – ${dateLabel(stay.end)}`
              : "Add dates"}
          </button>
        </div>
        <button
          className="button-brand"
          onClick={reserve}
          disabled={
            ownListing ||
            !user ||
            !stay.availabilityReady ||
            Boolean(stay.start && stay.end && !ready)
          }
        >
          {stay.quote ? "Reserve" : "Check dates"}
        </button>
      </div>
      {datesOpen && (
        <Modal title="Choose your dates" onClose={() => setDatesOpen(false)}>
          <div className="booking-calendar-modal">
            <p className="muted">
              Unavailable nights are crossed out. Checkout dates are exclusive.
            </p>
            {stay.availabilityReady ? (
              <DatePicker
                start={stay.start}
                end={stay.end}
                blocked={stay.blocked}
                onChange={stay.selectDates}
              />
            ) : (
              <p role="status">Loading availability…</p>
            )}
            {stay.error && (
              <p className="error-text" role="alert">
                {stay.error}
              </p>
            )}
            <button
              className="button-dark full-width"
              onClick={() => setDatesOpen(false)}
              disabled={Boolean(stay.start && !stay.end)}
            >
              Save dates
            </button>
          </div>
        </Modal>
      )}
      {checkout && (
        <Checkout
          listing={listing}
          quote={checkout.quote}
          userId={checkout.userId}
          onClose={() => setCheckout(null)}
          onConflict={stay.refresh}
        />
      )}
    </>
  );
}
