"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state">
      <h1>Something went wrong</h1>
      <button className="button-dark" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
