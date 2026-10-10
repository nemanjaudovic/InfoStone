import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';

type FieldType = 'text' | 'textarea' | 'checkbox' | 'radio' | 'file';

interface Question {
  id: number;
  type: FieldType;
  title: string;
  options: string[];
  required: boolean;
}

@Component({
  selector: 'app-form-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="builder">
      @for (q of questions; track q.id; let last = $last) {
        <div class="question">
          <div class="cell">
            <div class="title-row">
              <input
                class="q-title"
                [(ngModel)]="q.title"
                (ngModelChange)="onTitleChange()"
                placeholder="Question"
                [size]="titleSize(q)"
                [class.invalid]="generateError !== null && !q.title.trim()"
              />
              <span class="req-star" [class.show]="q.required">*</span>
              <span class="spacer"></span>
              <button type="button" class="edit-btn" (click)="openMenu(q.id, $event, 'edit')" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
              <button type="button" class="edit-btn danger" (click)="deleteQuestion(q)" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>

            <div class="cell-body">
              @switch (q.type) {
                @case ('text') {
                  <input class="answer" type="text" placeholder="Short answer" disabled />
                }
                @case ('textarea') {
                  <textarea class="answer" rows="3" placeholder="Long answer" disabled></textarea>
                }
                @case ('checkbox') {
                  @for (opt of q.options; track $index) {
                    <label class="option">
                      <input type="checkbox" disabled />
                      <input class="option-input" [(ngModel)]="q.options[$index]" />
                    </label>
                  }
                  <button type="button" class="add-option" (click)="addOption(q)">+ Add option</button>
                }
                @case ('radio') {
                  @for (opt of q.options; track $index) {
                    <label class="option">
                      <input type="radio" disabled />
                      <input class="option-input" [(ngModel)]="q.options[$index]" />
                    </label>
                  }
                  <button type="button" class="add-option" (click)="addOption(q)">+ Add option</button>
                }
                @case ('file') {
                  <div class="answer-file">Add file</div>
                }
              }
            </div>

            <div class="cell-foot">
              <label class="mandatory">
                <input type="checkbox" [(ngModel)]="q.required" />
                Mandatory
              </label>
            </div>
          </div>

          <div class="toolbar" [class.visible]="last">
            <span class="line"></span>
            <button type="button" class="tb-btn" (click)="addQuestion(q)" title="Add question">+</button>
            <button type="button" class="tb-btn" (click)="openMenu(q.id, $event, 'add')" title="Add question">☰</button>
            <span class="line"></span>
          </div>
        </div>
      }

      @if (menuFor !== null) {
        <div
          class="ctx-menu"
          [style.top.px]="menuPos.top"
          [style.right.px]="menuPos.right"
          (click)="$event.stopPropagation()"
        >
          <div class="ctx-head">{{ menuMode === 'add' ? 'Add question' : 'Change type' }}</div>
          @for (opt of typeOptions; track opt.value) {
            <button
              type="button"
              class="ctx-item"
              [class.selected]="menuMode === 'edit' && menuQuestion?.type === opt.value"
              (click)="chooseType(opt.value)"
            >
              {{ opt.label }}
            </button>
          }
        </div>
      }

      <div
        class="drop-zone"
        [class.dragging]="dragging"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging = false"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <input #fileInput type="file" hidden multiple accept=".css" (change)="onFilesSelected($event)" />
        <p>Drop your .css files here</p>
        @if (cssFiles.length) {
          <ul class="file-list">
            @for (f of cssFiles; track f) {
              <li>{{ f }}</li>
            }
          </ul>
        }
      </div>

      @if (generateError) {
        <p class="generate-error">{{ generateError }}</p>
      }
      <button type="button" class="generate" (click)="generate()">Generate</button>
    </div>
  `,
  styles: [
    `
      .builder { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; padding-top: 4px; }

      .question { display: flex; flex-direction: column; }

      .cell {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .title-row { display: flex; align-items: center; gap: 2px; }
      .q-title {
        flex: 0 0 auto;
        min-width: 24px;
        background: none;
        border: 0;
        border-bottom: 1px solid transparent;
        color: var(--text);
        font-size: 16px;
        font-weight: 600;
        padding: 4px 0;
      }
      .q-title:focus { border-bottom-color: var(--accent); outline: none; }
      .q-title.invalid { border-bottom-color: #ff9e9e; }
      .req-star {
        color: #ff9e9e;
        font-size: 18px;
        font-weight: 700;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      .req-star.show { opacity: 1; }
      .spacer { flex: 1; }

      .edit-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 0;
        background: none;
        color: var(--text-muted);
        border-radius: 5px;
      }
      .edit-btn:hover { background: var(--surface-2); color: var(--text); }
      .edit-btn.danger:hover { color: #ff9e9e; }
      .edit-btn svg { width: 15px; height: 15px; }

      .cell-body { display: flex; flex-direction: column; gap: 8px; }

      .answer {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 9px 12px;
        color: var(--text);
        font-family: inherit;
        font-size: 14px;
        width: 100%;
      }
      .answer:disabled { cursor: default; }
      textarea.answer { resize: vertical; }

      .option { display: flex; align-items: center; gap: 8px; }
      .option input[type='checkbox'],
      .option input[type='radio'] { accent-color: var(--accent-strong); }
      .option-input {
        flex: 1;
        background: none;
        border: 0;
        border-bottom: 1px solid transparent;
        color: var(--text);
        padding: 4px 2px;
        font-size: 14px;
      }
      .option-input:hover { border-bottom-color: var(--border); }
      .option-input:focus { border-bottom-color: var(--accent); outline: none; }

      .add-option { align-self: flex-start; background: none; border: 0; color: var(--text-muted); font-size: 13px; padding: 2px 0; }
      .add-option:hover { color: var(--text); }

      .answer-file {
        border: 1px dashed var(--border);
        border-radius: 5px;
        padding: 14px;
        text-align: center;
        color: var(--text-muted);
        font-size: 13px;
      }

      .cell-foot { display: flex; align-items: center; justify-content: flex-end; }
      .mandatory {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-muted);
        font-size: 13px;
        cursor: pointer;
      }
      .mandatory input { accent-color: var(--accent-strong); }

      /* Toolbar: skupljen (mali padding) kad je nevidljiv, siri se na hover.
         Ispod poslednje celije (visible) sve je uvek prikazano. */
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 2px 0;
        transition: padding 0.15s ease;
      }
      .toolbar:hover,
      .toolbar.visible { padding: 12px 0; }
      .line {
        flex: 1;
        height: 1px;
        background: var(--border);
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      .tb-btn {
        width: 30px;
        height: 30px;
        border: 0;
        background: none;
        color: var(--text-muted);
        font-size: 18px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 5px;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      .toolbar:hover .line,
      .toolbar:hover .tb-btn { opacity: 1; }
      .toolbar.visible .line,
      .toolbar.visible .tb-btn { opacity: 1; }
      .tb-btn:hover { background: var(--surface-2); color: var(--text); }

      .ctx-menu {
        position: fixed;
        z-index: 1000;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 4px;
        min-width: 170px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
      }
      .ctx-item {
        text-align: left;
        background: none;
        border: 0;
        color: var(--text);
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 14px;
      }
      .ctx-head {
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
      }
      .ctx-item:hover { background: rgba(255, 255, 255, 0.07); }
      .ctx-item.selected { color: var(--accent); }

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
      .file-list li { padding: 2px 0; }

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
      .generate-error {
        margin: 12px 0 0;
        color: #ff9e9e;
        font-size: 13px;
        text-align: center;
      }
    `,
  ],
})
export class FormComponent {
  // BITNO: nextId mora biti deklarisan PRE questions, jer questions poziva
  // newQuestion() u svom inicijalizatoru (inace id postaje NaN i prva celija
  // se ne moze menjati, a + ubacuje novu celiju na vrh).
  private nextId = 1;
  questions: Question[] = [this.newQuestion('text')];

  menuFor: number | null = null;
  menuMode: 'edit' | 'add' = 'edit';
  menuPos = { top: 0, right: 0 };
  dragging = false;
  cssFiles: string[] = [];
  generateError: string | null = null;

  readonly typeOptions: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Input Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio' },
    { value: 'file', label: 'File' },
  ];

  get menuQuestion(): Question | undefined {
    return this.questions.find((q) => q.id === this.menuFor);
  }

  // Sirina naslova prati duzinu teksta, da zvezdica bude odmah uz naslov
  titleSize(q: Question): number {
    return Math.max((q.title || '').length + 2, 8);
  }

  private newQuestion(type: FieldType): Question {
    const options = type === 'checkbox' || type === 'radio' ? ['Option 1'] : [];
    return { id: this.nextId++, type, title: '', options, required: false };
  }

  addQuestion(after: Question): void {
    const idx = this.questions.findIndex((q) => q.id === after.id);
    this.questions.splice(idx + 1, 0, this.newQuestion(after.type));
  }

  addOption(q: Question): void {
    q.options.push(`Option ${q.options.length + 1}`);
  }

  deleteQuestion(q: Question): void {
    if (this.questions.length <= 1) return; // bar jedna celija uvek ostaje
    this.questions = this.questions.filter((x) => x.id !== q.id);
    this.menuFor = null;
  }

  openMenu(id: number, event: MouseEvent, mode: 'edit' | 'add'): void {
    event.stopPropagation();
    if (this.menuFor === id && this.menuMode === mode) {
      this.menuFor = null; // klik na isti dugmic zatvara meni
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const estHeight = 320;
    const openUp = rect.bottom + estHeight > window.innerHeight;
    const top = openUp ? Math.max(8, rect.top - estHeight) : rect.bottom + 6;
    this.menuPos = { top, right: Math.max(8, window.innerWidth - rect.right) };
    this.menuMode = mode;
    this.menuFor = id;
  }

  chooseType(type: FieldType): void {
    const q = this.menuQuestion;
    if (!q) return;
    const idx = this.questions.findIndex((x) => x.id === q.id);
    if (this.menuMode === 'add') {
      // ☰ meni: dodaj NOVU celiju izabranog tipa ispod ove
      this.questions.splice(idx + 1, 0, this.newQuestion(type));
    } else {
      // olovka (edit) meni: promeni tip postojece celije
      q.type = type;
      q.options = type === 'checkbox' || type === 'radio' ? ['Option 1'] : [];
    }
    this.menuFor = null;
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.menuFor = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuFor = null;
  }

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
    this.cssFiles.push(...Array.from(list).map((f) => f.name));
  }

  generate(): void {
    // Sva pitanja moraju imati naslov pre generisanja
    const missing = this.questions.filter((q) => !(q.title || '').trim());
    if (missing.length > 0) {
      this.generateError =
        missing.length === 1
          ? 'One question has no title — fill it in before generating.'
          : `${missing.length} questions have no title — fill them in before generating.`;
      return;
    }
    this.generateError = null;
    // TODO: kasnije salje pitanja + css fajlove ka backend-u / Gemma servisu.
    console.log('Generate clicked', { questions: this.questions, cssFiles: this.cssFiles });
  }

  onTitleChange(): void {
    // Cim svi naslovi budu popunjeni, ukloni poruku o gresci
    if (this.generateError && this.questions.every((q) => (q.title || '').trim())) {
      this.generateError = null;
    }
  }
}
