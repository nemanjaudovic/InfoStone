import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav class="topbar">
      <a routerLink="/dashboard">InfoStone</a>
      <a routerLink="/components/new">Nova komponenta</a>
      <a routerLink="/tools">AI alati</a>
    </nav>
    <main><router-outlet /></main>
  `,
  styles: [`.topbar { display: flex; gap: 1rem; padding: .75rem 1rem; border-bottom: 1px solid #ddd; }`],
})
export class AppComponent {}
