import type { Metadata } from "next";
import Link from "next/link";
import { AskChips } from "@/components/home/AskChips";
import { ArrowRight, CheckIcon } from "@/components/ui/icons";
import { DEMO_ACCOUNTS } from "@/data/seed";

export const metadata: Metadata = {
  title: "About the project",
  description: "AI-Powered Milk Delivery E-Commerce Website: final-year project synopsis, modules, architecture and a guided tour of the working prototype.",
};

const PROBLEMS: [string, string, string][] = [
  ["Paper records and manual billing", "Orders, subscriptions and payments stored in one database; invoices generated from stored data.", "/account?tab=orders"],
  ["Difficult to change deliveries", "Customers create, pause, resume or change subscriptions online until 10 PM the night before.", "/account?tab=subscriptions"],
  ["No order tracking", "Live order status from placed to delivered, with the delivery partner's name.", "/account?tab=orders"],
  ["Guess-based milk planning", "Demand prediction from past orders and day-of-week patterns, with a procurement plan.", "/admin?tab=insights"],
  ["No personalised suggestions", "Recommendations from purchase history and the basket, on home, product pages and cart.", "/shop"],
  ["Queries answered only in working hours", "A chatbot answers common questions any time and hands complex issues to support.", "/?chat=1"],
  ["No central view of operations", "Admin dashboard with orders, customers, revenue, stock, delivery status and AI analytics.", "/admin"],
];

const MODULES: { n: string; title: string; body: string; href: string; ai?: boolean }[] = [
  { n: "9.1", title: "Customer registration and login", body: "Sign up, sign in, reset password with OTP, profile and delivery address. Passwords stored as a hash. Unusual sign-in patterns trigger an extra OTP check.", href: "/register" },
  { n: "9.2", title: "Product catalogue and cart", body: "Milk, curd, butter, paneer, ghee and more with price and stock. Search (with Tamil and Hindi words and voice), filter by category, price and availability; add, remove, update quantities.", href: "/shop" },
  { n: "9.3", title: "Milk subscription", body: "Daily, alternate-day, chosen weekdays or monthly. Pause with a resume date, skip tomorrow, change quantity. An AI estimate suggests how much milk the household needs.", href: "/subscribe" },
  { n: "9.4", title: "Orders and payment tracking", body: "Checkout with UPI, card or cash on delivery (demo), order history, live tracking, cancel before packing, printable invoices. Unusual payments are held for a person to review.", href: "/checkout" },
  { n: "9.5", title: "AI chatbot", body: "Answers questions about products, prices, orders and subscriptions, guides the ordering process and directs complaints to support. Demo: fixed sample questions in code.", href: "#chatbot", ai: true },
  { n: "9.6", title: "Product recommendations", body: "Association rules and purchase history: “Because you often order curd, try buttermilk.” Shown on the home page, shop, product pages, cart and account.", href: "/cart", ai: true },
  { n: "9.7", title: "Demand prediction", body: "120 days of order history, day-of-week factors and trend give a 14-day forecast with a range, a back-tested error and tomorrow's procurement plan.", href: "/admin?tab=insights", ai: true },
  { n: "9.8", title: "Admin dashboard and analytics", body: "KPIs, revenue and category charts, product CRUD, inventory with expiry and reorder suggestions, orders, subscriptions, customers, delivery staff, and AI insights.", href: "/admin" },
  { n: "9.9", title: "Delivery staff", body: "Secure sign-in, today's stops in the optimised order on a map, call and navigate, mark delivered, cash to collect, and delivery history.", href: "/delivery" },
];

const EXTRA_AI = [
  ["Delivery route optimisation", "Nearest-neighbour plus 2-opt on stop coordinates: shorter loops each morning.", "/delivery"],
  ["Review sentiment analysis", "Every review classified positive, neutral or negative, with the most common issues summarised.", "/admin?tab=insights"],
  ["Milk quality monitoring", "Lab readings checked against limits; unusual batches flagged for physical re-test.", "/admin?tab=insights"],
  ["Customer behaviour insights", "Customers whose ordering frequency dropped, with a gentle reminder suggestion.", "/admin?tab=customers"],
  ["Personalised reminder timing", "Reminders sent shortly before the time each customer usually orders.", "/account?tab=notifications"],
  ["Voice search", "Search the shop by speaking, using the browser's speech recognition.", "/shop"],
];

const STEPS = [
  ["Customer browses and orders", "Catalogue, cart, checkout, subscriptions"],
  ["Data is stored", "Orders, subscriptions, payments: MySQL tables (browser store in this prototype)"],
  ["AI analyses history", "Pandas prepares purchase and order history"],
  ["Models produce outputs", "Recommendations, forecasts, flags (Scikit-learn, NLP model or AI API)"],
  ["People see insights", "Customers get suggestions; admins get forecasts and alerts"],
  ["Staff act on them", "Delivery partners follow the suggested route"],
];

