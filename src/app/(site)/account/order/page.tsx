import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderView } from "@/components/account/OrderView";

export const metadata: Metadata = { title: "Order tracking" };

export default function OrderPage() {
  return (
    <Suspense>
      <OrderView />
    </Suspense>
  );
}
