import { Suspense } from "react";
import { Explore } from "@/components/explore";
export default function Page() {
  return (
    <Suspense
      fallback={<main className="shell empty-state">Loading stays…</main>}
    >
      <Explore />
    </Suspense>
  );
}
