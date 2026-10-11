import { Component } from '@angular/core';
import { EmbedSlotComponent } from '../embed-slot.component';

// Stranica /tabela: prikaz unosa iz forme (muzicki ukus posetilaca).
//  key="table" -> InfoStone tabela koja cita {owner}_form_N kolekciju
@Component({
  selector: 'app-tabela',
  standalone: true,
  imports: [EmbedSlotComponent],
  template: `
    <!-- HERO -->
    <section class="hero">
      <p class="tag">✧ ko šta sluša</p>
      <h1>ZVUCI<br /><span class="grad-text">NARODA.</span></h1>
      <p class="lead">
        Sve prijave iz forme na jednom mestu — ko šta sluša, odakle je i koliko je spreman da plati kartu.
      </p>
    </section>

    <!-- TABELA -->
    <section class="stage">
      <div class="stage-head">
        <span class="num">03</span>
        <div>
          <h2>Tabela prijava</h2>
          <p>Uživo iz baze — osvežava se kako pristižu nove prijave.</p>
        </div>
      </div>
      <app-embed-slot
        key="table"
        kind="tabela"
        label="Tabela: sve prijave"
        hint="Ovde ide InfoStone tabela koja prikazuje unose iz forme (žanrovi, izvođači, grad, budžet)."
      />
    </section>
  `,
})
export class TabelaComponent {}
