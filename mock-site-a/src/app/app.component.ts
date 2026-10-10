import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <a routerLink="/">GDG Hackathon 2025</a>
      <a routerLink="/prijava">Prijava</a>
    </header>
    <router-outlet />
  `,
  styles: [`header { display: flex; gap: 1rem; padding: 1rem; }`],
})
export class AppComponent {}
