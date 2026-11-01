// Real HTTP verification of the synthetic HTTPS QA fixture. No login or writes.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import https from "node:https";

const origin = "https://pdf-interactivo-qa.vercel.app";
const pdfSha = "e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946";
const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8")) : {};
const body = event.pull_request?.body ?? "";
const field = name => body.match(new RegExp(`^${name}:\\s*(\\S+)\\s*$`, "m"))?.[1];
const url = new URL(process.env.QA_PUBLIC_READER_URL || event.inputs?.reader_url || field("QA-Reader-URL") || "https://invalid.example/");
const mode = process.env.QA_EXPECTED_STATE || event.inputs?.expected_state || field("QA-Expected-State") || "public";
assert.equal(url.origin, origin, "Only the existing HTTPS QA origin is allowed");
assert.match(url.pathname, /^\/read\/[a-f0-9]{48}$/, "Expected a public QA reader link");
assert.ok(!url.username && !url.password && !url.search && !url.hash, "Unexpected target credentials or parameters");
assert.ok(["public", "retired"].includes(mode), "Expected state must be public or retired");
assert.ok(Number(process.versions.node.split(".")[0]) >= 22, "Node 22 or newer is required");
if (process.env.GITHUB_ACTIONS === "true") assert.equal(process.env.QA_RUNNER_ENVIRONMENT, "github-hosted", "An external GitHub-hosted runner is required");

const api = "/api" + url.pathname;
const report = {
  schemaVersion: 1, startedAt: new Date().toISOString(), origin, mode,
  tokenFingerprint: createHash("sha256").update(url.pathname).digest("hex"),
  runner: { environment: process.env.QA_RUNNER_ENVIRONMENT || "local", os: process.env.RUNNER_OS || process.platform,
    arch: process.arch, node: process.version, source: process.env.GITHUB_SHA || null,
    runUrl: process.env.GITHUB_RUN_ID ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null },
  scope: "Anonymous HTTP client and real delivered resources; no browser automation, login, quiz submissions or AI calls.",
  checks: [],
};
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
async function check(name, action) {
  const details = await action(); report.checks.push({ name, passed: true, ...details }); console.log(`PASS ${name}`);
}
function client() {
  const cookies = new Map();
  return { cookies, async get(path) {
    const target = new URL(path, origin); assert.equal(target.origin, origin, "Cross-origin request refused");
    const cookie = [...cookies.values()].filter(c => target.pathname.startsWith(c.path)).map(c => c.pair).join("; ");
    const response = await fetch(target, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {}, signal: AbortSignal.timeout(20000) });
    for (const raw of response.headers.getSetCookie()) {
      const pair = raw.split(";")[0], key = pair.slice(0, pair.indexOf("="));
      cookies.set(key, { pair, path: raw.match(/;\s*Path=([^;]+)/i)?.[1] || "/", secure: /;\s*Secure(?:;|$)/i.test(raw), httpOnly: /;\s*HttpOnly(?:;|$)/i.test(raw), sameSite: /;\s*SameSite=Lax(?:;|$)/i.test(raw) });
    }
    const bytes = Buffer.from(await response.arrayBuffer()); assert.ok(bytes.length <= 8 * 1024 * 1024, "QA response too large");
    return { response, bytes };
  } };
}
const a = client(), b = client();
function status(result, expected = 200) { assert.equal(result.response.status, expected, "Unexpected HTTP status"); }
function noStore(result) { assert.match(result.response.headers.get("cache-control") || "", /no-store/i, "Reader response must not be cached"); }
function privateFields(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!/^(owner_id|ownerId|document_id|documentId|requestId|sourceVersionId|snapshot_hash|storage_path|storagePath|approvedBy|approved_by|correctIndex|correctOption|explanation|access_token|refresh_token)$/i.test(key), "Private field in public projection");
    privateFields(child);
  }
}

