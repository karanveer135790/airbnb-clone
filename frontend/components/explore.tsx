"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Map,
  SearchX,
  Globe,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { Listing, ListingPage, SearchFilters, emptyFilters } from "@/lib/types";
import { parseFilters, serializeFilters } from "@/lib/search";
import { useApp } from "./providers";
import { Navigation } from "./navigation";
import { SearchBar } from "./search-bar";
import { Filters } from "./filters";
import { ListingCard } from "./listing-card";
import { Modal } from "./modal";
export function Explore() {
  const params = useSearchParams(),
    router = useRouter(),
    query = params.toString();
  const [filters, setFilters] = useState<SearchFilters>(() =>
    parseFilters(new URLSearchParams(query)),
  );
  const [data, setData] = useState<ListingPage | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [searchSignal, setSearchSignal] = useState(0),
    [wishlist, setWishlist] = useState(params.get("wishlist") === "1"),
    [showMap, setShowMap] = useState(false);
  const { user, favoriteIds, notify } = useApp();
  useEffect(
    () => setFilters(parseFilters(new URLSearchParams(query))),
    [query],
  );
  const apply = useCallback(
    (updates: Partial<SearchFilters>) => {
      setWishlist(false);
      const next = { ...filters, ...updates, page: updates.page ?? 1 };
      router.push(`/?${serializeFilters(next)}`, { scroll: false });
    },
    [filters, router],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    if (wishlist && !user) {
      setData({ items: [], total: 0, pages: 0, page: 1, page_size: 12 });
      setLoading(false);
      return;
    }
    const request = wishlist
      ? api<Listing[]>(
          "/me/wishlist",
          { signal: controller.signal },
          user?.id,
        ).then((items) => ({
          items,
          total: items.length,
          page: 1,
          page_size: items.length,
          pages: 1,
        }))
      : api<ListingPage>(`/listings?${serializeFilters(filters)}&page_size=8`, {
          signal: controller.signal,
        });
    request
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, reload, wishlist, user?.id, favoriteIds]);
  return (
    <>
      <div className="header-wrap">
        <Navigation
          onSearch={() => setSearchSignal((s) => s + 1)}
          onWishlist={() => setWishlist((v) => !v)}
          wishlist={wishlist}
        />
        <SearchBar
          filters={filters}
          onApply={apply}
          openSignal={searchSignal}
        />
      </div>
      <Filters filters={filters} onApply={apply} />
      <main id="main-content" className="shell main-content">
        <div className="results-heading">
          <h1>
            {wishlist
              ? "Your wishlist"
              : filters.location
                ? `Stays in ${filters.location}`
                : "Find your next favorite place"}
          </h1>
          <div className="results-tools">
            <span className="muted">
              {loading ? "Finding homes…" : `${data?.total ?? 0} homes`}
            </span>
            <button
              className={`wishlist-toggle ${wishlist ? "active" : ""}`}
              onClick={() => setWishlist((v) => !v)}
            >
              <Heart size={17} fill={wishlist ? "currentColor" : "none"} />
              <span>Wishlist</span>
            </button>
          </div>
        </div>
        {error ? (
          <div className="empty-state" role="alert">
            <SearchX size={38} />
            <h2>We couldn’t load these homes</h2>
            <p>{error}</p>
            <button
              className="button-dark"
              onClick={() => setReload((r) => r + 1)}
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div
            className="listing-grid"
            aria-label="Loading listings"
            aria-busy="true"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <div className="skeleton-card" key={i}>
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : data?.items.length ? (
          <>
            <div className="listing-grid">
              {data.items.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onOpen={(listing) => {
                    const stay = new URLSearchParams();
                    if (filters.check_in)
                      stay.set("check_in", filters.check_in);
                    if (filters.check_out)
                      stay.set("check_out", filters.check_out);
                    stay.set("guests", String(filters.guests));
                    router.push(`/listings/${listing.id}?${stay}`);
                  }}
                />
              ))}
            </div>
            {!wishlist && data.pages > 1 && (
              <nav className="pagination" aria-label="Results pages">
                <button
                  className="icon-button"
                  disabled={data.page <= 1}
                  aria-label="Previous page"
                  onClick={() => apply({ page: data.page - 1 })}
                >
                  <ChevronLeft size={20} />
                </button>
                {Array.from({ length: data.pages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === data.pages ||
                      Math.abs(p - data.page) <= 2,
                  )
                  .map((p) => (
                    <button
                      aria-current={p === data.page ? "page" : undefined}
                      className={p === data.page ? "active" : ""}
                      key={p}
                      onClick={() => apply({ page: p })}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  className="icon-button"
                  disabled={data.page >= data.pages}
                  aria-label="Next page"
                  onClick={() => apply({ page: data.page + 1 })}
                >
                  <ChevronRight size={20} />
                </button>
              </nav>
            )}
            <div className="explore-more">
              <h2>Keep exploring places to stay</h2>
              <p className="muted">
                A different view. A place that feels like you.
              </p>
              <button
                className="button-dark"
                onClick={() => {
                  apply({ ...emptyFilters });
                  setSearchSignal((s) => s + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Explore more
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <SearchX size={38} />
            <h2>
              {wishlist
                ? "Your next trip starts with a heart"
                : "No homes match your search"}
            </h2>
            <p>
              {wishlist
                ? "Save homes you love and find them here."
                : "Try a different destination, date range, or fewer filters."}
            </p>
            <button
              className="button-dark"
              onClick={() => {
                setWishlist(false);
                apply({ ...emptyFilters });
              }}
            >
              Explore all homes
            </button>
          </div>
        )}
      </main>
      <button className="map-button" onClick={() => setShowMap(true)}>
        Show map
        <Map size={17} />
      </button>
      <footer className="site-footer">
        <div className="shell footer-content">
          <div>
            © {new Date().getFullYear()} Airbnb clone <span>·</span>{" "}
            <button
              onClick={() =>
                notify("This assignment demo does not process real payments.")
              }
            >
              Privacy
            </button>
            <span>·</span>
            <button
              onClick={() => notify("Demo stays and prices are illustrative.")}
            >
              Terms
            </button>
            <span>·</span>
            <button onClick={() => setShowMap(true)}>Sitemap</button>
          </div>
          <div>
            <Globe size={16} />
            English (US)<strong>$ USD</strong>
            <button onClick={() => notify("Support is coming soon.")}>
              Support & resources <ChevronUp size={15} />
            </button>
          </div>
        </div>
      </footer>
      {showMap && (
        <Modal title="Explore destinations" onClose={() => setShowMap(false)}>
          <div className="static-map">
            <Globe size={72} strokeWidth={1} />
            <h2>A world of places to stay</h2>
            <div className="map-destinations">
              {[
                "Malibu",
                "Lisbon",
                "Florence",
                "Ubud",
                "Kyoto",
                "Queenstown",
              ].map((city) => (
                <button
                  className="button-outline"
                  key={city}
                  onClick={() => {
                    apply({ location: city });
                    setShowMap(false);
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
            <p className="muted">Interactive map coming soon</p>
          </div>
        </Modal>
      )}
    </>
  );
}
