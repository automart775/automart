"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Pencil, TrendingUp, Clock, FileText, ShoppingBag, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

function getPublicUrl(path) {
  if (!path) return null;
  try {
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch { return null; }
}
function thumb(listing) {
  const imgs = (listing.listing_images || []).sort((a, b) => a.sort_order - b.sort_order);
  return getPublicUrl(imgs[0]?.storage_path);
}

const STATUS_COLOR = {
  active:   { bg: "#ECFDF5", color: "#2F9E44" },
  sold:     { bg: "#EFF6FF", color: "#1E3A5F" },
  draft:    { bg: "var(--paper)", color: "var(--muted)" },
  removed:  { bg: "#FEF2F2", color: "#D6472F" },
};

function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl p-4 flex-1" style={{ background: "var(--paper)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
        {Icon && <Icon size={15} style={{ color: accent || "var(--muted)" }} />}
      </div>
      <div className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

function Section({ title, count, children, action }) {
  return (
    <div className="mt-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
          {title}{count != null && count > 0 && (
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--ink)" }}>{count}</span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="text-sm text-center py-8 rounded-xl" style={{ background: "var(--paper)", color: "var(--muted)" }}>
      {text}
    </div>
  );
}

export default function SellerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notDealer, setNotDealer] = useState(false);
  const [listings, setListings] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [bids, setBids] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { router.push("/login"); return; }
      const uid = auth.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (!profile || profile.role === "buyer") { setNotDealer(true); setLoading(false); return; }

      // 1. Listings
      const { data: lData } = await supabase
        .from("listings")
        .select(`
          id, make, model, year, price, listing_type, status, created_at,
          listing_images ( storage_path, sort_order ),
          auctions ( id, current_bid, ends_at, status )
        `)
        .eq("seller_id", uid)
        .order("created_at", { ascending: false })
        .limit(30);

      const lArr = lData || [];
      setListings(lArr);

      // 2. Bids on seller's auctions
      const auctionIds = lArr.flatMap(l => {
        const a = Array.isArray(l.auctions) ? l.auctions : l.auctions ? [l.auctions] : [];
        return a.map(x => x.id);
      }).filter(Boolean);

      if (auctionIds.length > 0) {
        const { data: bData } = await supabase
          .from("bids")
          .select("id, amount, created_at, auction_id")
          .in("auction_id", auctionIds)
          .order("created_at", { ascending: false })
          .limit(10);
        setBids(bData || []);
      }

      // 3. Pending quote requests for their listings
      const listingIds = lArr.map(l => l.id);
      if (listingIds.length > 0) {
        const { data: qData } = await supabase
          .from("quote_requests")
          .select("id, status, created_at, listing_id, listings ( make, model, year )")
          .in("listing_id", listingIds)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(10);
        setQuotes(qData || []);
      }

      // 4. Orders (sales)
      const { data: oData } = await supabase
        .from("orders")
        .select("id, status, total_amount, source, created_at, listings ( make, model, year )")
        .eq("seller_id", uid)
        .order("created_at", { ascending: false })
        .limit(10);
      setOrders(oData || []);

      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) return <main className="p-8 text-sm" style={{ color: "var(--muted)" }}>Loading…</main>;

  if (notDealer) return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 420 }}>
      <p className="font-semibold" style={{ color: "var(--ink)" }}>Seller account required</p>
      <p className="text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>
        Sign up as a seller to access this dashboard.
      </p>
      <Link href="/signup" className="inline-block px-5 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--ink)" }}>
        Create seller account
      </Link>
    </main>
  );

  // Derived stats
  const active = listings.filter(l => l.status === "active").length;
  const sold   = listings.filter(l => l.status === "sold").length;
  const totalRevenue = orders
    .filter(o => o.status === "completed" || o.status === "awaiting_final_payment")
    .reduce((s, o) => s + (o.total_amount || 0), 0);

  return (
    <main className="mx-auto px-4 py-8 pb-20" style={{ maxWidth: 680 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Seller dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{listings.length} listings total</p>
        </div>
        <Link href="/sell"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--ink)" }}>
          <Plus size={15} /> New listing
        </Link>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <StatCard label="Active"   value={active}               sub="listed now"        icon={TrendingUp} accent="#2F9E44" />
        <StatCard label="Sold"     value={sold}                 sub="completed"         icon={CheckCircle} accent="#1E3A5F" />
        <StatCard label="Quotes"   value={quotes.length}        sub="awaiting reply"    icon={FileText}   accent="#F2A93B" />
        <StatCard label="Revenue"  value={totalRevenue > 0 ? `$${(totalRevenue/1000).toFixed(0)}k` : "—"}
                                                                sub="from orders"       icon={ShoppingBag} />
      </div>

      {/* Active Listings */}
      <Section
        title="My listings"
        action={
          <Link href="/dashboard" className="text-xs font-semibold" style={{ color: "var(--accent-dark)" }}>
            Manage all →
          </Link>
        }
      >
        {listings.length === 0 ? (
          <Empty text="No listings yet — create your first one above." />
        ) : (
          <div className="flex flex-col gap-2">
            {listings.slice(0, 8).map(l => {
              const auction = Array.isArray(l.auctions) ? l.auctions[0] : l.auctions;
              const src = thumb(l);
              const statusCfg = STATUS_COLOR[l.status] || STATUS_COLOR.active;
              const price = l.listing_type === "auction"
                ? `$${(auction?.current_bid || 0).toLocaleString()} bid`
                : l.price ? `$${l.price.toLocaleString()}` : "—";
              const href = l.listing_type === "auction" ? `/auction/${l.id}` : `/listing/${l.id}`;

              return (
                <div key={l.id}
                  className="flex items-center gap-3 rounded-xl p-2.5"
                  style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <div className="w-14 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--paper)" }}>
                    {src
                      ? <img src={src} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🚗</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>
                      {l.year} {l.make} {l.model}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full capitalize"
                        style={{ background: statusCfg.bg, color: statusCfg.color }}>
                        {l.status}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{price}</span>
                      {l.listing_type === "auction" && auction?.ends_at && (
                        <span className="text-xs flex items-center gap-0.5" style={{ color: "#F2A93B" }}>
                          <Clock size={10} />
                          {new Date(auction.ends_at) < new Date() ? "Ended" :
                            `${Math.max(0, Math.floor((new Date(auction.ends_at) - new Date()) / 3600000))}h left`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Link href={href}
                      className="p-2 rounded-lg" style={{ color: "var(--muted)" }} aria-label="View">
                      <Eye size={15} />
                    </Link>
                    {l.listing_type !== "auction" && (
                      <Link href={`/listing/${l.id}/edit`}
                        className="p-2 rounded-lg" style={{ color: "var(--muted)" }} aria-label="Edit">
                        <Pencil size={15} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Pending Quotes */}
      <Section title="Pending quotes" count={quotes.length}>
        {quotes.length === 0 ? (
          <Empty text="No pending quote requests." />
        ) : (
          <div className="flex flex-col gap-2">
            {quotes.map(q => {
              const l = q.listings;
              return (
                <div key={q.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {l?.year} {l?.make} {l?.model}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      Received {new Date(q.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <Link href={`/quote/${q.listing_id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "var(--accent-dark)" }}>
                    Respond
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Recent Bids */}
      {bids.length > 0 && (
        <Section title="Recent bids on your auctions">
          <div className="flex flex-col gap-2">
            {bids.map(b => {
              const matchListing = listings.find(l => {
                const auctions = Array.isArray(l.auctions) ? l.auctions : l.auctions ? [l.auctions] : [];
                return auctions.some(a => a.id === b.auction_id);
              });
              return (
                <div key={b.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <div>
                    <div className="text-sm" style={{ color: "var(--muted)" }}>
                      {matchListing ? `${matchListing.year} ${matchListing.make} ${matchListing.model}` : "Your auction"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="text-base font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
                    ${b.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Recent Orders */}
      {orders.length > 0 && (
        <Section title="Recent orders">
          <div className="flex flex-col gap-2">
            {orders.map(o => {
              const statusColor =
                o.status === "completed"           ? "#2F9E44" :
                o.status === "pending_deposit"     ? "#F2A93B" :
                o.status === "cancelled"           ? "#D6472F" : "var(--muted)";
              return (
                <div key={o.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {o.listings?.year} {o.listings?.make} {o.listings?.model}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold capitalize" style={{ color: statusColor }}>
                        {o.status?.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <span className="text-base font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
                    ${(o.total_amount || 0).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </main>
  );
}
