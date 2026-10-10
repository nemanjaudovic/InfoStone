import { Component, input } from '@angular/core';

// TODO: SubmissionsService.list + export CSV/JSON
@Component({
  selector: 'app-submissions-table',
  standalone: true,
  template: `<h2>Prijave</h2>`,
})
export class SubmissionsTableComponent {
  componentId = input.required<string>();
}
