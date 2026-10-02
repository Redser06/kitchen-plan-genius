# KitchenPlan

Browser-based kitchen planner. Sketch a room, place cabinets, appliances, furniture, and fixtures, then review the same layout in 2D or in a WebGL kitchen.

Designs stay in this browser. Nothing is uploaded.

## Develop

Install [Bun](https://bun.sh). Dependencies are locked in `bun.lock`.

```sh
bun install
bun run dev
```

```sh
bun run test
bun run build
```

`bun run dev` starts the Vite dev server. `bun run test` runs Vitest (`vitest run`): the walkthrough scene tests and the planner persistence and resize tests. `bun run build` produces a production build.

## Controls

The header switches **2D**, **3D**, and **Walk**.

- **2D** is the top-down plan. Click a unit to select it, drag to move it, and drag the rotate handle (or press `R`) to turn it. `Delete` or `Backspace` removes the selection. `Escape` clears the selection and closes panels. Undo and redo are in the header (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Y` or `Ctrl/Cmd+Shift+Z`). `+` and `−` zoom the plan. To pan, open **Components**, choose **Pan**, and drag the canvas.
- **3D** opens a WebGL view of the current plan. Drag to orbit, scroll to zoom, click a unit to select it, and click the floor to clear the selection.
- **Walk** is first-person in that same kitchen. You start just inside the door, facing the middle of the room. Click the view to look around, then use WASD or the arrow keys to move. Shift moves faster. Esc releases the pointer. A small map shows where you are. While the pointer is locked, plan shortcuts such as undo stay out of the way.

If the room has fewer than three corners, 3D and Walk show a sample kitchen until the outline is usable. An empty room still walks, and tells you to place units on the 2D plan.

**Room shape** edits the floor polygon: drag corners, double-click a wall to add a corner, or set a wall’s length and angle. The header field labeled **Resize room** only scales the current outline to a size such as `5m x 4m`. It does not generate a new layout.

The bottom bar opens **Components** (cabinets and furniture), **Measure**, **Materials**, **Fixtures** (doors, windows, sockets, plumbing, lights), and **Analysis** (work triangle, walkway, daylight, plumbing).

The download button saves `kitchen-design.json`. The print button opens **Export**, which can print or save a PDF, download the same JSON, and restore an earlier version from this browser session. A JSON file can also be imported from the header.

## Persistence

Edits are written to `localStorage` under `kitchenplan-design-v3` after a short pause, and again when the page is hidden so a quick refresh keeps the last change. **Saved locally** appears after a successful write. Reloading restores that design, including the room outline. Clearing site data for this origin deletes it.

## Not in this app

- Accounts, cloud save, or shared links
- Live collaboration or email invites
- A general AI designer. Room resize accepts a size only; room shape is edited by hand (the Room shape panel can start a rectangle, L, U, or galley outline from a short description, then you adjust the corners)
