import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
export function load(relative, dependencies = {}, globals = {}) {
  const filename = new URL(`../${relative}`, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, { exports, Request, Response, URL, Headers, File, FormData, Buffer, AbortSignal, AbortController, fetch, crypto, process, Date, Error, structuredClone, Uint8Array, TextDecoder, setTimeout, clearTimeout,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name === 'server-only') return {};
      if (['@/lib/reinforcements/ai-provider', '@/lib/reinforcements/gemini-provider', '@/lib/reinforcements/openai-provider'].includes(name)) return load(name.slice(2)+'.ts');
      if (['zod', 'node:crypto', 'react/jsx-runtime'].includes(name)) return require(name);
      throw Error(`Unexpected dependency: ${name}`);
    }, ...globals,
  }, { filename: filename.pathname });
  return exports;
}
export const requestState = load('lib/reinforcements/state.ts');
export const validation = load('lib/validations/reinforcement-request.ts', { '@/lib/reinforcements/state': requestState });
export const proof = load('lib/reinforcements/request-proof.ts', { '@/lib/validations/reinforcement-request': validation });
export const submission = load('lib/reinforcements/submission.ts', { '@/lib/validations/reinforcement-request': validation });
export const owner = '8f4cf03b-4713-43f1-9b6c-d435457f5afe';
export const other = 'f95f9e48-dc9f-44b8-b6f0-a566f5fe5aa6';
export const projectId = '557c6125-d5ca-401b-b105-31a051699371';
export const documentId = '73f3c087-a137-4cd3-a1e1-d126599b9c86';
export const idempotencyKey = '2f199784-0d8b-47ee-8e12-96834511726c';
export const content = { documentId, pageNumber: 1, fragment: null, text: 'Texto del PDF para explicar.', source: 'digital',
  category: 'concept', need: 'Necesito comprender la relación entre estas ideas.' };
export const receipt = { id: 'cd6a4eb3-2b44-4a21-8a38-c64634cc612c', status: 'pending', createdAt: '2026-10-26T12:00:00.000Z' };
