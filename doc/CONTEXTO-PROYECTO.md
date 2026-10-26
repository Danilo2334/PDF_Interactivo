# Continuidad de PDF_Interactivo

Actualizado: 25/10/2026. Mantener este único documento al continuar.

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
  está ausente. No se ha autorizado ni realizado el merge de HU011.
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
  y se cerró la sesión del navegador. Ambas cuentas quedaron inactivas y con
  acceso bloqueado; su purga definitiva falló en el conector. Ver la incidencia
  administrativa y sus identidades en el cierre conjunto.
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

- HU011 / SCRUM-23 y sus seis subtareas están «Finalizado». PR en borrador
  [#15](https://github.com/Danilo2334/PDF_Interactivo/pull/15) hacia `develop`,
  con la rama subida. No se hizo merge ni se avanzó a otra historia. El stash
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
  `88b1cfb9-875d-4506-983a-d89c5601a638` quedaron con `is_active=false` y acceso
  bloqueado en Auth hasta 2036. La purga definitiva por el conector devolvió dos
  veces `Invalid or expired requestState`; no se confirmó su eliminación.
  Pendiente administrativo: purgar únicamente esas dos cuentas sintéticas cuando
  el conector permita completar la operación. No tienen proyectos ni archivos.
  Se cerró su sesión y se borró `test-accounts.json` fuera del repositorio.
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
