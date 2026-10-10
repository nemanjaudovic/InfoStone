import { Component, input } from '@angular/core';
import { EmbedCodeComponent } from '../../shared/embed-code/embed-code.component';
import { CssUploaderComponent } from '../../shared/css-uploader/css-uploader.component';
import { PromptTesterComponent } from '../../shared/prompt-tester/prompt-tester.component';
import { SubmissionsTableComponent } from '../../shared/submissions-table/submissions-table.component';

// Pregled komponente: embed kod, CSS, prijave, test prompt-a
// TODO: ucitaj komponentu (ComponentsService.get) i prikazi delove zavisno od tipa
//       (prijave samo za form, prompt tester samo za tableview/search/graph, link ka /cv/:id za formu sa CV-em)
@Component({
  selector: 'app-component-detail',
  standalone: true,
  imports: [EmbedCodeComponent, CssUploaderComponent, PromptTesterComponent, SubmissionsTableComponent],
  template: `
    <h2>Komponenta {{ id() }}</h2>
    <app-embed-code [componentId]="id()" />
    <app-css-uploader [componentId]="id()" />
    <app-submissions-table [componentId]="id()" />
    <app-prompt-tester [componentId]="id()" />
  `,
})
export class ComponentDetailComponent {
  id = input.required<string>(); // iz rute /components/:id
}
