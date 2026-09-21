# AutoMarket — Next.js Scaffold

## What's here
- Home page listing vehicles (demo data for now)
- `/listing/[id]` — fixed-price listing detail, **generates real Facebook/Instagram/WhatsApp share previews per listing** (see the `generateMetadata` function — that's the key piece)
- `/auction/[id]` — same share-preview pattern, plus live bid display
- `lib/demoData.js` — placeholder data so the site works before Supabase is connected
- `lib/supabaseClient.js` — ready to go once you add your Supabase keys

## Run it
```
npm install
npm run dev
```
Open http://localhost:3000

## Test the share previews right now (before deploying)
Once deployed (see below), paste any listing URL into:
- https://developers.facebook.com/tools/debug/ (Facebook's own preview checker)
- https://cards-dev.twitter.com/validator (Twitter/X)

You'll see the actual car photo, name, and price pulled in — that's the part a plain React SPA can't do.

## Swapping demo data for real Supabase data
In `app/listing/[id]/page.jsx`, replace the `getListingById` import with a real query, e.g.:
```js
import { supabase } from "../../../lib/supabaseClient";

async function getListing(id) {
  const { data } = await supabase.from("listings").select("*, listing_images(*)").eq("id", id).single();
  return data;
}
```
Everything else (the metadata generation, the page layout) stays the same.

## Deploying (so links actually work publicly)
Easiest path: **vercel.com** — it's made by the Next.js team, free tier is generous.
1. Push this folder to a GitHub repo
2. Import it on vercel.com → it auto-detects Next.js
3. Add your Supabase env vars in Vercel's project settings
4. Deploy — you get a real `yourproject.vercel.app` URL where every listing has its own working shareable link

## What's next
- Wire the "Buy now" / "Place bid" buttons to real Supabase writes
- Add the sign-up/login flow (Supabase Auth)
- Add the "create a listing" form with image upload to Supabase Storage
- Bring over the rest of the screens (search/filters, vehicle spec tiles, etc.) from the original prototype — same visual system, just ported into this routed structure
