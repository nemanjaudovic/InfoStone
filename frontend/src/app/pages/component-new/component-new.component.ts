import { Component } from '@angular/core';

// TODO: Wizard: izbor tipa (form/tableview/search/graph) -> odgovarajuci builder -> ComponentsService.create
@Component({
  selector: 'app-component-new',
  standalone: true,
  template: `<h2>Nova komponenta</h2>`,
})
export class ComponentNewComponent {}
