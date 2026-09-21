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

  return {
    id: row.id,
    make: row.make,
    model: row.model,
    year: row.year,
    price: row.price,
    mileage: row.mileage,
    fuel_type: row.fuel_type,
    description: row.description,
    listing_type: row.listing_type,
    image_url: getPublicImageUrl(images[0]?.storage_path) || FALLBACK_IMAGE,
    current_bid: auction?.current_bid,
    start_price: auction?.start_price,
    ends_at: auction?.ends_at,
  };
}

// Used on the home page. Falls back to demo data if Supabase isn't
// configured yet, or if the listings table is still empty — so the site
// never shows a broken/blank page while you're setting things up.
export async function getActiveListings() {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_images(storage_path, sort_order), auctions(current_bid, start_price, ends_at, status)")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) throw new Error("no live data yet");
    return { listings: data.map(normalize), isDemo: false };
  } catch {
    return { listings: DEMO_LISTINGS, isDemo: true };
  }
}

// Used on listing/auction detail pages, including generateMetadata
// (so share previews reflect real data once it exists).
export async function getListingByIdReal(id) {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_images(storage_path, sort_order), auctions(current_bid, start_price, ends_at, status)")
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("not found in database");
    return { listing: normalize(data), isDemo: false };
  } catch {
    return { listing: getDemoListingById(id), isDemo: true };
  }
}
