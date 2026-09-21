import { getListingByIdReal } from "../../../lib/listings";

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

  const bid = listing.current_bid || listing.start_price || 0;
  const shareUrl = `https://your-domain.com/auction/${listing.id}`;

  return (
    <main className="max-w-2xl mx-auto px-6 py-14">
      {isDemo && (
        <div className="mb-4 text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 inline-block">
          Demo auction — not yet in your database.
        </div>
      )}
      <img src={listing.image_url} alt="" className="w-full h-64 object-cover rounded-2xl" />
      <span className="inline-block mt-4 text-[10px] font-mono uppercase bg-red-50 text-red-600 px-2 py-1 rounded-full">● Live auction</span>
      <h1 className="font-display text-2xl font-bold mt-3">
        {listing.year} {listing.make} {listing.model}
      </h1>
      <div className="flex items-center justify-between mt-4 bg-white border border-gray-200 rounded-2xl p-4">
        <div>
          <p className="text-[10px] uppercase text-[var(--muted)]">Highest bid</p>
          <p className="font-display text-2xl font-bold text-[var(--accent)]">${Number(bid).toLocaleString()}</p>
        </div>
        <button className="bg-[var(--accent)] text-white rounded-xl py-3 px-5 font-semibold text-sm">Place bid</button>
      </div>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        className="inline-block mt-6 border border-[var(--ink)] rounded-xl py-3 px-5 font-semibold text-sm"
      >
        Share this auction
      </a>
    </main>
  );
}
