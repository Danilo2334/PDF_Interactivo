# Continuidad de PDF_Interactivo

Actualizado: 26/10/2026. Mantener este único documento al continuar.

Estado actual: PR #17 / HU013 revisado e integrado en develop (`99e7c08`).
HU014 / SCRUM-26 y sus tres subtareas finalizados con 96/96 pruebas, lint,
build y 16 capturas reales verificadas en Jira. Entrega en
[PR #18](https://github.com/Danilo2334/PDF_Interactivo/pull/18), en borrador,
sin merge. Rama `codex/scrum-26-hu014-dificultad`; commit funcional `5909abc`.
HU015 no iniciado. Stash `d6406e0` intacto. Ver cierre de HU014 al final.

## Contexto proporcionado por el usuario

- El propietario carga y consulta su PDF. El original permanece intacto; los
  refuerzos se presentan aparte, con revisión y aprobación antes de publicarse.
  El mini quiz es opcional. La generación con IA corresponde a una etapa posterior.
- Sprint 1: autenticación/perfil. Sprint 2: carga, validación, listado, visor,
  roles, privacidad, rendimiento y sesiones; el usuario reportó su cierre.
  Las mediciones anteriores fueron locales, sin garantías de producción.
- Sprint 3: administrar/navegar el PDF, seleccionar página y fragmento/zona,
  registrar dificultad, extraer texto y crear una solicitud (SCRUM-22 a SCRUM-28).
- Una rama por historia, commits asociados a tareas y PR hacia `develop`.
  El 25/10 el usuario aprobó integrar el PR #14, finalizar HU010 e iniciar la
  primera subtarea real de HU011 desde develop actualizado. Conservar el stash
  de autenticación sin aplicarlo ni eliminarlo. El límite inicial de SCRUM-79 se
  amplió después: el usuario autorizó avanzar las subtareas pendientes de HU011,
  probar, documentar, actualizar Jira, hacer commits/push y preparar PR mientras
  está ausente. Más tarde autorizó expresamente revisar e integrar PR #15 y
  continuar con la siguiente historia; el merge de HU011 ya está realizado.
- En Jira: conservar las capturas y un único comentario breve por subtarea;
  editarlo preservando imágenes si hace falta. No duplicar evidencias ni crear
  informes adicionales. El usuario introduce sus credenciales personalmente.

## Arquitectura y rutas comprobadas

- Repositorio `Danilo2334/PDF_Interactivo`, en la subcarpeta `PDF_Interactivo/`
  de la carpeta inicial de la sesión. Base de HU010: `1607198`, merge de Sprint 2.
- Aplicación en `web/app/`, alias `@/*` → `web/*`. Versiones del lockfile:
  Next.js 16.3.8, React 19.2.8, TypeScript 5.9.3, PDF.js 6.4.299,
  Supabase SSR 0.12.7 y JS 2.117.2. Se leyeron `web/AGENTS.md`, los README
  y las guías locales de Next.js aplicables antes de programar.
- Autenticación/perfil en `web/app/actions/`, `web/lib/auth/`,
  `web/lib/supabase/` y `web/proxy.ts`. Carga validada en
  `web/app/api/documents/upload/route.ts`; listado en `web/lib/data/projects.ts`.
- `web/app/projects/[projectId]/page.tsx` comprueba sesión/propietario e integra
  `web/components/documents/project-workspace.tsx`. Separa PDF y refuerzos;
  consultar refuerzos almacenados no acredita generación IA ni solicitudes.
- `web/components/documents/pdf-viewer.tsx` obtiene el original privado desde
  `/api/projects/[projectId]/pdf`, una vez por apertura o reintento.
  La API comprueba acceso/propiedad y evita caché pública.
- `web/lib/pdf/render-visible-pages.ts`: espacios reservados, renderizado bajo
  demanda, navegación/zoom, cancelación y limpieza. Miniaturas en
  `web/components/documents/pdf-thumbnails.tsx` y `web/lib/pdf/render-thumbnails.ts`.
  Recursos PDF.js locales en `web/public/pdfjs/`.
- `supabase/migrations/`: profiles, documents, projects, reinforcements y bucket
  privado `pdf-documents`, con RLS. No se auditó el historial remoto de migraciones.

## HU010: implementación y verificaciones

- SCRUM-77: contador actual/total, anterior/siguiente con límites, Ir/Enter y
  validación accesible de enteros 1..N sin navegar ante errores. Contador
  sincronizado al desplazarse; destinos sin canvas se priorizan. Tolerancia de
  1 px corregida y probada para el redondeo del scroll móvil.
- SCRUM-171: miniaturas por página bajo demanda, selección por clic/teclado y
  resaltado de la activa. El panel desplaza solo sus miniaturas y libera canvases
  al salir de su zona visible o cerrarse. Reutiliza el PDF cargado.
- SCRUM-172: zoom 50–200 % en pasos de 25 %, porcentaje y límites deshabilitados.
  Redibuja al tamaño mostrado, conserva página/miniatura activas y reajusta al
  cambiar la ventana. Cancela escalas obsoletas durante cambios rápidos.
- SCRUM-78: pruebas reales en Chrome local el 20/10, con sesión autorizada y
  Supabase real, usando únicamente PDF sintéticos de 16 páginas y una página.
  Aprobados: todos los controles, páginas sin renderizar, entradas inválidas,
  miniaturas, límites de navegación/zoom, scroll, saltos rápidos, ventanas
  1440×1000, 1024×720 y 390×844, una descarga por apertura, limpieza al salir
  y Reintentar después de desconectar/reconectar el navegador.
- La conservación durante edición se comprobó al modificar el número de página
  antes de enviarlo y al ajustar zoom. La edición de fragmentos/refuerzos
  pertenece a historias posteriores. No se probaron otras cuentas.
- El 23/10, tras separar los ajustes de autenticación ajenos a HU010:
  `npm.cmd --prefix web run test` → 36/36 (17 previas y 19 del visor);
  `npm.cmd --prefix web run lint`, `npm.cmd --prefix web run build` y
  `git diff --check` → correctos. Las 39 pruebas del 20/10 incluían tres de
  diagnóstico de autenticación que no forman parte de esta entrega.
  No se repitieron pruebas visuales al no cambiar el código del visor.
- No se modificaron permisos, almacenamiento ni contenido del PDF original.

## Entrega y próximo paso

- Rama: `feature/scrum-22-hu010-navegacion-zoom`.
  Commit funcional `0ae9169` agrupa SCRUM-77, SCRUM-171, SCRUM-172 y SCRUM-78,
  porque el visor y su controlador comparten los cambios.
- [PR #14](https://github.com/Danilo2334/PDF_Interactivo/pull/14) integrado en
  `develop` el 25/10 mediante merge `407d57b`. Se verificó que incluye los commits
  `0ae9169` y `302747a`. SCRUM-22 y sus cuatro subtareas están «Finalizado».
  SCRUM-22 tiene un único comentario breve de cierre (`10083`) con el enlace al PR.
  Se marcaron únicamente actividades/resultados respaldados y evidencias
  existentes; no se añadieron comentarios.
- Se conservan 13 capturas y los comentarios: SCRUM-77 `10079` (6),
  SCRUM-171 `10080` (2), SCRUM-172 `10081` (2), SCRUM-78 `10082` (3).
- El bloqueo inicial de Supabase se resolvió con la reactivación solicitada por
  el usuario y su inicio de sesión. Los cinco archivos del diagnóstico de
  autenticación, ajenos a HU010, se conservaron en el stash local `d6406e0`
  («Fuera de HU010: diagnostico de autenticacion 2026-10-23»). No están en el PR.
  No se modificaron valores de entorno ni se guardaron secretos en la entrega.

## HU011: SCRUM-79 finalizado

- Rama `feature/scrum-23-hu011-actualizacion-eliminacion-documentos`, creada desde
  develop actualizado en `407d57b`. SCRUM-79 está «Finalizado» desde el 25/10,
  con criterios y evidencias. HU011 / SCRUM-23 también quedó «Finalizado» al
  concluir las demás subtareas; ver el cierre conjunto al final del documento.
- Subtareas leídas en Jira: SCRUM-79 (nombre), SCRUM-173 (reemplazo), SCRUM-174
  (eliminación confirmada), SCRUM-175 (accesos), SCRUM-144 (limpieza de datos) y
  SCRUM-80 (pruebas conjuntas). SCRUM-144 se integra antes de SCRUM-80 y comparte
  la operación de eliminación de SCRUM-174.
- Se añadió edición del título actual en listado y proyecto mediante
  `web/components/documents/rename-document-form.tsx`. La acción
  `web/app/actions/rename-document.ts` exige `documents.manage.own`, valida UUID
  y nombre, filtra por propietario y actualiza solo `projects.name`.
  Reutiliza el trigger `projects_set_updated_at` y revalida listado/proyecto.
  `documents.original_name`, identidades, referencias y PDF permanecen intactos.
- `web/lib/validations/rename-document.ts`: elimina espacios en los extremos y
  rechaza vacío/no texto; límite de implementación de 255 caracteres.
  `web/tests/rename-document.test.mjs` aporta seis pruebas de permisos, validación,
  filtro por propietario, datos no disponibles y fallo de base de datos.
- 25/10: 42/42 pruebas automatizadas aprobadas; lint, build/TypeScript y
  git diff --check correctos. Commit funcional local `27300a6`
  (`27300a621f064ab0a7ab127cca763396a74f86d7`):
  «SCRUM-79 feat: permitir renombrar documentos propios». En ese cierre inicial
  no se había hecho push; después se subió con la entrega conjunta. Sin merge.
- Pruebas reales ejecutadas el 25/10 en el navegador integrado de la aplicación,
  con inicio de sesión personal confirmado por el usuario y Supabase real.
  Se reutilizó localhost:3000. Se usó solamente el proyecto sintético de 16 páginas
  `557c6125-d5ca-401b-b105-31a051699371`; los documentos personales no se editaron.
- Aprobados: título precargado, Cancelar, vacío y espacios rechazados sin cambiar
  título/fecha, nombre válido con extremos recortados, actualización inmediata
  del listado/fecha/orden y persistencia tras recargar y abrir el proyecto.
  `updated_at` pasó de `2026-10-21T03:34:13.779265+00:00` a
  `2026-10-25T18:16:32.601047+00:00` durante la prueba del listado.
  También se renombró desde el proyecto manteniendo el visor listo, zoom 125 %
  y miniaturas abiertas. El nombre del archivo original se conservó.
  En esta primera fase no se probaron otras cuentas; se verificaron en SCRUM-80.
- Desconexión/reintento aprobados el 25/10: proxy temporal de pruebas enlazado
  solo a loopback, `localhost:3001` → servidor existente `localhost:3000`.
  Se cortó el socket del POST de renombrado del proyecto sintético antes de
  reenviarlo. Fue una interrupción real de transporte, sin desactivar la red del
  equipo ni usar la emulación Offline del navegador. La UI mostró el error de
  conexión, mantuvo el borrador y habilitó reintentar. Otra pestaña recargada en
  el servidor original confirmó título/fecha intactos:
  `updated_at = 2026-10-25T18:17:58.610854+00:00` antes y después del fallo.
  Al restaurar el transporte y reenviar el mismo nombre, se guardó correctamente,
  persistió en el listado y la fecha pasó a `2026-10-25T18:53:36.238762+00:00`.
  Se conservaron visor listo, zoom 125 % y miniaturas; se verificó navegación por
  Enter hasta la página 4. No hicieron falta correcciones adicionales de código.
  Título de prueba dejado: «SCRUM-79 — Recuperación de conexión verificada».
- Jira: único comentario de resultados `10084`; editar ese mismo comentario
  conservando su cuerpo HTML y sus imágenes. Capturas reales ya vinculadas:
  `01-validacion-espacios.jpg` (`10250`), `02-listado-actualizado.jpg` (`10249`),
  `03-conexion-interrumpida.jpg` (`10251`), `04-reintento-y-visor.jpg` (`10253`) y
  `05-visor-tras-reintento.jpg` (`10252`). Las dos iniciales se conservaron al
  editar el comentario en HTML y añadir las tres restantes. El comentario incluye
  resultados y hash funcional. No volver a subirlas ni crear otro comentario.
- El usuario confirmó activar Enable full CDP access, pero la conexión renovada
  de esta sesión no expuso una API de control de red. El control nativo de Chrome
  también había rechazado operar por no poder verificar la URL. Las pruebas se
  completaron en el navegador integrado con el proxy de pruebas descrito arriba.
  El proxy quedó detenido; el navegador volvió al proyecto en localhost:3000 y el
  servidor original sigue activo. Los recursos temporales están fuera del repo,
  en la carpeta de visualizaciones de esta sesión; no se incluyeron en el commit.
- La entrega inicial se detuvo en SCRUM-79; posteriormente el usuario amplió
  el alcance y se retomaron las subtareas siguientes. No se hizo merge.
  Este documento registra la entrega en un commit de documentación adicional.
  Mantener sin aplicar ni eliminar el stash `d6406e0`, dejar VS Code y el servidor
  abiertos. No guardar tokens de carga en comentarios, documentos ni resúmenes;
  para las nuevas evidencias se prepararon credenciales temporales nuevas.

## HU011: continuación autorizada y SCRUM-173

- Supabase conectado: proyecto `zqodybtzssvqozrckfgw`, coincidente con el entorno
  local. Se inspeccionaron tablas, políticas y funciones antes de la migración.
  La lista remota de migraciones previas estaba vacía aunque el esquema existía.
- SCRUM-173 «Finalizado»: commit `661ca04`, 52/52 pruebas, lint y build/TypeScript
  correctos. La migración `add_project_document_versions` se aplicó al proyecto;
  su fuente está en `supabase/migrations/20261025190000_add_project_document_versions.sql`.
  La RPC exige propietario activo con permiso, bloquea la fila del proyecto,
  compara la identidad vigente y registra documentos/versiones en una transacción
  posterior al almacenamiento. El visor se monta de nuevo cuando cambia el PDF.
  Los errores de resultado ambiguo no eliminan un archivo que pudiera haberse
  convertido ya en la versión vigente.
- La sesión personal anterior expiró. Se crearon dos cuentas sintéticas para las
  pruebas, sin modificar contraseñas ni datos del usuario: propietarios temporales
  `fc58247b-ff4d-40ee-96bf-f2524e6123c1` y `88b1cfb9-875d-4506-983a-d89c5601a638`.
  Al concluir se eliminaron sus proyectos/archivos y las credenciales locales,
  y se cerró la sesión del navegador. Ambas cuentas se bloquearon inicialmente;
  tras reconectar Supabase se completó su purga definitiva. Ver las identidades
  y la comprobación administrativa en el cierre conjunto.
- Proyecto sintético nuevo `adaf19d4-d3b1-44b0-91e9-2951d5bd1bd1`, nombre
  `SCRUM-173-original`. PDF anterior de 3 páginas: `fe5beddd-a0aa-4898-81e5-39a455033fb6`;
  vigente de 2 páginas: `ff6e1174-4399-433a-9ab8-05950b53a487`.
  Refuerzo sintético anterior `f236fa79-aa83-4c77-ae0b-23236379ba43` conservado.
  Cancelar y PDF inválido no alteraron archivo, identidad ni referencia. El caso
  válido conservó proyecto/propietario/nombre y dos archivos/versiones. El refuerzo
  no apareció sobre el PDF nuevo. Se comprobó persistencia, nuevo visor de 2 páginas
  y rechazo en SQL autenticado de otro propietario y de una identidad desactualizada.
- Jira SCRUM-173: comentario único `10085`, cuatro capturas reales insertadas.
  Conservarlo y editarlo en HTML si hay que agregar el enlace al PR.

## HU011: cierre conjunto de SCRUM-174, SCRUM-144, SCRUM-175 y SCRUM-80

- HU011 / SCRUM-23 y sus seis subtareas están «Finalizado». Entrega inicial en PR en borrador
  [#15](https://github.com/Danilo2334/PDF_Interactivo/pull/15) hacia `develop`,
  con la rama subida. En esa fase no se hizo merge ni se avanzó a otra historia;
  después se autorizó e integró PR #15, como se registra al final. El stash
  `d6406e0cdbc464c1c0301c058024b10dd27c4515` permanece sin aplicar ni eliminar.
- Commit `b46c9317a989ef9fbc1bcb012d73e55535dc13f1`: eliminación confirmada,
  limpieza central y bloqueo de accesos (SCRUM-174 / SCRUM-144 / SCRUM-175).
  Commit `e4a9017190af90ebed09761a4ae7bb112cd49bf3`: ejecutor de integración real
  SCRUM-80. Se incluyen también `27300a6`, `9dfd185` y `661ca04` de las fases previas.
- Migración `add_recoverable_project_deletion` aplicada al Supabase conectado;
  fuente: `supabase/migrations/20261025200000_add_recoverable_project_deletion.sql`.
  `project_deletions` conserva un manifiesto privado mínimo para bloquear acceso
  y reintentar sin duplicar efectos; no guarda contenido, título ni refuerzos.
  Las RPC comprueban propietario activo/rol, fijan search_path vacío, bloquean
  filas y comparan la versión confirmada. Las escrituras directas al manifiesto
  no están concedidas al cliente. Los manifiestos completed se conservan para
  reconocer reintentos; no equivalen a documentos o archivos pendientes.
- `web/lib/documents/delete-project.ts` es la operación compartida por la ruta
  `/api/projects/[projectId]/delete` y los reintentos. Secuencia: manifiesto,
  borrado de Storage por lotes de 100 y transacción final de registros. Un fallo
  registra etapa/fecha, devuelve 503 y mantiene el contenido bloqueado. La fase
  final comprueba que no quedan objetos; no informa éxito antes de concluir.
  Un reintento de un trabajo completado devuelve éxito sin repetir el borrado.
- `delete-document-form.tsx` muestra consecuencias y confirmación explícita,
  permite cancelar y ofrece reintentar desde el listado. Las confirmaciones de
  eliminación y reemplazo se vinculan al documentId vigente: un cambio de PDF
  exige confirmar otra vez. Se añadió una regresión que interactúa con ambos
  formularios y comprueba casilla desmarcada/botón deshabilitado al cambiar versión.
- La página de proyecto no disponible está en
  `web/app/projects/[projectId]/not-found.tsx`. RLS bloquea documentos y referencias
  desde el inicio de la limpieza; Storage bloquea lectura conservando el permiso
  necesario para borrar objetos propios. El bucket `pdf-documents` sigue privado.
  Se revalidan listado y proyecto tras la operación.
- Extensión de limpieza: cada nueva relación de documento (selecciones, quiz,
  respuestas o métricas) debe añadir FK ON DELETE CASCADE o limpieza explícita
  dentro de `finish_project_deletion`, más una prueba de integración. Hoy existen
  documentos, proyectos, historial de versiones y refuerzos. Una FK restrictiva
  aborta la transacción completa; el punto de extensión está comentado en SQL.

### Verificación real y regresión

- Resultado final: **63/63 pruebas**, lint, build/TypeScript y git diff --check
  correctos. Desde `web/`: `npm test`, `npm run lint`, `npm run build`.
  También se pasó ESLint sobre `tests/hu011-live.mjs` después de ampliar sus modos.
- Se reutilizó el servidor existente en localhost:3000. La UI se probó en el
  navegador integrado y las operaciones finales de eliminación/autorización se
  ejecutaron por HTTP autenticado y SDK contra la aplicación y Supabase reales.
  Las capturas muestran estados reales de UI; no son plantillas ni salidas
  reconstruidas. Los comentarios de Jira distinguen cada medio de comprobación.
- El proyecto sintético descrito en SCRUM-173 tenía PDF anterior de 3 páginas,
  PDF nuevo de 2 páginas y un refuerzo anterior. Cancelar y PDF inválido conservaron
  versión/refuerzo; el reemplazo válido conservó propietario/proyecto/título,
  mantuvo las dos versiones y no mostró el refuerzo sobre las páginas nuevas.
- La segunda cuenta fue rechazada al renombrar, reemplazar, eliminar y descargar
  el documento ajeno. Se creó otra muestra por la API normal de carga para
  comprobar en navegador el rechazo a un proyecto que todavía existía, y luego
  se eliminó por la API confirmada. Sin sesión, la API PDF devolvió 401; con otra
  cuenta o tras iniciar eliminación, 404.
- Fallo parcial real: se inició el manifiesto y se intentó finalizar antes de
  eliminar los objetos. Supabase respondió 55006 y no confirmó el borrado.
  Se registró etapa `records` y fecha; el listado mostró pendiente/reintentar.
  Mientras tanto, las consultas RLS a proyecto/refuerzo y las descargas de ambos
  PDFs fueron rechazadas. El reintento confirmado por HTTP borró los dos archivos
  y completó los registros. Repetirlo devolvió 200 sin duplicar efectos.
- SQL administrativo posterior confirmó 0 proyectos, 0 documentos, 0 referencias,
  0 versiones y 0 objetos de esa muestra. La consulta final por ambos propietarios
  confirmó 0 proyectos/documentos/archivos y 0 limpiezas pendientes. Las rutas de
  proyecto/PDF continuaron inaccesibles después; el navegador mostró las respuestas.
- Ejecutor optativo: `node tests/hu011-live.mjs ACCOUNTS_FILE FIXTURE_FILE MODE`.
  Se aprobaron en orden `authorize`, `begin`, `finish`, `access`, `access-cleanup`.
  Requiere dos cuentas nuevas desechables con correo hu011-1/2-UUID@example.invalid,
  objeto externo `{users:[{id,email,password},...]}`, y fixture externa con
  `ownerId`, `projectId`, `documentId`, `oldDocumentId`, `fixtureDirectory`.
  Preparar antes dos versiones reales y el refuerzo; la carpeta debe contener
  `SCRUM-173-reemplazo.pdf`. Verificar siempre que son datos sintéticos antes de
  ejecutar `begin`/`finish`, que eliminan datos. El ejecutor comprueba propietario,
  nombre/identidad e historial antes de mutar. Usa el inicio de sesión normal de
  la aplicación; las sesiones quedan en memoria. Las cuentas/fixtures ya usadas
  no se pueden reutilizar después de la limpieza. No guardar claves en Git.

### Jira y evidencias conservadas

| Tarea | Comentario único | Capturas reales |
| --- | --- | --- |
| SCRUM-79 | 10084 | 5 originales conservadas; IDs 10249–10253 |
| SCRUM-173 | 10085 | 4 conservadas; IDs 10254–10257 |
| SCRUM-174 | 10086 | acciones y confirmación de reintento; 10258, 10259 |
| SCRUM-144 | 10087 | limpieza pendiente y listado limpio; 10260, 10261 |
| SCRUM-175 | 10088 | bloqueo pendiente, tras borrado y API PDF; 10264, 10262, 10263 |
| SCRUM-80 | 10089 | segunda cuenta y proyecto ajeno rechazado; 10265, 10266 |

- 18 capturas reales vinculadas en total. Se comprobaron nombres en adjuntos y
  etiquetas de imágenes del HTML renderizado; los comentarios 10084 y 10085 se
  editaron en HTML conservando sus bloques de medios. No duplicar comentarios
  ni volver a subir esas imágenes. Todos incluyen resultados y PR #15.
- SCRUM-23: comentario de cierre `10090`, con enlaces/resultados conjuntos.
  Las casillas de las subtareas se marcaron únicamente tras verificar sus casos.

### Observaciones y estado para retomar

- Las dos cuentas sintéticas `fc58247b-ff4d-40ee-96bf-f2524e6123c1` y
  `88b1cfb9-875d-4506-983a-d89c5601a638` se bloquearon inicialmente porque el
  conector devolvía `Invalid or expired requestState`. Tras reconectar Supabase,
  el 25/10 se completó la purga definitiva con filtro por esos UUID y sus correos
  sintéticos exactos, además de verificar que no poseían proyectos ni archivos.
  La consulta posterior confirmó **0 usuarios Auth, 0 identidades, 0 sesiones,
  0 refresh tokens, 0 perfiles, 0 proyectos, 0 documentos, 0 trabajos de limpieza
  y 0 archivos** para ambas cuentas. Incidencia administrativa resuelta.
  Se había cerrado su sesión y borrado `test-accounts.json` fuera del repositorio.
- Las cargas usaron credenciales temporales nuevas. El script temporal que las
  contenía fue eliminado al finalizar. No se incluyeron tokens en Jira, Git ni
  este documento. Los JPG auténticos se conservan fuera del repo, en los recursos
  HU011 de visualizaciones de esta sesión.
- Asesor de seguridad consultado: avisos previos de `handle_new_user`/funciones
  administrativas SECURITY DEFINER y protección contra contraseñas filtradas
  desactivada. Las nuevas RPC intencionalmente ejecutables por authenticated
  también producen el aviso genérico; tienen validación de propietario activo,
  search_path vacío y rechazo real desde otra cuenta. No se alteraron ajustes de
  autenticación fuera de HU011. Referencias oficiales:
  [funciones anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
  [funciones authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
  [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Servidor original de localhost:3000 conservado; proxy de desconexión detenido.
  Navegador dejado en login tras cerrar la sesión sintética. No aplicar el stash,
  hacer merge ni iniciar otra historia sin nueva indicación del usuario.

## Revisión de HU011 y cierre autorizado de HU012

- El usuario autorizó revisar PR #15, integrarlo en develop si cumplía y continuar
  con la siguiente historia. Revisión del commit `efe36ff`: sin fallos bloqueantes
  en el alcance, 63/63 pruebas, lint y build/TypeScript aprobados de nuevo. GitHub
  no tenía comentarios pendientes ni checks/statuses CI configurados; no se
  atribuyen verificaciones de CI que no existían. Ambas migraciones constan aplicadas.
- PR #15 integrado mediante merge, con comprobación del head revisado:
  `8dc5b1eb714ea2fbadbc47ed25f96b3f410230c0`. develop local se actualizó por
  fast-forward. El comentario único 10090 de SCRUM-23 registra revisión y merge.
- Siguiente historia por Rank del Sprint 3: SCRUM-24 / HU012, selección de página
  a reforzar. Subtareas SCRUM-81 (captura), SCRUM-176 (resaltado) y SCRUM-82
  (borrador compartido). Historia y subtareas «Finalizado», en rama independiente
  `codex/scrum-24-hu012-seleccion-pagina`, creada desde el merge de HU011.
- HU012 conserva documento/página en el borrador dentro del proyecto. El registro
  definitivo en servidor corresponde a HU016 / SCRUM-89; no dar por implementado
  ese envío. Pruebas de navegador y evidencias de HU012 completadas; entrega en
  [PR #16](https://github.com/Danilo2334/PDF_Interactivo/pull/16), en borrador hacia
  develop. Sin merge de HU012 ni avance a HU013.
- Stash de autenticación `d6406e0` conservado, sin aplicar ni eliminar.

### Implementación y commits de HU012

- `a4f4ddb75d6899cb891b04d4c89926d8cb836eb2`: SCRUM-81 / SCRUM-176 / SCRUM-82.
  El visor comunica la página activa al estado compartido de ProjectWorkspace.
  El borrador contiene documentId/pageNumber y solo admite la identidad vigente;
  cambiar de documento reinicia el componente del formulario. Cada nueva página
  sustituye la anterior. Un error de carga/render invalida la selección.
- El renderizador añade un borde/anillo azul y aria-current únicamente a la
  figura activa, retirándolo de la anterior. Reutiliza las miniaturas de HU010,
  preserva su indicador y mantiene el renderizado bajo demanda y la liberación
  de canvases. Scroll, controles, teclado y miniaturas comparten la misma página.
- El borrador abre desde los controles fijos mediante un diálogo nativo accesible.
  Cerrar/reabrir y Escape conservan página/documento dentro del proyecto.
  No se promete persistencia tras recargar o cerrar la página, ni se guarda una
  solicitud definitiva: el envío al servidor corresponde a HU016 / SCRUM-89.
  El control solo se ofrece al rol con documents.manage.own, dentro de un proyecto
  cuya propiedad comprueba el servidor. No se creó una ruta pública de solicitudes.
- Regresión detectada en el navegador: el primer formulario expandía el panel
  fijo y cambiaba la altura visible del PDF; cerrar/reabrir podía cambiar la
  selección 4 → 3. Se conservó la captura del fallo y se corrigió usando el
  diálogo fuera del flujo. El caso real se repitió con página 4 conservada.
- `727f437aba7596fb65c977fc433f545a6ee62102`: corrección adicional de un fallo
  previo de SSR encontrado durante la prueba de privacidad. El ejecutor cerró
  globalmente una sesión sintética y revocó la del navegador; al abrir el proyecto,
  Supabase intentó limpiar cookies desde un Server Component y Next arrojó 500.
  El cliente de `web/lib/supabase/server.ts` tolera exclusivamente el error conocido
  de cookies de solo lectura, preservando el resultado de getUser. Otros errores
  se propagan; Actions/Routes siguen escribiendo cookies. No se aplicó el stash.
  Tres regresiones verifican revocación, contexto mutable y error inesperado.
  Referencias consultadas: guía local cookies.md de Next 16 y
  [cliente SSR oficial](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
- Se repitió el acceso real con la misma sesión revocada: redirigió a login.
  Tras autenticarse nuevamente, la segunda cuenta obtuvo «Documento no disponible»
  para el proyecto ajeno. El ejecutor ahora cierra solo su sesión SDK local para
  no revocar otras sesiones de la misma cuenta durante pruebas independientes.
- `2f1e2b6bd7b720fe25acdada6d95ca120c99080d`: ejecutor HTTP/SDK optativo
  `web/tests/hu012-live.mjs`. No utiliza cookies del navegador ni credenciales
  del usuario. Usa inicio de sesión normal con cuentas sintéticas y sesiones
  en memoria. No se añadieron dependencias ni migraciones para HU012.

### Pruebas y datos reales de HU012

- **74/74 pruebas automatizadas**, lint, build/TypeScript y git diff --check
  aprobados tras las correcciones. Desde web: npm test, npm run lint y
  npm run build. No se atribuyen resultados de CI: no hay checks configurados.
  Revisión React: estado por documento, callbacks estables, etiquetas accesibles,
  diálogo nativo, permisos en servidor y conservación del renderizado diferido.
- Se reutilizó localhost:3000 y el navegador integrado. Se cargaron mediante la
  UI dos PDFs sintéticos válidos, de 4 y 2 páginas. Proyecto de 4 páginas:
  `2f9b0c2b-dc51-4a67-8a7e-631d41824cbe`, documento
  `3f72032d-d3a3-4e03-a287-8001672eb35b`. Proyecto de 2 páginas:
  `655017a3-5da1-42c5-ae70-689a41623b22`, documento
  `0b2c6ba3-7436-4f10-94f0-5334b519eb68`.
- Navegador: miniaturas 3 → 4; navegación por teclado a 3; scroll manual a 4;
  destino 0 rechazado conservando la página 2; una sola figura y una sola miniatura
  con aria-current coincidente; zoom 125 % conservando la 4; apertura, cierre,
  reapertura y Escape con página 4; otro documento con página 1 y nueva identidad;
  rechazo del proyecto privado desde una segunda cuenta mientras aún existía.
  Los atributos documentId/página y los indicadores se leyeron del DOM real.
- HTTP/SDK reales: ambos PDFs coincidieron byte a byte mediante SHA-256 con sus
  archivos fuente; la API devolvió 404 a otra cuenta y RLS no expuso el proyecto;
  sin sesión, API PDF 401. SQL confirmó created_at = updated_at: seleccionar y
  abrir el borrador no modificó los proyectos ni guardó solicitudes en servidor.
- Reproducción del ejecutor: preparar dos propietarios desechables con correos
  hu012-1/2-UUID@example.invalid y JSON externo `{users:[{id,email,password},...]}`.
  La primera cuenta debe tener exactamente los proyectos HU012-4-paginas y
  HU012-2-paginas, sin renombrarlos; guardar sus PDFs originales con extensión
  .pdf en la misma carpeta del JSON. Ejecutar desde web:
  `node tests/hu012-live.mjs ACCOUNTS_FILE check`, y después `cleanup` cuando
  proceda eliminar esas muestras. Se comprueban cuenta, propietario, nombres,
  identidad y fecha antes de borrar. No ejecutar sobre cuentas o archivos reales.
- Ambos modos pasaron. cleanup eliminó los dos proyectos y PDFs mediante la API
  confirmada de HU011. Después se purgaron solo las cuentas sintéticas
  `c8a21707-a29b-4ecf-a525-9b140cc0e5ea` y
  `7b1103c4-fae7-4678-8e49-b734c4bf2627`, con filtro por UUID/correo exactos y
  guardas de ausencia de proyectos/archivos. SQL final: **0 usuarios Auth,
  identidades, sesiones, refresh tokens, perfiles, proyectos, documentos,
  trabajos de limpieza y archivos** para ambas cuentas. Sesión del navegador
  cerrada; test-accounts.json y script de carga con credenciales eliminados.

### Jira y evidencias de HU012

| Tarea | Comentario único | Adjuntos reales |
| --- | --- | --- |
| SCRUM-81 | 10091 | 10267 selección 3; 10268 destino 0 rechazado con selección 2 |
| SCRUM-176 | 10092 | 10270 resaltado único; 10269 scroll manual |
| SCRUM-82 | 10093 | 10274 fallo 4 → 3; 10271 reapertura corregida en 4; 10275 otro documento; 10273 segunda cuenta; 10272 acceso ajeno denegado |
| SCRUM-24 | 10094 | 10277 error previo con sesión revocada; 10276 redirección segura a login |

- 11 capturas auténticas, con los errores identificados como errores y los casos
  corregidos repetidos. Ninguna imagen es una plantilla ni una reconstrucción.
  Los resultados distinguen navegador de HTTP/SDK/SQL. Se verificaron adjuntos y
  nombres de imágenes en el HTML renderizado: un comentario por tarea, sin
  duplicar adjuntos. Conservar esos comentarios y bloques HTML al editarlos.
- Casillas y estados finalizados después de verificar los criterios. PR #16
  enlazado en los cuatro comentarios. El documento de continuidad se entrega en
  un commit adicional; los commits funcionales y pruebas están identificados arriba.
- Estado al cierre de HU012: PR #16 pendiente de revisión y autorización de merge.
  El usuario autorizó después su revisión/merge y HU013, como se registra abajo.
  Servidor original conservado y navegador
  en login después de cerrar las cuentas sintéticas. No quedan datos de prueba
  pendientes de limpiar ni credenciales de esas cuentas en disco.

## Revisión de HU012 e inicio autorizado de HU013

- El 26/10 el usuario autorizó revisar PR #16, integrarlo si cumplía y continuar
  con HU013. Head bbc9caf revisado sin fallos bloqueantes: 74/74 pruebas, lint y
  build/TypeScript correctos; sin comentarios pendientes ni checks CI configurados.
  PR #16 integrado en develop mediante `319b7e227da9509385394e5e67d6f1c05255718e`.
  Se actualizó el comentario único 10094 de SCRUM-24 conservando sus imágenes.
- Rama actual `codex/scrum-25-hu013-seleccion-fragmento`, desde develop actualizado.
  HU013 / SCRUM-25 y subtareas SCRUM-83 (texto), SCRUM-177 (zona proporcional) y
  SCRUM-84 (corregir/cancelar) pasaron a «En curso» y, después de comprobar los
  criterios y las evidencias, a «Finalizado». Se implementó TextLayer de PDF.js,
  geometría proporcional, edición y borrado temporal sobre el borrador compartido.
- Stash d6406e0 intacto. Reutilizar localhost:3000. No modificar el PDF original;
  el registro definitivo continúa en HU016, sin adelantar HU014/HU015.

## HU013: implementación y cierre verificado

- Commit funcional `cbe149a0061fd967b011d630e11a4e501233da1c`, asociado a
  SCRUM-25, SCRUM-83, SCRUM-177 y SCRUM-84. Los cambios comparten el controlador
  del visor y el borrador. Se subió la rama y se creó PR #17 hacia develop.
- `web/lib/pdf/fragment-selection.ts`: unión texto/zona, rango serializado y
  geometría normalizada [0,1]. El texto usa la selección nativa para respetar
  los saltos de línea; el rango usa offsets del contenido de la capa. Rechaza
  selección vacía, fuera de capa o entre páginas. Recorta rectángulos a la página.
- `web/lib/pdf/page-fragments.ts`: TextLayer con el mismo viewport del canvas,
  marcas proporcionales, arrastre, movimiento y tamaño. Enter crea una zona;
  flechas mueven; Mayús/flechas o el tirador cambian tamaño; Escape limpia.
  Cancela/libera capas y manejadores junto con el renderizado diferido.
- El renderizador acepta un decorador asíncrono y libera resultados obsoletos
  después de zoom/salida. CSS de texto aislado en globals.css. Workspace/borrador
  reciben un único FragmentSelection con documentId y página; los callbacks son
  estables. Cambiar de PDF remonta el visor y no expone el fragmento anterior.
  La vista previa conserva texto/rango para reutilizarlos en HU015. Cerrar el
  diálogo conserva el borrador; cancelar explícitamente borra el fragmento.
- No hay persistencia definitiva ni generación IA en esta entrega: HU016 registrará
  solicitudes. No se añadieron dependencias ni migraciones, ni se cambiaron RLS
  o permisos. El selector se ofrece al propietario autenticado con permiso.

### Pruebas reales y automatizadas de HU013

- **86/86 pruebas automatizadas**, lint, build/TypeScript y git diff --check
  aprobados. Desde web: npm test, npm run lint y npm run build. Se añadieron
  12 regresiones: 7 de fragmento/geometría/controlador, 3 de borrador por identidad
  y cancelación y 2 de liberación de decoraciones asíncronas. Estas pruebas
  unitarias usan dobles; las capturas y los casos siguientes provienen de la UI real.
- Se reutilizó localhost:3000 y el navegador integrado. Dos propietarios
  desechables con correos hu013-1/2-UUID@example.invalid y dos PDFs sintéticos
  válidos se autenticaron/cargaron por la UI. PDF de 4 páginas: proyecto
  `ee0da799-5ea9-4dda-bdee-79d4c017eb41`, documento
  `1aecd142-2dab-46cb-baa4-a03bee1b9aaa`. PDF de 2 páginas: proyecto
  `1e22080f-55ad-4ebb-b898-703cca5644dc`, documento
  `329ac5de-bd7e-4cad-928e-77e4231e5266`. No se editaron datos personales.
- Texto: arrastre nativo sobre dos líneas, orden y salto de línea conservados,
  vista previa con rango [39,127) en página 1 y dos rectángulos. Zoom 50 → 75 %
  mantuvo exactamente texto, rango y geometría del borrador. Limpiar dejó fragmento
  vacío, selección nativa vacía y cero marcas.
- Zona: dibujo, movimiento y redimensionado con puntero. Tras mover, ancho/alto
  iguales; tras cambiar tamaño, x/y iguales. Rectángulo final:
  x=0.1349712464, y=0.3191001687, ancho=0.6700702109, alto=0.2850768511.
  Zoom 75 % y 125 % conservaron los cuatro valores exactos. La ubicación DOM
  respecto a la página difirió menos de 0.00003 en proporción, menos de 1 píxel
  CSS por redondeo. Cancelar vació fragmento y marcas. Enter, derecha y
  Mayús/abajo dieron x=0.26, y=0.25, ancho=0.5, alto=0.26.
- Cambio de documento en ambas direcciones: el PDF de 2 páginas no heredó la zona
  del de 4; después de marcar texto en el de 2, el de 4 tampoco heredó ese texto.
  Se comprobaron vista previa ausente, campo fragmento vacío y cero marcas.
- Privacidad: la segunda cuenta abrió el proyecto ajeno mientras existía y vio
  «Documento no disponible». HTTP/SDK comprobó ambos originales por SHA-256,
  API ajena 404, RLS sin filas y API sin sesión 401. SQL confirmó
  created_at = updated_at: seleccionar y abrir el borrador no actualizó proyectos.
- `web/tests/hu013-live.mjs` pasó en modos check y cleanup. Reproducción desde web:
  `node tests/hu013-live.mjs ACCOUNTS_FILE check`; después `cleanup` únicamente
  para esas muestras desechables. Preparar JSON externo con users:[{id,email,password}]
  para dos propietarios hu013-1/2-UUID@example.invalid; el primero debe tener
  exactamente HU013-4-paginas y HU013-2-paginas, con sus PDFs fuente junto al JSON.
  Usa login normal y sesiones propias en memoria; no lee cookies del navegador.
- Cleanup eliminó ambos proyectos/documentos/archivos mediante la API confirmada.
  Después se purgaron solo las cuentas `759f96d3-5859-4ae5-8b9d-c54bef99fe6e` y
  `9b22a0d8-ea34-49a4-adbb-386762c24b9f`, con guardas por UUID/correo y ausencia
  de proyectos/archivos. SQL final: **0 usuarios Auth, identidades, sesiones,
  refresh tokens, perfiles, proyectos, documentos, trabajos de limpieza y archivos**.
  Sesión de navegador cerrada; test-accounts.json y script temporal de carga
  eliminados. Las credenciales de carga nunca se incluyeron en Jira, Git o este documento.

### Jira y entrega de HU013

| Tarea | Estado | Comentario único | Adjuntos reales |
| --- | --- | --- | --- |
| SCRUM-83 | Finalizado | 10095 | 10278 texto/rango; 10279 texto tras zoom |
| SCRUM-177 | Finalizado | 10096 | 10281 zona inicial; 10282 zoom 75; 10280 zoom 125 |
| SCRUM-84 | Finalizado | 10097 | 10283 cancelar texto; 10286 mover; 10288 tamaño; 10287 cancelar zona; 10289 teclado; 10284 documento sin zona; 10285 documento sin texto |
| SCRUM-25 | Finalizado | 10098 | 10291 segunda cuenta; 10290 acceso ajeno denegado |

- **14 capturas auténticas**, sin plantillas ni reconstrucciones. Se verificaron
  nombres, cantidades, ausencia de duplicados e imágenes en el HTML renderizado
  de los cuatro comentarios. Cada subtarea conserva un único comentario con
  resultados, capturas y enlaces al commit/PR. Preservar sus figuras al editar.
- Estado al cierre de HU013: PR #17 en borrador, sin merge, para revisión.
  El usuario autorizó después su revisión/merge y HU014, como se registra abajo.
  El commit adicional de continuidad formaba parte de la misma rama.
  Servidor existente conservado; navegador en login sin cuentas de prueba.
- Se conservó sin aplicar ni eliminar el stash
  `d6406e0cdbc464c1c0301c058024b10dd27c4515`.

## Revisión de HU013 e implementación de HU014

- El 26/10 el usuario autorizó revisar PR #17, integrarlo si cumplía y continuar
  con HU014. Se revisó head `b5d4a0e` sin fallos bloqueantes: 86/86 pruebas, lint,
  build/TypeScript y diff correctos, sin observaciones pendientes. GitHub mostró
  cero checks y cero estados externos; no se atribuyen resultados de CI.
- PR #17 integrado en develop mediante
  `99e7c082c6ae2a69fd2f3d68ec57f5bc85099989`, con el head revisado como condición.
  Se actualizó el comentario único 10098 de SCRUM-25 preservando sus dos imágenes.
  Rama nueva `codex/scrum-26-hu014-dificultad` desde develop actualizado.
- HU014 / SCRUM-26: categoría principal, observación mínima y asociación con la
  página y la selección. SCRUM-85, SCRUM-178 y SCRUM-86 pasaron a «En curso» y
  luego a «Finalizado» tras comprobar criterios y evidencias. El registro
  definitivo por SCRUM-89 queda expresamente para la integración con HU016.
- Commit funcional `5909abc78e68839158e9f787e300ce2e392968b2` agrupa las tres
  subtareas porque comparten formulario, validación y estado del borrador.
  Se subió la rama y se creó PR #18 hacia develop, en borrador, sin merge.

### Comportamiento y decisiones de HU014

- `web/lib/validations/difficulty.ts` centraliza cinco categorías: Concepto poco
  claro, Vocabulario técnico, Procedimiento o cálculo, Relación entre ideas y
  Otra dificultad. Son una taxonomía inicial de implementación: Jira no define
  las categorías concretas ni una longitud numérica.
- Longitud configurada: mínimo 20 caracteres después de trim y máximo 2000.
  Categoría desconocida, observación no textual, vacío/espacios y longitud
  insuficiente/excesiva impiden confirmar. UI y validador comparten constantes.
- El formulario usa select de valor único, textarea, contador y mensajes
  accesibles. «Guardar dificultad en borrador» valida y confirma solo estado
  temporal; no envía una solicitud al servidor. Se explica que recargar o salir
  del proyecto descarta el borrador. Cerrar o Escape conserva sus campos.
- Workspace mantiene los campos y la confirmación por documento/página. La
  confirmación copia el fragmento para evitar que una edición posterior mute la
  asociación. Incluye documentId, pageNumber, categoría, observación normalizada
  y fragmento con texto/rango/rectángulos o zona proporcional; fragmento null
  representa página completa. Se invalidan confirmaciones al cambiar campos,
  seleccionar otro fragmento o limpiar; otra página/documento no hereda datos.
- La selección compartida de HU012/HU013 sigue siendo la fuente única. Callbacks
  del visor estables y campos controlados; no se vuelve a descargar por escribir.
  Se leyeron las guías locales de Next sobre formularios y componentes cliente,
  y se revisaron estado, accesibilidad y renderizado con la guía React.
- No se añadieron dependencias, migraciones, permisos o políticas RLS. El
  formulario se mantiene restringido al propietario autenticado con permiso.
  No hay persistencia, generación IA ni trabajo de HU015/HU016 en esta entrega.

### Pruebas reales y automatizadas de HU014

- **96/96 pruebas, lint y build/TypeScript correctos**. Desde web: npm test,
  npm run lint y npm run build. Diez regresiones nuevas: cuatro del validador y
  copia/identidad del contexto y seis de estado/formulario. Incluyen límites
  19/20 y 2000/2001, tipos inválidos, categoría única, confirmación de texto/zona,
  invalidación, conservación de campos y aislamiento. Se adaptó el harness de
  reemplazo a la nueva dependencia. Los dobles unitarios no son las evidencias UI.
- Navegador integrado, servidor existente localhost:3000 y Supabase real.
  Dos PDF sintéticos válidos se cargaron por la UI: proyecto de 4 páginas
  `80a9ecee-7e6f-4b43-81db-59c1fd7d370d`, documento
  `25f12f14-c96a-4556-971f-f1960273b9a2`; proyecto de 2 páginas
  `aeedc27a-2647-4785-bc55-ebd929eb4dad`, documento
  `4c2a3c41-fd62-4dde-9fa1-5244c113a358`. No se editaron documentos personales.
- Categoría: cinco opciones verificadas en AX/DOM, una opción seleccionada.
  Concepto poco claro se conservó al cerrar/reabrir; cambiar a Procedimiento o
  cálculo quitó la confirmación anterior. Tras guardar y cerrar con Escape,
  la categoría y la observación seguían conservadas al reabrir.
- Validación UI real: vacío y solo espacios rechazados; «No entiendo la idea»
  rodeado de espacios contó 19 y quedó bloqueado; «No entiendo la idea.» con
  espacios contó 20 y se confirmó normalizado sin extremos. Mensajes accesibles
  visibles y confirmación ausente en los casos inválidos.
- Asociación: página 3 abrió vacía tras la dificultad de la 1. Texto nativo de
  dos líneas seleccionado a zoom 50 %, rango [39,127), dos rectángulos. «No
  entiendo» (11) se rechazó sin perder el fragmento. «No entiendo por qué el agua
  permite este proceso.» (49) se confirmó con ese texto, documento y página 3.
- Zona nueva en página 3 invalidó la confirmación de texto. Al guardar «No
  comprendo el procedimiento indicado dentro de esta zona.» (59), se copió la
  zona x=0.1349712464, y=0.2809245994, ancho=0.5743458950, alto=0.1735250398.
  Limpiar quitó fragmento y confirmación; el texto de observación quedó editable
  para revisarlo. El PDF de 2 páginas abrió en página 1 con categoría/observación
  vacías, sin fragmento ni confirmación. Atributos de contexto leídos del DOM real.
- Privacidad UI: segunda cuenta autenticada vio «Documento no disponible» al abrir
  el proyecto ajeno mientras existía. HTTP/SDK real: SHA-256 de ambos PDF igual a
  sus fuentes, API ajena 404, RLS cero filas y API sin sesión 401. SQL verificó
  created_at = updated_at en ambos proyectos después de editar los borradores.
- `web/tests/hu014-live.mjs` pasó check y cleanup. Reproducción desde web:
  `node tests/hu014-live.mjs ACCOUNTS_FILE check`, luego cleanup solo para muestras
  desechables. JSON externo users:[{id,email,password}] con dos propietarios
  hu014-1/2-UUID@example.invalid; el primero debe tener exactamente los proyectos
  HU014-4-paginas y HU014-2-paginas y sus PDF fuente junto al JSON. El ejecutor
  inicia sesiones propias en memoria y nunca lee cookies del navegador.
- Cleanup eliminó esos proyectos/documentos/archivos mediante la API confirmada.
  Se purgaron solo las cuentas sintéticas `eac0d1d7-b01b-4dd8-a9ee-c0df0cbe3cf0`
  y `225cb7d4-5e6c-4013-8328-74b201d84589`, con guardas por UUID/correo y ausencia
  de proyectos/archivos. SQL final: **0 usuarios Auth, identidades, sesiones,
  refresh tokens, perfiles, proyectos, documentos, trabajos de limpieza y archivos**.
  Sesión del navegador cerrada y test-accounts.json eliminado. No hay secretos
  en Git, comentarios de Jira ni este documento.

### Jira y entrega de HU014

| Tarea | Estado | Comentario único | Adjuntos reales |
| --- | --- | --- | --- |
| SCRUM-85 | Finalizado | 10099 | 10293 formulario; 10292 reapertura; 10294 categoría única tras Escape |
| SCRUM-178 | Finalizado | 10100 | 10298 vacío; 10296 espacios; 10297 19 caracteres; 10295 20 válidos |
| SCRUM-86 | Finalizado | 10101 | 10303 nueva página vacía; 10302 texto/incompleta; 10299 texto/válida; 10304 selección nueva sin confirmar; 10305 zona/válida; 10300 limpiar; 10301 nuevo documento vacío |
| SCRUM-26 | Finalizado | 10102 | 10306 segunda cuenta; 10307 acceso ajeno denegado |

- **16 capturas auténticas**, sin plantillas ni reconstrucciones. Verificados
  adjuntos, nombres, cantidades, imágenes en el HTML renderizado y ausencia de
  duplicados. Un comentario por tarea con resultados y enlaces al commit/PR.
  Se preservaron las evidencias previas; mantener las figuras HTML al editar.
- La relación está comprobada en el borrador compartido. La comprobación en la
  solicitud persistida por SCRUM-89 sigue condicionada a la futura HU016; no
  se declara realizada en esta entrega. Casillas aplicables y estados cerrados
  después de verificar pruebas y evidencias.
- El usuario pidió agrupar permisos antes de ausentarse. Se autorizó un script
  temporal limitado a subir estas 16 capturas y publicar los commits de esta rama,
  sin merge. Se elimina al completar la publicación de continuidad; no se guardan
  credenciales de carga en la entrega. Servidor existente conservado, navegador
  en login y stash `d6406e0` intacto.
- Próximo paso: revisar PR #18 antes de autorizar su integración en develop y
  consultar HU015. No se inició otra historia ni se hizo merge del PR #18.
