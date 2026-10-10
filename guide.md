# InfoStone — Project Specification for AI Code Agents

> **Cilj dokumenta:** Ovaj fajl je namenjen AI coding alatima (Codex, Claude Code, DeepSeek Harness) da razumeju šta treba da naprave. Pročitati u celosti pre generisanja koda.

---

## 1. Projekat u jednoj rečenici

**InfoStone** je SaaS web alat koji omogućava developerima organizacija (npr. GDG) da kroz GUI naprave embeddable komponente (forme, tabele, search, grafikone), spoje ih sa CSS-om svog sajta uz pomoć **Gemma** AI modela, i eksportuju ih kao `<iframe>` koji izgleda kao da je deo njihovog sajta — uz potpunu kontrolu nad prikupljenim podacima, **AI pretragu interneta**, **AI analizu CV-eva** prijavljenih i **AI alate za organizatora** (§4.5, §4.6).

---

## 2. Tech Stack

| Sloj | Tehnologija |
|---|---|
| Frontend (InfoStone alat) | Angular (MEAN) |
| Frontend (mock sajtovi) | Angular, **samo front, bez back-a** |
| Backend (InfoStone) | Node.js + Express |
| AI Backend | Python + FastAPI |
| AI Model | **Gemma** (ne Gemini) |
| Web Search Tool | **Tavily / SerpAPI / Brave Search** (jedan od) |
| Baza | MongoDB (lokalna instanca) — **jedina baza**, bez PostgreSQL / Vector DB / ElasticSearch |
| File storage | Lokalni disk (hackathon) |
| Auth | JWT + bcrypt |
| Hosting | Sve na `localhost`, jedna mašina, različiti portovi |

**Portovi:**
- `4200` — InfoStone Angular front
- `4201` — Mock sajt A (organizacija 1)
- `4202` — Mock sajt B (organizacija 2)
- `3000` — Express API
- `8000` — FastAPI (Gemma wrapper + web search)

---

## 3. Ključni koncepti

### 3.1 Komponenta
Svaka komponenta koju developer napravi ima:
- `owner` (username)
- `type` (`form`, `tableview`, `search`, `graph`)
- `index` (redni broj po tipu za tog korisnika)
- **Svoju MongoDB kolekciju** u formatu: `{username}_{type}_{index}`  
  Primer: `gdg_form_3`, `gdg_tableview_1`, `gdg_search_2`, `gdg_graph_1`

> **Napomena:** `search` komponenta **ne čuva** korisničke podatke u svojoj kolekciji — ona pretražuje **internet** preko web search tool-a. Kolekcija za `search` je opciona i služi samo za čuvanje istorije pretraga ako je potrebno.

### 3.2 Watermark
- Free plan: iframe prikazuje tekstualni watermark **"Powered by InfoStone."** (donji desni ugao).
- Plaćeni plan: watermark se sklanja.

### 3.3 Sensitive Content (zaštićeni iframe)
- Developer može da označi komponentu kao *sensitive*.
- Iframe prikazuje shell sa password poljem.
- Korisnik unese kod → backend validira → vraća token → sadržaj se učita.
- Developer dobija generisanu šifru pri kreiranju.

### 3.4 Prompt Box (SAMO za paid korisnike)
Prompt box je tekstualno polje unutar iframe-a koje omogućava korisniku da **prirodnim jezikom** utiče na ponašanje komponente.

**Pravila po tipu komponente:**

| Tip komponente | Prompt Box | Šta prompt kontroliše |
|---|---|---|
| **Form** | ❌ **NE SME** | — |
| **Table** | ✅ (paid only) | Koje kolone/informacije su prikazane (iz **MongoDB**) |
| **Graph** | ✅ (paid only) | Koje metrike i kategorije su prikazane (iz **MongoDB**) |
| **Search** | ✅ **OBAVEZNO** (paid only) | **Šta AI pretražuje na INTERNETU** |

**Zašto Form ne sme da ima prompt box:**
Forma služi za prikupljanje podataka od strane posetioca. Ako bi posetilac mogao promptom da utiče na formu, to bi značilo da može da menja šta se prikuplja — što narušava integritet podataka i bezbednost. Prompt box ima smisla samo za **prikaz i pretragu** podataka, ne za unos.

