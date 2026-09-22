import Link from "next/link";
import { Star } from "lucide-react";
import { getActiveListings } from "../../lib/listings";

export const dynamic = "force-dynamic";

function inRange(price, range) {
  if (!range || range === "any") return true;
  if (range === "under20") return price < 20000;
  if (range === "20to30") return price >= 20000 && price <= 30000;
  if (range === "over30") return price > 30000;
  return true;
}

export default async function SearchPage({ searchParams }) {
  const { listings, isDemo } = await getActiveListings();
  const type = searchParams?.type || "all";
  const price = searchParams?.price || "any";

  const filtered = listings.filter((l) => {
    const typeOk = type === "all" || l.listing_type === type;
    const priceOk = l.listing_type === "auction" ? true : inRange(Number(l.price), price);
    return typeOk && priceOk;
  });

  const typeChips = [
    { key: "all", label: "All" },
    { key: "fixed_price", label: "Fixed price" },
    { key: "auction", label: "Auctions" },
  ];
  const priceChips = [
    { key: "any", label: "Any price" },
    { key: "under20", label: "Under $20k" },
    { key: "20to30", label: "$20k–$30k" },
    { key: "over30", label: "$30k+" },
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-bold mb-4">Browse</h1>

      {isDemo && (
        <div className="mb-6 text-xs font-mono px-3 py-2 rounded-lg inline-block" style={{ background: "#FDF1DD", color: "var(--accent-dark)" }}>
          Showing demo listings — connect real data in Supabase to replace these.
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-3">
        {typeChips.map((c) => (
          <Link
            key={c.key}
            href={`/search?type=${c.key}&price=${price}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border"
            style={{
              borderColor: type === c.key ? "var(--ink)" : "var(--border)",
              background: type === c.key ? "#EAF0F6" : "transparent",
              color: type === c.key ? "var(--ink)" : "#333",
            }}
          >
            {c.label}
          </Link>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        {priceChips.map((c) => (
          <Link
            key={c.key}
            href={`/search?type=${type}&price=${c.key}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border"
            style={{
              borderColor: price === c.key ? "var(--ink)" : "var(--border)",
              background: price === c.key ? "#EAF0F6" : "transparent",
              color: price === c.key ? "var(--ink)" : "#333",
            }}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>{filtered.length} results</p>

      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>No listings match those filters yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((v) => (
            <Link
              key={v.id}
              href={v.listing_type === "auction" ? `/auction/${v.id}` : `/listing/${v.id}`}
              className="rounded-2xl p-3 flex gap-3 bg-white"
              style={{ boxShadow: "0 1px 2px rgba(20,33,61,0.04), 0 6px 16px rgba(20,33,61,0.05)" }}
            >
              <img src={v.image_url} alt="" className="w-24 h-20 object-cover rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-sm font-semibold truncate">{v.year} {v.make} {v.model}</p>
                  {v.listing_type === "auction" && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase bg-red-50 text-red-600 flex-shrink-0">Live</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{v.mileage} · {v.fuel_type}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-base font-bold font-mono" style={{ color: "var(--ink)" }}>
                    {v.listing_type === "auction" ? `$${Number(v.current_bid || v.start_price).toLocaleString()} bid` : `$${Number(v.price).toLocaleString()}`}
                  </span>
                  <span className="flex items-center gap-0.5 text-xs" style={{ color: "var(--muted)" }}>
                    <Star size={12} fill="var(--accent)" color="var(--accent)" /> {v.seller_role === "dealer" ? "Dealer" : "Private"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
