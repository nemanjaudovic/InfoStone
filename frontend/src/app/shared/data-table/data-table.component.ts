import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Row = Record<string, unknown>;

// Dokument forme ima { data: {...}, files: [...] } — prikazujemo polja iz `data`
// ravno, a fajlove kao listu imena (relacioni prikaz, ne JSON).
function flattenDoc(doc: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'data' && value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, value as Row);
    } else if (key === 'files' && Array.isArray(value)) {
      out[key] = (value as { filename?: string; name?: string }[])
        .map((f) => f.filename || f.name || '')
        .filter(Boolean)
        .join(', ');
    } else {
      out[key] = value;
    }
  }
  return out;
}

function fmt(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.map(fmt).join(', ');
    if (value instanceof Date) return value.toLocaleString();
    return JSON.stringify(value);
  }
  return String(value);
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const sa = fmt(a).toLowerCase();
  const sb = fmt(b).toLowerCase();
  return sa.localeCompare(sb);
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="dt">
      <div class="dt-toolbar">
        <input class="dt-search" [(ngModel)]="search" placeholder="Pretraga..." />
        <span class="dt-count">{{ visible.length }} redova</span>
      </div>
      @if (visible.length) {
        <div class="dt-scroll">
          <table>
            <thead>
              <tr>
                @for (col of columns; track col) {
                  <th (click)="toggleSort(col)" [class.sorted]="sortKey === col">
                    {{ col }} @if (sortKey === col) { <span class="arrow">{{ sortAsc ? '▲' : '▼' }}</span> }
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of visible; track $index) {
                <tr>
                  @for (col of columns; track col) {
                    <td [title]="fmt(row[col])">{{ cell(col, row[col]) }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="dt-empty">{{ emptyText() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .dt-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
      .dt-search {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 7px 10px;
        color: var(--text);
        font-size: 13px;
        width: 240px;
      }
      .dt-count { color: var(--text-muted); font-size: 12px; white-space: nowrap; }
      .dt-scroll {
        overflow: auto;
        max-height: calc(100vh - 280px);
        border: 1px solid var(--border);
        border-radius: 8px;
      }
      table { border-collapse: collapse; width: 100%; font-size: 13px; }
      thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: var(--surface-2);
        color: var(--text-muted);
        text-align: left;
        font-weight: 600;
        padding: 8px 12px;
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
        border-bottom: 1px solid var(--border);
      }
      thead th:hover { color: var(--text); }
      thead th.sorted { color: var(--accent); }
      .arrow { font-size: 10px; }
      tbody td {
        padding: 7px 12px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
        max-width: 320px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.02); }
      tbody tr:hover { background: var(--surface); }
      .dt-empty { color: var(--text-muted); padding: 24px; text-align: center; }
    `,
  ],
})
export class DataTableComponent {
  readonly rows = input<Row[]>([]);
  readonly emptyText = input('Nema redova.');

  search = '';
  sortKey: string | null = null;
  sortAsc = true;

  private get flatRows(): Row[] {
    return this.rows().map(flattenDoc);
  }

  get columns(): string[] {
    const cols: string[] = [];
    for (const row of this.flatRows) {
      for (const key of Object.keys(row)) {
        if (!cols.includes(key)) cols.push(key);
      }
    }
    return cols;
  }

  get visible(): Row[] {
    const q = this.search.trim().toLowerCase();
    let rows = this.flatRows;
    if (q) {
      rows = rows.filter((r) => this.columns.some((c) => fmt(r[c]).toLowerCase().includes(q)));
    }
    if (this.sortKey) {
      const key = this.sortKey;
      const dir = this.sortAsc ? 1 : -1;
      rows = [...rows].sort((a, b) => compare(a[key], b[key]) * dir);
    }
    return rows;
  }

  toggleSort(col: string): void {
    if (this.sortKey === col) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = col;
      this.sortAsc = true;
    }
  }

  fmt(value: unknown): string {
    return fmt(value);
  }

  cell(col: string, value: unknown): string {
    if (/password|secret|token/i.test(col)) return '••••••';
    return fmt(value);
  }
}
