import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent) },
  { path: 'tabela', loadComponent: () => import('./pages/tabela.component').then((m) => m.TabelaComponent) },
  { path: 'prijava', redirectTo: '' }, // stari link iz InfoStone builder-a
  { path: '**', redirectTo: '' },
];
