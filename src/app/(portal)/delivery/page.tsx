import type { Metadata } from "next";
import { DeliveryView } from "@/components/admin/DeliveryView";

export const metadata: Metadata = { title: "Delivery partner app" };

export default function DeliveryPage() {
  return <DeliveryView />;
}
