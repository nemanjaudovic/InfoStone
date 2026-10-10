import { Component, input } from '@angular/core';

// TODO: Prikazi <iframe src=embedUrl(componentId)> + dugme Copy
@Component({
  selector: 'app-embed-code',
  standalone: true,
  template: `<h2>Embed kod</h2>`,
})
export class EmbedCodeComponent {
  componentId = input.required<string>();
}
