import type { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Responder accounts",
  description: "Review and manage access requests from response offices",
};

export default function AdminPage() {
  // Authentication and authorization checks are handled by middleware
  return <AdminClient />;
}
