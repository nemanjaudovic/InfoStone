import { Component, OnInit, inject } from '@angular/core';
import { DataTableComponent } from '../../../shared/data-table/data-table.component';
import { ToolsService } from '../../../core/services/tools.service';
import { DbTable, TableRowsResponse } from '../../../core/models/dbtools.model';

@Component({
  selector: 'app-tables-page',
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <section class="page">
      <h1>Tables</h1>
      <div class="tables-layout">
        <aside class="table-list">
          <h2>Kolekcije ({{ tables.length }})</h2>
          @if (loading) { <p class="hint">Učitavam...</p> }
          @if (error) { <p class="err">{{ error }}</p> }
          <ul>
            @for (t of tables; track t.name) {
              <li>
                <button type="button" class="table-item" [class.active]="selected?.name === t.name" (click)="select(t)">
                  <span class="tname">{{ t.name }}</span>
                  <span class="tcount">{{ t.count }}</span>
                </button>
              </li>
            }
          </ul>
        </aside>

        <div class="table-content">
          @if (!selected) {
            <p class="hint">Izaberi kolekciju sa leve strane.</p>
          } @else {
            <div class="table-head">
              <h2>{{ selected.name }}</h2>
              <span class="hint">{{ rowsResponse ? rowsResponse.count : 0 }} dokumenata ukupno</span>
              <span class="spacer"></span>
              <button
                type="button"
                class="drop-btn"
                [class.confirm]="confirmingDrop"
                (click)="startDrop()"
              >
                {{ confirmingDrop ? 'Potvrdi brisanje?' : 'Drop Table' }}
              </button>
            </div>
            @if (error) { <p class="err">{{ error }}</p> }
            @if (dropError) { <p class="err">{{ dropError }}</p> }
            <app-data-table [rows]="rowsResponse ? rowsResponse.rows : []" [emptyText]="'Kolekcija je prazna.'" />
          }
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      h1 { margin-bottom: 16px; }
      .tables-layout { display: flex; gap: 16px; align-items: flex-start; }
      .table-list {
        width: 260px;
        flex: 0 0 260px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 12px;
        max-height: calc(100vh - 200px);
        overflow-y: auto;
      }
      .table-list h2 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
      .table-list ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
      .table-item {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        padding: 7px 10px;
        background: none;
        border: 0;
        border-radius: 6px;
        color: var(--text);
        font-size: 13px;
        text-align: left;
      }
      .table-item:hover { background: var(--surface-2); }
      .table-item.active { background: var(--accent-strong); color: #fff; }
      .tcount { color: var(--text-muted); font-variant-numeric: tabular-nums; }
      .table-item.active .tcount { color: rgba(255, 255, 255, 0.8); }
      .table-content { flex: 1; min-width: 0; }
      .table-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      .table-head h2 { margin: 0; font-size: 16px; }
      .spacer { flex: 1; }
      .drop-btn {
        background: transparent;
        color: #ff9e9e;
        border: 1px solid rgba(255, 158, 158, 0.4);
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
      }
      .drop-btn:hover { background: rgba(255, 158, 158, 0.1); }
      .drop-btn.confirm { background: #ff9e9e; color: #17191c; border-color: #ff9e9e; }
      .hint { color: var(--text-muted); font-size: 13px; }
      .err { color: #ff9e9e; font-size: 13px; }
    `,
  ],
})
export class TablesComponent implements OnInit {
  private tools = inject(ToolsService);

  tables: DbTable[] = [];
  selected: DbTable | null = null;
  rowsResponse: TableRowsResponse | null = null;
  loading = true;
  error = '';
  dropError = '';
  confirmingDrop = false;
  private dropTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.tools.listTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        this.loading = false;
        if (tables.length) this.select(tables[0]);
      },
      error: (e) => {
        this.loading = false;
        this.error = e.error?.error || e.message;
      },
    });
  }

  select(t: DbTable): void {
    this.selected = t;
    this.rowsResponse = null;
    this.error = '';
    this.dropError = '';
    this.confirmingDrop = false;
    this.tools.tableRows(t.name).subscribe({
      next: (res) => (this.rowsResponse = res),
      error: (e) => (this.error = e.error?.error || e.message),
    });
  }

  // Dva klika: prvi trazi potvrdu (4s), drugi brise kolekciju
  startDrop(): void {
    if (!this.selected) return;
    if (!this.confirmingDrop) {
      this.confirmingDrop = true;
      this.dropTimer = setTimeout(() => (this.confirmingDrop = false), 4000);
      return;
    }
    if (this.dropTimer) clearTimeout(this.dropTimer);
    this.confirmingDrop = false;
    this.dropError = '';

    const name = this.selected.name;
    this.tools.dropTable(name).subscribe({
      next: () => {
        this.selected = null;
        this.rowsResponse = null;
        this.tools.listTables().subscribe({
          next: (tables) => {
            this.tables = tables;
            if (tables.length) this.select(tables[0]);
          },
        });
      },
      error: (e) => (this.dropError = e.error?.error || e.message),
    });
  }
}
