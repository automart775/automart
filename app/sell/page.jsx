"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function SellPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [form, setForm] = useState({
    make: "", model: "", year: "", price: "", mileage: "",
    fuel_type: "Gas", transmission: "Auto", body_style: "Sedan",
    description: "", listing_type: "fixed_price", start_price: "",
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      setCheckingAuth(false);
      if (!data?.user) router.push("/login");
    });
  }, [router]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // 1. Create the listing row
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          listing_type: form.listing_type,
          status: "active",
          make: form.make,
          model: form.model,
          year: parseInt(form.year, 10),
          price: form.listing_type === "fixed_price" ? parseFloat(form.price) : null,
          mileage: form.mileage,
          fuel_type: form.fuel_type,
          transmission: form.transmission,
          body_style: form.body_style,
          description: form.description,
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // 2. Upload each photo to Storage, then record it in listing_images
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${listing.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, file);
        if (uploadError) throw uploadError;

        await supabase.from("listing_images").insert({
          listing_id: listing.id,
          storage_path: path,
          sort_order: i,
        });
      }

      // 3. If it's an auction, create the auction row too
      if (form.listing_type === "auction") {
        const endsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3); // 3 days from now
        await supabase.from("auctions").insert({
          listing_id: listing.id,
          start_price: parseFloat(form.start_price),
          current_bid: parseFloat(form.start_price),
          ends_at: endsAt.toISOString(),
          status: "live",
        });
        router.push(`/auction/${listing.id}`);
      } else {
        router.push(`/listing/${listing.id}`);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (checkingAuth) return <main className="p-10 text-sm text-[var(--muted)]">Checking your account…</main>;
  if (!user) return null;

  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      <h1 className="font-display text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        List a vehicle
      </h1>
      <p className="text-sm text-[var(--muted)] mt-1">Fill in the details below. It goes live immediately.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" placeholder="Make (e.g. Toyota)" value={form.make} onChange={update("make")} required />
          <input className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" placeholder="Model (e.g. Camry SE)" value={form.model} onChange={update("model")} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" type="number" placeholder="Year" value={form.year} onChange={update("year")} required />
          <input className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" placeholder="Mileage (e.g. 18,400 mi)" value={form.mileage} onChange={update("mileage")} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" value={form.fuel_type} onChange={update("fuel_type")}>
            <option>Gas</option><option>Hybrid</option><option>Electric</option><option>Diesel</option>
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" value={form.body_style} onChange={update("body_style")}>
            <option>Sedan</option><option>SUV</option><option>Truck</option><option>Coupe</option><option>Hatchback</option>
          </select>
        </div>

        <textarea className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" placeholder="Description" rows={3} value={form.description} onChange={update("description")} />

        <label className="text-xs font-semibold text-[var(--muted)] mt-1">Listing type</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setForm((f) => ({ ...f, listing_type: "fixed_price" }))}
            className={`rounded-lg py-2.5 text-sm font-semibold border ${form.listing_type === "fixed_price" ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "border-gray-300 text-gray-700"}`}>
            Fixed price
          </button>
          <button type="button" onClick={() => setForm((f) => ({ ...f, listing_type: "auction" }))}
            className={`rounded-lg py-2.5 text-sm font-semibold border ${form.listing_type === "auction" ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-gray-300 text-gray-700"}`}>
            Auction
          </button>
        </div>

        {form.listing_type === "fixed_price" ? (
          <input className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" type="number" placeholder="Price ($)" value={form.price} onChange={update("price")} required />
        ) : (
          <input className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" type="number" placeholder="Starting bid ($)" value={form.start_price} onChange={update("start_price")} required />
        )}

        <label className="text-xs font-semibold text-[var(--muted)] mt-1">Photos</label>
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button type="submit" disabled={submitting} className="bg-[var(--ink)] text-white rounded-lg py-3 text-sm font-semibold mt-3 disabled:opacity-60">
          {submitting ? "Publishing…" : "Publish listing"}
        </button>
      </form>
    </main>
  );
}
