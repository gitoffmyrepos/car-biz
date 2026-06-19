# Car-Biz Overhaul — Sub-project A+B: Frontend Redesign + Fleet Inventory & Images

2026-06-19. First of the decomposed sub-projects (A frontend overhaul + B fleet/inventory backend).
Email (Proton SMTP), Chatwoot, Cloudflare-tunnel deploy, and Kafka are **separate later sub-projects**, out of scope here.

## Context (what already exists — do NOT rebuild)

Existing app: Next.js 14 (App Router) + FastAPI + Postgres + Redis + k8s manifests + Jenkinsfile.
- Frontend routes already present: `page`, `fleet`, `dashboard`, `admin`, `login`, `signup`, `vehicle-request`, `payments`, `incidents`, `requirements`, `privacy`, `gps-disclosure`.
- `Vehicle` model (`backend/app/models/vehicle.py`) already has: `vin, make, model, year, color, body_type, engine, transmission, mileage, weekly_rate (Decimal), security_deposit, status, condition, image_key, is_active, show_on_fleet_page`.
- Backend APIs: `files.py` (upload), `public.py`, `admin.py`, `customer.py`, `inquiries.py`, auth, websocket. MinIO/S3 wired in `core/config.py` (buckets for payments/insurance/incidents/condition-reports).

**So the overhaul is a redesign + three additions, not a greenfield build.** Auth, admin, payments, inquiry/vehicle-request flow, websockets — all stay as-is.

## Reference (vznrentals.co teardown)

vznrentals.co = dark near-black + champagne-gold, **sharp corners (border-radius 0)**, Helvetica-stack, numbered gold "NN — Label" section eyebrows, typographic hero, single-page → `/inquiry` form. Strengths: tight themeable token system, strong local-SEO JSON-LD (`CarRental` schema), fast (zero images). **Weaknesses we beat: no fleet grid, no per-car pages, no published prices, no 3D, no photography.**

We adopt its aesthetic + SEO discipline and add exactly what it lacks.

## Goals

1. **Redesign** the public site to the dark + champagne-gold editorial system (reskin, reuse existing routes/components).
2. **3D animated hero** — the differentiator vznrentals has not. One lazy-loaded 3D element + static fallback.
3. **Real fleet inventory** — public grid with per-car weekly price, specs, availability, filters/sort; per-car detail page with image gallery.
4. **Two-way images** — admin uploads car photos → MinIO → public fleet display. Multi-image gallery per car.
5. **SEO** — per-page metadata, `CarRental` JSON-LD, sitemap, robots, semantic headings.

## Design system

Tailwind theme tokens in `globals.css` (reuse existing file):
- `--background: #0D0D0D`, `--card: #111111`, `--gold: #B8963E`, `--gold-light: #D4AF6A`, text `#FFFFFF`, muted `rgba(255,255,255,0.55)`, border `rgba(255,255,255,0.12)`, `--radius: 0`.
- Type: system Helvetica stack for body; **one** display font (e.g. self-hosted, subset) for H1/H2 headlines — the "do better" lever over vznrentals. Tight tracking on big headings, wide-tracked 10px uppercase gold eyebrows.
- Primary CTA = white bg / black text, sharp. Ghost CTA = gold hairline.
- Motion: scroll-reveal fade/translate (Framer Motion or CSS), 12px backdrop-blur fixed nav, gold hover transitions. Restraint over spectacle.

## Landing page sections (top → bottom)

Fixed blurred nav → **3D hero** (rotating vehicle, eyebrow + headline with one goldened word + dual CTA + 4-stat credibility strip) → `01 — Why` value props → `02 — Process` numbered steps → `03 — Fleet preview` (3–6 real cars from API + "View full fleet") → `04 — Requirements` → `05 — FAQ` accordion → final CTA band → footer (contact, JSON-LD source).

## 3D hero (the differentiator) — kept lazy

