import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const KitchenPlanApp = lazy(() => import("@/features/kitchenplan/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KitchenPlan — Design your kitchen" },
      {
        name: "description",
        content:
          "KitchenPlan is a browser-based kitchen planner: sketch the room, place units, appliances and fixtures, and check clearances in 2D, 3D and walk-through views.",
      },
      { property: "og:title", content: "KitchenPlan — Design your kitchen" },
      {
        property: "og:description",
        content:
          "Design a kitchen layout in the browser — rooms, units, appliances, fixtures and clearances.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf7f2",
          color: "#5b4a38",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Loading KitchenPlan…
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <KitchenPlanApp />
    </Suspense>
  );
}
