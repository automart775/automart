"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

export default function QuotePage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params?.id;   // ← correct: reads the [id] segment as UUID

  const [listing, setListing] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [offerPrice, setOfferPrice] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!listingId || listingId === "undefined") {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const load = async () => {
      const [authRes, listingRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("listings")
          .select("id, make, model, year, price, listing_type, listing_images(storage_path, sort_order)")
          .eq("id", listingId)
          .single(),
      ]);

      if (authRes.data?.user) setUser(authRes.data.user);
      if (!listingRes.data || listingRes.error) { setNotFound(true); }
      else setListing(listingRes.data);
      setLoading(false);
    };
    load();
  }, [listingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }
    setError("");
    setSubmitting(true);

    const { error: e } = await supabase.rpc("create_quote_request", {
      p_listing_id: listingId,
      p_offer_price: offerPrice ? parseFloat(offerPrice) : null,
      p_message: message.trim(),
    });

    setSubmitting(false);
    if (e) {
      setError("Couldn't send quote request: " + e.message);
    } else {
      setSubmitted(true);
    }
  };

  const getThumb = () => {
    if (!listing?.listing_images?.length) return null;
    const sorted = [...listing.listing_images].sort((a, b) => a.sort_order - b.sort_order);
    try {
      const { data } = supabase.storage.from("listing-images").getPublicUrl(sorted[0].storage_path);
      return data?.publicUrl || null;
    } catch { return null; }
  };

  if (loading) return <main className="p-8 text-sm" style={{ color: "var(--muted)" }}>Loading…</main>;

  if (notFound) return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 420 }}>
      <p className="font-semibold" style={{ color: "var(--ink)" }}>Listing not found</p>
      <Link href="/search" className="text-sm mt-2 block" style={{ color: "var(--muted)" }}>Browse listings →</Link>
    </main>
  );

  if (submitted) return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 420 }}>
      <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "#2F9E44" }} />
      <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
        Quote request sent!
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        The seller will review your request and get back to you.
      </p>
      <Link href={`/listing/${listingId}`}
        className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-white"
        style={{ background: "var(--ink)" }}>
        Back to listing
      </Link>
    </main>
  );

  const thumb = getThumb();

  return (
    <main className="mx-auto px-4 py-8" style={{ maxWidth: 480 }}>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
        Get a quote
      </h1>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
        Send the seller your offer and any questions.
      </p>

      {/* Listing preview */}
      {listing && (
        <div className="flex items-center gap-3 rounded-2xl p-3 mb-6"
          style={{ background: "var(--paper)" }}>
          {thumb && (
            <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img src={thumb} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "'Space Grotesk',sans-serif" }}>
              {listing.year} {listing.make} {listing.model}
            </div>
            {listing.price && (
              <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                Listed at ${listing.price.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {!user && (
        <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: "var(--paper)", color: "var(--muted)" }}>
          <Link href="/login" className="font-semibold underline" style={{ color: "var(--ink)" }}>Log in</Link> to send a quote request.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>
            Your offer price ($) <span style={{ color: "var(--muted)", fontWeight: 400 }}>— optional</span>
          </label>
          <input
            className="w-full border rounded-xl px-3 py-2.5 text-sm"
            style={{ borderColor: "var(--border)" }}
            type="number" step="100" min="0"
            placeholder={listing?.price ? String(listing.price) : "Enter your offer"}
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>
            Message to seller *
          </label>
          <textarea
            className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none"
            style={{ borderColor: "var(--border)" }}
            rows={5}
            placeholder="Tell the seller about yourself, any questions about the vehicle, preferred meeting location, etc."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="text-sm px-3 py-2.5 rounded-xl" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !user}
          className="w-full rounded-2xl py-4 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: "var(--ink)" }}>
          {submitting ? "Sending…" : "Send quote request"}
        </button>
      </form>
    </main>
  );
}
