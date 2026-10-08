import { emptyFilters, SearchFilters } from "./types";
export function parseFilters(params: URLSearchParams): SearchFilters {
  return {
    ...emptyFilters,
    location: params.get("location") || "",
    check_in: params.get("check_in") || "",
    check_out: params.get("check_out") || "",
    guests: Math.max(1, Math.min(30, Number(params.get("guests")) || 1)),
    category: params.get("category") || "",
    min_price: params.get("min_price") || "",
    max_price: params.get("max_price") || "",
    property_type: params.get("property_type") || "",
    amenities: params.getAll("amenities"),
    sort: params.get("sort") || "recommended",
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}
export function serializeFilters(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (key === "amenities")
      (value as string[]).forEach((v) => params.append(key, v));
    else if (
      value &&
      !(key === "page" && value === 1) &&
      !(key === "guests" && value === 1) &&
      !(key === "sort" && value === "recommended")
    )
      params.set(key, String(value));
  });
  return params;
}
