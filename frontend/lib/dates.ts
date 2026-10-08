import type { AvailabilityRange } from "./types";

export const utcToday = () => new Date().toISOString().slice(0, 10);
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function nightsBetween(start: string, end: string): number {
  return (
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
    86_400_000
  );
}
export function rangeOverlaps(
  start: string,
  end: string,
  blocked: AvailabilityRange[],
): boolean {
  return blocked.some(
    (range) => range.check_in < end && range.check_out > start,
  );
}
export function dayUnavailable(
  day: string,
  start: string,
  end: string,
  blocked: AvailabilityRange[],
  today = utcToday(),
): boolean {
  if (day < today) return true;
  // A reservation's check-in may be selected as another stay's checkout.
  if (start && !end && day > start)
    return (
      nightsBetween(start, day) > 365 || rangeOverlaps(start, day, blocked)
    );
  return blocked.some(
    (range) => day >= range.check_in && day < range.check_out,
  );
}
export function stayError(
  start: string,
  end: string,
  blocked: AvailabilityRange[],
): string {
  if (!start || !end) return "";
  if (
    !validDate(start) ||
    !validDate(end) ||
    start < utcToday() ||
    end <= start
  )
    return "Choose a valid future stay with check-out after check-in.";
  if (nightsBetween(start, end) > 365) return "Stays can be up to 365 nights.";
  if (rangeOverlaps(start, end, blocked))
    return "These dates are unavailable. Please choose another stay.";
  return "";
}
export function dateLabel(value: string): string {
  return validDate(value)
    ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Add date";
}
