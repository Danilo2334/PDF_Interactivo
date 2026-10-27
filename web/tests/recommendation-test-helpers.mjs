import { load, schemas as analysisSchemas, context, diagnosis, analysis, record, gemini } from './analysis-test-helpers.mjs';
export { load, analysisSchemas, context, diagnosis, analysis, record };
export const schemas = load('lib/validations/recommendations.ts');
export function candidates() { return { candidates: schemas.REINFORCEMENT_TYPES.map((type, index) => ({
  type, relevant: index < 3, topicFit: index < 3 ? 3 : 0, needFit: index === 1 ? 3 : index === 0 ? 2 : 1,
  justification: `La opción ${type} permite comprender cómo se relacionan las transformaciones de energía.`,
  topicReference: diagnosis.topic, sourceQuote: context.selectedText, needQuote: 'comprender la relación',
})) }; }
export const options = schemas.rankRecommendations(candidates(), context, diagnosis);
export const result = { request_id: record.id, analysis_attempt_id: analysis.attempt_id, attempt_id: 'b802fe3f-83e2-44be-a393-d3f7eb09fa78',
  status: 'processing', options: [], empty_reason: null, error_code: null, model: null,
  started_at: analysis.started_at, updated_at: analysis.updated_at, lease_expires_at: analysis.lease_expires_at, finished_at: null, attempts: 1 };
export const provider = load('lib/reinforcements/recommendation-provider.ts', {
  '@/lib/validations/recommendations': schemas, '@/lib/reinforcements/analysis-provider': { getAnalysisConfiguration: () => null },
  '@/lib/reinforcements/gemini-provider': gemini,
});
