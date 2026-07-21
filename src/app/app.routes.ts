// Top-level Angular Router configuration. ShipCore uses an in-app SPA
// router service (RouterService) for view switching, but we still expose
// a RouterModule so lazy loading can be wired up if needed in the future.
//
// Each feature module declares its own routes file (e.g. `quotes.routes.ts`)
// that can be lazy-loaded via `loadChildren`.
import { Routes } from "@angular/router";

export const APP_ROUTES: Routes = [
  {
    path: "",
    pathMatch: "full",
    loadComponent: () =>
      import("./features/auth/pages/login.page").then((m) => m.LoginPageComponent),
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./features/dashboard/pages/dashboard.page").then(
        (m) => m.DashboardPageComponent,
      ),
  },
  {
    path: "quotes",
    loadChildren: () =>
      import("./features/quotes/quotes.routes").then((m) => m.QUOTES_ROUTES),
  },
  {
    path: "history",
    loadComponent: () =>
      import("./features/history/pages/history.page").then(
        (m) => m.HistoryPageComponent,
      ),
  },
  {
    path: "carriers",
    loadComponent: () =>
      import("./features/carriers/pages/carriers-list.page").then(
        (m) => m.CarriersListPageComponent,
      ),
  },
  {
    path: "rules",
    loadComponent: () =>
      import("./features/rules/pages/rules-list.page").then(
        (m) => m.RulesListPageComponent,
      ),
  },
  {
    path: "org",
    loadComponent: () =>
      import("./features/org/pages/org-config.page").then(
        (m) => m.OrgConfigPageComponent,
      ),
  },
  { path: "**", redirectTo: "" },
];
