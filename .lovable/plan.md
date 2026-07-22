## Goal

Rebuild the [Redser06/KitchenPlan](https://github.com/Redser06/KitchenPlan) app inside this Lovable project so it runs on the TanStack Start stack, with no functionality loss.

## What the repo actually is

A single-page React + Vite kitchen planner:

- **Stack:** React 18, Zustand 3, TypeScript, plain CSS. No backend, no router, no external UI lib.
- **~2,300 lines** across 11 files.
- **Domain:** polygon rooms, wall fixtures (doors/windows/sockets/lights/water/waste), carcasses with fittings + appliances, furniture, colour schemes, walk mode.
- **UI pieces:** `KitchenCanvas` (main SVG/canvas view), `RoomShapeDesigner`, `BottomBar`, `BottomSheet`, `ContextPanel`, `ExportPanel`.
- **State:** one Zustand store (`useStore.ts`).
- **No persistence, no auth, no server code.**

## Port plan

1. **Dependencies** — add `zustand` (repo uses v3; use current v5 and adjust the store API accordingly).
2. **Route** — replace `src/routes/index.tsx` placeholder with the KitchenPlan app mount, and give it a proper `head()` (title "KitchenPlan", description, og/twitter tags).
3. **Copy source, adapted**, into this project:
   - `src/domain/types.ts` → same path.
   - `src/store/useStore.ts` → same path (Zustand v5 syntax).
   - `src/components/{KitchenCanvas,RoomShapeDesigner,BottomBar,BottomSheet,ContextPanel,ExportPanel}.tsx` → same paths.
   - Content of upstream `App.tsx` → rendered from `routes/index.tsx` as `<KitchenPlanApp />` in `src/features/kitchenplan/App.tsx`.
   - `src/main.tsx` and `index.html` are **not** copied — TanStack Start owns bootstrap.
4. **Styling** — upstream ships a 395-line `index.css` with its own design tokens. Import it as a scoped stylesheet from the KitchenPlan feature (kept separate from `src/styles.css` so it doesn't fight Tailwind tokens). Component classNames stay as-is.
5. **Client-only guardrails** — the canvas uses `window`, `document`, pointer events, and likely `ResizeObserver`. Gate the app with a `ClientOnly` wrapper (dynamic import + hydration guard) so SSR/prerender doesn't crash.
6. **No backend** in this pass. No Lovable Cloud, no auth, no persistence.
7. **Verify** — run the dev build, open `/`, confirm the planner renders and basic interactions (add room, add carcass, open bottom sheet) work; fix any Zustand v3→v5 or SSR fallout.

## Explicitly out of scope (say the word to add later)

- Saving plans to a database / user accounts (would need Lovable Cloud).
- Export to PDF/image beyond what upstream's `ExportPanel` already does.
- Redesign / restyle — this is a faithful port first.
- Mobile-specific polish beyond what upstream already has.

## Technical notes

- Zustand 3 → 5: `create` is now `create<T>()((set, get) => …)`; selectors and `set` API are otherwise compatible for this store's usage. I'll adjust as I copy.
- The route file stays minimal; the app lives in `src/features/kitchenplan/` so future refactors don't touch routing.
- No `src/pages/`, no React Router — everything hangs off the existing `src/routes/index.tsx`.