const TABLES = [
  ["users", "Customers, admins and delivery staff, with hashed passwords and roles"],
  ["products", "Catalogue, prices per size, stock and expiry"],
  ["orders · order_items", "Every order and its lines, status timeline, delivery partner"],
  ["payments", "Method (UPI, card, COD), status, reference, review flag"],
  ["subscriptions", "Product, quantity, frequency, days, pause dates, skips"],
  ["reviews", "Rating and text (sentiment computed from it)"],
  ["quality_tests", "Fat, SNF, temperature, acidity, plate count per batch"],
  ["login_events", "Sign-in attempts used for unusual-pattern flags"],
];

const STACK: [string, string, string][] = [
  ["Front end", "HTML, CSS, JavaScript, Bootstrap", "Next.js (React), TypeScript, Tailwind CSS, GSAP and Lenis for motion"],
  ["Back end", "Python with Flask", "Not needed for the prototype: actions in src/lib/actions.ts mirror the Flask routes"],
  ["Database", "MySQL with Workbench", "Browser localStorage seeded with sample data, same table shapes"],
  ["AI / ML", "Pandas, NumPy, Scikit-learn", "Transparent TypeScript stand-ins in src/lib/ai.ts, one per model"],
  ["Chatbot", "NLP model or AI API", "Intent matching over sample questions in src/lib/chat.ts (AI not connected)"],
  ["Maps", "Maps / routing API", "Route optimisation on stop coordinates, drawn as an SVG map"],
];