try {
  await check("verified_tls", async () => {
    const tls = await new Promise((resolve, reject) => {
      const request = https.get(origin + "/login", { agent: new https.Agent({ keepAlive: false, maxCachedSessions: 0 }), timeout: 15000 }, response => {
        const certificate = response.socket.getPeerCertificate();
        resolve({ authorized: response.socket.authorized, protocol: response.socket.getProtocol(), subject: certificate.subject?.CN,
          issuer: certificate.issuer?.O, validFrom: certificate.valid_from, validTo: certificate.valid_to }); response.resume();
      });
      request.on("timeout", () => request.destroy(new Error("TLS timeout"))); request.on("error", reject);
    });
    assert.equal(tls.authorized, true); return tls;
  });
  await check("http_redirects_to_https", async () => {
    const target = new URL(url); target.protocol = "http:";
    const response = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 308); assert.equal(response.headers.get("location"), url.href); await response.body?.cancel(); return { status: response.status };
  });
  const page = await a.get(url.pathname);
  await check("reader_html_and_initial_assets", async () => {
    status(page); noStore(page); const html = page.bytes.toString("utf8");
    assert.ok(html.includes("PDF Interactivo"));
    const sources = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/gi)].map(m => m[1].replaceAll("&amp;", "&"));
    assert.ok(sources.every(source => !source.startsWith("http:")), "Mixed HTTP resource");
    const assets = [...new Set(sources)].filter(source => /^\/_next\/.+\.(?:js|css)(?:\?|$)/.test(source));
    assert.ok(assets.length > 0 && assets.length <= 30, "Initial application assets missing or unexpected");
    let bytes = 0;
    for (const asset of assets) { const result = await a.get(asset); status(result); assert.ok(result.bytes.length > 0); bytes += result.bytes.length; }
    return { status: page.response.status, initialAssets: assets.length, assetBytes: bytes };
  });
  if (mode === "retired") {
    await check("retired_projection_and_pdf", async () => {
      const view = await a.get(api), pdf = await a.get(api + "/assets/pdf"); status(view, 404); status(pdf, 404); noStore(view); noStore(pdf);
      return { projectionStatus: 404, pdfStatus: 404 };
    });
  } else {
    const result = await a.get(api); status(result); noStore(result); const data = JSON.parse(result.bytes);
    await check("anonymous_approved_projection", async () => {
      assert.equal(data.state, "ready"); assert.equal(data.view.privateTest, false); assert.equal(data.view.name, "QA-HU015-019-digital");
      assert.equal(data.view.items.length, 7); privateFields(data);
      assert.ok(data.view.items.every(item => /^[rmq]_[a-f0-9]{32}$/.test(item.id)));
      return { status: 200, version: data.view.version, reinforcements: data.view.items.length, privateFields: false };
    });
    await check("secure_independent_anonymous_sessions", async () => {
      const second = await b.get(api); status(second); assert.equal(JSON.parse(second.bytes).state, "ready");
      assert.equal(a.cookies.size, 1); assert.equal(b.cookies.size, 1);
      assert.ok([...a.cookies.values(), ...b.cookies.values()].every(c => c.secure && c.httpOnly && c.sameSite));
      assert.notEqual([...a.cookies.values()][0].pair, [...b.cookies.values()][0].pair);
      return { httpOnly: true, secure: true, sameSiteLax: true, independent: true };
    });
    await check("published_pdf_matches_original", async () => {
      const pdf = await a.get(api + "/assets/pdf"); status(pdf); noStore(pdf); assert.match(pdf.response.headers.get("content-type") || "", /application\/pdf/);
      assert.equal(pdf.bytes.length, 1580); assert.equal(digest(pdf.bytes), pdfSha); return { bytes: pdf.bytes.length, sha256: digest(pdf.bytes) };
    });
    await check("pdf_worker_delivery", async () => {
      const worker = await a.get("/pdfjs/pdf.worker.min.mjs"); status(worker); assert.match(worker.response.headers.get("content-type") || "", /javascript/);
      assert.ok(worker.bytes.length > 10000); return { status: 200, bytes: worker.bytes.length };
    });
    await check("approved_multimedia_delivery", async () => {
      const media = data.view.items.flatMap(item => item.media); assert.equal(media.length, 2);
      const image = media.find(item => item.kind === "image"); assert.ok(image); assert.equal(image.url, null);
      const delivered = await a.get(api + "/assets/" + image.id); status(delivered); noStore(delivered);
      assert.match(delivered.response.headers.get("content-type") || "", /^image\/png/); assert.ok(delivered.bytes.length > 0);
      assert.ok(media.filter(item => item.kind === "link").every(item => new URL(item.url).protocol === "https:"));
      return { resources: media.length, imageBytes: delivered.bytes.length, privateStorageUrl: false };
    });
    await check("quiz_keys_hidden_and_attempts_isolated", async () => {
      const quizzes = data.view.items.filter(item => item.quiz).map(item => item.quiz); assert.equal(quizzes.length, 2);
      for (const quiz of quizzes) {
        for (const question of quiz.questions) assert.deepEqual(Object.keys(question).sort(), ["options", "prompt"]);
        for (const reader of [a, b]) {
          const attempt = await reader.get(api + "/quizzes/" + quiz.id + "/attempts"); status(attempt); noStore(attempt);
          const value = JSON.parse(attempt.bytes); assert.equal(value.latest, null); assert.equal(value.attempts, 0); assert.equal(value.allowRetries, quiz.allowRetries);
        }
      }
      return { quizzes: quizzes.length, initialAnswerKeys: false, previousReaderResults: false, submissions: 0 };
    });
  }
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.message; process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  if (process.env.QA_REPORT_PATH) await writeFile(process.env.QA_REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## Real HTTPS QA: ${mode}\n\nResult: **${report.passed ? "PASS" : "FAIL"}**. ${report.checks.length} observed checks.\n\n` +
    `Client: ${report.runner.environment}, ${report.runner.os}, ${report.runner.node}. No browser automation or authenticated owner session.\n\n` +
    report.checks.map(item => `- ${item.name}: PASS`).join("\n") + "\n");
  console.log("QA_EXTERNAL_RESULT " + JSON.stringify(report));
}
