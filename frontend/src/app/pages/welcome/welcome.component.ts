import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside
        class="sidebar"
        [class.open]="open"
        [class.pinned]="pinned"
        (mouseenter)="hovering = true"
        (mouseleave)="hovering = false"
      >
        <div class="brand-row">
          <span class="brand">InfoStone</span>
          <button
            type="button"
            class="pin"
            (click)="pinned = !pinned"
            [attr.title]="pinned ? 'Unpin sidebar' : 'Pin sidebar'"
            [attr.aria-label]="pinned ? 'Unpin sidebar' : 'Pin sidebar'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>

        <div class="divider"></div>

        <section class="menu">
          <div class="menu-head">Elements</div>
          <nav class="menu-links">
            <a routerLink="/welcome/elements/form" routerLinkActive="active" title="Form">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span class="label">Form</span>
            </a>
            <a routerLink="/welcome/elements/table" routerLinkActive="active" title="Table">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
                <line x1="12" y1="3" x2="12" y2="21"></line>
              </svg>
              <span class="label">Table</span>
            </a>
            <a routerLink="/welcome/elements/graph" routerLinkActive="active" title="Graph">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span class="label">Graph</span>
            </a>
            <a routerLink="/welcome/elements/search" routerLinkActive="active" title="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span class="label">Search</span>
            </a>
          </nav>
        </section>

        <div class="divider"></div>

        <section class="menu">
          <div class="menu-head">Developer Tools</div>
          <nav class="menu-links">
            <a routerLink="/welcome/tools/query" routerLinkActive="active" title="Query">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
              <span class="label">Query</span>
            </a>
            <a routerLink="/welcome/tools/tables" routerLinkActive="active" title="Tables">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
              <span class="label">Tables</span>
            </a>
          </nav>
        </section>
      </aside>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .shell { display: flex; height: 100vh; }

      .sidebar {
        width: 48px;
        flex: 0 0 auto;
        height: 100vh;
        background: var(--surface);
        border-right: 1px solid var(--border);
        padding: 16px 8px;
        overflow-y: auto;
        overflow-x: hidden;
        transition: width 0.18s ease;
      }
      .sidebar.open { width: 240px; }

      /* Kada nije otvoren: vidi se samo pin dugme (bez praznih linija) */
      .sidebar:not(.open) .brand,
      .sidebar:not(.open) .divider,
      .sidebar:not(.open) .menu { display: none; }
      .sidebar:not(.open) .brand-row { justify-content: center; }

      .brand-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .brand { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; white-space: nowrap; padding-left: 8px; }

      .pin {
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: 0;
        border-radius: 8px;
        color: var(--text-muted);
        flex-shrink: 0;
      }
      .pin:hover { background: var(--surface-2); color: var(--text); }
      .sidebar.pinned .pin { background: var(--surface-2); color: var(--accent); }
      .pin svg { width: 18px; height: 18px; }

      .divider { height: 1px; background: var(--border); margin: 12px 4px; }

      .menu { margin-bottom: 4px; }
      .menu-head {
        padding: 8px 10px;
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        white-space: nowrap;
      }

      .menu-links { display: flex; flex-direction: column; gap: 2px; margin-top: 2px; }
      .menu-links a {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px 8px 20px; /* uvlacenje stavki ispod naslova sekcije */
        border-radius: 6px;
        color: var(--text);
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
      }
      .menu-links a:hover { background: var(--surface-2); }
      .menu-links a.active { background: var(--accent-strong); color: #fff; }
      .menu-links svg { width: 18px; height: 18px; flex-shrink: 0; }

      .content { flex: 1; min-width: 0; overflow-y: auto; padding: 28px; }
    `,
  ],
})
export class WelcomeComponent {
  pinned = false;
  hovering = false;

  // Otvoren kad je pinovan ILI kad je kursor iznad (flyover), inace skupljen u uzak rail.
  get open(): boolean {
    return this.pinned || this.hovering;
  }
}
