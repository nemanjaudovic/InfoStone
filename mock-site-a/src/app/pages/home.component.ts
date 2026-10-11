import { Component } from '@angular/core';
import { EmbedSlotComponent } from '../embed-slot.component';

// Pocetna strana PARTY RADAR-a. Dva mesta za InfoStone iframe-ove:
//  key="form"   -> forma: tvoj muzicki ukus (zanrovi, izvodjaci, grad, budzet)
//  key="search" -> AI pretraga zurki po ukusu
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [EmbedSlotComponent],
  template: `
    <!-- HERO -->
    <section class="hero">
      <p class="tag">✧ party search · beograd · 2026</p>
      <h1>NAĐI ŽURKU<br /><span class="grad-text">PO SVOM UKUSU.</span></h1>
      <p class="lead">
        Ispuni formu o svom muzičkom ukusu, a radar pretražuje internet i vraća žurke koje zvuče kao ti.
        Bez skrolovanja, bez fejk listi — samo zvuk koji tražiš.
      </p>
    </section>

    <!-- FORMA -->
    <section class="stage">
      <div class="stage-head">
        <span class="num">01</span>
        <div>
          <h2>Tvoj zvuk</h2>
          <p>Omiljeni žanrovi, izvođači, grad i budžet za kartu — 30 sekundi, ništa više.</p>
        </div>
      </div>
      <app-embed-slot
        key="form"
        kind="forma"
        label="Forma: tvoj muzički ukus"
        hint="Ovde ide InfoStone forma (žanrovi, izvođači, grad, budžet), stilizovana CSS-om ovog sajta."
      />
    </section>

    <!-- SEARCH -->
    <section class="stage">
      <div class="stage-head">
        <span class="num">02</span>
        <div>
          <h2>Radar za žurke</h2>
          <p>Ukucaj šta tražiš — AI pretražuje internet umesto tebe i vraća samo ono što paše.</p>
        </div>
      </div>
      <app-embed-slot
        key="search"
        kind="AI pretraga"
        label="AI pretraga žurki"
        hint="Ovde ide InfoStone AI pretraga interneta — npr. „techno žurka u Beogradu ovog vikenda, ulaz do 1500 rsd“."
      />
    </section>
  `,
})
export class HomeComponent {}
