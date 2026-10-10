import { Component, input } from '@angular/core';

// Analiza CV-a za jednu formu (dokument "AI ideje za dogadjaje"):
// TODO: dugme "Analiziraj CV-eve" -> CvService.analyze
// TODO: lista profila (vestine, neizrecene vestine, Complexity Score, Tech Stack Breadth, red flags, arhetip)
// TODO: prekidac Blind Recruiting Mode -> CvService.profiles(id, true)
// TODO: semanticka pretraga "opisi potrebu" -> CvService.search -> kandidati + obrazlozenje
@Component({
  selector: 'app-cv-analysis',
  standalone: true,
  template: `<h2>Analiza CV-a</h2>`,
})
export class CvAnalysisComponent {
  componentId = input.required<string>(); // iz rute /cv/:componentId
}
