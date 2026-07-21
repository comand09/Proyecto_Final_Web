import { Routes } from "@angular/router";

export const CARRIERS_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/carriers-list.page").then((m) => m.CarriersListPageComponent),
  },
];
