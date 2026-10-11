// /api/tools — AI alati za organizatora (dokument "AI ideje za dogadjaje")
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FaqAnswer, FeedbackReport, MarketingChannel, MarketingResponse } from '../models/ai.model';
import { DbTable, QueryRequest, QueryResult, TableRowsResponse } from '../models/dbtools.model';

@Injectable({ providedIn: 'root' })
export class ToolsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tools`;

  marketing(notes: string, channels: MarketingChannel[]): Observable<MarketingResponse> {
    return this.http.post<MarketingResponse>(`${this.base}/marketing`, { notes, channels });
  }

  feedback(componentId: string): Observable<FeedbackReport> {
    return this.http.post<FeedbackReport>(`${this.base}/feedback/${componentId}`, {});
  }

  faqChat(faq: string, schedule: string, question: string): Observable<FaqAnswer> {
    return this.http.post<FaqAnswer>(`${this.base}/faq-chat`, { faq, schedule, question });
  }

  // --- Dev alati: pregled tabela i upitna konzola ---

  listTables(): Observable<DbTable[]> {
    return this.http.get<DbTable[]>(`${this.base}/tables`);
  }

  tableRows(name: string): Observable<TableRowsResponse> {
    return this.http.get<TableRowsResponse>(`${this.base}/tables/${encodeURIComponent(name)}`);
  }

  runQuery(req: QueryRequest): Observable<QueryResult> {
    return this.http.post<QueryResult>(`${this.base}/query`, req);
  }

  dropTable(name: string): Observable<{ ok: boolean; dropped: string }> {
    return this.http.delete<{ ok: boolean; dropped: string }>(`${this.base}/tables/${encodeURIComponent(name)}`);
  }
}