**Kako radi tehnički:**
- Prompt box je deo iframe-a (unutar embed-a).
- Kada korisnik unese prompt, iframe šalje zahtev Express-u → Express prosleđuje FastAPI-ju → Gemma interpretira prompt.
- Za **Table/Graph**: Gemma vraća filter/query/sort parametre → Express izvršava upit nad **MongoDB** kolekcijom → vraća rezultat u iframe.
- Za **Search**: Gemma poziva **web search tool** → pretražuje **internet** → sumarizuje i rangira rezultate → vraća ih u iframe.
- Primeri:
  - Table: *"Prikaži samo učesnike koji su iz Beograda i prijavili se posle 1. maja"* → Gemma generiše MongoDB query.
  - Graph: *"Prikaži broj prijava po danu, grupisano po tipu karte"* → Gemma generiše aggregation pipeline.
  - Search: *"Nađi prostore za 200 ljudi u Beogradu ispod 500€"* → **Gemma pretražuje internet** i vraća listu sa linkovima.

**Bezbednost prompt box-a:**
- Gemma **ne izvršava** slobodne MongoDB upite direktno — generiše samo iz whitelist-ovanih operatora.
- Sanitizacija prompta pre slanja Gemmi (sprečiti prompt injection).
- Rate limiting na prompt endpoint (posebno za web search — max 10 pretraga/min).

---

## 4. Tipovi komponenti — detaljno

Ovo je **srce proizvoda**. Svaka komponenta je embeddable kroz `<iframe>` i može da primi CSS organizacije.

### 4.1 Form (Forma)

**Namena:** Prikupljanje podataka od posetilaca sajta (prijave za hackathon, RSVP, kontakt, feedback).

**Polja koja mora da podrži:**
- `text` — kratak tekst (ime, email)
- `textarea` — duži tekst (motivacija, komentar)
- `checkbox` — više opcija, multi-select
- `radio` (bullet) — jedna opcija od više
- `file` — upload (docx, pdf, img, max 5MB)

**Funkcionalnosti:**
- Validacija polja (required, min/max length, email format)
- Submit dugme → podaci idu u `{username}_form_{index}` kolekciju
- Nakon submit-a: poruka zahvalnosti (konfigurabilna)
- Watermark u free planu
- **NEMA prompt box** — forma je za unos, ne za prikaz/pretragu

**Gde se koristi u demou:** Mock sajt GDG hackathona, stranica "Prijava".

---

### 4.2 Table View (Tabelarni prikaz)

**Namena:** Prikaz podataka iz **MongoDB kolekcije** u tabeli (npr. lista prijavljenih učesnika, spisak sponzora).

**Izvor podataka:**
- Podaci iz forme (`{username}_form_{index}`)
- Ručno uneti podaci od strane developera
- Upload CSV-a (opciono, nice-to-have)

**Funkcionalnosti:**
- Sortiranje po koloni (klik na header)
- Paginacija (10/25/50 redova)
- Opciona pretraga kroz tabelu (klasična, ne AI)
- Export CSV/JSON (samo za developera u dashboard-u)
- Watermark u free planu

**Prompt Box (paid only):**
- Korisnik u iframe-u može da unese prompt poput: *"Prikaži samo ljude koji su iz Novog Sada"* ili *"Sakrij email kolonu"*.
- Gemma prevodi prompt u MongoDB query + projekciju kolona.
- Rezultat: tabela se **dinamički menja** bez reload-a stranice.

**Gde se koristi u demou:** Dashboard organizatora prikazuje listu prijavljenih.

---

### 4.3 Search (Pretraga interneta) — **NAJVAŽNIJA KOMPONENTA**

**Namena:** AI-pokretana pretraga **INTERNETA** u realnom vremenu. Korisnik pita prirodnim jezikom, Gemma pretražuje web preko web search tool-a i vraća sažete, rangirane rezultate.

**Ovo NIJE pretraga interne baze.** Search uvek ide na internet.

**Primeri upotrebe:**
- Organizator: *"Nađi prostore za konferenciju u Beogradu za 200 ljudi ispod 500€ po danu"* → AI pretražuje web, vraća listu sa linkovima, cenama, kontaktima gde dostupno.
- Organizator: *"IT kompanije u Srbiji koje sponzorišu tech evente"* → AI pretražuje web, vraća listu kompanija + linkove.
- Učesnik: *"Predavanja o AI-ju na konferencijama u oktobru 2025"* → AI pretražuje web.

