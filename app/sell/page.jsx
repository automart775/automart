"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, ImagePlus } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const COUNTRIES = ["United States","United Kingdom","Canada","Germany","France","Australia","Brazil","Spain","Italy","Netherlands","Portugal","Mexico","Argentina","South Africa","Nigeria","Ghana","Kenya","UAE","Saudi Arabia","India"];
const BODY_STYLES = ["Sedan","SUV","Truck","Coupe","Hatchback","Convertible","Minivan","Wagon","Van"];
const FUEL_TYPES = ["Gas","Hybrid","Electric","Diesel","Flex-Fuel"];
const TRANS_TYPES = ["Automatic","Manual","CVT","Semi-Auto"];

export default function SellPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState({
    make:"", model:"", year:"", price:"", mileage:"",
    fuel_type:"Gas", transmission:"Automatic", body_style:"Sedan",
    description:"", listing_type:"fixed_price", start_price:"",
    location_city:"", location_country:"United States",
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { router.push("/login"); return; }
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, [router]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const addImages = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (i) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[i]);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { data: listing, error: le } = await supabase.from("listings").insert({
        seller_id: user.id,
        listing_type: form.listing_type,
        status: "active",
        make: form.make.trim(),
        model: form.model.trim(),
        year: parseInt(form.year, 10),
        price: form.listing_type === "fixed_price" ? parseFloat(form.price) : null,
        mileage: form.mileage.trim(),
        fuel_type: form.fuel_type,
        transmission: form.transmission,
        body_style: form.body_style,
        description: form.description.trim(),
        location_city: form.location_city.trim(),
        location_country: form.location_country,
      }).select().single();

      if (le) throw le;

      for (let i = 0; i < files.length; i++) {
        const path = `${listing.id}/${Date.now()}-${i}-${files[i].name.replace(/\s+/g, "_")}`;
        const { error: ue } = await supabase.storage.from("listing-images").upload(path, files[i]);
        if (ue) throw ue;
        await supabase.from("listing_images").insert({ listing_id: listing.id, storage_path: path, sort_order: i });
      }

      if (form.listing_type === "auction") {
        const endsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString();
        const { error: ae } = await supabase.from("auctions").insert({
          listing_id: listing.id, start_price: parseFloat(form.start_price),
          current_bid: parseFloat(form.start_price), ends_at: endsAt, status: "live",
        });
        if (ae) throw ae;
        router.push(`/auction/${listing.id}`);
      } else {
        router.push(`/listing/${listing.id}`);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (checkingAuth) return <main className="p-8 text-sm" style={{ color:"var(--muted)" }}>Loading…</main>;

  return (
    <main className="mx-auto px-4 py-8" style={{ maxWidth:600 }}>
      <h1 className="font-display text-2xl font-bold" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>List a vehicle</h1>
      <p className="text-sm mt-1 mb-6" style={{ color:"var(--muted)" }}>Fill in the details below. It goes live immediately.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Vehicle info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Make *</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} placeholder="e.g. Toyota" value={form.make} onChange={update("make")} required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Model *</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} placeholder="e.g. Camry SE" value={form.model} onChange={update("model")} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Year *</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} type="number" min="1900" max="2030" placeholder="2022" value={form.year} onChange={update("year")} required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Mileage</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} placeholder="18,400 mi" value={form.mileage} onChange={update("mileage")} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Fuel</label>
            <select className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} value={form.fuel_type} onChange={update("fuel_type")}>
              {FUEL_TYPES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Transmission</label>
            <select className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} value={form.transmission} onChange={update("transmission")}>
              {TRANS_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Body style</label>
            <select className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} value={form.body_style} onChange={update("body_style")}>
              {BODY_STYLES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>City</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} placeholder="e.g. Austin" value={form.location_city} onChange={update("location_city")} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Country</label>
            <select className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} value={form.location_country} onChange={update("location_country")}>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Description</label>
          <textarea className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none" style={{ borderColor:"var(--border)" }} placeholder="Condition, history, features, why you're selling..." rows={4} value={form.description} onChange={update("description")} />
        </div>

        {/* Photos */}
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color:"var(--muted)" }}>Photos (up to 10)</label>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ border:"1.5px solid var(--border)" }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background:"rgba(0,0,0,0.6)" }}>
                  <X size={10} />
                </button>
              </div>
            ))}
            {previews.length < 10 && (
              <label className="w-20 h-20 rounded-xl flex flex-col items-center justify-center cursor-pointer flex-shrink-0" style={{ border:"1.5px dashed var(--border)", color:"var(--muted)" }}>
                <ImagePlus size={20} />
                <span className="text-[10px] mt-1">Add photo</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={addImages} />
              </label>
            )}
          </div>
        </div>

        {/* Listing type */}
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color:"var(--muted)" }}>Listing type</label>
          <div className="grid grid-cols-2 gap-3">
            {[["fixed_price","Fixed price"],["auction","Live auction"]].map(([val,label]) => (
              <button type="button" key={val}
                onClick={() => setForm((f) => ({ ...f, listing_type: val }))}
                className="rounded-xl py-3 text-sm font-semibold border transition-all"
                style={{
                  background: form.listing_type === val ? "var(--ink)" : "transparent",
                  color: form.listing_type === val ? "#fff" : "var(--ink)",
                  borderColor: form.listing_type === val ? "var(--ink)" : "var(--border)",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {form.listing_type === "fixed_price" ? (
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Asking price ($) *</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} type="number" placeholder="24500" value={form.price} onChange={update("price")} required />
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color:"var(--muted)" }}>Starting bid ($) *</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor:"var(--border)" }} type="number" placeholder="15000" value={form.start_price} onChange={update("start_price")} required />
            <p className="text-xs mt-1" style={{ color:"var(--muted)" }}>Auction runs for 3 days from the moment you publish.</p>
          </div>
        )}

        {error && (
          <div className="text-sm px-3 py-2.5 rounded-xl" style={{ background:"var(--danger-soft)", color:"var(--danger)" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="rounded-xl py-3.5 text-sm font-semibold text-white mt-1 disabled:opacity-60"
          style={{ background:"var(--ink)" }}>
          {submitting ? "Publishing…" : "Publish listing"}
        </button>
      </form>
    </main>
  );
}
