"use client";

import Link from "next/link";
import { toast } from "@/components/ui/Toaster";
import { DEMO_ACCOUNTS } from "@/data/seed";
import { login } from "@/lib/actions";

export function SignInPrompt({ title = "Sign in to see your account", next = "/account" }: { title?: string; next?: string }) {
  return (
    <div className="card max-w-xl p-8">
      <p className="h3">{title}</p>
      <p className="mt-2 text-ink-2">For the demo, continue as the sample customer Priya, who has three months of orders and two subscriptions.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            login(DEMO_ACCOUNTS.customer.email, DEMO_ACCOUNTS.customer.password, "customer");
            toast("Signed in as Priya (demo customer)");
          }}
        >
          Continue as demo customer
        </button>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-ghost">
          Sign in
        </Link>
      </div>
    </div>
  );
}
