import { Routes } from "@angular/router";

export const AUTH_ROUTES: Routes = [
  {
    path: "login",
    loadComponent: () =>
      import("./pages/login.page").then((m) => m.LoginPageComponent),
  },
];
