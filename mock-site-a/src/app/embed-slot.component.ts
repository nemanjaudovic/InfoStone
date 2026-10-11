import { Component, HostListener, OnInit, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EMBED_BASE, EMBEDS } from './embeds';

// Mesto za InfoStone iframe. ID: URL parametar (?form=ID) -> fallback -> embeds.ts.
// Bez ID-a prikazuje prazan prozor sa opisom (za demo: "ovde ce biti ...").
@Component({
  selector: 'app-embed-slot',
  standalone: true,
  template: `
    @if (url) {
      <iframe class="embed-frame" [src]="url" [style.height.px]="height" [title]="label()"></iframe>
    } @else {
      <div class="embed-placeholder">
        <span class="embed-tag">InfoStone · {{ kind() }}</span>
        <strong>{{ label() }}</strong>
        <span class="embed-hint">{{ hint() }}</span>
        <code>embeds.ts → {{ key() }} &nbsp;ili&nbsp; ?{{ key() }}=ID</code>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .embed-frame { display: block; width: 100%; border: 0; }
      .embed-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 220px;
        padding: 28px;
        text-align: center;
        border: 2px dashed currentColor;
        border-radius: 12px;
        opacity: 0.75;
      }
      .embed-tag { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.7; }
      .embed-placeholder strong { font-size: 18px; }
      .embed-hint { font-size: 14px; max-width: 460px; opacity: 0.85; }
      .embed-placeholder code { font-size: 12px; opacity: 0.6; margin-top: 6px; }
    `,
  ],
})
export class EmbedSlotComponent implements OnInit {
  readonly key = input.required<string>();      // form | table | search | id
  readonly kind = input('iframe');               // npr. "forma", "tabela", "AI pretraga"
  readonly label = input('InfoStone komponenta');
  readonly hint = input('');
  readonly fallbackId = input('');

  private sanitizer = inject(DomSanitizer);
  id = '';
  url: SafeResourceUrl | null = null;
  height = 420;

  ngOnInit(): void {
    const fromUrl = new URLSearchParams(window.location.search).get(this.key());
    this.id = fromUrl || this.fallbackId() || EMBEDS[this.key()] || '';
    if (this.id) this.url = this.sanitizer.bypassSecurityTrustResourceUrl(`${EMBED_BASE}/${encodeURIComponent(this.id)}/embed`);
  }

  // Auto-height: svaki iframe salje { infostone, id, height } — slusamo samo svoj
  @HostListener('window:message', ['$event'])
  onMessage(e: MessageEvent): void {
    if (e.origin === 'http://localhost:3000' && e.data?.infostone && e.data.id === this.id && typeof e.data.height === 'number') {
      this.height = e.data.height;
    }
  }
}
