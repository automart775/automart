import Link from "next/link";
import { getActiveListings } from "../lib/listings";

export const dynamic = "force-dynamic"; // always fetch fresh, never cache stale listings

export default async function HomePage() {
  const { listings, isDemo } = await getActiveListings();

  return (
    <main className="max-w-5xl mx-auto px-6 py-14">
      <p className="text-xs font-mono uppercase tracking-widest text-[var(--accent)]">AutoMarket</p>
      <h1 className="font-display text-4xl font-bold mt-2">Vehicles &amp; parts, listed to sell.</h1>
      <p className="text-[var(--muted)] mt-3 max-w-lg">
        Browse fixed-price listings and live auctions. Every listing gets its own shareable link with a real preview card for Facebook, Instagram, and WhatsApp.
      </p>

      {isDemo && (
        <div className="mt-6 text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 inline-block">
          Showing demo listings — connect Supabase and add real listings to replace these.
        </div>
      )}

      {listings.length === 0 ? (
        <p className="mt-10 text-[var(--muted)] text-sm">No listings yet — be the first to list a vehicle.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5 mt-10">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={l.listing_type === "auction" ? `/auction/${l.id}` : `/listing/${l.id}`}
              className="block bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[var(--ink)] transition-colors"
            >
              <img src={l.image_url} alt={`${l.year} ${l.make} ${l.model}`} className="w-full h-40 object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-sm">{l.year} {l.make} {l.model}</h2>
                  {l.listing_type === "auction" && (
                    <span className="text-[10px] font-mono uppercase bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Live</span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">{l.mileage} · {l.fuel_type}</p>
                <p className="font-display font-bold mt-2">
                  {l.listing_type === "auction" ? `$${Number(l.current_bid || l.start_price).toLocaleString()} bid` : `$${Number(l.price).toLocaleString()}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
