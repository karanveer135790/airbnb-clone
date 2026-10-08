import { preciseMoney } from "@/lib/api";
import type { Quote } from "@/lib/types";
export function PriceBreakdown({ quote }: { quote: Quote }) {
  const format = (value: number) => preciseMoney(value, quote.currency);
  return (
    <dl className="price-breakdown">
      <div>
        <dt>
          {format(quote.nightly_rate_cents)} × {quote.nights}{" "}
          {quote.nights === 1 ? "night" : "nights"}
        </dt>
        <dd>{format(quote.nightly_rate_cents * quote.nights)}</dd>
      </div>
      <div>
        <dt>Cleaning fee</dt>
        <dd>{format(quote.cleaning_fee_cents)}</dd>
      </div>
      <div>
        <dt>Service fee</dt>
        <dd>{format(quote.service_fee_cents)}</dd>
      </div>
      <div className="price-total">
        <dt>Total ({quote.currency})</dt>
        <dd>{format(quote.total_cents)}</dd>
      </div>
    </dl>
  );
}
