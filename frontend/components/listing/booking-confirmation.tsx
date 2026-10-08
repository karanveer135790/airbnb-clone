"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  CalendarDays,
  Users,
  MapPin,
  UserCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { dateLabel } from "@/lib/dates";
import type { Trip } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Navigation } from "@/components/navigation";
import { PropertyPhoto } from "./gallery";
import { PriceBreakdown } from "./price-breakdown";
export function BookingConfirmation({ id }: { id: number }) {
  const router = useRouter(),
    { user, identityError } = useApp();
  const [result, setResult] = useState<{ trip: Trip; userId: number } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setResult(null);
    setError("");
    if (!user) return;
    const controller = new AbortController();
    api<Trip>(`/bookings/${id}`, { signal: controller.signal }, user.id)
      .then((trip) => setResult({ trip, userId: user.id }))
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, [id, user?.id, retry]);
  const booking = result?.userId === user?.id ? result?.trip : null;
  return (
    <div className="confirmation-page">
      <Navigation
        onSearch={() => router.push("/")}
        onWishlist={() => router.push("/?wishlist=1")}
        wishlist={false}
      />
      <main id="main-content" className="confirmation-shell">
        {error || identityError ? (
          <div className="empty-state">
            <h1>Reservation unavailable</h1>
            <p role="alert">{error || identityError}</p>
            <p>Choose the account that made this reservation to view it.</p>
            <button
              className="button-dark"
              onClick={() => setRetry((n) => n + 1)}
            >
              Try again
            </button>
            <Link href="/" className="text-button">
              Explore homes
            </Link>
          </div>
        ) : !booking ? (
          <div className="empty-state" role="status">
            Loading your reservation…
          </div>
        ) : (
          <>
            <CheckCircle2 size={48} className="confirmation-icon" />
            <p className="eyebrow">
              {booking.status === "confirmed"
                ? "Reservation confirmed"
                : "Reservation cancelled"}
            </p>
            <h1>
              {booking.status === "confirmed"
                ? `You’re going to ${booking.listing.city}!`
                : "Your reservation is cancelled"}
            </h1>
            <p className="muted">
              {booking.status === "confirmed"
                ? "Your stay is saved. These nights are now reserved for you."
                : "These dates have been released for other guests."}
            </p>
            <div className="confirmation-grid">
              <div>
                <div className="confirmation-photo">
                  <PropertyPhoto
                    src={booking.listing.photos[0]}
                    alt={booking.listing.title}
                    eager
                  />
                </div>
                <h2>{booking.listing.title}</h2>
                <div className="confirmation-facts">
                  <p>
                    <CalendarDays size={21} />
                    <span>
                      <strong>
                        {dateLabel(booking.check_in)} –{" "}
                        {dateLabel(booking.check_out)}
                      </strong>
                      <small>{booking.nights} nights</small>
                    </span>
                  </p>
                  <p>
                    <Users size={21} />
                    {booking.guests} guests
                  </p>
                  <p>
                    <MapPin size={21} />
                    {booking.listing.city}, {booking.listing.country}
                  </p>
                  <p>
                    <UserCircle size={21} />
                    Hosted by {booking.listing.host.name}
                  </p>
                </div>
              </div>
              <aside className="receipt-card">
                <h2>Your receipt</h2>
                <p className="muted">Reservation #{booking.id}</p>
                <PriceBreakdown quote={booking} />
                <p className="receipt-demo">
                  Demo payment · no money was charged
                </p>
                <p className="payment-reference">
                  Reference: {booking.mock_payment_reference}
                </p>
                <p className="muted">
                  Keep this page’s URL to return to your reservation.
                </p>
              </aside>
            </div>
            <div className="confirmation-actions">
              <Link className="button-dark" href="/trips">
                My trips
              </Link>
              {booking.listing.is_active && (
                <Link
                  className="button-dark"
                  href={`/listings/${booking.listing_id}`}
                >
                  View your stay
                </Link>
              )}
              <Link className="button-outline" href="/">
                Keep exploring
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
