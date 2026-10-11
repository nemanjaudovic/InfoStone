// /api/submissions (guide §6 Submissions)
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AskResponse, Submission } from '../models/submission.model';

@Injectable({ providedIn: 'root' })
export class SubmissionsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/submissions`;

  list(componentId: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${this.base}/${componentId}`);
  }

  // Chatbox ispod tabele: prompt + redovi -> Gemma ocenjuje svaki red
  ask(componentId: string, prompt: string, maxRows: number): Observable<AskResponse> {
    return this.http.post<AskResponse>(`${this.base}/${componentId}/ask`, { prompt, maxRows });
  }

  export(componentId: string, format: 'csv' | 'json'): Observable<Blob> {
    return this.http.get(`${this.base}/${componentId}/export`, { params: { format }, responseType: 'blob' });
  }
}
