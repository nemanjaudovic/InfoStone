import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="login-screen">
      <form class="login-card" (ngSubmit)="register()">
        <h1 class="brand">InfoStone</h1>
        <p class="subtitle">Create your workspace</p>

        <label class="field">
          <span>Username</span>
          <input name="username" [(ngModel)]="username" placeholder="gdg" autocomplete="username" />
        </label>

        <label class="field">
          <span>Email</span>
          <input name="email" type="email" [(ngModel)]="email" placeholder="dev@gdg.com" autocomplete="email" />
        </label>

        <label class="field">
          <span>Password</span>
          <input name="password" type="password" [(ngModel)]="password" placeholder="at least 6 characters" autocomplete="new-password" />
        </label>

        @if (error) {
          <p class="error">{{ error }}</p>
        }
        <button type="submit" class="login-btn" [disabled]="loading">{{ loading ? 'Creating…' : 'Create account' }}</button>
        <p class="switch">Already have an account? <a routerLink="/login">Log in</a></p>
      </form>
    </div>
  `,
  styles: [
    `
      .login-screen {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .login-card {
        width: 340px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 28px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .brand { margin: 0; font-size: 26px; }
      .subtitle { margin: -8px 0 4px; color: var(--text-muted); font-size: 14px; }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-muted); }
      .field input {
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface-2);
        color: var(--text);
      }
      .login-btn {
        padding: 11px;
        border: 0;
        border-radius: 8px;
        background: var(--accent-strong);
        color: #fff;
        font-weight: 600;
      }
      .login-btn:hover { background: var(--accent); }
      .login-btn:disabled { opacity: 0.6; cursor: default; }
      .error { margin: 0; color: #ff9e9e; font-size: 13px; }
      .switch { margin: 0; font-size: 13px; color: var(--text-muted); text-align: center; }
    `,
  ],
})
export class RegisterComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  username = '';
  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  register(): void {
    this.loading = true;
    this.error = null;
    // POST /api/auth/register -> odmah ulogovan (token u AuthService)
    // Username: mala slova, brojevi, _ i - (ulazi u imena MongoDB kolekcija)
    this.auth.register(this.username.trim().toLowerCase(), this.email.trim(), this.password).subscribe({
      next: () => this.router.navigateByUrl('/welcome'),
      error: (err: HttpErrorResponse) => {
        this.error = err.error?.error || 'Registration failed. Is the backend running?';
        this.loading = false;
      },
    });
  }
}
