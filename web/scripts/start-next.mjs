import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Todos los procesos de Next heredan la misma versión durante este arranque.
export function createServerEnvironment(environment = process.env) {
  return {
    ...environment,
    PDF_INTERACTIVO_LOGIN_EPOCH: randomUUID(),
  };
}

function startServer() {
  const [mode] = process.argv.slice(2);
  if (mode !== "dev" && mode !== "start") {
    console.error("Usa dev o start para iniciar el servidor.");
    process.exitCode = 1;
    return;
  }

  Object.assign(process.env, createServerEnvironment());

  // Next conserva su arranque y sus manejadores de cierre normales.
  const require = createRequire(import.meta.url);
  process.argv[1] = require.resolve("next/dist/bin/next");
  require("next/dist/bin/next");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
