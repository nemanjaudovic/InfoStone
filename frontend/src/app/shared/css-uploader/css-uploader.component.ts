import { Component, input } from '@angular/core';

// TODO: izbor .css fajla -> CssService.upload -> dugme "Primeni stil" -> CssService.apply
//       -> preview: iframe na embedUrl (posle apply-a prikazuje Gemma spoj)
@Component({
  selector: 'app-css-uploader',
  standalone: true,
  template: `<h2>CSS uploader</h2>`,
})
export class CssUploaderComponent {
  componentId = input.required<string>();
}
