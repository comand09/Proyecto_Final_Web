// Top-level Angular Router configuration.
import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { roleGuard } from "./core/guards/role.guard";

export const APP_ROUTES: Routes = [
  {
    path: "",
    pathMatch: "full",
    loadComponent: () =>
      import("./features/auth/pages/login.page").then((m) => m.LoginPageComponent),
  },
  {
    path: "dashboard",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/dashboard/pages/dashboard.page").then(
        (m) => m.DashboardPageComponent,
      ),
  },
  {
    path: "quotes",
    canActivate: [authGuard],
    loadChildren: () =>
      import("./features/quotes/quotes.routes").then((m) => m.QUOTES_ROUTES),
  },
  {
    path: "history",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/history/pages/history.page").then(
        (m) => m.HistoryPageComponent,
      ),
  },
  {
    path: "carriers",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/carriers/pages/carriers-list.page").then(
        (m) => m.CarriersListPageComponent,
      ),
  },
  {
    path: "rules",
    canActivate: [authGuard, roleGuard(["admin"])],
    loadComponent: () =>
      import("./features/rules/pages/rules-list.page").then(
        (m) => m.RulesListPageComponent,
      ),
  },
  {
    path: "org",
    canActivate: [authGuard, roleGuard(["admin"])],
    loadComponent: () =>
      import("./features/org/pages/org-config.page").then(
        (m) => m.OrgConfigPageComponent,
      ),
  },
  {
    path: "plan",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/org/components/org-plan.component").then(
        (m) => m.OrgPlanComponent,
      ),
  },
  { path: "**", redirectTo: "" },
];


