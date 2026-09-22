"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Gauge, Fuel, Cog, Heart, ShieldCheck, Star } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function ListingDetailClient({ listing }) {
  const router = useRouter();
  const [tab, setTab] = useState("Overview");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const specs = [
    { icon: Calendar, label: "Year", value: listing.year },
    { icon: Gauge, label: "Mileage", value: listing.mileage || "—" },
    { icon: Fuel, label: "Fuel", value: listing.fuel_type || "—" },
    { icon: Cog, label: "Trans", value: listing.transmission || "—" },
  ];

  const requireLogin = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.push("/login");
      return null;
    }
    return data.user;
  };

  const toggleSave = async () => {
    const user = await requireLogin();
    if (!user) return;
    setSaved((s) => !s);
    if (!saved) {
      await supabase.from("saved_listings").insert({ user_id: user.id, listing_id: listing.id });
    } else {
      await supabase.from("saved_listings").delete().eq("user_id", user.id).eq("listing_id", listing.id);
    }
  };

  const getQuote = async () => {
    const user = await requireLogin();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("quote_requests").insert({
      listing_id: listing.id,
      buyer_id: user.id,
    });
    setBusy(false);
    setMessage(error ? "Something went wrong — try again." : "Quote requested! The seller will respond soon.");
  };

  const buyNow = async () => {
    const user = await requireLogin();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("orders").insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      source: "direct_buy",
      total_amount: listing.price,
      status: "pending_deposit",
    });
    setBusy(false);
    setMessage(error ? "Something went wrong — try again." : "Order placed! Payment steps are coming soon — the seller has been notified.");
  };

  return (
    <>
      <div className="px-0 flex items-start justify-between mt-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{
                background: listing.seller_role === "dealer" ? "var(--ink-soft, #EAF0F6)" : "#FDF1DD",
                color: listing.seller_role === "dealer" ? "var(--ink)" : "var(--accent-dark)",
              }}
            >
              {listing.seller_role === "dealer" ? "Dealer" : "Private"}
            </span>
            <span className="flex items-center gap-0.5 text-xs" style={{ color: "var(--muted)" }}>
              <Star size={12} fill="var(--accent)" color="var(--accent)" /> {listing.seller_name}
              {listing.seller_verified && " · Verified"}
            </span>
          </div>
          <p className="text-2xl font-bold font-mono" style={{ color: "var(--ink)" }}>${Number(listing.price).toLocaleString()}</p>
        </div>
        <button
          onClick={toggleSave}
          className="p-2.5 rounded-full active:scale-90 transition-all"
          style={{ background: saved ? "var(--danger-soft)" : "#EAF0F6" }}
        >
          <Heart size={18} color={saved ? "var(--danger)" : "var(--ink)"} fill={saved ? "var(--danger)" : "none"} />
        </button>
      </div>

      <div className="flex gap-5 mt-5 border-b" style={{ borderColor: "var(--border)" }}>
        {["Overview", "Specs"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pb-2.5 text-sm font-semibold relative"
            style={{ color: tab === t ? "var(--ink)" : "var(--muted)" }}
          >
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full" style={{ background: "var(--accent)" }} />}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="mt-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {listing.description || "No additional description provided."}
          </p>
          <h3 className="font-display text-sm font-bold mt-5 mb-2">Seller</h3>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white" style={{ boxShadow: "0 1px 2px rgba(20,33,61,0.04), 0 6px 16px rgba(20,33,61,0.05)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#EAF0F6" }}>
              <ShieldCheck size={16} color="var(--ink)" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{listing.seller_name}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {listing.seller_verified ? "Verified seller" : "Seller on AutoMarket"}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "Specs" && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          {specs.map((s) => (
            <div key={s.label} className="rounded-xl p-2.5 text-center bg-white" style={{ boxShadow: "0 1px 2px rgba(20,33,61,0.04), 0 6px 16px rgba(20,33,61,0.05)" }}>
              <s.icon size={16} color="var(--ink)" className="mx-auto mb-1" />
              <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{s.label}</p>
              <p className="text-xs font-semibold font-mono">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div className="mt-4 text-xs font-medium px-3 py-2.5 rounded-lg" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
          {message}
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button onClick={getQuote} disabled={busy} className="flex-1 border rounded-xl py-3 font-semibold text-sm disabled:opacity-60" style={{ borderColor: "var(--ink)", color: "var(--ink)" }}>
          Get a quote
        </button>
        <button onClick={buyNow} disabled={busy} className="flex-1 rounded-xl py-3 font-semibold text-sm text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>
          Buy now
        </button>
      </div>
    </>
  );
}
