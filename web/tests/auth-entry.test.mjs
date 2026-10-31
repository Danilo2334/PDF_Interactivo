import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { NextRequest, NextResponse } from "next/server.js";
import ts from "typescript";
import { createServerEnvironment } from "../scripts/start-next.mjs";

const require = createRequire(import.meta.url);
const webRoot = new URL("../", import.meta.url);

function loadModule(relativePath, dependencies, globals = {}) {
  const filename = fileURLToPath(new URL(relativePath, webRoot));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports = {};

  runInNewContext(outputText, {
    exports,
    console,
    URL,
    ...globals,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name === "react/jsx-runtime" || name === "zod") return require(name);
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename });

  return exports;
}

function redirect(path) {
  throw new Error(`REDIRECT:${path}`);
}

function loginSessionFixture(epoch = "test-start") {
  const values = new Map();
  const writes = [];
  const cookieStore = {
    get(name) {
      return values.has(name) ? { value: values.get(name) } : undefined;
    },
    set(name, value, options) {
      values.set(name, value);
      writes.push({ name, value, options });
    },
    delete(name) { values.delete(name); },
  };
  const environment = { NODE_ENV: "development", PDF_INTERACTIVO_LOGIN_EPOCH: epoch };
  const session = loadModule("lib/auth/login-session.ts", {
    "server-only": {},
    "next/headers": { cookies: async () => cookieStore },
  }, { process: { env: environment } });

  return { session, writes, cookieStore, environment };
}

