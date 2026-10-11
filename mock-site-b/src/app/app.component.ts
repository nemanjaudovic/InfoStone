import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <a routerLink="/">TechMeet Beograd</a>
      <a routerLink="/" fragment="program">Program</a>
      <a routerLink="/" fragment="govornici">Govornici</a>
      <a routerLink="/" fragment="prijava">Prijava</a>
      <a routerLink="/" fragment="arhiva">Arhiva</a>
      <a routerLink="/" fragment="partneri">Partneri</a>
    </header>
    <router-outlet />
    <footer class="site-footer">
      <p class="foot-brand">TechMeet Beograd<span>.</span></p>
      <p>Mesečni meetup za ljude koji prave softver. Svakog trećeg četvrtka, od 2017.</p>
      <p class="foot-small">zdravo&#64;techmeet.rs · Dorćol Hub, Dubrovačka 35 · Kodeks ponašanja</p>
    </footer>
  `,
  styles: [
    `
      header { display: flex; align-items: baseline; justify-content: center; gap: 28px; padding: 20px 24px 14px; flex-wrap: wrap; }
      /* Tacka posle logotipa ide samo na prvi link (logo), ne na ostale */
      header a:not(:first-child)::after { content: none; }
      .site-footer { margin-top: 56px; padding: 36px 24px 28px; text-align: center; border-top: 4px solid var(--tm-accent); background: var(--tm-card); }
      .site-footer p { margin: 0 0 6px; }
      .foot-brand { font-size: 20px; font-weight: 700; font-style: italic; color: var(--tm-ink); }
      .foot-brand span { color: var(--tm-accent); }
      .foot-small { font-size: 13px; }
    `,
  ],
})
export class AppComponent {}
