import { computeConversion, formatPercent, type Summary } from "@/lib/metrics";
import { ChartCard } from "./chart-card";

function Rate({ label, rate, numerator, denominator, definition }: {
  label: string;
  rate: number | null;
  numerator: number;
  denominator: number;
  definition: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{formatPercent(rate, 1)}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-series-1" style={{ width: `${Math.min((rate ?? 0) * 100, 100)}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        {numerator} of {denominator}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{definition}</p>
    </div>
  );
}

export function ConversionMetrics({ summary }: { summary: Summary }) {
  const rates = computeConversion(summary);
  return (
    <ChartCard
      title="Conversion"
      description="Each application is counted once, however many stages or rounds it went through."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Rate
          label="Interview rate"
          rate={rates.interviewRate}
          numerator={summary.interviewed}
          denominator={summary.total}
          definition="Applications that reached First, Second or Technical Interview (or logged an interview) ÷ all applications."
        />
        <Rate
          label="Offer rate"
          rate={rates.offerRate}
          numerator={summary.offers}
          denominator={summary.total}
          definition="Applications that reached Offer ÷ all applications."
        />
        <Rate
          label="Interview → offer"
          rate={rates.interviewToOfferRate}
          numerator={summary.offersAfterInterview}
          denominator={summary.interviewed}
          definition="Interviewed applications that reached Offer ÷ applications that reached an interview."
        />
      </div>
    </ChartCard>
  );
}
