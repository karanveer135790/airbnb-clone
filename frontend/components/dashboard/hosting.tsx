"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Archive,
  House,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Listing, Reservation } from "@/lib/types";
import { api, preciseMoney } from "@/lib/api";
import { dateLabel } from "@/lib/dates";
import { useResource } from "@/hooks/use-resource";
import { useApp } from "@/components/providers";
import { PropertyPhoto } from "@/components/listing/gallery";
import { AccountGate, DashboardShell, BookingStatus } from "./shell";
import { ListingForm } from "./listing-form";
import { ActionDialog } from "./action-dialog";
export function Hosting() {
  const { user } = useApp();
  return (
    <DashboardShell>
      <AccountGate host>
        {user && (
          <HostContent key={user.id} userId={user.id} name={user.name} />
        )}
      </AccountGate>
    </DashboardShell>
  );
}
function HostContent({ userId, name }: { userId: number; name: string }) {
  const { notify } = useApp();
  const [tab, setTab] = useState<"listings" | "reservations">("listings"),
    [revision, setRevision] = useState(0),
    [editor, setEditor] = useState<Listing | "new" | null>(null),
    [archive, setArchive] = useState<Listing | null>(null),
    [includeArchived, setIncludeArchived] = useState(false),
    [search, setSearch] = useState(""),
    [property, setProperty] = useState(""),
    [page, setPage] = useState(1);
  const homes = useResource<Listing[]>(
    "/host/listings?include_archived=true",
    userId,
    revision,
  );
  const reservations = useResource<Reservation[]>(
    tab === "reservations"
      ? `/host/reservations?page=${page}&page_size=10${property ? `&listing_id=${property}` : ""}`
      : null,
    userId,
    revision,
  );
  const allHomes = homes.data || [],
    active = allHomes.filter((l) => l.is_active).length;
  const visible = allHomes.filter(
    (l) =>
      (includeArchived || l.is_active) &&
      `${l.title} ${l.city}`.toLowerCase().includes(search.toLowerCase()),
  );
  const resource = tab === "listings" ? homes : reservations;
  return (
    <>
      <header className="dashboard-heading">
        <div>
          <p className="eyebrow">Your hosting space</p>
          <h1>Welcome back, {name.split(" ")[0]}</h1>
          <p className="muted">Your homes. Your hospitality.</p>
        </div>
        <button className="button-dark" onClick={() => setEditor("new")}>
          <Plus size={18} />
          Create a listing
        </button>
      </header>
      <div className="host-stats">
        <article>
          <House size={22} />
          <div>
            <strong>{homes.loading ? "—" : active}</strong>
            <span>Active listings</span>
          </div>
        </article>
        <article>
          <Archive size={22} />
          <div>
            <strong>{homes.loading ? "—" : allHomes.length - active}</strong>
            <span>Archived listings</span>
          </div>
        </article>
      </div>
      <div
        className="dashboard-tabs"
        role="tablist"
        aria-label="Host dashboard"
      >
        <button
          role="tab"
          aria-selected={tab === "listings"}
          onClick={() => setTab("listings")}
        >
          Listings
        </button>
        <button
          role="tab"
          aria-selected={tab === "reservations"}
          onClick={() => setTab("reservations")}
        >
          Reservations
        </button>
      </div>
      {tab === "listings" ? (
        <div className="dashboard-toolbar">
          <label className="dashboard-search">
            <Search size={18} />
            <input
              aria-label="Search your listings"
              placeholder="Search your listings"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="archive-toggle">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Show archived
          </label>
        </div>
      ) : (
        <div className="dashboard-toolbar">
          <label>
            Property
            <select
              aria-label="Filter reservations by property"
              value={property}
              onChange={(e) => {
                setProperty(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All your homes</option>
              {allHomes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                  {!l.is_active ? " (archived)" : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">Confirmed and cancelled reservations</p>
        </div>
      )}
      {resource.error ? (
        <div className="empty-state" role="alert">
          <h2>We couldn’t load your dashboard</h2>
          <p>{resource.error}</p>
          <button
            className="button-dark"
            onClick={() => setRevision((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      ) : resource.loading ? (
        <div className="dashboard-loading" role="status">
          Loading {tab}…
        </div>
      ) : tab === "listings" ? (
        visible.length ? (
          <div className="host-listing-grid">
            {visible.map((listing) => (
              <article className="host-listing" key={listing.id}>
                <div className="host-listing-photo">
                  <PropertyPhoto src={listing.photos[0]} alt={listing.title} />
                  <span
                    className={`listing-state ${listing.is_active ? "" : "archived"}`}
                  >
                    {listing.is_active ? "Listed" : "Archived"}
                  </span>
                </div>
                <div className="host-listing-body">
                  <h2>{listing.title}</h2>
                  <p className="muted">
                    {listing.city}, {listing.country}
                  </p>
                  <p>
                    <strong>{preciseMoney(listing.nightly_rate_cents)}</strong>{" "}
                    / night{" "}
                    <span className="muted">· {listing.max_guests} guests</span>
                  </p>
                  <div className="host-listing-actions">
                    {listing.is_active && (
                      <>
                        <button onClick={() => setEditor(listing)}>
                          <Pencil size={15} />
                          Edit
                        </button>
                        <Link href={`/listings/${listing.id}`}>View</Link>
                        <button
                          onClick={() => setArchive(listing)}
                          aria-label={`Archive ${listing.title}`}
                        >
                          <Archive size={15} />
                          <span>Archive</span>
                        </button>
                      </>
                    )}
                    {!listing.is_active && (
                      <span className="muted">
                        Reservation history preserved
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setProperty(String(listing.id));
                        setPage(1);
                        setTab("reservations");
                      }}
                    >
                      Reservations
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <House size={36} />
            <h2>
              {search
                ? "No matching listings"
                : "Your hosting story starts here"}
            </h2>
            <p>
              {search
                ? "Try another title or city."
                : "Create a home for guests to discover."}
            </p>
            <button className="button-dark" onClick={() => setEditor("new")}>
              Create a listing
            </button>
          </div>
        )
      ) : (
        <>
          <div className="reservation-list">
            {reservations.data?.length ? (
              reservations.data.map((reservation) => (
                <article className="reservation-row" key={reservation.id}>
                  <div className="reservation-home">
                    <PropertyPhoto
                      src={reservation.listing.photos[0]}
                      alt={reservation.listing.title}
                    />
                    <div>
                      <h2>{reservation.listing.title}</h2>
                      <p>
                        {reservation.guest.name} · {reservation.guests} guests
                      </p>
                      <p className="muted">
                        #{reservation.id} · {dateLabel(reservation.check_in)} –{" "}
                        {dateLabel(reservation.check_out)}
                      </p>
                    </div>
                  </div>
                  <div className="reservation-meta">
                    <BookingStatus
                      status={reservation.status}
                      checkIn={reservation.check_in}
                      checkOut={reservation.check_out}
                    />
                    <strong>
                      {preciseMoney(
                        reservation.total_cents,
                        reservation.currency,
                      )}
                    </strong>
                    <Link
                      className="text-button"
                      href={`/bookings/${reservation.id}`}
                    >
                      View reservation
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <CalendarDays size={36} />
                <h2>No reservations here yet</h2>
                <p>Your guests’ bookings will appear here.</p>
              </div>
            )}
          </div>
          <nav className="pagination" aria-label="Reservation pages">
            <button
              className="icon-button"
              aria-label="Previous reservations"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={20} />
            </button>
            <span>Page {page}</span>
            <button
              className="icon-button"
              aria-label="Next reservations"
              disabled={(reservations.data?.length ?? 0) < 10}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={20} />
            </button>
          </nav>
        </>
      )}
      {editor && (
        <ListingForm
          listing={editor === "new" ? undefined : editor}
          userId={userId}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setRevision((n) => n + 1);
            notify(
              editor === "new" ? "Your listing is live" : "Listing updated",
            );
          }}
        />
      )}
      {archive && (
        <ActionDialog
          title="Archive this listing?"
          description={`“${archive.title}” will be removed from search and cannot receive new bookings. Existing reservations will remain valid and available in your dashboard.`}
          label="Archive listing"
          onClose={() => setArchive(null)}
          onConfirm={async () => {
            await api(`/listings/${archive.id}`, { method: "DELETE" }, userId);
            setRevision((n) => n + 1);
            notify("Listing archived");
          }}
        />
      )}
    </>
  );
}
