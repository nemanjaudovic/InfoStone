# Podela rada i pravila (protiv merge konflikata)

## Oblasti rada
Duznosti jos NISU raspodeljene. Kad se raspodele, upisati ime uz oblast; svaka oblast ima jednog vlasnika,
a tudji fajl se menja tek posle dogovora sa vlasnikom.

| Oblast | Ime | Folder | Zaduzenja |
|---|---|---|---|
| Backend API | _nije dodeljeno_ | `backend/` (osim `backend/src/embed/`) | auth, komponente, dinamicke kolekcije, submissions, upload, prompt endpoint, CSS apply, `/api/cv`, `/api/tools`, `aiClient` |
| InfoStone front | _nije dodeljeno_ | `frontend/` | login/register, dashboard, builder-i, CSS uploader, embed kod, prompt tester, prijave, CV analiza, AI alati |
| AI servis | (AI kolega) | `ai/` | FastAPI + Gemma endpoint-i iz `docs/api-contract.md` |
| Embed + demo | _nije dodeljeno_ | `backend/src/embed/`, `mock-site-a/`, `mock-site-b/` | HTML za iframe (4 tipa + locked), watermark, prompt box u iframe-u, auto-height, mock sajtovi, demo scenario |

## Deljeni fajlovi (menjaju se samo uz dogovor)
- `backend/src/app.js` – montiranje routera
- `frontend/src/app/app.routes.ts` – nova ruta = nova linija, postojece se ne preuredjuju
- `backend/package.json`, `frontend/package.json` – zavisnosti dodaje vlasnik foldera
- `backend/src/models/*` – menja ih vlasnik Backend API oblasti, ostali samo citaju
- `docs/api-contract.md` – promena kontrakta se prvo javi celom timu
- `.gitignore`, `.gitattributes`, `guide.md`

## Da niko ne ceka nikoga
- **Front**: radi preko servisa u `core/services`; dok API ne radi, privremeno vrati `of(mockData)`.
- **Backend**: `MOCK_AI=true` u `.env` -> `aiClient` vraca lazne odgovore iz `aiMocks.js`.
- **Embed**: `http://localhost:3000/api/components/demo-form/embed` radi i bez baze komponenti.

## Git
1. Svako radi na svojoj grani, `main` se menja samo preko PR/merge-a.
2. Mali i cesti merge-ovi u `main` (svakih 1-2h), ne jedan veliki na kraju.
3. Pre svakog PR-a: `git fetch` + `git rebase origin/main` (ili `git merge origin/main`).
4. Ne formatirati tudje fajlove (auto-format na save pravi diff celog fajla).
5. `node_modules/`, `.env`, `uploads/*` se nikad ne commit-uju.

## Pokretanje
| Servis | Komanda | Port |
|---|---|---|
| Express | `cd backend && npm install && cp .env.example .env && npm run dev` | 3000 |
| InfoStone front | `cd frontend && npm install && npm start` | 4200 |
| Mock sajt A | `cd mock-site-a && npm install && npm start` | 4201 |
| Mock sajt B | `cd mock-site-b && npm install && npm start` | 4202 |
| FastAPI | vidi `ai/` | 8000 |
