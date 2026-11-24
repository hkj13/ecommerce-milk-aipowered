import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminView } from "@/components/admin/AdminView";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function AdminPage() {
  return (
    <Suspense>
      <AdminView />
    </Suspense>
  );
}
