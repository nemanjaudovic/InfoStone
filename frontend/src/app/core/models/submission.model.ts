// guide §5.4
import { CvAnalysis } from './ai.model';

export interface SubmissionFile {
  field: string;
  filename: string;
  path: string;
  size: number;
}

export interface Submission {
  _id: string;
  submittedAt: string;
  data: Record<string, unknown>;
  files: SubmissionFile[];
  cvAnalysis?: CvAnalysis; // popunjava /api/cv/:componentId/analyze
}

// Tabela + chatbox: POST /api/submissions/:componentId/ask
export interface RowEvaluation {
  matchScore: number;      // 0-100
  meetsCriteria: boolean;
  summary: string;         // obrazlozenje Gemme
  keyHighlights: string[];
}

export interface AskResult {
  submission: Submission;
  evaluation: RowEvaluation;
}

export interface AskResponse {
  prompt: string;
  total: number;      // ukupno redova u tabeli
  processed: number;  // koliko je Gemma obradila (najnoviji redovi)
  matched: number;    // koliko odgovara kriterijumu
  results: AskResult[];
}
