"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MapPin, Clock } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const FALLBACK = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800";

function getPublicUrl(path) {
  if (!path) return null;
  try {
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch { return null; }
}

function thumb(listing) {
  const imgs = (listing.listing_images || []).sort((a, b) => a.sort_order - b.sort_order);
  return getPublicUrl(imgs[0]?.storage_path) || FALLBACK;
}

function AuctionBadge({ endsAt }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) { setLabel("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 24) setLabel(`${Math.floor(h / 24)}d left`);
      else if (h > 0) setLabel(`${h}h ${m}m left`);
      else setLabel(`${m}m left`);
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [endsAt]);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#F2A93B" }}>
      <Clock size={11} />{label}
    </span>
  );
}

export default function SavedPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { router.push("/login"); return; }
      setUser(data.user);
      fetchSaved(data.user.id);
    });
  }, [router]);

  const fetchSaved = async (uid) => {
    const { data } = await supabase
      .from("saved_listings")
      .select(`
        listing_id,
        created_at,
        listings (
          id, make, model, year, price, listing_type, status, location_city, location_country,
          listing_images ( storage_path, sort_order ),
          auctions ( current_bid, ends_at, status )
        )
      `)
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    setItems(data || []);
    setLoading(false);
  };

  const unsave = async (listingId) => {
    await supabase
      .from("saved_listings")
      .delete()
      .match({ user_id: user.id, listing_id: listingId });
    setItems((prev) => prev.filter((i) => i.listing_id !== listingId));
  };

  if (loading) return <main className="p-8 text-sm" style={{ color: "var(--muted)" }}>Loading…</main>;

  return (
    <main className="mx-auto px-4 py-8" style={{ maxWidth: 680 }}>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
        Saved cars
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        {items.length} {items.length === 1 ? "vehicle" : "vehicles"} saved
      </p>

      {items.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: "var(--paper)" }}>
          <Heart size={40} className="mx-auto mb-4" style={{ color: "var(--border)" }} />
          <p className="font-semibold" style={{ color: "var(--ink)" }}>Nothing saved yet</p>
          <p className="text-sm mt-1 mb-6" style={{ color: "var(--muted)" }}>
            Tap the heart icon on any listing to save it here.
          </p>
          <Link
            href="/search"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--ink)" }}
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(({ listing_id, listings: l }) => {
            if (!l) return null;
            const auction = Array.isArray(l.auctions) ? l.auctions[0] : l.auctions;
            const href = l.listing_type === "auction" ? `/auction/${l.id}` : `/listing/${l.id}`;
            const displayPrice = l.listing_type === "auction"
              ? auction?.current_bid || 0
              : l.price || 0;

            return (
              <div
                key={listing_id}
                className="flex gap-3 rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)", background: "white" }}
              >
                {/* Image */}
                <Link href={href} className="flex-shrink-0 w-28 h-24 block">
                  <img src={thumb(l)} alt="" className="w-full h-full object-cover" />
                </Link>

                {/* Info */}
                <div className="flex-1 py-3 pr-3 min-w-0">
                  <Link href={href}>
                    <div className="text-sm font-semibold leading-tight" style={{ color: "var(--ink)", fontFamily: "'Space Grotesk',sans-serif" }}>
                      {l.year} {l.make} {l.model}
                    </div>
                  </Link>

                  {l.location_city && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                      <MapPin size={10} />{l.location_city}{l.location_country ? `, ${l.location_country}` : ""}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="text-base font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
                        ${displayPrice.toLocaleString()}
                      </span>
                      {l.listing_type === "auction" && (
                        <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>bid</span>
                      )}
                      {l.listing_type === "auction" && auction?.ends_at && (
                        <div className="mt-0.5">
                          <AuctionBadge endsAt={auction.ends_at} />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => unsave(listing_id)}
                      className="p-1.5 rounded-lg"
                      style={{ color: "#D6472F" }}
                      aria-label="Remove from saved"
                    >
                      <Heart size={18} fill="#D6472F" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
