import { supabase } from "./supabaseClient";
import { DEMO_LISTINGS, getListingById as getDemoListingById } from "./demoData";

// Builds a public URL for a photo stored in the `listing-images` bucket
function getPublicImageUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data?.publicUrl || null;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200";

function normalize(row) {
  const images = (row.listing_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const auction = Array.isArray(row.auctions) ? row.auctions[0] : row.auctions;
  const seller = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

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
    image_url: getPublicImageUrl(images[0]?.storage_path) || FALLBACK_IMAGE,
    auction_id: auction?.id,
    current_bid: auction?.current_bid,
    start_price: auction?.start_price,
    ends_at: auction?.ends_at,
    seller_name: seller?.full_name || "AutoMarket seller",
    seller_role: seller?.role || "buyer",
    seller_verified: !!seller?.dealer_verified,
  };
}

const SELECT_FIELDS = "*, listing_images(storage_path, sort_order), auctions(id, current_bid, start_price, ends_at, status), profiles(full_name, role, dealer_verified)";

// Used on the home page. Falls back to demo data if Supabase isn't
// configured yet, or if the listings table is still empty — so the site
// never shows a broken/blank page while you're setting things up.
export async function getActiveListings() {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select(SELECT_FIELDS)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) throw new Error("no live data yet");
    return { listings: data.map(normalize), isDemo: false };
  } catch {
    return { listings: DEMO_LISTINGS, isDemo: true };
  }
}

// Used for the "Live Auctions" section on the home page.
export async function getLiveAuctions() {
  const { listings, isDemo } = await getActiveListings();
  const auctions = listings.filter((l) => l.listing_type === "auction");
  return { auctions, isDemo };
}

// Used on listing/auction detail pages, including generateMetadata
// (so share previews reflect real data once it exists).
export async function getListingByIdReal(id) {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select(SELECT_FIELDS)
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("not found in database");
    return { listing: normalize(data), isDemo: false };
  } catch {
    return { listing: getDemoListingById(id), isDemo: true };
  }
}

// Bid history for an auction, highest first, with the bidder's name attached.
export async function getBidsForAuction(auctionId) {
  if (!auctionId) return [];
  const { data, error } = await supabase
    .from("bids")
    .select("id, amount, created_at, profiles(full_name)")
    .eq("auction_id", auctionId)
    .order("amount", { ascending: false });
  if (error || !data) return [];
  return data.map((b) => ({
    id: b.id,
    amount: b.amount,
    created_at: b.created_at,
    bidder_name: (Array.isArray(b.profiles) ? b.profiles[0] : b.profiles)?.full_name || "Bidder",
  }));
}
