"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { toast } from "@/components/ui/Toaster";
import { ShieldIcon } from "@/components/ui/icons";
import { DEMO_ACCOUNTS } from "@/data/seed";
import { login, resetPassword } from "@/lib/actions";
import { cls } from "@/lib/format";
import type { Role } from "@/lib/types";

const ROLES: { id: Role; label: string; key: keyof typeof DEMO_ACCOUNTS; home: string }[] = [
  { id: "customer", label: "Customer", key: "customer", home: "/account" },
  { id: "admin", label: "Admin", key: "admin", home: "/admin" },
  { id: "staff", label: "Delivery partner", key: "staff", home: "/delivery" },
];

const DEMO_OTP = "482913";

export function LoginView() {
  const params = useSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<Role>((params.get("role") as Role) || "customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [otp, setOtp] = useState<null | string>(null);
  const [mode, setMode] = useState<"login" | "reset">(params.get("reset") ? "reset" : "login");
  const next = params.get("next");
  const r = ROLES.find((x) => x.id === role)!;

  const finish = (home: string) => {
    toast("Signed in", "Welcome back");
    router.push(next ?? home);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp !== null) {
      if (otp !== DEMO_OTP) return setError("That code doesn't match. (Demo code: 482913)");
    }
    const res = login(email, password, role);
    if (res.ok) return finish(r.home);
    setError(res.error);
    if (res.needsOtp && otp === null) setOtp("");
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* picture side */}
      <div className="on-dark relative hidden overflow-hidden bg-night text-milk lg:block">
        <Image src="/photos/misty-sunrise.jpg" alt="" fill priority sizes="50vw" className="object-cover opacity-70" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/10" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="mono-label text-butter">05:52 AM · Walajabad</p>
          <p className="display-l mt-4 max-w-[16ch]">
            The milk is already <em className="display-em text-butter">on its way.</em>
          </p>
        </div>
      </div>

      {/* form side */}
      <div className="flex flex-col px-[var(--margin)] pb-12 pt-[calc(var(--header-h)+2.5rem)] lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {mode === "login" ? (
            <>
              <p className="mono-label text-butter-ink">Sign in</p>
              <h1 className="display-l mt-4">
                Welcome <em className="display-em text-pasture">back.</em>
              </h1>
              <div role="tablist" aria-label="Account type" className="mt-8 grid grid-cols-3 gap-1 rounded-full bg-cream p-1">
                {ROLES.map((x) => (
                  <button
                    key={x.id}
                    role="tab"
                    aria-selected={role === x.id}
                    type="button"
                    onClick={() => {
                      setRole(x.id);
                      setError("");
                      setOtp(null);
                    }}
                    className={cls("rounded-full px-2 py-2.5 text-[0.82rem] font-semibold transition-colors", role === x.id ? "bg-milk text-ink shadow-sm" : "text-ink-3 hover:text-ink")}
                  >
                    {x.label}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="mt-8 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink-2">Email</span>
                  <input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex justify-between text-sm font-medium text-ink-2">
                    Password
                    <button type="button" className="link-under text-pasture" onClick={() => setMode("reset")}>
                      Forgot password?
                    </button>
                  </span>
                  <input className="field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                {otp !== null && (
                  <div className="rounded-2xl border border-alert/30 bg-alert/[0.05] p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-alert">
                      <ShieldIcon size={16} /> Unusual sign-in activity
                    </p>
                    <p className="mt-1 text-sm text-ink-2">
                      Several failed attempts on this account. Enter the one-time code we sent to the registered phone. (AI security check, demo code{" "}
                      <span className="font-mono font-semibold">{DEMO_OTP}</span>)
                    </p>
                    <input className="field mt-3 font-mono tracking-[0.3em]" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} aria-label="One-time code" />
                  </div>
                )}
                {error && (
                  <p role="alert" className="text-sm font-medium text-alert">
                    {error}
                  </p>
                )}
                <button type="submit" className="btn btn-primary w-full">
                  Sign in as {r.label.toLowerCase()}
                </button>
              </form>

              <div className="mt-8 rounded-2xl border border-dashed border-rule p-4">
                <p className="mono-label text-ink-3">Demo accounts</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {ROLES.map((x) => {
                    const a = DEMO_ACCOUNTS[x.key];
                    return (
                      <li key={x.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <span className="font-semibold">{a.label}:</span> <span className="font-mono text-[0.8rem] text-ink-2">{a.email}</span> /{" "}
                          <span className="font-mono text-[0.8rem] text-ink-2">{a.password}</span>
                        </span>
                        <button
                          type="button"
                          className="chip border border-rule py-1 text-[0.72rem] hover:border-pasture hover:text-pasture"
                          onClick={() => {
                            setRole(x.id);
                            setEmail(a.email);
                            setPassword(a.password);
                            setOtp(null);
                            setError("");
                          }}
                        >
                          Fill
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {role === "customer" && (
                <p className="mt-6 text-sm text-ink-2">
                  New here?{" "}
                  <Link href={`/register${next ? `?next=${next}` : ""}`} className="link-under font-semibold text-pasture">
                    Create an account
                  </Link>
                </p>
              )}
            </>
          ) : (
            <ResetFlow onDone={() => setMode("login")} />
          )}
        </div>
        <div className="mx-auto mt-auto hidden pt-12 text-pasture lg:block">
          <Logo />
        </div>
      </div>
    </div>
  );
}

function ResetFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <p className="mono-label text-butter-ink">Reset password</p>
      <h1 className="display-l mt-4">
        Let&apos;s get you <em className="display-em text-pasture">back in.</em>
      </h1>
      {step === 1 ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
            toast("Code sent", `Demo code: ${DEMO_OTP}`, "info");
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-2">Email on your account</span>
            <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn btn-primary w-full">Send a code</button>
        </form>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code !== DEMO_OTP) return setError("Wrong code. Demo code: 482913");
            if (pw.length < 6) return setError("Use at least 6 characters.");
            if (!resetPassword(email, pw)) return setError("No account with that email.");
            toast("Password changed", "Sign in with your new password");
            onDone();
          }}
        >
          <p className="text-sm text-ink-2">
            We sent a 6-digit code to the phone and email on {email}. (Demo code <span className="font-mono font-semibold">{DEMO_OTP}</span>)
          </p>
          <input className="field font-mono tracking-[0.3em]" inputMode="numeric" maxLength={6} placeholder="Code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label="Code" />
          <input className="field" type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="New password" />
          {error && <p className="text-sm text-alert">{error}</p>}
          <button className="btn btn-primary w-full">Set new password</button>
        </form>
      )}
      <button type="button" onClick={onDone} className="mono-label link-draw mt-6 text-ink-2">
        ← Back to sign in
      </button>
    </>
  );
}