**Kako radi:**
1. Korisnik unese prompt u prompt box (obavezno).
2. Iframe šalje prompt Express-u.
3. Express prosleđuje FastAPI-ju.
4. FastAPI poziva **web search tool** (Tavily / SerpAPI / Brave Search).
5. Gemma **sumarizuje i rangira** rezultate.
6. Vraća se: lista `{title, url, snippet, ai_summary}` nazad u iframe.
7. Iframe prikazuje kartice sa linkovima.

**Prompt Box — OBAVEZNO:**
Bez prompta, search nema smisla. Prompt je glavni input.

**Rezultat prikaza:**
- Lista kartica: naslov, AI-generisan sažetak, link, favicon
- Klik → otvara link u novom tabu
- AI summary na vrhu: *"Našao sam 5 prostora koji odgovaraju. Najbolji match je..."*

**Zašto je ovo bitno:**
Ovo nije "još jedan search box". Ovo je **AI agent** koji razume kontekst event organizacije i pretražuje internet u ime organizatora, sa rezultatima koji su već filtrirani i sažeti. To je ono što InfoStone čini platformom, a ne samo widget-om.

**Gde se koristi u demou:** Organizator otvara search → ukuca *"prostor za 150 ljudi u Beogradu do 500€"* → AI pretražuje internet → vraća 3 rezultata sa linkovima i AI summary-jem.

---

### 4.4 Graph View (Grafikon)

**Namena:** Vizuelizacija podataka iz **MongoDB kolekcije** (npr. broj prijava po danu, distribucija po gradu, budžet po kategoriji).

**Tipovi grafikona:**
- Pie chart
- Bar chart
- Line chart (nice-to-have)

**Izvor podataka:**
- Isto kao Table View — iz forme, ručno, ili CSV

**Funkcionalnosti:**
- Automatsko grupisanje po izabranoj koloni
- Legend, tooltips, responsive
- Library: **Chart.js** (Angular integracija)
- Watermark u free planu

**Prompt Box (paid only):**
- Korisnik može da unese: *"Prikaži broj prijava po danu"* ili *"Grupiši po tipu karte, samo za poslednjih 7 dana"*.
- Gemma generiše MongoDB aggregation pipeline.
- Rezultat: grafikon se **dinamički rekonfiguriše**.

**Gde se koristi u demou:** Dashboard prikazuje pie chart "Prijave po gradu".

---

### 4.5 Analiza CV-a (iz dokumenta "AI ideje za događaje")

**Namena:** CV-evi stižu kroz `file` polje forme; Gemma ih analizira sa razumevanjem konteksta (ne samo regex/OCR).

**Funkcionalnosti:**
1. **Obrada podataka** — vidljive i **neizrečene veštine** (Git, REST API, timski rad iz opisa projekata),
   **Project Complexity Score**, **Tech Stack Breadth**, **red flags** (status `ok` / `unverified` / `needs_review`),
   **arhetip** (Passionate Builder, Academic Researcher, Leadership Potential).
2. **Pretraga i selekcija** — semantička pretraga po opisu problema (nalazi i CV-eve bez ključne reči),
   kratko obrazloženje uz svakog kandidata, **Blind Recruiting Mode** (bez imena, pola, slike, fakulteta).
3. **Vrednost za učesnika** — **AI CV Coach & Matcher**: posle prijave privatan izveštaj sa savetima i kompanijama
   na događaju koje odgovaraju profilu (kompanije: `component.schema.companies`).

**Pipeline:** upload PDF → izvlačenje teksta → Gemma (strukturiran JSON) → `cvAnalysis` u submission dokumentu (MongoDB).

### 4.6 AI alati za organizatora (iz dokumenta "AI ideje za događaje")

| Alat | Šta radi | Prioritet |
|---|---|---|
| Marketinški sadržaj | Od par rečenica piše objave za LinkedIn, Instagram, newsletter i opise sesija | NICE |
| Analiza povratnih informacija | Sumira odgovore iz feedback forme u ocenu zadovoljstva + upozorenja ("sala B je zbunjena") | NICE |
| Čet-bot za učesnike (FAQ i logistika) | Odgovara na pitanja o događaju; prati promene satnice | SKIP ako je gusto |
| Preporuka agende i networking | Predlaže sesije i povezuje učesnike sličnih interesovanja | SKIP ako je gusto |

