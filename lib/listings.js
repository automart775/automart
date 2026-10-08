import { supabase } from "./supabaseClient";

function getPublicImageUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data?.publicUrl || null;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200";

function normalize(row, images, auction, seller) {
  const sorted = (images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    seller_id: row.seller_id,
    make: row.make,
    model: row.model,
    year: row.year,
    price: row.price,
    mileage: row.mileage,
    fuel_type: row.fuel_type,
    transmission: row.transmission,
    body_style: row.body_style,
    description: row.description,
    listing_type: row.listing_type,
    image_url: getPublicImageUrl(sorted[0]?.storage_path) || FALLBACK_IMAGE,
    auction_id: auction?.id,
    current_bid: auction?.current_bid,
    start_price: auction?.start_price,
    ends_at: auction?.ends_at,
    seller_name: seller?.full_name || "AutoMarket seller",
    seller_role: seller?.role || "buyer",
    seller_verified: !!seller?.dealer_verified,
    location_city: row.location_city || "",
    location_country: row.location_country || "",
  };
}

// Flat queries instead of one embedded join — an embedded join fails
// silently (no FK relationship declared for PostgREST to use), which is
// what kept turning real listings into "not found".
async function hydrate(rows) {
  const ids = rows.map((r) => r.id);
  const sellerIds = [...new Set(rows.map((r) => r.seller_id).filter(Boolean))];

  const [imgRes, aucRes, profRes] = await Promise.all([
    supabase.from("listing_images").select("listing_id, storage_path, sort_order").in("listing_id", ids),
    supabase.from("auctions").select("id, listing_id, current_bid, start_price, ends_at, status").in("listing_id", ids),
    sellerIds.length
      ? supabase.from("profiles").select("id, full_name, role, dealer_verified").in("id", sellerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const imgs = imgRes.data || [];
  const aucs = aucRes.data || [];
  const profs = profRes.data || [];

  return rows.map((row) =>
    normalize(
      row,
      imgs.filter((i) => i.listing_id === row.id),
      aucs.find((a) => a.listing_id === row.id),
      profs.find((p) => p.id === row.seller_id)
    )
  );
}

// LIVE DATA ONLY. No demo fallback — a missing or broken listing now
// surfaces the real database error instead of quietly showing a fake car
// that hides the actual bug.
export async function getActiveListings() {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) return { listings: [], isDemo: false, error: error.message };
    return { listings: data ? await hydrate(data) : [], isDemo: false, error: "" };
  } catch (e) {
    return { listings: [], isDemo: false, error: String(e?.message || e) };
  }
}

export async function getLiveAuctions() {
  const { listings, isDemo, error } = await getActiveListings();
  const auctions = listings.filter((l) => l.listing_type === "auction");
  return { auctions, isDemo, error };
}

export async function getListingByIdReal(id) {
  try {
    const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
    if (error) return { listing: null, isDemo: false, error: error.message };
    if (!data) return { listing: null, isDemo: false, error: "" };
    const [listing] = await hydrate([data]);
    return { listing, isDemo: false, error: "" };
  } catch (e) {
    return { listing: null, isDemo: false, error: String(e?.message || e) };
  }
}

export async function getBidsForAuction(auctionId) {
  if (!auctionId) return [];
  const { data: bids, error } = await supabase
    .from("bids")
    .select("id, amount, created_at, bidder_id")
    .eq("auction_id", auctionId)
    .order("amount", { ascending: false });
  if (error || !bids) return [];

  const ids = [...new Set(bids.map((b) => b.bidder_id).filter(Boolean))];
  const { data: profs } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };

  return bids.map((b) => ({
    id: b.id,
    amount: b.amount,
    created_at: b.created_at,
    bidder_name: (profs || []).find((p) => p.id === b.bidder_id)?.full_name || "Bidder",
  }));
}
