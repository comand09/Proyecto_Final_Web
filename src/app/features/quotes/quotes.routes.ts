import { Routes } from "@angular/router";

export const QUOTES_ROUTES: Routes = [
  {
    path: "new",
    loadComponent: () =>
      import("./pages/quote-form.page").then((m) => m.QuoteFormPageComponent),
  },
  {
    path: "results/:id",
    loadComponent: () =>
      import("./pages/quote-results.page").then((m) => m.QuoteResultsPageComponent),
  },
  {
    path: "detail/:id",
    loadComponent: () =>
      import("./pages/quote-detail.page").then((m) => m.QuoteDetailPageComponent),
  },
];
