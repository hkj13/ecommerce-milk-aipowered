import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopView } from "@/components/shop/ShopView";

export const metadata: Metadata = {
  title: "Shop fresh dairy",
  description: "A2 milk, clay pot curd, paneer, bilona ghee and more, delivered across Chennai by 7:30 AM.",
};

export default function ShopPage() {
  return (
    <Suspense>
      <ShopView />
    </Suspense>
  );
}
