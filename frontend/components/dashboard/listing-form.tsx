"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Listing, ListingInput } from "@/lib/types";
import { Modal } from "@/components/modal";
const choices = [
  "Wifi",
  "Kitchen",
  "Free parking",
  "Private pool",
  "Air conditioning",
  "Washer",
  "Dedicated workspace",
  "Indoor fireplace",
];
const categories = [
  "Beachfront",
  "Cabins",
  "Countryside",
  "City",
  "Design",
  "Amazing pools",
];
const lines = (text: string) =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
function cents(value: FormDataEntryValue | null): number {
  const raw = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(raw))
    throw Error("Enter prices with no more than two decimal places.");
  const [whole, fraction = ""] = raw.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result > 100_000_000)
    throw Error("Prices must be between $0 and $1,000,000.");
  return result;
}
export function ListingForm({
  listing,
  userId,
  onClose,
  onSaved,
}: {
  listing?: Listing;
  userId: number;
  onClose: () => void;
  onSaved: (listing: Listing) => void;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [amenities, setAmenities] = useState(
      listing?.amenities || ["Wifi", "Kitchen"],
    );
  const guard = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guard.current) return;
    setError("");
    try {
      const fields = new FormData(event.currentTarget);
      const text = (key: string) => String(fields.get(key) || "").trim();
      const number = (key: string) => Number(text(key));
      const photos = lines(text("photos"));
      if (photos.length < 5 || photos.length > 30)
        throw Error("Add between 5 and 30 photo URLs.");
      for (const photo of photos) {
        let url: URL;
        try {
          url = new URL(photo);
        } catch {
          throw Error(
            "Each photo must have a complete http:// or https:// URL.",
          );
        }
        if (!["http:", "https:"].includes(url.protocol))
          throw Error("Photo URLs must use HTTP or HTTPS.");
      }
      if (!amenities.length) throw Error("Choose at least one amenity.");
      const payload: ListingInput = {
        title: text("title"),
        description: text("description"),
        city: text("city"),
        country: text("country"),
        address: text("address"),
        latitude: number("latitude"),
        longitude: number("longitude"),
        category: text("category"),
        property_type: text("property_type"),
        max_guests: number("max_guests"),
        bedrooms: number("bedrooms"),
        beds: number("beds"),
        bathrooms: number("bathrooms"),
        nightly_rate_cents: cents(fields.get("nightly_rate")),
        cleaning_fee_cents: cents(fields.get("cleaning_fee")),
        service_fee_cents: cents(fields.get("service_fee")),
        currency: "USD",
        photos,
        amenities,
        house_rules: lines(text("house_rules")),
      };
      guard.current = true;
      setPending(true);
      const result = await api<Listing>(
        listing ? `/listings/${listing.id}` : "/listings",
        { method: listing ? "PATCH" : "POST", body: JSON.stringify(payload) },
        userId,
      );
      onSaved(result);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      guard.current = false;
      setPending(false);
    }
  }
  return (
    <Modal
      title={listing ? "Edit your listing" : "Create a listing"}
      onClose={() => {
        if (!guard.current) onClose();
      }}
    >
      <form className="listing-editor" onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending}>
          <section>
            <h2>The essentials</h2>
            <label>
              Title
              <input
                name="title"
                required
                minLength={5}
                maxLength={160}
                defaultValue={listing?.title}
                placeholder="A peaceful cabin in the woods"
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                required
                minLength={30}
                maxLength={10000}
                rows={4}
                defaultValue={listing?.description}
                placeholder="Tell guests what makes your space special…"
              />
            </label>
            <div className="form-grid">
              <label>
                Category
                <select
                  name="category"
                  defaultValue={listing?.category || "Countryside"}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Property type
                <input
                  name="property_type"
                  required
                  maxLength={80}
                  defaultValue={listing?.property_type || "Home"}
                  list="property-types"
                />
                <datalist id="property-types">
                  {[
                    "Home",
                    "Villa",
                    "Cabin",
                    "Apartment",
                    "Cottage",
                    "Loft",
                    "Farmhouse",
                  ].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
            </div>
          </section>
          <section>
            <h2>Location</h2>
            <div className="form-grid">
              <label>
                City
                <input
                  name="city"
                  required
                  maxLength={100}
                  defaultValue={listing?.city}
                />
              </label>
              <label>
                Country
                <input
                  name="country"
                  required
                  maxLength={100}
                  defaultValue={listing?.country}
                />
              </label>
            </div>
            <label>
              Street address
              <input
                name="address"
                required
                maxLength={255}
                defaultValue={listing?.address}
              />
            </label>
            <div className="form-grid">
              <label>
                Latitude
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  required
                  defaultValue={listing?.latitude ?? 0}
                />
              </label>
              <label>
                Longitude
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  required
                  defaultValue={listing?.longitude ?? 0}
                />
              </label>
            </div>
          </section>
          <section>
            <h2>Space for your guests</h2>
            <div className="form-grid">
              {[
                {
                  key: "max_guests",
                  label: "Guests",
                  min: 1,
                  max: 30,
                  value: listing?.max_guests ?? 2,
                },
                {
                  key: "bedrooms",
                  label: "Bedrooms",
                  min: 0,
                  max: 30,
                  value: listing?.bedrooms ?? 1,
                },
                {
                  key: "beds",
                  label: "Beds",
                  min: 1,
                  max: 50,
                  value: listing?.beds ?? 1,
                },
                {
                  key: "bathrooms",
                  label: "Bathrooms",
                  min: 0.5,
                  max: 30,
                  value: listing?.bathrooms ?? 1,
                },
              ].map((field) => (
                <label key={field.key}>
                  {field.label}
                  <input
                    name={field.key}
                    type="number"
                    required
                    min={field.min}
                    max={field.max}
                    step={field.key === "bathrooms" ? 0.5 : 1}
                    defaultValue={field.value}
                  />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h2>Pricing in USD</h2>
            <p className="muted">
              Cleaning and service fees apply once per stay.
            </p>
            <div className="form-grid">
              {[
                {
                  name: "nightly_rate",
                  label: "Nightly price ($)",
                  value: (listing?.nightly_rate_cents ?? 10000) / 100,
                  min: 0.01,
                },
                {
                  name: "cleaning_fee",
                  label: "Cleaning fee ($)",
                  value: (listing?.cleaning_fee_cents ?? 0) / 100,
                  min: 0,
                },
                {
                  name: "service_fee",
                  label: "Service fee ($)",
                  value: (listing?.service_fee_cents ?? 0) / 100,
                  min: 0,
                },
              ].map((f) => (
                <label key={f.name}>
                  {f.label}
                  <input
                    name={f.name}
                    type="number"
                    step=".01"
                    min={f.min}
                    max={1000000}
                    required
                    defaultValue={f.value}
                  />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h2>Photos</h2>
            <label>
              Image URLs, one per line
              <textarea
                name="photos"
                rows={6}
                required
                defaultValue={listing?.photos.join("\n")}
                placeholder="https://images.unsplash.com/…"
              />
            </label>
            <p className="muted">
              Add 5–30 HTTP or HTTPS image URLs. The first is your cover photo.
            </p>
          </section>
          <section>
            <h2>Amenities</h2>
            <div className="amenity-options">
              {Array.from(new Set([...choices, ...amenities])).map((a) => (
                <label key={a}>
                  <input
                    type="checkbox"
                    checked={amenities.includes(a)}
                    onChange={(e) =>
                      setAmenities(
                        e.target.checked
                          ? [...amenities, a]
                          : amenities.filter((v) => v !== a),
                      )
                    }
                  />
                  {a}
                </label>
              ))}
            </div>
          </section>
          <section>
            <h2>House rules</h2>
            <label>
              One rule per line
              <textarea
                name="house_rules"
                rows={4}
                defaultValue={
                  listing?.house_rules.join("\n") ??
                  "Check-in after 3 PM\nCheck-out before 11 AM\nNo smoking\nNo parties"
                }
              />
            </label>
          </section>
        </fieldset>
        {error && (
          <div className="booking-error" role="alert">
            {error}
          </div>
        )}
        <footer className="editor-footer">
          <button
            type="button"
            disabled={pending}
            className="text-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button-brand" disabled={pending}>
            {pending ? "Saving…" : listing ? "Save changes" : "Publish listing"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
