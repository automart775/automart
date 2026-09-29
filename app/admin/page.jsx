"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Users, List, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl p-4 flex-1 text-center" style={{ background: "var(--paper)" }}>
      <Icon size={18} className="mx-auto mb-1.5" style={{ color: "var(--muted)" }} />
      <div className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [pendingDealers, setPendingDealers] = useState([]);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [totalListings, setTotalListings] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .single();

      if (!profile || profile.role !== "admin") { setUnauthorized(true); setLoading(false); return; }

      // Dealers pending verification
      const { data: pending } = await supabase
        .from("profiles")
        .select("id, full_name, phone, country, created_at")
        .eq("role", "dealer")
        .eq("dealer_verified", false)
        .order("created_at", { ascending: true });
      setPendingDealers(pending || []);

      // Counts
      const [
        { count: vc },
        { count: lc },
        { count: uc },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "dealer").eq("dealer_verified", true),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setVerifiedCount(vc || 0);
      setTotalListings(lc || 0);
      setTotalUsers(uc || 0);

      setLoading(false);
    };
    load();
  }, [router]);

  const approve = async (userId) => {
    setApproving(userId);
    const { error } = await supabase.rpc("approve_dealer", { p_user_id: userId });
    if (!error) {
      setPendingDealers(prev => prev.filter(d => d.id !== userId));
      setVerifiedCount(n => n + 1);
    } else {
      alert("Error: " + error.message);
    }
    setApproving(null);
  };

  const reject = async (userId) => {
    if (!confirm("Reject this dealer and remove their dealer role?")) return;
    setRejecting(userId);
    const { error } = await supabase.rpc("reject_dealer", { p_user_id: userId });
    if (!error) {
      setPendingDealers(prev => prev.filter(d => d.id !== userId));
    } else {
      alert("Error: " + error.message);
    }
    setRejecting(null);
  };

  if (loading) return <main className="p-8 text-sm" style={{ color: "var(--muted)" }}>Loading…</main>;

  if (unauthorized) return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 420 }}>
      <div className="text-5xl mb-4">🔒</div>
      <p className="font-semibold" style={{ color: "var(--ink)" }}>Admin access only</p>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>This page is restricted.</p>
    </main>
  );

  return (
    <main className="mx-auto px-4 py-8 pb-20" style={{ maxWidth: 680 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Admin panel</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Automart platform management</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-8">
        <Stat label="Users"           value={totalUsers}             icon={Users} />
        <Stat label="Listings"        value={totalListings}          icon={List} />
        <Stat label="Verified dealers" value={verifiedCount}         icon={ShieldCheck} />
        <Stat label="Pending verify"  value={pendingDealers.length}  icon={CheckCircle} />
      </div>

      {/* Dealer verification queue */}
      <div>
        <h2 className="text-base font-bold mb-3" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
          Dealers awaiting verification
          {pendingDealers.length > 0 && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full text-white" style={{ background: "#D6472F" }}>
              {pendingDealers.length}
            </span>
          )}
        </h2>

        {pendingDealers.length === 0 ? (
          <div className="text-sm text-center py-10 rounded-2xl" style={{ background: "var(--paper)", color: "var(--muted)" }}>
            <CheckCircle size={28} className="mx-auto mb-2" style={{ color: "#2F9E44" }} />
            All caught up — no dealers pending review.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingDealers.map(dealer => (
              <div key={dealer.id}
                className="rounded-2xl p-4"
                style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {dealer.full_name || "Unnamed dealer"}
                    </div>
                    <div className="text-xs mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: "var(--muted)" }}>
                      {dealer.phone && <span>📞 {dealer.phone}</span>}
                      {dealer.country && <span>🌍 {dealer.country}</span>}
                      <span>Registered {new Date(dealer.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="text-xs mt-1 font-mono" style={{ color: "var(--muted)" }}>
                      ID: {dealer.id.slice(0, 8)}…
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approve(dealer.id)}
                      disabled={approving === dealer.id || rejecting === dealer.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
                      style={{ background: "#2F9E44" }}
                    >
                      <CheckCircle size={13} />
                      {approving === dealer.id ? "…" : "Approve"}
                    </button>
                    <button
                      onClick={() => reject(dealer.id)}
                      disabled={approving === dealer.id || rejecting === dealer.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
                      style={{ background: "#D6472F" }}
                    >
                      <XCircle size={13} />
                      {rejecting === dealer.id ? "…" : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-8">
        <h2 className="text-base font-bold mb-3" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--ink)" }}>
          Quick links
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Supabase dashboard", "https://supabase.com/dashboard/project/pjbjlipongorhhyjhcmg"],
            ["Vercel deploys",     "https://vercel.com/dashboard"],
            ["Browse listings",    "/search"],
            ["GitHub repo",        "https://github.com/automart775/automart"],
          ].map(([label, href]) => (
            <a key={label} href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="block rounded-xl px-4 py-3 text-sm font-medium border"
              style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
              {label} {href.startsWith("http") && "↗"}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
