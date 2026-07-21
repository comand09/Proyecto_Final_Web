import { Routes } from "@angular/router";

export const ORG_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/org-config.page").then((m) => m.OrgConfigPageComponent),
  },
];
