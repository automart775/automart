"use client";
import { useState, useEffect } from "react";
import { Clock, TrendingUp, AlertCircle, Users } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const QUICK_INCREMENTS = [250, 500, 1000];

function useCountdown(endsAt) {
  const [label, setLabel] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) { setLabel("Ended"); setUrgent(false); return; }
      setUrgent(diff < 3600000);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setLabel(`${d}d ${h}h ${m}m`);
      else if (h > 0) setLabel(`${h}h ${m}m ${s}s`);
      else setLabel(`${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  return { label, urgent };
}

export default function AuctionBidClient({ listing: initial }) {
  const [currentBid, setCurrentBid] = useState(initial.current_bid || initial.start_price || 0);
  const [bidCount, setBidCount] = useState(0);
  const [user, setUser] = useState(null);

  // Bid mode: "quick" or "custom"
  const [mode, setMode] = useState("quick");
  const [quickIncrement, setQuickIncrement] = useState(500);
  const [customAmount, setCustomAmount] = useState("");

  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { label: timeLeft, urgent } = useCountdown(initial.ends_at);
  const isEnded = timeLeft === "Ended";

  const myBid = mode === "quick"
    ? currentBid + quickIncrement
    : parseFloat(customAmount) || 0;

  const bidIsValid = mode === "custom"
    ? myBid > currentBid
    : true;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });

    // Fetch initial bid count
    if (initial.auction_id) {
      supabase
        .from("bids")
        .select("id", { count: "exact", head: true })
        .eq("auction_id", initial.auction_id)
        .then(({ count }) => { if (count != null) setBidCount(count); });
    }
  }, [initial.auction_id]);

  // Realtime subscription — live bid updates
  useEffect(() => {
    if (!initial.auction_id) return;
    const channel = supabase
      .channel(`auction-${initial.auction_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${initial.auction_id}`,
        },
        (payload) => {
          setCurrentBid(payload.new.current_bid);
          setBidCount((n) => n + 1);
          setSuccess("");
          setConfirm(false);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [initial.auction_id]);

  const handleBidClick = () => {
    if (!user) { window.location.href = "/login"; return; }
    if (mode === "custom" && !bidIsValid) {
      setError(`Custom bid must be above current bid of $${currentBid.toLocaleString()}.`);
      return;
    }
    setError("");
    setConfirm(true);
  };

  const placeBid = async () => {
    setSubmitting(true);
    setError("");
    const { error: e } = await supabase.rpc("place_bid", {
      p_auction_id: initial.auction_id,
      p_amount: myBid,
    });
    setSubmitting(false);
    setConfirm(false);
    if (e) {
      setError(e.message || "Bid failed — the price may have changed. Try again.");
    } else {
      setSuccess(`Bid of $${myBid.toLocaleString()} placed!`);
      setCustomAmount("");
      setMode("quick");
    }
  };

  return (
    <div className="mt-5 pb-8">

      {/* Status bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {!isEnded ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: "#D6472F" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
            LIVE
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: "var(--paper)", color: "var(--muted)" }}>
            ENDED
          </span>
        )}
        <span className="flex items-center gap-1 text-sm font-semibold"
          style={{ color: urgent ? "#F2A93B" : "var(--muted)", fontFamily: "'IBM Plex Mono',monospace" }}>
          <Clock size={13} />{timeLeft || "—"}
        </span>
        {bidCount > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
            <Users size={12} />{bidCount} {bidCount === 1 ? "bid" : "bids"}
          </span>
        )}
      </div>

      {/* Current bid card */}
      <div className="mt-4 rounded-2xl p-5 text-center" style={{ background: "var(--paper)" }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
          {isEnded ? "Final price" : "Current bid"}
        </div>
        <div className="text-4xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
          ${currentBid.toLocaleString()}
        </div>
        <div className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
          Starting bid: ${(initial.start_price || 0).toLocaleString()}
        </div>
      </div>

      {!isEnded && (
        <>
          {/* Mode toggle */}
          <div className="flex gap-2 mt-5">
            {[["quick", "Quick bid"], ["custom", "Custom amount"]].map(([m, label]) => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setConfirm(false); setError(""); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border"
                style={{
                  background: mode === m ? "var(--ink)" : "white",
                  color: mode === m ? "white" : "var(--muted)",
                  borderColor: mode === m ? "var(--ink)" : "var(--border)",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Quick bid */}
          {mode === "quick" && (
            <div className="mt-4">
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>
                Add to current bid
              </div>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_INCREMENTS.map((inc) => (
                  <button key={inc} type="button"
                    onClick={() => { setQuickIncrement(inc); setConfirm(false); setError(""); }}
                    className="rounded-xl py-3 text-sm font-bold border"
                    style={{
                      background: quickIncrement === inc ? "var(--accent)" : "white",
                      color: quickIncrement === inc ? "white" : "var(--ink)",
                      borderColor: quickIncrement === inc ? "var(--accent)" : "var(--border)",
                    }}>
                    +${inc >= 1000 ? `${inc / 1000}k` : inc}
                  </button>
                ))}
              </div>
              {/* Your bid preview */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3 mt-3"
                style={{ background: "var(--paper)" }}>
                <span className="text-sm" style={{ color: "var(--muted)" }}>Your bid</span>
                <span className="text-xl font-bold"
                  style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
                  ${myBid.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Custom amount */}
          {mode === "custom" && (
            <div className="mt-4">
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted)" }}>
                Enter your bid (must be above ${currentBid.toLocaleString()})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                  style={{ color: "var(--muted)" }}>$</span>
                <input
                  type="number"
                  min={currentBid + 1}
                  placeholder={(currentBid + 500).toString()}
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setConfirm(false); setError(""); }}
                  className="w-full border rounded-xl pl-7 pr-4 py-3 text-sm font-semibold"
                  style={{
                    borderColor: "var(--border)",
                    fontFamily: "'Space Grotesk',sans-serif",
                    color: "var(--ink)",
                  }}
                />
              </div>
              {customAmount && parseFloat(customAmount) > currentBid && (
                <div className="flex items-center justify-between rounded-xl px-4 py-3 mt-2"
                  style={{ background: "var(--paper)" }}>
                  <span className="text-sm" style={{ color: "var(--muted)" }}>Your bid</span>
                  <span className="text-xl font-bold"
                    style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
                    ${parseFloat(customAmount).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error / success */}
          {error && (
            <div className="flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl mt-3"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl mt-3"
              style={{ background: "#ECFDF5", color: "#2F9E44" }}>
              <TrendingUp size={14} />
              <span>{success}</span>
            </div>
          )}

          {/* CTA */}
          <div className="mt-4">
            {!confirm ? (
              <button
                onClick={handleBidClick}
                disabled={mode === "custom" && (!customAmount || !bidIsValid)}
                className="w-full rounded-2xl py-4 text-sm font-bold text-white disabled:opacity-40"
                style={{ background: "var(--accent)" }}>
                {user
                  ? `Place bid — $${myBid > 0 ? myBid.toLocaleString() : "…"}`
                  : "Log in to bid"}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-center font-medium" style={{ color: "var(--muted)" }}>
                  Confirm your bid of{" "}
                  <strong style={{ color: "var(--ink)" }}>${myBid.toLocaleString()}</strong>?
                  This is binding.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setConfirm(false)}
                    className="rounded-2xl py-3.5 text-sm font-semibold border"
                    style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
                    Cancel
                  </button>
                  <button onClick={placeBid} disabled={submitting}
                    className="rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
                    style={{ background: "var(--accent)" }}>
                    {submitting ? "Placing…" : "Confirm bid"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {isEnded && (
        <div className="mt-5 text-center rounded-2xl p-6" style={{ background: "var(--paper)" }}>
          <div className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
            Auction closed
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Final price: <strong>${currentBid.toLocaleString()}</strong>
            {bidCount > 0 && ` · ${bidCount} bids`}
          </div>
        </div>
      )}
    </div>
  );
}
