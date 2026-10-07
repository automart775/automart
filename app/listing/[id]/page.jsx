import { getListingByIdReal } from "../../../lib/listings";
import ListingDetailClient from "../../../components/ListingDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { listing } = await getListingByIdReal(params.id);
  if (!listing) return { title: "Listing not found — AutoMarket" };
  return {
    title: `${listing.year} ${listing.make} ${listing.model} — AutoMarket`,
    description: listing.description || "",
  };
}

export default async function ListingPage({ params }) {
  const { listing, isDemo, error } = await getListingByIdReal(params.id);

  if (!listing) {
    return (
      <main className="p-10">
        <p>Listing not found.</p>
        {error && <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Database said: {error}</p>}
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 pb-16">
      {isDemo && (
        <div className="mb-4 text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 inline-block">
          Demo listing — not yet in your database.
        </div>
      )}
      <img src={listing.image_url} alt="" className="w-full h-64 object-cover rounded-2xl" />
      <h1 className="font-display text-2xl font-bold mt-4">
        {listing.year} {listing.make} {listing.model}
      </h1>
      <ListingDetailClient listing={listing} />
    </main>
  );
}
