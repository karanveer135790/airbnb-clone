"use client";
import { useEffect, useState } from "react";
import { Star, UserCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Listing, Review } from "@/lib/types";
export function Reviews({ listing }: { listing: Listing }) {
  const [reviews, setReviews] = useState<Review[]>([]),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    api<Review[]>(`/listings/${listing.id}/reviews?page=${page}&page_size=6`, {
      signal: controller.signal,
    })
      .then((rows) => {
        if (!controller.signal.aborted)
          setReviews((previous) =>
            page === 1
              ? rows
              : [
                  ...previous,
                  ...rows.filter(
                    (row) => !previous.some((r) => r.id === row.id),
                  ),
                ],
          );
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [listing.id, page, retry]);
  return (
    <section id="reviews" className="detail-section review-section">
      <h2>
        <Star size={23} fill="currentColor" />
        {listing.rating?.toFixed(2) || "No ratings yet"}{" "}
        <span>
          · {listing.review_count}{" "}
          {listing.review_count === 1 ? "review" : "reviews"}
        </span>
      </h2>
      {listing.review_count === 0 && !busy && (
        <p className="muted">
          Be the first to share your experience after a stay.
        </p>
      )}
      <div className="reviews-grid">
        {reviews.map((review) => (
          <article key={review.id}>
            <div className="review-author">
              <UserCircle size={42} strokeWidth={1} />
              <div>
                <strong>{review.author.name}</strong>
                <p className="muted">
                  {new Date(review.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
              </div>
            </div>
            <div
              className="review-stars"
              aria-label={`${review.rating} out of 5 stars`}
            >
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={12}
                  fill={i < review.rating ? "currentColor" : "none"}
                />
              ))}
            </div>
            <p>{review.comment}</p>
          </article>
        ))}
      </div>
      {busy && (
        <p role="status" className="muted">
          Loading reviews…
        </p>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            className="text-button"
            onClick={() => setRetry((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {!busy && !error && reviews.length < listing.review_count && (
        <button
          className="button-outline"
          onClick={() => setPage((p) => p + 1)}
        >
          Show more reviews
        </button>
      )}
    </section>
  );
}