function proxyFixture({
  userId = null,
  isActive = true,
  profileError = null,
  loginUserId = userId,
  loginEpoch = "test-start",
} = {}) {
  let clientCalls = 0;
  const { updateSession } = loadModule("lib/supabase/proxy.ts", {
    "next/server": { NextResponse },
    "@/lib/auth/login-session": {
      LOGIN_SESSION_COOKIE: "pdf-interactivo-login-session",
      loginSessionValue: (id) => `test-start:${id}`,
    },
    "@supabase/ssr": {
      createServerClient(_url, _key, options) {
        clientCalls++;
        return {
          auth: {
            async getClaims() {
              options.cookies.setAll([{
                name: "test-session",
                value: "refreshed",
                options: { path: "/" },
              }]);
              return { data: { claims: userId ? { sub: userId } : null } };
            },
          },
          from(table) {
            assert.equal(table, "profiles");
            return {
              select(columns) {
                assert.equal(columns, "is_active");
                return {
                  eq(column, value) {
                    assert.equal(column, "id");
                    assert.equal(value, userId);
                    return {
                      async maybeSingle() {
                        return {
                          data: { is_active: isActive },
                          error: profileError,
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
  }, {
    process: {
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
      },
    },
  });

  return {
    request(path, options = {}) {
      const request = new NextRequest(`http://localhost:3000${path}`, options);
      if (loginUserId) {
        request.cookies.set("pdf-interactivo-login-session", `${loginEpoch}:${loginUserId}`);
      }
      return updateSession(request);
    },
    get clientCalls() { return clientCalls; },
  };
}

test("the home page always opens the login page", () => {
  const home = loadModule("app/page.tsx", {
    "next/navigation": { redirect },
  }).default;
  assert.throws(() => home(), /REDIRECT:\/login/);
});

test("public entry pages never redirect to the dashboard based on a saved session", async () => {
  for (const userId of [null, "active-user"]) {
    const proxy = proxyFixture({ userId });
    for (const path of ["/", "/login", "/login?logout=success"]) {
      const response = await proxy.request(path);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("location"), null);
    }
    assert.equal(proxy.clientCalls, 0);
  }
});

test("private pages reject requests without a session", async () => {
  const proxy = proxyFixture();
  for (const path of [
    "/dashboard", "/profile", "/documents", "/documents/upload",
    "/projects/project-id", "/admin", "/reset-password",
  ]) {
    const response = await proxy.request(path);
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location")).pathname, "/login");
    assert.equal(response.cookies.get("test-session").value, "refreshed");
  }
});

test("active accounts can open the dashboard after logging in", async () => {
  const proxy = proxyFixture({ userId: "active-user" });
  const response = await proxy.request("/dashboard");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("a saved Supabase session alone cannot open any private page", async () => {
  const proxy = proxyFixture({ userId: "active-user", loginUserId: null });
  for (const path of [
    "/dashboard", "/profile", "/documents/upload", "/projects/project-id", "/admin",
  ]) {
    const response = await proxy.request(path);
    assert.equal(new URL(response.headers.get("location")).pathname, "/login");
  }
});

test("a login confirmation for another account does not grant access", async () => {
  const proxy = proxyFixture({ userId: "active-user", loginUserId: "other-user" });
  assert.equal(
    new URL((await proxy.request("/dashboard")).headers.get("location")).pathname,
    "/login",
  );
});

test("each server start generates a new epoch inherited by Next", () => {
  const first = createServerEnvironment({ EXISTING_SETTING: "preserved" });
  const restarted = createServerEnvironment(first);
  assert.equal(first.EXISTING_SETTING, "preserved");
  assert.equal(restarted.EXISTING_SETTING, "preserved");
  assert.ok(first.PDF_INTERACTIVO_LOGIN_EPOCH);
  assert.notEqual(first.PDF_INTERACTIVO_LOGIN_EPOCH, restarted.PDF_INTERACTIVO_LOGIN_EPOCH);
});

test("a server restart rejects the previous login on direct dashboard access", async () => {
  const proxy = proxyFixture({ userId: "active-user", loginEpoch: "previous-start" });
  const response = await proxy.request("/dashboard");
  assert.equal(new URL(response.headers.get("location")).pathname, "/login");
});

test("an old confirmation stops authorizing API access after restarting", async () => {
  const { session, environment } = loginSessionFixture("first-start");
  await session.createLoginSession("user-1");
  assert.equal(await session.hasLoginSession("user-1"), true);
  environment.PDF_INTERACTIVO_LOGIN_EPOCH = "second-start";
  assert.equal(await session.hasLoginSession("user-1"), false);
  await session.createLoginSession("user-1");
  assert.equal(await session.hasLoginSession("user-1"), true);
});

test("login confirmation belongs to the current account and is a session cookie", async () => {
  const { session, writes } = loginSessionFixture();
  assert.equal(await session.hasLoginSession("user-1"), false);
  await session.createLoginSession("user-1");
  assert.equal(await session.hasLoginSession("user-1"), true);
  assert.equal(await session.hasLoginSession("user-2"), false);
  assert.equal(writes[0].options.httpOnly, true);
  assert.equal(writes[0].options.sameSite, "lax");
  assert.equal(writes[0].options.maxAge, undefined);
  assert.equal(writes[0].options.expires, undefined);
  await session.clearLoginSession();
  assert.equal(await session.hasLoginSession("user-1"), false);
});

test("direct API access rejects an old Supabase session without a current login", async () => {
  const { session } = loginSessionFixture();
  const permissions = loadModule("lib/auth/permissions.ts", {});
  let profileCalls = 0;
  const access = loadModule("lib/auth/access.ts", {
    "server-only": {},
    "@/lib/auth/login-session": session,
    "@/lib/auth/permissions": permissions,
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
        from() {
          profileCalls++;
          return { select: () => ({ eq: () => ({
            maybeSingle: async () => ({ data: { role: "owner", is_active: true }, error: null }),
          }) }) };
        },
      }),
    },
  });

  assert.equal((await access.getCurrentAccess()).status, 401);
  assert.equal(profileCalls, 0);
  await session.createLoginSession("other-user");
  assert.equal((await access.getCurrentAccess()).status, 401);
  assert.equal(profileCalls, 0);
  await session.createLoginSession("user-1");
  const result = await access.getCurrentAccess();
  assert.equal(result.ok, true);
  assert.equal(result.userId, "user-1");
  assert.equal(profileCalls, 1);
});

test("only successful credentials establish a login; refused access clears it", async () => {
  const { session } = loginSessionFixture();
  const validation = loadModule("lib/validations/login.ts", {});
  let credentialError = null;
  let allowAccount = true;
  let signouts = 0;
  const { loginAction } = loadModule("app/actions/login.ts", {
    "@/lib/auth/login-session": session,
    "@/lib/validations/login": validation,
    "@/lib/auth/access": {
      async getCurrentAccess() {
        assert.equal(await session.hasLoginSession("user-1"), true);
        return allowAccount
          ? { ok: true, userId: "user-1", role: "owner" }
          : { ok: false, status: 403, message: "Disabled account" };
      },
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: {
          signInWithPassword: async () => ({
            data: credentialError
              ? { user: null, session: null }
              : { user: { id: "user-1" }, session: {} },
            error: credentialError,
          }),
          signOut: async () => { signouts++; },
        },
      }),
    },
  });
  const input = { email: "test@example.com", password: "Test1234" };
  await session.createLoginSession("user-1");
  credentialError = { message: "Invalid credentials" };
  assert.equal((await loginAction(input)).success, false);
  assert.equal(await session.hasLoginSession("user-1"), false);
  credentialError = null;
  assert.equal((await loginAction(input)).success, true);
  assert.equal(await session.hasLoginSession("user-1"), true);
  allowAccount = false;
  assert.equal((await loginAction(input)).success, false);
  assert.equal(await session.hasLoginSession("user-1"), false);
  assert.equal(signouts, 1);
});

test("a verified recovery link preserves password recovery", async () => {
  const { session, cookieStore } = loginSessionFixture();
  const callback = loadModule("app/auth/callback/route.ts", {
    "next/server": { NextResponse },
    "next/headers": { cookies: async () => cookieStore },
    "@/lib/auth/login-session": session,
    "@/lib/auth/password-recovery": {
      PASSWORD_RECOVERY_COOKIE: "test-recovery",
      PASSWORD_RECOVERY_MAX_AGE_SECONDS: 900,
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: {
          exchangeCodeForSession: async () => ({
            data: { user: { id: "user-1" }, session: {} },
            error: null,
          }),
        },
      }),
    },
  }, { process: { env: { NODE_ENV: "development" } } });
  const response = await callback.GET(new NextRequest(
    "http://localhost:3000/auth/callback?code=test&next=/reset-password",
  ));
  assert.equal(new URL(response.headers.get("location")).pathname, "/reset-password");
  assert.equal(await session.hasLoginSession("user-1"), true);
  assert.equal(cookieStore.get("test-recovery").value, "verified");
});

test("opening login clears confirmation but submitting login and prefetching do not", async () => {
  const proxy = proxyFixture({ userId: "active-user" });
  for (const path of ["/", "/login"]) {
    const response = await proxy.request(path);
    assert.equal(response.cookies.get("pdf-interactivo-login-session").value, "");
  }
  const submitted = await proxy.request("/login", { method: "POST" });
  assert.equal(submitted.cookies.get("pdf-interactivo-login-session"), undefined);
  const prefetched = await proxy.request("/login", {
    headers: { "next-router-prefetch": "1" },
  });
  assert.equal(prefetched.cookies.get("pdf-interactivo-login-session"), undefined);
});

test("inactive accounts remain blocked on private pages", async () => {
  const proxy = proxyFixture({ userId: "blocked-user", isActive: false });
  const response = await proxy.request("/dashboard");
  assert.equal(new URL(response.headers.get("location")).pathname, "/blocked");
});

test("a failed account status check does not grant access", async () => {
  const proxy = proxyFixture({
    userId: "active-user",
    profileError: { code: "42P01" },
  });
  const response = await proxy.request("/dashboard");
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("dashboard and upload enforce access even when the proxy is bypassed", async () => {
  for (const status of [401, 403, 503]) {
    const access = loadModule("lib/auth/require-active-user.ts", {
      "server-only": {},
      "next/navigation": { redirect },
      "@/lib/auth/access": {
        getCurrentAccess: async () => ({ ok: false, status, message: "Unavailable" }),
      },
    });
    const dependencies = {
      "next/navigation": { redirect },
      "next/link": { default: "a" },
      "@/lib/auth/require-active-user": access,
      "@/lib/auth/access": { checkPermission() { assert.fail("Access must be checked first"); } },
      "@/lib/supabase/server": { createClient() { assert.fail("Access must be checked first"); } },
      "@/components/auth/logout-button": {},
      "@/components/documents/pdf-file-selector": {},
    };
    for (const path of ["app/dashboard/page.tsx", "app/documents/upload/page.tsx"]) {
      const page = loadModule(path, dependencies).default;
      const expected = status === 401 ? /REDIRECT:\/login/
        : status === 403 ? /REDIRECT:\/blocked/ : /Unavailable/;
      await assert.rejects(() => page(), expected);
    }
  }
});
