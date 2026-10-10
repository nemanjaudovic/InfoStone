// guide §5.2
export type ComponentType = 'form' | 'tableview' | 'search' | 'graph';
export type FormFieldType = 'text' | 'textarea' | 'checkbox' | 'radio' | 'file';

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[]; // checkbox / radio
  minLength?: number;
  maxLength?: number;
  inputType?: 'text' | 'email'; // za type 'text'
}

// Sadrzaj polja `schema` zavisi od tipa komponente
export interface ComponentSchema {
  fields?: FormField[];            // form
  thankYouMessage?: string;        // form
  companies?: string[];            // form sa CV-em: kompanije za CV Coach & Matcher
  sourceComponentId?: string;      // tableview / graph: iz koje forme citaju
  columns?: string[];              // tableview
  chartType?: 'pie' | 'bar' | 'line'; // graph
  groupBy?: string;                // graph
  maxResults?: number;             // search
}

export interface InfoComponent {
  _id: string;
  owner: string;
  type: ComponentType;
  index: number;
  collectionName: string;
  title: string;
  schema: ComponentSchema;
  sensitive: boolean;
  promptEnabled: boolean;
  cssSourceId: string | null;
  styledHtml: string; // Gemma spoj HTML + CSS; prazno = stil nije primenjen
  createdAt: string;
}

export interface CreateComponentDto {
  type: ComponentType;
  title: string;
  schema: ComponentSchema;
  sensitive: boolean;
  promptEnabled: boolean;
}

// Odgovor na kreiranje: sifra za sensitive komponentu stize samo jednom
export interface CreateComponentResponse {
  component: InfoComponent;
  password?: string;
}
