export type GenieTutorStep =
  | 'content_ingestion'
  | 'analyze'
  | 'design'
  | 'develop'
  | 'implement'
  | 'evaluate'
  | 'personalisation'
  | 'manager_portal'
  | 'governance';

export interface GenieTutorContext {
  step: GenieTutorStep;
  summary: string;
  sourceCount: number;
  draftCount: number;
  assessmentCount: number;
}

export function buildGenieTutorContext(input: {
  step: GenieTutorStep;
  sources?: { id: string }[];
  drafts?: { id: string }[];
  assessments?: { id: string }[];
}): GenieTutorContext {
  const sources = input.sources ?? [];
  const drafts = input.drafts ?? [];
  const assessments = input.assessments ?? [];

  return {
    step: input.step,
    summary: `Sources: ${sources.length}, Drafts: ${drafts.length}, Assessments: ${assessments.length}.`,
    sourceCount: sources.length,
    draftCount: drafts.length,
    assessmentCount: assessments.length
  };
}
