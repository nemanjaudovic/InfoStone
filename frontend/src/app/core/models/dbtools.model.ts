// Dev alati: Tables i Query (GET/POST /api/tools/tables, /api/tools/query)

export interface DbTable {
  name: string;
  count: number;
}

export interface TableRowsResponse {
  name: string;
  count: number;
  returned: number;
  rows: Record<string, unknown>[];
}

export type QueryMode = 'find' | 'aggregate';

export interface QueryRequest {
  collection: string;
  mode: QueryMode;
  query: unknown; // find: { filter, sort, project, limit } | aggregate: stage[]
}

export interface QueryResult {
  collection: string;
  matched: number;
  returned: number;
  durationMs: number;
  rows: Record<string, unknown>[];
}
