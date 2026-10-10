// /api/prompt (guide §3.4) — koristi ga PromptTester u dashboard-u
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PromptResponse } from '../models/ai.model';

@Injectable({ providedIn: 'root' })
export class PromptService {
  private http = inject(HttpClient);

  send(componentId: string, prompt: string): Observable<PromptResponse> {
    return this.http.post<PromptResponse>(`${environment.apiUrl}/prompt/${componentId}`, { prompt });
  }
}
