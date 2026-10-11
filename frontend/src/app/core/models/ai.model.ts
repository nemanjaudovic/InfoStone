// Odgovori AI funkcionalnosti (Express vraca camelCase; vidi docs/api-contract.md)

// --- Prompt box (guide §3.4) ---
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance?: number;  // 0-1
  location?: string;   // search: lokacija / oblast (Gemma)
  details?: string[];  // search: kljucni detalji (Gemma)
}

export interface PromptResponse {
  explanation?: string;
  rows?: Record<string, unknown>[]; // tableview / graph
  columns?: string[];               // tableview
  chart?: { labels: string[]; values: number[] }; // graph
  summary?: string;                 // search
  results?: SearchResult[];         // search
}

// --- Analiza CV-a ---
export type CvStatus = 'ok' | 'unverified' | 'needs_review';
export type CvArchetype = 'Passionate Builder' | 'Academic Researcher' | 'Leadership Potential' | string;

export interface CvAnalysis {
  skills: string[];
  inferredSkills: string[];        // neizrecene vestine
  projectComplexityScore: number;  // 0-10
  techStackBreadth: number;        // 0-10
  redFlags: string[];
  status: CvStatus;
  archetype: CvArchetype;
}

export interface CvProfile {
  submissionId: string;
  name?: string;      // nema u blind modu
  faculty?: string;   // nema u blind modu
  analysis: CvAnalysis;
}

export interface CvSearchResult {
  submissionId: string;
  score: number;
  reason: string; // kratko obrazlozenje izbora
}

export interface CvCoachReport {
  tips: string[];
  matchedCompanies: { name: string; reason: string }[];
}

// --- AI alati za organizatora ---
export type MarketingChannel = 'linkedin' | 'instagram' | 'newsletter' | 'session_description';

export interface MarketingResponse {
  posts: Partial<Record<MarketingChannel, string>>;
}

export interface FeedbackReport {
  satisfactionScore: number;
  summary: string;
  alerts: { topic: string; message: string; severity: 'low' | 'medium' | 'high' }[];
  highlights: string[];
}

export interface FaqAnswer {
  answer: string;
}
