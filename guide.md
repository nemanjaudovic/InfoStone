# InfoStone — Project Specification for AI Code Agents

> **Cilj dokumenta:** Ovaj fajl je namenjen AI coding alatima (Codex, Claude Code, DeepSeek Harness) da razumeju šta treba da naprave. Pročitati u celosti pre generisanja koda.

---

## 1. Projekat u jednoj rečenici

**InfoStone** je SaaS web alat koji omogućava developerima organizacija (npr. GDG) da kroz GUI naprave embeddable komponente (forme, tabele, search, grafikone), primene CSS svog sajta na njih uz pomoć **Gemma** AI modela, i eksportuju ih kao `<iframe>` koji izgleda kao da je deo njihovog sajta — uz potpunu kontrolu nad prikupljenim podacima i AI pretragu.

---

## 2. Tech Stack

| Sloj | Tehnologija |
|---|---|
| Frontend (InfoStone alat) | Angular (MEAN) |
| Frontend (mock sajtovi) | Angular, **samo front, bez back-a** |
| Backend (InfoStone) | Node.js + Express |
| AI Backend | Python + FastAPI |
| AI Model | **Gemma** (ne Gemini) |
| Baza | MongoDB (lokalna instanca) |
| File storage | Lokalni disk (hackathon) |
| Auth | JWT + bcrypt |
| Hosting | Sve na `localhost`, jedna mašina, različiti portovi |

**Portovi (predlog):**
- `4200` — InfoStone Angular front
- `4201` — Mock sajt A (organizacija 1)
- `4202` — Mock sajt B (organizacija 2)
- `3000` — Express API
- `8000` — FastAPI (Gemma wrapper)

---

## 3. Ključni koncepti

### 3.1 Komponenta
Svaka komponenta koju developer napravi ima:
- `owner` (username)
- `type` (`form`, `tableview`, `search`, `graph`)
- `index` (redni broj po tipu za tog korisnika)
- **Svoju MongoDB kolekciju** u formatu: `{username}_{type}_{index}`  
  Primer: `gdg_form_3`, `gdg_tableview_1`, `gdg_search_2`, `gdg_graph_1`

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
| **Table** | ✅ (paid only) | Koje kolone/informacije su prikazane |
| **Graph** | ✅ (paid only) | Koje metrike i kategorije su prikazane |
| **Search** | ✅ **OBAVEZNO** (paid only) | Šta AI pretražuje i kako rangira rezultate |

**Zašto Form ne sme da ima prompt box:**
Forma služi za prikupljanje podataka od strane posetioca. Ako bi posetilac mogao promptom da utiče na formu, to bi značilo da može da menja šta se prikuplja — što narušava integritet podataka i bezbednost. Prompt box ima smisla samo za **prikaz i pretragu** podataka, ne za unos.

**Kako radi tehnički:**
- Prompt box je deo iframe-a (unutar embed-a).
- Kada korisnik unese prompt, iframe šalje zahtev Express-u → Express prosleđuje FastAPI-ju → Gemma interpretira prompt i vraća **filter/query/sort parametre** ili **JSON strukturu**.
- Express izvršava upit nad MongoDB kolekcijom i vraća rezultat nazad u iframe.
- Primeri:
  - Table: *"Prikaži samo učesnike koji su iz Beograda i prijavili se posle 1. maja"* → Gemma generiše MongoDB query.
  - Graph: *"Prikaži broj prijava po danu, grupisano po tipu karte"* → Gemma generiše aggregation pipeline.
  - Search: *"Nađi prostore za 200 ljudi u Beogradu ispod 500€"* → Gemma pretražuje bazu i rangira rezultate.

**Bezbednost prompt box-a:**
- Gemma **ne izvršava** slobodne MongoDB upite direktno — generiše samo iz whitelist-ovanih operatora.
- Sanitizacija prompta pre slanja Gemmi (sprečiti prompt injection).
- Rate limiting na prompt endpoint.

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

**Namena:** Prikaz podataka iz MongoDB kolekcije u tabeli (npr. lista prijavljenih učesnika, spisak sponzora).

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

### 4.3 Search (Pretraga) — **NAJVAŽNIJA KOMPONENTA**

**Namena:** AI-pokretana pretraga strukturiranih podataka u bazi InfoStone-a. Ovo je **glavni diferencijator** proizvoda — nije obična pretraga, nije Google, već pretraga nad **kuriranom bazom** koju su popunili drugi organizatori i sponzori.

**Primeri upotrebe:**
- Organizator traži: *"Prostor u Beogradu za 200 ljudi, do 500€, dozvoljen alkohol, parking"* → AI pretražuje bazu prostora.
- Organizator traži: *"Sponzori iz IT industrije koji su ranije sponzorisali tech evente u Srbiji"* → AI pretražuje bazu sponzora.
- Učesnik traži: *"Predavanja o AI-ju na konferenciji"* → AI pretražuje sesije.

