import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Login i welcome su full-screen ekrani sa sopstvenim layoutom,
// pa ovde ostaje samo router-outlet.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
