import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-screen">
      <form class="login-card" (ngSubmit)="logIn()">
        <h1 class="brand">InfoStone</h1>
        <p class="subtitle">Sign in to your workspace</p>

        <label class="field">
          <span>Username</span>
          <input name="username" [(ngModel)]="username" placeholder="gdg" autocomplete="username" />
        </label>

        <label class="field">
          <span>Password</span>
          <input name="password" type="password" [(ngModel)]="password" placeholder="••••••••" autocomplete="current-password" />
        </label>

        <button type="submit" class="login-btn">Log In</button>
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
    `,
  ],
})
export class LoginComponent {
  private router = inject(Router);
  username = '';
  password = '';

  logIn(): void {
    // Nema prave autentifikacije jos: uvek se ulazi na welcome.
    this.router.navigateByUrl('/welcome');
  }
}
