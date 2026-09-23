import { ShieldCheck } from "lucide-react";

export default function VerifiedBadge({ role, verified }) {
  if (role !== "dealer" || !verified) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: "linear-gradient(135deg, #FFD700, #F2A93B)", color: "#7A4E00", boxShadow: "0 1px 4px rgba(242,169,59,0.4)" }}
      title="This seller has been verified by AutoMarket"
    >
      <ShieldCheck size={11} />
      Verified Seller
    </span>
  );
}
