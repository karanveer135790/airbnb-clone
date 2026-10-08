"use client";
import { useState } from "react";
import {
  Waves,
  TreePine,
  Mountain,
  Building2,
  Armchair,
  SlidersHorizontal,
  LayoutGrid,
  Palmtree,
} from "lucide-react";
import { SearchFilters } from "@/lib/types";
import { Modal } from "./modal";
const categories = [
  ["", "All homes", LayoutGrid],
  ["Beachfront", "Beachfront", Waves],
  ["Cabins", "Cabins", TreePine],
  ["Countryside", "Countryside", Mountain],
  ["City", "City", Building2],
  ["Design", "Design", Armchair],
  ["Amazing pools", "Amazing pools", Palmtree],
] as const;
export function Filters({
  filters,
  onApply,
}: {
  filters: SearchFilters;
  onApply: (f: Partial<SearchFilters>) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(filters);
  const count =
    filters.amenities.length +
    Number(Boolean(filters.min_price || filters.max_price)) +
    Number(Boolean(filters.property_type));
  return (
    <>
      <div className="filter-row shell">
        <div className="categories" aria-label="Property categories">
          {categories.map(([key, label, Icon]) => (
            <button
              key={key}
              className={`category ${filters.category === key ? "active" : ""}`}
              aria-pressed={filters.category === key}
              onClick={() => onApply({ category: key })}
            >
              <Icon size={25} strokeWidth={1.5} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          className="filter-button"
          onClick={() => {
            setDraft(filters);
            setOpen(true);
          }}
        >
          <SlidersHorizontal size={17} />
          <span>Filters</span>
          {count > 0 && <span className="filter-count">{count}</span>}
        </button>
      </div>
      {open && (
        <Modal title="Filters" onClose={() => setOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onApply(draft);
              setOpen(false);
            }}
          >
            <div className="filter-body">
              <h3>Price range</h3>
              <p className="muted">Nightly prices before fees</p>
              <div className="price-fields">
                <label>
                  Minimum price ($)
                  <input
                    type="number"
                    min="0"
                    placeholder="No min"
                    value={draft.min_price ? Number(draft.min_price) / 100 : ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        min_price: e.target.value
                          ? String(Math.round(Number(e.target.value) * 100))
                          : "",
                      })
                    }
                  />
                </label>
                <span>–</span>
                <label>
                  Maximum price ($)
                  <input
                    type="number"
                    min={draft.min_price ? Number(draft.min_price) / 100 : 0}
                    placeholder="No max"
                    value={draft.max_price ? Number(draft.max_price) / 100 : ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        max_price: e.target.value
                          ? String(Math.round(Number(e.target.value) * 100))
                          : "",
                      })
                    }
                  />
                </label>
              </div>
              <h3>Property type</h3>
              <div className="filter-chips">
                {[
                  "",
                  "Home",
                  "Villa",
                  "Cabin",
                  "Apartment",
                  "Cottage",
                  "Loft",
                  "Farmhouse",
                ].map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={draft.property_type === type ? "selected" : ""}
                    onClick={() => setDraft({ ...draft, property_type: type })}
                  >
                    {type || "Any type"}
                  </button>
                ))}
              </div>
              <h3>Amenities</h3>
              <div className="amenity-options">
                {[
                  "Wifi",
                  "Kitchen",
                  "Free parking",
                  "Private pool",
                  "Air conditioning",
                  "Washer",
                  "Dedicated workspace",
                  "Indoor fireplace",
                ].map((a) => (
                  <label key={a}>
                    <input
                      type="checkbox"
                      checked={draft.amenities.includes(a)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          amenities: e.target.checked
                            ? [...draft.amenities, a]
                            : draft.amenities.filter((v) => v !== a),
                        })
                      }
                    />
                    {a}
                  </label>
                ))}
              </div>
              <h3>Sort homes</h3>
              <select
                value={draft.sort}
                onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
              >
                <option value="recommended">Recommended</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    min_price: "",
                    max_price: "",
                    property_type: "",
                    amenities: [],
                    sort: "recommended",
                  })
                }
              >
                Clear all
              </button>
              <button className="button-dark" type="submit">
                Show homes
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
