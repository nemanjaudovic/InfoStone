import { Component, HostListener, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ComponentsService } from '../../../core/services/components.service';
import { CssService } from '../../../core/services/css.service';
import { ToolsService } from '../../../core/services/tools.service';
import { ChatbotKnowledge, ChatbotSource } from '../../../core/models/ai.model';
import { InfoComponent } from '../../../core/models/component.model';

type SourceKind = 'url' | 'text' | 'file';

// Chatbot sacuvan na backend-u + embed podaci
interface ChatbotResult {
  id: string;
  embedUrl: string;
  embedCode: string;
  mockSiteUrl: string;
  previewUrl: SafeResourceUrl;
  styled: boolean;
  notes: string;
}

// Chatbot (5. tip komponente): organizator da sajt (ili tekst/fajl), AI servis od njega napravi
// znanje, a posetioci kroz iframe postavljaju pitanja (/api/prompt/:id -> Gemma ili dummy odgovor).
@Component({
  selector: 'app-chatbot-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="builder">
      @if (existing.length) {
        <label class="field existing">
          Open an existing chatbot
          <select class="input" [ngModel]="result?.id ?? ''" (ngModelChange)="openExisting($event)" [disabled]="busy">
            <option value="">— new chatbot —</option>
            @for (c of existing; track c._id) {
              <option [value]="c._id">{{ c.title || 'Untitled' }} ({{ c.collectionName }})</option>
            }
          </select>
        </label>
      }
      <input class="form-title" [(ngModel)]="title" placeholder="Chatbot title (e.g. Ask us anything)" />

      <div class="cell">
        <p class="cell-text">
          Point the bot to your website. It reads the pages, and visitors can then ask questions in plain
          language — the bot answers only from what is on your site.
        </p>
        <label class="field">
          Greeting
          <input class="input" [(ngModel)]="greeting" placeholder="Zdravo! Pitaj me bilo sta o nama i nasim dogadjajima." />
        </label>
      </div>

      <div class="cell">
        <div class="tabs" role="tablist">
          @for (k of sourceKinds; track k.value) {
            <button type="button" class="tab" role="tab" [class.active]="sourceKind === k.value"
                    [attr.aria-selected]="sourceKind === k.value" (click)="sourceKind = k.value">{{ k.label }}</button>
          }
        </div>
        @switch (sourceKind) {
          @case ('url') {
            <input class="input" [(ngModel)]="sourceUrl" placeholder="https://your-event-site.com" />
            <p class="hint">Reads up to 10 pages of the same site. Sites built with Angular/React may show no text — paste it instead.</p>
          }
          @case ('text') {
            <textarea class="input" rows="7" [(ngModel)]="sourceText"
                      placeholder="Paste your 'About us', schedule, rules... (plain text or Markdown)"></textarea>
          }
          @case ('file') {
            <div class="file-pick" (click)="knowledgeInput.click()">
              <input #knowledgeInput type="file" hidden accept=".html,.htm,.md,.txt" (change)="onKnowledgeFile($event)" />
              {{ sourceFile ? sourceFile.name : 'Choose an .html, .md or .txt file (max 2MB)' }}
            </div>
          }
        }
      </div>

      @if (!result) {
        <div
          class="drop-zone"
          [class.dragging]="dragging"
          (dragover)="onDragOver($event)"
          (dragleave)="dragging = false"
          (drop)="onDrop($event)"
          (click)="cssInput.click()"
        >
          <input #cssInput type="file" hidden multiple accept=".css" (change)="onCssSelected($event)" />
          <p>Drop your .css files here (optional)</p>
          @if (cssFiles.length) {
            <ul class="file-list">
              @for (f of cssFiles; track $index) {
                <li>
                  {{ f.name }}
                  <button type="button" class="remove-file" (click)="removeCss($index, $event)" title="Remove">×</button>
                </li>
              }
            </ul>
          }
        </div>
      }

      @if (error) {
        <p class="generate-error">{{ error }}</p>
      }
      <button type="button" class="generate" (click)="generate()" [disabled]="busy">
        {{ busy ? step : result ? 'Update' : 'Generate' }}
      </button>

      @if (result) {
        <section class="result">
          <div class="result-head">
            <h2>Chatbot is live</h2>
            <span class="badge">{{ result.styled ? 'Styled with your CSS' : 'Default style' }}</span>
          </div>
          <p class="muted">ID: <code>{{ result.id }}</code> · <button type="button" class="link" (click)="reset()">New chatbot</button></p>
          @if (result.notes) {
            <p class="muted note">{{ result.notes }}</p>
          }

          @if (knowledge) {
            <div class="knowledge">
              <div class="chips">
                <span class="chip">{{ knowledge.stats.pages }} {{ knowledge.stats.pages === 1 ? 'page' : 'pages' }}</span>
                <span class="chip">{{ knowledge.stats.chunks }} sections</span>
                <span class="chip">{{ knowledge.stats.chars }} characters</span>
              </div>
              @for (w of knowledge.warnings; track $index) {
                <p class="muted note">{{ w }}</p>
              }
              <details>
                <summary>What the bot knows</summary>
                @for (c of knowledge.chunks; track c.id) {
                  <div class="chunk">
                    <strong>{{ c.heading }}</strong>
                    <p>{{ c.text }}</p>
                  </div>
                }
              </details>
            </div>
          } @else {
            <p class="muted note">The bot has no knowledge yet — add a source above and click "Update".</p>
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

          <p class="muted">Try it below.</p>
          <div class="preview">
            <iframe [src]="result.previewUrl" [style.height.px]="previewHeight" title="Chatbot preview"></iframe>
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .existing { margin-bottom: 4px; }
      .builder { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; padding-top: 4px; }

      .form-title {
        background: none;
        border: 0;
        border-bottom: 1px solid var(--border);
        color: var(--text);
        font-size: 22px;
        font-weight: 700;
        padding: 6px 0 10px;
        margin-bottom: 2px;
      }
      .form-title:focus { border-bottom-color: var(--accent); outline: none; }

      .cell {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .cell-text { margin: 0; color: var(--text-muted); font-size: 14px; line-height: 1.5; }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-muted); }
      .input {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 5px;
        color: var(--text);
        padding: 9px 12px;
        font: inherit;
        font-size: 14px;
        width: 100%;
        box-sizing: border-box;
      }
      textarea.input { resize: vertical; }
      .hint { margin: 0; font-size: 12px; color: var(--text-muted); }

      .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); }
      .tab { background: none; border: 0; border-bottom: 2px solid transparent; color: var(--text-muted); padding: 6px 12px; font-size: 14px; }
      .tab.active { color: var(--text); border-bottom-color: var(--accent); }
      .file-pick {
        border: 1px dashed var(--border);
        border-radius: 5px;
        padding: 16px;
        text-align: center;
        color: var(--text-muted);
        font-size: 13px;
        cursor: pointer;
      }

      .drop-zone {
        border: 2px dashed var(--border);
        border-radius: 8px;
        padding: 22px 20px;
        text-align: center;
        color: var(--text-muted);
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .drop-zone.dragging { border-color: var(--accent); background: var(--surface-2); }
      .drop-zone p { margin: 0; }
      .file-list { list-style: none; margin: 8px 0 0; padding: 0; font-size: 13px; color: var(--text); }
      .file-list li { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 2px 0; }
      .remove-file { background: none; border: 0; color: var(--text-muted); font-size: 16px; line-height: 1; padding: 0 4px; }
      .remove-file:hover { color: #ff9e9e; }

      .generate {
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
      .generate-error { margin: 0; color: #ff9e9e; font-size: 13px; text-align: center; }

      .result {
        margin: 8px 0 40px;
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
      .link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; cursor: pointer; }

      .knowledge { display: flex; flex-direction: column; gap: 8px; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip { font-size: 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px; }
      details { font-size: 13px; }
      summary { cursor: pointer; color: var(--text-muted); }
      .chunk { border-left: 2px solid var(--border); padding: 4px 10px; margin: 8px 0; }
      .chunk p { margin: 4px 0 0; color: var(--text-muted); white-space: pre-line; }

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
export class ChatbotComponent implements OnInit {
  private componentsApi = inject(ComponentsService);
  private cssApi = inject(CssService);
  private toolsApi = inject(ToolsService);
  private sanitizer = inject(DomSanitizer);

  readonly sourceKinds: { value: SourceKind; label: string }[] = [
    { value: 'url', label: 'Website' },
    { value: 'text', label: 'Paste text' },
    { value: 'file', label: 'Upload file' },
  ];

  title = '';
  greeting = '';
  sourceKind: SourceKind = 'url';
  sourceUrl = '';
  sourceText = '';
  sourceFile: File | null = null;
  cssFiles: File[] = [];
  dragging = false;

  busy = false;
  step = '';
  error: string | null = null;
  result: ChatbotResult | null = null;
  knowledge: ChatbotKnowledge | null = null;
  previewHeight = 420;
  copied = false;
  existing: InfoComponent[] = [];
  // Naslov i pozdrav kakvi su sacuvani na backend-u (da "Update" zna da li ima sta da sacuva)
  private savedTitle = '';
  private savedGreeting = '';

  ngOnInit(): void {
    this.loadExisting();
  }

  private loadExisting(): void {
    this.componentsApi.list().subscribe({
      next: (list) => (this.existing = list.filter((c) => c.type === 'chatbot')),
      error: () => (this.existing = []),
    });
  }

  // Otvara sacuvan chatbot (posle povratka na stranicu): podesavanja, znanje, embed kod
  async openExisting(id: string): Promise<void> {
    if (!id) {
      this.reset();
      return;
    }
    const c = this.existing.find((x) => x._id === id);
    if (!c) return;
    this.error = null;
    this.title = c.title;
    this.greeting = c.schema?.greeting ?? '';
    this.savedTitle = this.title.trim();
    this.savedGreeting = this.greeting.trim();
    this.cssFiles = [];
    this.copied = false;
    this.result = this.buildResult(c._id, c.title, !!c.styledHtml, '');
    this.knowledge = null;
    try {
      this.knowledge = await firstValueFrom(this.toolsApi.chatbotKnowledge(c._id));
    } catch (err) {
      // 404 = chatbot jos nema znanje (to je u redu); ostalo prikazi
      if ((err as HttpErrorResponse).status !== 404) this.error = this.errorText(err);
    }
  }

  onKnowledgeFile(e: Event): void {
    this.sourceFile = (e.target as HTMLInputElement).files?.[0] ?? null;
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

  // Izabran izvor znanja ili poruka sta fali
  private source(): ChatbotSource | string {
    if (this.sourceKind === 'url') {
      const url = this.sourceUrl.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) return 'Enter the full site address, starting with http:// or https://';
      return { url };
    }
    if (this.sourceKind === 'text') {
      const text = this.sourceText.trim();
      return text ? { text } : 'Paste some text about your organization or event.';
    }
    return this.sourceFile ? { file: this.sourceFile } : 'Choose an .html, .md or .txt file.';
  }

  generate(): void {
    const source = this.source();
    if (typeof source === 'string') {
      // Postojeci chatbot bez novog izvora: samo sacuvaj naslov/pozdrav
      if (this.result && this.settingsChanged() && this.sourceEmpty()) {
        this.error = null;
        void this.saveSettingsOnly();
        return;
      }
      this.error = source;
      return;
    }
    this.error = null;
    void this.run(source);
  }

  private sourceEmpty(): boolean {
    if (this.sourceKind === 'url') return !this.sourceUrl.trim();
    if (this.sourceKind === 'text') return !this.sourceText.trim();
    return !this.sourceFile;
  }

  private settingsChanged(): boolean {
    return (this.title.trim() || 'Ask us') !== (this.savedTitle || 'Ask us') || this.greeting.trim() !== this.savedGreeting;
  }

  // Naslov i pozdrav posle kreiranja (pozdrav je u schema; izmena ne brise CSS stil chatbot-a)
  private async saveSettings(): Promise<void> {
    if (!this.result || !this.settingsChanged()) return;
    this.step = 'Saving settings…';
    const title = this.title.trim() || 'Ask us';
    const greeting = this.greeting.trim();
    await firstValueFrom(this.componentsApi.update(this.result.id, { title, schema: greeting ? { greeting } : {} }));
    this.savedTitle = title;
    this.savedGreeting = greeting;
    this.result = this.buildResult(this.result.id, title, this.result.styled, this.result.notes);
    this.loadExisting();
  }

  private async saveSettingsOnly(): Promise<void> {
    this.busy = true;
    try {
      await this.saveSettings();
      this.reloadPreview();
    } catch (err) {
      this.error = this.errorText(err);
    } finally {
      this.busy = false;
    }
  }

  private errorText(err: unknown): string {
    const e = err as HttpErrorResponse;
    return e.error?.error || e.message || 'Something went wrong.';
  }

  // Prvi put: komponenta (+ CSS preko Gemme) pa znanje. Posle toga samo novo znanje za isti chatbot.
  private async run(source: ChatbotSource): Promise<void> {
    this.busy = true;
    try {
      if (!this.result) await this.create();
      else await this.saveSettings();
      this.step = 'url' in source ? 'Reading your website…' : 'Learning from your text…';
      this.knowledge = await firstValueFrom(this.toolsApi.buildChatbotKnowledge(this.result!.id, source));
      this.reloadPreview();
    } catch (err) {
      this.error = this.errorText(err);
    } finally {
      this.busy = false;
    }
  }

  private async create(): Promise<void> {
    const title = this.title.trim() || 'Ask us';
    this.step = 'Saving chatbot…';
    const created = await firstValueFrom(
      this.componentsApi.create({
        type: 'chatbot',
        title,
        schema: this.greeting.trim() ? { greeting: this.greeting.trim() } : {},
        sensitive: false,
        promptEnabled: true, // polje za pitanje je cela komponenta
      }),
    );
    const id = created.component._id;
    this.savedTitle = title;
    this.savedGreeting = this.greeting.trim();
    // Rezultat odmah: ako CSS ili znanje ne uspeju, "Update" nastavlja sa ISTIM chatbot-om
    // (ranije je svaki novi pokusaj pravio novu komponentu)
    this.result = this.buildResult(id, title, false, '');
    this.loadExisting();

    const css = this.combinedCss();
    if (css) {
      this.step = 'Applying your CSS with Gemma…';
      try {
        const uploaded = await firstValueFrom(this.cssApi.upload(css));
        const applied = await firstValueFrom(this.cssApi.apply(id, uploaded.cssSourceId));
        const classes = applied.appliedClasses?.length ? `Gemma applied: ${applied.appliedClasses.join(', ')}. ` : '';
        this.result = this.buildResult(id, title, true, `${classes}${applied.notes || ''}`.trim());
      } catch (err) {
        this.result = this.buildResult(id, title, false, `CSS was not applied (${this.errorText(err)}); the chatbot uses the default style.`);
      }
    }
  }

  private buildResult(id: string, title: string, styled: boolean, notes: string): ChatbotResult {
    const embedUrl = this.componentsApi.embedUrl(id);
    return {
      id,
      embedUrl,
      embedCode: `<iframe src="${embedUrl}" style="width:100%;border:0;" title="${title.replace(/"/g, '&quot;')}"></iframe>`,
      mockSiteUrl: `http://localhost:4201/prijava?id=${id}`,
      previewUrl: this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl),
      styled,
      notes,
    };
  }

  // Posle novog znanja iframe krece od pocetka (nov razgovor)
  private reloadPreview(): void {
    if (!this.result) return;
    const url = `${this.result.embedUrl}?v=${Date.now()}`;
    this.result = { ...this.result, previewUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url) };
  }

  reset(): void {
    this.result = null;
    this.knowledge = null;
    this.error = null;
    this.cssFiles = [];
    this.copied = false;
    this.title = '';
    this.greeting = '';
    this.savedTitle = '';
    this.savedGreeting = '';
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