export default function ProjectPage() {
  return (
    <>
      <section className="on-dark relative overflow-hidden bg-night pb-20 pt-[calc(var(--header-h)+4rem)] text-milk md:pb-28 md:pt-[calc(var(--header-h)+6rem)]">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_100%,rgba(240,164,124,0.25),transparent_60%),radial-gradient(50%_50%_at_10%_0%,rgba(232,184,74,0.12),transparent_60%)]" />
        <div className="wrap relative">
          <p className="mono-label flex items-center gap-3 text-butter">
            <span aria-hidden className="h-px w-8 bg-current" />
            Final year B.E. / B.Tech. project · Project synopsis
          </p>
          <h1 className="display-xl mt-6 max-w-[16ch]">
            AI-Powered Milk Delivery <em className="display-em text-butter">E-Commerce Website.</em>
          </h1>
          <div className="mt-10 grid gap-8 md:grid-cols-[1.4fr_1fr]">
            <p className="body-l max-w-[58ch] text-milk/75">
              A web platform for ordering milk and dairy, managing recurring deliveries and payments, with artificial intelligence that helps
              customers (chatbot, recommendations) and administrators (demand forecasts, analytics). This site is the working prototype:
              every module from the synopsis can be clicked through end to end on sample data.
            </p>
            <dl className="grid grid-cols-2 gap-4 self-start text-sm">
              <div className="card-dark p-4">
                <dt className="text-milk/55">Student</dt>
                <dd className="mt-1 text-lg font-semibold">Sharmila</dd>
              </div>
              <div className="card-dark p-4">
                <dt className="text-milk/55">Domain</dt>
                <dd className="mt-1 font-semibold">Web, e-commerce, AI and ML</dd>
              </div>
              <div className="card-dark col-span-2 p-4">
                <dt className="text-milk/55">Status</dt>
                <dd className="mt-1 font-semibold">Front-end prototype. AI features simulated in code, clearly marked “demo”.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="bg-milk">
        {/* problem */}
        <section className="wrap grid-12 gap-y-8 py-20 md:py-28" aria-labelledby="problem">
          <div className="col-span-4 md:col-span-8 xl:col-span-4">
            <p className="mono-label text-butter-ink">03 · Problem statement</p>
            <h2 id="problem" className="display-l mt-4">
              Phone calls, notebooks and <em className="display-em text-pasture">guesswork.</em>
            </h2>
          </div>
          <div className="col-span-4 space-y-5 text-ink-2 md:col-span-8 xl:col-span-7 xl:col-start-6">
            <p className="body-l">
              Daily milk delivery is still run through phone calls, messages and paper notebooks. Orders and subscriptions are written by hand,
              billing mistakes are common, and customers can&apos;t easily pause, change or track deliveries. Suppliers estimate tomorrow&apos;s
              demand by guesswork, which leads to shortages or unsold stock.
            </p>
            <p>
              The proposed system brings orders, subscriptions and payments into one place, and uses AI to support customers with answers and
              suggestions, and administrators with reliable forecasts. AI outputs support people&apos;s decisions; they never replace them.
            </p>
          </div>
        </section>

        {/* existing vs proposed */}
        <section className="bg-cream py-20 md:py-28" aria-labelledby="solve">
          <div className="wrap">
            <p className="mono-label text-butter-ink">05–08 · Existing vs proposed</p>
            <h2 id="solve" className="display-l mt-4 max-w-[20ch]">
              How the prototype answers <em className="display-em text-pasture">each problem.</em>
            </h2>
            <div className="mt-12 overflow-hidden rounded-[24px] border border-rule bg-milk">
              {PROBLEMS.map(([p, s, href], i) => (
                <div key={p} className="grid gap-2 border-b border-rule p-5 last:border-0 md:grid-cols-[1fr_1.6fr_auto] md:items-center md:gap-8 md:px-8">
                  <p className="font-semibold">
                    <span className="mr-3 font-mono text-xs text-clay">{String(i + 1).padStart(2, "0")}</span>
                    {p}
                  </p>
                  <p className="text-ink-2">{s}</p>
                  <Link href={href} className="mono-label link-draw w-fit text-pasture">
                    See it →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* modules */}
        <section className="wrap py-20 md:py-28" aria-labelledby="modules">
          <p className="mono-label text-butter-ink">09 · Modules</p>
          <h2 id="modules" className="display-l mt-4 max-w-[18ch]">
            Nine modules, <em className="display-em text-pasture">all clickable.</em>
          </h2>
          <div data-reveal-group className="mt-12 grid gap-[var(--gutter)] md:grid-cols-2 xl:grid-cols-3">
            {MODULES.map((m) => (
              <Link key={m.n} href={m.href} data-reveal className="card group flex flex-col p-6 transition-colors hover:border-pasture">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-butter-ink">{m.n}</span>
                  <span className={`chip py-1 text-[0.7rem] ${m.ai ? "bg-butter/20 text-butter-ink" : "bg-ok/10 text-ok"}`}>{m.ai ? "AI · simulated" : "Working prototype"}</span>
                </div>
                <h3 className="h3 mt-4">{m.title}</h3>
                <p className="mt-2 flex-1 text-[0.95rem] text-ink-2">{m.body}</p>
                <span className="mono-label mt-5 inline-flex items-center gap-2 text-pasture">
                  Open the demo <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>

          <h3 className="display-m mt-20">Also in the prototype, from the features document</h3>
          <ul className="mt-8 grid gap-[var(--gutter)] md:grid-cols-2 xl:grid-cols-3">
            {EXTRA_AI.map(([t, d, href]) => (
              <li key={t}>
                <Link href={href} className="flex h-full gap-4 rounded-[22px] border border-rule p-5 transition-colors hover:border-pasture">
                  <CheckIcon className="mt-0.5 flex-none text-pasture" />
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="text-sm text-ink-2">{d}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* chatbot */}
        <section id="chatbot" className="on-dark scroll-mt-20 bg-night py-20 text-milk md:py-28" aria-labelledby="bot">
          <div className="wrap grid-12 gap-y-10">
            <div className="col-span-4 md:col-span-8 xl:col-span-5">
              <p className="mono-label text-butter">9.5 · The assistant</p>
              <h2 id="bot" className="display-l mt-4">
                AI not connected. <em className="display-em text-butter">This is how it works.</em>
              </h2>
              <p className="mt-6 text-milk/70">
                The chatbot recognises a fixed set of sample questions, written in <code className="text-butter">src/lib/chat.ts</code>. Each
                question belongs to an intent (delivery time, pause, payment, complaint…). The message is matched to the closest intent and the
                written answer is returned; some answers read live data, like your last order or today&apos;s prices. The panel shows the
                matched intent and its confidence, so you can explain the matching during a demo.
              </p>
              <p className="mt-4 text-milk/70">
                In the full system the same function sends the message to an NLP model or AI API through Flask, and these sample questions become
                its examples and fallback.
              </p>
            </div>
            <div className="col-span-4 md:col-span-8 xl:col-span-6 xl:col-start-7">
              <p className="mono-label mb-4 text-milk/50">Tap a sample question to ask it</p>
              <AskChips />
            </div>
          </div>
        </section>

        {/* how AI works */}
        <section className="wrap py-20 md:py-28" aria-labelledby="how">
          <p className="mono-label text-butter-ink">How AI works in the application</p>
          <h2 id="how" className="display-l mt-4 max-w-[18ch]">
            From an order to <em className="display-em text-pasture">a better tomorrow.</em>
          </h2>
          <ol className="mt-12 grid gap-[var(--gutter)] md:grid-cols-3 xl:grid-cols-6">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="relative rounded-[22px] bg-cream p-5">
                <span className="font-display text-4xl text-pasture [font-variation-settings:'opsz'_96,'SOFT'_100]">{i + 1}</span>
                <p className="mt-3 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-[70ch] text-sm text-ink-3">
            AI predictions depend on the amount and quality of data. The prototype uses sample, simulated order data; outputs support people,
            especially for food quality, payments and delivery.
          </p>
        </section>

        {/* architecture */}
        <section className="bg-cream py-20 md:py-28" aria-labelledby="arch">
          <div className="wrap">
            <p className="mono-label text-butter-ink">10–11 · Architecture and technology</p>
            <h2 id="arch" className="display-l mt-4 max-w-[20ch]">
              Built to swap the stand-ins <em className="display-em text-pasture">for the real thing.</em>
            </h2>
            <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
              {[
                ["Browser", ["Customer site", "Admin dashboard", "Delivery app"]],
                ["Flask API", ["Auth and roles", "Orders, payments, subscriptions", "AI endpoints"]],
                ["MySQL + models", ["8 tables (below)", "Pandas, Scikit-learn", "NLP model or AI API"]],
              ].map(([t, items], i) => (
                <div key={t as string} className="contents">
                  <div className="card p-6">
                    <p className="h3">{t as string}</p>
                    <ul className="mt-4 space-y-2 text-sm text-ink-2">
                      {(items as string[]).map((x) => (
                        <li key={x} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-pasture" /> {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {i < 2 && (
                    <div aria-hidden className="hidden items-center justify-center text-ink-3 lg:flex">
                      <ArrowRight size={28} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-[var(--gutter)] xl:grid-cols-2">
              <div className="overflow-hidden rounded-[22px] border border-rule bg-milk">
                <p className="border-b border-rule px-5 py-4 font-semibold">Data model (MySQL tables)</p>
                <table className="w-full text-sm">
                  <tbody>
                    {TABLES.map(([t, d]) => (
                      <tr key={t} className="border-b border-rule last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-[0.8rem] text-pasture">{t}</td>
                        <td className="px-5 py-3 text-ink-2">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="overflow-hidden rounded-[22px] border border-rule bg-milk">
                <p className="border-b border-rule px-5 py-4 font-semibold">Technology: proposed and in this prototype</p>
                <table className="w-full text-sm">
                  <tbody>
                    {STACK.map(([k, a, b]) => (
                      <tr key={k} className="border-b border-rule align-top last:border-0">
                        <th className="px-5 py-3 text-left font-semibold">{k}</th>
                        <td className="px-5 py-3 text-ink-2">{a}</td>
                        <td className="px-5 py-3 text-ink-3">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* demo accounts + future */}
        <section className="wrap grid-12 gap-y-12 py-20 md:py-28" aria-labelledby="try">
          <div className="col-span-4 md:col-span-8 xl:col-span-6">
            <p className="mono-label text-butter-ink">Try it</p>
            <h2 id="try" className="display-l mt-4">
              Three roles, <em className="display-em text-pasture">three logins.</em>
            </h2>
            <ul className="mt-8 space-y-3">
              {(
                [
                  ["customer", "/account", "Orders, subscriptions, tracking, invoices"],
                  ["admin", "/admin", "Dashboard, products, orders, AI insights"],
                  ["staff", "/delivery", "Today's optimised route, mark delivered"],
                ] as const
              ).map(([k, href, note]) => (
                <li key={k} className="card flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-semibold">{DEMO_ACCOUNTS[k].label}</p>
                    <p className="font-mono text-[0.8rem] text-ink-2">
                      {DEMO_ACCOUNTS[k].email} / {DEMO_ACCOUNTS[k].password}
                    </p>
                    <p className="text-sm text-ink-3">{note}</p>
                  </div>
                  <Link href={href} className="btn btn-primary btn-sm">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ink-3">Data lives in your browser. “Reset demo data” in the admin sidebar regenerates it for today.</p>
          </div>
          <div className="col-span-4 md:col-span-8 xl:col-span-5 xl:col-start-8">
            <p className="mono-label text-butter-ink">12 · Future enhancements</p>
            <ul className="mt-6 space-y-3 text-ink-2">
              {[
                "Connect the chatbot to an NLP model or AI API, in English and Tamil",
                "Live maps and traffic for route optimisation",
                "Payment gateway for real UPI and card payments",
                "Mobile apps for customers and delivery staff",
                "Train recommendation and forecast models on real order data",
                "Sensor feeds from the chiller for continuous quality monitoring",
              ].map((x) => (
                <li key={x} className="flex gap-3 border-b border-rule pb-3">
                  <CheckIcon size={18} className="mt-0.5 flex-none text-pasture" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
