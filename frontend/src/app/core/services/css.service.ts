// /api/css — "Primeni stil": Gemma spaja HTML komponente i CSS organizacije (guide §7.1)
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CssUploadResponse {
  cssSourceId: string;
}

export interface CssApplyResponse {
  styledHtml: string; // za preview; sacuvan je i u komponenti
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CssService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/css`;

  // 1. sacuvaj sirov CSS organizacije
  upload(file: File): Observable<CssUploadResponse> {
    const body = new FormData();
    body.append('css', file);
    return this.http.post<CssUploadResponse>(`${this.base}/upload`, body);
  }

  // 2. klik "Primeni stil": backend salje Gemmi HTML komponente + CSS i cuva spoj
  apply(componentId: string, cssSourceId: string): Observable<CssApplyResponse> {
    return this.http.post<CssApplyResponse>(`${this.base}/apply`, { componentId, cssSourceId });
  }
}
