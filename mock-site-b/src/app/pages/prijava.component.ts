import { Component, HostListener, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Stranica /prijava sa ugradjenim InfoStone iframe-om (guide §9, demo korak 4)
// U demou: nalepi ID komponente iz InfoStone dashboard-a u EMBED_ID.
const EMBED_ID = 'demo-form';
const EMBED_URL = `http://localhost:3000/api/components/${EMBED_ID}/embed`;

@Component({
  selector: 'app-prijava',
  standalone: true,
  template: `
    <h1>Prijava</h1>
    <iframe [src]="src" [style.height.px]="height()" style="width: 100%; border: 0;" title="Prijava"></iframe>
  `,
})
export class PrijavaComponent {
  src: SafeResourceUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl(EMBED_URL);
  height = signal(400);

  // Auto-height: iframe salje { infostone: true, height } (backend/src/embed/public/common.js)
  @HostListener('window:message', ['$event'])
  onMessage(e: MessageEvent): void {
    if (e.origin === 'http://localhost:3000' && e.data?.infostone) this.height.set(e.data.height);
  }
}
