import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { footerNav, site } from "@/config/site";

export function Footer() {
  return (
    <footer className="no-print on-dark relative overflow-hidden bg-pasture-900 text-milk">
      {/* a quiet horizon line */}
      <svg aria-hidden viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-16 w-full text-milk/[0.04]">
        <path d="M0 80 C 240 40, 420 100, 720 70 S 1200 30, 1440 70 V0 H0Z" fill="currentColor" />
      </svg>
      <div className="wrap relative pb-10 pt-20 md:pt-28">
        <div className="grid-12 gap-y-12">
          <div className="col-span-4 md:col-span-8 xl:col-span-5">
            <Logo />
            <p className="display-m mt-8 max-w-[18ch] text-milk">
              Tomorrow, 6 AM. <em className="display-em text-butter">Your first bottle.</em>
            </p>
            <p className="mt-6 max-w-[42ch] text-milk/65">
              {site.legalName}, {site.farm}. Delivering across {site.city}. {site.hours}.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a href={`tel:${site.phone.tel}`} className="link-under">
                {site.phone.display}
              </a>
              <a href={`mailto:${site.email}`} className="link-under">
                {site.email}
              </a>
            </div>
          </div>
          {footerNav.map((col) => (
            <div key={col.title} className="col-span-2 md:col-span-2 xl:col-span-2">
              <p className="mono-label text-butter">{col.title}</p>
              <ul className="mt-5 space-y-3">
                {col.items.map((i) => (
                  <li key={i.href + i.label}>
                    <Link href={i.href} className="link-draw text-[0.95rem] text-milk/80 hover:text-milk">
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-white/10 pt-6 text-[0.8rem] text-milk/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.legalName}. A final-year project prototype: sample data, demo payments, AI
            features simulated in code.
          </p>
          <p>Photographs: Unsplash (see CREDITS.md). Illustrations drawn in code.</p>
        </div>
      </div>
    </footer>
  );
}
