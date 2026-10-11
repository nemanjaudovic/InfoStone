import { Component, HostListener, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ComponentsService } from '../../../core/services/components.service';
import { CssService } from '../../../core/services/css.service';

// Rezultat "Generate": search komponenta sacuvana na backend-u + embed podaci
interface GenerateResult {
  id: string;
  embedUrl: string;
  embedCode: string;
  mockSiteUrl: string;
  previewUrl: SafeResourceUrl;
  styled: boolean;
  notes: string;
}

// AI pretraga interneta (guide §4.3): developer pravi search komponentu, iframe ima prompt box,
// pretraga ide kroz /api/prompt/:id -> FastAPI /api/discover (Gemma + Tavily).
@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="builder">
      <input class="form-title" [(ngModel)]="title" placeholder="Search title (e.g. Find a venue)" />

      <div class="cell">
        <p class="cell-text">
          Visitors type what they need in plain language. Gemma searches the internet and returns the best matches
          with links and a short explanation.
        </p>
        <label class="setting">
          Results per search
          <select [(ngModel)]="maxResults">
            @for (n of resultOptions; track n) {
              <option [ngValue]="n">{{ n }}</option>
            }
          </select>
        </label>
      </div>

      <div
        class="drop-zone"
        [class.dragging]="dragging"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging = false"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <input #fileInput type="file" hidden multiple accept=".css" (change)="onFilesSelected($event)" />
        <p>Drop your .css files here (optional)</p>
        @if (cssFiles.length) {
          <ul class="file-list">
            @for (f of cssFiles; track $index) {
              <li>
                {{ f.name }}
                <button type="button" class="remove-file" (click)="removeFile($index, $event)" title="Remove">×</button>
              </li>
            }
          </ul>
        }
      </div>

      @if (generateError) {
        <p class="generate-error">{{ generateError }}</p>
      }
      <button type="button" class="generate" (click)="generate()" [disabled]="generating">
        {{ generating ? generatingStep : 'Generate' }}
      </button>

      @if (result) {
        <section class="result">
          <div class="result-head">
            <h2>Search is live</h2>
            <span class="badge">{{ result.styled ? 'Styled with your CSS' : 'Default style' }}</span>
          </div>
          <p class="muted">ID: <code>{{ result.id }}</code></p>
          @if (result.notes) {
            <p class="muted note">{{ result.notes }}</p>
          }

          <label class="muted" for="embed-code">Embed code — paste it into your site</label>
          <div class="code-row">
            <textarea id="embed-code" class="code" readonly rows="2" [value]="result.embedCode"></textarea>
            <button type="button" class="copy" (click)="copyEmbed()">{{ copied ? 'Copied' : 'Copy' }}</button>
          </div>

          <div class="links">
            <a [href]="result.mockSiteUrl" target="_blank" rel="noopener">Open on mock site A ↗</a>
            <a [href]="result.embedUrl" target="_blank" rel="noopener">Open iframe alone ↗</a>
          </div>

          <p class="muted">Try it below — a search can take up to a minute.</p>
          <div class="preview">
            <iframe [src]="result.previewUrl" [style.height.px]="previewHeight" title="Search preview"></iframe>
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .builder { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; padding-top: 4px; }

      .form-title {
        background: none;
        border: 0;
        border-bottom: 1px solid var(--border);
        color: var(--text);
        font-size: 22px;
        font-weight: 700;
        padding: 6px 0 10px;
        margin-bottom: 14px;
      }
      .form-title:focus { border-bottom-color: var(--accent); outline: none; }

      .cell {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .cell-text { margin: 0; color: var(--text-muted); font-size: 14px; line-height: 1.5; }
      .setting { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; }
      .setting select {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 5px;
        color: var(--text);
        padding: 6px 10px;
        font: inherit;
      }

      .drop-zone {
        margin-top: 16px;
        border: 2px dashed var(--border);
        border-radius: 8px;
        padding: 28px 20px;
        text-align: center;
        color: var(--text-muted);
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .drop-zone.dragging { border-color: var(--accent); background: var(--surface-2); }
      .drop-zone p { margin: 0 0 8px; }
      .file-list { list-style: none; margin: 8px 0 0; padding: 0; font-size: 13px; color: var(--text); }
      .file-list li { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 2px 0; }
      .remove-file { background: none; border: 0; color: var(--text-muted); font-size: 16px; line-height: 1; padding: 0 4px; }
      .remove-file:hover { color: #ff9e9e; }

      .generate {
        margin-top: 12px;
        padding: 12px 24px;
        border: 0;
        border-radius: 6px;
        background: var(--accent-strong);
        color: #fff;
        font-weight: 600;
        font-size: 15px;
        width: 100%;
      }
      .generate:hover { background: var(--accent); }
      .generate:disabled { opacity: 0.6; cursor: default; }
      .generate-error { margin: 12px 0 0; color: #ff9e9e; font-size: 13px; text-align: center; }

      .result {
        margin: 20px 0 40px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .result-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .result-head h2 { margin: 0; font-size: 18px; }
      .badge { font-size: 12px; color: var(--accent); border: 1px solid var(--accent); border-radius: 999px; padding: 2px 10px; }
      .muted { margin: 0; color: var(--text-muted); font-size: 13px; }
      .muted code { color: var(--text); }
      .note { color: #ffd479; }
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
export class SearchComponent {
  private componentsApi = inject(ComponentsService);
  private cssApi = inject(CssService);
  private sanitizer = inject(DomSanitizer);

  readonly resultOptions = [3, 5, 10];

  title = '';
  maxResults = 3;
  dragging = false;
  cssFiles: File[] = [];
  generateError: string | null = null;

  generating = false;
  generatingStep = '';
  result: GenerateResult | null = null;
  previewHeight = 320;
  copied = false;

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging = true;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging = false;
    this.addFiles(e.dataTransfer?.files);
  }

  onFilesSelected(e: Event): void {
    this.addFiles((e.target as HTMLInputElement).files);
  }

  private addFiles(list: FileList | null | undefined): void {
    if (!list) return;
    this.cssFiles.push(...Array.from(list).filter((f) => f.name.toLowerCase().endsWith('.css')));
  }

  removeFile(index: number, e: Event): void {
    e.stopPropagation(); // da klik ne otvori file picker
    this.cssFiles.splice(index, 1);
  }

  // Vise CSS fajlova se spaja u jedan (backend prima jedan CSS po komponenti)
  private combinedCss(): File | null {
    if (this.cssFiles.length === 0) return null;
    if (this.cssFiles.length === 1) return this.cssFiles[0];
    const parts: BlobPart[] = [];
    this.cssFiles.forEach((f) => parts.push(`\n/* ${f.name} */\n`, f));
    return new File(parts, 'combined.css', { type: 'text/css' });
  }

  generate(): void {
    this.generateError = null;
    void this.saveAndStyle();
  }

  // 1. POST /api/components  2. (ako ima CSS) POST /api/css/upload + /api/css/apply (Gemma spoj)
  private async saveAndStyle(): Promise<void> {
    this.generating = true;
    this.result = null;
    this.copied = false;
    const title = this.title.trim() || 'AI search';
    try {
      this.generatingStep = 'Saving search…';
      const created = await firstValueFrom(
        this.componentsApi.create({
          type: 'search',
          title,
          schema: { maxResults: this.maxResults },
          sensitive: false,
          promptEnabled: true, // search uvek ima prompt box (guide §3.4)
        }),
      );
      const id = created.component._id;

      let styled = false;
      let notes = '';
      const css = this.combinedCss();
      if (css) {
        this.generatingStep = 'Applying your CSS with Gemma…';
        const uploaded = await firstValueFrom(this.cssApi.upload(css));
        const applied = await firstValueFrom(this.cssApi.apply(id, uploaded.cssSourceId));
        styled = true;
        const classes = applied.appliedClasses?.length ? `Gemma applied: ${applied.appliedClasses.join(', ')}. ` : '';
        notes = `${classes}${applied.notes || ''}`.trim();
      }

      const embedUrl = this.componentsApi.embedUrl(id);
      this.result = {
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
      this.generateError = e.error?.error || e.message || 'Something went wrong.';
    } finally {
      this.generating = false;
    }
  }

  copyEmbed(): void {
    if (!this.result) return;
    navigator.clipboard.writeText(this.result.embedCode).then(() => (this.copied = true));
  }

  // Auto-height preview iframe-a (iframe salje { infostone, height } preko postMessage)
  @HostListener('window:message', ['$event'])
  onEmbedMessage(e: MessageEvent): void {
    if (e.origin === 'http://localhost:3000' && e.data?.infostone && typeof e.data.height === 'number') {
      this.previewHeight = e.data.height;
    }
  }
}
