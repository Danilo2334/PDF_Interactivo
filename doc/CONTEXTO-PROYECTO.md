# Continuidad de PDF_Interactivo

Actualizado: 27/10/2026. Mantener este único documento al continuar.

La entrega más reciente está en el último apartado
«Cierre del Sprint 3, 27/10/2026».
Los estados de los apartados anteriores describen su momento cronológico.

**Sprint 3 cerrado en Jira:** siete historias y 25 subtareas finalizadas,
82 capturas conservadas, 219/219 pruebas, lint y build correctos. Los PR
siguen pendientes de integración autorizada; develop/main no cambiaron.

Resumen inicial anterior a la validación local: develop continúa en HU013 (`99e7c08`). HU014 está entregada en
[PR #18](https://github.com/Danilo2334/PDF_Interactivo/pull/18), todavía en
borrador y sin merge; sus evidencias anteriores se conservan.
HU015 / SCRUM-27 se implementó en la nube en la rama
`codex/scrum-27-hu015-extraccion-texto`, commit funcional `99816ba`,
[PR #19](https://github.com/Danilo2334/PDF_Interactivo/pull/19) en borrador.
**HU015: 111/111 pruebas, lint y build correctos; faltan pruebas visuales y capturas.**
SCRUM-27, SCRUM-87, SCRUM-179 y SCRUM-88 están En curso, no finalizados.
PR #19 depende de #18; su base provisional es la rama de HU014. Integrar #18
primero y cambiar después la base de #19 a develop antes de integrar HU015.
No se accedió al PC de la empresa ni al equipo de casa. Conservar el stash
local `d6406e0` sin aplicarlo ni eliminarlo.

La implementación de HU016 / SCRUM-28 también está preparada en la rama
`codex/scrum-28-hu016-solicitud-refuerzo`, basada en HU015 (`7d4f63a`).
**130/130 pruebas, lint y build correctos; validación visual pendiente.**
SCRUM-28, SCRUM-89, SCRUM-180 y SCRUM-90 están En curso. La migración aditiva
de solicitudes ya está aplicada en Supabase. Antes de probar en casa, configurar
el secreto de servidor indicado en el apartado HU016, sin publicarlo.
HU016 está publicada en [PR #20](https://github.com/Danilo2334/PDF_Interactivo/pull/20), en borrador.
HU017 / SCRUM-29 está preparada en `codex/scrum-29-hu017-estado-solicitudes`,
basada en el commit `3a7bc80` de HU016. **149/149 pruebas, lint y build correctos.**
SCRUM-29, SCRUM-91, SCRUM-181 y SCRUM-92 están En curso. Listado, filtros,
restauración de selección e historial implementados; faltan validación visual y
la integración de transiciones reales con HU018–HU024. No confundir contrato
probado en PostgreSQL aislado con resultados reales de IA.
Orden de revisión/integración: HU014 → HU015 → HU016 → HU017 → HU018 → HU019, hacia develop
tras ajustar la base de cada PR. HU017 tiene como base provisional la rama HU016.
No cerrar historias ni sprints mientras falten sus criterios integrados.

HU018 / SCRUM-30 está preparada en `codex/scrum-30-hu018-analisis-contextual`,
basada en HU017 (`09dcc29`). **173/173 pruebas, lint y build correctos.**
SCRUM-30, SCRUM-93, SCRUM-182 y SCRUM-94 están En curso. Se implementaron
preparación del contexto, adaptador de IA, guardado privado del diagnóstico,
reintentos y avisos de contexto insuficiente. La migración está aplicada.
**Faltan clave/modelo de IA de servidor, una prueba real con ese proveedor y
validación visual con capturas. No se hizo ninguna llamada de IA real.**
La base provisional del PR de HU018 es la rama de HU017; integrar primero #21
(y sus antecesores) y después cambiar su base a develop. No fusionar una
historia posterior en la rama de una anterior.

HU019 / SCRUM-31 está preparada en `codex/scrum-31-hu019-recomendacion-refuerzo`,
basada en HU018 (`0c9e078`, [PR #22](https://github.com/Danilo2334/PDF_Interactivo/pull/22)).
**197/197 pruebas, lint y build correctos.** SCRUM-31, SCRUM-95, SCRUM-183 y
SCRUM-96 están En curso. Se implementaron recomendaciones estructuradas,
filtro/orden por tema y dificultad, presentación y elección explícita guardada.
La migración `20261026230234_reinforcement_recommendations.sql` ya está aplicada.
**Pendientes: configurar IA, probar su respuesta real, validación visual y capturas.**
El PR de HU019 debe conservarse en borrador con base provisional HU018; integrar
primero los antecesores, retargetear a develop y revisar antes de cualquier merge.
Continuar desde la rama de HU019 para no perder las dependencias pendientes.

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

## 26/10/2026 — HU015 preparada en la nube; validación visual pendiente

Este apartado actualiza el próximo paso del cierre anterior de HU014. El usuario
autorizó avanzar código, pruebas y entrega desde la nube, sin acceder a su PC de
trabajo ni modificar sus restricciones, para que Codex continúe en casa.

### Entrega y dependencia

- Rama: `codex/scrum-27-hu015-extraccion-texto`.
- Base exacta: `8f84af95af857006b63bb949f4e4de3cad7171c4`, cabecera de PR #18.
- Commit funcional: `99816ba577c0ffa49335474c89ec3642e1e8f7fd`, asociado a
  SCRUM-87, SCRUM-179 y SCRUM-88.
- [PR #19](https://github.com/Danilo2334/PDF_Interactivo/pull/19) es borrador y
  apunta provisionalmente a `codex/scrum-26-hu014-dificultad` para mostrar solo
  los cambios de HU015. **No hacer merge en esa rama.** Revisar/integrar #18,
  cambiar la base de #19 a `develop`, resolver cualquier diferencia y revisar
  las pruebas antes de integrar #19. No se modificaron main ni develop.
- En este punto inicial HU016 no estaba implementada. La entrega posterior
  descrita al final añade el registro en servidor; no reimplementarla.

### Implementación comprobada

- SCRUM-87: `web/lib/pdf/extract-selection-text.ts` reutiliza el PDF abierto.
  Para texto nativo conserva exactamente el rango capturado por HU013. Para una
  zona o una página obtiene los elementos digitales, calcula posiciones con la
  rotación/recorte del visor y ordena por líneas y ubicación. Incluye únicamente
  elementos completos dentro de la zona; si una zona corta una línea, ampliarla
  o seleccionar texto nativo para obtener palabras exactas. La lectura de
  columnas o composiciones complejas debe revisarse en el campo editable.
- SCRUM-179: `selection-text-editor.tsx` ofrece extracción, edición de espacios,
  saltos y caracteres, y confirmación temporal. El estado vive en
  `ProjectWorkspace`; `selection-text-draft.ts` conserva documento, página,
  fragmento, texto original, texto editado y origen digital/manual. Una edición
  invalida la confirmación. Al cerrar/reabrir el formulario el borrador permanece;
  al cambiar la página, el documento o la selección no se hereda contenido viejo.
  Un resultado asíncrono anterior no puede reemplazar una edición manual ni una
  extracción más reciente. Repetir la extracción reemplaza la edición, con aviso.
- SCRUM-88: extracción vacía o fallida muestra la alternativa manual sin perder
  el contexto. No hay OCR. El fallo de lectura/renderizado de la capa de texto
  mantiene el canvas y las herramientas de zona disponibles. La confirmación
  rechaza texto vacío o solo espacios. Cambios en `page-fragments.ts` están
  cubiertos por pruebas de error y limpieza.
- No hay nuevas dependencias, migraciones, llamadas IA ni cambios de permisos,
  roles, autenticación o almacenamiento. El original no se escribe. El objeto
  PDF y su ciclo de vida siguen perteneciendo al visor.

### Verificación ejecutada y límites

- En la copia cloud, Node 24.22.1 / npm 11.9.0:
  `npm --prefix web test` → **111/111** (15 nuevas respecto a las 96 anteriores).
  `npm --prefix web run lint`, `npm --prefix web run build` (incluye TypeScript)
  y `git diff --check` → correctos.
- Pruebas con PDF.js real y archivos generados en memoria: PDF digital con
  elementos fuera de orden, filtrado de zona, rotaciones 0/90/180/270 con CropBox,
  PDF de solo imagen sin texto y SHA-256 de la fuente igual antes/después de
  extraer. Se verifica Unicode/RTL, recortes y escala, fallos, edición y resultados
  atrasados. Las pruebas del componente/estado usan simulaciones; **no equivalen
  a una prueba visual autenticada**.
- No se ejecutó el navegador sobre esta entrega. El navegador cloud y el
  servidor de ejecución están en redes separadas; no se intentó saltar esa
  restricción ni se accedió al navegador del PC de la empresa. No se crearon
  capturas para HU015 ni se registraron pruebas visuales como aprobadas.
- SCRUM-27 y sus tres subtareas se pasaron a **En curso**. No se cambiaron las
  descripciones, casillas, comentarios ni adjuntos anteriores. Mantener el flujo
  acordado: capturas reales y un único comentario breve por subtarea al validar.

### Continuación para Codex de escritorio

1. En casa, revisar `git status -sb` y `git stash list` antes de cambiar nada.
   Preservar cambios locales y `d6406e0`. Hacer fetch de la rama HU015 y leer
   este apartado en esa rama. Si hay trabajo local pendiente, usar un worktree
   separado; no hacer reset forzado, descartar archivos ni aplicar el stash.
2. Usar las variables locales autorizadas del proyecto, sin copiarlas al chat
   ni a Git. Instalar con `npm.cmd --prefix web ci`, iniciar con
   `npm.cmd --prefix web run dev` y abrir el navegador de pruebas autorizado.
   El usuario introduce sus credenciales cuando sea necesario.
3. SCRUM-87: abrir un PDF propio digital de al menos dos páginas. Seleccionar
   un fragmento que incluya parte de una palabra y dos líneas, abrir la solicitud
   y pulsar **Extraer texto**. Comprobar coincidencia exacta en **Texto para el
   asistente**. Después marcar una zona que encierre dos líneas completas y deje
   otra fuera; extraer y comprobar exclusión y orden. Repetir tras cambiar zoom.
   Capturar selección y resultado visible. Verificar en Red que extraer no
   vuelve a descargar el PDF ni envía el texto al servidor.
4. SCRUM-179: corregir espacios, saltos y caracteres, **Confirmar texto en
   borrador**, cerrar con Escape y reabrir. Verificar mismo texto, documento,
   página y zona. Editar de nuevo: la confirmación anterior debe desaparecer.
   Cambiar de página, zona o proyecto: no debe aparecer el texto anterior.
   Capturar la edición confirmada y el cambio de contexto limpio.
5. SCRUM-88: abrir un PDF de solo imagen o escaneado sin capa de texto; marcar
   una zona y extraer. Debe aparecer el aviso de entrada manual manteniendo la
   página y zona. Escribir una transcripción, corregirla y confirmarla; cerrar
   y reabrir para verificar conservación. Solo espacios debe deshabilitar la
   confirmación. Capturar aviso y texto manual confirmado con su contexto.
6. Comprobar escritorio y móvil, cierre/Escape, zoom, reapertura, ausencia de
   errores de consola y un nuevo intento de extracción. Si aparece un fallo,
   corregirlo en esta misma rama con commit asociado a la subtarea y verificar
   el caso concreto; no declarar todas las pruebas aprobadas por anticipado.
7. Adjuntar las capturas reales y un único comentario breve de resultados en
   cada subtarea. Finalizar solo lo verificado. Resumir la historia y enlazar
   PR #19; no duplicar capturas innecesariamente en la historia madre.
8. Resolver primero la revisión/integración pendiente de PR #18. Cambiar la
   base de #19 a develop y revisar su diff y las pruebas antes del merge.
   Actualizar este documento con resultados reales y validar la entrega HU016
   descrita a continuación. No reimplementar HU015 desde develop viejo.

## 26/10/2026 — HU016 implementada en la nube; pendiente de validación visual

### Alcance y entrega

- Rama `codex/scrum-28-hu016-solicitud-refuerzo`, creada desde
  `7d4f63a402813cb681ad5a6532fb857ddb39cfcb` (HU015 / PR #19).
  El PR debe conservarse como borrador, con base provisional en HU015 para
  revisar solo este cambio. No hacer merge en la rama HU015: integrar #18 y
  #19 primero y luego retargetear el PR de HU016 a develop.
- SCRUM-89: envía documento/version, página, fragmento o página completa,
  texto corregido, origen digital/manual, categoría y necesidad. Usuario,
  identificador, fecha y estado pendiente se fijan en servidor/base de datos.
- SCRUM-180: valida cliente y servidor, coherencia del fragmento, campos
  obligatorios y límites. Texto entre 1 y 20.000 caracteres; necesidad entre
  20 y 2.000. Se exige confirmar texto y dificultad en el contexto actual.
  La API consulta el proyecto propio y lee el PDF privado con pdf-lib para
  comprobar el número real de páginas antes de registrar la solicitud.
- SCRUM-90: deshabilita envío pendiente, conserva una clave por contenido
  durante reintentos y devuelve el mismo recibo tras una respuesta perdida.
  La unicidad `(owner_id, idempotency_key)` vive en PostgreSQL, no solamente
  en el botón. Reutilizar una clave con contenido distinto devuelve conflicto.
  Se confirma el ID y estado pendiente; no se simula la generación de IA.
- «Preparar otra solicitud» reinicia el intento y exige confirmar de nuevo
  texto/dificultad. Cerrar el diálogo conserva el intento en el workspace;
  recargar/salir descarta el borrador temporal como en HU014/HU015. Una
  solicitud ya confirmada permanece en base de datos.

### Base de datos y configuración

- La migración generada por `supabase migration new` es
  `20261026211919_create_reinforcement_requests.sql`. Se aplicó con éxito al
  proyecto `zqodybtzssvqozrckfgw` el 26/10. **No volver a aplicarla allí**.
  Para otro entorno limpio aplicar primero todas las dependencias del repo.
- `public.reinforcement_requests` tiene RLS y solo lectura del propietario
  activo con permisos. Usuarios autenticados no pueden insertar directamente;
  no hay lectura anónima. Las relaciones usan ON DELETE CASCADE para que la
  limpieza de HU011 también elimine las solicitudes del proyecto/documento.
- La RPC pública es SECURITY INVOKER y delega en una función privada que
  vuelve a comprobar sesión, rol activo, propietario y versión bajo bloqueo
  de fila, compatible con las transacciones de reemplazo/eliminación.
- Para que un cliente no pueda falsificar el número de páginas llamando la
  RPC directamente, Next firma la validación con un secreto de uso exclusivo
  para solicitudes. No necesita service_role. La firma no llega al navegador.
  `private.reinforcement_request_secrets` conserva la clave con permisos
  revocados y RLS sin políticas intencionadamente (acceso denegado).
- La copia cloud tiene `REINFORCEMENT_REQUEST_SECRET` configurada únicamente
  en su entorno ignorado por Git. **El equipo de casa aún debe configurarla**:
  Codex con conexión autorizada de Supabase puede leer
  `select secret from private.reinforcement_request_secrets where singleton=true;`
  y guardar el valor directamente en `web/.env.local` como
  `REINFORCEMENT_REQUEST_SECRET`, sin mostrarlo en conversación, registros,
  capturas, commits ni variables NEXT_PUBLIC. Conservar las demás variables
  y reiniciar el servidor. No generar otra clave ni modificar la remota.
  Si esa conexión no está disponible, explicar el bloqueo de configuración;
  no pedir claves por chat ni desactivar controles de validación.
- Asesores Supabase: la tabla privada sin políticas genera un INFO esperado.
  Continúan avisos de funciones públicas SECURITY DEFINER preexistentes y
  protección de contraseñas filtradas deshabilitada; no se cambiaron por HU016.

### Verificación efectuada

- 130/130 pruebas automáticas, lint, build/TypeScript y diff --check correctos.
  Se añadió PGlite como dependencia **de desarrollo** para ejecutar la migración
  real y las funciones/RLS en PostgreSQL en memoria, con pgcrypto. No es una
  base de producción ni sustituye la prueba del navegador con Supabase real.
- Casos comprobados: registro completo, mismo ID/fecha al repetir, clave
  conflictiva, propietario ajeno, rol viewer, cuenta inactiva, anónimo,
  INSERT directo denegado, secreto privado inaccesible, firma falsa/alterada/
  expirada, selección incoherente, página fuera del total, cambio de versión,
  eliminación pendiente y cascada. Las pruebas SQL usan un esquema mínimo
  que reproduce los contratos externos; no cubren todo Supabase ni carreras
  entre varias conexiones reales simultáneas.
- API probada con PDF real generado en memoria y autenticación/storage
  simulados. Controlador: doble clic, respuesta interrumpida, reintento,
  conflicto y nuevo intento. Humo HTTP de build cloud: login 200 y API sin
  sesión 401 usando origen localhost; origen distinto 403.
- No se usó el PC de empresa, el equipo de casa, navegador local ni cuentas
  personales para estas pruebas. No se añadieron solicitudes de prueba en
  la base real. No hay capturas nuevas de HU016 ni afirmaciones de aprobación
  visual. Jira conserva historia/subtareas En curso, comentarios y evidencias
  previas intactos.

### Pasos concretos para Codex en casa

1. Preservar cambios locales y stash `d6406e0`. Fetch de la rama HU016; si
   hay trabajo pendiente, abrir un worktree separado. No reset forzado.
   Leer también los pendientes de HU014 y HU015. `npm.cmd --prefix web ci`.
2. Configurar el secreto solo en el entorno local según lo anterior. Ejecutar
   `npm.cmd --prefix web test`, lint y build cuando se cambie código; arrancar
   `npm.cmd --prefix web run dev`. Usar `http://localhost:3000` y el navegador
   autorizado; el usuario inicia sesión personalmente si hace falta.
3. SCRUM-89: abrir PDF propio de al menos dos páginas; marcar una zona,
   confirmar dificultad y texto, enviar. Capturar confirmación con ID.
   Consultar SOLO esa solicitud por su ID en Supabase: comprobar propietario,
   versión, página, selección, texto, necesidad, fecha y pending. Recargar y
   comprobar que el registro sigue. Probar también página completa y texto
   manual de PDF escaneado; capturar sin exponer información personal.
4. SCRUM-180: omitir dificultad o confirmar texto vacío: botón bloqueado y
   lista de pendientes. Editar el texto o cambiar selección después de
   confirmar: debe requerir nueva confirmación. Enviar por API un número de
   página mayor al total y un fragmento de otra página/documento: 422 o 400,
   respectivamente, sin registro. Con una segunda cuenta propietaria probar
   el ID del proyecto ajeno: rechazo, sin revelar datos ni insertar.
5. SCRUM-90: doble clic rápido en envío válido: una fila. Para comprobar
   pérdida de respuesta, con herramienta autorizada interrumpir SOLO la
   respuesta del POST después de que el servidor haya persistido; conservar
   el formulario. Restablecer transporte y «Reintentar envío»: mismo ID y
   una fila. Si no se puede provocar de forma controlada, dejar ese caso
   pendiente, no afirmar que una simple desconexión demuestra pérdida de
   respuesta. «Preparar otra solicitud», reconfirmar y enviar: ID nuevo.
6. Probar el diálogo en escritorio/móvil, cierre/Escape, selector de página,
   cambio de PDF y errores de consola. Un fallo descubierto se corrige en
   esta rama con commit Jira y se verifica el caso; no declarar cierre por
   aprobar solo pruebas automáticas.
7. Adjuntar capturas reales y un único comentario breve a SCRUM-89, SCRUM-180
   y SCRUM-90; finalizar únicamente lo comprobado. Resumir SCRUM-28 y enlazar
   su PR sin duplicar pantallazos. No cerrar Sprint 3 hasta validar pendientes
   HU014/HU015/HU016 y revisar los PR en orden. HU017/generación IA no está
   implementada en esta entrega.


## HU017 / SCRUM-29 — avance en nube del 26/10/2026

Rama: `codex/scrum-29-hu017-estado-solicitudes`, creada desde `3a7bc80` de
`codex/scrum-28-hu016-solicitud-refuerzo`. Publicación en un PR borrador con esa
base provisional. Buscar el PR por su rama de origen. **No integrar HU017 en la
rama de HU016:** integrar primero los predecesores y cambiar su base a develop.
No se accedió al navegador, archivos o restricciones del PC de la empresa ni al
PC doméstico. El stash doméstico `d6406e0` continúa fuera de este entorno.

### Implementación por subtarea

- SCRUM-91: pestaña Solicitudes del documento activo; listado paginado de 20 con
  página, fecha, propietario (sesión actual), estado y etapa; detalle con texto y
  necesidad originales; mensajes de carga, error y vacío. Consultas sin caché
  y actualización cada 10 segundos mientras la pestaña de la aplicación está
  activa y el navegador visible. En proceso muestra un indicador indeterminado,
  sin inventar porcentajes. Se puede volver al PDF durante la espera.
- SCRUM-181: filtros pendiente, en proceso, error, generada y aprobada; todos los
  estados y restablecimiento; conservan proyecto/documento. El filtro, página y
  detalle seleccionado se mantienen al volver del PDF dentro del proyecto.
  Cambiar de documento reinicia el panel. Respuestas antiguas no pisan una
  consulta nueva o un panel desmontado.
- SCRUM-92: abrir la página y restaurar zona/texto usando coordenadas
  proporcionales guardadas; conserva el texto confirmado aunque fuera una
  transcripción manual. El PDF original no se modifica. Consultar una solicitud
  no confirma ni envía otra. Historial paginado con estado y etapa anterior/nueva,
  actor (propietario/sistema/migración) y fecha. Las solicitudes previas a la
  migración reciben una línea de base honesta, no un historial inventado.

### Base de datos y contrato pendiente de integración

La migración `supabase/migrations/20261026215447_track_reinforcement_request_states.sql`
está aplicada en el proyecto existente. Se creó inicialmente con Supabase CLI y
se alineó el nombre de archivo con la versión real asignada por apply_migration,
para evitar una segunda aplicación en futuros despliegues. No volver a ejecutarla.
Se conservaron los datos existentes y se agregaron estado/etapa, fecha de cambio,
error, aprobación explícita e historial RLS. Los usuarios autenticados pueden
leer sus filas autorizadas; no tienen INSERT/UPDATE/DELETE directo del historial
ni UPDATE directo de solicitudes. Las funciones de trigger están en private y
sin permiso de ejecución para los roles cliente.

Contrato para HU018–HU024, **aún sin worker ni RPC de transición pública**:

- pending/queued → processing/analyzing.
- processing/analyzing → pending/choosing tras el análisis.
- pending/choosing → processing/generating cuando el propietario elija.
- processing → error/failed con un mensaje seguro; reintento → processing.
- processing → generated/review al persistir el resultado real.
- generated → approved/approved solo mediante la futura decisión HU024 del
  propietario activo. Esa transacción validada debe establecer localmente
  `pdf_interactivo.owner_approval` con el ID de solicitud y guardar approved_by
  y approved_at. Ningún endpoint actual concede esa aprobación.
- generated puede volver a processing para regenerar; approved es terminal.

La integración futura debe actualizar estado/etapa en el mismo proceso que
persiste el resultado o fallo, comprobar versión/propietario vigente y conservar
el historial automático. No escribir estados de demostración en el proyecto real
para producir capturas. No conectar un proveedor ni generar costes sin su
configuración autorizada. Los parámetros de contexto se implementan en HU018.

### Verificaciones realizadas y límites

- `npm --prefix web run test`: **149/149**. Incluye las pruebas previas y pruebas
  nuevas de consulta/autorización, paginación, filtros, carreras de respuestas,
  restauración y presentación de estados. Las pruebas de interfaz usan fixtures
  y renderizado de componentes: no equivalen a una revisión visual de navegador.
- Dos migraciones reales ejecutadas en PostgreSQL/PGlite aislado para comprobar
  creación/idempotencia, estados, transacciones, auditoría, aprobación explícita,
  RLS, usuario inactivo, otro propietario y cascadas de eliminación. Los registros
  ficticios existen solo allí; no se crearon usuarios ni solicitudes de prueba
  en Supabase remoto.
- lint, build/TypeScript y diff-check correctos. Servidor de producción arrancado
  en la nube; GET de listado y detalle sin sesión devuelve 401 y private,no-store.
- Supabase remoto: RLS activo, triggers INSERT/UPDATE presentes, clientes sin
  permisos directos de cambio de estado/escritura de historial. El asesor no
  señaló tablas/funciones nuevas de HU017. Persisten avisos anteriores sobre
  RPC SECURITY DEFINER existentes y protección de contraseñas filtradas.
  Referencias: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
  y https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
  La tabla private de secretos sin políticas RLS es deliberadamente inaccesible
  al cliente; no abrirla para eliminar el aviso informativo.

### Continuación en el equipo personal

1. Leer git status/rama y preservar cambios locales y stash d6406e0. Obtener la
   rama HU017 sin sobrescribir trabajo. Instalar el lockfile si hace falta.
2. Verificar configuración de servidor HU016 descrita arriba (secreto privado
   sin mostrarlo en chat ni versionarlo). La migración HU017 ya está aplicada.
3. Iniciar sesión personalmente; abrir un documento propio sin solicitudes y
   comprobar el vacío. Crear una solicitud real HU016 con texto o zona y necesidad
   confirmados. Abrir Solicitudes: página, fecha y estado pendiente/cola correctos.
4. Filtrar pendiente y restablecer. Un filtro sin filas debe mostrar vacío. Abrir
   detalle/historial; debe existir el evento de creación. Volver al PDF restaura
   página y selección, también con zoom o página lejana; volver a Solicitudes
   conserva filtro/detalle. Repetir con texto y área y revisar en móvil.
5. Refrescar y cambiar de proyecto: conservar solo datos del documento vigente.
   Comprobar rechazo sin sesión, otra cuenta e inactiva. Revisar error/reintento
   de red y que una respuesta anterior no sobrescribe el filtro actual.
6. Los estados processing/error/generated/approved y sus filtros finales deben
   probarse visualmente con operaciones reales de HU018–HU024 cuando existan.
   Las pruebas aisladas actuales no autorizan marcar ese requisito finalizado.
7. Adjuntar únicamente capturas reales y un comentario breve por subtarea con
   alcance verificado y pendientes. Mantener historia/subtareas En curso hasta
   completar criterios. El PR queda vinculado como enlace nativo, sin reportes
   adicionales ni capturas simuladas. No cerrar Sprint 4 ni Sprint 3 por este avance.


## HU018 / SCRUM-30: análisis contextual preparado en la nube, 26/10/2026

### Alcance realizado y límites

- SCRUM-93: lectura en servidor del original privado mediante PDF.js. Reúne la
  selección guardada, página, texto cercano (máximo 6000 caracteres), categoría
  y dificultad. Prioriza el área seleccionada para desambiguar frases repetidas;
  si no se localiza el fragmento, identifica explícitamente el respaldo de texto
  de la misma página. No incorpora otras páginas, correos, títulos de proyectos
  ni documentos ajenos. Una transcripción manual conserva su procedencia.
- SCRUM-182: adaptador OpenAI Responses con salida JSON estructurada: tema,
  conceptos, alcance y citas breves verificables en el contexto. El contenido
  del PDF se trata como datos; no hay herramientas externas. `store: false`;
  nunca se registran claves o respuestas del proveedor en logs. El diagnóstico
  se almacena en `reinforcement_analyses`, vinculado a la solicitud.
- SCRUM-94: un mínimo local de 32 letras/números entre selección y contexto
  detecta casos evidentemente vacíos. Superarlo no garantiza comprensión:
  el modelo también debe detectar ambigüedad o insuficiencia. Una respuesta
  inconsistente, negativa, incompleta o con citas inventadas no se guarda como
  análisis correcto. Se ofrecen mensajes y reintentos según el caso.
- El contexto insuficiente requiere una nueva solicitud más completa porque
  el contenido de una solicitud enviada es inmutable. Los fallos transitorios
  sí permiten reintentar la misma solicitud.
- El hash SHA-256 antes/después de la lectura protege contra una modificación
  accidental en memoria. Esta función no carga, reescribe ni reemplaza el PDF.
  La prueba integrada con un PDF digital real confirmó bytes idénticos.
- Un análisis correcto pasa de `processing/analyzing` a `pending/choosing`.
  No genera refuerzos, no recomienda todavía opciones (HU019), no marca
  `generated` y nunca aprueba en nombre del propietario.

### Integración técnica y base de datos

- Nueva ruta GET/POST:
  `/api/projects/[projectId]/reinforcement-requests/[requestId]/analysis`.
  GET consulta disponibilidad/resultado; POST `prepare` revisa contexto sin IA
  y POST `analyze` solicita el diagnóstico. Se exige sesión fresca, propietario
  activo, origen permitido y versión actual. El cuerpo se limita a 1000 bytes;
  el navegador no puede aportar un contexto o resultado arbitrarios.
- Panel en el detalle de solicitudes: Revisar contexto, Analizar selección,
  Actualizar análisis, diagnóstico, insuficiencia, espera y reintento. Conserva
  la navegación del PDF. El sondeo reutiliza el controlador de HU017 y cancela
  respuestas de una selección anterior; el cliente bloquea doble clic.
- SQL: `20261026224216_contextual_request_analysis.sql`, aplicada con éxito al
  proyecto Supabase existente. Tabla con RLS y SELECT del propietario; sin
  escritura directa ni acceso anónimo. RPC pública invoker y función privada
  con prueba HMAC de servidor separada de la creación de solicitudes.
- Reclamo atómico por solicitud: los duplicados reciben el intento en curso o
  el resultado existente. Un intento vence tras 120 segundos y puede
  recuperarse; un proceso anterior ya no puede publicar. Límite de dos análisis
  activos y diez inicios por cuenta en cinco minutos. Los cambios de estado
  quedan en el historial de HU017 en la misma transacción.
- El análisis vuelve a comprobar permisos y versión al guardar. Cambiar el PDF,
  eliminar el proyecto o desactivar al propietario invalida el resultado.
- Se corrigió solamente el nombre local de la migración HU016 a
  `20261026211919_create_reinforcement_requests.sql`, la versión comprobada en
  `supabase_migrations.schema_migrations`. El SQL no cambió ni se reaplicó.
  Se actualizaron sus referencias en los tests para evitar reaplicaciones.
- RLS, falta de UPDATE autenticado y falta de SELECT/RPC anónimo verificados en
  el proyecto real; no se crearon solicitudes ni diagnósticos ficticios allí.
- El asesor de seguridad no añadió hallazgos para HU018. Conserva avisos previos
  de funciones definer y protección de contraseñas; no forman parte de esta
  historia. Referencias: [funciones públicas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
  [funciones autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
  [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
  La tabla privada de secretos tiene RLS sin políticas deliberadamente para
  denegar acceso directo ([referencia](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).

### Verificación ejecutada

- `npm --prefix web test`: **173/173**, incluidas 24 nuevas pruebas de HU018.
- `npm --prefix web run lint`, `npm --prefix web run build` y `git diff --check`:
  correctos. Node 24.22.1 en la nube; no se cambió la instalación local.
- Migraciones exactas en PostgreSQL aislado: pruebas manipuladas/caducadas,
  permisos, transiciones, eventos, duplicados, reintento/lease, resultado tardío,
  versión sustituida, eliminación, cuotas y borrado en cascada. Tras alinear
  nombres se repitieron 29 pruebas de migraciones HU016/HU017/HU018, aprobadas.
- Lectura de un PDF real de dos páginas: no incorpora la segunda página y
  conserva su SHA-256; PDF vacío/corrupto/página inválida también comprobados.
- Proveedor simulado: JSON válido, rechazo, fallo, timeout, respuesta incompleta,
  contexto insuficiente y citas inexistentes. Esto NO acredita calidad semántica
  ni integración real con OpenAI.
- Servidor de producción en la nube: `/login` 200; GET y POST de análisis sin
  sesión 401; POST desde otro origen 403. El worker de PDF.js está incluido
  en el trazado de la ruta. No se utilizó navegador de la empresa ni del hogar.

### Retomar en Codex de escritorio

1. Leer este documento, `git status -sb` y el diff antes de cambiar de rama.
   Conservar cambios locales y el stash `d6406e0`. Obtener la rama remota HU018
   en un checkout limpio/aislado; no aplicar parches ni hacer resets forzados.
2. Conservar la configuración existente de Supabase y el secreto de servidor
   `REINFORCEMENT_REQUEST_SECRET` de HU016. Las migraciones anteriores ya están
   aplicadas al proyecto indicado; no pegarlas nuevamente en SQL Editor.
3. Para la prueba IA real, el propietario configura de forma segura
   `OPENAI_API_KEY` y `OPENAI_ANALYSIS_MODEL` en el entorno del servidor
   (`web/.env.local` ignorado por Git o el almacén de secretos del despliegue).
   Ninguna usa prefijo `NEXT_PUBLIC_`. Elegir un modelo disponible en su cuenta
   compatible con Responses y Structured Outputs y autorizar su consumo.
   No enviar credenciales por chat, commits ni capturas. No existe un modelo
   predeterminado ni se ha creado una cuenta/proveedor de pago.
4. Reiniciar la aplicación. Con sesión autorizada, abrir un PDF propio de dos
   páginas, crear una solicitud HU016 y abrir Solicitudes → Ver solicitud e
   historial → Revisar contexto. Comprobar página, selección y texto cercano;
   la segunda página no debe aparecer. Captura para SCRUM-93.
5. Analizar una selección con una dificultad concreta. Comprobar espera, tema,
   conceptos, alcance y citas; recargar detalle y confirmar persistencia e
   historial `queued → analyzing → choosing`. Doble clic no crea otro intento.
   Revisar coherencia del diagnóstico con el PDF, no solo que existe un JSON.
   Captura real de diagnóstico guardado para SCRUM-182.
6. Probar un PDF sin texto útil con transcripción mínima: aviso de contexto
   insuficiente. Probar además un fragmento semánticamente ambiguo con el
   proveedor real; no inventar que el modelo lo rechazará sin observarlo.
   Descargar el original antes/después y comparar SHA-256. Capturas para SCRUM-94.
7. Comprobar segunda cuenta, cierre de sesión, móvil, desconexión y reintento.
   No alterar estados mediante SQL en el proyecto real para simular éxito.
   Mantener En curso si faltan IA real o capturas; no marcar listas como hechas.
8. Tras validar, adjuntar solamente capturas reales y una explicación breve
   por tarea en Jira, respetando evidencias existentes. Revisar PRs encadenados
   en orden antes de integrarlos hacia develop. La aprobación final del
   refuerzo sigue siendo una función posterior, fuera de HU018.

Documentación oficial consultada para el adaptador:
[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses),
[PDF.js en Node](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs).

## HU019 / SCRUM-31 — avance en la nube del 26/10/2026

La historia y sus tres subtareas se leyeron directamente en Jira. Rama:
`codex/scrum-31-hu019-recomendacion-refuerzo`, desde HU018 `0c9e078`.
La base provisional del PR es `codex/scrum-30-hu018-analisis-contextual` (#22).
No hacer merge en esa rama: integrar los antecesores por orden, actualizar
la base hacia develop y revisar entonces HU019. No se tocó ningún PC ni el
stash de casa `d6406e0`.

### Implementación y alcance

- **SCRUM-95:** contrato estricto para explicación, ejemplo, resumen, imagen
  e interacción. Adaptador de Responses API con salida JSON estructurada,
  sin persistencia del proveedor, límite temporal y respuestas controladas
  ante rechazo, formato inválido, interrupción o servicio no configurado.
  Usa el diagnóstico suficiente de HU018; no fabrica alternativas locales.
- **SCRUM-183:** cada candidato se contrasta con el tema/conceptos, una cita
  del fragmento o página y otra de la dificultad. Solo pasan candidatos
  pertinentes en ambos ejes (valor ordinal 2 o 3). Orden: suma de pertinencia,
  dificultad y orden estable del catálogo como desempate. Las puntuaciones
  no representan probabilidades ni garantizan calidad pedagógica; esa calidad
  debe revisarse con un proveedor real. No se fuerzan los cinco formatos.
- **SCRUM-96:** panel de opciones ordenadas, justificación breve y selección
  por radio sin preselección. Guardado explícito de tipo y razón en la solicitud;
  el servidor copia la razón persistida, nunca la enviada por el navegador.
  El control de versión impide sobrescribir otra elección desde una pestaña
  antigua. Un reintento idéntico devuelve el recibo ya guardado.
- La elección mantiene `pending/choosing`. No genera contenido, no aprueba
  automáticamente y no modifica el PDF original. HU020 y las historias
  posteriores deben utilizar la elección persistida y la versión del documento.
- La extracción de autorización/JSON acotado a `request-service.ts` se comparte
  con HU018 y conserva sus comprobaciones. Se corrigió además en SCRUM-182
  el rechazo de citas formadas solo por espacios, con prueba de regresión.

### Persistencia y seguridad

Migración **ya aplicada**: `20261026230234_reinforcement_recommendations.sql`.
No volver a ejecutarla manualmente ni aplicar otra copia con distinto nombre.
Las tablas `reinforcement_recommendations` y `reinforcement_recommendation_runs`
son privadas por propietario con RLS, SELECT autenticado y sin escritura directa
ni lectura anónima. Las RPC públicas usan SECURITY INVOKER y rechazan anon.
Las transacciones privadas verifican sesión/rol activo, propiedad, documento
actual, diagnóstico e intento. El resultado del proveedor exige la firma de
servidor HU016 con dominio `reinforcement-recommendations`; no usa service_role.
Lease de 120 segundos, llamada con límite de 45 segundos, máximo dos intentos
activos y diez inicios reales en cinco minutos por cuenta. Repetir un resultado
listo o un intento activo no inicia otra llamada. Los resultados tardíos o de un
PDF reemplazado se rechazan antes de guardar. La eliminación elimina los hijos.

Campos para HU020: `recommended_type`, `recommendation_reason`,
`recommendation_attempt_id`, `recommendation_selected_at`,
`recommendation_selected_by`, `recommendation_choice_version` en
`reinforcement_requests`. Una vez iniciada la generación no se permite otra
selección; el reintento de una elección idéntica sigue siendo idempotente.

API: GET/POST
`/api/projects/[projectId]/reinforcement-requests/[requestId]/recommendations`.
GET recibe `documentId`. POST acepta `action: "recommend"` o `action: "choose"`.
La elección también requiere `attemptId`, `type`, `expectedVersion`.
Origen ajeno → 403, sin sesión → 401, cambio concurrente/documento → 409,
cuota → 429, configuración/infraestructura no disponible → 503.

### Verificación efectuada

- Suite completa: **197/197**, con 24 pruebas nuevas que incluyen PostgreSQL
  aislado (PGlite), API/proveedor simulados y renderizado HTML del formulario.
- Lint y build de producción, incluido TypeScript, correctos.
- Servidor de producción en la nube: login 200, GET/POST anónimos 401 y POST
  de otro origen 403. No hubo llamadas reales al proveedor ni sesiones de prueba
  creadas en producción; los datos de prueba de base de datos fueron aislados.
- Metadatos del Supabase real: RLS activa en ambas tablas, escritura directa
  autenticada denegada, lectura y RPC anónimas denegadas. El asesor de seguridad
  no añadió hallazgos sobre HU019; persisten los avisos anteriores documentados
  en HU018. No se cambiaron políticas o funciones ajenas a esta historia.

### Pendientes para Codex de escritorio

1. Conservar los cambios locales y `d6406e0`. Traer esta rama tras revisar el
   estado de Git, sin reset forzado ni merge automático de los PR apilados.
2. Configurar de forma segura las variables **de servidor** `OPENAI_API_KEY` y
   `OPENAI_ANALYSIS_MODEL` descritas en HU018. Reutilizar
   `REINFORCEMENT_REQUEST_SECRET`; nunca publicarlo ni añadir NEXT_PUBLIC a esos
   secretos. La nube no tenía clave ni modelo configurados y no consumió IA.
3. Iniciar sesión personalmente, abrir un PDF propio, registrar una solicitud
   con fragmento y dificultad concretos y completar un diagnóstico suficiente
   de HU018. Abrir el detalle y pulsar «Obtener recomendaciones».
4. Comprobar opciones justificadas y ordenadas, sin selección automática.
   La explicación debe guardar relación real con el tema y la dificultad;
   no afirmar que un tipo siempre debe aparecer. Si el contexto no basta,
   debe impedirse la recomendación; si ninguna aporta, debe avisarlo.
5. Seleccionar una opción y «Guardar elección». Recargar o volver al proyecto:
   tipo y justificación deben seguir guardados. La solicitud sigue pendiente
   de generación y el PDF original conserva su contenido.
6. Con dos pestañas, guardar una opción en A y otra en B antes de que B recargue
   su versión. B debe recibir conflicto o actualizar sus opciones sin pisar A.
   Volver a seleccionar tras actualizar debe funcionar mientras no se genere.
   Verificar también otra cuenta y una sesión cerrada, además de escritorio/móvil.
7. Adjuntar solo capturas auténticas y un único comentario breve por subtarea,
   preservando las evidencias anteriores. Solo entonces cerrar lo que esté
   efectivamente aprobado. SCRUM-31/95/183/96 permanecen En curso; no hay
   evidencias visuales nuevas de esta implementación en la nube.

La implementación y las pruebas automatizadas están preparadas. Las capturas,
la autenticación de prueba real y la calidad de recomendaciones reales todavía
no están verificadas. No presentar mocks como respuestas del proveedor.

## Validación en el equipo personal y cambio a Gemini, 26/10/2026

Este apartado actualiza los estados cronológicos anteriores. Se recuperó la
rama acumulada de HU019 y se conservaron el trabajo local y el stash completo
`d6406e0cdbc464c1c0301c058024b10dd27c4515`, sin aplicarlo ni eliminarlo.
Develop continúa en `99e7c08`; no se integraron PR, no se modificó main y no se
inició HU020. Se mantienen los PR en borrador y su cadena #18 → #19 → #20 →
#21 → #22 → #23, sin fusionar historias posteriores en ramas anteriores.

### Configuración y correcciones comprobadas

- Node local 22.23.3 y npm 10.9.9. Inicialmente se instaló el lockfile con
  `npm.cmd --prefix web ci`, sin actualizar dependencias. La actualización de
  seguridad posterior se detalla al final de este apartado. Supabase corresponde al
  proyecto `zqodybtzssvqozrckfgw`. Se comprobó el historial de migraciones: las
  cuatro de HU016–HU019 ya estaban aplicadas y no se reaplicaron.
- Se recuperó de forma privada el secreto existente de HU016 y se configuró en
  `web/.env.local`, ignorado por Git. No se rotó el valor remoto ni se relajaron
  RLS, permisos, firmas o controles de propiedad.
- El propietario configuró `GEMINI_API_KEY`. El modelo se configura mediante
  `GEMINI_ANALYSIS_MODEL`; para estas pruebas es `gemini-3.8-flash`. Ambas son
  variables de servidor sin prefijo NEXT_PUBLIC. Sustituyen al proveedor OpenAI
  de los apartados anteriores para el análisis y las recomendaciones.
- Gemini nativo conserva contratos, citas, orden por pertinencia, persistencia
  y estados. Una llamada por acción, límite de 45 segundos y mensajes seguros
  para cuota agotada, negativa, formato inválido o indisponibilidad. No hay
  cambio automático a un proveedor de pago ni reintentos ilimitados. No se
  activó facturación ni se contrataron servicios.
- Commit HU015 `c30e2c0` (SCRUM-87): normaliza separadores Windows en la prueba
  de fuentes de PDF.js. Corrige tres fallos de la suite local; no cambia la
  extracción de la aplicación. Las 10 pruebas afectadas pasan.
- Commit HU015 `faefcad` (SCRUM-87): la barra de navegación deja de ser fija por
  debajo de 1024 px. A 390×844 tapaba casi todo el PDF; se conservaron capturas
  reales antes/después y se repitieron selección con teclado, entrada manual,
  envío y restauración en móvil. Se propagó por HU016 → HU017 → HU018 → HU019
  usando un worktree separado para no cambiar la rama del servidor activo.
- Commit HU018 `324e322` (SCRUM-182): adaptador Gemini y pruebas del análisis.
  Commit HU019 `6b827d8` (SCRUM-95): recomendaciones Gemini y manejo de cuota.
  Las correcciones se publicaron en la historia correspondiente y se
  propagaron hacia sus descendientes conservando el historial.
- Commit HU016 `5b33742` (SCRUM-89): `logging.serverFunctions: false` según la
  documentación local de Next 16.3.8. Sus trazas de desarrollo incluían los
  argumentos de autenticación. Se informó al propietario de la exposición;
  no se copiaron valores privados al repositorio ni a Jira. Tras la corrección,
  la lectura acotada del registro no encontró trazas de esas acciones.
- Hallazgo SCRUM-233: Resend rechazó realmente el correo de recuperación con
  error SMTP 550 por remitente en modo de pruebas. El dominio/remitente SMTP
  sigue pendiente; no se declara reparada la recuperación por correo.
- Commit `b0c8ff8` (SCRUM-233), incluido desde HU016 hasta HU019: cambio desde
  Mi perfil con sesión vigente y cuenta activa. Verifica la contraseña actual
  con un cliente Supabase efímero sin cookies del navegador; comprueba de nuevo
  el acceso antes de actualizar y revoca sesiones tras el éxito. El propietario
  escribe personalmente los valores. Se comprobó en navegador el rechazo de
  campos vacíos y el propietario completó la rotación: la aplicación mostró
  «Contraseña actualizada» y volvió al login. Capturas reales sin valores
  privados en un único comentario de SCRUM-233 (10103), conservando sus imágenes.

### Verificaciones y límites reales de esta sesión

- Suite completa **208/208**, lint y build de producción con TypeScript
  correctos después de los cambios. Incluye seis pruebas de seguridad de
  SCRUM-233 y las pruebas Gemini con proveedor simulado; esas simulaciones no
  acreditan una respuesta real de IA.
- Tras la corrección móvil se repitieron **64/64** pruebas de extracción,
  navegación, fragmentos y selección de página, además de lint y build de
  producción con TypeScript: correctos. La revisión de las consolas de las
  pestañas al terminar no encontró excepciones JavaScript nuevas.
- HTTP real: login 200; listado/creación/análisis/recomendaciones sin sesión
  401; escrituras desde origen ajeno 403. No se insertan registros con esas
  comprobaciones.
- La consulta real del modelo Gemini devuelve 200 y soporta generateContent.
  **Dos llamadas mínimas de generación estructurada devolvieron 503 UNAVAILABLE.**
  En la aplicación se ejecutó un análisis real y un único reintento: ambos
  agotaron el límite de 45 segundos. El doble clic del primero no añadió otro
  procesamiento. PostgreSQL confirmó exactamente dos inicios y dos errores
  `timeout`, sin diagnóstico. El historial, el mensaje y la posibilidad de
  reintento persistieron al recargar. No se ha obtenido aún un diagnóstico ni
  una recomendación real; no se afirma calidad semántica ni se reemplazaron
  resultados con datos simulados. No se efectuaron más llamadas tras esos fallos.
- Se cargó por la aplicación el PDF digital sintético de dos páginas
  `QA-HU015-019-digital.pdf`, proyecto `5feb6c07-68da-4b93-bc37-416fb4fcc65b`,
  documento `d91357f4-ae07-4c92-9353-facb6295f18e`. La segunda página tiene un
  tema diferente para detectar contaminación del contexto. El listado vacío
  real de HU017 fue observado y capturado. También está preparado un PDF de
  prueba escaneado, sin capa de texto.
- Las capturas de esta sesión se conservan fuera del repositorio en la carpeta
  de evidencias HU019 del chat. No adjuntar una pantalla de carga como prueba
  de un resultado terminado. Las evidencias anteriores de HU014 se conservaron.
- Para continuar autónomamente tras la rotación se provisionaron dos cuentas
  temporales QA autenticables, sin usar ni extraer la contraseña o las cookies
  personales. Son fixtures de prueba, no una prueba de registro o confirmación
  por correo. IDs: `15abf825-9b25-4064-9cde-e6ab41693034` y
  `92fb2847-9391-4aa5-91d1-6937d1c7d1bf`; solo contienen material sintético.
  Sus credenciales se guardan exclusivamente fuera del repositorio en
  `HU019/test-accounts.json` dentro de la carpeta privada de evidencias del chat.
  No imprimirlas ni trasladarlas a Jira o a Git.
- Proyecto digital QA: `3f600fbc-1b8a-4fbe-a5d1-8ac700c08585`, documento
  `06d8f613-99b6-46b3-83a9-14f63b3788af`. Proyecto escaneado QA:
  `d313803d-f9b3-4004-86e3-2aa53f8666e6`, documento
  `d11635f1-7023-4d2d-96d0-46d1b9b5eca8`. Se conservan identificados para
  retomar la validación de IA cuando el proveedor responda. No borrar documentos
  personales ni interpretar estas cuentas como usuarios reales del producto.
- **HU015 / SCRUM-27, SCRUM-87, SCRUM-179 y SCRUM-88: Finalizado en Jira.**
  Extracción nativa exacta, zona con dos líneas completas y exclusión del resto,
  orden, zoom 50→75 %, página completa, edición/confirmación, cierre con Escape
  y reapertura comprobados. Cambiar selección, página o documento descarta texto
  y confirmaciones anteriores. Espacios solos se rechazan. La extracción del
  rango no provocó ninguna nueva descarga de `/pdf`. El escaneado mostró el
  aviso y permitió transcribir, editar y confirmar manualmente, conservando su
  documento, página y zona. También se comprobó móvil y teclado.
- **HU016 / SCRUM-28, SCRUM-89, SCRUM-180 y SCRUM-90: Finalizado en Jira.**
  Registro real completo, recarga, propietario, estado inicial pending/queued,
  fechas y contenido inmutable verificados por UI, HTTP y Supabase. API real:
  vacío o selección incoherente 400, página 3 en PDF de 2 páginas 422,
  documento desactualizado 409, cuenta ajena 404 sin insertar; RLS no devuelve
  filas ajenas. Cambiar el contenido de una clave ya utilizada devuelve 409.
- Respuesta perdida: se interceptó **solo** la respuesta Fetch 201 después de
  comprobar que `3033863f-45eb-4915-bb0f-11059857ab25` ya estaba persistida. Se
  interrumpió esa respuesta con ConnectionClosed; el borrador mostró error y
  reintentó con la misma clave/ID, sin otro registro. El doble clic tampoco
  duplicó. «Preparar otra solicitud» creó el ID nuevo
  `795fd149-4dc8-4dc2-b07c-35dd79065243`. Las interceptaciones se desactivaron
  después de la prueba; no se desconectó la red del equipo.
- **HU017 / SCRUM-29 y SCRUM-91/181/92: En curso.** Vacío y recarga verificados;
  21 solicitudes creadas por la API real probaron paginación 20+1 sin repetir ID.
  Filtros: 20 pendientes, un error real y vacío en generada; restablecer devuelve
  todos. Después se añadieron dos solicitudes reales, una de página completa y
  otra de texto nativo (23 en el digital). Se restauraron zonas en móvil y un
  rango nativo de cuatro líneas en escritorio. El detalle conserva el historial
  real de creación, análisis, timeout y reintento, distinguiendo propietario y
  sistema. Faltan estados/transiciones finales de generación y aprobación de
  HU020–HU024; no se fabricaron por SQL.
- **SCRUM-93 y SCRUM-94: Finalizado; HU018 / SCRUM-30 y SCRUM-182: En curso.**
  Contexto real de selección/página/dificultad sin incluir la segunda página ni
  la línea ajena. En el escaneado se creó una solicitud con transcripción mínima
  «A»: el servidor guardó `insufficient_context`, `enough=false`, sin diagnóstico
  ni modelo, y exigió otra solicitud más completa. El bloqueo de IA real sigue
  siendo los 503 y timeouts descritos arriba; falta evaluar tema, conceptos,
  alcance y citas de una respuesta real válida.
- SHA-256 real, comparado con los archivos originales después de los análisis:
  digital `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`;
  escaneado `b0bc1809351f249bd352032fbcdd193846e4c44e4199cf4bfbfec24326b71302`.
  Ambos coinciden; no se modificaron los PDF.
- **HU019 / SCRUM-31 y SCRUM-95/183/96: En curso.** El botón de recomendaciones
  permanece bloqueado sin un diagnóstico suficiente. No hubo recomendaciones
  reales ni elección guardada. Quedan pendientes pertinencia, opciones sin
  preselección, guardado/recarga, nueva elección y conflicto entre dos pestañas;
  no crear diagnósticos o candidatos ficticios para sortear esa dependencia.
- SCRUM-233 también se comprobó por Action HTTP real con la segunda cuenta QA:
  rechazo de contraseña débil e incorrecta, rotación, cierre de sesión, rechazo
  de la contraseña anterior e ingreso con la nueva. Su archivo de credenciales
  privado fue actualizado sin mostrar valores. Continúa En curso por el bloqueo
  independiente del correo SMTP, que requiere dominio/remitente verificado.
- Jira: **29 imágenes nuevas** vinculadas a 13 subtareas y **20 comentarios de
  resultados**, uno por cada historia/subtarea del alcance. Se comprobaron los
  29 nombres en las imágenes HTML renderizadas, sin duplicados. SCRUM-183/96
  remiten al bloqueo de SCRUM-182/95 sin duplicar capturas. SCRUM-233 conserva
  sus dos imágenes y su único comentario 10103 actualizado. HU014 y sus
  evidencias anteriores permanecen intactas.

El servidor local queda activo y la validación ya puede retomarse con las
cuentas QA sin depender del ingreso personal. Reutilizarlo y evitar cambios
de rama mientras haya una prueba en curso. Los PR #19–#23 conservan la cadena;
#22 y #23 describen Gemini y sus límites reales. Revisar antes de integrar y no
avanzar a HU020 hasta resolver la validación pendiente del proveedor.

### Regresión de seguridad y entrega, 27/10/2026

- El audit real detectó dos paquetes afectados: Next 16.3.8 (tres avisos,
  severidad crítica agregada) y Zod 4.6.5 (alta). Se abrió SCRUM-234 y se
  corrigieron mediante `55ede93`: Next y eslint-config-next 16.4.3, Zod 4.6.6
  exactos y lockfile actualizado. Esta causa concreta justifica la actualización;
  Node se conserva. `1216db1` conserva el encabezado de AGENTS.md regenerado por
  Next. Ambos commits parten de HU015 y se propagaron por merges normales
  HU016 → HU017 → HU018 → HU019; no se reescribió historial.
- Instalación final y documentación local de Next 16.4.3 comprobadas:
  `logging.serverFunctions: false` sigue siendo válido. Tras el ingreso QA,
  la lectura acotada de las trazas no encontró argumentos de acciones privadas.
- Verificación final sobre la rama acumulada HU019: **208/208** pruebas,
  lint, build de producción/TypeScript y **npm audit: 0 vulnerabilidades**.
  Una segunda revisión estática no encontró fallos accionables en el adaptador
  Gemini ni en el cambio de contraseña; no equivale a una respuesta real de IA.
- Regresión real tras actualizar: inicio de sesión autónomo con una cuenta QA,
  23 solicitudes persistidas, paginación 20+3 sin repetidos, detalle nativo,
  cinco eventos reales del análisis fallido/reintento, mismo ID al reenviar,
  rechazo de contenido cambiado/vacío sin insertar e aislamiento de la segunda
  cuenta por API/RLS. Login público 200, API sin sesión 401 y origen ajeno 403.
  Se restauraron los cuatro renglones del PDF en el visor y se comprobó el
  desplazamiento móvil 390×844; consola de la pestaña final sin errores nuevos.
  Las dos huellas SHA-256 se comprobaron de nuevo y coinciden con los originales.
  No se hicieron nuevas llamadas de IA durante esta regresión.
- SCRUM-234 quedó **Finalizado** con una captura auténtica del detalle después
  de actualizar y un único comentario 10124. Se comprobó su imagen renderizada
  `234-01-regresion-next-seleccion-real.jpg`. El total de esta entrega es de
  **32 capturas nuevas y 22 comentarios de resultados**: 29/20 del alcance
  HU015–HU019, dos/un comentario de SCRUM-233 y una/un comentario de SCRUM-234.
  Se conservaron las evidencias previas y no se duplicaron imágenes.
- Los PR #19–#23 describen ahora las pruebas locales, las correcciones y los
  pendientes reales, con sus bases encadenadas y en borrador. HU015/HU016 y
  SCRUM-93/94 están verificados; HU017 conserva sus pendientes funcionales,
  HU018/HU019 el bloqueo de Gemini y SCRUM-233 el del remitente SMTP.
  La configuración privada y los datos sintéticos QA se conservan para retomar
  el proveedor sin solicitar otro ingreso personal. Servidor Next 16.4.3 activo
  en localhost:3000. No hubo merge de PR, cambios a develop/main ni HU020.

Referencias oficiales utilizadas: [modelo Gemini](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash),
[salida estructurada](https://ai.google.dev/gemini-api/docs/generate-content/structured-output),
[tarifas](https://ai.google.dev/gemini-api/docs/pricing),
[contraseñas Supabase](https://supabase.com/docs/guides/auth/passwords),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Resolución de Gemini y cierre de HU018–HU019, 27/10/2026

Este apartado actualiza el bloqueo anterior. Se continuó sobre HU019, sin
aplicar/eliminar el stash `d6406e0cdbc464c1c0301c058024b10dd27c4515`, sin
merge de PR, sin modificar develop/main y sin avanzar a HU020. Se reutilizó
el servidor local y las cuentas temporales QA; no se solicitó ingreso personal.

### Modelo y fallos corregidos

- `gemini-3.8-flash` siguió respondiendo 200 a metadatos, pero la generación
  mínima estructurada devolvió 503 y otra de texto agotó 45 segundos. Se
  comprobaron el contrato REST y el nivel `low` en la documentación oficial;
  no se cambiaron parámetros a ciegas ni se interpretó el GET 200 como éxito
  de inferencia.
- Se verificó el nivel gratuito publicado y una generación JSON real correcta
  de **`gemini-3.5-flash-lite`**. Se configuró explícitamente en la variable
  de servidor `GEMINI_ANALYSIS_MODEL` de `.env.local`, ignorada por Git.
  La clave se conservó privada. No hay cambio automático de modelo/proveedor,
  facturación activada, servicios contratados ni herramientas externas de pago.
- **SCRUM-183, `fccbe06`:** una respuesta real de vocabulario descartaba tres
  formatos con razones vacías, y el validador rechazaba también las dos opciones
  útiles. Se permiten razones vacías solo en los candidatos que se descartan;
  toda opción mostrada/persistida conserva razón de 20–700 caracteres y citas
  verificadas. La prueba de regresión falló antes y pasó después del arreglo.
- **SCRUM-183, `e6de533`:** otro resultado real usó una referencia temática
  distinta del diagnóstico. El esquema enviado a Gemini ahora limita ese campo
  a un enum con el tema y conceptos realmente guardados. La validación del
  servidor sigue comprobando tema, citas del PDF y dificultad; no se aceptan
  referencias fuera de ese conjunto ni se debilitaron las citas para conseguir un éxito.
- **SCRUM-96, `bae21ef`:** se reprodujo un conflicto de elección que tardó
  aproximadamente 2,1 minutos y devolvió 503. Las funciones usaban SQLSTATE
  `40001` para un conflicto determinista, patrón asociado a reintentos internos
  de PostgREST en la documentación de Supabase. Se sustituyeron nueve códigos
  por `PT409` en tres funciones de recomendaciones y se añadió su mapeo HTTP.
  No se atribuye una versión remota de PostgREST que no se comprobó.
- Se reconcilió el historial remoto y se compararon los tres cuerpos de función
  con el original, normalizando únicamente CRLF. Se aplicó **solo** la migración
  forward `20261027201023_fix_recommendation_conflict_codes.sql`. El archivo local
  y su prueba coinciden con esa versión del historial remoto. No hubo db push,
  reaplicación de migraciones anteriores, rotación de secretos, terminación de
  backends ni cambios de permisos/RLS. Las pruebas PostgreSQL comparan cuerpos,
  metadatos, ACL, políticas y RLS; los avisos de seguridad existentes no aumentaron.

### Pruebas reales completadas

- Solicitud `e86007fc-a485-43b2-8f8f-1a5ab8cd98c4`: diagnóstico suficiente sobre
  conservación de energía en un péndulo, conceptos y alcance coherentes con la
  dificultad, con dos citas literales. Doble clic produjo **un solo intento**.
  Recomendaciones reales justificadas y ordenadas, sin radios premarcados.
  Se guardaron elecciones y se comprobaron recarga, teclado y móvil 390×844;
  la elección final de esta solicitud es Imagen, versión 4.
- Se recuperó realmente `795fd149-4dc8-4dc2-b07c-35dd79065243`, que conservaba
  dos timeouts: el tercer intento terminó con diagnóstico suficiente de Gemini
  3.5 Flash-Lite y estado pending/choosing. Sus siete eventos conservan los
  errores, los reintentos y la recuperación, sin fabricar transiciones.
- Se creó por UI la solicitud de vocabulario
  `f6f024a6-53f9-41f1-b344-170b61f0f226`, sobre texto digital extraído de la
  página 2 y una necesidad verbal breve de evaporación/condensación. El
  diagnóstico y su cita corresponden al ciclo del agua, sin energía ni péndulo.
  Tres respuestas de recomendaciones se rechazaron antes de completar las
  correcciones; el cuarto intento guardó **solo Explicación y Resumen**,
  excluyendo ejemplo, imagen e interacción. El rechazo anterior y el resultado
  posterior tienen capturas auténticas. El documento digital tiene ahora 24
  solicitudes sintéticas; no se tocaron documentos personales.
- Dos pestañas sobre el caso de vocabulario: se retuvo únicamente el envío
  real de B con versión 0, sin alterar su cuerpo. A guardó Explicación versión 1;
  al liberar B, el servidor respondió **409** y la aplicación mostró el conflicto
  conservando A. Después de actualizar, B guardó Resumen versión 2, persistido
  tras recarga completa. Las interceptaciones temporales se retiraron.
- La comprobación HTTP independiente de una opción distinta con versión antigua
  devolvió 409 en 3099 ms incluyendo lecturas posteriores, sin cambiar elección,
  razón, versión, fila ni recuento. El recibo idéntico sigue siendo idempotente.
- `ai-read` contrastó ambos diagnósticos, opciones, citas y elecciones con BD:
  persistencia, orden, 404 para otra cuenta, 409 con otro documento y 401 sin
  sesión en GET/POST de análisis/recomendaciones; RLS oculta ambos registros
  ajenos. Los snapshots antes/después no cambiaron filas ni iniciaron IA.
  Ambas solicitudes siguen **pending/choosing**, sin aprobación ni contenido
  de refuerzo generado. El escaneado insuficiente continúa correctamente
  rechazado sin diagnóstico. No se fabricaron estados generada/aprobada.
- Se repitieron las huellas SHA-256 después de las llamadas de IA: ambos PDF
  coinciden con sus originales y con las huellas del apartado anterior.
  La consola de la pestaña final recargada no mostró errores nuevos.
- Verificación final: **210/210 pruebas**, lint y build de producción con
  TypeScript correctos. Incluye la nueva regresión de filtrado y la migración
  exacta en PostgreSQL/PGlite. Las respuestas reales de IA descritas arriba
  se comprobaron aparte de las simulaciones automatizadas. Dependencias y Node
  se conservaron; el audit anterior sigue documentado sin nuevas instalaciones.

### Entrega y continuación

- **Finalizado en Jira:** HU018/SCRUM-30 y SCRUM-182; HU019/SCRUM-31 y
  SCRUM-95/183/96. SCRUM-93/94 ya estaban finalizadas y conservan sus evidencias.
- Se añadieron **10 capturas reales** a las cuatro subtareas, actualizando sus
  comentarios existentes 10115–10118. Se conservaron las tres imágenes previas
  de esas subtareas; la comprobación HTML confirma 5/2/2/4 imágenes respectivamente,
  sin duplicados. Las historias mantienen un único resumen sin duplicar imágenes.
  El acumulado de la entrega local es **42 capturas y 22 comentarios de resultados**.
- Las correcciones pertenecen a HU019 y permanecen en su rama; no se fusionó
  una historia posterior en una anterior. Los PR #22/#23 describen los resultados
  actuales y conservan sus bases y condición de borrador para revisión.
- Se mantiene el servidor en localhost:3000 y la configuración privada con
  `gemini-3.5-flash-lite`. No restablecer 3.8 por el texto de apartados antiguos.
  Los fixtures QA externos permiten continuar sin credenciales personales.
- Quedan fuera de este cierre HU017 y sus estados finales de historias futuras,
  y SCRUM-233 por el remitente SMTP. HU020 **no está iniciada** y este encargo
  no autoriza integrar PR ni modificar develop/main.

Referencias: [nivel gratuito de Gemini](https://ai.google.dev/gemini-api/docs/pricing),
[contrato REST estructurado](https://ai.google.dev/gemini-api/docs/generate-content/structured-output),
[modelo 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite),
[conflictos y reintentos de PostgREST](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions).

## Cierre del Sprint 3, 27/10/2026

### Alcance y estado comprobados en Jira

- El usuario pidió terminar el Sprint 3. Se consultaron el tablero 1, su
  configuración y el sprint **4, SCRUM Sprint 3**; no se confundió con el Sprint 4.
  Su alcance real son **HU010–HU016, SCRUM-22 a SCRUM-28**. Las siete historias
  y sus **25 subtareas**, incluida SCRUM-144, están Finalizado y sin casillas
  pendientes en sus descripciones. La última columna del tablero corresponde
  a ese estado. Las métricas anteriores al cierre mostraron 7/7 y 100 %.
- Se auditó un único comentario de resultados por cada subtarea: **80 capturas
  previas**, sin nombres duplicados dentro de los comentarios. Se conservaron
  esos comentarios e imágenes y se añadieron dos capturas auténticas a
  SCRUM-180 y SCRUM-144; sus comentarios 10108 y 10087 contienen ahora dos y
  tres imágenes respectivamente. **Total del Sprint 3: 82 capturas**. Se
  actualizaron también los resultados de SCRUM-173/174/80 y los resúmenes madre,
  sin duplicar imágenes ni crear informes adicionales.
- Jira confirmó el cierre y una lectura independiente verificó `state=closed`,
  con `completeDate=2026-10-27T22:13:41.337Z` (17:13 en Colombia). Se conservaron
  el objetivo y las fechas originales; no se inició el Sprint 4.

### Correcciones surgidas en la revisión final

- Se revisaron en orden los cambios de HU014/HU015/HU016 y sus evidencias.
  Los conflictos deterministas de versión aún usaban SQLSTATE `40001` en
  creación de solicitudes, reemplazo y comienzo de eliminación. Se aplicó la
  solución documentada por Supabase, ya validada en HU019: usar **PT409** sin
  alterar la autorización ni presentar el conflicto como éxito. No se afirma
  una versión remota de PostgREST que no se consultó.
- **SCRUM-180, `d57a6b6`:** dos códigos en
  `private.create_verified_reinforcement_request`, mapeo HTTP compatible con
  PT409 y el código anterior, pruebas de rechazo tardío/borrador/idempotencia.
  El archivo de creación de HU016 se reconcilió en su propia rama como
  `20261026211919_create_reinforcement_requests.sql`, igual al historial remoto.
- **SCRUM-173/174, `35a2abf`:** tres códigos en `replace_project_pdf` y
  `begin_project_deletion`; mapeo 409 y reconocimiento de rollback PT409 para
  limpiar solamente un archivo temporal de reemplazo. Una conexión ambigua
  sigue sin autorizar esa limpieza. Se añadió la regresión SQL reproducible
  con PGlite; sus entradas package/lock coinciden con las ya usadas en HU016.
- Migraciones forward aplicadas **una sola vez**, después de conciliar historial
  y comparar con las funciones remotas:
  `20261027205032_fix_request_conflict_codes.sql` y
  `20261027205336_fix_document_conflict_codes.sql`. El historial remoto contiene
  ahora nueve entradas. La comparación posterior confirmó exactamente cinco
  códigos sustituidos en tres funciones, sin otros cambios de cuerpos, firmas,
  ACL o search_path. PostgreSQL/PGlite comprueba también políticas y RLS;
  los avisos de seguridad remotos permanecen iguales al ignorar su fecha de lectura.
  No hubo db push, repetición de migraciones anteriores ni cambios de secretos.

### Regresión real de aplicación, API y datos

- Se usó únicamente el proyecto descartable **QA-SPRINT3-cierre-descartable**,
  `f334284a-ff06-4fcb-a026-984b18ded6f4`, propiedad de la cuenta QA ya existente.
  Se cargó un PDF sintético, se creó una solicitud y se retuvo en memoria una
  prueba firmada válida del PDF verificado. Después se reemplazó mediante la
  aplicación. Enviar la prueba anterior al RPC real devolvió **HTTP 409/PT409
  en 241 ms**, sin insertar. No se imprimieron ni persistieron esa firma o secreto.
- La solicitud original permaneció asociada a la versión anterior. Se creó una
  solicitud válida de la nueva versión, `4eec8815-dd20-4aa0-9fad-1b20b97320b3`;
  reintentar devolvió el mismo ID. Existían dos solicitudes y dos eventos, pero
  el listado de la versión vigente mostró solo una. Se abrió su recibo real en
  el navegador; la captura de SCRUM-180 muestra ese resultado, no una alerta
  inventada de la llamada RPC. La presentación del conflicto y conservación del
  borrador se verifican adicionalmente en la prueba de API/controlador.
- La confirmación antigua de eliminación devolvió **HTTP 409 en 578 ms** y
  exigió reconfirmar. El RPC real de reemplazo con versión anterior devolvió
  **409 en 471 ms**. El snapshot de proyecto, documentos, versiones, solicitudes
  y trabajos de limpieza quedó idéntico; no se creó ninguna limpieza y el PDF
  vigente siguió respondiendo 200. Una llamada inicial agotó su tiempo de espera;
  se comprobó ausencia de cambios y, tras restablecer el acceso, el caso pasó.
- La eliminación confirmada de la versión vigente terminó correctamente. API/SDK
  y **SQL independiente** confirmaron cero proyectos, documentos, solicitudes,
  eventos y objetos de Storage correspondientes al fixture: dos versiones,
  dos solicitudes y dos eventos eliminados. PDF y listado privado devolvieron
  404. La página recargada mostró **Documento no disponible**, con captura real
  nueva en SCRUM-144. No se tocaron proyectos personales ni los fixtures de IA.
- Pruebas dirigidas: 22/22 en HU016 y 27/27 en la corrección de documentos.
  Verificación final acumulada: **219/219**, lint y build de producción con
  TypeScript correctos. No se hicieron llamadas adicionales de IA; se conserva
  Gemini 3.5 Flash-Lite, sin pagos ni fallback de proveedor. Se reutilizó el
  servidor de localhost:3000.

### Git, revisión e instrucciones para continuar

- La corrección de HU011 tiene rama propia desde develop,
  `codex/sprint3-conflictos-documentos`, y
  [PR #24](https://github.com/Danilo2334/PDF_Interactivo/pull/24), en borrador.
  Se propagó a HU014 → HU015 → HU016 → HU017 → HU018 → HU019. La corrección
  de HU016 se propagó solamente a sus descendientes, sin reescribir historial.
  El conflicto de merge en la prueba PostgreSQL de HU018 se resolvió conservando
  tanto pgcrypto como las regresiones nuevas; la suite completa lo verificó.
- **Orden preparado: #24 → #18 → #19 → #20 → #21 → #22 → #23.** El PR #24
  apunta a develop; #18 tiene base provisional en la rama de #24, y el resto
  conserva la cadena. Después de integrar un predecesor con autorización,
  cambiar la base del siguiente a develop y revisar su diff/checks de nuevo.
  Los PR conservan borrador y no se integraron. La entrega del sprint está
  validada en la rama acumulada, no desplegada mediante un merge a develop.
- develop permanece en `99e7c082c6ae2a69fd2f3d68ec57f5bc85099989`; main no cambió.
  El checkout principal continúa en HU019. Se conserva sin aplicar/eliminar el
  stash `d6406e0cdbc464c1c0301c058024b10dd27c4515` y la configuración privada.
- HU017 y los estados finales de generación/aprobación siguen pendientes del
  Sprint 4; el bloqueo SMTP de SCRUM-233 pertenece a autenticación y no se
  declara resuelto. **HU020 no se inició.** El cierre de Sprint 3 no modifica
  esos estados ni autoriza pagos, merges de PR o cambios en main.
