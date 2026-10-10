// /api/components (guide §6 Komponente)
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateComponentDto, CreateComponentResponse, InfoComponent } from '../models/component.model';

@Injectable({ providedIn: 'root' })
export class ComponentsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/components`;

  list(): Observable<InfoComponent[]> {
    return this.http.get<InfoComponent[]>(this.base);
  }

  get(id: string): Observable<InfoComponent> {
    return this.http.get<InfoComponent>(`${this.base}/${id}`);
  }

  create(dto: CreateComponentDto): Observable<CreateComponentResponse> {
    return this.http.post<CreateComponentResponse>(this.base, dto);
  }

  update(id: string, dto: Partial<CreateComponentDto>): Observable<InfoComponent> {
    return this.http.put<InfoComponent>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // URL koji ide u <iframe src="...">
  embedUrl(id: string): string {
    return `${environment.embedBaseUrl}/${id}/embed`;
  }
}
