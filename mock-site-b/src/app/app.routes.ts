import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent) },
  { path: 'prijava', loadComponent: () => import('./pages/prijava.component').then((m) => m.PrijavaComponent) },
  { path: '**', redirectTo: '' },
];
