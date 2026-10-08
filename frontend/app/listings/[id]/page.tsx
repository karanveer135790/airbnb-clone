import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingDetail } from "@/components/listing/listing-detail";
export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  return (
    <Suspense
      fallback={<main className="empty-state">Loading your stay…</main>}
    >
      <ListingDetail id={Number(id)} />
    </Suspense>
  );
}
