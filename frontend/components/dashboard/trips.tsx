"use client";
import { useState } from "react";
import Link from "next/link";
import { Plane, ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { Trip } from "@/lib/types";
import { api, preciseMoney } from "@/lib/api";
import { dateLabel, utcToday } from "@/lib/dates";
import { useResource } from "@/hooks/use-resource";
import { useApp } from "@/components/providers";
import { PropertyPhoto } from "@/components/listing/gallery";
import { AccountGate, DashboardShell, BookingStatus } from "./shell";
import { ActionDialog } from "./action-dialog";
import { ReviewForm } from "./review-form";
export function Trips() {
  const { user } = useApp();
  return (
    <DashboardShell>
      <AccountGate>
        {user && <TripsContent key={user.id} userId={user.id} />}
      </AccountGate>
    </DashboardShell>
  );
}
function TripsContent({ userId }: { userId: number }) {
  const { notify } = useApp();
  const [period, setPeriod] = useState("upcoming"),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [cancel, setCancel] = useState<Trip | null>(null),
    [review, setReview] = useState<Trip | null>(null);
  const { data, error, loading } = useResource<Trip[]>(
    `/me/trips?period=${period}&page=${page}&page_size=6`,
    userId,
    revision,
  );
  const today = utcToday();
  return (
    <>
      <header className="dashboard-heading">
        <div>
          <p className="eyebrow">Your next chapter</p>
          <h1>Trips</h1>
          <p className="muted">All your stays, in one place.</p>
        </div>
        <Link className="button-outline" href="/">
          Find your next stay
        </Link>
      </header>
      <div className="dashboard-tabs" role="tablist" aria-label="Trip periods">
        {[
          ["upcoming", "Upcoming"],
          ["past", "Past"],
          ["cancelled", "Cancelled"],
          ["all", "All trips"],
        ].map(([key, label]) => (
          <button
            role="tab"
            key={key}
            aria-selected={period === key}
            onClick={() => {
              setPeriod(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <div className="empty-state" role="alert">
          <h2>We couldn’t load your trips</h2>
          <p>{error}</p>
          <button
            className="button-dark"
            onClick={() => setRevision((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="dashboard-loading" role="status">
          Finding your trips…
        </div>
      ) : data?.length ? (
        <>
          <div className="trip-grid">
            {data.map((trip) => (
              <article className="trip-card" key={trip.id}>
                <div className="trip-photo">
                  <PropertyPhoto
                    src={trip.listing.photos[0]}
                    alt={trip.listing.title}
                  />
                  <BookingStatus
                    status={trip.status}
                    checkIn={trip.check_in}
                    checkOut={trip.check_out}
                  />
                </div>
                <div className="trip-body">
                  <h2>{trip.listing.city}</h2>
                  <p className="trip-title">{trip.listing.title}</p>
                  <p className="muted">Hosted by {trip.listing.host.name}</p>
                  <div className="trip-dates">
                    <strong>
                      {dateLabel(trip.check_in)} – {dateLabel(trip.check_out)}
                    </strong>
                    <p className="muted">
                      {trip.nights} nights · {trip.guests} guests
                    </p>
                  </div>
                  <div className="trip-total">
                    <strong>
                      {preciseMoney(trip.total_cents, trip.currency)}
                    </strong>
                    <span className="muted">total · #{trip.id}</span>
                  </div>
                  <div className="trip-actions">
                    <Link
                      href={`/bookings/${trip.id}`}
                      className="button-outline"
                    >
                      View details
                    </Link>
                    {trip.status === "confirmed" && trip.check_in > today && (
                      <button
                        className="text-button"
                        onClick={() => setCancel(trip)}
                      >
                        Cancel trip
                      </button>
                    )}
                    {trip.status === "confirmed" &&
                      trip.check_out <= today &&
                      (trip.review_id ? (
                        <span className="reviewed">
                          <Star size={15} />
                          Reviewed
                        </span>
                      ) : (
                        <button
                          className="text-button"
                          onClick={() => setReview(trip)}
                        >
                          Leave a review
                        </button>
                      ))}
                  </div>
                  {!trip.listing.is_active && (
                    <p className="archived-trip-note">
                      This home is no longer listed. Your reservation history is
                      preserved.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
          <nav className="pagination" aria-label="Trip pages">
            <button
              className="icon-button"
              aria-label="Previous trips"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={20} />
            </button>
            <span>Page {page}</span>
            <button
              className="icon-button"
              aria-label="Next trips"
              disabled={data.length < 6}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={20} />
            </button>
          </nav>
        </>
      ) : (
        <div className="empty-state">
          <Plane size={42} />
          <h2>
            {page > 1
              ? "No more trips"
              : period === "upcoming"
                ? "Time to plan something new"
                : `No ${period === "all" ? "" : period} trips yet`}
          </h2>
          <p>Your next adventure is out there.</p>
          {page > 1 ? (
            <button
              className="button-outline"
              onClick={() => setPage((p) => p - 1)}
            >
              Previous page
            </button>
          ) : (
            <Link className="button-dark" href="/">
              Start exploring
            </Link>
          )}
        </div>
      )}
      {cancel && (
        <ActionDialog
          title="Cancel your trip?"
          description={`Your reservation in ${cancel.listing.city} from ${dateLabel(cancel.check_in)} will be cancelled and the dates will be released. No payment or refund is processed in this demo.`}
          label="Cancel trip"
          onClose={() => setCancel(null)}
          onConfirm={async () => {
            await api(
              `/bookings/${cancel.id}/cancel`,
              { method: "POST" },
              userId,
            );
            setRevision((n) => n + 1);
            notify("Your trip has been cancelled");
          }}
        />
      )}
      {review && (
        <ReviewForm
          trip={review}
          userId={userId}
          onClose={() => setReview(null)}
          onSaved={() => {
            setReview(null);
            setRevision((n) => n + 1);
            notify("Thanks for sharing your stay");
          }}
        />
      )}
    </>
  );
}
