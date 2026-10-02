"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AuctionBidClient from "./AuctionBidClient";

const FALLBACK = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800";

function getPublicUrl(path) {
  if (!path) return null;
  try {
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch { return null; }
}

export default function AuctionPageClient({ id }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let tries = 0;

    const fetchAll = async () => {
      try {
        // Query 1: listing only — no joins
        const { data: listing, error: le } = await supabase
          .from("listings")
          .select("id, make, model, year, mileage, fuel_type, transmission, body_style, description, location_city, location_country")
          .eq("id", id)
          .single();

        // Query 2: images
        const { data: images } = await supabase
          .from("listing_images")
          .select("storage_path, sort_order")
          .eq("listing_id", id)
          .order("sort_order");

        // Query 3: auction — no joins
        const { data: auction, error: ae } = await supabase
          .from("auctions")
          .select("id, start_price, current_bid, ends_at, status, bid_increment")
          .eq("listing_id", id)
          .maybeSingle();

        if (cancelled) return;

        if (listing && auction) {
          const imgs = images || [];
          const imageUrl = getPublicUrl(imgs[0]?.storage_path) || FALLBACK;
          setData({ ...listing, imageUrl, auction_id: auction.id, start_price: auction.start_price, current_bid: auction.current_bid, ends_at: auction.ends_at, auction_status: auction.status, bid_increment: auction.bid_increment || 100 });
        } else {
          tries++;
          if (tries < 10) setTimeout(fetchAll, 800);
          else setNotFound(true);
        }
      } catch (err) {
        if (!cancelled) {
          tries++;
          if (tries < 10) setTimeout(fetchAll, 800);
          else setNotFound(true);
        }
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [id]);

  if (notFound) return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 600 }}>
      <div className="text-4xl mb-3">🔍</div>
      <p className="font-semibold" style={{ color: "var(--ink)" }}>Auction not found</p>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>It may have ended or the link is incorrect.</p>
    </main>
  );

  if (!data) return (
    <main className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>
      <div className="w-full h-64 rounded-2xl mt-4 animate-pulse" style={{ background: "var(--paper)" }} />
      <div className="mt-4 h-6 w-52 rounded-lg animate-pulse" style={{ background: "var(--paper)" }} />
      <p className="text-xs text-center mt-4" style={{ color: "var(--muted)" }}>Loading auction…</p>
    </main>
  );

  return (
    <main className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>
      <div className="w-full h-64 rounded-2xl overflow-hidden mt-4" style={{ background: "var(--paper)" }}>
        <img src={data.imageUrl} alt={`${data.year} ${data.make} ${data.model}`} className="w-full h-full object-cover" />
      </div>
      <h1 className="text-xl font-bold mt-4" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
        {data.year} {data.make} {data.model}
      </h1>
      <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>
        {data.mileage && <span>{data.mileage}</span>}
        {data.fuel_type && <span> · {data.fuel_type}</span>}
        {data.location_city && <span> · {data.location_city}</span>}
      </div>
      <AuctionBidClient listing={data} />
    </main>
  );
}
