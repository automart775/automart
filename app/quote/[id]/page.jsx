import { getListingByIdReal } from "../../../lib/listings";

export default async function QuotePage({ params }) {
  const { listing } = await getListingByIdReal(params.id);
  if (!listing) return <main className="p-10">Listing not found.</main>;

  const quoteRef = `AM-${params.id.slice(0,6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const today = new Date();
  const validUntil = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });

  const price = Number(listing.price || listing.current_bid || listing.start_price || 0);
  const deposit10 = Math.ceil(price * 0.1);
  const deposit20 = Math.ceil(price * 0.2);
  const platformFee = Math.ceil(price * 0.01);
  const total = price + platformFee;

  return (
    <main className="mx-auto px-4 py-8" style={{ maxWidth:700 }}>
      {/* Print button */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>Vehicle Quote</h1>
        <button onClick={() => window.print()} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background:"var(--ink)" }}>
          Print / Save PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6" style={{ boxShadow:"0 1px 2px rgba(20,33,61,0.04), 0 6px 16px rgba(20,33,61,0.05)" }}>
        {/* Header */}
        <div className="flex items-start justify-between pb-5 mb-5" style={{ borderBottom:"1.5px solid var(--border)" }}>
          <div>
            <p className="font-bold text-lg" style={{ fontFamily:"'Space Grotesk',sans-serif", color:"var(--ink)" }}>AutoMarket</p>
            <p className="text-xs mt-0.5" style={{ color:"var(--muted)" }}>automart-three.vercel.app</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color:"var(--muted)" }}>Quote Reference</p>
            <p className="font-mono font-bold text-base" style={{ color:"var(--ink)" }}>{quoteRef}</p>
            <p className="text-xs mt-0.5" style={{ color:"var(--muted)" }}>Issued: {fmt(today)}</p>
            <p className="text-xs" style={{ color:"var(--muted)" }}>Valid until: {fmt(validUntil)}</p>
          </div>
        </div>

        {/* Vehicle */}
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color:"var(--muted)" }}>Vehicle Details</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6">
          {[
            ["Make", listing.make],
            ["Model", listing.model],
            ["Year", listing.year],
            ["Body Style", listing.body_style || "—"],
            ["Mileage", listing.mileage || "—"],
            ["Fuel Type", listing.fuel_type || "—"],
            ["Transmission", listing.transmission || "—"],
            ["Location", [listing.location_city, listing.location_country].filter(Boolean).join(", ") || "—"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between py-1.5" style={{ borderBottom:"1px solid var(--border)" }}>
              <span className="text-xs" style={{ color:"var(--muted)" }}>{label}</span>
              <span className="text-xs font-semibold" style={{ color:"var(--ink)" }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Seller */}
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color:"var(--muted)" }}>Seller</h2>
        <div className="flex items-center gap-3 p-3 rounded-xl mb-6" style={{ background:"var(--paper)" }}>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color:"var(--ink)" }}>{listing.seller_name}</p>
            <p className="text-xs" style={{ color:"var(--muted)" }}>{listing.seller_role === "dealer" ? "Dealership" : "Private seller"}{listing.seller_verified ? " · Verified by AutoMarket" : ""}</p>
          </div>
        </div>

        {/* Pricing */}
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color:"var(--muted)" }}>Pricing Breakdown</h2>
        <div className="rounded-xl overflow-hidden mb-2" style={{ border:"1px solid var(--border)" }}>
          {[
            ["Vehicle asking price", `$${price.toLocaleString()}`],
            ["AutoMarket platform fee (1%)", `$${platformFee.toLocaleString()}`],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between px-4 py-2.5 text-sm" style={{ borderBottom:"1px solid var(--border)" }}>
              <span style={{ color:"var(--muted)" }}>{label}</span>
              <span className="font-semibold" style={{ color:"var(--ink)" }}>{val}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 text-sm font-bold" style={{ background:"var(--ink)", color:"#fff" }}>
            <span>Estimated total</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment options */}
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 mt-6" style={{ color:"var(--muted)" }}>Payment Options</h2>
        <div className="grid grid-cols-1 gap-2 mb-6">
          {[
            ["Pay in full", `$${total.toLocaleString()}`, "Full payment at time of purchase"],
            ["10% deposit", `$${deposit10.toLocaleString()}`, `Balance of $${(total - deposit10).toLocaleString()} due at vehicle handover`],
            ["20% deposit", `$${deposit20.toLocaleString()}`, `Balance of $${(total - deposit20).toLocaleString()} due at vehicle handover`],
          ].map(([option, amount, note]) => (
            <div key={option} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ border:"1px solid var(--border)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color:"var(--ink)" }}>{option}</p>
                <p className="text-xs" style={{ color:"var(--muted)" }}>{note}</p>
              </div>
              <p className="font-mono font-bold text-sm" style={{ color:"var(--accent-dark)" }}>{amount}</p>
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed" style={{ color:"var(--muted)" }}>
          This quote is valid for 7 days from the date of issue. Prices are subject to change based on market conditions and final vehicle inspection. All transactions are facilitated through AutoMarket's secure payment system. This document does not constitute a binding contract.
        </p>
      </div>
    </main>
  );
}
