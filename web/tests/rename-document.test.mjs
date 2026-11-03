import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadModule(relativePath, dependencies) {
  const filename = fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, { exports, require(name) {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } }, { filename });
  return exports;
}

const projectId = "557c6125-d5ca-401b-b105-31a051699371";
const ownerId = "8f4cf03b-4713-43f1-9b6c-d435457f5afe";
function fixture({ access = { ok: true, userId: ownerId, role: "owner" }, data = { id: projectId, name: "Nuevo nombre", updated_at: "2026-10-25T12:00:00Z" }, error = null } = {}) {
  const calls = [], paths = [], permissions = [];
  const schema = loadModule("lib/validations/rename-document.ts", { zod: require("zod") });
  const action = loadModule("app/actions/rename-document.ts", {
    "next/cache": { revalidatePath(path) { paths.push(path); } },
    "@/lib/auth/access": { async checkPermission(value) { permissions.push(value); return access; } },
    "@/lib/validations/rename-document": schema,
    "@/lib/supabase/server": { async createClient() {
      const query = {
        update(value) { calls.push(["update", value]); return this; },
        eq(key, value) { calls.push(["eq", key, value]); return this; },
        select(value) { calls.push(["select", value]); return this; },
        async maybeSingle() { return { data, error }; },
      };
      return { from(table) { calls.push(["from", table]); return query; } };
    } },
  });
  return { action: action.renameDocumentAction, calls, paths, permissions };
}

test("renaming requires the existing manage-own permission before accessing projects", async () => {
  for (const status of [401, 403, 503]) {
    const f = fixture({ access: { ok: false, status, message: "Acceso rechazado" } });
    const result = await f.action({ projectId, name: "Nuevo" });
    assert.equal(result.success, false); assert.equal(result.message, "Acceso rechazado");
    assert.deepEqual(f.permissions, ["documents.manage.own"]);
    assert.deepEqual(f.calls, []); assert.deepEqual(f.paths, []);
  }
});

test("empty, whitespace, non-text and oversized names never reach the update", async () => {
  for (const name of ["", " \t\n ", null, 123, "a".repeat(256)]) {
    const f = fixture(); const result = await f.action({ projectId, name });
    assert.equal(result.success, false); assert.ok(result.nameError);
    assert.deepEqual(f.calls, []); assert.deepEqual(f.paths, []);
  }
});

test("an invalid project identifier is rejected before reaching the database", async () => {
  const f = fixture(); const result = await f.action({ projectId: "not-a-uuid", name: "Nuevo" });
  assert.equal(result.success, false); assert.deepEqual(f.calls, []); assert.deepEqual(f.paths, []);
});

test("a valid rename trims the title and confines the update to the authenticated owner", async () => {
  const f = fixture();
  const result = await f.action({ projectId, name: "  Guía de lectura — versión 2  ", owner_id: "other-user", document_id: "other-document" });
  assert.equal(result.success, true);
  assert.equal(f.calls[0][0], "from"); assert.equal(f.calls[0][1], "projects");
  assert.equal(JSON.stringify(f.calls[1]), JSON.stringify(["update", { name: "Guía de lectura — versión 2" }]));
  assert.deepEqual(f.calls.filter(c => c[0] === "eq"), [["eq", "id", projectId], ["eq", "owner_id", ownerId]]);
  assert.deepEqual(f.paths, ["/documents", `/projects/${projectId}`]);
});

test("a missing or foreign project is unavailable and never reported as saved", async () => {
  const f = fixture({ data: null }); const result = await f.action({ projectId, name: "Nuevo" });
  assert.equal(result.success, false); assert.equal(result.message, "El documento no está disponible.");
  assert.ok(f.calls.some(c => c[0] === "eq" && c[1] === "owner_id" && c[2] === ownerId));
  assert.deepEqual(f.paths, []);
});

test("database failures keep the UI cache unchanged and expose no database details", async () => {
  const f = fixture({ data: null, error: { code: "42501", message: "private database detail" } });
  const result = await f.action({ projectId, name: "Nuevo" });
  assert.equal(result.success, false); assert.doesNotMatch(result.message, /42501|private/);
  assert.deepEqual(f.paths, []);
});
