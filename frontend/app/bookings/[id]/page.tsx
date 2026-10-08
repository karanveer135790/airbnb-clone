import { notFound } from "next/navigation";
import { BookingConfirmation } from "@/components/listing/booking-confirmation";
export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  return <BookingConfirmation id={Number(id)} />;
}
