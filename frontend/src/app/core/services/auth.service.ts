// /api/auth (guide §6 Auth)
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../models/user.model';

const TOKEN_KEY = 'infostone_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, { username, email, password }).pipe(tap((r) => this.save(r)));
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { username, password }).pipe(tap((r) => this.save(r)));
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.base}/me`);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  private save(r: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, r.token);
  }
}
