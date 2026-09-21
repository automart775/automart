import { getListingByIdReal } from "../../../lib/listings";

export const dynamic = "force-dynamic";

// Runs on the server per request — pulls the real listing so the share
// preview (Facebook/Instagram/WhatsApp) shows the actual car and price.
export async function generateMetadata({ params }) {
  const { listing } = await getListingByIdReal(params.id);
  if (!listing) return { title: "Listing not found — AutoMarket" };

  const title = `${listing.year} ${listing.make} ${listing.model} — $${Number(listing.price).toLocaleString()}`;
  const description = listing.description || "View this listing on AutoMarket.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: listing.image_url, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [listing.image_url],
    },
  };
}

export default async function ListingPage({ params }) {
  const { listing, isDemo } = await getListingByIdReal(params.id);
  if (!listing) return <main className="p-10">Listing not found.</main>;

  const shareUrl = `https://your-domain.com/listing/${listing.id}`; // replace once deployed

  return (
    <main className="max-w-2xl mx-auto px-6 py-14">
      {isDemo && (
        <div className="mb-4 text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 inline-block">
          Demo listing — not yet in your database.
        </div>
      )}
      <img src={listing.image_url} alt="" className="w-full h-64 object-cover rounded-2xl" />
      <h1 className="font-display text-2xl font-bold mt-6">
        {listing.year} {listing.make} {listing.model}
      </h1>
      <p className="text-[var(--muted)] mt-1">{listing.mileage} · {listing.fuel_type}</p>
      <p className="font-display text-3xl font-bold mt-4">${Number(listing.price).toLocaleString()}</p>
      <p className="text-sm text-[var(--muted)] mt-4">{listing.description}</p>

      <div className="flex gap-3 mt-8">
        <button className="flex-1 bg-[var(--ink)] text-white rounded-xl py-3 font-semibold text-sm">Buy now</button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          className="border border-[var(--ink)] rounded-xl py-3 px-5 font-semibold text-sm"
        >
          Share
        </a>
      </div>
    </main>
  );
}
