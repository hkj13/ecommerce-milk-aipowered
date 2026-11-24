"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "@/components/ui/Toaster";
import { PageHead } from "@/components/ui/bits";
import { CheckIcon } from "@/components/ui/icons";
import { register } from "@/lib/actions";

const AREAS: Record<string, { lat: number; lng: number; pin: string }> = {
  Adyar: { lat: 13.0012, lng: 80.2565, pin: "600020" },
  "Besant Nagar": { lat: 12.999, lng: 80.2669, pin: "600090" },
  Velachery: { lat: 12.9815, lng: 80.218, pin: "600042" },
  Mylapore: { lat: 13.0368, lng: 80.2676, pin: "600004" },
  "T. Nagar": { lat: 13.0418, lng: 80.2341, pin: "600017" },
  "Anna Nagar": { lat: 13.085, lng: 80.2101, pin: "600040" },
  Thiruvanmiyur: { lat: 12.983, lng: 80.2594, pin: "600041" },
  Perungudi: { lat: 12.9654, lng: 80.2461, pin: "600096" },
  Nungambakkam: { lat: 13.0569, lng: 80.2425, pin: "600006" },
};

function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", line1: "", area: "Adyar" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="card grid max-w-3xl gap-4 p-6 sm:grid-cols-2 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.password.length < 6) return setError("Use at least 6 characters for the password.");
        const a = AREAS[f.area];
        const res = register({
          name: f.name.trim(),
          email: f.email.trim(),
          phone: f.phone.trim(),
          password: f.password,
          address: { line1: f.line1.trim(), area: f.area, city: "Chennai", pincode: a.pin, lat: a.lat, lng: a.lng },
        });
        if (!res.ok) return setError(res.error);
        toast(`Welcome, ${f.name.split(" ")[0]}`, "Your first delivery is free");
        router.push(next ?? "/account");
      }}
    >
      <label>
        <span className="mb-1.5 block text-sm font-medium text-ink-2">Full name</span>
        <input className="field" required value={f.name} onChange={set("name")} autoComplete="name" />
      </label>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-ink-2">Mobile number</span>
        <input className="field" required inputMode="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="+91" />
      </label>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-ink-2">Email</span>
        <input className="field" required type="email" value={f.email} onChange={set("email")} autoComplete="email" />
      </label>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-ink-2">Password</span>
        <input className="field" required type="password" value={f.password} onChange={set("password")} autoComplete="new-password" />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-ink-2">House, street</span>
        <input className="field" required value={f.line1} onChange={set("line1")} autoComplete="street-address" />
      </label>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-ink-2">Area</span>
        <select className="field" value={f.area} onChange={set("area")}>
          {Object.keys(AREAS).map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <p className="flex items-center gap-2 pb-3 text-sm text-ok">
          <CheckIcon size={16} /> We deliver here · pincode {AREAS[f.area].pin}
        </p>
      </div>
      {error && <p className="text-sm text-alert sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" className="btn btn-primary">
          Create account
        </button>
        <p className="text-sm text-ink-2">
          Already have one?{" "}
          <Link href="/login" className="link-under font-semibold text-pasture">
            Sign in
          </Link>
        </p>
      </div>
      <p className="text-xs text-ink-3 sm:col-span-2">Passwords are stored as a one-way hash, never in plain text. Prototype: data stays in this browser.</p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <>
      <PageHead label="Create an account" title="Your first bottle" em="is on us." sub="Takes a minute. Then order by 10 PM for tomorrow morning." />
      <div className="wrap py-12 md:py-16">
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </>
  );
}
