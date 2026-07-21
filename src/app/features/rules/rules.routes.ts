import { Routes } from "@angular/router";

export const RULES_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/rules-list.page").then((m) => m.RulesListPageComponent),
  },
];
