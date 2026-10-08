"use client";
import { useState } from "react";
import { Heart, Star, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Listing } from "@/lib/types";
import { money } from "@/lib/api";
import { useApp } from "./providers";
export function ListingCard({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (l: Listing) => void;
}) {
  const [photo, setPhoto] = useState(0),
    [failed, setFailed] = useState(false),
    [saving, setSaving] = useState(false);
  const { favoriteIds, toggleFavorite, notify } = useApp();
  const saved = favoriteIds.has(listing.id);
  const change = (direction: number) => {
    setPhoto(
      (p) => (p + direction + listing.photos.length) % listing.photos.length,
    );
    setFailed(false);
  };
  return (
    <article className="listing-card">
      <div className="card-photo">
        <button
          className="photo-open"
          aria-label={`View ${listing.title}`}
          onClick={() => onOpen(listing)}
        >
          {failed ? (
            <span className="image-fallback">
              <ImageOff size={32} />
              Photo unavailable
            </span>
          ) : (
            <img
              src={listing.photos[photo]}
              alt={`${listing.title}, photo ${photo + 1}`}
              loading="lazy"
              onError={() => setFailed(true)}
            />
          )}
        </button>
        {listing.rating !== null && listing.rating >= 4.8 && (
          <span className="guest-favorite">Guest favorite</span>
        )}
        <button
          className={`favorite-button ${saved ? "saved" : ""}`}
          aria-label={
            saved ? `Unsave ${listing.title}` : `Save ${listing.title}`
          }
          aria-pressed={saved}
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await toggleFavorite(listing.id);
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          <Heart size={25} fill={saved ? "#ff385c" : "rgba(0,0,0,.45)"} />
        </button>
        <button
          className="photo-arrow previous"
          aria-label={`Previous photo of ${listing.title}`}
          onClick={() => change(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="photo-arrow next"
          aria-label={`Next photo of ${listing.title}`}
          onClick={() => change(1)}
        >
          <ChevronRight size={18} />
        </button>
        <div className="photo-dots" aria-hidden="true">
          {listing.photos.map((_, i) => (
            <span key={i} className={i === photo ? "active" : ""} />
          ))}
        </div>
      </div>
      <div className="card-title">
        <button onClick={() => onOpen(listing)}>
          {listing.city}, {listing.country}
        </button>
        <span>
          <Star size={13} fill="currentColor" />
          {listing.rating?.toFixed(2) || "New"}
        </span>
      </div>
      <p className="muted truncate">{listing.title}</p>
      <p className="muted">
        {listing.bedrooms} bedrooms · {listing.max_guests} guests
      </p>
      <p className="card-price">
        <strong>{money(listing.nightly_rate_cents, listing.currency)}</strong>{" "}
        <span>night</span>
      </p>
    </article>
  );
}
