import AuctionPageClient from "../../../components/AuctionPageClient";

export const dynamic = "force-dynamic";

export default function AuctionPage({ params }) {
  return <AuctionPageClient id={params.id} />;
}
