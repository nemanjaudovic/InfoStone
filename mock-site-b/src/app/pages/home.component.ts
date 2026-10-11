import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmbedSlotComponent } from '../embed-slot.component';

// Pocetna strana TechMeet Beograd meetupa. Tri mesta za InfoStone iframe-ove:
//  #prijava   -> forma (embeds.ts: form)
//  #ko-dolazi -> tabela registrovanih (embeds.ts: table)
//  #govornici -> AI pretraga govornika (embeds.ts: search)
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, EmbedSlotComponent],
  template: `
    <!-- HERO -->
    <section class="hero">
      <p class="kicker">Meetup #42 · četvrtak, 19. novembar 2026 · 18:00 · Dorćol Hub</p>
      <h1>AI u produkciji: šta stvarno radi</h1>
      <p class="lead">
        Tri predavanja, jedna panel diskusija i mnogo pitanja bez slajdova. Teme: evaluacija LLM-ova,
        troškovi inferencije i kako Gemma modeli izgledaju van demo okruženja.
      </p>
      <div class="cta">
        <a routerLink="/" fragment="prijava" class="btn">Rezerviši mesto</a>
        <span class="seats">Ostalo još <b>37</b> od 120 mesta</span>
      </div>
    </section>

    <!-- O MEETUPU -->
    <section class="block">
      <h2>O meetupu</h2>
      <p>
        TechMeet je nastao 2017. kao druženje pet backend developera u kafani na Dorćolu. Danas je to mesečni
        susret 100+ ljudi iz industrije i sa fakulteta — bez marketinških prezentacija i bez kotizacije.
      </p>
      <div class="facts">
        <div><b>42</b><span>održana meetupa</span></div>
        <div><b>3.100</b><span>članova zajednice</span></div>
        <div><b>130+</b><span>predavanja</span></div>
      </div>
    </section>

    <!-- PROGRAM -->
    <section id="program" class="block">
      <h2>Program večeri</h2>
      <table class="program">
        <tr><td class="t">18:00</td><td><b>Okupljanje</b> — kafa, upoznavanje, nalepnice</td></tr>
        <tr><td class="t">18:30</td><td><b>„Eval pre deploy-a“</b> — kako merimo da li je model dovoljno dobar · <i>Jovana Radić</i></td></tr>
        <tr><td class="t">19:10</td><td><b>„Koliko košta jedan token“</b> — inferencija na sopstvenom hardveru · <i>Petar Ilić</i></td></tr>
        <tr><td class="t">19:50</td><td><b>„Gemma na telefonu“</b> — on-device modeli u realnoj aplikaciji · <i>Mila Stanković</i></td></tr>
        <tr><td class="t">20:30</td><td><b>Panel + pitanja publike</b></td></tr>
        <tr><td class="t">21:15</td><td><b>Networking</b> — pica i priče do zatvaranja</td></tr>
      </table>
    </section>

    <!-- GOVORNICI -->
    <section id="govornici" class="block">
      <h2>Govornici</h2>
      <div class="speakers">
        <article class="speaker"><div class="avatar">JR</div><b>Jovana Radić</b><span>ML inženjerka, fintech</span><p>Gradi sisteme za evaluaciju modela koji obrađuju milione transakcija.</p></article>
        <article class="speaker"><div class="avatar">PI</div><b>Petar Ilić</b><span>Platform inženjer</span><p>Vodi GPU klaster i zna tačno koliko košta svaki upit.</p></article>
        <article class="speaker"><div class="avatar">MS</div><b>Mila Stanković</b><span>Android developerka</span><p>Prebacila je AI funkcije iz clouda direktno na uređaj korisnika.</p></article>
      </div>

      <h3 class="sub">Tražimo govornike za 2027.</h3>
      <p>Imaš ideju koga bismo trebali da pozovemo? Isprobaj AI pretragu govornika iz regiona.</p>
      <app-embed-slot
        key="search"
        kind="AI pretraga"
        label="Pretraga govornika"
        hint="Ovde ide InfoStone AI pretraga interneta — npr. „stručnjak za evaluaciju LLM-ova iz Srbije koji drži predavanja“ vraća listu govornika sa linkovima."
      />
    </section>

    <!-- PRIJAVA (InfoStone forma) -->
    <section id="prijava" class="block">
      <h2>Prijava</h2>
      <p>Ulaz je besplatan, ali mesta su ograničena. Potvrdu i podsetnik šaljemo dan pre meetupa.</p>
      <app-embed-slot
        key="form"
        kind="forma"
        label="Forma za rezervaciju mesta"
        hint="Ovde ide InfoStone forma za prijavu (ime, email, kompanija/fakultet, šta te najviše zanima), stilizovana CSS-om ovog sajta."
      />
    </section>

    <!-- KO DOLAZI (InfoStone tabela) -->
    <section id="ko-dolazi" class="block">
      <h2>Ko dolazi</h2>
      <p>Javni spisak prijavljenih koji su pristali da budu na listi.</p>
      <app-embed-slot
        key="table"
        kind="tabela"
        label="Spisak prijavljenih"
        hint="Ovde ide InfoStone tabela — rezultat AI pretrage nad prijavama (npr. „samo oni koji rade u industriji“), sa pretragom i sortiranjem."
      />
    </section>

    <!-- ARHIVA -->
    <section id="arhiva" class="block">
      <h2>Prethodni meetupi</h2>
      <ul class="archive">
        <li><span>#41</span><b>Rust u backend-u: godinu dana kasnije</b><i>oktobar 2026</i></li>
        <li><span>#40</span><b>Observability bez bankrota</b><i>septembar 2026</i></li>
        <li><span>#39</span><b>Letnje izdanje: lightning talks na krovu</b><i>jul 2026</i></li>
        <li><span>#38</span><b>Kako smo migrirali monolit (i preživeli)</b><i>jun 2026</i></li>
      </ul>
    </section>

    <!-- PARTNERI -->
    <section id="partneri" class="block">
      <h2>Partneri</h2>
      <p>Bez njih ne bi bilo pice, prostora ni snimaka predavanja.</p>
      <div class="partners">
        <div>Dorćol Hub</div><div>Pixelbrod</div><div>Mašina Data</div><div>Kafeterija Kod</div><div>Ćirilica Cloud</div>
      </div>
    </section>

    <!-- NEWSLETTER -->
    <section class="block newsletter">
      <h2>Ne propusti sledeći</h2>
      <p>Jedan mejl mesečno: tema, govornici i link za prijavu. Bez spama, obećavamo.</p>
      <div class="nl-row"><span class="fake-input">tvoj email</span><span class="fake-btn">Prijavi me</span></div>
    </section>
  `,
  styles: [
    `
      :host { display: block; max-width: 880px !important; margin: 0 auto; padding: 24px 24px 40px !important; }
      .hero { padding: 40px 0 24px; text-align: center; }
      .kicker { font-style: normal; text-transform: uppercase; letter-spacing: 0.16em; font-size: 12px; color: var(--tm-accent); }
      .hero h1 { font-size: clamp(34px, 5.5vw, 52px); }
      .hero h1::after { margin: 14px auto 0; }
      .lead { font-size: 18px; max-width: 620px; margin: 0 auto; }
      .cta { display: flex; gap: 18px; justify-content: center; align-items: center; margin-top: 26px; flex-wrap: wrap; }
      .btn { padding: 12px 26px; background: var(--tm-accent); color: var(--tm-card) !important; border: 0 !important; font-weight: 700; box-shadow: 5px 5px 0 var(--tm-accent-dark); }
      .btn:hover { transform: translate(2px, 2px); box-shadow: 3px 3px 0 var(--tm-accent-dark); }
      .seats { font-size: 14px; color: var(--tm-muted); }
      .seats b { color: var(--tm-ink); }

      .block { padding: 40px 0 4px; scroll-margin-top: 20px; }
      .block > h2 { font-size: 26px; border-bottom: 1px solid var(--tm-line); padding-bottom: 8px; }
      .sub { margin-top: 30px; font-size: 18px; }

      .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 16px; }
      .facts div { background: var(--tm-card); border: 1px solid var(--tm-line); box-shadow: 6px 6px 0 rgba(47, 36, 24, 0.08); padding: 16px; text-align: center; display: flex; flex-direction: column; }
      .facts b { font-size: 28px; color: var(--tm-accent); }
      .facts span { font-size: 13px; color: var(--tm-muted); font-style: italic; }

      .program { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .program td { padding: 12px 8px; border-bottom: 1px dotted var(--tm-line); vertical-align: top; }
      .program .t { width: 70px; font-weight: 700; color: var(--tm-accent); }

      .speakers { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 16px; }
      .speaker { background: var(--tm-card); border: 1px solid var(--tm-line); box-shadow: 6px 6px 0 rgba(47, 36, 24, 0.08); padding: 20px; display: flex; flex-direction: column; gap: 4px; }
      .avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--tm-paper-2); border: 2px solid var(--tm-accent); display: grid; place-items: center; font-weight: 700; margin-bottom: 8px; }
      .speaker span { font-size: 13px; color: var(--tm-accent); }
      .speaker p { margin: 6px 0 0; font-size: 14px; }

      .archive { list-style: none; padding: 0; margin: 12px 0 0; }
      .archive li { display: flex; gap: 14px; align-items: baseline; padding: 10px 0; border-bottom: 1px dotted var(--tm-line); flex-wrap: wrap; }
      .archive span { font-weight: 700; color: var(--tm-accent); min-width: 36px; }
      .archive i { margin-left: auto; color: var(--tm-muted); font-size: 13px; }

      .partners { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
      .partners div { padding: 14px 22px; border: 1px solid var(--tm-line); background: var(--tm-card); font-weight: 700; font-style: italic; }

      .newsletter { text-align: center; }
      .nl-row { display: flex; justify-content: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
      .fake-input { min-width: 260px; padding: 10px 4px; border-bottom: 2px solid var(--tm-line); color: var(--tm-muted); font-style: italic; text-align: left; }
      .fake-btn { padding: 10px 20px; border: 1px solid var(--tm-accent); color: var(--tm-accent); font-weight: 700; }
    `,
  ],
})
export class HomeComponent {}
