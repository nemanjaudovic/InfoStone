// /api/submissions (guide §6 Submissions)
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Submission } from '../models/submission.model';

@Injectable({ providedIn: 'root' })
export class SubmissionsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/submissions`;

  list(componentId: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${this.base}/${componentId}`);
  }

  export(componentId: string, format: 'csv' | 'json'): Observable<Blob> {
    return this.http.get(`${this.base}/${componentId}/export`, { params: { format }, responseType: 'blob' });
  }
}
