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
      <div className="mt-2 h-4 w-36 rounded-lg animate-pulse" style={{ background: "var(--paper)" }} />
      <div className="mt-6 h-32 rounded-2xl animate-pulse" style={{ background: "var(--paper)" }} />
      <p className="text-xs text-center mt-3" style={{ color: "var(--muted)" }}>Loading auction…</p>
    </main>
  );
}

export default function AuctionPageClient({ id }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let attempts = 0;
    const MAX = 10;     // 10 × 800ms = up to 8 seconds
    const DELAY = 800;

    const fetchAll = async () => {
      try {
        // TWO SEPARATE QUERIES — avoids FK join failures from RLS
        const [listingRes, auctionRes] = await Promise.all([
          supabase
            .from("listings")
            .select(`
              id, make, model, year, mileage, fuel_type, transmission,
              body_style, description, location_city, location_country,
              listing_images ( storage_path, sort_order ),
              profiles!seller_id ( full_name, dealer_verified, role )
            `)
            .eq("id", id)
            .single(),
          supabase
            .from("auctions")
            .select("id, start_price, current_bid, ends_at, status, bid_increment")
            .eq("listing_id", id)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const listing = listingRes.data;
        const auction = auctionRes.data;

        if (listing && auction) {
          const imgs = (listing.listing_images || []).sort((a, b) => a.sort_order - b.sort_order);
          const seller = listing.profiles
            ? Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles
            : {};

          setData({
            id: listing.id,
            make: listing.make,
            model: listing.model,
            year: listing.year,
            mileage: listing.mileage,
            fuel_type: listing.fuel_type,
            transmission: listing.transmission,
            body_style: listing.body_style,
            description: listing.description,
            location_city: listing.location_city,
            location_country: listing.location_country,
            imageUrl: getPublicUrl(imgs[0]?.storage_path) || FALLBACK,
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
          attempts++;
          setTimeout(fetchAll, DELAY);
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled && attempts < MAX) {
          attempts++;
          setTimeout(fetchAll, DELAY);
        } else if (!cancelled) {
          setNotFound(true);
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
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
        It may have ended or the link is incorrect.
      </p>
    </main>
  );

  if (!data) return <Skeleton />;

  return (
    <main className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>
      <div className="w-full h-64 rounded-2xl overflow-hidden mt-4" style={{ background: "var(--paper)" }}>
        <img src={data.imageUrl} alt={`${data.year} ${data.make} ${data.model}`}
          className="w-full h-full object-cover" />
      </div>

      <div className="mt-4">
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
          {data.year} {data.make} {data.model}
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap text-sm" style={{ color: "var(--muted)" }}>
          {data.mileage && <span>{data.mileage}</span>}
          {data.fuel_type && <span>· {data.fuel_type}</span>}
          {data.transmission && <span>· {data.transmission}</span>}
          {data.location_city && (
            <span>· {data.location_city}{data.location_country ? `, ${data.location_country}` : ""}</span>
          )}
        </div>
      </div>

      <AuctionBidClient listing={data} />
    </main>
  );
}