- `@react-three/fiber` + `@react-three/drei`, dynamically imported (`next/dynamic`, `ssr:false`), lazy/Suspense, with a **static poster image fallback** rendered until loaded and for `prefers-reduced-motion`.
- Content: a single rotating glTF car model (or, if no model asset, an abstract gold-wireframe/particle scene). Auto-rotate, subtle camera float, gold rim light on near-black.
- **ponytail: one hero 3D element + static fallback, NOT a WebGL playground.** Known ceiling: pin `three` + `@react-three/fiber` versions and verify no context-loss/invisible-mesh (the FX frontend hit exactly this on three 0.184 — see that project's notes). Upgrade path: add interactivity only if it measurably lifts conversion.

## Fleet inventory (frontend)

- `/fleet` — server-rendered grid from public API. Card: primary image, `year make model`, **weekly_rate** ("$/week"), body_type + transmission + mileage chips, availability badge (status), "View / Reserve" CTA. Filters: body_type, price range, availability. Sort: price, year. Replace the current static-category fallback.
- `/fleet/[id]` — detail: image gallery (swipe/keyboard), full specs, weekly rate + deposit, gig-eligibility note, "Apply to Rent" CTA → existing `vehicle-request` flow (do NOT build a new booking engine).
- Empty state: graceful "fleet updating" message when no `show_on_fleet_page` cars.

## Backend (B)

1. **Multi-image gallery.** New table `vehicle_images` (`id, vehicle_id FK→vehicles, image_key, sort_order, is_primary bool, created_at`). Alembic migration. Keep existing `vehicle.image_key` as the denormalized primary for back-compat (or migrate it into row 0). **ponytail: a table not a JSON column — we need ordering + primary flag + per-image delete; JSON would re-serialize the whole array per edit.**
2. **Public fleet API** (no auth): `GET /api/public/fleet` → list of `is_active AND show_on_fleet_page` vehicles with rate, specs, image URLs; supports `?body_type=&min_rate=&max_rate=&sort=`. `GET /api/public/fleet/{id}` → one vehicle + gallery. Public-read presigned or CDN URLs.
3. **Admin image upload** (auth, reuse `files.py`/S3 service): `POST /api/admin/vehicles/{id}/images` (multipart, validates content-type + size, stores to MinIO), `PATCH` reorder / set-primary, `DELETE /api/admin/vehicles/{id}/images/{image_id}`. New bucket `car-biz-vehicle-images`, **public-read** policy (these are marketing photos, unlike the private KYC buckets).
4. Reuse existing S3 client, settings pattern, validation. Image validation at the boundary (type allowlist jpg/png/webp, max size, strip EXIF).

## SEO

- Next.js `metadata` per route (title/description/OG/twitter). Dynamic per-car metadata on `/fleet/[id]`.
- JSON-LD: site-wide `CarRental` (org/contact/areaServed/priceRange) + per-car `Product`/`Vehicle` + `Offer` (weekly price) on detail pages.
- `app/sitemap.ts` (static pages + every fleet car), `app/robots.ts`. Semantic one-H1-per-page hierarchy. `next/image` for all photos (lazy, sized, AVIF/WebP).

## Error handling

- Fleet API failure → grid shows cached/empty state, never a blank crash (existing pattern already attempts API-with-fallback).
- Image upload → explicit boundary validation, surfaced admin errors, no silent swallow.
- 3D hero load failure / WebGL unavailable → static poster, no broken canvas.

## Testing

- Backend: pytest for fleet list/detail filters + image upload validation (type/size reject) + ordering/primary. One runnable check per non-trivial path.
- Frontend: Playwright (suite already present) — fleet grid renders cards, filter/sort works, detail gallery navigates, 3D hero falls back gracefully with WebGL disabled. Lighthouse SEO + a11y pass on home + fleet.

## Out of scope (later sub-projects)

C email (Proton SMTP), D Chatwoot, E k8s deploy + Cloudflare tunnel, F Kafka/Redpanda (deferred). No new booking/payment engine — reuse existing flows.
