import type { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Responder accounts",
  description: "Review and manage access requests from response offices",
};

export default function AdminPage() {
  // Role is checked by middleware and again in admin/layout.tsx
  return <AdminClient />;
}
