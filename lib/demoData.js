// Temporary in-memory data so pages render before Supabase is connected.
// Once NEXT_PUBLIC_SUPABASE_URL is set, swap these for real queries
// (see the commented example in app/listing/[id]/page.jsx).
export const DEMO_LISTINGS = [
  {
    id: "1",
    make: "Toyota",
    model: "Camry SE",
    year: 2022,
    price: 24500,
    mileage: "18,400 mi",
    fuel_type: "Hybrid",
    listing_type: "fixed_price",
    description: "One owner, clean title, no accidents reported.",
    image_url: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=1200",
  },
  {
    id: "2",
    make: "BMW",
    model: "330i M Sport",
    year: 2019,
    mileage: "32,000 mi",
    fuel_type: "Gas",
    listing_type: "auction",
    start_price: 15000,
    current_bid: 18400,
    ends_at: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    description: "Well-maintained, recent service records available.",
    image_url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200",
  },
];

export function getListingById(id) {
  return DEMO_LISTINGS.find((l) => l.id === id);
}
