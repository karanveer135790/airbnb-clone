export type User = {
  id: number;
  name: string;
  role: "host" | "guest";
  avatar_url: string;
  bio: string;
  is_superhost: boolean;
};
export type Listing = {
  id: number;
  host_id: number;
  title: string;
  description: string;
  city: string;
  country: string;
  address: string;
  category: string;
  property_type: string;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  nightly_rate_cents: number;
  cleaning_fee_cents: number;
  service_fee_cents: number;
  currency: string;
  photos: string[];
  amenities: string[];
  house_rules: string[];
  is_active: boolean;
  rating: number | null;
  review_count: number;
  host: User;
  latitude: number;
  longitude: number;
};
export type ListingPage = {
  items: Listing[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};
export type SearchFilters = {
  location: string;
  check_in: string;
  check_out: string;
  guests: number;
  category: string;
  min_price: string;
  max_price: string;
  property_type: string;
  amenities: string[];
  sort: string;
  page: number;
};
export const emptyFilters: SearchFilters = {
  location: "",
  check_in: "",
  check_out: "",
  guests: 1,
  category: "",
  min_price: "",
  max_price: "",
  property_type: "",
  amenities: [],
  sort: "recommended",
  page: 1,
};

export type AvailabilityRange = { check_in: string; check_out: string };
export type Stay = AvailabilityRange & { listing_id: number; guests: number };
export type Quote = Stay & {
  nights: number;
  nightly_rate_cents: number;
  cleaning_fee_cents: number;
  service_fee_cents: number;
  total_cents: number;
  currency: string;
};
export type Booking = Quote & {
  id: number;
  guest_id: number;
  status: "confirmed" | "cancelled";
  mock_payment_reference: string;
  created_at: string;
};
export type Trip = Booking & { listing: Listing; review_id: number | null };
export type Review = {
  id: number;
  booking_id: number;
  listing_id: number;
  author_id: number;
  rating: number;
  comment: string;
  created_at: string;
  author: User;
};

export type Reservation = Trip & { guest: User };
export type ListingInput = Pick<
  Listing,
  | "title"
  | "description"
  | "city"
  | "country"
  | "address"
  | "latitude"
  | "longitude"
  | "category"
  | "property_type"
  | "max_guests"
  | "bedrooms"
  | "beds"
  | "bathrooms"
  | "nightly_rate_cents"
  | "cleaning_fee_cents"
  | "service_fee_cents"
  | "currency"
  | "photos"
  | "amenities"
  | "house_rules"
>;
