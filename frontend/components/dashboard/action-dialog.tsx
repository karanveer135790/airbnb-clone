"use client";
import { useRef, useState } from "react";
import { Modal } from "@/components/modal";
export function ActionDialog({
  title,
  description,
  label,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  label: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const guard = useRef(false);
  async function confirm() {
    if (guard.current) return;
    guard.current = true;
    setPending(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      guard.current = false;
      setPending(false);
    }
  }
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!guard.current) onClose();
      }}
    >
      <div className="action-dialog">
        <p>{description}</p>
        {error && (
          <p role="alert" className="booking-error">
            {error}
          </p>
        )}
        <div>
          <button
            disabled={pending}
            className="button-outline"
            onClick={onClose}
          >
            Keep it
          </button>
          <button disabled={pending} className="button-dark" onClick={confirm}>
            {pending ? "Working…" : label}
          </button>
        </div>
      </div>
    </Modal>
  );
}
