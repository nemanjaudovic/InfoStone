// Rute aplikacije: login/registracija + welcome shell sa bocnim menijem.
// /welcome je dostupan samo ulogovanima (JWT iz /api/auth, cuva ga AuthService).
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent) },
  {
    path: 'welcome',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/welcome/welcome.component').then((m) => m.WelcomeComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', loadComponent: () => import('./pages/overview/overview.component').then((m) => m.OverviewComponent) },
      // Elements
      { path: 'elements/form', loadComponent: () => import('./pages/elements/form/form.component').then((m) => m.FormComponent) },
      { path: 'elements/table', loadComponent: () => import('./pages/elements/table/table.component').then((m) => m.TableComponent) },
      { path: 'elements/chatbot', loadComponent: () => import('./pages/elements/chatbot/chatbot.component').then((m) => m.ChatbotComponent) },
      { path: 'elements/search', loadComponent: () => import('./pages/elements/search/search.component').then((m) => m.SearchComponent) },
      // Developer Tools
      { path: 'tools/query', loadComponent: () => import('./pages/tools/query/query.component').then((m) => m.QueryComponent) },
      { path: 'tools/tables', loadComponent: () => import('./pages/tools/tables/tables.component').then((m) => m.TablesComponent) },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
