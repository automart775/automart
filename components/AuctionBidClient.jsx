"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Clock } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getBidsForAuction } from "../lib/listings";
import Countdown from "./Countdown";

export default function AuctionBidClient({ listing }) {
  const router = useRouter();
  const [bid, setBid] = useState(Number(listing.current_bid || listing.start_price || 0));
  const [history, setHistory] = useState([]);
  const [customAmount, setCustomAmount] = useState("");
  const [pendingQuickBid, setPendingQuickBid] = useState(null);
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (listing.auction_id && !listing.auction_id.startsWith("demo")) {
      getBidsForAuction(listing.auction_id).then(setHistory);
    }
  }, [listing.auction_id]);

  const showToast = (text, tone = "success") => {
    setToast(text);
    setToastTone(tone);
    setTimeout(() => setToast(""), 3500);
  };

  const isDemo = !listing.auction_id || listing.auction_id.startsWith("demo");

  const placeBid = async (amount) => {
    if (isDemo) {
      showToast("Create a real auction from Sell a vehicle to test live bidding.", "error");
      return;
    }
    if (!amount || Number(amount) <= bid) {
      showToast(`Bid must be higher than the current $${bid.toLocaleString()}.`, "error");
      return;
    }
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { router.push("/login"); setBusy(false); return; }

    const amt = Number(amount);
    const { error: bidError } = await supabase.from("bids").insert({
      auction_id: listing.auction_id,
      bidder_id: userData.user.id,
      amount: amt,
    });
    if (bidError) { showToast("Couldn't place bid: " + bidError.message, "error"); setBusy(false); return; }

    await supabase.from("auctions").update({ current_bid: amt }).eq("id", listing.auction_id);

    setBid(amt);
    setCustomAmount("");
    setPendingQuickBid(null);
    const bids = await getBidsForAuction(listing.auction_id);
    setHistory(bids);
    showToast("Bid placed — you're the highest bidder!");
    setBusy(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mt-4">
        <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-full" style={{ background:"var(--danger-soft)", color:"var(--danger)" }}>● Live auction</span>
        <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted)" }}>
          <Clock size={12} /> {history.length} bid{history.length !== 1 ? "s" : ""} so far
        </span>
      </div>

      {/* Current bid panel */}
      <div className="mt-3 rounded-2xl p-4 flex items-center justify-between"
        style={{ background:`linear-gradient(155deg, var(--ink), var(--ink-dark))`, boxShadow:"0 4px 10px rgba(20,33,61,0.1), 0 14px 32px rgba(20,33,61,0.12)" }}>
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color:"#93A6BB" }}>Current bid</p>
          <p className="text-2xl font-bold" style={{ fontFamily:"'IBM Plex Mono',monospace", color:"var(--accent)" }}>${Number(bid).toLocaleString()}</p>
          <p className="text-[11px] mt-0.5" style={{ color:"#93A6BB" }}>{listing.mileage}</p>
        </div>
        <Countdown end={listing.ends_at} />
      </div>

      {/* Bid history */}
      {history.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold mb-2" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>Bid history</h3>
          <div className="flex flex-col gap-1.5">
            {history.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background:"white", border:"1px solid var(--border)" }}>
                <span className="text-xs font-medium" style={{ color:"var(--ink)" }}>{b.bidder_name}</span>
                <span className="text-xs font-mono" style={{ color:"var(--ink)" }}>${Number(b.amount).toLocaleString()}</span>
                <span className="text-[10px]" style={{ color:"var(--muted)" }}>{new Date(b.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: toastTone === "error" ? "var(--danger)" : "var(--success)" }}>
          {toastTone === "error" ? <X size={15} color="#fff" /> : <Check size={15} color="#fff" />}
          <span className="text-xs font-semibold text-white">{toast}</span>
        </div>
      )}

      {/* Bidding controls */}
      <div className="mt-6">
        {/* Quick-bid shortcuts with inline confirm */}
        <p className="text-xs font-semibold mb-2" style={{ color:"var(--muted)" }}>Quick bid</p>
        <div className="flex gap-2 mb-4">
          {[bid + 250, bid + 500, bid + 1000].map((amt) => (
            pendingQuickBid === amt ? (
              <div key={amt} className="flex-1 flex items-center gap-1">
                <button type="button" onClick={() => setPendingQuickBid(null)}
                  className="p-2 rounded-lg" style={{ background:"var(--border)" }}>
                  <X size={14} />
                </button>
                <button type="button" onClick={() => placeBid(amt)} disabled={busy}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                  style={{ background:"var(--success)" }}>
                  Confirm ${amt.toLocaleString()}
                </button>
              </div>
            ) : (
              <button key={amt} type="button" onClick={() => setPendingQuickBid(amt)}
                className="flex-1 text-xs font-semibold py-2 rounded-lg"
                style={{ background:"var(--ink-soft)", color:"var(--ink)" }}>
                +${(amt - bid).toLocaleString()}
              </button>
            )
          ))}
        </div>

        {/* Custom amount */}
        <p className="text-xs font-semibold mb-2" style={{ color:"var(--muted)" }}>Or enter a custom amount</p>
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            min={bid + 1}
            placeholder={`Minimum $${(bid + 1).toLocaleString()}`}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="flex-1 border rounded-xl px-3 py-2.5 text-sm"
            style={{ borderColor:"var(--border)" }}
          />
        </div>

        {/* THE big button — always the main action */}
        <button
          type="button"
          onClick={() => {
            const amount = customAmount ? Number(customAmount) : bid + 250;
            placeBid(amount);
          }}
          disabled={busy}
          className="w-full rounded-xl font-bold text-base py-4 text-white disabled:opacity-60"
          style={{ background:"var(--accent)", color:"var(--ink-dark)", boxShadow:"0 6px 16px rgba(242,169,59,0.4)" }}
        >
          {busy ? "Placing bid…" : customAmount
            ? `Place bid — $${Number(customAmount).toLocaleString()}`
            : `Place bid — $${(bid + 250).toLocaleString()}`}
        </button>
        <p className="text-[10px] text-center mt-2" style={{ color:"var(--muted)" }}>
          One tap places the bid. Quick-bid shortcuts above ask for confirmation first.
        </p>
      </div>
    </>
  );
}
