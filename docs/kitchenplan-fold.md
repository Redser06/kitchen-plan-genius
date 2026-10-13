# KitchenPlan fold

Source: [Redser06/KitchenPlan](https://github.com/Redser06/KitchenPlan) `main` at `44fc9a2c2f01aec12f98a6556abcf3f9f577e7aa` (22 Jul 2026, “Fix package.json versions to match installed, relax tsconfig for Lovable deployment”).

Compared with a read-only clone. That repository was left on `main` at the same commit. Nothing was pushed, archived, or deleted there.

kitchen-plan-genius already contains the KitchenPlan planner (see `.lovable/plan.md` and the README). This fold copies only logic that was still trapped inside components, and records the rest.

## Ported in this change

| Source                                                       | Destination                                            | What moved                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/RoomShapeDesigner.tsx` (`generateRoomShape`) | `src/domain/room-shape.ts` (`startingRoomShape`)       | Rectangle, L, U, and galley outlines from a short description, including the 4200×3200 mm default, the `m x m` / `m × m` parse, and the 2400 mm galley cap. The room-shape panel calls this function. |
| `src/components/KitchenCanvas.tsx` (place-carcass wall snap) | `src/domain/placement.ts` (`snapCarcassToNearestWall`) | 400 mm wall snap, 50 mm grid, wall-angle rotation, and a half-depth inset along the wall's inward normal. Placing a floor carcass still passes depth 600 mm.                                          |

Tests: `src/domain/room-shape.test.ts`, `src/domain/placement.test.ts`.

## Already present

These KitchenPlan files already live here. They were compared at the source commit and were not copied again.

| Source                                 | Here                                                                  | Difference that stays                                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/types.ts`                  | `src/domain/types.ts`                                                 | `ViewMode` and `SheetTab` are also exported.                                                                                                       |
| `src/store/useStore.ts`                | `src/store/useStore.ts`                                               | Zustand 5. Analysis, history, and persistence live in `src/domain/`. The sample room, six carcasses, dining table, and fixtures are the same data. |
| `src/components/BottomBar.tsx`         | `src/components/BottomBar.tsx`                                        | Identical.                                                                                                                                         |
| `src/components/ContextPanel.tsx`      | `src/components/ContextPanel.tsx`                                     | Identical.                                                                                                                                         |
| `src/components/BottomSheet.tsx`       | `src/components/BottomSheet.tsx`                                      | Same catalogues (fittings, appliances, palettes, fixtures). Ceiling height records one history step per gesture.                                   |
| `src/components/KitchenCanvas.tsx`     | `src/components/KitchenCanvas.tsx`                                    | 2D plan, drag, rotate handle, and fixture placement. 3D and Walk render `src/features/walkthrough/`.                                               |
| `src/components/RoomShapeDesigner.tsx` | `src/components/RoomShapeDesigner.tsx`                                | Same corner, wall-length, and wall-angle editing. The shape field is labelled “Starting shape”.                                                    |
| `src/components/ExportPanel.tsx`       | `src/components/ExportPanel.tsx`                                      | Print / PDF, JSON download, and session version history.                                                                                           |
| `src/index.css`                        | `src/features/kitchenplan/kitchenplan.css`                            | Same tokens and layout. `ai-*` classes are `resize-room-*`. Fonts load from `src/routes/__root.tsx`.                                               |
| `src/App.tsx`                          | `src/features/kitchenplan/App.tsx`, mounted by `src/routes/index.tsx` | Header, shortcuts, import/export, and new-design flow. Autosave uses `kitchenplan-design-v3`.                                                      |

Later modules that replace inlined KitchenPlan behaviour, with tests already in the tree:

- `src/domain/analysis.ts` and `src/domain/geometry.ts` — daylight, work triangle, walkway, plumbing, sockets. Centres follow cabinet rotation.
- `src/domain/history.ts` — undo, redo, and gesture commits.
- `src/domain/design-io.ts` — validated JSON import and local save.
- `src/features/kitchenplan/resizeRoom.ts` — header field scales the current outline only.
- `src/features/walkthrough/` — orbit and first-person views, door spawn, minimap, cabinet fronts.

## Intentionally skipped

- **Share link and collaborators** in `src/components/ExportPanel.tsx` and `src/store/useStore.ts` (`shareLinkPublic`, `collaborators`, `inviteCollaborator`). The link is the fixed string `https://kitchenplan.app/d/8f2a91` and the people list never leaves the browser. This app keeps designs in `localStorage` only.
- **Header “Design” prompt** in `src/App.tsx` (`AIPromptBar`). It waits, then resizes when the text contains `Nm x Nm`, and otherwise tells you to use Room shape. `resizeRoom` does the resize and refuses layout sentences such as “4m x 3m L-shape with an island”.
- **SVG isometric 3D and waypoint Walk** in `src/components/KitchenCanvas.tsx` (`iso`, `boxFaces`, `computeWaypoints`, `walkIndex`). Walk steps through Entrance, overview, sink, and dining on a flat drawing. The WebGL walkthrough starts inside the door and walks freely, with its own minimap.
- **Bootstrap:** `index.html`, `src/main.tsx`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `package.json`. TanStack Start owns the shell. This repo is React 19, Zustand 5, Vite 8, and Bun; KitchenPlan is React 18.3.1, Zustand 3.7.2, and Vite 5.4.21.
- **`public/favicon.svg`.** Navy and pink mark. This app serves `public/favicon.ico` from the root route.
- **No docs or tests** ship in KitchenPlan, so none were copied. This README and the existing Vitest files stay.
- **Modules deleted inside KitchenPlan before this commit**, at `ccc237f` (“Full rebuild…”), parent `50c9b71`: `src/ai/designBuilder.ts`, `src/ai/types.ts`, `src/domain/catalog.ts`, `src/engine/geometry.ts`, `src/engine/flowAnalyzer.ts`, `src/engine/lightCalculator.ts`. They use a different model (walls with ids, openings, islands, nested fittings). The checks that the rebuild kept are the v3 analysis already in `src/domain/analysis.ts`. The old coastal swatch `#DSC0909` is not a colour. The mock designer is the general AI designer this README leaves out.
