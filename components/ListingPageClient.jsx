"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ListingDetailClient from "./ListingDetailClient";

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
    </main>
  );
}

export default function ListingPageClient({ id }) {
  const [listing, setListing] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let attempts = 0;
    const MAX = 8;

    const fetchData = async () => {
      try {
        const [listingRes, auctionRes] = await Promise.all([
          supabase
            .from("listings")
            .select(`
              id, make, model, year, price, mileage, fuel_type, transmission,
              body_style, description, location_city, location_country,
              listing_type, seller_id,
              listing_images ( storage_path, sort_order ),
              profiles!seller_id ( full_name, dealer_verified, role )
            `)
            .eq("id", id)
            .single(),
          supabase
            .from("auctions")
            .select("id, current_bid, start_price, ends_at, status")
            .eq("listing_id", id)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const l = listingRes.data;
        if (!l) {
          if (attempts < MAX) { attempts++; setTimeout(fetchData, 700); }
          else setNotFound(true);
          return;
        }

        const imgs = (l.listing_images || []).sort((a, b) => a.sort_order - b.sort_order);
        const seller = l.profiles
          ? Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
          : {};
        const auction = auctionRes.data;

        setListing({
          ...l,
          image_url: getPublicUrl(imgs[0]?.storage_path) || FALLBACK,
          all_images: imgs.map(i => getPublicUrl(i.storage_path)).filter(Boolean),
          seller_name: seller?.full_name || "Seller",
          seller_verified: seller?.dealer_verified || false,
          seller_role: seller?.role || "buyer",
          auction_id: auction?.id || null,
          current_bid: auction?.current_bid || null,
          start_price: auction?.start_price || null,
          ends_at: auction?.ends_at || null,
        });
      } catch {
        if (!cancelled && attempts < MAX) { attempts++; setTimeout(fetchData, 700); }
        else if (!cancelled) setNotFound(true);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  if (notFound) return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 600 }}>
      <div className="text-4xl mb-3">🔍</div>
      <p className="font-semibold" style={{ color: "var(--ink)" }}>Listing not found</p>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>It may have been removed or the link is incorrect.</p>
    </main>
  );

  if (!listing) return <Skeleton />;

  return (
    <main className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>
      <div className="w-full h-64 rounded-2xl overflow-hidden mt-4" style={{ background: "var(--paper)" }}>
        <img src={listing.image_url} alt={`${listing.year} ${listing.make} ${listing.model}`}
          className="w-full h-full object-cover" />
      </div>
      <h1 className="text-xl font-bold mt-4" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
        {listing.year} {listing.make} {listing.model}
      </h1>
      <ListingDetailClient listing={listing} />
    </main>
  );
}
