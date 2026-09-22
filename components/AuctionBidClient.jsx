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
  const [pendingBid, setPendingBid] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (listing.auction_id) getBidsForAuction(listing.auction_id).then(setHistory);
  }, [listing.auction_id]);

  const showToast = (text, tone = "success") => {
    setToast(text);
    setToastTone(tone);
    setTimeout(() => setToast(""), 3500);
  };

  const startBid = (amount) => {
    if (!listing.auction_id) {
      showToast("This is demo data — create a real auction from the Sell page to test bidding.", "error");
      return;
    }
    if (!amount || amount <= bid) {
      showToast("Enter an amount higher than the current bid.", "error");
      return;
    }
    setPendingBid(amount);
  };

  const confirmBid = async () => {
    if (!pendingBid) return;
    setBusy(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      router.push("/login");
      setBusy(false);
      return;
    }

    // Remember who was leading before this bid, to notify them they've been outbid
    const previousLeader = history[0];

    const { error: bidError } = await supabase.from("bids").insert({
      auction_id: listing.auction_id,
      bidder_id: userData.user.id,
      amount: pendingBid,
    });

    if (bidError) {
      showToast(`Couldn't place bid: ${bidError.message}`, "error");
      setPendingBid(null);
      setBusy(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("auctions")
      .update({ current_bid: pendingBid })
      .eq("id", listing.auction_id);

    if (updateError) {
      showToast(`Bid recorded, but couldn't update the price shown: ${updateError.message}`, "error");
    } else {
      showToast("Bid placed — you're the highest bidder!");
    }

    // Log an outbid notification for whoever was leading before (foundation
    // for email alerts once a mail provider like Resend is connected —
    // for now this just records that they need to be told).
    if (previousLeader && previousLeader.bidder_name) {
      await supabase.from("email_notifications").insert({
        user_id: userData.user.id, // placeholder: ideally the previous bidder's id, once bids table exposes it directly to the client
        notification_type: "bid_outbid",
        related_id: listing.id,
      }).select().maybeSingle();
    }

    setBid(pendingBid);
    const bids = await getBidsForAuction(listing.auction_id);
    setHistory(bids);
    setPendingBid(null);
    setCustomAmount("");
    setBusy(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mt-4">
        <span className="text-[10px] font-mono uppercase bg-red-50 text-red-600 px-2 py-1 rounded-full">● Live auction</span>
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
          <Clock size={12} /> {history.length} bids so far
        </span>
      </div>

      <div
        className="mt-3 rounded-2xl p-4 flex items-center justify-between"
        style={{ background: "linear-gradient(155deg, var(--ink), var(--ink-dark))", boxShadow: "0 4px 10px rgba(20,33,61,0.06), 0 14px 32px rgba(20,33,61,0.09)" }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "#93A6BB" }}>Current bid</p>
          <p className="text-2xl font-bold font-mono" style={{ color: "var(--accent)" }}>${Number(bid).toLocaleString()}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#93A6BB" }}>{listing.mileage}</p>
        </div>
        <Countdown end={listing.ends_at} />
      </div>

      <div className="mt-5">
        <h3 className="font-display text-sm font-bold mb-2">Bid history</h3>
        <div className="flex flex-col gap-1.5">
          {history.length === 0 && <p className="text-xs" style={{ color: "var(--muted)" }}>No bids yet — be the first.</p>}
          {history.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white" style={{ boxShadow: "0 1px 2px rgba(20,33,61,0.04), 0 6px 16px rgba(20,33,61,0.05)" }}>
              <span className="text-xs font-medium">{b.bidder_name}</span>
              <span className="text-xs font-mono" style={{ color: "var(--ink)" }}>${Number(b.amount).toLocaleString()}</span>
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>{new Date(b.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div
          className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: toastTone === "error" ? "var(--danger)" : "var(--success)" }}
        >
          {toastTone === "error" ? <X size={15} color="#fff" /> : <Check size={15} color="#fff" />}
          <span className="text-xs font-semibold text-white">{toast}</span>
        </div>
      )}

      <div className="mt-6">
        {pendingBid ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 text-center text-sm font-semibold py-3 rounded-xl font-mono" style={{ background: "#EAF0F6", color: "var(--ink)" }}>
              Confirm ${pendingBid.toLocaleString()}?
            </div>
            <button type="button" onClick={() => setPendingBid(null)} className="p-3 rounded-xl" style={{ background: "#EAF0F6" }}>
              <X size={16} color="var(--ink)" />
            </button>
            <button type="button" onClick={confirmBid} disabled={busy} className="p-3 rounded-xl active:scale-95 transition-all disabled:opacity-60" style={{ background: "var(--accent)" }}>
              <Check size={16} color="var(--ink-dark)" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              {[bid + 250, bid + 500, bid + 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => startBid(amt)}
                  className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg active:scale-95 transition-all font-mono"
                  style={{ background: "#EAF0F6", color: "var(--ink)" }}
                >
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-2">
              <input
                type="number"
                min={bid + 1}
                placeholder={`Custom amount (min $${(bid + 1).toLocaleString()})`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                style={{ borderColor: "var(--border)" }}
              />
              <button
                type="button"
                onClick={() => startBid(Number(customAmount))}
                className="rounded-lg px-4 text-xs font-semibold"
                style={{ background: "#EAF0F6", color: "var(--ink)" }}
              >
                Use amount
              </button>
            </div>

            <button
              type="button"
              onClick={() => startBid(bid + 250)}
              className="w-full rounded-xl font-semibold text-sm py-3"
              style={{ background: "var(--accent)", color: "var(--ink-dark)" }}
            >
              Quick bid +$250
            </button>
          </>
        )}
      </div>
    </>
  );
}
