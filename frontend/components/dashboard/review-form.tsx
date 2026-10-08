"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Trip } from "@/lib/types";
import { Modal } from "@/components/modal";
export function ReviewForm({
  trip,
  userId,
  onClose,
  onSaved,
}: {
  trip: Trip;
  userId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const guard = useRef(false);
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guard.current) return;
    const fields = new FormData(event.currentTarget);
    guard.current = true;
    setPending(true);
    setError("");
    try {
      await api(
        "/reviews",
        {
          method: "POST",
          body: JSON.stringify({
            booking_id: trip.id,
            rating: Number(fields.get("rating")),
            comment: String(fields.get("comment")).trim(),
          }),
        },
        userId,
      );
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      guard.current = false;
      setPending(false);
    }
  }
  return (
    <Modal
      title="How was your stay?"
      onClose={() => {
        if (!guard.current) onClose();
      }}
    >
      <form className="review-editor" onSubmit={submit}>
        <h2>{trip.listing.title}</h2>
        <label>
          Overall rating
          <select name="rating" defaultValue="5" disabled={pending}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "star" : "stars"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Share your experience
          <textarea
            name="comment"
            required
            minLength={10}
            maxLength={3000}
            rows={5}
            disabled={pending}
            placeholder="What did you enjoy? What should future guests know?"
          />
        </label>
        {error && (
          <p role="alert" className="booking-error">
            {error}
          </p>
        )}
        <button className="button-brand full-width" disabled={pending}>
          {pending ? "Posting…" : "Post review"}
        </button>
      </form>
    </Modal>
  );
}
