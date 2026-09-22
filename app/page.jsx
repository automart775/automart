import Link from "next/link";
import { Search, MapPin, Star, Gavel } from "lucide-react";
import { getActiveListings, getLiveAuctions } from "../lib/listings";
import Countdown from "../components/Countdown";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { listings, isDemo } = await getActiveListings();
  const { auctions } = await getLiveAuctions();
  const featured = listings.filter((l) => l.listing_type !== "auction");

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      {/* Location + search, matching the mockup's top bar */}
      <div className="flex items-center gap-1 text-xs mb-4" style={{ color: "var(--muted)" }}>
        <MapPin size={13} /> Austin, TX
      </div>

      <Link href="/search" className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-8 bg-white border" style={{ borderColor: "var(--border)", color: "var(--muted)", boxShadow: "0 1px 2px rgba(20,33,61,0.04), 0 6px 16px rgba(20,33,61,0.05)" }}>
        <Search size={16} />
        <span>Search make, model, or dealer</span>
      </Link>

      {isDemo && (
        <div className="mb-6 text-xs font-mono px-3 py-2 rounded-lg inline-block" style={{ background: "#FDF1DD", color: "var(--accent-dark)" }}>
          Showing demo listings — connect real data in Supabase to replace these.
        </div>
      )}

      {/* Live auctions strip */}
      {auctions.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Gavel size={15} style={{ color: "var(--accent)" }} /> Live Auctions
            </h2>
            <Link href="/search?type=auction&price=any" className="text-xs font-semibold" style={{ color: "var(--ink)" }}>See all</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {auctions.map((a) => (
              <Link
                key={a.id}
                href={`/auction/${a.id}`}
                className="flex-shrink-0 w-64 rounded-2xl p-3 text-left"
                style={{ background: "var(--ink-dark)", boxShadow: "0 4px 10px rgba(20,33,61,0.06), 0 14px 32px rgba(20,33,61,0.09)" }}
              >
                <div className="relative rounded-xl overflow-hidden h-28 mb-2">
                  <img src={a.image_url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                    ● Live
                  </span>
                </div>
                <p className="font-display text-sm font-semibold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {a.year} {a.make} {a.model}
                </p>
                <p className="text-[11px] mb-2" style={{ color: "#93A6BB" }}>{a.mileage}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide" style={{ color: "#93A6BB" }}>Current bid</p>
                    <p className="text-sm font-bold font-mono" style={{ color: "var(--accent)" }}>
                      ${Number(a.current_bid || a.start_price).toLocaleString()}
                    </p>
                  </div>
                  <Countdown end={a.ends_at} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured listings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Featured near you
          </h2>
          <Link href="/search?type=fixed_price&price=any" className="text-xs font-semibold" style={{ color: "var(--ink)" }}>See all</Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No listings yet — be the first to list a vehicle.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {featured.map((v) => (
              <Link
                key={v.id}
                href={`/listing/${v.id}`}
                className="rounded-2xl p-3 flex gap-3 bg-white"
                style={{ boxShadow: "0 1px 2px rgba(20,33,61,0.04), 0 6px 16px rgba(20,33,61,0.05)" }}
              >
                <img src={v.image_url} alt="" className="w-24 h-20 object-cover rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {v.year} {v.make} {v.model}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{v.mileage} · {v.fuel_type}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-base font-bold font-mono" style={{ color: "var(--ink)" }}>
                      ${Number(v.price).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs" style={{ color: "var(--muted)" }}>
                      <Star size={12} fill="var(--accent)" color="var(--accent)" /> 4.8
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
