# Kitchen Plan Companion

Open a new project for me pulling from this github repo   https://github.com/Redser06/KitchenPlan

It should have everything you need to build out the app, with everything in one place. This has been designed in Claude design and built by GLM-5.2 model. We can refine after the project is enabled.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://plan-genius-ai-53.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7b5a15ba-b916-420f-bd71-4383cc185981).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

`bun run test` runs the walkthrough unit tests. `bun run build` typechecks and builds the app.

The plan toolbar’s **3D** and **Walk** buttons open a WebGL kitchen built from the current plan (or a sample kitchen when the room has fewer than three corners).

- **3D** — drag to orbit, scroll to zoom, click a unit to select it, click the floor to clear the selection.
- **Walk** — click the view to look around, WASD or the arrow keys to move, Shift to move faster, Esc to release the pointer. You start just inside the door, facing the middle of the room.
