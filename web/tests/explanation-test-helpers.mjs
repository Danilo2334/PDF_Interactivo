import { load, analysisSchemas, context, diagnosis, analysis, record } from './recommendation-test-helpers.mjs';
export { load, analysisSchemas, context, diagnosis, analysis, record };
export const schemas = load('lib/validations/explanation.ts');
export const gemini = load('lib/reinforcements/ai-provider.ts');
export const provider = load('lib/reinforcements/explanation-provider.ts', {
  '@/lib/reinforcements/ai-provider': gemini, '@/lib/validations/explanation': schemas,
});
export const explanation = { title: 'La conservación de la energía',
  text: 'La energía de un sistema aislado permanece constante porque no se intercambia energía con el entorno. Las transformaciones entre energía potencial y cinética cambian su forma, sin crear ni destruir energía.',
  sourceQuote: context.selectedText, topicReference: diagnosis.topic };
export const generation = { request_id: record.id, detail_level: 'intermediate', version: 1, status: 'draft', approval_status: 'pending',
  attempt_id: null, analysis_attempt_id: null, choice_version: 1, content: null, model: null, error_code: null,
  started_at: null, updated_at: analysis.updated_at, lease_expires_at: null, finished_at: null, attempts: 0 };
