import type { Metadata } from "next";
import InsightsClient from "./InsightsClient";

export const metadata: Metadata = {
  title: "Insights",
  description: "Incident volume and response times across response offices",
};

export default function InsightsPage() {
  // Middleware restricts /admin/* to admins
  return <InsightsClient />;
}
