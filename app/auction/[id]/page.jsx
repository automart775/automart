import { getListingByIdReal } from "../../../lib/listings";
import AuctionBidClient from "../../../components/AuctionBidClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { listing } = await getListingByIdReal(params.id);
  if (!listing) return { title: "Auction not found — AutoMarket" };

  const bid = listing.current_bid || listing.start_price || 0;
  const title = `${listing.year} ${listing.make} ${listing.model} — Live Auction, $${Number(bid).toLocaleString()} bid`;
  const description = `Bidding is live. ${listing.description || ""}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: listing.image_url, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [listing.image_url] },
  };
}

export default async function AuctionPage({ params }) {
  const { listing, isDemo } = await getListingByIdReal(params.id);
  if (!listing) return <main className="p-10">Auction not found.</main>;

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 pb-16">
      {isDemo && (
        <div className="mb-4 text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 inline-block">
          Demo auction — not yet in your database.
        </div>
      )}
      <img src={listing.image_url} alt="" className="w-full h-64 object-cover rounded-2xl" />
      <h1 className="font-display text-2xl font-bold mt-4">
        {listing.year} {listing.make} {listing.model}
      </h1>

      <AuctionBidClient listing={listing} />
    </main>
  );
}
