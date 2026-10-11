import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <a routerLink="/">GDG Hackathon 2026</a>
      <nav>
        <a routerLink="/" fragment="o-nama">O nama</a>
        <a routerLink="/" fragment="agenda">Agenda</a>
        <a routerLink="/" fragment="ucesnici">Učesnici</a>
        <a routerLink="/" fragment="prostori">Prostori</a>
        <a routerLink="/" fragment="sponzori">Sponzori</a>
        <a routerLink="/" fragment="prijava" class="nav-cta">Prijavi se</a>
      </nav>
    </header>
    <router-outlet />
    <footer class="site-footer">
      <div class="foot-cols">
        <div>
          <strong>GDG Belgrade</strong>
          <span>Google Developer Group zajednica u Beogradu. Meetup-i, radionice i hakatoni od 2014.</span>
        </div>
        <div>
          <strong>Kontakt</strong>
          <span>hackathon&#64;gdgbelgrade.rs</span>
          <span>Hala 3, Beogradski sajam</span>
        </div>
        <div>
          <strong>Prati nas</strong>
          <span>LinkedIn · Instagram · YouTube</span>
        </div>
      </div>
      <p class="foot-copy">© 2026 GDG Belgrade · Kodeks ponašanja · Privatnost</p>
    </footer>
  `,
  styles: [
    `
      nav { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
      nav a { font-size: 14px; opacity: 0.85; }
      /* GDG CSS boji "prvi link u header-u" gradijentom (logo) — ne i prvi link menija */
      nav a:first-child { background: none; -webkit-background-clip: border-box; background-clip: border-box; color: var(--gdg-text); font-size: 14px; font-weight: 600; margin-right: 0; }
      .nav-cta { padding: 8px 16px; border-radius: 999px; background: var(--gdg-blue); color: #fff !important; opacity: 1 !important; }
      .site-footer { border-top: 1px solid var(--gdg-border); margin-top: 40px; padding: 36px 32px 24px; background: rgba(11, 29, 58, 0.6); }
      .foot-cols { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
      .foot-cols div { display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: var(--gdg-muted); }
      .foot-cols strong { color: var(--gdg-text); }
      .foot-copy { max-width: 1080px; margin: 24px auto 0; font-size: 12px; }
    `,
  ],
})
export class AppComponent {}
