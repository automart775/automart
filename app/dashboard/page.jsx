"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Pencil, Trash2, Clock } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

function getPublicUrl(path) {
  if (!path) return null;
  try {
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch { return null; }
}

const STATUS_STYLE = {
  active:   { bg: "#ECFDF5", color: "#2F9E44" },
  sold:     { bg: "#EFF6FF", color: "#1E3A5F" },
  draft:    { bg: "var(--paper)", color: "var(--muted)" },
  removed:  { bg: "#FEF2F2", color: "#D6472F" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { router.push("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", data.user.id).single();
      const r = profile?.role || "buyer";
      setRole(r);
      if (r !== "dealer" && r !== "admin") { setLoading(false); return; }
      fetchListings(data.user.id);
    });
  }, [router]);

  const fetchListings = async (uid) => {
    const { data } = await supabase
      .from("listings")
      .select("id, make, model, year, price, listing_type, status, created_at, listing_images(storage_path, sort_order), auctions(id, current_bid, ends_at, status)")
      .eq("seller_id", uid)
      .order("created_at", { ascending: false });
    setListings(data || []);
    setLoading(false);
  };

  const deleteListing = async (id) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("listings").delete().eq("id", id);
    setListings((prev) => prev.filter((l) => l.id !== id));
    setDeleting(null);
  };

  if (loading) return <main className="p-8 text-sm" style={{ color: "var(--muted)" }}>Loading…</main>;

  if (role === "buyer") return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 420 }}>
      <p className="font-semibold" style={{ color: "var(--ink)" }}>This page is for sellers.</p>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
        Go to <Link href="/saved" className="underline">Saved cars</Link> to see your wishlist.
      </p>
    </main>
  );

  return (
    <main className="mx-auto px-4 py-8" style={{ maxWidth: 680 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>My listings</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {listings.length} {listings.length === 1 ? "vehicle" : "vehicles"}
          </p>
        </div>
        <Link href="/sell"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--ink)" }}>
          <Plus size={15} /> New listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: "var(--paper)" }}>
          <div className="text-5xl mb-4">🚗</div>
          <p className="font-semibold" style={{ color: "var(--ink)" }}>No listings yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>Post your first vehicle to get started.</p>
          <Link href="/sell"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--ink)" }}>
            List a vehicle
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((l) => {
            const imgs = (l.listing_images || []).sort((a, b) => a.sort_order - b.sort_order);
            const src = getPublicUrl(imgs[0]?.storage_path);
            const auction = Array.isArray(l.auctions) ? l.auctions[0] : l.auctions;
            const statusStyle = STATUS_STYLE[l.status] || STATUS_STYLE.active;
            const href = l.listing_type === "auction" ? `/auction/${l.id}` : `/listing/${l.id}`;
            const price = l.listing_type === "auction"
              ? `$${(auction?.current_bid || 0).toLocaleString()} bid`
              : l.price ? `$${l.price.toLocaleString()}` : "—";

            return (
              <div key={l.id}
                className="flex items-center gap-3 rounded-2xl p-3"
                style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "var(--paper)" }}>
                  {src
                    ? <img src={src} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🚗</div>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: "var(--ink)", fontFamily: "'Space Grotesk',sans-serif" }}>
                    {l.year} {l.make} {l.model}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}>
                      {l.status}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{price}</span>
                    {l.listing_type === "auction" && auction?.ends_at && (
                      <span className="text-xs flex items-center gap-0.5" style={{ color: "#F2A93B" }}>
                        <Clock size={10} />
                        {new Date(auction.ends_at) <= new Date() ? "Ended" :
                          `${Math.max(0, Math.floor((new Date(auction.ends_at) - new Date()) / 3600000))}h left`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={href} className="p-2 rounded-lg" style={{ color: "var(--muted)" }} aria-label="View">
                    <Eye size={16} />
                  </Link>
                  {l.listing_type !== "auction" && (
                    <Link href={`/listing/${l.id}/edit`} className="p-2 rounded-lg" style={{ color: "var(--muted)" }} aria-label="Edit">
                      <Pencil size={16} />
                    </Link>
                  )}
                  <button onClick={() => deleteListing(l.id)} disabled={deleting === l.id}
                    className="p-2 rounded-lg disabled:opacity-40" style={{ color: "#D6472F" }} aria-label="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
