"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ImagePlus } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const COUNTRIES = ["United States","United Kingdom","Canada","Germany","France","Australia","Brazil","Spain","Italy","Netherlands","Portugal","Mexico","Argentina","South Africa","Nigeria","Ghana","Kenya","UAE","Saudi Arabia","India"];
const FUEL_TYPES = ["Gas","Hybrid","Electric","Diesel","Flex-Fuel"];
const TRANS = ["Automatic","Manual","CVT","Semi-Auto"];
const BODY_STYLES = ["Sedan","SUV","Truck","Coupe","Hatchback","Convertible","Minivan","Wagon","Van"];

const QUICK_DURATIONS = [
  { label: "6h",  hours: 6 },
  { label: "12h", hours: 12 },
  { label: "1d",  hours: 24 },
  { label: "2d",  hours: 48 },
  { label: "3d",  hours: 72 },
];

function formatDuration(hours) {
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  if (h === 0) return `${d} day${d !== 1 ? "s" : ""}`;
  return `${d}d ${h}h`;
}

async function compress(file, maxPx = 1400, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })),
        "image/jpeg", quality
      );
    };
    img.src = url;
  });
}

export default function SellPage() {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [type, setType] = useState("fixed_price");

  // Duration state
  const [durationMode, setDurationMode] = useState("preset");  // "preset" | "custom"
  const [durationHours, setDurationHours] = useState(72);       // preset selection
  const [customHours, setCustomHours] = useState("");            // custom input

  const [form, setForm] = useState({
    make: "", model: "", year: String(new Date().getFullYear()),
    price: "", startingBid: "", mileage: "",
    fuel_type: "Gas", transmission: "Automatic", body_style: "Sedan",
    description: "", location_city: "", location_country: "United States",
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { router.push("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", data.user.id).single();
      setRole(profile?.role || "buyer");
    });
  }, [router]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const addImages = async (e) => {
    const picked = Array.from(e.target.files);
    if (files.length + picked.length > 10) { setError("Maximum 10 photos."); return; }
    setError("");
    setProgress("Compressing photos…");
    const compressed = await Promise.all(picked.map((f) => compress(f)));
    setFiles((prev) => [...prev, ...compressed]);
    setPreviews((prev) => [...prev, ...compressed.map((f) => URL.createObjectURL(f))]);
    setProgress("");
  };

  const removeImage = (i) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const getTotalHours = () => {
    if (durationMode === "custom") {
      const h = parseInt(customHours, 10);
      return isNaN(h) || h < 1 ? 0 : Math.min(h, 336);
    }
    return durationHours;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) { setError("Add at least one photo."); return; }
    if (type === "auction" && durationMode === "custom" && getTotalHours() < 1) {
      setError("Enter a valid custom duration (minimum 1 hour).");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      setProgress("Creating listing…");
      const { data: listingId, error: le } = await supabase.rpc("create_listing", {
        p_listing_type: type,
        p_make: form.make.trim(),
        p_model: form.model.trim(),
        p_year: parseInt(form.year, 10),
        p_price: type === "fixed_price" && form.price ? parseFloat(form.price) : null,
        p_mileage: form.mileage.trim(),
        p_fuel_type: form.fuel_type,
        p_transmission: form.transmission,
        p_body_style: form.body_style,
        p_description: form.description.trim(),
        p_location_city: form.location_city.trim(),
        p_location_country: form.location_country,
      });
      if (le) throw new Error(le.message);

      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${files.length}…`);
        const path = `${listingId}/${Date.now()}-${i}.jpg`;
        const { error: se } = await supabase.storage.from("listing-images").upload(path, files[i]);
        if (se) throw new Error("Photo upload failed: " + se.message);
        await supabase.rpc("add_listing_image", { p_listing_id: listingId, p_storage_path: path, p_sort_order: i });
      }

      if (type === "auction") {
        setProgress("Setting up auction…");
        const totalHours = getTotalHours();
        const endsAt = new Date(Date.now() + totalHours * 3600000).toISOString();

        const { error: ae } = await supabase.rpc("create_auction", {
          p_listing_id: listingId,
          p_start_price: parseFloat(form.startingBid),
          p_ends_at: endsAt,
        });
        if (ae) throw new Error(ae.message);

        // Fixed 2s delay after RPC confirms success — no polling needed
        setProgress("Almost there…");
        await new Promise((r) => setTimeout(r, 2000));
        router.push(`/auction/${listingId}`);
      } else {
        await new Promise((r) => setTimeout(r, 500));
        router.push(`/listing/${listingId}`);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
      setSubmitting(false);
      setProgress("");
    }
  };

  if (role === null) return <main className="p-8 text-sm" style={{ color: "var(--muted)" }}>Loading…</main>;

  if (role === "buyer") return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 420 }}>
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Sellers only</h1>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>You need a seller account to list vehicles.</p>
      <a href="/signup" className="inline-block px-5 py-3 rounded-xl text-sm font-semibold text-white"
        style={{ background: "var(--ink)" }}>Create seller account</a>
    </main>
  );

  const totalHours = getTotalHours();

  return (
    <main className="mx-auto px-4 py-8 pb-28" style={{ maxWidth: 600 }}>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>List a vehicle</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Takes about 2 minutes.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Listing type */}
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--muted)" }}>Listing type</p>
          <div className="grid grid-cols-2 gap-3">
            {[["fixed_price","Fixed price","Set a price — buyer contacts you"],
              ["auction","Live auction","Buyers bid — highest wins"]].map(([val, label, sub]) => (
              <button key={val} type="button" onClick={() => setType(val)}
                className="rounded-2xl p-4 text-left border-2"
                style={{ borderColor: type === val ? "var(--ink)" : "var(--border)", background: type === val ? "var(--ink-soft)" : "white" }}>
                <div className="text-sm font-bold" style={{ color: "var(--ink)" }}>{label}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Make / Model */}
        <div className="grid grid-cols-2 gap-3">
          {[["Make *","make","Toyota"],["Model *","model","Camry SE"]].map(([label, field, ph]) => (
            <div key={field}>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>{label}</label>
              <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
                placeholder={ph} value={form[field]} onChange={set(field)} required />
            </div>
          ))}
        </div>

        {/* Year / Mileage */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Year *</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
              type="number" min="1900" max="2030" value={form.year} onChange={set("year")} required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Mileage</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
              placeholder="18,400 mi" value={form.mileage} onChange={set("mileage")} />
          </div>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-3 gap-3">
          {[["Fuel","fuel_type",FUEL_TYPES],["Transmission","transmission",TRANS],["Body","body_style",BODY_STYLES]].map(([label, field, opts]) => (
            <div key={field}>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>{label}</label>
              <select className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
                value={form[field]} onChange={set(field)}>
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>City</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
              placeholder="Lagos" value={form.location_city} onChange={set("location_city")} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Country</label>
            <select className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
              value={form.location_country} onChange={set("location_country")}>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Description</label>
          <textarea className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none" style={{ borderColor: "var(--border)" }}
            rows={4} placeholder="Condition, features, reason for selling…"
            value={form.description} onChange={set("description")} />
        </div>

        {/* Price / Auction fields */}
        {type === "fixed_price" ? (
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Asking price ($) *</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
              type="number" step="100" min="0" placeholder="24500"
              value={form.price} onChange={set("price")} required />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Starting bid */}
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Starting bid ($) *</label>
              <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
                type="number" step="100" min="0" placeholder="5000"
                value={form.startingBid} onChange={set("startingBid")} required />
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: "var(--muted)" }}>
                Auction duration
              </label>

              {/* Quick presets */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                {QUICK_DURATIONS.map(({ label, hours }) => (
                  <button key={label} type="button"
                    onClick={() => { setDurationMode("preset"); setDurationHours(hours); }}
                    className="rounded-xl py-2.5 text-sm font-bold border"
                    style={{
                      background: durationMode === "preset" && durationHours === hours ? "var(--ink)" : "white",
                      color: durationMode === "preset" && durationHours === hours ? "white" : "var(--ink)",
                      borderColor: durationMode === "preset" && durationHours === hours ? "var(--ink)" : "var(--border)",
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Custom toggle */}
              <button type="button"
                onClick={() => setDurationMode(durationMode === "custom" ? "preset" : "custom")}
                className="w-full rounded-xl py-2.5 text-sm font-semibold border mb-3"
                style={{
                  background: durationMode === "custom" ? "var(--ink)" : "white",
                  color: durationMode === "custom" ? "white" : "var(--ink)",
                  borderColor: durationMode === "custom" ? "var(--ink)" : "var(--border)",
                }}>
                {durationMode === "custom" ? "Custom duration selected" : "Set custom duration"}
              </button>

              {/* Custom hours input */}
              {durationMode === "custom" && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: "var(--paper)" }}>
                  <input
                    type="number"
                    min="1" max="336"
                    placeholder="e.g. 18"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    className="w-24 border rounded-lg px-3 py-2 text-sm font-semibold text-center"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="text-sm" style={{ color: "var(--muted)" }}>hours</span>
                  {customHours && parseInt(customHours) >= 1 && (
                    <span className="text-sm font-semibold ml-auto" style={{ color: "var(--ink)" }}>
                      = {formatDuration(parseInt(customHours))}
                    </span>
                  )}
                </div>
              )}

              {/* Summary */}
              {totalHours >= 1 && (
                <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                  Auction ends in <strong>{formatDuration(totalHours)}</strong> after you publish.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Photos */}
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "var(--muted)" }}>
            Photos * ({files.length}/10) — auto-compressed
          </label>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                style={{ border: "1.5px solid var(--border)" }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: "rgba(0,0,0,0.65)" }}>
                  <X size={10} />
                </button>
              </div>
            ))}
            {files.length < 10 && (
              <label className="w-20 h-20 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1"
                style={{ border: "1.5px dashed var(--border)", color: "var(--muted)" }}>
                <ImagePlus size={18} />
                <span className="text-[10px]">Add photo</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={addImages} />
              </label>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm px-3 py-2.5 rounded-xl" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        {/* Sticky submit */}
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3"
          style={{ background: "linear-gradient(to top, white 80%, transparent)", zIndex: 20 }}>
          <button type="submit" disabled={submitting}
            className="w-full rounded-2xl py-4 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "var(--ink)" }}>
            {submitting ? (progress || "Publishing…") : type === "auction" ? "Start auction" : "Publish listing"}
          </button>
        </div>

      </form>
    </main>
  );
}
