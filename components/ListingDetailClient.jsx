"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Gauge, Fuel, Cog, Heart, X, MapPin } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import VerifiedBadge from "./VerifiedBadge";

function BuyNowModal({ listing, onClose }) {
  const router = useRouter();
  const price = Number(listing.price);
  const [mode, setMode] = useState("deposit");
  const [depositPct, setDepositPct] = useState(10);
  const [payMethod, setPayMethod] = useState("paypal");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const depositAmount = Math.ceil(price * (depositPct / 100));
  const fullAmount = price;
  const payAmount = mode === "full" ? fullAmount : depositAmount;

  const submit = async () => {
    setBusy(true);
    setErr("");
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.push("/login"); return; }

    const orderStatus = mode === "full" ? "awaiting_final_payment" : "pending_deposit";
    const { error: oe } = await supabase.from("orders").insert({
      listing_id: listing.id,
      buyer_id: data.user.id,
      seller_id: listing.seller_id,
      source: "direct_buy",
      total_amount: price,
      status: orderStatus,
    });

    if (oe) { setErr(oe.message); setBusy(false); return; }
    setDone(true);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4" style={{ background:"rgba(15,36,57,0.55)" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-8" style={{ background:"white" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-base" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>Buy now — {listing.year} {listing.make} {listing.model}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background:"var(--success-soft)" }}>
              <span style={{ fontSize:28 }}>✓</span>
            </div>
            <p className="font-semibold text-base mb-1" style={{ color:"var(--ink)" }}>Order placed!</p>
            <p className="text-sm" style={{ color:"var(--muted)" }}>
              {mode === "full"
                ? "The seller has been notified. Payment instructions will follow by email."
                : `Your $${depositAmount.toLocaleString()} deposit reservation has been recorded. Payment instructions will follow by email.`}
            </p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ background:"var(--ink)" }}>Done</button>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[["deposit","Pay a deposit"],["full","Pay in full"]].map(([val,label]) => (
                <button key={val} type="button" onClick={() => setMode(val)}
                  className="py-3 rounded-xl text-sm font-semibold border transition-all"
                  style={{
                    background: mode === val ? "var(--ink)" : "transparent",
                    color: mode === val ? "#fff" : "var(--ink)",
                    borderColor: mode === val ? "var(--ink)" : "var(--border)",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {mode === "deposit" && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold" style={{ color:"var(--muted)" }}>Deposit percentage</label>
                  <span className="font-mono font-bold text-sm" style={{ color:"var(--ink)" }}>{depositPct}% — ${depositAmount.toLocaleString()}</span>
                </div>
                <input
                  type="range" min="10" max="100" step="5"
                  value={depositPct} onChange={(e) => setDepositPct(Number(e.target.value))}
                  className="w-full h-2 rounded-full cursor-pointer"
                  style={{ accentColor:"var(--ink)" }}
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color:"var(--muted)" }}>
                  <span>Min 10%</span><span>Full 100%</span>
                </div>
                <p className="text-xs mt-2" style={{ color:"var(--muted)" }}>
                  Balance of <strong>${(price - depositAmount).toLocaleString()}</strong> is due at vehicle handover.
                </p>
              </div>
            )}

            {/* Payment method */}
            <div className="mb-5">
              <p className="text-xs font-semibold mb-2" style={{ color:"var(--muted)" }}>Payment method</p>
              <div className="flex flex-col gap-2">
                {[["paypal","PayPal"],["wire","Bank wire / ACH"],["escrow","Escrow.com (recommended for large payments)"]].map(([val,label]) => (
                  <label key={val} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ border:`1.5px solid ${payMethod === val ? "var(--ink)" : "var(--border)"}`, background: payMethod === val ? "var(--ink-soft)" : "white" }}>
                    <input type="radio" name="paymethod" value={val} checked={payMethod === val} onChange={() => setPayMethod(val)} className="accent-[var(--ink)]" />
                    <span className="text-sm font-medium" style={{ color:"var(--ink)" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4" style={{ background:"var(--paper)" }}>
              <span className="text-sm font-semibold" style={{ color:"var(--ink)" }}>
                {mode === "full" ? "Total due now" : "Deposit due now"}
              </span>
              <span className="font-mono font-bold text-lg" style={{ color:"var(--ink)" }}>${payAmount.toLocaleString()}</span>
            </div>

            {err && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background:"var(--danger-soft)", color:"var(--danger)" }}>{err}</p>}

            <button onClick={submit} disabled={busy}
              className="w-full rounded-xl py-4 text-base font-bold text-white disabled:opacity-60"
              style={{ background:"var(--ink)", boxShadow:"0 4px 12px rgba(30,58,95,0.3)" }}>
              {busy ? "Processing…" : `Confirm — Pay $${payAmount.toLocaleString()}`}
            </button>
            <p className="text-[10px] text-center mt-3" style={{ color:"var(--muted)" }}>
              Payment instructions will be sent to your email. No card is charged until you confirm.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ListingDetailClient({ listing }) {
  const router = useRouter();
  const [tab, setTab] = useState("Overview");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState("");

  const specs = [
    { icon: Calendar, label: "Year", value: listing.year },
    { icon: Gauge, label: "Mileage", value: listing.mileage || "—" },
    { icon: Fuel, label: "Fuel", value: listing.fuel_type || "—" },
    { icon: Cog, label: "Trans", value: listing.transmission || "—" },
  ];

  const requireLogin = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.push("/login"); return null; }
    return data.user;
  };

  const toggleSave = async () => {
    const user = await requireLogin();
    if (!user) return;
    if (!saved) {
      await supabase.from("saved_listings").insert({ user_id: user.id, listing_id: listing.id });
    } else {
      await supabase.from("saved_listings").delete().eq("user_id", user.id).eq("listing_id", listing.id);
    }
    setSaved((s) => !s);
  };

  const getQuote = async () => {
    const user = await requireLogin();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("quote_requests").insert({ listing_id: listing.id, buyer_id: user.id });
    setBusy(false);
    if (error) {
      setQuoteMsg("Couldn't send quote request: " + error.message);
    } else {
      router.push(`/quote/${listing.id}`);
    }
  };

  const location = [listing.location_city, listing.location_country].filter(Boolean).join(", ");

  return (
    <>
      {showBuyModal && <BuyNowModal listing={listing} onClose={() => setShowBuyModal(false)} />}

      <div className="flex items-start justify-between mt-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: listing.seller_role === "dealer" ? "var(--ink-soft)" : "#FDF1DD", color: listing.seller_role === "dealer" ? "var(--ink)" : "var(--accent-dark)" }}>
              {listing.seller_role === "dealer" ? "Dealer" : "Private"}
            </span>
            <VerifiedBadge role={listing.seller_role} verified={listing.seller_verified} />
            <span className="text-xs" style={{ color:"var(--muted)" }}>{listing.seller_name}</span>
          </div>
          {location && (
            <div className="flex items-center gap-1 mt-1" style={{ color:"var(--muted)" }}>
              <MapPin size={12} />
              <span className="text-xs">{location}</span>
            </div>
          )}
          <p className="text-2xl font-bold mt-2" style={{ fontFamily:"'IBM Plex Mono',monospace", color:"var(--ink)" }}>${Number(listing.price).toLocaleString()}</p>
        </div>
        <button onClick={toggleSave} className="p-2.5 rounded-full ml-3" style={{ background: saved ? "var(--danger-soft)" : "var(--ink-soft)" }}>
          <Heart size={18} color={saved ? "var(--danger)" : "var(--ink)"} fill={saved ? "var(--danger)" : "none"} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-5 mt-5" style={{ borderBottom:"1px solid var(--border)" }}>
        {["Overview","Specs"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className="pb-2.5 text-sm font-semibold relative"
            style={{ color: tab === t ? "var(--ink)" : "var(--muted)" }}>
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full" style={{ background:"var(--accent)" }} />}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="mt-4">
          <p className="text-sm leading-relaxed" style={{ color:"var(--muted)" }}>{listing.description || "No description provided."}</p>
        </div>
      )}

      {tab === "Specs" && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          {specs.map((s) => (
            <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background:"white", border:"1px solid var(--border)" }}>
              <s.icon size={16} color="var(--ink)" className="mx-auto mb-1" />
              <p className="text-[9px] uppercase tracking-wide" style={{ color:"var(--muted)" }}>{s.label}</p>
              <p className="text-xs font-semibold" style={{ fontFamily:"'IBM Plex Mono',monospace" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {quoteMsg && (
        <div className="mt-4 text-xs px-3 py-2.5 rounded-lg" style={{ background:"var(--danger-soft)", color:"var(--danger)" }}>{quoteMsg}</div>
      )}

      {/* CTAs */}
      <div className="flex gap-3 mt-6">
        <button onClick={getQuote} disabled={busy}
          className="flex-1 border rounded-xl py-3 font-semibold text-sm disabled:opacity-60"
          style={{ borderColor:"var(--ink)", color:"var(--ink)" }}>
          {busy ? "Generating…" : "Get a quote"}
        </button>
        <button onClick={() => setShowBuyModal(true)}
          className="flex-1 rounded-xl py-3 font-semibold text-sm text-white"
          style={{ background:"var(--ink)", boxShadow:"0 4px 12px rgba(30,58,95,0.25)" }}>
          Buy now
        </button>
      </div>
      <p className="text-[10px] text-center mt-2" style={{ color:"var(--muted)" }}>
        "Get a quote" generates a full pricing document. "Buy now" lets you pay a 10% deposit or in full.
      </p>
    </>
  );
}
