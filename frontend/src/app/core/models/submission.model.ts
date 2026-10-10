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
