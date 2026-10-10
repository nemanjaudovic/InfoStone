# Struktura projekta InfoStone

Kratak vodič kroz repo: šta se gde nalazi i gde ide novi kod.
Specifikacija proizvoda je u `guide.md`, oblici API-ja u `docs/api-contract.md`, pravila rada u `docs/team-workflow.md`.

## Pregled

| Folder | Šta je | Tehnologija | Port |
|---|---|---|---|
| `backend/` | InfoStone API + stranice za iframe | Node.js, Express, MongoDB (mongoose) | 3000 |
| `frontend/` | InfoStone dashboard za developere organizacija | Angular 19 (standalone) | 4200 |
| `mock-site-a/` | Demo sajt "GDG Hackathon 2025" (plava/tamna tema) | Angular 19 | 4201 |
| `mock-site-b/` | Demo sajt "TechMeet Beograd" (svetla tema) | Angular 19 | 4202 |
| `ai/` | AI servis: Gemma + web search | Python, FastAPI | 8000 |
| `core/` | Postojeći folder, nije deo ovog skeleta | — | — |
| `docs/` | Dokumentacija tima | Markdown | — |
| `uploads/` | Fajlovi iz formi (CV i sl.); sadržaj nije u git-u | — | — |

Kako delovi pričaju međusobno:

```
mock sajt (4201/4202)
   └── <iframe src="localhost:3000/api/components/:id/embed">
                 │
dashboard (4200) ──HTTP + JWT──▶ backend (3000) ──▶ MongoDB
                                     │
                                     └── aiClient.js ──▶ ai/ FastAPI (8000) ──▶ Gemma / web search
```

## Koren repoa

| Fajl | Namena |
|---|---|
| `guide.md` | Specifikacija projekta (koncepti, šeme, rute, pravila, prioriteti) |
| `.gitignore` | Šta ne ide u git: `node_modules/`, `.env`, `dist/`, `.angular/`, sadržaj `uploads/` |
| `.gitattributes` | Svi tekstualni fajlovi sa LF krajem reda (sprečava lažne konflikte Windows/Linux) |
| `requirements.txt` | Python zavisnosti za `ai/` |
| `README.md` | — |

## `backend/` — Express API

```
backend/
  package.json          zavisnosti (express, mongoose, jsonwebtoken, bcryptjs, multer, cors, dotenv, express-rate-limit, chart.js)
  .env.example          primer podešavanja; kopirati u .env (koji nije u git-u)
  src/
    server.js           start: konekcija na MongoDB, pa app.listen
    app.js              SAMO montiranje routera (deljen fajl — menja se uz dogovor)
    config/
      env.js            čitanje .env promenljivih na jednom mestu
      db.js             konekcija na MongoDB
    middleware/
      auth.js           JWT: signToken() i requireAuth
      rateLimit.js      ograničenje AI ruta (10 zahteva/min)
      upload.js         multer: fajlovi iz forme (pdf, docx, slike, max 5MB) i CSS upload
      errorHandler.js   jedinstven format greške { error }
    models/             mongoose šeme (guide.md §5)
      User.js           users
      Component.js      components (uključujući styledHtml)
      CssSource.js      css_sources (sirov CSS organizacije)
      SearchHistory.js  search_history (opciono)
    routes/             jedan fajl po grupi ruta (guide.md §6)
      auth.routes.js         /api/auth          register, login, me
      components.routes.js   /api/components    CRUD komponenti
      css.routes.js          /api/css           upload CSS-a i "Primeni stil" (Gemma spoj)
      submissions.routes.js  /api/submit, /api/submissions   slanje forme, pregled, export
      protected.routes.js    /api/protected     otključavanje sensitive komponenti
      prompt.routes.js       /api/prompt        prompt box (table/graph/search)
      files.routes.js        /api/files         preuzimanje uploadovanih fajlova
      cv.routes.js           /api/cv            analiza CV-a (guide.md §4.5)
      tools.routes.js        /api/tools         AI alati za organizatora (guide.md §4.6)
    services/
      aiClient.js            JEDINO mesto koje zove FastAPI; MOCK_AI=true -> lažni odgovori
      aiMocks.js             lažni odgovori istog oblika kao pravi
      dynamicCollections.js  kolekcija po komponenti: {username}_{type}_{index}
      mongoWhitelist.js      provera Gemma upita (samo dozvoljeni operatori)
    utils/
      http.js                notImplemented (stub 501), asyncHandler, HttpError
    embed/                   stranice koje se prikazuju u <iframe> (guide.md §7.4)
      embed.routes.js        GET /api/components/:id/embed (javno); demo: /api/components/demo-form/embed
      templates/             HTML na serveru
        index.js             rawMarkup() (ulaz za Gemmu) i renderPage() (cela iframe stranica)
        layout.js            okvir stranice + pravila koja dodaje server: watermark, prompt box, config, skripte,
                             čišćenje Gemma izlaza
        form.js              forma sa poljima (text, textarea, checkbox, radio, file)
        tableview.js         tabela
        search.js            AI pretraga interneta
        graph.js             grafikon (Chart.js)
        locked.js            unos šifre za sensitive komponentu
      public/                skripte koje se izvršavaju u browseru, unutar iframe-a (/embed-assets/...)
        common.js            config, api() helper, auto-height preko postMessage
        form.js, tableview.js, search.js, graph.js, locked.js   ponašanje po tipu
```

