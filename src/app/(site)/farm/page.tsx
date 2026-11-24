import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CHAPTERS } from "@/components/home/chapters";
import { ArrowRight } from "@/components/ui/icons";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "From pasture to pour",
  description: "How a bottle of Ksheera milk gets from our herd near Kanchipuram to your door in Chennai, in about two hours.",
};

const CHECKS = [
  ["Fat %", "At least 3.5% for cow milk, 6% for buffalo"],
  ["SNF %", "Solids-not-fat at least 8.5%: the first sign of added water"],
  ["Temperature", "4°C or below within 20 minutes of milking"],
  ["Acidity", "Titratable acidity: freshness, before it can taste sour"],
  ["Clot on boiling", "A quick heat test on every can"],
  ["Alcohol test", "Heat stability for safe pasteurisation"],
  ["Plate count", "Bacterial load, cultured daily"],
  ["Antibiotic residue", "Strip test; treated cows are milked separately"],
  ["Urea, starch, sugar", "Strip tests for common adulterants"],
  ["Detergent, neutraliser", "Strip tests for the rest"],
  ["Density", "Lactometer reading per can"],
  ["Sensory", "A person smells and tastes every batch"],
];

const FAQ = [
  ["Is the milk pasteurised?", "Yes, gently (72°C for 15 seconds), then chilled straight back to 4°C. It is not homogenised, so the cream rises to the top."],
  ["Why glass?", "Glass keeps milk colder for longer, doesn't taste of anything, and each bottle makes about thirty trips. Leave the empties out with your next delivery."],
  ["What do the cows eat?", "Pasture for about six hours a day, green fodder we grow ourselves, and a measured ration of cottonseed, groundnut cake and minerals. No hormones."],
  ["Can I visit?", "On the first Sunday of every month. Book through the assistant or call us."],
];

export default function FarmPage() {
  const stages = CHAPTERS.slice(1);
  return (
    <>
      <section className="on-dark relative flex min-h-[92svh] items-end overflow-hidden text-milk">
        <Image src="/photos/cows-sunset.jpg" alt="Cows grazing at sunrise" fill priority sizes="100vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/20" />
        <div className="wrap relative pb-16 pt-40 md:pb-24">
          <p className="mono-label flex items-center gap-3 text-butter">
            <span aria-hidden className="h-px w-8 bg-current" />
            {site.farm}
          </p>
          <h1 className="display-xxl mt-6 max-w-[11ch]">
            From pasture <em className="display-em text-butter">to pour.</em>
          </h1>
          <p className="body-l mt-6 max-w-[50ch] text-milk/80">
            About two hours, seven stops and twelve checks between a cow in Walajabad and a bottle on your step in Chennai. Here is every one of them.
          </p>
        </div>
      </section>

      <div className="bg-milk">
        {stages.map((c, i) => (
          <section key={c.id} id={c.id} className="wrap grid-12 items-center gap-y-8 border-b border-rule py-20 md:py-28">
            <div className={`col-span-4 md:col-span-4 xl:col-span-6 ${i % 2 ? "md:order-2 xl:col-start-7" : ""}`}>
              {c.photo && (
                <figure data-reveal>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[26px]">
                    <Image src={c.photo.src} alt={c.photo.alt} fill sizes="(min-width: 1280px) 46vw, (min-width: 768px) 48vw, 100vw" className="object-cover" style={{ objectPosition: c.photo.focus }} />
                  </div>
                  <figcaption className="mono-label mt-3 text-ink-3">{c.photo.caption}</figcaption>
                </figure>
              )}
            </div>
            <div className={`col-span-4 md:col-span-4 xl:col-span-5 ${i % 2 ? "md:order-1 xl:col-start-1" : "xl:col-start-8"}`}>
              <p className="mono-label flex items-center gap-3 text-butter-ink">
                <span className="font-display text-4xl tracking-normal text-pasture [font-variation-settings:'opsz'_96,'SOFT'_100]">{String(i + 1).padStart(2, "0")}</span>
                {c.time} AM · {c.label}
              </p>
              <h2 data-reveal className="display-l mt-5">
                {c.headline} <em className="display-em text-pasture">{c.em}</em>
              </h2>
              <p data-reveal className="body-l mt-5 text-ink-2">
                {c.body}
              </p>
              {c.ai && <p className="mt-5 inline-flex rounded-full border border-butter/50 bg-butter/10 px-3 py-1 text-[0.78rem] font-semibold text-butter-ink">{c.ai} · demo in the admin dashboard</p>}
            </div>
          </section>
        ))}

        <section aria-labelledby="checks" className="bg-cream py-24 md:py-32">
          <div className="wrap">
            <p className="mono-label flex items-center gap-3 text-butter-ink">
              <span aria-hidden className="h-px w-8 bg-current" />
              The farm lab
            </p>
            <h2 id="checks" className="display-xl mt-6 max-w-[16ch]">
              Twelve checks, <em className="display-em text-pasture">every batch.</em>
            </h2>
            <ol data-reveal-group className="mt-14 grid gap-x-[var(--gutter)] gap-y-px overflow-hidden rounded-[24px] border border-rule bg-rule sm:grid-cols-2 xl:grid-cols-3">
              {CHECKS.map(([t, d], i) => (
                <li key={t} data-reveal className="bg-milk p-6">
                  <p className="font-mono text-xs text-butter-ink">{String(i + 1).padStart(2, "0")}</p>
                  <p className="h3 mt-2">{t}</p>
                  <p className="mt-1 text-ink-2">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="faq" className="wrap grid-12 gap-y-10 py-24 md:py-32">
          <div className="col-span-4 md:col-span-8 xl:col-span-4">
            <h2 id="faq" className="display-l">
              Questions <em className="display-em text-pasture">people ask.</em>
            </h2>
          </div>
          <div className="col-span-4 md:col-span-8 xl:col-span-7 xl:col-start-6">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-b border-rule py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {q}
                  <span aria-hidden className="text-2xl text-pasture transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[60ch] text-ink-2">{a}</p>
              </details>
            ))}
            <Link href="/subscribe" className="btn btn-primary mt-10">
              Start a subscription <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
