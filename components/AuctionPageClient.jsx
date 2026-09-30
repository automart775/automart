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

function Skeleton() {
  return (
    <main className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>
      <div className="w-full h-64 rounded-2xl mt-4 animate-pulse" style={{ background: "var(--paper)" }} />
      <div className="mt-4 h-6 w-52 rounded-lg animate-pulse" style={{ background: "var(--paper)" }} />
      <div className="mt-2 h-4 w-32 rounded-lg animate-pulse" style={{ background: "var(--paper)" }} />
      <div className="mt-6 h-28 rounded-2xl animate-pulse" style={{ background: "var(--paper)" }} />
      <p className="text-xs text-center mt-4" style={{ color: "var(--muted)" }}>Setting up auction…</p>
    </main>
  );
}

export default function AuctionPageClient({ id }) {
  const [listing, setListing] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let attempts = 0;
    const MAX = 8;        // 8 × 700ms = up to ~5.6 seconds of retries
    const DELAY = 700;

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(`
            id, make, model, year, mileage, fuel_type, transmission,
            body_style, description, location_city, location_country,
            listing_images ( storage_path, sort_order ),
            profiles!seller_id ( full_name, dealer_verified, role ),
            auctions ( id, start_price, current_bid, ends_at, status, bid_increment )
          `)
          .eq("id", id)
          .single();

        if (cancelled) return;

        // Normalize auctions — Supabase may return object or array
        const aArr = data?.auctions
          ? Array.isArray(data.auctions) ? data.auctions : [data.auctions]
          : [];
        const auction = aArr[0];

        if (!error && data && auction) {
          // ✅ Got everything — render
          const imgs = (data.listing_images || []).sort((a, b) => a.sort_order - b.sort_order);
          const seller = data.profiles
            ? Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
            : {};

          setListing({
            id: data.id,
            make: data.make,
            model: data.model,
            year: data.year,
            mileage: data.mileage,
            fuel_type: data.fuel_type,
            transmission: data.transmission,
            body_style: data.body_style,
            description: data.description,
            location_city: data.location_city,
            location_country: data.location_country,
            imageUrl: getPublicUrl(imgs[0]?.storage_path) || FALLBACK,
            allImages: imgs.map(i => getPublicUrl(i.storage_path)).filter(Boolean),
            seller_name: seller?.full_name || "Seller",
            seller_verified: seller?.dealer_verified || false,
            seller_role: seller?.role || "buyer",
            auction_id: auction.id,
            start_price: auction.start_price,
            current_bid: auction.current_bid,
            ends_at: auction.ends_at,
            auction_status: auction.status,
            bid_increment: auction.bid_increment || 100,
          });
        } else if (attempts < MAX) {
          // ⏳ Auction row not committed yet — retry
          attempts++;
          setTimeout(fetchData, DELAY);
        } else {
          // ❌ Gave up after all retries
          setNotFound(true);
        }
      } catch {
        if (!cancelled && attempts < MAX) {
          attempts++;
          setTimeout(fetchData, DELAY);
        } else if (!cancelled) {
          setNotFound(true);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  if (notFound) return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 600 }}>
      <div className="text-4xl mb-3">🔍</div>
      <p className="font-semibold" style={{ color: "var(--ink)" }}>Auction not found</p>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
        This auction may have ended or the link is incorrect.
      </p>
    </main>
  );

  if (!listing) return <Skeleton />;

  return (
    <main className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>
      {/* Hero image */}
      <div className="w-full h-64 rounded-2xl overflow-hidden mt-4" style={{ background: "var(--paper)" }}>
        <img
          src={listing.imageUrl}
          alt={`${listing.year} ${listing.make} ${listing.model}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title block */}
      <div className="mt-4">
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
          {listing.year} {listing.make} {listing.model}
        </h1>
        <div className="flex items-center gap-3 mt-1 flex-wrap text-sm" style={{ color: "var(--muted)" }}>
          {listing.mileage && <span>{listing.mileage}</span>}
          {listing.fuel_type && <span>· {listing.fuel_type}</span>}
          {listing.transmission && <span>· {listing.transmission}</span>}
          {listing.location_city && (
            <span>· {listing.location_city}{listing.location_country ? `, ${listing.location_country}` : ""}</span>
          )}
        </div>
      </div>

      {/* Bid interface */}
      <AuctionBidClient listing={listing} />
    </main>
  );
}
