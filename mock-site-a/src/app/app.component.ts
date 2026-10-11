import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header>
      <a routerLink="/" class="brand">PARTY<i class="pulse"></i>RADAR</a>
      <nav>
        <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Početna</a>
        <a routerLink="/tabela" routerLinkActive="on">Tabela</a>
      </nav>
    </header>
    <router-outlet />
    <footer>
      <span>© 2026 PARTY RADAR · nađi žurku po svom ukusu</span>
      <span class="sep">·</span>
      <span>techno · house · dnb · sve</span>
    </footer>
  `,
  styles: [
    `
      header {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 14px 28px;
        background: rgba(8, 6, 15, 0.75);
        backdrop-filter: blur(14px);
        border-bottom: 1px solid var(--pr-border);
      }
      .brand {
        font-size: 19px;
        font-weight: 900;
        letter-spacing: 0.06em;
        color: var(--pr-text);
        background: linear-gradient(92deg, var(--pr-pink), var(--pr-violet), var(--pr-cyan));
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .pulse {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--pr-lime);
        box-shadow: 0 0 12px var(--pr-lime);
        animation: blink 1.6s ease-in-out infinite;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.25; }
      }
      nav { display: flex; gap: 8px; align-items: center; }
      nav a {
        color: var(--pr-muted);
        font-size: 14px;
        font-weight: 700;
        padding: 8px 16px;
        border-radius: 999px;
      }
      nav a:hover { color: var(--pr-text); background: rgba(255, 255, 255, 0.06); }
      nav a.on {
        color: #0b0614;
        background: linear-gradient(92deg, var(--pr-lime), var(--pr-cyan));
      }
      footer {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding: 22px 24px;
        margin-top: 60px;
        border-top: 1px solid var(--pr-border);
        color: var(--pr-muted);
        font-size: 12px;
        letter-spacing: 0.06em;
      }
      .sep { opacity: 0.5; }
    `,
  ],
})
export class AppComponent {}
