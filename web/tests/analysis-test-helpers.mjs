import { load, requestState, validation, owner, projectId, documentId, content, receipt } from './reinforcement-test-helpers.mjs';
export { load, owner, projectId, documentId, receipt };
export const schemas = load('lib/validations/contextual-analysis.ts');
export const requestSchemas = load('lib/validations/request-list.ts', { '@/lib/reinforcements/state': requestState, '@/lib/validations/reinforcement-request': validation });
export const contextModule = load('lib/reinforcements/analysis-context.ts', { '@/lib/validations/contextual-analysis': schemas });
export const gemini = load('lib/reinforcements/gemini-provider.ts');
export const provider = load('lib/reinforcements/analysis-provider.ts', { '@/lib/validations/contextual-analysis': schemas, '@/lib/reinforcements/gemini-provider': gemini });
export const record = { id: receipt.id, project_id: projectId, document_id: documentId, owner_id: owner, page_number: 1,
  status: 'pending', stage: 'queued', created_at: receipt.createdAt, updated_at: receipt.createdAt, error_message: null,
  selection: null, selected_text: 'La energía se conserva en un sistema aislado.', text_source: 'digital', category: content.category, need: content.need };
export const context = contextModule.buildAnalysisContext(record, `${record.selected_text} No se crea ni se destruye; se transforma.`, '', 'a'.repeat(64));
export const diagnosis = { sufficient: true, topic: 'Conservación de la energía', concepts: ['Energía', 'Sistema aislado'],
  scope: 'Explicar la conservación y distinguirla de las transformaciones de energía.', reason: '', quotes: ['La energía se conserva en un sistema aislado.'] };
export const analysis = { request_id: receipt.id, attempt_id: '941391c4-f6d4-4ee9-a860-bf4e650cd77d', status: 'processing', context: null, diagnosis: null, model: null, error_code: null,
  started_at: receipt.createdAt, updated_at: receipt.createdAt, lease_expires_at: '2099-01-01T00:00:00.000Z', finished_at: null, attempts: 1 };
