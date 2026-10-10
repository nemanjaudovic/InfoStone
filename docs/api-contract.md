# API kontrakt

Osnova je `guide.md` §5–§7. Ovde su dodate rute za ideje iz dokumenta **"AI ideje za dogadjaje"**
(Analiza CV-a i AI alati za organizatora). Express vraca **camelCase**, FastAPI koristi **snake_case**
(konverziju radi Express u `aiClient`/rutama).

> Baza ostaje **MongoDB** (stack je zakljucan, guide §13.1). PostgreSQL/Vector DB/ElasticSearch iz
> dokumenta se ne uvode; CV analiza se cuva u submission dokumentu kao polje `cvAnalysis`.

## Express (port 3000)

### Iz guide.md §6
Auth, Komponente, Submissions, Sensitive, Prompt Box, Files – vidi `guide.md` §6.
Dodato: `PUT /api/components/:id` (za ekran `/components/:id/edit`; promena polja resetuje `styledHtml`).

### CSS / Gemma – "Primeni stil"
| Metoda | Ruta | Body | Odgovor |
|---|---|---|---|
| POST | `/api/css/upload` | multipart `css` | `{ cssSourceId }` |
| POST | `/api/css/apply` | `{ componentId, cssSourceId }` | `{ styledHtml, notes }` |

`apply`: sirov HTML komponente (`embed/templates` → `rawMarkup`) + sirov CSS → Gemma → spoj se cuva u
`component.styledHtml`. Gemma se zove **samo na klik**; iframe servira sacuvan rezultat.

### Embed
`GET /api/components/:id/embed` – javna HTML stranica za `<iframe>`; `demo-form` je ugradjena demo komponenta.
Sadrzaj: `component.styledHtml` (ako postoji) ili sirov HTML. Server posle Gemme uvek sam dodaje: watermark (free),
skrivanje prompt box-a (form / free), shell za sifru (sensitive), config i skripte, i izbacuje `<script>`/`on*` iz Gemma izlaza.
Iframe salje roditelju `postMessage({ infostone: true, id, height })`.

### Analiza CV-a – `/api/cv`
| Metoda | Ruta | Auth | Body / query | Odgovor |
|---|---|---|---|---|
| POST | `/api/cv/:componentId/analyze` | JWT | – | `{ analyzed }` |
| GET | `/api/cv/:componentId/profiles` | JWT | `?blind=true` | `CvProfile[]` |
| POST | `/api/cv/:componentId/search` | JWT | `{ query, topK }` | `[{ submissionId, score, reason }]` |
| POST | `/api/cv/coach/:submissionId` | javno + `coachToken` | `{ coachToken }` | `{ tips, matchedCompanies }` |

`cvAnalysis` u submission dokumentu:
```json
{ "skills": [], "inferredSkills": [], "projectComplexityScore": 7, "techStackBreadth": 6,
  "redFlags": [], "status": "ok | unverified | needs_review", "archetype": "Passionate Builder" }
```
Blind mode uklanja ime, pol, sliku i fakultet.

### AI alati za organizatora – `/api/tools` (JWT)
| Metoda | Ruta | Body | Odgovor |
|---|---|---|---|
| POST | `/api/tools/marketing` | `{ notes, channels: ["linkedin","instagram","newsletter","session_description"] }` | `{ posts: { linkedin: "..." } }` |
| POST | `/api/tools/feedback/:componentId` | – (cita odgovore iz forme) | `{ satisfactionScore, summary, alerts: [{ topic, message, severity }], highlights }` |
| POST | `/api/tools/agenda/:componentId` | `{ sessions, interestsField }` | `{ recommendations, matches }` (NICE) |
| POST | `/api/tools/faq-chat` | `{ faq, schedule, question }` | `{ answer }` |

## FastAPI (port 8000) – za AI kolegu
Iz guide §7: `POST /generate-css` (izmenjen, vidi dole), `POST /interpret-prompt`, `POST /web-search`.

`POST /generate-css` – spoj HTML-a komponente i CSS-a organizacije:
```json
ulaz:  { "component_html": "<form class=\"infostone-form\">...</form>", "raw_css": "..." }
izlaz: { "styled_html": "<style>...</style><form class=\"infostone-form\">...</form>", "notes": "..." }
```
Pravila za Gemmu: menja samo izgled; zadrzava sve `infostone-*` klase, `name` atribute, polja i strukturu;
bez `<script>`, bez `<html>/<head>/<body>`; CSS ide u `<style>` na pocetku fragmenta.

Novi (predlog, potvrditi sa AI kolegom):
| Endpoint | Ulaz | Izlaz |
|---|---|---|
| `POST /analyze-cv` | multipart `file` (pdf/docx) | `{ skills, inferred_skills, project_complexity_score, tech_stack_breadth, red_flags, status, archetype }` |
| `POST /cv-search` | `{ query, candidates: [{ id, profile }], top_k }` | `{ results: [{ id, score, reason }] }` |
| `POST /cv-coach` | `{ profile, companies }` | `{ tips, matched_companies: [{ name, reason }] }` |
| `POST /marketing-content` | `{ notes, channels }` | `{ posts: { <channel>: text } }` |
| `POST /feedback-analysis` | `{ entries: [text], context }` | `{ satisfaction_score, summary, alerts, highlights }` |
| `POST /agenda-recommend` | `{ participants, sessions }` | `{ recommendations, matches }` |
| `POST /faq-answer` | `{ faq_context, schedule_context, question }` | `{ answer }` |

Lazni odgovori istog oblika: `backend/src/services/aiMocks.js`.

## Prioriteti (dopuna guide §14)
- **MUST**: sve iz guide §14 + CV analiza (`/analyze`, `/profiles`, blind mode) jer koristi CV iz demo forme.
- **NICE**: CV semanticka pretraga, CV Coach, marketing, feedback analiza.
- **SKIP ako je gusto**: agenda/networking, FAQ cet-bot.
