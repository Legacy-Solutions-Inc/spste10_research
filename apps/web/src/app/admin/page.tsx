import AdminClient from "./AdminClient";

export const metadata = {
  title: "AGAP - Admin Dashboard",
  description: "Admin dashboard for managing responder accounts",
};

export default async function AdminPage() {
  // Authentication and authorization checks are handled by middleware
  return <AdminClient />;
}

