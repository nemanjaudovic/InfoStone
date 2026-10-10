// /api/cv — Analiza CV-a (dokument "AI ideje za dogadjaje")
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CvProfile, CvSearchResult } from '../models/ai.model';

@Injectable({ providedIn: 'root' })
export class CvService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/cv`;

  analyze(componentId: string): Observable<{ analyzed: number }> {
    return this.http.post<{ analyzed: number }>(`${this.base}/${componentId}/analyze`, {});
  }

  profiles(componentId: string, blind = false): Observable<CvProfile[]> {
    return this.http.get<CvProfile[]>(`${this.base}/${componentId}/profiles`, { params: { blind } });
  }

  search(componentId: string, query: string, topK = 5): Observable<CvSearchResult[]> {
    return this.http.post<CvSearchResult[]>(`${this.base}/${componentId}/search`, { query, topK });
  }
}
