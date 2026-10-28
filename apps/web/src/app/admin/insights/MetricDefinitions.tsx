import { Card } from "@/components/ui/card";

const DEFINITIONS: { term: string; description: string }[] = [
  {
    term: "Incidents received",
    description: "Emergency Alerts and Reports that citizens sent during the selected range, in your computer's time zone.",
  },
  {
    term: "Time to accept",
    description:
      "For each accepted incident, the time from when the citizen sent it to when the first office accepted it. Incidents nobody accepted are left out, so check Waiting right now and Canceled by citizen alongside it.",
  },
  {
    term: "Time to resolve (approximate)",
    description:
      "For resolved incidents, the time from the first acceptance to the incident's last update. AGAP doesn't store a separate resolved time, so a later edit to the incident makes this longer. Deleting old photos doesn't count as an edit.",
  },
  {
    term: "Median and p90",
    description:
      "The median is the middle value: half of incidents were faster. p90 means 9 in 10 were at least this fast. Both use linear interpolation, the same as Excel's PERCENTILE.INC.",
  },
  {
    term: "Decline rate",
    description:
      "Declined responses divided by all accepted and declined responses. An incident declined by two offices counts as two declines.",
  },
  {
    term: "Canceled by citizen",
    description: "Incidents the citizen canceled in the app, before or after an office accepted.",
  },
  {
    term: "Waiting right now",
    description: "Incidents from this range that no office has accepted yet and the citizen hasn't canceled.",
  },
  {
    term: "Response by office",
    description:
      "Accepted and declined responses per office. Resolved counts accepted incidents that were later marked resolved.",
  },
];

export function MetricDefinitions() {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-foreground">How these numbers are calculated</h2>
      <dl className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-2">
        {DEFINITIONS.map(({ term, description }) => (
          <div key={term}>
            <dt className="text-13 font-medium text-foreground">{term}</dt>
            <dd className="mt-0.5 text-13 text-muted-foreground">{description}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