Stanje: rute su stub-ovi (vraćaju `501` + TODO sa koracima). Rade: `/api/health`, demo iframe, `aiClient` u mock modu, `mongoWhitelist`.

## `frontend/` — InfoStone dashboard (Angular)

```
frontend/
  package.json, angular.json, tsconfig*.json   konfiguracija (port 4200)
  src/
    index.html, main.ts, styles.css
    environments/environment.ts   adrese API-ja (localhost:3000)
    app/
      app.config.ts     router, HttpClient, JWT interceptor
      app.routes.ts     sve rute (deljen fajl — nova ruta = nova linija)
      app.component.ts  gornja navigacija + <router-outlet>
      core/
        models/         TypeScript tipovi koji prate API
          user.model.ts, component.model.ts, submission.model.ts, ai.model.ts
        services/       jedan servis po grupi API ruta
          auth, components, submissions, css, prompt, cv, tools (.service.ts)
        interceptors/auth.interceptor.ts   dodaje JWT u zahteve
        guards/auth.guard.ts               pušta samo ulogovane
      pages/            ekrani (po jedna ruta)
        login, register, dashboard
        component-new        /components/new         wizard za izbor tipa
        component-detail     /components/:id         embed kod, CSS, prijave, prompt test
        component-edit       /components/:id/edit
        cv-analysis          /cv/:componentId        analiza CV-a
        event-tools          /tools                  AI alati za organizatora
      builders/         podešavanje komponente po tipu
        form-builder, tableview-builder, search-builder, graph-builder
      shared/           delovi koji se koriste na više ekrana
        css-uploader       upload CSS-a + "Primeni stil" + preview
        embed-code         <iframe> kod + kopiranje
        prompt-tester      test prompt box-a
        submissions-table  prijave + export CSV/JSON
        graph-view         Chart.js prikaz
```

Svaka komponenta je jedan `.ts` fajl sa inline template-om. Ako template postane veliki, izdvojiti `.html`/`.css` u isti folder.

## `mock-site-a/` i `mock-site-b/` — demo sajtovi organizacija

```
mock-site-x/
  package.json, angular.json, tsconfig*.json
  src/
    styles.css                 CSS sajta — ovaj fajl se u demou uploaduje u InfoStone
    app/
      app.routes.ts            '' (početna) i 'prijava'
      app.component.ts         header sa linkovima
      pages/home.component.ts      početna strana
      pages/prijava.component.ts   <iframe> sa InfoStone komponentom + auto-height
```

U `prijava.component.ts` se u `EMBED_ID` upisuje ID komponente iz dashboard-a (podrazumevano `demo-form`).

## `docs/`

| Fajl | Namena |
|---|---|
| `project-structure.md` | Ovaj fajl |
| `api-contract.md` | Tačni oblici zahteva i odgovora (Express i FastAPI) |
| `team-workflow.md` | Oblasti rada, deljeni fajlovi, git pravila, komande za pokretanje |

## Gde ide novi kod

| Želim da… | Fajl |
|---|---|
| implementiram API rutu | odgovarajući `backend/src/routes/*.routes.js` (popuniti TODO) |
| pozovem Gemmu iz backend-a | `backend/src/services/aiClient.js` (+ mock u `aiMocks.js`) |
| promenim izgled/strukturu iframe-a | `backend/src/embed/templates/<tip>.js` |
| dodam ponašanje u iframe | `backend/src/embed/public/<tip>.js` |
| napravim ekran u dashboard-u | `frontend/src/app/pages/<ekran>/` |
| pozovem API iz dashboard-a | `frontend/src/app/core/services/*.service.ts` |
| dodam polje u bazu | `backend/src/models/*.js` + `frontend/src/app/core/models/*.ts` — uz dogovor tima |
| dodam novu rutu/ekran | `backend/src/app.js` / `frontend/src/app/app.routes.ts` — uz dogovor tima |
| napišem Gemma prompt / FastAPI endpoint | `ai/` |

## Tok "Primeni stil" (forma + CSS organizacije)

1. Developer uploaduje CSS → `POST /api/css/upload` → `css_sources.rawCss`.
2. Klik **Primeni stil** → `POST /api/css/apply` → `templates.rawMarkup(component)` + CSS → `aiClient.styleComponent`
   → FastAPI `/generate-css` → Gemma vrati spoj → `component.styledHtml`.
3. Posetilac otvori iframe → `GET /api/components/:id/embed` → `renderPage()` servira `styledHtml`
   (bez novog poziva Gemme) i dodaje watermark, prompt box pravila, config i skripte.
