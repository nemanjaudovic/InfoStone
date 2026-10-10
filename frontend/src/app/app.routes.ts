// Rute aplikacije: landing (login) + welcome shell sa bocnim menijem.
// Nema auth guard-a dok se ne implementiraju korisnici — login uvek vodi na /welcome.
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.component').then((m) => m.WelcomeComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', loadComponent: () => import('./pages/overview/overview.component').then((m) => m.OverviewComponent) },
      // Elements
      { path: 'elements/form', loadComponent: () => import('./pages/elements/form/form.component').then((m) => m.FormComponent) },
      { path: 'elements/table', loadComponent: () => import('./pages/elements/table/table.component').then((m) => m.TableComponent) },
      { path: 'elements/graph', loadComponent: () => import('./pages/elements/graph/graph.component').then((m) => m.GraphComponent) },
      { path: 'elements/search', loadComponent: () => import('./pages/elements/search/search.component').then((m) => m.SearchComponent) },
      // Developer Tools
      { path: 'tools/query', loadComponent: () => import('./pages/tools/query/query.component').then((m) => m.QueryComponent) },
      { path: 'tools/tables', loadComponent: () => import('./pages/tools/tables/tables.component').then((m) => m.TablesComponent) },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
