// Sve rute aplikacije (guide §8 + AI alati iz dokumenta "AI ideje za dogadjaje").
// PRAVILO: nova ruta = nova linija ovde; postojece linije ne preuredjivati (merge konflikti).
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'components/new', loadComponent: () => import('./pages/component-new/component-new.component').then((m) => m.ComponentNewComponent) },
      { path: 'components/:id', loadComponent: () => import('./pages/component-detail/component-detail.component').then((m) => m.ComponentDetailComponent) },
      { path: 'components/:id/edit', loadComponent: () => import('./pages/component-edit/component-edit.component').then((m) => m.ComponentEditComponent) },
      { path: 'cv/:componentId', loadComponent: () => import('./pages/cv-analysis/cv-analysis.component').then((m) => m.CvAnalysisComponent) },
      { path: 'tools', loadComponent: () => import('./pages/event-tools/event-tools.component').then((m) => m.EventToolsComponent) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