**Šta Search pretražuje:**
- **Baza prostora** (venues) — kapacitet, cena, lokacija, pogodnosti (parking, alkohol, AV oprema)
- **Baza sponzora** (sponsors) — industrija, budžet, prethodni eventi, kontakt
- **Baza ponuda** (offers) — popusti, paketi, specijalne ponude
- **Bilo koja korisnička kolekcija** — developer može da definiše šta se pretražuje

**Prompt Box — OBAVEZNO:**
- Search **mora** da ima prompt box. Bez njega, search nema smisla.
- Korisnik unosi prirodnim jezikom šta traži.
- Gemma:
  1. Parsira upit
  2. Identifikuje entitete (lokacija, cena, kapacitet, industrija)
  3. Generiše MongoDB query (ili vector search ako je semantička pretraga)
  4. Rangira rezultate po relevantnosti
  5. Vraća strukturirane rezultate u iframe

**Rezultat prikaza:**
- Lista kartica sa ključnim informacijama
- Klik na karticu → detalji (modal ili nova stranica unutar iframe-a)
- Kontakt info (email/telefon) — vidljivo samo paid korisnicima

**Zašto je ovo bitno:**
Ovo nije "još jedan search box". Ovo je **AI matchmaking između organizatora i resursa**. To je ono što InfoStone čini platformom, a ne samo widget-om.

**Gde se koristi u demou:** Organizator otvara search → ukuca *"prostor za 150 ljudi u Beogradu"* → AI vraća 3 rezultata sa cenama i kontaktima.

---

### 4.4 Graph View (Grafikon)

**Namena:** Vizuelizacija podataka iz MongoDB kolekcije (npr. broj prijava po danu, distribucija po gradu, budžet po kategoriji).

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
  "generatedCss": "....",
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
  "generatedCss": "...",
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
  ]
}
```

### 5.5 `venues`, `sponsors`, `offers` (seedovane baze za Search demo)
```json
// venues
{
  "_id": ObjectId,
  "name": "Impact Hub Beograd",
  "city": "Beograd",
  "capacity": 150,
  "pricePerDay": 400,
  "currency": "EUR",
  "amenities": ["parking", "wifi", "projector", "alcohol_allowed"],
  "contactEmail": "info@impacthub.rs",
  "tags": ["tech", "startup", "workshop"]
}
```

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
- `DELETE /api/components/:id`
- `GET    /api/components/:id/embed` — HTML za iframe (public)

### CSS / Gemma
- `POST /api/css/upload` — multipart → FastAPI → `generatedCss`
- `POST /api/css/apply` — `{componentId, cssSourceId}`

### Submissions
- `POST /api/submit/:componentId`
- `GET  /api/submissions/:componentId`
- `GET  /api/submissions/:componentId/export?format=csv|json`

### Sensitive
- `POST /api/protected/:componentId/unlock`
- `GET  /api/protected/:componentId/content?token=...`

### Prompt Box (paid only)
- `POST /api/prompt/:componentId` — `{prompt}` → Gemma → MongoDB query → rezultat
  - Za `tableview`: vraća filtrirane redove + listu kolona
  - Za `graph`: vraća aggregation rezultat + config grafikona
  - Za `search`: vraća rangirane rezultate iz `venues`/`sponsors`/`offers`
  - **Za `form`: 403 Forbidden** (nema prompt box)

### Files
- `GET /api/files/:filename`

---

## 7. FastAPI (Gemma servis)

### 7.1 `POST /generate-css`
**Ulaz:**
```json
{ "raw_css": "...", "component_html_skeleton": "<form class='infostone-form'>..." }
```
**Izlaz:**
```json
{ "generated_css": "...", "notes": "..." }
```
**Uloga:** Mapira klase iz korisnikovog `.css` na InfoStone HTML skeleton.

### 7.2 `POST /interpret-prompt`
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

**Za `search` tip:** Gemma umesto Mongo query-ja vraća **rangiranu listu** rezultata iz seedovanih baza — koristi semantičko razumevanje upita.

**Bezbednost:**
- Gemma **ne generiše** `$where`, `$function`, `$expr` (code execution).
- Whitelist operatora: `$eq, $gt, $lt, $in, $regex, $and, $or`.
- Sanitizacija prompta (max 500 karaktera, no SQL/NoSQL injection patterns).

---

## 8. Angular Frontend (InfoStone)

### Rute
- `/login`, `/register`
- `/dashboard`
- `/components/new` — wizard (biraš tip: form/table/search/graph)
- `/components/:id` — pregled, submissions, embed code, prompt test
- `/components/:id/edit`

### Ključne komponente
- `FormBuilderComponent` — lista polja (text, checkbox, radio, file)
- `TableViewBuilderComponent` — izbor kolona, source kolekcije
- `SearchBuilderComponent` — izbor baze (venues/sponsors/offers), polja za pretragu
- `GraphBuilderComponent` — tip grafikona, grupisanje
- `CssUploaderComponent` — upload + preview
- `EmbedCodeComponent` — `<iframe src="http://localhost:3000/api/components/:id/embed" />` + copy
- `PromptTesterComponent` — test prompt box unutar dashboard-a
- `SubmissionsTableComponent` — tabela + export
- `GraphViewComponent` — Chart.js

---

## 9. Mock sajtovi (samo Angular front)

Dva odvojena Angular projekta na portovima `4201` i `4202`.

**Sajt A:** "GDG Hackathon 2025" — plava/tamna tema.
**Sajt B:** "TechMeet Beograd" — svetla, minimalistička tema.

Svaki sadrži stranicu `/prijava` sa ubačenim `<iframe>`-om.

---

## 10. Folder struktura

```
/infostone
  /frontend           (Angular — InfoStone)
  /backend            (Express)
  /ai-service         (FastAPI + Gemma)
  /mock-site-a        (Angular)
  /mock-site-b        (Angular)
  /uploads
  /seed               (JSON fajlovi za venues, sponsors, offers)
  README.md
