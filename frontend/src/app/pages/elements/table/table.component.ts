import { Component, HostListener, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { CssService } from '../../../core/services/css.service';
import { DataTableComponent } from '../../../shared/data-table/data-table.component';
import { ComponentsService } from '../../../core/services/components.service';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { InfoComponent } from '../../../core/models/component.model';
import { AskResponse, Submission } from '../../../core/models/submission.model';

type Row = Record<string, unknown>;

// Objavljena tabela (iframe) — isto kao rezultat "Generate" kod forme
interface PublishResult {
  id: string;
  embedUrl: string;
  embedCode: string;
  mockSiteUrl: string;
  previewUrl: SafeResourceUrl;
  styled: boolean;
  notes: string;
}

interface ChatMessage {
  from: 'user' | 'ai';
  text: string;
  error?: boolean;
}

const PREVIEW_ROWS = 10;

@Component({
  selector: 'app-table-page',
  standalone: true,
  imports: [FormsModule, DataTableComponent],
  template: `
    <section class="page">
      <h1>Table</h1>
      <p class="subtitle">Prijave iz tvojih formi — izaberi tabelu, pa pitaj Gemmu nad podacima.</p>

      <!-- Izbor tabele (forme ulogovanog korisnika) -->
      <div class="bar">
        <label class="pick">
          Tabela
          <select [(ngModel)]="selectedId" (ngModelChange)="selectTable($event)">
            <option value="">— izaberi —</option>
            @for (t of tables; track t._id) {
              <option [value]="t._id">{{ t.title || 'Untitled form' }} ({{ t.collectionName }})</option>
            }
          </select>
        </label>
        @if (selected) {
          <span class="meta">{{ allRows.length }} redova ukupno</span>
        }
      </div>

      @if (errorMsg) {
        <div class="errbox">{{ errorMsg }}</div>
      }
      @if (!loadingTables && !tables.length && !errorMsg) {
        <p class="empty">Još nemaš nijednu formu. Napravi je u sekciji Form.</p>
      }

      @if (selected) {
        <!-- Pregled: prvih par redova -->
        <div class="section-head">
          Pregled
          @if (allRows.length > previewRows.length) {
            <span class="meta">prvih {{ previewRows.length }} od {{ allRows.length }}</span>
          }
        </div>
        @if (loadingRows) {
          <p class="empty">Učitavam…</p>
        } @else {
          <app-data-table [rows]="previewRows" [emptyText]="'Tabela još nema prijava.'" />
        }

        <!-- Chatbox -->
        <div class="chat">
          <div class="section-head">Pitaj Gemmu nad ovom tabelom</div>

          @if (messages.length) {
            <div class="messages">
              @for (m of messages; track $index) {
                <div class="msg" [class.user]="m.from === 'user'" [class.err]="m.error">{{ m.text }}</div>
              }
              @if (asking) {
                <div class="msg ai typing">Gemma obrađuje {{ maxRows }} redova… (može potrajati 1–3 min)</div>
              }
            </div>
          }

          <div class="composer">
            <textarea
              [(ngModel)]="prompt"
              rows="2"
              maxlength="500"
              placeholder="npr. Dohvati sve prijavljene sa ETF-a koji su stariji od 20 godina"
              (keydown)="onKeydown($event)"
              [disabled]="asking"
            ></textarea>
            <div class="composer-side">
              <label class="rows-pick" title="Gemma ocenjuje red po red, pa vise redova = duze cekanje">
                Redova
                <select [(ngModel)]="maxRows" [disabled]="asking">
                  @for (n of rowOptions; track n) {
                    <option [ngValue]="n">{{ n }}</option>
                  }
                </select>
              </label>
              <button type="button" class="send" (click)="ask()" [disabled]="asking || !prompt.trim()">
                {{ asking ? '…' : 'Pošalji' }}
              </button>
            </div>
          </div>
          <p class="hint">Enter šalje, Shift+Enter novi red. Gemma obrađuje najnovije redove (do izabranog broja), uključujući PDF CV ako postoji.</p>
        </div>

        <!-- Rezultat -->
        @if (answer) {
          <div class="section-head">
            Rezultat
            <span class="meta">{{ answer.matched }} odgovara · obrađeno {{ answer.processed }} od {{ answer.total }}</span>
            <label class="only">
              <input type="checkbox" [(ngModel)]="onlyMatches" /> samo oni koji odgovaraju
            </label>
          </div>
          <app-data-table [rows]="resultRows" [emptyText]="'Nijedan red ne odgovara kriterijumu.'" />

          <!-- Objavi rezultat kao iframe -->
          <div class="publish">
            <div class="section-head">Objavi kao iframe <span class="meta">{{ publishRowIds.length }} redova iz rezultata</span></div>

            <input class="pub-title" [(ngModel)]="publishTitle" placeholder="Naslov tabele (npr. Učesnici sa ETF-a)" />

            <div class="cols">
              <span class="meta">Kolone:</span>
              @for (f of publishableFields; track f.name) {
                <label class="col">
                  <input type="checkbox" [checked]="publishColumns.has(f.name)" (change)="toggleColumn(f.name)" /> {{ f.label || f.name }}
                </label>
              }
            </div>

            <div
              class="drop-zone"
              [class.dragging]="dragging"
              (dragover)="onDragOver($event)"
              (dragleave)="dragging = false"
              (drop)="onDrop($event)"
              (click)="cssInput.click()"
            >
              <input #cssInput type="file" hidden multiple accept=".css" (change)="onCssSelected($event)" />
              @if (cssFiles.length) {
                @for (f of cssFiles; track $index) {
                  <span class="css-file">{{ f.name }} <button type="button" (click)="removeCss($index, $event)" title="Ukloni">×</button></span>
                }
              } @else {
                <span>Opciono: prevuci .css svog sajta (ili klikni)</span>
              }
            </div>

            @if (publishError) {
              <div class="errbox">{{ publishError }}</div>
            }
            <button type="button" class="send generate" (click)="publish()" [disabled]="publishing || !publishRowIds.length">
              {{ publishing ? publishStep : 'Generate iframe' }}
            </button>

            @if (published) {
              <div class="pub-result">
                <div class="section-head">
                  Tabela je objavljena
                  <span class="badge">{{ published.styled ? 'Stil tvog sajta' : 'Podrazumevani stil' }}</span>
                </div>
                <p class="meta">ID: <code>{{ published.id }}</code></p>
                @if (published.notes) {
                  <p class="meta note">{{ published.notes }}</p>
                }
                <div class="code-row">
                  <textarea class="code" readonly rows="2" [value]="published.embedCode"></textarea>
                  <button type="button" class="copy" (click)="copyEmbed()">{{ copied ? 'Copied' : 'Copy' }}</button>
                </div>
                <div class="links">
                  <a [href]="published.mockSiteUrl" target="_blank" rel="noopener">Open on mock site A ↗</a>
                  <a [href]="published.embedUrl" target="_blank" rel="noopener">Open iframe alone ↗</a>
                </div>
                <div class="preview">
                  <iframe [src]="published.previewUrl" [style.height.px]="previewHeight" title="Table preview"></iframe>
                </div>
              </div>
            }
          </div>
        }
      }
    </section>
  `,
  styles: [
    `
      h1 { margin-bottom: 4px; }
      .subtitle { color: var(--text-muted); font-size: 13px; margin: 0 0 16px; }
      .bar { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
      .pick, .rows-pick { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted); }
      select {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text);
        padding: 8px 10px;
        font-size: 13px;
      }
      .pick select { min-width: 280px; }
      .meta { color: var(--text-muted); font-size: 12px; font-weight: 400; }
      .section-head {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        font-size: 14px;
        margin: 18px 0 8px;
      }
      .only { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 400; color: var(--text-muted); }
      .only input { accent-color: var(--accent-strong); }
      .empty { color: var(--text-muted); font-size: 13px; }
      .errbox {
        background: rgba(255, 158, 158, 0.08);
        border: 1px solid rgba(255, 158, 158, 0.4);
        color: #ff9e9e;
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 13px;
        margin-bottom: 12px;
      }

      .chat {
        margin-top: 8px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 4px 16px 14px;
      }
      .messages { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; max-height: 260px; overflow-y: auto; }
      .msg {
        max-width: 80%;
        padding: 9px 12px;
        border-radius: 10px;
        font-size: 13px;
        line-height: 1.45;
        background: var(--surface-2);
        border: 1px solid var(--border);
        white-space: pre-wrap;
      }
      .msg.user { align-self: flex-end; background: var(--accent-strong); border-color: var(--accent-strong); color: #fff; }
      .msg.err { color: #ff9e9e; border-color: rgba(255, 158, 158, 0.4); }
      .msg.typing { color: var(--text-muted); font-style: italic; }
      .composer { display: flex; gap: 10px; align-items: stretch; }
      .composer textarea {
        flex: 1;
        resize: vertical;
        min-height: 52px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        padding: 10px 12px;
        font: inherit;
        font-size: 13px;
        outline: none;
      }
      .composer textarea:focus { border-color: var(--accent); }
      .composer-side { display: flex; flex-direction: column; gap: 8px; justify-content: space-between; }
      .send {
        background: var(--accent-strong);
        color: #fff;
        border: 0;
        border-radius: 6px;
        padding: 9px 18px;
        font-weight: 600;
        font-size: 13px;
      }
      .send:disabled { opacity: 0.6; }
      .hint { margin: 8px 0 0; color: var(--text-muted); font-size: 12px; }

      .publish {
        margin: 18px 0 40px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 4px 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .publish .section-head { margin-bottom: 0; }
      .pub-title {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text);
        padding: 9px 12px;
        font: inherit;
        font-size: 14px;
      }
      .pub-title:focus { border-color: var(--accent); outline: none; }
      .cols { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; }
      .col { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
      .col input { accent-color: var(--accent-strong); }
      .drop-zone {
        border: 2px dashed var(--border);
        border-radius: 8px;
        padding: 18px;
        text-align: center;
        color: var(--text-muted);
        font-size: 13px;
        cursor: pointer;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }
      .drop-zone.dragging { border-color: var(--accent); background: var(--surface-2); }
      .css-file { color: var(--text); }
      .css-file button { background: none; border: 0; color: var(--text-muted); font-size: 15px; }
      .css-file button:hover { color: #ff9e9e; }
      .generate { align-self: stretch; padding: 12px; font-size: 14px; }
      .pub-result { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border); padding-top: 4px; }
      .badge { font-size: 12px; font-weight: 400; color: var(--accent); border: 1px solid var(--accent); border-radius: 999px; padding: 2px 10px; }
      .note { color: #ffd479; }
      code { color: var(--text); }
      .code-row { display: flex; gap: 8px; }
      .code {
        flex: 1;
        resize: none;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 5px;
        color: var(--text);
        font-family: ui-monospace, Consolas, monospace;
        font-size: 12px;
        padding: 8px 10px;
      }
      .copy { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: 5px; padding: 0 14px; }
      .copy:hover { border-color: var(--accent); }
      .links { display: flex; gap: 16px; font-size: 13px; }
      .preview { background: #fff; border-radius: 6px; overflow: hidden; }
      .preview iframe { width: 100%; border: 0; display: block; }
    `,
  ],
})
export class TableComponent implements OnInit {
  private componentsApi = inject(ComponentsService);
  private submissionsApi = inject(SubmissionsService);
  private cssApi = inject(CssService);
  private sanitizer = inject(DomSanitizer);

  tables: InfoComponent[] = [];
  selectedId = '';
  selected: InfoComponent | null = null;
  allRows: Submission[] = [];
  loadingTables = true;
  loadingRows = false;
  errorMsg = '';

  readonly rowOptions = [5, 10, 20, 30];
  maxRows = 10;
  prompt = '';
  asking = false;
  messages: ChatMessage[] = [];
  answer: AskResponse | null = null;
  onlyMatches = true;

  // Objava rezultata kao iframe
  publishTitle = '';
  publishColumns = new Set<string>();
  cssFiles: File[] = [];
  dragging = false;
  publishing = false;
  publishStep = '';
  publishError = '';
  published: PublishResult | null = null;
  previewHeight = 420;
  copied = false;

  ngOnInit(): void {
    // Tabele = forme ulogovanog korisnika (svaka ima svoju kolekciju {user}_form_{n})
    this.componentsApi.list().subscribe({
      next: (list) => {
        this.tables = list.filter((c) => c.type === 'form');
        this.loadingTables = false;
        if (this.tables.length) this.selectTable(this.tables[0]._id);
      },
      error: (e: HttpErrorResponse) => {
        this.loadingTables = false;
        this.errorMsg = e.error?.error || 'Ne mogu da učitam tabele. Da li backend radi?';
      },
    });
  }

  selectTable(id: string): void {
    this.selectedId = id;
    this.selected = this.tables.find((t) => t._id === id) || null;
    this.allRows = [];
    this.answer = null;
    this.messages = [];
    this.errorMsg = '';
    this.published = null;
    this.publishError = '';
    // Podrazumevano sve kolone osim fajlova
    this.publishColumns = new Set((this.selected?.schema.fields || []).filter((f) => f.type !== 'file').map((f) => f.name));
    if (!this.selected) return;

    this.loadingRows = true;
    this.submissionsApi.list(id).subscribe({
      next: (rows) => {
        this.allRows = rows;
        this.loadingRows = false;
      },
      error: (e: HttpErrorResponse) => {
        this.loadingRows = false;
        this.errorMsg = e.error?.error || 'Ne mogu da učitam redove tabele.';
      },
    });
  }

  // Red prijave -> kolone sa labelama pitanja (umesto q1, q2...)
  private toDisplayRow(s: Submission): Row {
    const row: Row = { Prijavljeno: new Date(s.submittedAt).toLocaleString() };
    for (const f of this.selected?.schema.fields || []) {
      if (f.type === 'file') {
        row[f.label || f.name] = (s.files || []).filter((x) => x.field === f.name).map((x) => x.filename).join(', ');
      } else {
        const v = s.data?.[f.name];
        row[f.label || f.name] = Array.isArray(v) ? v.join(', ') : (v ?? '');
      }
    }
    return row;
  }

  get previewRows(): Row[] {
    return this.allRows.slice(0, PREVIEW_ROWS).map((s) => this.toDisplayRow(s));
  }

  get resultRows(): Row[] {
    if (!this.answer) return [];
    return this.answer.results
      .filter((r) => !this.onlyMatches || r.evaluation.meetsCriteria)
      .map((r) => ({
        Skor: r.evaluation.matchScore,
        Odgovara: r.evaluation.meetsCriteria,
        Obrazloženje: r.evaluation.summary,
        ...this.toDisplayRow(r.submission),
      }));
  }

  // --- Objava kao iframe ---

  get publishableFields() {
    return this.selected?.schema.fields || [];
  }

  // Redovi koje objavljujemo = ono sto se vidi u rezultatu (postuje "samo oni koji odgovaraju")
  get publishRowIds(): string[] {
    if (!this.answer) return [];
    return this.answer.results
      .filter((r) => !this.onlyMatches || r.evaluation.meetsCriteria)
      .map((r) => r.submission._id);
  }

  toggleColumn(name: string): void {
    if (this.publishColumns.has(name)) this.publishColumns.delete(name);
    else this.publishColumns.add(name);
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging = true;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging = false;
    this.addCss(e.dataTransfer?.files);
  }

  onCssSelected(e: Event): void {
    this.addCss((e.target as HTMLInputElement).files);
  }

  private addCss(list: FileList | null | undefined): void {
    if (!list) return;
    this.cssFiles.push(...Array.from(list).filter((f) => f.name.toLowerCase().endsWith('.css')));
  }

  removeCss(index: number, e: Event): void {
    e.stopPropagation();
    this.cssFiles.splice(index, 1);
  }

  // Vise CSS fajlova -> jedan (backend prima jedan CSS po komponenti)
  private combinedCss(): File | null {
    if (!this.cssFiles.length) return null;
    if (this.cssFiles.length === 1) return this.cssFiles[0];
    const parts: BlobPart[] = [];
    this.cssFiles.forEach((f) => parts.push(`\n/* ${f.name} */\n`, f));
    return new File(parts, 'combined.css', { type: 'text/css' });
  }

  // 1. POST /api/components (type tableview)  2. opciono CSS: /api/css/upload + /api/css/apply (Gemma)
  async publish(): Promise<void> {
    if (!this.selected || this.publishing) return;
    const columns = (this.selected.schema.fields || []).map((f) => f.name).filter((n) => this.publishColumns.has(n));
    if (!columns.length) {
      this.publishError = 'Izaberi bar jednu kolonu.';
      return;
    }
    this.publishing = true;
    this.publishError = '';
    this.published = null;
    this.copied = false;
    try {
      this.publishStep = 'Čuvam tabelu…';
      const title = this.publishTitle.trim() || this.selected.title || 'Tabela';
      const created = await firstValueFrom(
        this.componentsApi.create({
          type: 'tableview',
          title,
          schema: {
            sourceComponentId: this.selected._id,
            columns,
            rowIds: this.publishRowIds,
            prompt: this.answer?.prompt || '',
          },
          sensitive: false,
          promptEnabled: false,
        }),
      );
      const id = created.component._id;

      let styled = false;
      let notes = '';
      const css = this.combinedCss();
      if (css) {
        this.publishStep = 'Primenjujem tvoj CSS preko Gemme…';
        const uploaded = await firstValueFrom(this.cssApi.upload(css));
        const applied = await firstValueFrom(this.cssApi.apply(id, uploaded.cssSourceId));
        styled = true;
        const classes = applied.appliedClasses?.length ? `Gemma applied: ${applied.appliedClasses.join(', ')}. ` : '';
        notes = `${classes}${applied.notes || ''}`.trim();
      }

      const embedUrl = this.componentsApi.embedUrl(id);
      this.published = {
        id,
        embedUrl,
        embedCode: `<iframe src="${embedUrl}" style="width:100%;border:0;" title="${title.replace(/"/g, '&quot;')}"></iframe>`,
        mockSiteUrl: `http://localhost:4201/prijava?id=${id}`,
        previewUrl: this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl),
        styled,
        notes,
      };
    } catch (err) {
      const e = err as HttpErrorResponse;
      this.publishError = e.error?.error || e.message || 'Objava nije uspela.';
    } finally {
      this.publishing = false;
    }
  }

  copyEmbed(): void {
    if (!this.published) return;
    navigator.clipboard.writeText(this.published.embedCode).then(() => (this.copied = true));
  }

  // Auto-height pregleda (iframe salje { infostone, height })
  @HostListener('window:message', ['$event'])
  onEmbedMessage(e: MessageEvent): void {
    if (e.origin === 'http://localhost:3000' && e.data?.infostone && typeof e.data.height === 'number') {
      this.previewHeight = e.data.height;
    }
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.ask();
    }
  }

  ask(): void {
    const prompt = this.prompt.trim();
    if (!prompt || !this.selected || this.asking) return;
    this.messages.push({ from: 'user', text: prompt });
    this.prompt = '';
    this.asking = true;

    this.submissionsApi.ask(this.selected._id, prompt, this.maxRows).subscribe({
      next: (res) => {
        this.answer = res;
        this.asking = false;
        this.published = null;
        this.publishTitle = `${this.selected?.title || 'Tabela'} — ${prompt}`.slice(0, 120);
        this.messages.push({
          from: 'ai',
          text: res.processed
            ? `Pronašla sam ${res.matched} od ${res.processed} obrađenih redova koji odgovaraju.` +
              (res.total > res.processed ? ` (Tabela ima ${res.total} redova — obrađeni su najnoviji.)` : '')
            : 'Tabela još nema prijava.',
        });
      },
      error: (e: HttpErrorResponse) => {
        this.asking = false;
        this.messages.push({ from: 'ai', error: true, text: e.error?.error || 'Gemma nije odgovorila. Da li AI servis radi?' });
      },
    });
  }
}
