import { Component } from '@angular/core';

@Component({
  selector: 'app-overview',
  standalone: true,
  template: `
    <section class="page">
      <h1>Welcome</h1>
      <p>Pick a section from the side menu to get started.</p>
    </section>
  `,
})
export class OverviewComponent {}