```

---

## 11. Demo Flow

1. Otvori mock sajt A → Prijava → vidi se ružna Google-Forma (baseline).
2. InfoStone → login kao `gdg`.
3. Kreira **formu** (Ime, Email, CV, checkbox) → upload `gdg-style.css` → Apply Style → Gemma generiše CSS.
4. Kopira `<iframe>` → zalepi u mock sajt A → refresh → forma identična sajtu.
5. Popuni formu kao guest → submit → podaci u dashboard-u.
6. Kreira **tableview** → prikazuje prijave → u iframe-u ukuca prompt *"samo ljudi iz Beograda"* → tabela se filtrira.
7. Kreira **search** → ukuca *"prostor za 150 ljudi u Beogradu do 500€"* → AI vraća 3 rezultata sa kontaktima.
8. (Bonus) Kreira **graph** → pie chart prijava po gradu.
9. (Bonus) Kreira **sensitive** iframe → password lock.
10. (Bonus) Watermark nestaje nakon upgrade-a na paid.

---

## 12. Podela posla — 4 osobe, 10h

| Osoba | Odgovornost |
|---|---|
| **A** | Express: auth, komponente, submissions, dinamičke kolekcije, prompt endpoint, file upload |
| **B** | Angular InfoStone: login, dashboard, builder-i (form/table/search/graph), CSS uploader, embed code, prompt tester |
| **C** | FastAPI + Gemma: `/generate-css`, `/interpret-prompt`, seed baze (venues/sponsors/offers), prompt sanitizacija |
| **D** | Mock sajtovi (2x Angular) + iframe integracija + `postMessage` auto-height + demo scenario + seed podaci |

**Zajednički:** API kontrakt pre kodiranja, MongoDB šeme, finalni demo.

---

## 13. Pravila za AI Code Agente

1. **Ne izmišljaj nove tehnologije.** Stack je zaključan.
2. **Ne dodaj OAuth/Auth0** — samo JWT.
3. **Svaka komponenta = sopstvena MongoDB kolekcija.**
4. **Gemma, ne Gemini.**
5. **Iframe je izolovan** — CSS ulazi samo preko Gemma mappinga.
6. **Watermark "Powered by InfoStone."** u free planu.
7. **Sve na `localhost`.**
8. **Angular standalone komponente** (Angular 17+).
9. **Prompt Box pravila:**
   - Form → **NIKAD** prompt box.
   - Table/Graph/Search → prompt box samo za **paid** korisnike.
   - Search → prompt box je **obavezan**.
10. **Gemma ne izvršava slobodne Mongo upite** — samo whitelist operatori.
11. **Kod mora biti čitljiv**, kratki komentari.

---

## 14. Prioriteti (ako ponestane vremena)

**MUST:**
- Auth (register/login)
- Forma (text/checkbox/file) + CSS upload + Gemma mapping
- Iframe embed + watermark
- Submissions u MongoDB + tabela + CSV export
- **Search sa prompt box-om** (glavni diferencijator)

**NICE:**
- Table View sa prompt box-om
- Graph (pie/bar) sa prompt box-om
- Sensitive iframe sa password-om

**SKIP ako je gusto:**
- Napredna validacija forme
- Plaćanje / plan management UI
- Line chart
- CSV import za tabele

---

**Kraj specifikacije.**