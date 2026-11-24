import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscribeView } from "@/components/account/SubscribeView";

export const metadata: Metadata = {
  title: "Milk subscriptions",
  description: "Daily, alternate-day, weekly or monthly milk delivery. Pause or change any day before 10 PM.",
};

export default function SubscribePage() {
  return (
    <Suspense>
      <SubscribeView />
    </Suspense>
  );
}
