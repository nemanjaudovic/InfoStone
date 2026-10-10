import { Component, input } from '@angular/core';

// TODO: Input + PromptService.send(componentId) -> prikaz odgovora
@Component({
  selector: 'app-prompt-tester',
  standalone: true,
  template: `<h2>Prompt tester</h2>`,
})
export class PromptTesterComponent {
  componentId = input.required<string>();
}
