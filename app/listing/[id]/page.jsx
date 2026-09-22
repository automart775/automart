import { getListingByIdReal } from "../../../lib/listings";
import ListingDetailClient from "../../../components/ListingDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { listing } = await getListingByIdReal(params.id);
  if (!listing) return { title: "Listing not found — AutoMarket" };

  const title = `${listing.year} ${listing.make} ${listing.model} — $${Number(listing.price).toLocaleString()}`;
  const description = listing.description || "View this listing on AutoMarket.";

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: listing.image_url, width: 1200, height: 630 }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [listing.image_url] },
  };
}

export default async function ListingPage({ params }) {
  const { listing, isDemo } = await getListingByIdReal(params.id);
  if (!listing) return <main className="p-10">Listing not found.</main>;

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      {isDemo && (
        <div className="mb-4 text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 inline-block">
          Demo listing — not yet in your database.
        </div>
      )}
      <img src={listing.image_url} alt="" className="w-full h-64 object-cover rounded-2xl" />
      <h1 className="font-display text-2xl font-bold mt-6">
        {listing.year} {listing.make} {listing.model}
      </h1>

      <ListingDetailClient listing={listing} />
    </main>
  );
}