Ovo su alati u dashboard-u (ekran `/tools`), ne novi tipovi komponenti.

---

## 5. MongoDB Šeme

### 5.1 `users`
```json
{
  "_id": ObjectId,
  "username": "gdg",
  "email": "dev@gdg.com",
  "passwordHash": "...",
  "plan": "free" | "paid",
  "createdAt": ISODate
}
```

### 5.2 `components`
```json
{
  "_id": ObjectId,
  "owner": "gdg",
  "type": "form" | "tableview" | "search" | "graph",
  "index": 3,
  "collectionName": "gdg_form_3",
  "title": "Hackathon Prijava",
  "schema": { /* polja forme, definicija kolona, config grafikona */ },
  "sensitive": false,
  "passwordHash": null,
  "promptEnabled": false,
  "cssSourceId": ObjectId,
  "styledHtml": "<style>...</style><form class='infostone-form'>...</form>",
  "createdAt": ISODate
}
```

### 5.3 `css_sources`
```json
{
  "_id": ObjectId,
  "owner": "gdg",
  "originalFilename": "gdg-style.css",
  "rawCss": "...",
  "createdAt": ISODate
}
```

### 5.4 Dinamičke kolekcije (jedna po komponenti)
Za `gdg_form_3`:
```json
{
  "_id": ObjectId,
  "submittedAt": ISODate,
  "data": {
    "fullName": "Marko Marković",
    "email": "marko@example.com",
    "agree": true
  },
  "files": [
    { "field": "cv", "filename": "cv.pdf", "path": "/uploads/...", "size": 204800 }
  ],
  "cvAnalysis": { /* opciono, popunjava AI analiza CV-a (§4.5) */ }
}
```

> **`styledHtml`** = rezultat "Primeni stil" (§7.1): Gemma spoji HTML komponente i CSS organizacije. Upisuje se
> jednom, na klik; embed ruta ga samo servira. Prazan string = stil još nije primenjen (servira se sirov HTML).
> Promena polja komponente (`PUT`) resetuje `styledHtml` na prazno.

### 5.5 `search_history` (opciono)
```json
{
  "_id": ObjectId,
  "componentId": ObjectId,
  "prompt": "prostori u Beogradu za 200 ljudi",
  "results": [
    { "title": "...", "url": "...", "snippet": "..." }
  ],
  "searchedAt": ISODate
}
```

> **Napomena:** Ne postoji seedovana baza `venues` / `sponsors` / `offers` — Search pretražuje **internet**, ne internu bazu.

---

