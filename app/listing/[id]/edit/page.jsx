"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { X, ImagePlus } from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";

const COUNTRIES = ["United States","United Kingdom","Canada","Germany","France","Australia","Brazil","Spain","Italy","Netherlands","Portugal","Mexico","Argentina","South Africa","Nigeria","Ghana","Kenya","UAE","Saudi Arabia","India"];
const BODY_STYLES = ["Sedan","SUV","Truck","Coupe","Hatchback","Convertible","Minivan","Wagon","Van"];
const FUEL_TYPES = ["Gas","Hybrid","Electric","Diesel","Flex-Fuel"];
const TRANS_TYPES = ["Automatic","Manual","CVT","Semi-Auto"];

function getPublicUrl(path) {
  if (!path) return null;
  try {
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch { return null; }
}

export default function EditListingPage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [form, setForm] = useState({
    make:"", model:"", year:"", price:"", mileage:"",
    fuel_type:"Gas", transmission:"Automatic", body_style:"Sedan",
    description:"", location_city:"", location_country:"United States",
  });

  // Existing images from DB (show them, allow removing)
  const [existingImages, setExistingImages] = useState([]); // [{id, storage_path, sort_order}]
  const [removedPaths, setRemovedPaths] = useState([]); // storage_paths to delete on save

  // New images to upload
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) { router.push("/login"); return; }

      const { data: listing, error: le } = await supabase
        .from("listings")
        .select("*, listing_images(id, storage_path, sort_order)")
        .eq("id", id)
        .single();

      if (le || !listing) { setNotAuthorized(true); setLoading(false); return; }
      if (listing.seller_id !== authData.user.id) { setNotAuthorized(true); setLoading(false); return; }

      setForm({
        make: listing.make || "",
        model: listing.model || "",
        year: listing.year?.toString() || "",
        price: listing.price?.toString() || "",
        mileage: listing.mileage || "",
        fuel_type: listing.fuel_type || "Gas",
        transmission: listing.transmission || "Automatic",
        body_style: listing.body_style || "Sedan",
        description: listing.description || "",
        location_city: listing.location_city || "",
        location_country: listing.location_country || "United States",
      });

      const sorted = (listing.listing_images || []).sort((a, b) => a.sort_order - b.sort_order);
      setExistingImages(sorted);
      setLoading(false);
    };
    load();
  }, [id, router]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const removeExisting = (path) => {
    setExistingImages((prev) => prev.filter((img) => img.storage_path !== path));
    setRemovedPaths((prev) => [...prev, path]);
  };

  const addNewImages = (e) => {
    const files = Array.from(e.target.files);
    const total = existingImages.length + newFiles.length + files.length;
    if (total > 10) { setError("Maximum 10 photos total."); return; }
    setNewFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeNew = (i) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
    setNewPreviews((prev) => { URL.revokeObjectURL(prev[i]); return prev.filter((_, idx) => idx !== i); });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    setProgress("Saving changes…");

    try {
      // 1. Update listing fields via RPC
      const { error: ue } = await supabase.rpc("update_listing", {
        p_listing_id: id,
        p_make: form.make.trim(),
        p_model: form.model.trim(),
        p_year: parseInt(form.year, 10),
        p_price: form.price ? parseFloat(form.price) : null,
        p_mileage: form.mileage.trim(),
        p_fuel_type: form.fuel_type,
        p_transmission: form.transmission,
        p_body_style: form.body_style,
        p_description: form.description.trim(),
        p_location_city: form.location_city.trim(),
        p_location_country: form.location_country,
      });
      if (ue) throw new Error(ue.message);

      // 2. Delete removed images from storage + DB
      if (removedPaths.length > 0) {
        setProgress("Removing old photos…");
        for (const path of removedPaths) {
          await supabase.storage.from("listing-images").remove([path]);
          await supabase.from("listing_images").delete().eq("storage_path", path);
        }
      }

      // 3. Upload new images
      if (newFiles.length > 0) {
        setProgress(`Uploading ${newFiles.length} new photo${newFiles.length > 1 ? "s" : ""}…`);
        const nextOrder = existingImages.length;
        for (let i = 0; i < newFiles.length; i++) {
          const path = `${id}/${Date.now()}-${i}-${newFiles[i].name.replace(/\s+/g, "_")}`;
          const { error: se } = await supabase.storage.from("listing-images").upload(path, newFiles[i]);
          if (se) throw new Error("Photo upload failed: " + se.message);
          await supabase.rpc("add_listing_image", {
            p_listing_id: id,
            p_storage_path: path,
            p_sort_order: nextOrder + i,
          });
        }
      }

      router.push(`/listing/${id}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setProgress("");
      setSubmitting(false);
    }
  };

  if (loading) return <main className="p-8 text-sm" style={{ color: "var(--muted)" }}>Loading…</main>;

  if (notAuthorized) return (
    <main className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 420 }}>
      <p className="font-semibold" style={{ color: "var(--ink)" }}>Not authorized</p>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>You can only edit your own listings.</p>
    </main>
  );

  const totalPhotos = existingImages.length + newFiles.length;

  return (
    <main className="mx-auto px-4 py-8" style={{ maxWidth: 600 }}>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Edit listing</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Changes go live immediately.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div className="grid grid-cols-2 gap-3">
          {[["Make *","make","e.g. Toyota"],["Model *","model","e.g. Camry SE"]].map(([label,field,ph]) => (
            <div key={field}>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>{label}</label>
              <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
                placeholder={ph} value={form[field]} onChange={update(field)} required />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Year *</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
              type="number" min="1900" max="2030" value={form.year} onChange={update("year")} required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Mileage</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
              placeholder="18,400 mi" value={form.mileage} onChange={update("mileage")} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[["Fuel","fuel_type",FUEL_TYPES],["Transmission","transmission",TRANS_TYPES],["Body","body_style",BODY_STYLES]].map(([label,field,opts]) => (
            <div key={field}>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>{label}</label>
              <select className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
                value={form[field]} onChange={update(field)}>
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>City</label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
              placeholder="e.g. Austin" value={form.location_city} onChange={update("location_city")} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Country</label>
            <select className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
              value={form.location_country} onChange={update("location_country")}>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Description</label>
          <textarea className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none" style={{ borderColor: "var(--border)" }}
            rows={4} value={form.description} onChange={update("description")} />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Asking price ($)</label>
          <input className="w-full border rounded-xl px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)" }}
            type="number" placeholder="24500" value={form.price} onChange={update("price")} />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Leave blank for auction listings.</p>
        </div>

        {/* Photos */}
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "var(--muted)" }}>
            Photos ({totalPhotos}/10)
          </label>
          <div className="flex flex-wrap gap-2">
            {/* Existing */}
            {existingImages.map((img) => {
              const src = getPublicUrl(img.storage_path);
              return (
                <div key={img.storage_path} className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ border: "1.5px solid var(--border)" }}>
                  {src && <img src={src} alt="" className="w-full h-full object-cover" />}
                  <button type="button" onClick={() => removeExisting(img.storage_path)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ background: "rgba(0,0,0,0.65)" }}>
                    <X size={10} />
                  </button>
                </div>
              );
            })}
            {/* New previews */}
            {newPreviews.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                style={{ border: "1.5px solid var(--border)" }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeNew(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: "rgba(0,0,0,0.65)" }}>
                  <X size={10} />
                </button>
              </div>
            ))}
            {/* Add more */}
            {totalPhotos < 10 && (
              <label className="w-20 h-20 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1 flex-shrink-0"
                style={{ border: "1.5px dashed var(--border)", color: "var(--muted)" }}>
                <ImagePlus size={18} />
                <span className="text-[10px]">Add photo</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={addNewImages} />
              </label>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm px-3 py-2.5 rounded-xl" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button type="button" onClick={() => router.back()}
            className="rounded-xl py-3.5 text-sm font-semibold border"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "var(--ink)" }}>
            {submitting ? progress || "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
