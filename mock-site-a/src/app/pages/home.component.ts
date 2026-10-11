import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmbedSlotComponent } from '../embed-slot.component';

// Pocetna strana GDG Hackathon-a. Tri mesta za InfoStone iframe-ove:
//  #prijava  -> forma (embeds.ts: form)
//  #ucesnici -> tabela prihvacenih ucesnika (embeds.ts: table)
//  #prostori -> AI pretraga prostora (embeds.ts: search)
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, EmbedSlotComponent],
  template: `
    <!-- HERO -->
    <section class="hero">
      <span class="pill">21–23. novembar 2026 · Hala 3, Beogradski sajam</span>
      <h1>48 sati. 300 developera.<br />Jedan izazov.</h1>
      <p class="lead">
        Najveći studentski hakaton u regionu se vraća. Ove godine gradimo rešenja sa <b>Gemma</b> modelima —
        od asistenata za zajednice do alata koji pomažu organizatorima događaja.
      </p>
      <div class="cta">
        <a routerLink="/" fragment="prijava" class="btn">Prijavi tim</a>
        <a routerLink="/" fragment="agenda" class="btn ghost">Pogledaj agendu</a>
      </div>
      <div class="stats">
        <div><b>48h</b><span>non-stop kodiranja</span></div>
        <div><b>300+</b><span>učesnika</span></div>
        <div><b>25</b><span>mentora</span></div>
        <div><b>1.500.000 RSD</b><span>nagradni fond</span></div>
      </div>
    </section>

    <!-- O NAMA -->
    <section id="o-nama" class="block">
      <h2>O hakatonu</h2>
      <p>
        GDG Hackathon organizuje GDG Belgrade zajednica, uz podršku studentskih organizacija sa ETF-a, FON-a i MATF-a.
        Timovi od 2 do 4 člana imaju 48 sati da od ideje naprave radni prototip, uz pomoć mentora iz industrije.
      </p>
      <div class="grid three">
        <article class="card"><span class="ico">🤝</span><h3>Zajednica</h3><p>Preko 4.000 članova, meetup svakog meseca i Slack sa 1.200 aktivnih developera.</p></article>
        <article class="card"><span class="ico">🧭</span><h3>Mentori</h3><p>Inženjeri iz produktnih kompanija i istraživači koji su tu cele noći — i u 4 ujutru.</p></article>
        <article class="card"><span class="ico">✨</span><h3>AI fokus</h3><p>Pristup Gemma modelima, cloud kreditima i radionica „Od prompta do produkcije“ prvog dana.</p></article>
      </div>
    </section>

    <!-- TRAKOVI -->
    <section id="trakovi" class="block">
      <h2>Trakovi</h2>
      <div class="grid four">
        <article class="card track"><b>AI &amp; Gemma</b><p>Asistenti, agenti i alati nad otvorenim modelima.</p></article>
        <article class="card track"><b>Web &amp; Cloud</b><p>Skalabilni servisi i aplikacije za stvarne korisnike.</p></article>
        <article class="card track"><b>Mobile</b><p>Android i Flutter rešenja za svakodnevne probleme.</p></article>
        <article class="card track"><b>Društveni uticaj</b><p>Tehnologija za obrazovanje, zdravlje i lokalne zajednice.</p></article>
      </div>
    </section>

    <!-- AGENDA -->
    <section id="agenda" class="block">
      <h2>Agenda</h2>
      <ol class="timeline">
        <li><span class="when">Pet 17:00</span><div><b>Registracija i otvaranje</b><p>Preuzimanje bedževa, upoznavanje timova, keynote.</p></div></li>
        <li><span class="when">Pet 19:00</span><div><b>Start! ⏱</b><p>Objava izazova i početak 48 sati.</p></div></li>
        <li><span class="when">Sub 11:00</span><div><b>Radionica: Gemma u praksi</b><p>Prompting, evaluacija i deploy modela.</p></div></li>
        <li><span class="when">Sub 22:00</span><div><b>Pizza &amp; lightning talks</b><p>5 minuta, jedan slajd, bez izgovora.</p></div></li>
        <li><span class="when">Ned 17:00</span><div><b>Kraj kodiranja</b><p>Predaja projekata i demo stolovi.</p></div></li>
        <li><span class="when">Ned 19:00</span><div><b>Finale i dodela nagrada</b><p>Top 8 timova predstavlja pred žirijem.</p></div></li>
      </ol>
    </section>

    <!-- NAGRADE -->
    <section class="block">
      <h2>Nagrade</h2>
      <div class="grid three prizes">
        <article class="card"><span class="place">🥇</span><b>800.000 RSD</b><p>+ inkubacija 3 meseca</p></article>
        <article class="card"><span class="place">🥈</span><b>450.000 RSD</b><p>+ cloud krediti</p></article>
        <article class="card"><span class="place">🥉</span><b>250.000 RSD</b><p>+ mentorski program</p></article>
      </div>
    </section>

    <!-- PRIJAVA (InfoStone forma) -->
    <section id="prijava" class="block">
      <h2>Prijava</h2>
      <p>Prijave su otvorene do <b>10. novembra</b>. Svaki član tima popunjava formu posebno — tim ćete formirati na licu mesta ili ga upišite u motivaciju.</p>
      <app-embed-slot
        key="form"
        kind="forma"
        label="Forma za prijavu na hakaton"
        hint="Ovde ide InfoStone forma za prijavu (ime, email, fakultet, tehnologije, CV), stilizovana CSS-om ovog sajta."
      />
    </section>

    <!-- UCESNICI (InfoStone tabela) -->
    <section id="ucesnici" class="block">
      <h2>Prihvaćeni učesnici</h2>
      <p>Spisak se ažurira kako žiri pregleda prijave.</p>
      <app-embed-slot
        key="table"
        kind="tabela"
        label="Lista prihvaćenih učesnika"
        hint="Ovde ide InfoStone tabela — rezultat AI pretrage nad prijavama (npr. „svi sa iskustvom u Pythonu i ML-u“), sa pretragom i sortiranjem."
      />
    </section>

    <!-- PROSTORI (InfoStone AI search) -->
    <section id="prostori" class="block">
      <h2>Tražimo domaćina za 2027.</h2>
      <p>
        Hakaton raste brže od hale. Ako znaš prostor za 400+ ljudi sa stabilnim internetom i 24h pristupom — javi nam.
        Ili isprobaj našu AI pretragu prostora.
      </p>
      <app-embed-slot
        key="search"
        kind="AI pretraga"
        label="Pretraga prostora za događaje"
        hint="Ovde ide InfoStone AI pretraga interneta — npr. „prostor za 300 ljudi u Beogradu sa Wi-Fi-jem i 24h pristupom“ vraća listu prostora sa linkovima."
      />
    </section>

    <!-- SPONZORI -->
    <section id="sponzori" class="block">
      <h2>Sponzori i partneri</h2>
      <div class="tier"><span>Zlatni</span>
        <div class="logos big"><div class="logo">Nebula Labs</div><div class="logo">Kodoteka</div></div>
      </div>
      <div class="tier"><span>Srebrni</span>
        <div class="logos"><div class="logo">Dunav Cloud</div><div class="logo">Bajt &amp; Bajt</div><div class="logo">Sremska Data</div></div>
      </div>
      <div class="tier"><span>Partneri</span>
        <div class="logos small"><div class="logo">EESTEC LC Beograd</div><div class="logo">FONIS</div><div class="logo">MATF Hub</div><div class="logo">Startap Kafe</div></div>
      </div>
      <p class="sponsor-cta">Želiš da tvoja kompanija bude deo hakatona? Piši na partners&#64;gdgbelgrade.rs.</p>
    </section>

    <!-- FAQ -->
    <section id="faq" class="block">
      <h2>Česta pitanja</h2>
      <details><summary>Da li moram da imam tim?</summary><p>Ne. Možeš se prijaviti sam — prve večeri imamo „team matching“ sesiju.</p></details>
      <details><summary>Koliko košta učešće?</summary><p>Ništa. Hrana, piće i prostor su obezbeđeni za sve učesnike.</p></details>
      <details><summary>Ko je vlasnik projekta?</summary><p>Vi. Sav kod i ideje ostaju timu; sponzori dobijaju samo pravo da vas kontaktiraju.</p></details>
      <details><summary>Šta da ponesem?</summary><p>Laptop, punjač, ličnu kartu i nešto za spavanje ako planiraš da ostaneš preko noći.</p></details>
    </section>
  `,
  styles: [
    `
      :host { display: block; max-width: 1080px !important; margin: 0 auto; padding: 0 24px 40px !important; }
      .hero { padding: 72px 0 48px; }
      .pill { display: inline-block; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--gdg-border); color: var(--gdg-muted); font-size: 13px; margin-bottom: 20px; }
      .hero h1 { font-size: clamp(36px, 6vw, 60px); line-height: 1.05; margin-bottom: 18px; }
      .lead { font-size: 18px; max-width: 640px; }
      .lead b { color: var(--gdg-text); }
      .cta { display: flex; gap: 12px; margin: 26px 0 36px; flex-wrap: wrap; }
      .btn { padding: 13px 26px; border-radius: 999px; background: linear-gradient(90deg, var(--gdg-blue), #5e97f6); color: #fff; font-weight: 700; box-shadow: 0 8px 20px rgba(66, 133, 244, 0.35); }
      .btn:hover { text-decoration: none; }
      .btn.ghost { background: transparent; border: 1px solid var(--gdg-border); box-shadow: none; color: var(--gdg-text); }
      .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
      .stats div { padding: 18px; border: 1px solid var(--gdg-border); border-radius: var(--gdg-radius); background: rgba(19, 48, 94, 0.5); display: flex; flex-direction: column; }
      .stats b { font-size: 24px; color: var(--gdg-text); }
      .stats span { font-size: 13px; color: var(--gdg-muted); }

      .block { padding: 48px 0 8px; scroll-margin-top: 80px; }
      .block > h2 { font-size: 30px; }
      .grid { display: grid; gap: 14px; margin-top: 18px; }
      .grid.three { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
      .grid.four { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .card { padding: 22px; border-radius: var(--gdg-radius); border: 1px solid var(--gdg-border); background: var(--gdg-card); }
      .card h3 { font-size: 18px; margin: 8px 0 6px; }
      .card p { margin: 0; font-size: 14px; }
      .ico { font-size: 26px; }
      .track { border-top: 3px solid var(--gdg-blue); }
      .track:nth-child(2) { border-top-color: var(--gdg-red); }
      .track:nth-child(3) { border-top-color: var(--gdg-yellow); }
      .track:nth-child(4) { border-top-color: var(--gdg-green); }
      .track b { display: block; margin-bottom: 6px; }
      .prizes .card { text-align: center; }
      .prizes b { display: block; font-size: 22px; margin: 6px 0; }
      .place { font-size: 34px; }

      .timeline { list-style: none; padding: 0; margin: 18px 0 0; border-left: 2px solid var(--gdg-border); }
      .timeline li { display: flex; gap: 18px; padding: 0 0 18px 20px; position: relative; }
      .timeline li::before { content: ''; position: absolute; left: -7px; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: var(--gdg-blue); }
      .when { min-width: 92px; color: var(--gdg-blue); font-weight: 700; font-size: 14px; }
      .timeline p { margin: 2px 0 0; font-size: 14px; }

      .tier { display: flex; gap: 18px; align-items: center; margin-top: 16px; flex-wrap: wrap; }
      .tier > span { min-width: 80px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--gdg-muted); }
      .logos { display: flex; gap: 12px; flex-wrap: wrap; flex: 1; }
      .logo { padding: 18px 24px; border: 1px solid var(--gdg-border); border-radius: 10px; background: rgba(255, 255, 255, 0.04); font-weight: 800; letter-spacing: -0.01em; }
      .logos.big .logo { font-size: 22px; padding: 24px 34px; }
      .logos.small .logo { font-size: 13px; font-weight: 600; padding: 12px 16px; color: var(--gdg-muted); }
      .sponsor-cta { margin-top: 18px; }

      details { border: 1px solid var(--gdg-border); border-radius: 10px; padding: 14px 18px; margin-top: 10px; background: rgba(19, 48, 94, 0.4); }
      summary { cursor: pointer; font-weight: 600; }
      details p { margin: 10px 0 0; }
    `,
  ],
})
export class HomeComponent {}
