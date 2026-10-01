import ListingPageClient from "../../../components/ListingPageClient";

export const dynamic = "force-dynamic";

export default function ListingPage({ params }) {
  return <ListingPageClient id={params.id} />;
}