## 6. Express API rute

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login` → JWT
- `GET  /api/auth/me`

### Komponente
- `GET    /api/components`
- `POST   /api/components` — `{type, title, schema, sensitive, promptEnabled}`
- `GET    /api/components/:id`
- `PUT    /api/components/:id` — izmena (ekran `/components/:id/edit`); promena polja resetuje `styledHtml`
- `DELETE /api/components/:id`
- `GET    /api/components/:id/embed` — HTML za iframe (public), vidi §7.4

### CSS / Gemma ("Primeni stil")
- `POST /api/css/upload` — multipart `css` → čuva sirov CSS u `css_sources` → `{cssSourceId}`
- `POST /api/css/apply` — `{componentId, cssSourceId}` → sirov HTML komponente + CSS → FastAPI `/generate-css` → Gemma vrati spoj → upis u `component.styledHtml` → `{styledHtml, notes}`

### Submissions
- `POST /api/submit/:componentId`
- `GET  /api/submissions/:componentId`
- `GET  /api/submissions/:componentId/export?format=csv|json`

### Sensitive
- `POST /api/protected/:componentId/unlock`
- `GET  /api/protected/:componentId/content?token=...`

### Prompt Box (paid only)
- `POST /api/prompt/:componentId` — `{prompt}`
  - Za `tableview`: Gemma → MongoDB query → filtrirani redovi + lista kolona
  - Za `graph`: Gemma → MongoDB aggregation → config grafikona + rezultat
  - Za `search`: Gemma → **web search tool** → **internet pretraga** → rangirani rezultati
  - **Za `form`: 403 Forbidden** (nema prompt box)

### Files
- `GET /api/files/:filename`

### Analiza CV-a (§4.5)
- `POST /api/cv/:componentId/analyze` — analiza svih CV-eva iz forme → `cvAnalysis` u submission-u
- `GET  /api/cv/:componentId/profiles?blind=true` — profili; `blind` uklanja ime, pol, sliku, fakultet
- `POST /api/cv/:componentId/search` — `{query, topK}` → kandidati + kratko obrazloženje
- `POST /api/cv/coach/:submissionId` — `{coachToken}` → saveti za učesnika + kompanije (public)

### AI alati za organizatora (§4.6)
- `POST /api/tools/marketing` — `{notes, channels}` → objave po kanalu
- `POST /api/tools/feedback/:componentId` — analiza odgovora iz feedback forme
- `POST /api/tools/agenda/:componentId` — preporuka agende i networking (NICE)
- `POST /api/tools/faq-chat` — `{faq, schedule, question}` → odgovor

> Detaljni oblici zahteva/odgovora: `docs/api-contract.md`.

---

## 7. FastAPI (Gemma servis)

### 7.1 `POST /generate-css` — spoj HTML-a i CSS-a
**Ulaz:**
```json
{ "component_html": "<form class='infostone-form'>...</form>", "raw_css": "..." }
```
**Izlaz:**
```json
{ "styled_html": "<style>...</style><form class='infostone-form'>...</form>", "notes": "..." }
```
**Uloga:** Kad developer klikne **"Primeni stil"**, Express pošalje Gemmi sirov HTML komponente (forma koju je napravio)
i CSS njegovog sajta. Gemma vraća **spoj ta dva** — stilizovan HTML fragment koji izgleda kao deo sajta organizacije.

**Pravila za Gemmu:**
- Menja samo izgled: zadržava sve `infostone-*` klase, `name` atribute, polja i strukturu (na to se oslanjaju skripte iframe-a).
- Bez `<script>`, bez `<html>/<head>/<body>`; CSS ide u `<style>` na početku fragmenta.

**Kada se zove:** samo na klik. Rezultat se čuva u `component.styledHtml`; iframe ga posle servira **bez** novog poziva Gemme.

### 7.2 `POST /interpret-prompt` (za Table/Graph)
**Ulaz:**
```json
{
  "component_type": "tableview",
  "prompt": "Prikaži samo ljude iz Beograda",
  "available_fields": ["fullName", "email", "city", "submittedAt"],
  "schema_hint": "..."
}
```
**Izlaz:**
```json
{
  "mongo_query": { "data.city": "Beograd" },
  "mongo_projection": { "data.fullName": 1, "data.email": 1 },
  "mongo_sort": null,
  "explanation": "Filtriram po polju city = Beograd"
}
```

**Bezbednost:**
- Gemma **ne generiše** `$where`, `$function`, `$expr` (code execution).
- Whitelist operatora: `$eq, $gt, $lt, $in, $regex, $and, $or`.
- Sanitizacija prompta (max 500 karaktera, no SQL/NoSQL injection patterns).

### 7.3 `POST /web-search` (za Search)
**Ulaz:**
```json
{
  "prompt": "prostori za konferenciju u Beogradu za 200 ljudi ispod 500 eura",
  "max_results": 5
}
```
**Izlaz:**
```json
{
  "summary": "Našao sam 5 prostora koji odgovaraju...",
  "results": [
    { "title": "...", "url": "...", "snippet": "...", "relevance": 0.95 }
  ]
}
```

**Implementacija:**
1. FastAPI poziva web search tool (Tavily / SerpAPI / Brave) sa prompt-om.
2. Dobija top N rezultata sa interneta.
3. Prosleđuje ih Gemmi za sumarizaciju i rangiranje.
4. Vraća strukturiran odgovor Express-u.

**Bezbednost:**
- Sanitizacija prompta (max 500 karaktera).
- Rate limiting (max 10 pretraga/min po korisniku).
- Zaštita od prompt injection-a.

### 7.4 Embed (kako nastaje stranica iframe-a)
Ovo je deo **Express-a**, ne FastAPI-ja; ovde je jer zavisi od §7.1.
- Jedna dinamička ruta `GET /api/components/:id/embed` — nema generisanih fajlova po komponenti.
- Server pročita komponentu i plan vlasnika i vrati HTML: `styledHtml` (ako postoji) ili sirov HTML iz `backend/src/embed/templates/`.
- **Posle Gemme server UVEK sam dodaje pravila** (Gemma ih ne sme kontrolisati): watermark (free), skrivanje prompt box-a
  (form / free), shell za šifru (sensitive), config i skripte; iz Gemma izlaza izbacuje `<script>` i `on*` atribute.
- Ponašanje (submit, sort, prompt, Chart.js, auto-height preko `postMessage`) je u `backend/src/embed/public/*.js`.
- Header `Content-Security-Policy: frame-ancestors *` (bez `X-Frame-Options`), da bi se iframe mogao ugraditi na tuđi sajt.
- `/api/components/demo-form/embed` je ugrađena demo forma (radi i bez baze).

### 7.5 Dodatni FastAPI endpoint-i (§4.5, §4.6)
`/analyze-cv`, `/cv-search`, `/cv-coach`, `/marketing-content`, `/feedback-analysis`, `/agenda-recommend`, `/faq-answer`
— ulaz/izlaz u `docs/api-contract.md` (predlog, potvrđuje AI član tima).

---

## 8. Angular Frontend (InfoStone)

### Rute
- `/login`, `/register`
- `/dashboard`
- `/components/new` — wizard (biraš tip: form/table/search/graph)
- `/components/:id` — pregled, submissions, embed code, prompt test
- `/components/:id/edit`
- `/cv/:componentId` — analiza CV-a za formu (§4.5)
- `/tools` — AI alati za organizatora (§4.6)

### Ključne komponente
- `FormBuilderComponent` — lista polja (text, checkbox, radio, file)
- `TableViewBuilderComponent` — izbor kolona, source kolekcije
- `SearchBuilderComponent` — konfiguracija (max rezultata, filteri sajtova ako podržano)
- `GraphBuilderComponent` — tip grafikona, grupisanje
- `CssUploaderComponent` — upload CSS-a → dugme **"Primeni stil"** (`/api/css/apply`) → preview iframe-a
- `EmbedCodeComponent` — `<iframe src="http://localhost:3000/api/components/:id/embed" />` + copy
- `PromptTesterComponent` — test prompt box unutar dashboard-a
- `SubmissionsTableComponent` — tabela + export
- `GraphViewComponent` — Chart.js
- `CvAnalysisComponent` — profili, blind mode, semantička pretraga
- `EventToolsComponent` — marketing, feedback, FAQ, agenda

---

## 9. Mock sajtovi (samo Angular front)

Dva odvojena Angular projekta na portovima `4201` i `4202`.

**Sajt A:** "GDG Hackathon 2025" — plava/tamna tema.
**Sajt B:** "TechMeet Beograd" — svetla, minimalistička tema.

Svaki sadrži stranicu `/prijava` sa ubačenim `<iframe>`-om.

---

## 10. Folder struktura

```
/InfoStone
  /ai                 (FastAPI + Gemma + web search — AI član tima)
  /core               (postojeći folder, van ovog skeleta)
  /backend            (Express)
    /src
      app.js          (samo montiranje routera)
      /config /middleware /models /routes /services /utils
      /embed          (iframe stranice: embed.routes.js, /templates, /public)
  /frontend           (Angular — InfoStone, port 4200)
  /mock-site-a        (Angular, port 4201)
  /mock-site-b        (Angular, port 4202)
  /docs               (api-contract.md, team-workflow.md)
  /uploads            (u .gitignore, osim .gitkeep)
  guide.md
```

---

## 11. Demo Flow

1. Otvori mock sajt A → Prijava → vidi se ružna Google-Forma (baseline).
2. InfoStone → login kao `gdg`.
3. Kreira **formu** (Ime, Email, CV, checkbox) → upload `gdg-style.css` → **Primeni stil** → Gemma spoji HTML forme i CSS.
4. Kopira `<iframe>` → zalepi u mock sajt A → refresh → forma identična sajtu.
5. Popuni formu kao guest → submit → podaci u dashboard-u.
6. Kreira **tableview** → prikazuje prijave → u iframe-u ukuca prompt *"samo ljudi iz Beograda"* → tabela se filtrira.
7. Kreira **search** → ukuca *"prostor za 150 ljudi u Beogradu do 500€"* → **AI pretražuje internet** → vraća listu sa linkovima i AI summary-jem.
8. (Bonus) **Analiza CV-a**: profili prijavljenih, blind mode, pretraga "treba mi backend sa iskustvom u obradi podataka".
9. (Bonus) Kreira **graph** → pie chart prijava po gradu.
10. (Bonus) Kreira **sensitive** iframe → password lock.
11. (Bonus) Watermark nestaje nakon upgrade-a na paid.

---

## 12. Oblasti rada — 4 osobe, 10h

> Dužnosti još **nisu raspodeljene** (osim `ai/` foldera). Imena se upisuju u `docs/team-workflow.md`,
> gde su i pravila protiv merge konflikata.

| Oblast | Folder | Odgovornost |
|---|---|---|
| Backend API | `backend/` (osim `embed/`) | auth, komponente, submissions, dinamičke kolekcije, prompt endpoint, file upload, CSS apply, `/api/cv`, `/api/tools` |
| InfoStone front | `frontend/` | login, dashboard, builder-i, CSS uploader + "Primeni stil", embed code, prompt tester, CV analiza, AI alati |
| AI servis | `ai/` | FastAPI + Gemma: §7.1–7.3, §7.5, prompt sanitizacija |
| Embed + demo | `backend/src/embed/`, `mock-site-a/`, `mock-site-b/` | iframe stranice (§7.4), `postMessage` auto-height, mock sajtovi, demo scenario |

**Zajednički:** API kontrakt (`docs/api-contract.md`) pre kodiranja, MongoDB šeme, finalni demo.

---

## 13. Pravila za AI Code Agente

1. **Ne izmišljaj nove tehnologije.** Stack je zaključan.
2. **Ne dodaj OAuth/Auth0** — samo JWT.
3. **Svaka komponenta = sopstvena MongoDB kolekcija.**
4. **Gemma, ne Gemini.**
5. **Iframe je izolovan** — stil ulazi samo preko Gemma spoja (`styledHtml`, §7.1); Gemma se zove samo na klik "Primeni stil", nikad pri učitavanju iframe-a.
6. **Watermark "Powered by InfoStone."** u free planu.
7. **Sve na `localhost`.**
8. **Angular standalone komponente** (Angular 17+).
9. **Prompt Box pravila:**
   - Form → **NIKAD** prompt box.
   - Table/Graph → prompt box samo za **paid** korisnike → Gemma → **MongoDB query**.
   - Search → prompt box **obavezan** za paid korisnike → Gemma → **web search tool** → **internet**.
10. **Gemma ne izvršava slobodne Mongo upite** — samo whitelist operatori.
11. **Search NIKAD ne pretražuje internu bazu** — uvek **internet** preko web search tool-a.
12. **Kod mora biti čitljiv**, kratki komentari.
13. **Pravila posle Gemme dodaje server** (watermark, prompt box, sensitive, skripte) — nikad se ne prepuštaju Gemma izlazu.
14. **Ne menjati strukturu projekta i deljene fajlove** (`app.js`, `app.routes.ts`, `package.json`, `models/`) bez dogovora tima.

---

## 14. Prioriteti (ako ponestane vremena)

**MUST:**
- Auth (register/login)
- Forma (text/checkbox/file) + CSS upload + Gemma mapping
- Iframe embed + watermark
- Submissions u MongoDB + tabela + CSV export
- **Search sa prompt box-om (web search)** (glavni diferencijator)
- Analiza CV-a: obrada + profili + blind mode (§4.5)

**NICE:**
- Table View sa prompt box-om
- Graph (pie/bar) sa prompt box-om
- Sensitive iframe sa password-om
- CV semantička pretraga i CV Coach
- Marketinški sadržaj, analiza feedback-a

**SKIP ako je gusto:**
- Napredna validacija forme
- Plaćanje / plan management UI
- Line chart
- CSV import za tabele
- FAQ čet-bot, preporuka agende

---

**Kraj specifikacije.**
