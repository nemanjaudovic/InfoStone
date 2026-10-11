import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTableComponent } from '../../../shared/data-table/data-table.component';
import { ToolsService } from '../../../core/services/tools.service';
import { DbTable, QueryMode, QueryResult } from '../../../core/models/dbtools.model';

const FIND_EXAMPLE = JSON.stringify(
  { filter: { 'data.gpa': { $gt: 9 } }, sort: { 'data.gpa': -1 }, limit: 20 },
  null,
  2
);
const AGG_EXAMPLE = JSON.stringify(
  [{ $group: { _id: '$data.univerzitet', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
  null,
  2
);

@Component({
  selector: 'app-query-page',
  standalone: true,
  imports: [FormsModule, DataTableComponent],
  template: `
    <section class="page">
      <h1>Query</h1>
      <p class="subtitle">Upitna konzola nad MongoDB kolekcijama — Find ili Aggregate, Ctrl+Enter pokreće.</p>

      <div class="query-bar">
        <label class="col-pick">
          Kolekcija
          <select [(ngModel)]="collection">
            <option value="">— izaberi —</option>
            @for (t of tables; track t.name) {
              <option [value]="t.name">{{ t.name }} ({{ t.count }})</option>
            }
          </select>
        </label>

        <div class="mode-tabs">
          <button type="button" [class.active]="mode === 'find'" (click)="setMode('find')">Find</button>
          <button type="button" [class.active]="mode === 'aggregate'" (click)="setMode('aggregate')">Aggregate</button>
        </div>

        <button type="button" class="run" (click)="run()" [disabled]="running">{{ running ? '…' : '▶ Run' }}</button>
      </div>

      <textarea class="editor" [(ngModel)]="editor" spellcheck="false" (keydown)="onKeydown($event)"></textarea>

      <div class="examples">
        <span class="hint">Primeri:</span>
        <button type="button" (click)="example('all')">svi dokumenti</button>
        <button type="button" (click)="example('filter')">filter + sort</button>
        <button type="button" (click)="example('group')">grupisanje</button>
        <button type="button" (click)="example('project')">samo izabrana polja</button>
      </div>

      @if (status) {
        <div class="status" [class.err]="!!errorMsg">{{ status }}</div>
      }
      @if (errorMsg) {
        <div class="errbox">{{ errorMsg }}</div>
      }

      @if (result) {
        <div class="result-head">
          Vraćeno <b>{{ result.returned }}</b> od {{ result.matched }} redova za <b>{{ result.durationMs }}ms</b>
        </div>
        <app-data-table [rows]="result.rows" [emptyText]="'Upit ne vraća nijedan red.'" />
      }
    </section>
  `,
  styles: [
    `
      h1 { margin-bottom: 4px; }
      .subtitle { color: var(--text-muted); font-size: 13px; margin: 0 0 16px; }
      .query-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
      .col-pick { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted); }
      select {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text);
        padding: 8px 10px;
        font-size: 13px;
        min-width: 220px;
      }
      .mode-tabs { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
      .mode-tabs button {
        background: var(--surface);
        color: var(--text-muted);
        border: 0;
        padding: 8px 16px;
        font-size: 13px;
      }
      .mode-tabs button.active { background: var(--accent-strong); color: #fff; }
      .run {
        background: var(--accent-strong);
        color: #fff;
        border: 0;
        border-radius: 6px;
        padding: 9px 20px;
        font-weight: 600;
        font-size: 13px;
      }
      .run:disabled { opacity: 0.6; }
      .editor {
        width: 100%;
        min-height: 190px;
        background: var(--surface-2);
        color: #d4e6ff;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 12px;
        font-family: Consolas, 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.5;
        resize: vertical;
        outline: none;
      }
      .editor:focus { border-color: var(--accent); }
      .examples { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 8px 0 14px; }
      .examples .hint { color: var(--text-muted); font-size: 12px; }
      .examples button {
        background: var(--surface);
        color: var(--text-muted);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
      }
      .examples button:hover { color: var(--text); border-color: var(--accent); }
      .status { margin-bottom: 8px; color: var(--accent); font-size: 13px; }
      .status.err { color: #ff9e9e; }
      .errbox {
        background: rgba(255, 158, 158, 0.08);
        border: 1px solid rgba(255, 158, 158, 0.4);
        color: #ff9e9e;
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 13px;
        margin-bottom: 12px;
        white-space: pre-wrap;
      }
      .result-head { color: var(--text-muted); font-size: 13px; margin-bottom: 8px; }
      .result-head b { color: var(--text); }
    `,
  ],
})
export class QueryComponent implements OnInit {
  private tools = inject(ToolsService);

  tables: DbTable[] = [];
  collection = '';
  mode: QueryMode = 'find';
  editor = FIND_EXAMPLE;
  result: QueryResult | null = null;
  status = '';
  errorMsg = '';
  running = false;

  ngOnInit(): void {
    this.tools.listTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        if (tables.length) this.collection = tables[0].name;
      },
      error: (e) => (this.errorMsg = e.error?.error || e.message),
    });
  }

  setMode(mode: QueryMode): void {
    this.mode = mode;
    this.result = null;
    this.status = '';
    this.errorMsg = '';
    this.editor = mode === 'aggregate' ? AGG_EXAMPLE : FIND_EXAMPLE;
  }

  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.run();
    }
  }

  run(): void {
    this.errorMsg = '';
    this.status = '';
    if (!this.collection) {
      this.errorMsg = 'Prvo izaberi kolekciju.';
      return;
    }
    let query: unknown;
    try {
      query = JSON.parse(this.editor);
    } catch (e) {
      this.errorMsg = `JSON nije ispravan: ${(e as Error).message}`;
      return;
    }
    this.running = true;
    this.tools.runQuery({ collection: this.collection, mode: this.mode, query }).subscribe({
      next: (r) => {
        this.result = r;
        this.status = 'Upit izvršen uspešno.';
        this.running = false;
      },
      error: (e) => {
        this.errorMsg = e.error?.error || e.message;
        this.status = 'Greška pri izvršavanju.';
        this.result = null;
        this.running = false;
      },
    });
  }

  example(which: 'all' | 'filter' | 'group' | 'project'): void {
    const c = this.collection || 'moja_kolekcija';
    if (which === 'all') {
      this.mode = 'find';
      this.editor = JSON.stringify({ filter: {}, limit: 200 }, null, 2);
    } else if (which === 'filter') {
      this.mode = 'find';
      this.editor = JSON.stringify({ filter: { 'data.gpa': { $gt: 9 } }, sort: { 'data.gpa': -1 }, limit: 20 }, null, 2);
    } else if (which === 'group') {
      this.mode = 'aggregate';
      this.editor = JSON.stringify(
        [{ $match: {} }, { $group: { _id: '$data.univerzitet', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        null,
        2
      );
    } else {
      this.mode = 'find';
      this.editor = JSON.stringify({ filter: {}, project: { 'data.ime': 1, 'data.prezime': 1 }, limit: 50 }, null, 2);
    }
    this.result = null;
    this.status = '';
    this.errorMsg = '';
    void c;
  }
}
