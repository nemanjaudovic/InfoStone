import { Component } from '@angular/core';
import { EmbedSlotComponent } from '../embed-slot.component';
import { EMBEDS } from '../embeds';

// /prijava?id=<componentId> — pregled bilo koje InfoStone komponente (dugme "Open on mock site" u dashboard-u).
// Bez ?id prikazuje formu iz embeds.ts, a ako ni nje nema — ugradjenu demo formu.
@Component({
  selector: 'app-prijava',
  standalone: true,
  imports: [EmbedSlotComponent],
  template: `
    <h1>Prijava</h1>
    <app-embed-slot key="id" kind="iframe" label="InfoStone komponenta" [fallbackId]="fallback" />
  `,
})
export class PrijavaComponent {
  fallback = EMBEDS['form'] || 'demo-form';
}
