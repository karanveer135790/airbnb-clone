"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Share,
  Star,
  UserCircle,
  Medal,
  KeyRound,
  House,
  Wifi,
  Utensils,
  Car,
  AirVent,
  Waves,
  BriefcaseBusiness,
  WashingMachine,
  Flame,
  Check,
  BedDouble,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { Navigation } from "@/components/navigation";
import { useApp } from "@/components/providers";
import { useStay } from "@/hooks/use-stay";
import { DatePicker } from "@/components/date-picker";
import { dateLabel, nightsBetween } from "@/lib/dates";
import { Gallery } from "./gallery";
import { BookingWidget } from "./booking-widget";
import { Reviews } from "./reviews";
import { StaticMap } from "./static-map";

const amenityIcons: Record<string, typeof Wifi> = {
  Wifi,
  Kitchen: Utensils,
  "Free parking": Car,
  "Private pool": Waves,
  "Air conditioning": AirVent,
  Washer: WashingMachine,
  "Dedicated workspace": BriefcaseBusiness,
  "Indoor fireplace": Flame,
};
export function ListingDetail({ id }: { id: number }) {
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setListing(null);
    api<Listing>(`/listings/${id}`, { signal: controller.signal })
      .then(setListing)
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, [id, retry]);
  return (
    <div className="detail-page">
      <div className="detail-header">
        <Navigation
          onSearch={() => router.push("/")}
          onWishlist={() => router.push("/?wishlist=1")}
          wishlist={false}
        />
      </div>
      {error ? (
        <main id="main-content" className="empty-state">
          <h1>We couldn’t load this home</h1>
          <p role="alert">{error}</p>
          <button
            className="button-dark"
            onClick={() => setRetry((n) => n + 1)}
          >
            Try again
          </button>
          <Link href="/" className="text-button">
            Explore other homes
          </Link>
        </main>
      ) : listing ? (
        <DetailContent key={listing.id} listing={listing} />
      ) : (
        <main
          id="main-content"
          className="detail-shell detail-loading"
          aria-busy="true"
        >
          <div className="skeleton-card">
            <span />
            <div />
          </div>
          <p role="status">Finding your home away from home…</p>
        </main>
      )}
    </div>
  );
}
function DetailContent({ listing }: { listing: Listing }) {
  const stay = useStay(listing);
  const { favoriteIds, toggleFavorite, notify } = useApp();
  const [saving, setSaving] = useState(false);
  const saved = favoriteIds.has(listing.id);
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify("Link copied to clipboard");
    } catch {
      notify("Copy this page’s address to share this home.");
    }
  }
  return (
    <main id="main-content" className="detail-shell">
      <Link href="/" className="back-link">
        <ArrowLeft size={16} />
        All homes
      </Link>
      <div className="property-title-row">
        <h1>{listing.title}</h1>
        <div className="property-actions">
          <button onClick={share}>
            <Share size={17} />
            Share
          </button>
          <button
            disabled={saving}
            aria-pressed={saved}
            onClick={async () => {
              setSaving(true);
              try {
                await toggleFavorite(listing.id);
              } catch (error) {
                notify((error as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Heart
              size={17}
              fill={saved ? "#ff385c" : "none"}
              color={saved ? "#ff385c" : "currentColor"}
            />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      <Gallery title={listing.title} photos={listing.photos} />
      <nav className="detail-anchor-nav" aria-label="On this page">
        <a href="#overview">Overview</a>
        <a href="#amenities">Amenities</a>
        <a href="#availability">Availability</a>
        <a href="#reviews">Reviews</a>
        <a href="#location">Location</a>
      </nav>
      <div className="detail-columns">
        <div className="detail-description">
          <section id="overview" className="detail-section property-overview">
            <h2>
              {listing.property_type} in {listing.city}, {listing.country}
            </h2>
            <p>
              {listing.max_guests} guests · {listing.bedrooms} bedrooms ·{" "}
              {listing.beds} beds · {listing.bathrooms} baths
            </p>
            <a className="rating-summary" href="#reviews">
              <Star size={15} fill="currentColor" />
              {listing.rating?.toFixed(2) || "New"}
              <span>·</span>
              <strong>
                {listing.review_count}{" "}
                {listing.review_count === 1 ? "review" : "reviews"}
              </strong>
            </a>
          </section>
          <section className="detail-section host-summary">
            <UserCircle size={52} strokeWidth={1} />
            <div>
              <h3>Hosted by {listing.host.name}</h3>
              <p className="muted">
                {listing.host.is_superhost
                  ? "Superhost · Thoughtful hospitality"
                  : "Your host"}
              </p>
            </div>
          </section>
          <section className="detail-section property-highlights">
            <div>
              <House size={25} />
              <div>
                <h3>Your own space</h3>
                <p className="muted">
                  Enjoy this {listing.property_type.toLowerCase()} with your
                  travel companions.
                </p>
              </div>
            </div>
            {listing.host.is_superhost && (
              <div>
                <Medal size={25} />
                <div>
                  <h3>{listing.host.name.split(" ")[0]} is a Superhost</h3>
                  <p className="muted">
                    A host recognized in our demo for great hospitality.
                  </p>
                </div>
              </div>
            )}
            <div>
              <KeyRound size={25} />
              <div>
                <h3>Make yourself at home</h3>
                <p className="muted">
                  Review the house rules below before confirming your stay.
                </p>
              </div>
            </div>
          </section>
          <section className="detail-section">
            <h2>About this space</h2>
            <p className="property-description">{listing.description}</p>
          </section>
          <section className="detail-section">
            <h2>Where you’ll sleep</h2>
            <div className="sleeping-card">
              <BedDouble size={30} strokeWidth={1.5} />
              <h3>
                {listing.bedrooms}{" "}
                {listing.bedrooms === 1 ? "bedroom" : "bedrooms"}
              </h3>
              <p className="muted">
                {listing.beds} beds · up to {listing.max_guests} guests
              </p>
            </div>
          </section>
          <section id="amenities" className="detail-section">
            <h2>What this place offers</h2>
            <ul className="amenities-grid">
              {listing.amenities.map((amenity) => {
                const Icon = amenityIcons[amenity] || Check;
                return (
                  <li key={amenity}>
                    <Icon size={25} strokeWidth={1.5} />
                    {amenity}
                  </li>
                );
              })}
            </ul>
          </section>
          <section
            id="availability"
            className="detail-section availability-section"
          >
            <h2>
              {stay.start && stay.end && !stay.error
                ? `${nightsBetween(stay.start, stay.end)} nights in ${listing.city}`
                : "Select your travel dates"}
            </h2>
            <p className="muted">
              {stay.start && stay.end
                ? `${dateLabel(stay.start)} – ${dateLabel(stay.end)}`
                : "Add your travel dates for exact pricing."}
            </p>
            {stay.availabilityReady ? (
              <DatePicker
                start={stay.start}
                end={stay.end}
                onChange={stay.selectDates}
                blocked={stay.blocked}
              />
            ) : (
              <p role="status">Loading availability…</p>
            )}
            {stay.error && (
              <div role="alert" className="booking-error">
                <p>{stay.error}</p>
                <button className="text-button" onClick={stay.refresh}>
                  Refresh availability
                </button>
              </div>
            )}
          </section>
        </div>
        <BookingWidget listing={listing} stay={stay} />
      </div>
      <Reviews listing={listing} />
      <section id="location" className="detail-section">
        <h2>Where you’ll be</h2>
        <p className="location-heading">
          {listing.city}, {listing.country}
        </p>
        <StaticMap
          latitude={listing.latitude}
          longitude={listing.longitude}
          city={listing.city}
        />
        <p className="muted map-note">
          The map marks a general demo location. Property photos and addresses
          are illustrative.
        </p>
      </section>
      <section className="detail-section meet-host">
        <div>
          <h2>Meet your host</h2>
          <div className="host-card">
            <UserCircle size={76} strokeWidth={1} />
            <h3>{listing.host.name}</h3>
            {listing.host.is_superhost && (
              <p>
                <Medal size={17} />
                Superhost
              </p>
            )}
          </div>
        </div>
        <div>
          <p>{listing.host.bio}</p>
          <button
            className="button-dark"
            onClick={() => notify("Messaging is coming soon.")}
          >
            <MessageCircle size={17} />
            Contact host
          </button>
          <p className="muted host-note">
            <ShieldCheck size={18} />
            This is a demo. No real payments are collected.
          </p>
        </div>
      </section>
      <section className="detail-section">
        <h2>Things to know</h2>
        <div className="rules-grid">
          <div>
            <h3>House rules</h3>
            <ul>
              {listing.house_rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
              <li>{listing.max_guests} guests maximum</li>
            </ul>
          </div>
          <div>
            <h3>Cancellation</h3>
            <p>
              Cancel before your check-in date to release your reservation. Once
              the stay has started, cancellation is unavailable.
            </p>
          </div>
          <div>
            <h3>Your reservation</h3>
            <p>
              Dates are confirmed after mock checkout. Every confirmed
              reservation blocks those nights for all guests.
            </p>
          </div>
        </div>
      </section>
      <footer className="detail-footer">
        <Link href="/">Airbnb clone</Link>
        <span>·</span>
        <span>{listing.country}</span>
        <span>·</span>
        <span>{listing.city}</span>
      </footer>
    </main>
  );
}
