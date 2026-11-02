// Bản web 1 file (không cần server): dùng hash router để mở trực tiếp file index.html.
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import "../src/styles.css";
import { routeTree } from "../src/routeTree.gen";
import { Route as RootRoute } from "../src/routes/__root";

// Shell <html> chỉ dùng cho SSR; bản SPA đã có sẵn trong spa/index.html.
RootRoute.update({ shellComponent: ({ children }: { children: ReactNode }) => <>{children}</> } as never);

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: { queryClient: new QueryClient() },
  scrollRestoration: true,
});

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
