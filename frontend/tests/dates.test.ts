import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  dayUnavailable,
  nightsBetween,
  rangeOverlaps,
  validDate,
} from "../lib/dates.ts";
const booked = [{ check_in: "2030-06-10", check_out: "2030-06-13" }];
const today = "2030-06-01";
test("Checkout may meet the next reservation check-in", () =>
  assert.equal(
    dayUnavailable("2030-06-10", "2030-06-08", "", booked, today),
    false,
  ));
test("Check-in may meet the previous reservation checkout", () =>
  assert.equal(dayUnavailable("2030-06-13", "", "", booked, today), false));
test("Occupied check-in and crossing occupied nights are blocked", () => {
  assert.equal(dayUnavailable("2030-06-10", "", "", booked, today), true);
  assert.equal(
    dayUnavailable("2030-06-14", "2030-06-08", "", booked, today),
    true,
  );
  assert.equal(rangeOverlaps("2030-06-11", "2030-06-12", booked), true);
});
test("Past dates and stays over a year are disabled", () => {
  assert.equal(dayUnavailable("2030-05-31", "", "", [], today), true);
  assert.equal(dayUnavailable("2031-06-03", "2030-06-01", "", [], today), true);
});
test("Night counts are independent of DST", () =>
  assert.equal(nightsBetween("2030-03-09", "2030-03-12"), 3));
test("Invalid calendar dates are rejected", () => {
  assert.equal(validDate("2030-02-30"), false);
  assert.equal(validDate("2032-02-29"), true);
  assert.equal(validDate("garbage"), false);
});
