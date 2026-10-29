# Continuidad de PDF_Interactivo

Actualizado: 27/10/2026. Mantener este único documento al continuar.

La entrega más reciente está en el último apartado
«Detalle visible de solicitudes durante la revisión manual, 27/10/2026».
Los estados de los apartados anteriores describen su momento cronológico.

**Sprint 3 cerrado en Jira:** siete historias y 25 subtareas finalizadas,
82 capturas conservadas, 221/221 pruebas, lint y build correctos. Los PR
#24 y #18–#23 están integrados en develop; main no cambió.

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

## Integración revisada de PR #24 y HU014–HU019, 27/10/2026

El usuario autorizó revisar e integrar #24 y continuar los demás PR en el orden
acordado. Esta autorización actualiza la restricción de integración de los
apartados anteriores; esos apartados conservan su carácter cronológico.

### Resultado de GitHub y checkout local

Se integraron con merge commit, conservando ramas e historial. Después de cada
predecesor se cambió la base del siguiente a develop y se revisó su diff. Cada
merge quedó limitado al SHA de la cabeza revisada mediante `expected_head_sha`.
La lectura final de GitHub confirmó los siete PR integrados y con base develop:

| PR | Alcance | Commit de integración |
| --- | --- | --- |
| [#24](https://github.com/Danilo2334/PDF_Interactivo/pull/24) | Conflictos de reemplazo/eliminación | `7bbaaec06473a79c48936b2d210f432395202920` |
| [#18](https://github.com/Danilo2334/PDF_Interactivo/pull/18) | HU014, dificultad | `ae3dfe441f502b73d286582bef154b043fdb3e55` |
| [#19](https://github.com/Danilo2334/PDF_Interactivo/pull/19) | HU015, extracción | `cec9ddbfd5aacbec659eaf32f561dd487f306264` |
| [#20](https://github.com/Danilo2334/PDF_Interactivo/pull/20) | HU016, solicitud | `c468a0f94bd0dfff38aff30d3b92cf969e53910f` |
| [#21](https://github.com/Danilo2334/PDF_Interactivo/pull/21) | HU017, listado/estado/historial | `30f19514a5cf8c7d2192ec2e4ad92689f8ee3d21` |
| [#22](https://github.com/Danilo2334/PDF_Interactivo/pull/22) | HU018, análisis contextual | `6cfceef8f83ed1d7decf59d976d8bc79d474ad82` |
| [#23](https://github.com/Danilo2334/PDF_Interactivo/pull/23) | HU019, recomendaciones y elección | `791cf22fdd0587a154fcba98c86b3f069d93d8f2` |

No había revisiones ni conversaciones pendientes en los PR consultados. Los
commits consultados no tenían statuses o ejecuciones de Actions registradas;
la verificación utilizada es la local y real descrita aquí. No se declara una
ejecución de CI que no existió.

El árbol de `791cf22` coincide exactamente con
`883373f5ef00d82ed5042a67d2c5bf40c0b14751`, donde se ejecutaron las verificaciones
finales. El checkout principal quedó en **develop**, actualizado por fast-forward.
Next regeneró su encabezado de AGENTS mientras se pasaba por develop antiguo:
se comprobó que su hash era idéntico al archivo remoto revisado, se conservó una
copia externa y se alineó el índice para completar el fast-forward sin perder
instrucciones. El checkout temporal de revisión ya se retiró, conservando su rama
publicada. No se borraron ramas, no hubo force push ni se alteró el stash.

### Corrección necesaria antes de integrar HU018

- Se detectaron cuatro conflictos deterministas que todavía usaban `40001` en
  `private.change_verified_reinforcement_analysis`: versión, etapa, intento no
  vigente y lease vencido. Se aplicó la misma solución documentada por Supabase
  que en las revisiones previas: **PT409**, con mapeo HTTP 409 compatible con el
  código anterior. No se atribuyó una versión remota no comprobada de PostgREST.
- Commit **`f8d4bf02a012a276c9a936a9db1c0f5a9e7de74f`**, SCRUM-182, en HU018 y
  propagado a HU019 antes de integrar ambos PR. La migración forward
  **`20261027223449_fix_analysis_conflict_codes.sql`** se creó con CLI y se aplicó
  una vez. El historial remoto tiene ahora diez entradas. No repetir las
  migraciones anteriores ni ejecutar db push.
- Se comparó la función antes y después: solo cambian cuatro códigos;
  firma, cuerpo restante, ACL y search_path se conservan. Las pruebas
  PostgreSQL comparan también metadatos, RLS y políticas. La comparación de
  fuente normaliza únicamente CRLF/LF de Windows. Los avisos remotos de
  seguridad permanecieron iguales al ignorar su fecha de observación.
- **20/20 pruebas dirigidas de API/PostgreSQL aprobadas**: conflicto al finalizar
  no se presenta como diagnóstico guardado ni repite el proveedor; intentos
  obsoletos/expirados, cambios de documento y etapas no elegibles se rechazan,
  conservando los controles de firma, propiedad, cuotas e idempotencia.
- Regresión autenticada contra el RPC real sobre la solicitud QA de energía:
  documento distinto → **409/PT409 en 245 ms**; intento no vigente →
  **409/PT409 en 592 ms**. Se usaron entradas negativas, sin fabricar estados
  de generación/aprobación. El snapshot de solicitud, diagnóstico, eventos y
  recomendaciones permaneció idéntico. Las firmas solo existieron en memoria;
  no se imprimieron, almacenaron ni versionaron.

### Verificación, Jira y siguiente revisión

- **221/221 pruebas, lint y build de producción con TypeScript correctos**.
  La comprobación HTTP/SDK `ai-read` confirmó ambos diagnósticos reales de
  Gemini 3.5 Flash-Lite, citas y elecciones guardadas, aislamiento entre páginas
  y cuentas, rechazos 401/404/409 sin mutaciones y **24 solicitudes intactas**.
  Las solicitudes siguen pending/choosing, sin contenido generado ni aprobado.
  No se hicieron nuevas llamadas a IA ni se activaron pagos.
- Se actualizaron los comentarios existentes de las historias SCRUM-23/26/27/28/
  29/30/31 con su PR y hash de integración, y el de SCRUM-182 con la corrección
  y sus pruebas. La lectura posterior confirmó **un comentario de resultados
  por incidencia**, sin imágenes duplicadas, conservando las cinco capturas de
  SCRUM-182 y las imágenes previas de las historias. Las **82 capturas de las
  25 subtareas del Sprint 3** siguen conservadas; no se duplicaron capturas para
  documentar una operación de Git.
- **Sprint 3 sigue cerrado**, con siete historias y 25 subtareas finalizadas,
  listo para la revisión del usuario. HU014/HU015/HU016/HU018/HU019 conservan
  Finalizado. **HU017/SCRUM-29 permanece En curso**: integrar listado, filtros y
  contrato de estados no acredita generación/aprobación funcionales de historias
  futuras. No se inició Sprint 4 ni HU020, ni se cerraron tareas por hacer merge.
- La configuración privada y el servidor de localhost:3000 se conservaron.
  `web/.env.local` sigue ignorado. El stash
  `d6406e0cdbc464c1c0301c058024b10dd27c4515` permanece sin aplicar/eliminar.
  main y origin/main siguen en `8a569e0a789c49d33c9fa812d7c601726b6a7848`;
  el PR #13 hacia main quedó fuera de este encargo. SCRUM-233 mantiene su
  pendiente de remitente SMTP; no se declara resuelto por esta integración.

El siguiente paso es la revisión del usuario sobre develop y sus evidencias.
No iniciar otra historia por el mero hecho de que los PR estén integrados.

## Detalle visible de solicitudes durante la revisión manual, 27/10/2026

El usuario confirmó navegación/zoom y selección/dificultad en la revisión guiada.
Creó desde la UI la solicitud `1201c3a3-1632-41b0-ae4f-0b989ba676cb`, página 1
del PDF digital QA, y después informó que «Ver solicitud e historial» no hacía
nada. El documento tiene ahora **25 solicitudes**, una más que la última
verificación automática; esa alta pertenece a la revisión del usuario.

### Hallazgo y corrección SCRUM-92

- Se reprodujo en el navegador: el detalle sí se obtenía, pero se dibujaba
  después de los 20 registros de la primera página. Su inicio estaba a
  **4196,7 px** de la parte superior visible, en una ventana de 715 px de alto.
  El usuario no recibía una indicación visible de que la selección había abierto
  el panel. La solicitud y sus datos estaban intactos.
- `request-list-panel.tsx` lleva el foco y la vista al encabezado de detalle
  al abrirlo, también si se vuelve a pulsar la solicitud ya seleccionada.
  Se reserva una altura de viewport durante la carga para que el encabezado
  pueda colocarse arriba antes de que llegue la respuesta. Las actualizaciones
  de datos no vuelven a tomar el foco. «Volver al listado» restaura foco y vista
  al encabezado de la lista, sin descartar la selección ni reiniciar el detalle.
- Se consultaron las guías locales instaladas de componentes cliente y
  accesibilidad de Next.js. No se modificaron API, permisos, datos o migraciones.

### Verificación real y entrega

- Carga inicial, apertura con clic y reapertura con Enter: encabezado enfocado
  a aproximadamente **16 px** de la parte superior. «Volver al listado» recuperó
  el encabezado de la lista. Se comprobó también apertura desde la segunda
  página y se dejó nuevamente visible la solicitud del usuario en la primera.
- «Actualizar detalle» y el polling conservaron el foco en el botón, sin
  devolverlo al encabezado. Se repitió la navegación con viewport móvil
  390×844; el detalle y los botones quedaron visibles, sin navegación horizontal.
  Después se restableció el tamaño de ventana del usuario.
- La solicitud `1201c3a3…` conserva texto, necesidad, página 1, estado
  pending/queued y su evento de creación. La corrección no creó solicitudes,
  analizó contenido ni llamó al proveedor de IA.
- **7/7 pruebas dirigidas del listado, lint y build/TypeScript aprobados**.
  La suite completa anterior de la integración permanece documentada como
  221/221; no se presenta como una ejecución nueva de esta corrección visual.
- Capturas reales: `92-05-detalle-fuera-de-vista-antes.jpg`,
  `92-06-detalle-visible-corregido.jpg` y
  `92-07-detalle-visible-teclado-movil.jpg`, para el comentario existente de
  SCRUM-92, conservando sus cuatro imágenes previas. La historia HU017 sigue
  En curso por sus estados funcionales futuros; este arreglo no cierra esa historia.
- Rama **`codex/scrum-92-detalle-visible`**, basada en develop `00f8bd2`;
  integración pendiente de revisión. Las ramas ya integradas, main, el stash
  `d6406e0` y la configuración privada se conservaron. No se inició HU020.

Al retomar scripts QA externos, reconciliar primero su baseline de 24 con las
25 solicitudes actuales y la nueva solicitud del usuario; no confundir ese
cambio de datos conocido con una duplicación del envío. La revisión guiada
continúa solo cuando el usuario confirme que ya ve el detalle.

## Revisión real de IA y autorización de HU020, 27/10/2026

Se continuó sobre la solicitud del usuario `1201c3a3-1632-41b0-ae4f-0b989ba676cb`:
selección «En un sistema aislado», página 1 del PDF digital QA y dificultad de
comprensión del concepto. Gemini `gemini-3.5-flash-lite` produjo un diagnóstico
coherente sobre conservación de energía y cinco recomendaciones pertinentes,
con citas literales y referencias a la dificultad verificadas. Cada operación
usó un intento real; no hubo proveedor de pago ni reintentos automáticos.

Se guardó Explicación (versión 1), con la justificación de la opción persistida,
y se recargó la aplicación: diagnóstico, opciones y elección permanecieron.
La solicitud quedó pending/choosing, con tres eventos reales, sin contenido
generado ni aprobado. El proyecto conserva 25 solicitudes. Los SHA-256 de ambos
PDF QA permanecen iguales a los registrados anteriormente.

Se añadieron tres capturas reales a los comentarios existentes, sin duplicarlos:
SCRUM-182 `182-07-analisis-real-solicitud-usuario.jpg`, SCRUM-95
`95-03-opciones-reales-solicitud-usuario.jpg` y SCRUM-96
`96-05-eleccion-usuario-persistida-tras-recarga.jpg`. La lectura posterior confirmó
un comentario por subtarea, con 6, 3 y 5 imágenes respectivamente, conservando
todas las anteriores. Se actualizaron también SCRUM-183 y las historias madre.

Después de esta comprobación, el usuario autorizó explícitamente **continuar con
HU020/SCRUM-32**. El alcance es explicación ampliada (niveles breve, intermedio y
detallado), vinculada al fragmento y marcada como generada por IA, pendiente de
aprobación. No incluye aprobación/publicación, otros formatos, pagos ni merges
automáticos. El PR #25 de visibilidad del detalle sigue pendiente de revisión;
HU020 partirá de esa corrección en una rama separada. Se conserva el stash
`d6406e0` sin aplicar/eliminar y la configuración privada fuera de Git.

## HU020 / SCRUM-32: explicación ampliada, 27/10/2026

El usuario autorizó HU020 después de verificar el diagnóstico y la elección de
su solicitud. Rama `codex/scrum-32-hu020-explicacion-ampliada`, basada en
`codex/scrum-92-detalle-visible` (`4084eee`), cuyo PR #25 continúa pendiente.
No se hizo merge ni se inició otra historia o el ciclo del Sprint 4.

### Implementación SCRUM-97 / SCRUM-184 / SCRUM-98

- El detalle de una solicitud incluye Explicación ampliada. Ofrece **Breve,
  Intermedio y Detallado**, con descripciones y sin selección inicial. El nivel
  se guarda en servidor antes de habilitar Generar. La versión del nivel y la
  versión de la elección impiden sobrescrituras desde una pestaña antigua.
- La ruta privada `/api/projects/[projectId]/reinforcement-requests/[requestId]/explanation`
  reutiliza autorización, origen, tamaño de JSON y diagnóstico persistido.
  Solo acepta la elección Explicación vigente y un análisis suficiente. El
  servidor envía selección, contexto de su página, dificultad y nivel a Gemini.
  Usa la configuración existente `GEMINI_ANALYSIS_MODEL=gemini-3.5-flash-lite`;
  no se añadió una clave pública, otro proveedor, pago o reintento automático.
- Se reutiliza el adaptador Gemini existente: una llamada acotada a 45 segundos,
  salida estructurada, validación de longitud por nivel, tema, concepto y cita
  del fragmento. Los errores de cuota, rechazo, respuesta inválida y timeout
  son mensajes controlados. El texto se representa escapado, sin ejecutar HTML.
- Migración forward **`20261028002100_generate_explanation_drafts.sql`**, creada
  primero con CLI y aplicada una vez al proyecto Supabase existente. El timestamp
  local se alineó con el registrado por MCP. Hay ahora **11 migraciones remotas**;
  no repetirlas ni ejecutar db push. No se alteraron secretos ni migraciones previas.
- `reinforcement_generations` conserva nivel, versión, intento y resultado privado;
  `reinforcement_generation_runs` permite limitar concurrencia (2) y frecuencia
  (10 intentos/5 minutos por cuenta). RLS y permisos de solo lectura para el dueño;
  las escrituras pasan por una transacción firmada con el secreto existente,
  caducidad y dominio propios. Wrapper público SECURITY INVOKER, implementación
  privada con search_path vacío, propiedad y documento actual comprobados bajo
  locks. Los conflictos deterministas usan PT409.
- Un lease de 120 segundos evita llamadas paralelas duplicadas; un resultado
  completado se devuelve desde caché y uno tardío no sobrescribe otro intento.
  La generación registra processing/generating y generated/review de forma real.
  El resultado tiene **approval_status=pending**, sin approved_by/approved_at.
  No hay endpoint de aprobación/publicación: **no se inserta en reinforcements**.
  HU024 deberá implementar la decisión explícita correspondiente.

### Comprobación real y límites de lo probado

- Se guardaron los tres niveles desde la UI (versiones 1, 2 y 3); no consumieron
  IA. Se recargó y se comprobó Detallado antes de generar con Enter. La solicitud
  `1201c3a3-1632-41b0-ae4f-0b989ba676cb` produjo una explicación real de **764
  caracteres**, Gemini 3.5 Flash-Lite, **un intento**, sobre conservación de energía
  en un sistema aislado, transformaciones potencial/cinética y péndulo sin rozamiento.
  Se revisaron pertinencia, claridad y cita literal «En un sistema aislado».
  La generación real de esta validación fue Detallado; los límites de los otros
  niveles se comprobaron automáticamente, sin presentarlos como llamadas reales.
- Una actualización de herramientas reinició el navegador y cerró el servidor.
  El resultado ya estaba guardado. Se reinició únicamente Next del proyecto,
  se recuperó el acceso local y se inició sesión con la cuenta QA desechable,
  sin intervención ni credenciales personales. El diagnóstico, elección y
  explicación reaparecieron tras el reinicio: no se volvió a llamar al proveedor.
- Verificación HTTP/SDK autenticada: misma explicación en reenvíos simultáneos,
  409 para nivel/elección/documento obsoletos, 409 para contexto insuficiente,
  401 sin sesión, 403 desde origen ajeno, 404 y RLS vacío para otra cuenta.
  Las actualizaciones directas de aprobación se rechazaron. Snapshot completo
  antes/después idéntico: **25 solicitudes, un intento, cinco eventos reales,
  cero refuerzos publicados**. No se fabricaron estados mediante SQL remoto.
- Escritorio, cierre/reapertura de sección, recarga, reinicio, teclado y emulación
  móvil 390×844 comprobados. El control general de viewport no cambió el ancho
  efectivo de esta pestaña; se verificó con CDP por pestaña (ancho de documento y
  contenido: 390 px), se capturó la pantalla real y se retiró la emulación.
  Cero errores de consola observados en la sesión recuperada. La pestaña Refuerzos
  sigue vacía y el original conserva SHA-256
  `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`.
- **237/237 pruebas automatizadas aprobadas**, incluyendo API, proveedor, UI y
  PostgreSQL aislado (8 comprobaciones de generación). Lint correcto. El build
  inicial de Turbopack/TypeScript aprobó con el código de HU020; después del
  reinicio un build restringido falló al descargar Geist y los reintentos con
  red fallaron al conectar con el proceso auxiliar de CSS (salida 0, sin cuerpo
  de error). No se ocultó con respuestas ficticias ni se actualizaron dependencias.
  **Build final de producción con Webpack y TypeScript correcto** mediante
  `npm.cmd --prefix web run build -- --webpack`, opción documentada por Next.
  El script habitual conserva Turbopack; su fallo posterior de proceso auxiliar
  queda pendiente de diagnóstico del entorno y no se declara corregido.
- Los avisos de seguridad Supabase conservan el baseline: secreto privado con
  RLS sin políticas, handle_new_user accesible a anon, ocho funciones definer
  autenticadas anteriores y protección de contraseñas filtradas desactivada.
  Las dos tablas nuevas tienen RLS, el wrapper es invoker y no se añadió un aviso.

Las capturas se registran en las subtareas con un comentario de resultados por
incidencia, conservando las evidencias anteriores de HU018/HU019 y del Sprint 3.
Los scripts QA externos antiguos de 24 solicitudes ya no son el baseline actual;
`HU019/hu020-live.mjs` comprueba explícitamente las 25 y el ID de la revisión.
No se versionaron scripts privados, capturas, .env.local o credenciales. Se
conservan main, develop, el stash `d6406e0` y todas las ramas anteriores.

### Entrega de HU020

- Commit funcional **`0585894f6c1af0c448950de4df2a28b30396e029`**, publicado.
  PR borrador **[#26](https://github.com/Danilo2334/PDF_Interactivo/pull/26)**,
  base `codex/scrum-92-detalle-visible` (PR #25), sin merge. Revisar primero #25
  cuando se autorice, cambiar después la base de #26 a develop y volver a revisar
  el diff. No integrar automáticamente por el hecho de que pasen las pruebas.
- **SCRUM-97, SCRUM-184 y SCRUM-98 Finalizado** por sus criterios funcionales
  verificados. **SCRUM-32 En revisión**: entrega preparada, PR pendiente y fallo
  posterior de Turbopack explícitamente abierto. El build final alternativo de
  producción y TypeScript con Webpack pasó; no se cambió el script habitual.
- Jira conserva un único comentario de resultados por incidencia: **10125** en
  SCRUM-97 (3 capturas), **10126** en SCRUM-184 (2), **10127** en SCRUM-98 (2).
  La lectura posterior confirmó las siete imágenes inline, sin nombres duplicados.
  Comentario madre **10128** con alcance, validación, limitación y enlace del PR,
  sin duplicar imágenes. Los grants temporales de carga se retiraron después
  de subir los archivos; no se imprimieron ni versionaron.
- HU020 está lista para revisión funcional de la explicación guardada. No se
  implementó HU021 ni aprobación/publicación HU024; HU017 conserva su pendiente
  de aprobación real y Sprint 3 permanece cerrado con sus evidencias anteriores.

## Revisión autorizada de PR #25/#26 y Turbopack, 27/10/2026

El usuario autorizó resolver el build, revisar e integrar #25 → #26 a develop y
continuar con HU021. Se reprodujo la salida prematura del proceso auxiliar
PostCSS/CSS de Turbopack. Se consultaron las guías locales de Next 16.4.3 y
https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackPluginRuntimeStrategy.
En Windows se utiliza `experimental.turbopackPluginRuntimeStrategy=workerThreads`;
otras plataformas conservan el valor predeterminado. No se sustituyó Turbopack,
no se actualizaron paquetes ni Node (22.23.3) y no se usó forceWorkerThreads.
La opción es experimental; Next conserva su fallback de compatibilidad en
versiones Node afectadas, por lo que no se afirma una validación en otros Node/SO.
El build habitual de Turbopack y TypeScript pasó dos veces (primera compilación
9,3 s; siguiente 2,8 s). El dev anterior se reinició con esta configuración.

La revisión de #26 detectó que JavaScript aceptaba citas/temas normalizados que
la transacción exige literales: se alineó la validación antes de persistir y se
añadieron casos de diferencias Unicode/espacios. Se evita que una salida inválida
deje la generación pendiente hasta vencer el lease. Suite 237/237 y lint correctos;
regresión HTTP/SDK real aprobada, mismo intento y SHA-256, sin llamadas nuevas a IA.
No hay threads de revisión, statuses ni workflows registrados en los heads
consultados: estos resultados son locales y reales, no CI remoto inventado.

### Integración completada y continuación HU021, 27/10/2026

- Corrección de Turbopack publicada en `694306b16f473258ec4ef00d72c3930cc3b3b77a`.
  PR #25 revisado e integrado primero: merge
  `97980e9f5c38e079fad0b24146bd88ca9cdc4b51`. Después se cambió la base de #26
  a develop, se revisaron su diff restante y comprobaciones y se integró:
  `757f88b7ff4717d8504d72c384c5ec131aadc5cf`. develop local/remoto quedaron
  en ese segundo merge. main y PR #13 permanecen sin cambios.
- SCRUM-32 Finalizado. Se actualizaron sus resultados y los comentarios únicos
  10112/SCRUM-92 y 10126/SCRUM-184, conservando sus 7 y 2 capturas anteriores
  y añadiendo una regresión real a cada uno: lectura posterior confirma 8 y 3
  nombres únicos respectivamente. No se borraron evidencias del Sprint 3.

## HU021 / SCRUM-33: ejemplo o analogía y revisión del propietario, 27/10/2026

Rama `codex/scrum-33-hu021-ejemplos-analogias`, creada desde develop `757f88b`.
Se leyeron historia y subtareas SCRUM-99, SCRUM-185 y SCRUM-100. Esta última
exige reutilizar edición/versionado/aprobación de HU024, que aún no existían:
se añadió la base compartida mínima para HU021. No se implementó regeneración
ni se declara completada HU024; HU022 y las historias siguientes no se iniciaron.

### Implementación

- Dos modalidades explícitas, Ejemplo práctico y Analogía, sin premarcar.
  Guardar modalidad/versiones es obligatorio antes de generar. La IA recibe
  diagnóstico suficiente, selección, texto cercano, necesidad y modalidad del
  servidor; no acepta contexto ni resultados arbitrarios desde el navegador.
- Gemini nativo usa la configuración privada existente `GEMINI_API_KEY` y
  `GEMINI_ANALYSIS_MODEL=gemini-3.5-flash-lite`. Una llamada por acción, timeout
  de 45 s, errores seguros, sin reintento automático ni proveedor de pago.
  Cita literal y tema exacto restringidos también en el esquema; concepto
  requerido y ortografía explícitos. Salidas incompletas, contradictorias según
  contrato, sin cita o sin concepto se rechazan; esto no sustituye la revisión
  semántica del propietario. No se promete ausencia universal de errores de IA.
- Generación firmada con el secreto existente, lease/attempt/versiones y límites
  por cuenta; reclamaciones duplicadas recuperan el intento sin consumir IA.
  Tablas nuevas privadas por RLS y sin escritura directa del usuario.
- Versiones inmutables, operaciones idempotentes, edición de título/texto,
  confirmación explícita antes de aprobar y descarte confirmado. Una edición
  posterior a la aprobación queda pendiente y conserva el refuerzo aprobado
  anterior. Solo la transacción del propietario publica una versión en
  `reinforcements`, siempre fuera del PDF. Historial registra autor/fecha/acción.
- Las actualizaciones del mismo detalle/ejemplo conservan montado el editor;
  URL distinta o error de acceso no reutilizan datos anteriores. Una pestaña
  antigua conserva su texto local y bloquea guardar/aprobar hasta cargar la
  versión actual. Guardar en la propia pestaña sincroniza la versión recibida.
- Migraciones creadas con CLI, aplicadas una sola vez mediante MCP y conciliadas
  con los timestamps remotos: `20261028031755_generate_example_drafts.sql` y
  `20261028032600_index_review_head_current_version.sql`. No hubo db push,
  reaplicación de migraciones anteriores, cambios al secreto ni RLS desactivado.
  El índice adicional elimina el aviso nuevo de FK compuesta sin índice. Los
  avisos de seguridad conservan el baseline anterior; los ocho avisos de
  evaluación RLS por fila pertenecen a documentos/proyectos previos.

### Pruebas reales y resultados observados

Se usaron las cuentas QA ya existentes y el PDF digital de prueba. No se alteró
la solicitud personal `1201c3a3-1632-41b0-ae4f-0b989ba676cb`: conserva su texto,
necesidad, explicación y estado generated/review. Baseline actual: **27**
solicitudes, las 25 anteriores más dos dedicadas a HU021:

- Práctico `d26e29e7-2de6-4838-9184-89186daf9a6f`.
- Analogía `806915fa-1acc-4701-99a7-7b5e2f5b9f43`.

Ambas seleccionan las dos líneas del péndulo en página 1. Análisis y
recomendaciones se obtuvieron por el flujo real; Ejemplo estaba realmente
ofrecido. No se insertaron diagnósticos, opciones ni estados mediante SQL.
Se guardaron ambas modalidades y Analogía sobrevivió recarga/reapertura.

Cada modalidad terminó con generación ready en su tercer intento. Los dos
intentos previos de cada una quedaron como errores reales, sin contenido:
el diagnóstico acotado reprodujo cita alterada y concepto sin tildes. Se reforzó
el contrato de salida y el prompt sin relajar la validación. También hubo un
reintento de recomendaciones del práctico por salida inválida. Las llamadas de
diagnóstico externas con el mismo texto QA no se presentan como generaciones
persistidas. Todo se ejecutó con la clave/modelo existente y sin activar pagos.

El ejemplo explica altura, velocidad, transformación y suma constante sin
rozamiento. En revisión se añadió la referencia de energía potencial cero.
La analogía relaciona dos reservas de monedas con ambas formas de energía; la
redacción inicial de «gastar» resultaba ambigua para un total constante y se
reescribió como traslado entre recipientes, aclarando la disipación al entorno.
No se aprobó esa analogía automáticamente por tener JSON válido.

Flujo real de revisión:

- Práctico: v1 IA, v2 aclaración física, v3 título QA aprobado explícitamente;
  se publicó **un** refuerzo, versión aprobada
  `7f5f5789-029f-48cf-a940-6f5e77b71b6a`. Nueva v4 quedó pendiente sin sustituir
  v3; al descartarla se conservó v3 publicada y la solicitud approved/approved.
- Analogía: v1 IA, v2 edición del propietario y descarte confirmado sin publicar.
  Solicitud generated/discarded, historial y ambas versiones conservados.
- Dos pestañas: título local «BORRADOR LOCAL QA: conservar ante actualización»
  permaneció tras actualizar; versión antigua deshabilitada y POST obsoleto 409.
  Sesión ausente 401, origen ajeno 403, otra cuenta 404/RLS, documento distinto
  409, publicación directa denegada y aprobar un descarte 409. Contexto
  insuficiente del PDF escaneado 409, sin llamar al proveedor.
- Escritorio, radios/checkbox/teclado, recarga y móvil 390×844 comprobados.
  Ancho cliente/contenido 390/390; emulación retirada. Cero errores de consola
  en la sesión observada. Capturas inspeccionadas antes de subir: una captura
  inicial vacía se reemplazó por píxeles reales, nunca se utilizó como evidencia.
- PDF original conserva SHA-256
  `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`.

**257/257 pruebas automatizadas** aprobadas. Diez comprobaciones PostgreSQL
aisladas cubren firmas, propiedad, idempotencia, edición, aprobación, descarte,
versión publicada preservada, lease/reintento y eliminación en cascada del
proyecto. API/proveedor/UI vuelven a pasar tras los ajustes finales. Lint y build
habitual Turbopack/TypeScript correctos, sin Webpack. El build final se ejecutó
con dev detenido y después se reinició localhost:3000; ejecutar build junto a
dev había provocado un ciclo de recarga del entorno. No se actualizaron Node
o dependencias. La configuración experimental de Windows mantiene la limitación
de compatibilidad de Node documentada en la revisión anterior.

### Jira y continuidad de HU021

- SCRUM-99: comentario único **10129**, una captura real.
- SCRUM-185: comentario único **10130**, dos capturas reales.
- SCRUM-100: comentario único **10131**, tres capturas reales.
- Las tres subtareas Finalizado por los criterios comprobados. La lectura
  posterior confirmó 1/2/3 imágenes sin nombres repetidos. HU021 queda para
  revisión/integración de su PR; no se autoriza su merge en este encargo.
- Scripts, cuentas, capturas y resultados QA permanecen fuera del repositorio en
  `HU019/HU021`; los grants temporales de carga se retiraron. No se versionaron
  .env.local ni credenciales. Los scripts antiguos que exigen 24/25 solicitudes
  o cero refuerzos ya no representan el baseline: `hu021-live.mjs` valida 27,
  un publicado y descartes reales. El stash `d6406e0` permanece intacto.

### Entrega de HU021

Commit funcional publicado **`e8434fcf6b56b3d3f5cd0904535b15e43fd941bf`**.
PR borrador **[#27](https://github.com/Danilo2334/PDF_Interactivo/pull/27)**
directamente contra develop, después de #25/#26 integrados. **SCRUM-33 En revisión**,
comentario madre único **10132** con enlace y resultados; SCRUM-99, SCRUM-185 y
SCRUM-100 Finalizado. Sus comentarios 10129/10130/10131 incluyen el PR y mantienen
las seis capturas sin volver a subirlas. No hay merge de #27 ni avance a HU022.
localhost:3000 se dejó arrancado con el código revisado y la pestaña de Refuerzos
QA conserva la versión aprobada; no se requiere entregar credenciales por chat.

## Revisión e integración de PR #27, 27/10/2026

El nuevo encargo autoriza revisar e integrar HU021 y continuar con HU022.
Se revisaron código, SQL, permisos y diff de #27, head
`997868ce36d4dbdb2bcad512303e82918304b528`, contra develop `757f88b`.
No se encontraron impedimentos de integración. Se repitieron las **257/257**
pruebas y `hu021-live.mjs final`: 27 solicitudes, un refuerzo publicado v3,
v4 descartada, analogía descartada, solicitud personal intacta y mismo SHA-256.
No había checks/workflows de CI publicados ni hilos de revisión pendientes;
la validación local no se presenta como CI remoto.

PR [#27](https://github.com/Danilo2334/PDF_Interactivo/pull/27) integrado con merge
`36be0e96adbeac26e85b22123bde295ff984e8ce`, comprobando el head esperado.
Develop local se actualizó por fast-forward y HU022 parte de ese merge.
SCRUM-33 Finalizado; comentario madre 10132 actualizado. Se conservaron las
seis capturas y comentarios 10129/10130/10131 de sus subtareas. Main y PR #13
permanecen fuera del alcance.

## HU022 / SCRUM-34: imagen o diagrama, 27/10/2026

Rama `codex/scrum-34-hu022-imagen-diagrama`, desde develop `36be0e9`.
Se leyeron historia y subtareas SCRUM-101, SCRUM-186 y SCRUM-102. Se continúa
el código existente de HU018–HU021. No se inicia HU023 ni se declara completada
HU024: se amplían sus primitivas compartidas solo para la revisión de HU022.

### Implementación y límites

- Imagen (ilustración vectorial) o Diagrama, sin premarcar; guardar tipo y
  versión es obligatorio antes de generar. La descripción visual se prepara
  en servidor con selección persistida, tema y dificultad del propietario.
- Gemini existente `gemini-3.5-flash-lite` genera una composición estructurada
  con nodos, símbolos y relaciones. El cliente dibuja el SVG a partir de esa
  composición validada; no acepta SVG/HTML ejecutable, URLs ni imágenes remotas
  del proveedor. Esto genera ilustraciones vectoriales y diagramas, no imágenes
  fotográficas de un modelo de generación de bitmap. No se instalaron SDKs ni
  se activaron facturación, proveedores alternativos o servicios de pago.
- Se mantienen clave/modelo exclusivamente en servidor, firma con el secreto
  existente, contexto de página, cita literal, tema exacto, propiedad y cuenta
  activa. Una llamada por acción, timeout 45 s, errores seguros de salida,
  rechazo, timeout y cuota; sin reintentos automáticos ilimitados.
- Tablas visuales e intentos con RLS, sin escritura directa de usuarios.
  Lease, versiones, bloqueo de duplicados y límites por cuenta. Una respuesta
  tardía o un documento sustituido no puede publicar ni sobrescribir una versión.
- Generar o solicitar otro resultado conserva una versión pendiente inmutable.
  La aprobación explícita publica una única versión canónica fuera del PDF.
  Se puede descartar o regenerar con indicaciones de hasta 500 caracteres.
  La versión aprobada anterior sigue publicada durante la nueva revisión y
  también si el nuevo borrador se descarta. Autor, fecha y decisiones se guardan.
- Título, descripción accesible, detalle textual de nodos/relaciones y origen
  visibles. Se corrigieron etiquetas de flechas ocultas tras los nodos. La
  ampliación permite desplazar el gráfico con teclado o táctil en móvil.
- La prueba real detectó revisión duplicada porque el panel de Ejemplo mostraba
  un head visual compartido. Ambos paneles ahora comprueban el formato elegido;
  regresión automatizada y prueba real confirman una sola revisión. La
  confirmación de descarte queda vinculada a la versión y se limpia al cargar
  otra, evitando reutilizar una confirmación anterior.
- Migración `20261028035709_generate_visual_drafts.sql` aplicada una sola vez
  mediante MCP y conciliada con su timestamp remoto. No se hizo db push ni se
  reaplicaron migraciones anteriores. Se conservaron secretos, permisos y RLS.
  Los advisors posteriores mantienen los avisos previos de seguridad y los
  ocho avisos de evaluación RLS por fila, sin nuevos avisos de FK sin índice.

### Pruebas reales y resultados

Se reutilizaron las dos cuentas QA y el PDF digital. El baseline queda en
**29 solicitudes y tres refuerzos publicados**: las 27 anteriores y estas dos
solicitudes nuevas, creadas por API autenticada con análisis y recomendaciones
reales. No se fabricaron diagnósticos, recomendaciones, estados ni resultados
mediante SQL. El proveedor ofreció Imagen en ambos casos antes de elegirla.

- Diagrama `163a3097-633b-4159-98ef-db7bcd1873c5`, página 1, selección de las dos
  líneas del péndulo. Tipo Diagrama guardado en la interfaz. V1 IA se revisó y
  descartó sin publicar. Se solicitó otra con indicaciones de etiquetas claras
  y suma constante: v2 generada, revisada y aprobada explícitamente con teclado.
  Su título es «Conservación de la Energía en el Péndulo Ideal»; distingue
  potencial, cinética y suma invariable. La descripción y los detalles aclaran
  posiciones de máxima energía y ausencia de rozamiento.
- Imagen `793b12bc-64b3-4d58-88bb-f3c869d43c61`, página 2, selección sobre
  evaporación y condensación. Tipo Imagen y descripción persistieron tras
  recarga/reapertura. V1 «El ciclo del agua: Evaporación y Condensación» muestra
  sol, evaporación y condensación con descripción del calor y enfriamiento.
  Se aprobó explícitamente la versión `47196fb3-7b16-4192-94a6-8c04d5ca0d03`.
  Otra generación con indicaciones creó v2 pendiente; v1 siguió publicada.
  Descartar v2 conservó v1 y el estado approved/approved.
- Cada solicitud terminó ready con dos intentos de generación visual, sin
  fallos reales del proveedor en estos cuatro intentos. Las ocho llamadas de
  esta validación fueron dos análisis, dos recomendaciones y cuatro visuales,
  con la configuración gratuita existente. Los errores de cuota/rechazo/timeout
  se cubrieron automáticamente y no se presentan como fallos reales observados.
- Recarga y reapertura conservan los tres recursos publicados y sus páginas.
  «Ver selección en el PDF» restauró página 2, texto y necesidad de Imagen.
  Se preservan propietario, documento, página y selección original.
- Comprobaciones HTTP reales: sin sesión 401, origen ajeno 403, otra cuenta
  404/RLS, documento diferente 409, regeneración y aprobación obsoletas 409.
  Repetir generación ready devuelve el mismo intento, sin otra llamada de IA.
  Contexto insuficiente del PDF escaneado 409, sin invocar al proveedor.
- Móvil 390×844: ancho cliente/contenido 390/390, ampliación accionada con Enter,
  región enfocada y flecha derecha desplazó el gráfico 40 px. Emulación retirada.
  Revisión/aprobación con teclado y cero errores de consola en la sesión QA
  observada. Capturas de escritorio/móvil inspeccionadas con píxeles reales.
- La solicitud personal `1201c3a3-1632-41b0-ae4f-0b989ba676cb` conserva texto,
  necesidad y estado generated; el ejemplo HU021 aprobado v3 permanece intacto.
  No se descartaron datos personales ni evidencias de historias anteriores.
- PDF original conserva SHA-256
  `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`.

**276/276 pruebas automatizadas**, lint y build Turbopack/TypeScript aprobados
tras los ajustes finales. Nueve comprobaciones PostgreSQL nuevas verifican
firma, propiedad, contrato visual, publicación, regeneración, versión anterior,
descarte, errores y cascada. Las diez de HU021 también pasan con la migración
visual aplicada. El build se ejecutó con dev detenido; después se reinició
localhost:3000. Node 22.23.3, Next 16.4.3 y dependencias permanecen sin cambios.

### Jira y evidencias de HU022

- SCRUM-101: comentario único **10133**, dos capturas reales de tipo/descripcion.
- SCRUM-186: comentario único **10134**, dos capturas reales de imagen/diagrama.
- SCRUM-102: comentario único **10135**, cuatro capturas reales de regeneración,
  descarte, móvil y aprobación tras recarga.
- Lectura posterior de los comentarios confirma 2/2/4 imágenes resueltas por
  nombre, sin duplicados y un solo comentario por subtarea. Las tres subtareas
  Finalizado únicamente después de comprobar sus criterios.
- Scripts y resultados reales están fuera de Git en `HU019/HU022`, con el
  verificador `HU019/hu022-live.mjs final` ajustado al baseline de 29 solicitudes.
  El grant temporal de subida se retiró después de cargar los ocho archivos.
  No se versionan .env.local, credenciales, capturas o scripts con sesiones.
  El stash `d6406e0` se conserva sin aplicar ni eliminar.

### Entrega de HU022

Commit funcional publicado **`d7bf85087527e267857faee0921db852420b7fd4`**.
PR borrador **[#28](https://github.com/Danilo2334/PDF_Interactivo/pull/28)**
contra develop `36be0e9`, después de #27 integrado. **SCRUM-34 En revisión**,
comentario madre único **10136**; subtareas SCRUM-101/SCRUM-186/SCRUM-102
Finalizado. Los comentarios 10133/10134/10135 incluyen el PR y conservan las
ocho imágenes, sin nuevas subidas ni duplicados tras editarlos.

La comprobación visual posterior al build confirmó una revisión en Ejemplo
y ninguna revisión visual ajena en esa solicitud; Refuerzos volvió a mostrar
el diagrama y la imagen aprobados, con cero errores de consola observados.
localhost:3000 quedó activo y la pestaña QA de Refuerzos abierta. El usuario
puede revisar #28 antes de autorizar su integración. No hubo merge de #28,
modificación de main ni avance a HU023 en esta entrega.

## Revisión e integración de PR #28, 27/10/2026

El nuevo encargo autoriza integrar HU022 si su revisión es correcta y continuar
con HU023. Se revisaron diff, servicio/proveedor, UI, firmas, RLS y transacciones
de revisión/publicación del head `659da75d908e269c1a203e6173dd48342a3eff5d`.
Sin conflictos ni hilos pendientes. Se repitieron **276/276 pruebas** y
`hu022-live.mjs final`: 29 solicitudes, tres refuerzos, imagen v1 preservada,
diagrama v2 aprobado, descartes y permisos correctos, SHA-256 original intacto.
No había checks de estado ni workflows de CI publicados para ese commit.

PR [#28](https://github.com/Danilo2334/PDF_Interactivo/pull/28) integrado en
develop con merge **`bf9ed6fa99616867a0684558aec5eeadd5a293d9`**, comprobando el
head esperado. Develop local actualizado por fast-forward. SCRUM-34 Finalizado,
comentario madre 10136 actualizado; se conservaron sus ocho capturas y los
comentarios únicos 10133/10134/10135. Main y PR #13 no se modificaron.

## HU023 / SCRUM-35: resumen y conceptos clave, 27/10/2026

Rama `codex/scrum-35-hu023-resumen-conceptos`, desde develop `bf9ed6f`.
Se leyeron HU023 y SCRUM-103, SCRUM-187 y SCRUM-104. Se continúa el código
existente; no se reimplementan HU018–HU022 ni se inicia el alcance restante de
HU024. El usuario activó acceso completo y no se solicitan permisos rutinarios.

### Implementación

- Dos extensiones explícitas, sin premarcar: Muy breve (máximo 350 caracteres)
  y Breve (máximo 700), con mínimo de 80. Deben guardarse antes de generar;
  versión y elección vigente se verifican en servidor y PostgreSQL.
- Gemini `gemini-3.5-flash-lite`, con la configuración privada existente,
  recibe selección, contexto de la misma página, diagnóstico y dificultad
  persistidos. Se limita el esquema y la validación a la extensión guardada.
  No hay clave en cliente, proveedor alternativo de pago, facturación activada
  ni cambios de SDK/dependencias. Una llamada por generación y timeout de 45 s.
- Resumen y lista estructurada de uno a ocho conceptos, cada uno con cita
  literal que contiene su nombre. Se contrastan selección/contexto, tema y
  citas; se eliminan vacíos y duplicados por mayúsculas/tildes. Un concepto sin
  sustento en su cita o una salida incoherente con el contrato se rechaza.
  Esta comprobación no sustituye la revisión semántica: no garantiza ausencia
  universal de errores de IA y las ediciones son decisiones del propietario.
- Vista previa separada del texto original, conceptos con citas desplegables
  y referencia a página/selección. Edición atómica de título, texto y conceptos:
  agregar/corregir/eliminar crea otra versión pendiente e inmutable.
- Se reutilizan heads, versiones, auditoría y publicación de HU021/HU022.
  Una transacción específica de resumen vuelve a validar extensión y conceptos,
  conserva idempotencia y bloquea versiones obsoletas. El RPC genérico de otro
  formato no puede aprobar ni editar resúmenes eludiendo esas comprobaciones.
- Solo la aprobación explícita publica una versión canónica fuera del PDF.
  Editar después mantiene la aprobación anterior mientras la nueva revisión
  queda pendiente; descartarla conserva el contenido publicado anterior.
  La interfaz conserva el borrador local de una pestaña antigua y exige cargar
  la versión actual antes de guardar/aprobar. Una confirmación de descarte no
  se arrastra a otra versión.
- Migración `20261028043253_generate_summary_drafts.sql` creada con CLI y
  conciliada con el timestamp remoto, aplicada una sola vez mediante MCP tras
  probarla en PostgreSQL aislado. No hubo db push ni reaplicación de historial.
  Tablas con RLS, escritura directa revocada, funciones privadas con permisos
  acotados, firmas con el secreto existente, lease y límites por cuenta.
- Advisors: sin avisos nuevos de seguridad respecto al baseline. Persisten
  los avisos previos de Auth/funciones anteriores y ocho políticas RLS previas
  con evaluación por fila. Los índices se conservan para las consultas previstas;
  no se eliminan por aparecer inicialmente como no utilizados.

### Pruebas reales y revisión de calidad

Se reutilizaron cuentas QA y el PDF digital, sin tocar documentos personales.
Se crearon por API autenticada dos solicitudes nuevas de página 1, seleccionando
las cuatro líneas sobre conservación y transformación de energía. Ambas tuvieron
análisis y recomendaciones reales; Resumen estaba realmente ofrecido, sin
fabricar opciones, diagnósticos o estados con SQL:

- Compacta: `2db4154c-57a8-491a-8f9b-524c956bb55c`.
- Breve: `77565f8b-d6a5-4d26-b3e9-35708994b4a2`.

Se hicieron seis llamadas reales con la configuración gratuita existente: dos
análisis, dos recomendaciones y dos resúmenes. Cada generación terminó ready
en el primer intento. No hubo fallo real de cuota, rechazo o timeout en estas
llamadas; esos casos se cubrieron automáticamente y no se presentan como hechos
observados del proveedor.

- Gemini produjo 217/350 y 253/700 caracteres. Ambos textos conservan sistema
  aislado, transformación, alternancia potencial/cinética y suma constante sin
  rozamiento. No se observaron hechos externos añadidos en esos resultados.
  Los tres conceptos iniciales de cada respuesta tienen citas literales.
- Revisión real compacta: se corrigió «energia» a «Energía», se agregó
  «energia cinetica» con la cita del péndulo y se eliminó «sistema aislado» de
  la lista. Se editó el resumen a 187 caracteres y el título a
  «QA HU023 · Conservación y transformación de la energía».
- Antes se intentó guardar «Temperatura» con una cita sobre energía que no
  contiene ese nombre. La interfaz mostró el rechazo, HTTP 400, conservando
  v1 y el contenido sin publicar. La limpieza de duplicados/vacíos fue probada
  automáticamente; no se atribuyen duplicados ficticios al proveedor real.
- Guardar la revisión creó v2 pendiente, con cero publicaciones para esta
  solicitud. Dos pestañas: «BORRADOR LOCAL QA: conservar al actualizar» se
  mantuvo al actualizar; guardar/aprobar quedó deshabilitado y el POST antiguo
  devolvió 409. Cargar la versión actual restableció los campos persistidos.
- Se aprobó v2 explícitamente con teclado. Editar el título creó v3 pendiente:
  lectura real confirmó que v2 seguía publicada. Descartar v3 conservó v2,
  sus conceptos y la solicitud approved/approved. La segunda solicitud se
  descartó en v1 sin publicar. El historial conserva acciones, versiones y fechas.
- HTTP/SDK reales: sin sesión 401, origen ajeno 403, otra cuenta 404/RLS,
  documento distinto 409, edición antigua 409, exceso de longitud y concepto
  no sustentado 400, contexto insuficiente del escaneado 409. Repetir generación
  ready conservó el intento y no consumió otra llamada de IA. Aprobar un
  descarte se rechazó con 409.
- Móvil 390×844: ancho cliente/contenido 390/390, título, resumen y conceptos
  legibles. Radios, aprobación y navegación por teclado comprobados; cero
  errores de consola observados. Emulación retirada y capturas inspeccionadas.
- Baseline final: **31 solicitudes y cuatro refuerzos publicados**. El
  verificador compara íntegramente las 29 solicitudes y tres publicaciones
  anteriores con su snapshot inicial: todas intactas, incluida la solicitud
  personal `1201c3a3-1632-41b0-ae4f-0b989ba676cb`.
- PDF original conserva SHA-256
  `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`.

### Verificación y evidencias de HU023

**295/295 pruebas automatizadas**, lint, TypeScript y build habitual Turbopack
aprobados. Nueve comprobaciones PostgreSQL de HU023 cubren generación, citas,
límites, normalización, versiones, aprobación, idempotencia, permisos y cascada.
Las pruebas de HU021/HU022 también pasan con la migración nueva. Se actualizaron
los mocks de importaciones de los tests del workspace/listado al añadir los
componentes de resumen. El build se ejecutó con dev detenido y después se
reinició localhost:3000. Node 22.23.3, Next 16.4.3 y dependencias sin cambios.

- SCRUM-103: comentario único **10137**, dos capturas reales de los resúmenes.
- SCRUM-187: comentario único **10138**, dos capturas de citas/rechazo.
- SCRUM-104: comentario único **10139**, cuatro capturas de revisión pendiente,
  pestaña antigua, auditoría y móvil. Ocho imágenes subidas una sola vez.
- Scripts, snapshot, capturas y resultados permanecen fuera de Git en
  `HU019/HU023`; `HU019/hu023-live.mjs checks` documenta el estado intermedio
  v2 pendiente y `final` comprueba el baseline final de 31/cuatro.
  El script temporal con grants de carga se retiró tras completar las subidas.
- Se conservan el stash `d6406e0`, la configuración privada y las evidencias
  anteriores de Jira. Las subtareas siguen En curso hasta enlazar el commit/PR
  de esta entrega; luego se registrará el estado final en el apartado posterior.

### Entrega de HU023

Commit funcional publicado **`fb3f8acc2456da4835116b69957f6820ce71d8b7`**.
PR borrador **[#29](https://github.com/Danilo2334/PDF_Interactivo/pull/29)**
contra develop `bf9ed6f`, después de #28 integrado. **SCRUM-35 En revisión**,
comentario madre único **10140**; SCRUM-103/SCRUM-187/SCRUM-104 Finalizado.
Sus comentarios 10137/10138/10139 incluyen el PR y la lectura posterior confirma
2/2/4 capturas resueltas, sin duplicados ni nuevas subidas tras editarlos.

La verificación real `hu023-live.mjs final` pasó también después del build y el
reinicio: 31 solicitudes, cuatro refuerzos y los 29/tres anteriores intactos.
La aplicación recién iniciada mostró el resumen aprobado con sus conceptos,
con cero errores de consola observados. localhost:3000 queda activo y la
pestaña QA de Refuerzos abierta. Árbol de trabajo conservado y stash `d6406e0`
intacto. El PR #29 queda pendiente de revisión e integración; no se hizo merge
de HU023, no se modificó main ni se inició el alcance restante de HU024.

## 2026-10-28 — Revisión de PR #29 e implementación de HU024

El usuario autorizó revisar e integrar #29 y continuar con HU024; después amplió
el alcance para continuar con las historias siguientes en orden durante su
ausencia, sin permisos rutinarios. No habilitar pagos ni modificar main.

### Integración de HU023

- PR #29 revisado: contratos de resumen/conceptos, transacciones, publicación,
  permisos y UI. Sin hallazgos bloqueantes ni hilos de revisión pendientes.
- 295/295 pruebas y `hu023-live.mjs final` pasaron nuevamente: 31 solicitudes,
  cuatro publicaciones y los 29/tres anteriores preservados. GitHub no tenía
  checks ni ejecuciones de Actions para ese head; no se presentan como aprobados.
- Se marcó listo y se integró con merge normal, comprobando el head
  `a74c18453d62e0d268c5246767ac1f7a3e3beec7`. Merge en develop:
  **`203769ac772e84fbcf3499fc0445abdd38b2f2cf`**.
- SCRUM-35 Finalizado. Se actualizó su comentario único 10140 con revisión e
  integración; se conservaron las ocho capturas y comentarios de sus subtareas.
- HU024 parte de ese develop en
  `codex/scrum-36-hu024-revision-regeneracion`. Stash `d6406e0` conservado,
  sin aplicarlo, eliminarlo ni descartar trabajo local.

### HU024 / SCRUM-36: alcance implementado

- Reutiliza versiones, decisiones y publicación de HU021–HU023. Completa la
  edición y aprobación de explicaciones HU020 con una preparación explícita:
  consultar una explicación anterior no escribe, publica ni cambia datos.
- Una edición crea una versión pendiente. La versión aprobada y su publicación
  permanecen intactas hasta una aprobación nueva y explícita. Rechazar un
  borrador no borra una aprobación anterior ni modifica el PDF.
- Regeneración común para explicación, ejemplo/analogía, resumen e imagen/
  diagrama. Captura instrucciones de 3–500 caracteres y envía al proveedor el
  contexto validado y la versión guardada anterior, incluidas sus ediciones.
- El resultado es otra versión AI pendiente con snapshot completo. Conserva
  texto, citas, conceptos o composición visual según corresponda; la UI del
  ejemplo utiliza los metadatos de esa versión y no los de la generación inicial.
- Tabla de operaciones de regeneración con RLS, propietario, instrucciones,
  versión de origen, autor y fecha, firma HMAC, lease de 120 segundos, límite
  de dos operaciones simultáneas por cuenta y diez en cinco minutos. Cada
  operación explícita tiene UUID estable para recuperar una respuesta perdida.
- Una operación en curso bloquea cambios de decisión y la generación visual
  anterior. El resultado obsoleto o expirado no puede completar otra operación;
  un intento fallido conserva borrador y publicación. No hay reintentos de IA
  automáticos ni ilimitados. La llamada sigue teniendo timeout de 45 segundos.
- La nueva versión no sobrescribe campos locales de otra pestaña: muestra el
  conflicto, conserva el borrador y obliga a cargar la versión actual. El
  servidor verifica también el número de versión, origen, sesión y documento.
- La publicación guarda versión, actor y fecha; requiere checkbox y aprobación
  explícita. Descartar exige su confirmación. Se conserva el historial real.
- Migración **20261028050319_owner_reinforcement_regeneration.sql** aplicada
  una vez en `zqodybtzssvqozrckfgw`, después de pruebas aisladas. Archivo creado
  con Supabase CLI y conciliado con el timestamp remoto. Sin `db push`, backfill
  de datos personales, cambios de secretos ni desactivación de RLS.
- Advisories de seguridad y rendimiento comprobados antes/después: mismos
  grupos de advertencias preexistentes, sin nuevos grupos. Los índices de la
  nueva tabla cubren sus referencias a solicitud y actor.

### Pruebas reales de HU024

Servidor existente reutilizado en localhost:3000, navegador integrado con la
cuenta QA ya disponible. Se crearon cuatro solicitudes identificadas como QA
HU024, mediante endpoints autenticados y Gemini real con configuración privada
existente **gemini-3.5-flash-lite**. Sin habilitar pagos ni sustituir respuestas
por resultados simulados.

- Explicación `b9ffc509-7b83-4219-90c8-54cacbe6dcc1`: selección de cuatro
  líneas de energía, página 1. La primera respuesta fue rechazada como inválida
  y no produjo publicación. Se fijaron cita literal y tema en el esquema del
  proveedor sin relajar la validación. El reintento real pasó; dos intentos de
  generación inicial en total. Se editó título/texto a v2, se aprobó mediante
  checkbox y se regeneró v3 con instrucciones para dos párrafos. El resultado
  conserva sistema aislado, transformación y péndulo sin rozamiento. Se descartó
  v3; Refuerzos conserva exactamente v2, su autor y su fecha de aprobación.
- Segunda pestaña: se mantuvo un título local de v2 mientras la primera creó
  v3. Apareció el conflicto, guardar quedó deshabilitado y el texto local siguió
  visible. No se presentó un resultado esperado como evidencia observada.
- Ejemplo `e0ea0089-f049-4aed-8b69-e27a41fdec14`: v1 real y regeneración v2
  de tres pasos. Explicita referencia de energía potencial cero en el punto
  inferior y límites del péndulo ideal. Dos POST simultáneos de la misma
  operación devolvieron **200/202**, una operación y una sola versión nueva.
  Se revisó en UI y se descartó v2: ninguna publicación.
- Resumen `deeb737f-4008-41d5-b345-bd9d26f434dc`: regeneración real v2
  de dos frases, 180/350 caracteres y conceptos/citas de energía potencial y
  cinética. Se descartó el cuerpo de la respuesta HTTP después de que el
  servidor terminó y se reintentó el mismo UUID: recuperó la misma operación
  y v2, sin otra llamada. No se confundió con desconectar antes del envío.
  Revisión humana v3 de 210/350 caracteres: añade explícitamente «sin
  rozamiento» y corrige la tilde de cinética. Aprobada con sus dos citas.
- Diagrama `167fe954-382d-4c30-b276-51b5bbdbd7a0`, página 2: la versión
  inicial se amplió más de lo necesario. Se solicitaron solo evaporación y
  condensación, eliminando afirmaciones sobre ecosistemas y suministro. V2
  real contiene dos nodos y una flecha y aclara que no representa todo el ciclo.
  Revisado y aprobado mediante checkbox en UI; no se publicó la versión inicial.
- Se contrastaron contenido, citas, modalidad, instrucciones y límites de los
  resultados reales. La revisión humana sigue siendo necesaria; una respuesta
  estructurada válida no demuestra por sí sola la calidad de cualquier salida.
- En los cuatro formatos: sin sesión **401**, origen ajeno **403**, otra cuenta
  **404**, otro documento **409**, versión antigua **409**, instrucciones vacías
  **400** y lecturas ajenas por RLS vacías. Esas comprobaciones no consumen IA.
- Escritorio, teclado, dos pestañas, móvil 390×844, recarga y persistencia. En
  móvil `clientWidth/scrollWidth=390/390`; cero errores de consola observados.
  La emulación se restauró después de capturar la evidencia.
- `HU019/hu024-live.mjs final`: **35 solicitudes y siete publicaciones**.
  Las **31 solicitudes y cuatro publicaciones anteriores** permanecen idénticas,
  incluida la solicitud personal 1201c3a3-1632-41b0-ae4f-0b989ba676cb.
  Explicación v3 descartada/v2 publicada, ejemplo v2 descartado sin publicación,
  resumen v3 aprobado y diagrama v2 aprobado.
- SHA-256 del PDF digital sin cambios:
  `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`.

### Verificación y registro

**307/307 pruebas automatizadas**, lint sin advertencias y TypeScript aprobados.
Las pruebas nuevas cubren HTTP, contrato del proveedor, UI y PostgreSQL aislado:
edición, regeneración, idempotencia, aprobación explícita, conservación de
publicación, errores, expiración y permisos en los cuatro formatos. Las pruebas
aisladas usan fixtures; se distinguen de las pruebas reales descritas arriba.

Scripts, baseline, resultados y capturas están fuera de Git en `HU019/HU024`.
No se versionan credenciales, configuración privada ni scripts de sesión. El
build, las subidas reales a Jira y el PR se registrarán al completar la entrega
en el apartado siguiente; las subtareas siguen En curso hasta ese registro.

### Registro verificado de HU024

Build de producción Turbopack aprobado, incluido TypeScript, y servidor de
desarrollo reiniciado por separado. La verificación real de 35 solicitudes/siete
publicaciones volvió a pasar después del reinicio. Tras el último ajuste de
manejo de error al preparar la revisión se repitieron sus cuatro pruebas de API;
tras normalizar texto UTF-8 de las instrucciones se repitieron las 16 pruebas
de proveedores/UI afectados y el build. No se actualizaron dependencias.

Jira contiene un único comentario y capturas reales por subtarea:

- SCRUM-105: comentario **10141**, tres capturas de edición pendiente, pestaña
  antigua conservada y publicación anterior intacta.
- SCRUM-188: comentario **10142**, tres capturas de instrucciones, explicación
  regenerada y diagrama regenerado de dos nodos.
- SCRUM-106: comentario **10143**, dos capturas de historial de aprobación/
  descarte y publicación aprobada en móvil.

Se leyó `renderedBody` y se confirmaron las ocho miniaturas con nombres de
archivo correctos (3/3/2), sin duplicados. Se preservan las evidencias anteriores.
El script temporal de carga con grants se eliminó después de las subidas; solo
se conservan metadatos de archivos fuera de Git. El commit y enlace del PR se
agregarán a esos mismos comentarios, sin repetir imágenes ni crear informes.

### Entrega de HU024 y siguiente historia

Commit funcional publicado **`f3bcb64f04a697d2de6df618558e348b0edd24d5`**.
PR borrador **[#30](https://github.com/Danilo2334/PDF_Interactivo/pull/30)**
contra develop `203769a`. SCRUM-36 **En revisión**, comentario madre único
**10144**; SCRUM-105/SCRUM-188/SCRUM-106 **Finalizado**. Los comentarios
10141/10142/10143 ya incluyen el PR y commit. La lectura posterior confirma
ocho imágenes resueltas, 3/3/2, conservadas sin nuevas subidas al editar.

El servidor localhost:3000 queda activo. La sesión QA nueva confirmó las
publicaciones después del build y reinicio; captura `HU024/entrega-hu024.jpg`
y cero errores de consola. La comprobación HTTP/SDK final volvió a pasar con
35 solicitudes/siete publicaciones y todo el baseline anterior intacto.
Stash `d6406e0` y configuración privada preservados.

Se continúa **HU025 / SCRUM-37**, autorizada por el último mensaje del usuario.
El PR #30 queda preparado para revisión e integración. HU025 se desarrollará
en una rama descendiente para conservar el diff de cada historia mientras se
revisa #30. No se ha integrado #30 ni se ha modificado main.

## 2026-10-28 — Definición de rendimiento incorporada para HU025 / SCRUM-108

El propietario definió **ahora**, durante la validación, un requisito que no
estaba concretado para el panel de refuerzos. Se añadió a la descripción de
SCRUM-108 conservando sus actividades anteriores; no se atribuye esta definición
a documentos o decisiones antiguas.

- Máximo **3 segundos** desde que se pulsa «Refuerzos» hasta que los refuerzos
  guardados de la página activa, o su estado vacío, están visibles y consultables.
- Un indicador de carga por sí solo no cuenta como apertura. Se incluyen las
  consultas al servidor necesarias; se excluye generar refuerzos nuevos con IA.
- Prueba con compilación de producción, sesión iniciada y PDF ya abierto:
  **tres mediciones con refuerzos y tres sin refuerzos**.
- Registrar equipo, navegador, red, cantidad/tipo de refuerzos, estado de caché,
  primera apertura y posteriores, tiempos individuales y máximo.
- **Cada medición** debe cumplir 3 segundos. Ante un incumplimiento, diagnosticar
  y corregir; no aumentar el límite para aprobar.
- Completar conservación de página, zoom, posición y PDF original, con capturas
  reales y un único comentario breve de resultados.

### HU025 / SCRUM-37: panel separado y lectura conservada

Rama `codex/scrum-37-hu025-panel-refuerzo`, descendiente de HU024
`3f203a9978e49a64018f8aa64cf125b452bacec1`. PR #30 sigue pendiente de revisión;
el nuevo PR tendrá esa rama como base para mostrar solo HU025.

- El visor permanece montado al alternar PDF, Solicitudes y Refuerzos. Se
  pausan renderizado y observers mientras está oculto, conservando canvases,
  documento abierto y zoom. Ocultar el contenedor no interpreta su ancho cero
  como un cambio del tamaño del PDF.
- Se guardan/restauran desplazamiento vertical de la ventana y horizontal de
  la página. Abrir una solicitud guardada sigue siendo una navegación explícita
  a su página/selección, sin recargar el PDF ni confirmar un borrador nuevo.
- Refuerzos muestra únicamente los elementos del documento y página visibles.
  Se conserva la autorización/RLS existente. Esta presentación de propietario
  no anticipa la publicación y acceso lector de HU032–HU033.
- Controles para abrir desde la lectura y cerrar/volver al PDF, con foco
  recuperado sin desplazar la posición. En pantallas reducidas se añadió un
  botón compacto fijo; la altura de la navegación solo se descuenta cuando
  realmente está fija, para no ocultar contenido en móvil.
- No se añadieron consultas ni escrituras de base de datos. Los refuerzos ya
  vienen autorizados con el proyecto y se filtran por página en cliente. No se
  cambiaron migraciones, secretos, permisos ni dependencias.

### Verificación funcional real de HU025

- Cuenta QA existente y PDF digital de 1580 bytes/dos páginas; página 1 con
  cinco refuerzos aprobados y página 2 con dos recursos visuales. PDF escaneado
  de 13899 bytes/una página sin refuerzos aprobados para el estado vacío.
- Se comprobaron títulos/contenido/aprobación, aislamiento entre páginas y el
  estado vacío del otro documento. Nunca se muestran los elementos de otra
  página por el solo hecho de estar cargados en el proyecto.
- Se mantuvieron **página 2, zoom 150 %, scroll vertical 2433,6001 y horizontal
  120** al cerrar/reabrir. Tres ciclos de producción conservaron exactamente
  esos valores. CDP registró **cero nuevas solicitudes del PDF** en los ciclos.
- Móvil 390×844: botón compacto accesible desde la página 2, panel correspondiente,
  ancho de documento 390/390 sin desbordamiento del cuerpo; cierre con teclado
  conserva página 2, zoom 150 %, scroll vertical 1879,2000 y horizontal 120.
- Se detectó que el clic automático de la herramienta desplazaba primero el
  control sticky hacia su posición original y cambiaba la página. Se repitió
  con clic de puntero en el control visible y coordenadas observadas; no se
  presentó aquella interacción de automatización como resultado del producto.
- Durante la validación se corrigió la pérdida de lectura por desmontaje y el
  acceso fuera de vista en pantallas reducidas. Pruebas funcionales después de
  estabilizar el código, sin cambios de desarrollo entre las capturas antes/
  después. Cero errores de consola observados en la compilación de producción.

### SCRUM-108: medición conforme al criterio definido ahora

**Producción local** (`npm --prefix web run build` seguido de `run start`),
sesión iniciada y PDF ya abierto. Intel Core i5-11400H 2,70 GHz, 15,77 GiB RAM
(16 GB nominales), Windows de 64 bits, navegador integrado Chrome 156.0.0.0.
Conexión Wi-Fi con enlace informado de 54 Mbps, sin limitación artificial.
Caché del navegador habilitada y JS previamente cargado; recarga completa del
proyecto por escenario. El PDF usa `cache:no-store` y termina de abrirse antes
de iniciar el cronómetro. No es una prueba de carga ni de primera visita sin
caché de toda la aplicación.

Medición desde el clic literal en **Refuerzos** hasta contenido renderizado y
dos `requestAnimationFrame`, verificando además visibilidad y cinco artículos
consultables o el texto vacío completo. No se contó un indicador de carga. Los
datos autorizados ya se cargan con el proyecto; abrir el panel no necesita una
consulta adicional. Se incluye toda la operación requerida en este diseño y
no se ejecutó IA para estas pruebas.

| Escenario | Primera apertura | Posterior 1 | Posterior 2 | Máximo |
| --- | ---: | ---: | ---: | ---: |
| Página 1, cinco refuerzos guardados | 12,6 ms | 12,8 ms | 12,9 ms | 12,9 ms |
| Página 1, sin refuerzos guardados | 13,0 ms | 13,6 ms | 11,2 ms | 13,6 ms |

Los cinco refuerzos son un ejemplo, un diagrama, dos resúmenes y una explicación.
Primera = primera apertura del panel tras recargar y abrir el PDF; posteriores
= cerrar y reabrir en esa misma sesión. **Las seis mediciones cumplen 3000 ms;
máximo global 13,6 ms (0,0136 s)**. No se aumentó el límite para aprobar.

Como diagnóstico previo se conservaron mediciones con el navegador oculto:
20,8/1883,9/1763,7 ms. La planificación de frames variaba en esa condición.
Las seis mediciones de aceptación se hicieron con el navegador presentado,
con su estado de visibilidad comprobado; no se ocultaron ni reemplazaron los
datos del diagnóstico por supuestos resultados rápidos.

Verificación automatizada: **310/310 pruebas**; tras el ajuste móvil se repitieron
**59/59 casos afectados**, lint sin advertencias y build Turbopack/TypeScript.
Scripts, mediciones, capturas y resultados reales permanecen fuera de Git en
`HU019/HU025`. No se generan informes adicionales para Jira; se registrarán
capturas y un único comentario breve por subtarea al enlazar el commit/PR.

### Registro de pruebas y evidencias de HU025

Se comprobó también en producción «Ver selección en el PDF» sobre la solicitud
QA existente `806915fa-1acc-4701-99a7-7b5e2f5b9f43`: restaura página 1 y la
zona rectangular guardada. No se cambió su contenido, estado ni generación.

`hu025-source-check.mjs` pasó: 35 solicitudes y siete publicaciones, los 31/
cuatro anteriores idénticos y hashes de ambos PDF conservados:

- Digital: `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`.
- Escaneado: `b0bc1809351f249bd352032fbcdd193846e4c44e4199cf4bfbfec24326b71302`.

Ocho capturas reales incorporadas en un único comentario por subtarea:
SCRUM-107 **10145**, SCRUM-189 **10146**, SCRUM-190 **10147** y SCRUM-108
**10148**, dos capturas cada uno. La lectura de `renderedBody` confirmó nombres
y miniaturas resueltas sin duplicados. El script temporal de carga con grants
se retiró después de subir los archivos. La definición nueva de los 3 segundos
se leyó nuevamente en SCRUM-108 para comprobar su registro.

Todos los criterios funcionales y las seis mediciones RNF están comprobados.
Se enlazará el commit/PR en esos mismos comentarios y se registrará el estado
final de entrega, conservando las imágenes existentes.

### Entrega de HU025

Commit funcional publicado **`92958c9a1c0883af2e08675ecbffc692522746cf`**.
PR borrador **[#31](https://github.com/Danilo2334/PDF_Interactivo/pull/31)**
sobre `codex/scrum-36-hu024-revision-regeneracion` (#30), con diff exclusivo
de HU025. Tras integrar #30, cambiar la base de #31 a develop y revisar diff/
checks antes de cualquier integración autorizada. No se integró #30 ni #31.

SCRUM-37 **En revisión**, comentario madre único **10149**.
SCRUM-107/SCRUM-189/SCRUM-190/SCRUM-108 **Finalizado**: los comentarios únicos
10145/10146/10147/10148 incluyen el PR y commit. Lectura posterior: ocho imágenes
resueltas, dos por subtarea, conservadas sin nuevas subidas al editar.
El criterio RNF incorporado ahora quedó satisfecho sin aumentar el límite.

Se continúa **HU026 / SCRUM-38**, tarjeta interactiva, desde una rama descendiente
de HU025. Main y stash `d6406e0` permanecen intactos. La aplicación de producción
local sigue activa; para el desarrollo siguiente se cambiará al servidor dev
de este proyecto de forma controlada, conservando la configuración privada.


## 2026-10-28 — HU026 / SCRUM-38: tarjeta interactiva accesible

Continuación autorizada desde HU025, rama `codex/scrum-38-hu026-tarjeta-interactiva`.
Los PR #30 y #31 siguen sin integrar; esta historia depende de #31. No se tocó
main ni el stash `d6406e0`.

### Estructura, contenido aprobado y vínculo de origen

Los refuerzos publicados del panel se presentan como tarjetas desplegables.
El título contraído es un botón nativo con `aria-expanded` y `aria-controls`;
al expandir se consulta el contenido completo, incluyendo los renderizadores
existentes de resumen y recurso visual. Clic, Enter y Espacio alternan el estado;
«Contraer tarjeta» devuelve el foco al título. Se mantienen los nodos de contenido
al ocultarlos, sin modificar texto, imagen, página o selección.

`reinforcement_cards` guarda la presentación inicial, versión optimista, última
operación, versión aprobada consultada, actor y fecha. Referencia el refuerzo ya
publicado: el título y contenido se conservan en su versión aprobada, y la página/
selección proceden de la solicitud inmutable. No se crea una copia educativa sin
revisar ni se permite editar contenido desde la configuración de presentación.
Las modificaciones educativas continúan por la revisión de HU024.

«Abrir expandida al entrar al proyecto» y «Guardar tarjeta» persisten el estado
inicial. Expandir/contraer durante la lectura es temporal; no escribe en servidor.
Se comprobaron ambos inicios guardados y la salida/reentrada al proyecto. Los
refuerzos sin configuración empiezan contraídos, sin backfill de datos antiguos.
La consulta del proyecto carga en una petición las relaciones de tarjeta y origen.

Migración **20261028060058_interactive_reinforcement_cards.sql**, aplicada una
sola vez y reconciliada con el historial remoto. RLS de lectura por propietario,
escrituras directas revocadas, RPC invoker con implementación privada y permisos
comprobados. La operación bloquea proyecto/solicitud/publicación, comprueba usuario
activo, documento vigente, página y puntero aprobado, título/contenido no vacíos.
No exige que el borrador más reciente esté aprobado: conserva el acceso a la
última publicación aprobada aunque exista una revisión posterior descartada.

El POST de tarjeta verifica sesión de aplicación, propietario, origen, UUID,
tamaño de cuerpo y versión. Un reintento idéntico conserva la misma operación;
una pestaña antigua recibe 409. Se limita la espera del cliente a 20 segundos y
un fallo ambiguo permite reintentar sin inventar éxito ni crear otra operación.
No se invoca IA, no hay consumo ni cambios en las claves o facturación.

### Validación real de HU026

Producción local, build Turbopack/TypeScript correcto, **314/314 pruebas** y lint
sin advertencias. Las pruebas incluyen contrato API, roles/RLS, reintento,
conflicto de versión, rechazo de otra cuenta/documento, cuenta inactiva y proyecto
en eliminación en PostgreSQL aislado. Las simulaciones de ese entorno no se
presentan como evidencia visual o datos reales de producción.

En navegador integrado autenticado con la cuenta QA existente y PDF de prueba:

- Título contraído, contenido expandido y cierre con ratón, Enter y Espacio.
  ARIA y foco DOM comprobados; indicador de foco visible en captura real.
- Guardado inicial expandido, salida al dashboard y reentrada: recuperado.
  Guardado inicial contraído y recarga: recuperado; se dejó el ejemplo expandido
  para revisión. Solo se añadieron dos configuraciones de presentación de QA.
- Dos pestañas: guardar desde la segunda, anterior, mostró el mensaje de conflicto
  y no reemplazó la primera configuración. Captura real del rechazo.
- «Ver zona original» del ejemplo QA `d26e29e7-2de6-4838-9184-89186daf9a6f`
  restauró la zona de página 1; la tarjeta visual de página 2 abrió esa página.
  No se enviaron solicitudes nuevas ni se alteraron sus dificultades.
- Página 2, zoom 125 %, abrir/cerrar el panel: scrollY **2171,199951171875**,
  scrollX **0** y desplazamiento horizontal **0** idénticos antes/después.
- Móvil **390×844 CSS**, ancho documental **390**, sin desbordamiento. La captura
  usa escala **1,25**, correspondiente a Windows 125 %, para incluir todo el ancho
  real; se descartó la primera captura de diagnóstico recortada por DPR=1.
  Se restauraron las emulaciones de viewport al finalizar.
- Cero errores de consola observados. El autoscroll de la herramienta sobre la
  barra sticky podía cambiar la página antes de pulsar; se usó el punto visible
  del botón para esos pasos, sin modificar código o DOM durante las pruebas.

HTTP real: sin sesión **401**, origen ajeno **403**, otra cuenta **404**, documento
cambiado **409**, intento de sobrescribir título por este endpoint **400**, versión
antigua **409**. El reenvío de la misma operación devolvió el mismo registro;
UPDATE directo a la tabla denegado y cero filas visibles desde la otra cuenta.
Las siete publicaciones permanecieron idénticas en la comparación del script;
la comprobación final conservó 35 solicitudes, siete publicaciones y los 31/
cuatro registros previos. Ambos PDF siguen con los SHA-256 registrados en HU025.
Advisors de seguridad mantienen los cuatro grupos anteriores, sin nuevos avisos;
los nuevos índices aparecen como no utilizados al ser una función recién creada.

Scripts/resultados/capturas reales fuera de Git, `HU019/HU026`. Ocho imágenes
adjuntadas en comentarios únicos: SCRUM-109 **10150**, SCRUM-191 **10151**,
SCRUM-192 **10152**, SCRUM-110 **10153**, dos imágenes por subtarea. Se leyó
`renderedBody` y se confirmaron los ocho nombres/miniaturas. El script temporal
con grants de carga se eliminó después de subirlos. Falta enlazar commit/PR en
esos mismos comentarios y registrar la entrega, sin duplicar capturas.


### Entrega de HU026

Commit funcional publicado **`5cf209a36ff77359957f71aa80fc5d8db073f52a`**.
PR borrador **[#32](https://github.com/Danilo2334/PDF_Interactivo/pull/32)**
sobre `codex/scrum-37-hu025-panel-refuerzo` (#31). Orden de integración pendiente:
#30 → #31 → #32; tras cada predecesor integrado, cambiar base del siguiente a
develop y revisar nuevamente diff/checks. Ninguno de esos tres PR se integró.

SCRUM-38 **En revisión**, comentario madre único **10154**. SCRUM-109,
SCRUM-191, SCRUM-192 y SCRUM-110 **Finalizado**. Sus comentarios 10150–10153
incluyen commit/PR y conservan las ocho imágenes verificadas en una lectura
posterior, sin volver a subirlas. La comprobación adicional real confirmó
inicio contraído guardado tras recarga y se dejó de nuevo expandido el ejemplo.

Se continúa **HU027 / SCRUM-39**, incorporación de recurso multimedia, desde
la rama descendiente de HU026. Se mantienen configuración local, evidencia,
main y stash. El servidor de producción local sigue disponible hasta el
siguiente cambio controlado a desarrollo.


## 2026-10-28 — HU027 / SCRUM-39: recursos multimedia privados

Rama `codex/scrum-39-hu027-recursos-multimedia`, descendiente de HU026. El PR
#32 y sus predecesores permanecen sin integrar. Se conserva el stash `d6406e0`.

### Recepción, aprobación y retirada

Las tarjetas de refuerzos publicados admiten imágenes **PNG/JPEG hasta 5 MiB**,
con límite de 16 megapíxeles, videos **MP4 hasta 20 MiB** y enlaces externos.
Se exige título/descripción y revisar/aprobar explícitamente la vista previa.
El navegador debe decodificar la imagen o los metadatos del video antes de
habilitar esa aprobación. El servidor comprueba extensión, MIME, tamaño y
estructura/signatura de bytes; no se presenta esto como un análisis antivirus.
Se bloquean SVG, HTML renombrado y contenedores incompletos/no admitidos.

Los enlaces usan HTTPS, sin credenciales/puertos alternativos y dominios exactos:
`es.wikipedia.org`, `en.wikipedia.org`, `www.khanacademy.org`, `es.khanacademy.org`,
`www.youtube.com`, `youtube.com`, `youtu.be`. Wikipedia requiere `/wiki/...`;
YouTube requiere ID de 11 caracteres y se normaliza a `watch?v=...`. Los demás
parámetros, fragmentos y dominios parecidos se rechazan. La vista previa del
enlace muestra título, dominio y dirección; no hace fetch de Open Graph, no sigue
redirecciones remotas y no incrusta iframes/scripts de terceros. El destino
externo solo se abre por acción expresa, con `noopener noreferrer`.

Cada recurso se asocia al refuerzo, solicitud, proyecto, documento y versión
aprobada que el propietario revisó. No altera contenido educativo, página,
selección ni estado de la solicitud. La asociación al refuerzo publicado es
estable; la versión de incorporación permanece en el registro de auditoría.

La tabla `reinforcement_media` y el bucket **privado** `reinforcement-media`
se crearon mediante **20261028080942_reinforcement_multimedia.sql**, aplicada una
sola vez y reconciliada con el historial remoto. Preparación y aprobación usan
HMAC de servidor con caducidad, UUID idempotente y hash de metadatos/archivo.
La transacción bloquea cuenta/proyecto/solicitud/publicación y comprueba rol
activo, propiedad, documento vigente y versión aprobada. RLS y permisos de
Storage solo permiten archivos de operaciones preparadas; no hay upsert ni
escrituras directas de metadatos desde clientes autenticados.

Máximo 10 recursos activos o cargas recientes por refuerzo y 100 MiB de archivos
privados por cuenta, incluyendo el historial retirado. La retirada cambia el
estado a `removed`, oculta inmediatamente el recurso y bloquea nuevas consultas;
no borra el objeto privado. La eliminación recuperable del proyecto limpia todos
sus archivos multimedia, incluidos retirados/inacabados, en lotes de 100 antes
de finalizar los registros. Su comportamiento de fallo y reintento se probó de
forma automatizada; no se borró el proyecto QA compartido para acreditarlo.

El proxy de archivos autentica cada petición y transmite rangos 206 sin exponer
URL firmada al cliente. Las firmas de Storage duran 30 segundos y solo se usan
en servidor. Respuestas privadas/no-store, `nosniff` y `Cross-Origin-Resource-Policy:
same-origin`. Las solicitudes de formulario se limitan durante la lectura antes
de parsearlas; los rechazos no crean registros. Una carga cuya respuesta se
pierde puede reutilizar su objeto solo tras comparar su hash, sin sobrescribirlo.

Los metadatos necesarios se incluyen en la consulta inicial del proyecto; el
panel no añade consultas al abrir. Archivos guardados se abren solo al pulsar
«Ver imagen/video guardado». El borrador local usa blob URL que se revoca al
cambiar/retirar el archivo o desmontar el componente. No se usa IA ni facturación.

### Pruebas reales y límites observados

**322/322 pruebas**, lint sin advertencias y build de producción/TypeScript
aprobados. Tras ajustar revocación de blob y textos largos se repitieron los
seis casos afectados, lint y build. Una compilación informó 130 minutos de tiempo
de pared sin fallo; la causa no se confirmó. La compilación final posterior
terminó correctamente (1691 ms de compilado, más TypeScript y generación), sin
actualizar Node, Next o dependencias.

Producción autenticada, cuenta QA existente, refuerzo de explicación
`b9ffc509-7b83-4219-90c8-54cacbe6dcc1`:

- PNG **6424 B** y JPEG **17601 B**, 640×360, seleccionados/previsualizados y
  aprobados en la aplicación. La imagen recuperada del bucket se decodificó.
- MP4 **1128375 B**, 960×540 y **5,055 s**, reproducido en la vista previa y
  desde el archivo privado después de reabrir el proyecto. Muestra técnica
  [flower.mp4 de MDN](https://developer.mozilla.org/shared-assets/videos/flower.mp4),
  enlazada por la [documentación de video](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).
  Identificada como QA/MDN y retirada después; no se ofrece como refuerzo pedagógico.
- Los tres archivos recuperados por HTTP son idénticos a los originales locales;
  rangos de 64 bytes devuelven **206**. Reenviar sus operaciones devuelve el mismo
  ID y no añade registros. El fallo ambiguo de carga se cubre además en pruebas
  automatizadas, sin presentarlo como una desconexión visual observada.
- Un dominio suplantado y un SVG se rechazaron visualmente. Servidor rechazó
  HTML renombrado, MIME incoherente, imagen de más de 5 MiB y enlace no permitido
  (**415**), falta de aprobación (**400**), origen ajeno (**403**), sesión ausente
  (**401**), otra cuenta (**404**) y documento cambiado (**409**).
- Retirar un borrador elimina su vista previa sin guardarlo. JPEG, MP4 y un enlace
  guardados se retiraron; no reaparecen tras recarga y los archivos retirados
  devuelven **404**. Se dejó el PNG y una nueva referencia HTTPS a energía:
  cinco registros en total, dos aprobados y tres retirados, sin duplicados visibles.
- Storage anónimo denegado, cero metadatos visibles para la otra cuenta y UPDATE
  directo a la tabla denegado. La publicación no cambió. Comprobación final:
  35 solicitudes, siete publicaciones y los 31/cuatro anteriores conservados;
  ambos SHA-256 de PDF coinciden con HU025.
- Móvil **390×844 CSS**, ancho documental **390**, imagen privada visible y
  enlace enfocado con teclado. Captura a DPR 1,25, correspondiente a Windows 125 %,
  encuadrada en el viewport real. Cero errores de consola observados. Viewport y
  visibilidad del navegador restaurados.

Regresión del criterio de SCRUM-108, con producción, sesión y PDF ya abierto:
Intel i5-11400H 2,70 GHz, mismo Windows/RAM y Chrome integrado 156 de HU025;
Wi-Fi ahora informa **86,7 Mbps**, sin limitación artificial. Caché habilitada,
JS/SSR cargados y PDF no-store ya abierto. Primera apertura tras recargar y
posteriores en la misma sesión, navegador presentado. Con cinco refuerzos
(un ejemplo, un diagrama, dos resúmenes y una explicación), y dos recursos
multimedia asociados, **14,4 / 7,0 / 11,8 ms**. Sin refuerzos, PDF escaneado,
**10,6 / 8,0 / 11,4 ms**. Máximo global **14,4 ms**: las seis cumplen 3000 ms.
Se verificaron cinco artículos consultables o estado vacío completo y dos frames,
con cero peticiones adicionales a PDF/multimedia al abrir. La descarga voluntaria
de un archivo mediante otro botón es una acción distinta del acceso al panel.
No se sustituyen las seis mediciones anteriores de HU025; esta es una regresión
nueva después de incorporar metadatos multimedia.

Advisors de seguridad mantienen los cuatro grupos previos; los seis índices
nuevos aparecen inicialmente como no utilizados. No se cambió la protección ni
los permisos de otras tablas/buckets para hacer pasar las pruebas.

Ocho capturas reales en comentarios únicos: SCRUM-111 **10155**, SCRUM-193
**10156**, SCRUM-194 **10157**, SCRUM-112 **10158**, dos imágenes por subtarea.
Lectura de `renderedBody`: ocho nombres y miniaturas resueltos. El script con
grants de carga se eliminó. Scripts, archivos QA, hashes y resultados están fuera
de Git en `HU019/HU027`. Falta enlazar commit/PR y registrar la entrega en esos
mismos comentarios, conservando las imágenes.


### Entrega de HU027

Commit funcional publicado **`aa240daec0ddb46f78caf605d00643029a70b8b9`**.
PR borrador **[#33](https://github.com/Danilo2334/PDF_Interactivo/pull/33)**
sobre `codex/scrum-38-hu026-tarjeta-interactiva` (#32). Cadena pendiente:
**#30 → #31 → #32 → #33**. Lectura de GitHub: los cuatro abiertos, borrador,
sin merge y sin conflictos. Cambiar la base del siguiente a develop solo tras
integrar su predecesor y volver a revisar diff/checks.

SCRUM-39 **En revisión**, comentario madre único **10159**. SCRUM-111,
SCRUM-193, SCRUM-194 y SCRUM-112 **Finalizado**. Sus comentarios únicos
10155–10158 incluyen commit/PR y conservan las ocho capturas resueltas;
la lectura posterior confirmó dos imágenes y el enlace al PR por subtarea.
No se crearon informes adicionales, no se modificó main ni el stash.

Se continúa **HU028 / SCRUM-40**, mini quiz opcional, desde una rama descendiente
de HU027. Mantener el borrador y las respuestas correctas restringidos al
propietario; aprobación explícita de cada versión y conservación de la anterior.
Omitir el quiz no debe bloquear el refuerzo. Su publicación se integra en HU032.
La producción local continúa en puerto 3000 hasta el cambio controlado a dev.

## 2026-10-28 — HU028 / SCRUM-40: mini quiz opcional y revisión privada

Se continúa desde HU027, en `codex/scrum-40-hu028-mini-quiz`, sin integrar
los PR #30–#33. Se conserva el stash `d6406e0` y la configuración privada.

La decisión crear/omitir es expresa y se guarda con control de versión. No se
llama a IA por abrir el panel ni por omitir. Cada generación pide exactamente
una, dos o tres preguntas y crea una versión privada pendiente. La fuente es
una versión inmutable del refuerzo seleccionado: título, texto y conceptos
literalmente presentes, sin PDF completo, otros refuerzos ni recursos multimedia.
El panel privado se carga bajo demanda; sus respuestas correctas no aparecen
en el HTML inicial del proyecto.

Migración **20261028123759_optional_reinforcement_quizzes.sql**, aplicada una vez
y reconciliada: versiones inmutables, cabecera de elección/revisión, eventos y
trabajos con RLS de propietario. Operaciones firmadas por servidor, comprobación
de sesión activa, propiedad y documento vigente; escrituras directas revocadas.
UUID y hash de entrada hacen idempotente cada operación. Máximo dos trabajos
simultáneos por cuenta, diez en cinco minutos y arrendamiento de 120 segundos.
El trabajador caducado o cuya fuente cambió no puede guardar una respuesta tardía.

La revisión reutiliza `OwnerReviewPanel` de HU024 con cabecera independiente del
refuerzo. Aprobar requiere casilla expresa y registra versión, propietario y
fecha. Editar/regenerar crea otro borrador; descartar no elimina la aprobación
anterior. Omitir no bloquea aprobar el refuerzo. La publicación del quiz se
integra en HU032; no se afirma que esa publicación esté implementada aquí.
SCRUM-114 depende además de validar preguntas/respuestas en HU029 y excluir
borradores/rechazados de la publicación en HU032: permanece pendiente de esas
comprobaciones, aunque su revisión privada ya se haya probado.

### Calidad de IA: fallos reales y correcciones

Se usa **gemini-3.5-flash-lite**, configuración de servidor existente, nivel
gratuito, sin activar pagos, cambiar modelo ni recurrir a otro proveedor.
La documentación oficial del modelo confirma salida estructurada y nivel gratuito.
La primera generación real sobre conservación de energía produjo tres preguntas
con respuestas y citas coherentes. Su regeneración de dos preguntas mantuvo la
aprobación anterior, pero introdujo el distractor externo «materia»; se corrigió
mediante edición explícita, sin aprobar esa salida original.

En el refuerzo de agua, una primera pregunta tenía respuesta/cita correctas pero
distractores sobre precipitación, filtración y calentamiento global que no estaban
en la fuente. Una segunda, tras ajustar el prompt y restringir vocabulario,
invertía una negación sobre el alcance del esquema. **Ambas quedaron sin aprobar
y se descartaron**. Sus capturas se conservan como diagnóstico, no como pruebas
de calidad aprobada.

Por estos hallazgos se añadió una barrera conservadora de vocabulario para todas
las opciones de IA, incluidos distractores. Ignora mayúsculas/acentos y admite
palabras funcionales; los términos de contenido deben aparecer en título, texto
o conceptos. Puede rechazar paráfrasis válidas y no demuestra corrección semántica.
No limita las correcciones expresas del propietario.

Después se ejecuta una **segunda evaluación independiente y acotada** con Gemini:
contrasta enunciado, negaciones, alcance, opciones, índice correcto, explicación y
cita con la misma fuente. Debe confirmar una única respuesta y coincidir con el
índice propuesto; si falla, no se guarda esa versión. No repara ni reintenta por
su cuenta y nunca aprueba. Dos llamadas como máximo por generación: hasta 45 s
para generar y 30 s para revisar; espera del cliente 90 s y lease de 120 s.
La revisión humana sigue siendo necesaria: ni el vocabulario ni otro modelo
constituyen una garantía absoluta de exactitud pedagógica.

También se corrigió un aviso de aprobación que permanecía visible cuando otra
sesión creaba un borrador posterior. El mensaje se vincula ahora a versión,
elección y decisión. Prueba real: versión 3 aprobada, edición HTTP normal a 4
pendiente, actualización visual sin aviso antiguo y versión 3 conservada; después
se descartó 4. No hubo aprobación silenciosa de la nueva versión.

### Verificación real y estado de entrega de HU028

**335/335 pruebas automatizadas**, lint y build de producción/TypeScript
aprobados. Después de ajustar el tiempo de evaluación y evitar mensajes de error
duplicados se repitieron los doce casos afectados, lint y build. PGlite acredita
idempotencia, bloqueo/concurrencia, firmas, RLS, límites, trabajador caducado,
fuente cambiada y conservación de la aprobación anterior. Los fallos de cuota y
contexto insuficiente se comprobaron con simulaciones de proveedor; no se presentan
como incidentes reales de la cuenta gratuita.

Pruebas sobre los proyectos y cuentas QA ya existentes, sin credenciales en
capturas ni en Git:

- Energía `b9ffc509…`: generación real de tres preguntas (versión 1), aprobación
  explícita; regeneración real de dos mediante dos peticiones concurrentes de la
  misma operación (**200/202**), un solo trabajo. Se canceló únicamente el cuerpo
  de la respuesta 200 después de persistir y su reenvío devolvió el mismo trabajo.
  La versión aprobada 1 permaneció intacta. Edición correctiva → versión 3
  pendiente, aprobación explícita de 3, edición posterior → 4 pendiente y descarte
  de 4. Aprobación conservada: `4b356f05-1aca-4b7d-80aa-fb573d5d158a` (quiz 3).
- Agua `167fe954…`: omitir y actualizar conservó la decisión sin crear preguntas.
  Sus versiones 1 y 2 defectuosas se descartaron. La evaluación independiente se
  probó directamente con la salida real archivada de la versión 2: Gemini rechazó
  la negación invertida. En esta prueba técnica se reprodujo la salida archivada
  de generación y **solo la evaluación hizo una llamada real**; no insertó filas
  ni sustituye la prueba completa de la aplicación.
- Dos operaciones completas posteriores acabaron en timeout de la evaluación
  con límite inicial de 15 s, sin crear nuevas versiones. Se amplió a 30 s
  manteniendo límites finitos. La nueva operación HTTP normal
  `95c84d2e-8c02-4687-aa06-9c03bd14b016` completó generación y evaluación en
  **29 773,9 ms**, guardó **una pregunta, quiz 3 pendiente**, modelo
  `gemini-3.5-flash-lite`, fuente `5b7df6e1-4e1f-4fb4-89e6-d676bd8169a9`.
  Revisión manual: pregunta por las dos etapas que ilustra el recurso; respuesta
  evaporación y condensación, otros alcances incompletos/incorrectos, explicación
  y cita coherentes. No afirma representar todo el ciclo. Se reabrió en navegador
  y continuó pendiente, con aprobación desactivada hasta confirmar la casilla.
- Resumen `deeb737f…`: edición normal del título → versión 4 pendiente, elección
  explícita omitir sobre esa fuente y aprobación real del refuerzo. Mismo registro
  publicado y mismo texto educativo; cero preguntas y cero trabajos IA para ese
  quiz. Título QA actual: «QA HU028 · Resumen aprobado sin mini quiz». Así se
  comprobó que omitir no bloquea aprobar; su futura publicación de proyecto
  corresponde a HU032.
- HTTP real: sin sesión **401**, otra cuenta **404**, otro documento o versión
  de otro refuerzo **409**, origen ajeno **403**, cantidad 4 y aprobación sin
  confirmación **400**. Las cuatro tablas privadas devuelven cero filas a la
  cuenta ajena; UPDATE directo denegado (**42501**). HTML inicial sin claves de
  respuestas del quiz. Las pruebas de UI/SQL no reemplazan estas comprobaciones.
- Editor móvil **390×844 CSS**, ancho documental **390**, DPR 1,25, abierto con
  Enter y campos recorridos con Tab. Cancelar no guardó cambios. Cero errores de
  consola observados; viewport y visibilidad restaurados. Cierre/reapertura y
  cambio a página 2 conservaron fuentes y quizzes separados.
- Comprobación de conservación: **35 solicitudes / siete publicaciones**; los
  31/cuatro registros anteriores a HU024 permanecen idénticos. Ambos PDF conservan
  SHA-256 `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`
  y `b0bc1809351f249bd352032fbcdd193846e4c44e4199cf4bfbfec24326b71302`.

Once capturas reales cargadas para comentarios únicos: dos SCRUM-113, dos
SCRUM-195, cuatro SCRUM-196 (incluye diagnóstico identificado de la negación
defectuosa y resultado final corregido) y tres SCRUM-114. Scripts, PDFs, cuentas,
salidas originales y capturas diagnósticas adicionales permanecen fuera de Git,
en `HU019/HU028`. Los scripts temporales con grants se eliminaron después de
usar cada carga. Falta vincularlas y registrar commit/PR en los comentarios.

Documentación oficial consultada:
[modelo y salida estructurada](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
y [precio/nivel gratuito](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite).
No se activó facturación. La evaluación automática reduce errores observados,
pero se conserva la revisión expresa del propietario antes de aprobar.

### Entrega de HU028

Commit funcional **`8c843e56ab0008d7e36a134d87d5673c734a72ae`**, publicado en
**[PR #34](https://github.com/Danilo2334/PDF_Interactivo/pull/34)**, borrador sobre
`codex/scrum-39-hu027-recursos-multimedia` (#33). GitHub confirmó abierto,
sin merge y sin conflictos. Cadena pendiente **#30 → #31 → #32 → #33 → #34**.

SCRUM-113 **Finalizado**, comentario único **10160**, dos imágenes;
SCRUM-195 **Finalizado**, **10161**, dos imágenes;
SCRUM-196 **Finalizado**, **10162**, cuatro imágenes;
SCRUM-114 **En curso**, **10163**, tres imágenes y dependencias HU029/HU032
explícitas. SCRUM-40 sigue **En curso**, resumen madre único **10164**.
Lectura posterior de `renderedBody`: once nombres de archivo/miniaturas resueltos,
un comentario por subtarea y enlace al PR en todos. No se duplicaron evidencias.

Se continúa **HU029 / SCRUM-41** desde esta rama: administrar opciones, respuesta
correcta y reintentos, persistir una nueva versión privada y validar con HU030
que el lector no reciba la clave antes de responder. La producción local sigue
en puerto 3000. Quiz de energía: 4 descartado y 3 aprobado conservado; quiz de
agua: 3 pendiente sin aprobación automática; resumen QA: quiz omitido y refuerzo
4 aprobado. Son datos QA, no estados inventados por SQL. No modificar main,
integrar PR nuevos automáticamente ni alterar el stash.

## 2026-10-28 — HU029 / SCRUM-41: configuración privada del mini quiz

Rama `codex/scrum-41-hu029-configuracion-quiz`, desde la entrega documentada de
HU028 (`f4654ba`). Se reutilizan sus contratos, API, versiones inmutables y RLS;
**no requiere otra migración ni llamadas nuevas a IA**.

El editor precarga enunciado, opciones, respuesta y explicación, permite agregar
hasta cinco opciones, retirarlas conservando al menos dos y cambiar su orden con
botones de teclado. La respuesta correcta sigue la identidad de la opción al
moverla o retirar una anterior. Retirar la opción marcada deja la pregunta sin
respuesta seleccionada, muestra un aviso y bloquea guardar; no elige otra por el
propietario. Opciones vacías/duplicadas, texto vacío y clave ausente/fuera de rango
se rechazan también en servidor.

La casilla «Permitir reintentos al responder el mini quiz» guarda un booleano
por versión. Cada cambio crea un borrador pendiente; no altera el quiz aprobado
ni su regla. Cuando el borrador actual está descartado y existe una aprobación
de la misma fuente, «Editar quiz aprobado conservado» permite usar esa aprobación
como base de otro borrador, sin regenerar con IA. Su escritura usa la versión
actual de cabecera como comparación, sin reescribir la versión aprobada antigua.

### Comprobaciones reales de HU029

**338/338 pruebas**, lint y build de producción/TypeScript aprobados. Se añadieron
casos sobre identidad de la respuesta al reordenar/retirar, límites de opciones,
reintentos y rechazos de configuración antes de mutar la base. Revisión React:
controles nativos etiquetados, actualizaciones inmutables, estado local preservado
en conflictos y sin nuevas dependencias ni consultas al abrir el panel.

Producción autenticada, proyecto QA digital existente:

- Quiz de agua `167fe954…`, desde versión 3: se retiró la correcta y se observó
  aviso sin selección automática y botón guardar desactivado. Agregar una opción
  vacía también lo bloqueó. Se añadió de nuevo la respuesta, retiró otra opción,
  movió la correcta y editó enunciado/explicación. Orden persistido de versión 4:
  «La totalidad del ciclo del agua» / «La evaporación y la condensación» /
  «Solo la evaporación», correcta **índice 1**. Pregunta: «Según este refuerzo,
  ¿qué dos etapas se muestran en el esquema?». Explicación y cita acordes al
  alcance de las dos etapas, sin afirmar que representan el ciclo completo.
- Se guardó **quiz 4 pendiente, reintentos true**, reabrió con los mismos campos
  y aprobó expresamente. Aprobación conservada:
  **`05092a69-f076-4955-a23f-3cd196d90b0b`**, 2026-10-28T18:34:29.494604Z,
  propietario QA `15abf825…`.
- Con el editor 4 abierto y un enunciado local sin guardar, otra sesión HTTP
  normal guardó **quiz 5 pendiente, reintentos false**. El navegador conservó
  el texto local, avisó de la nueva versión y bloqueó guardar. «Cargar versión
  actual del quiz» recuperó expresamente el enunciado válido y false. Recarga
  completa y reapertura conservaron versión 5, opciones, índice, explicación y
  false; aprobación 4/true intacta. No se guardó el texto local de diagnóstico.
- En el editor, al reducir temporalmente de tres a dos opciones, ambos botones
  «Retirar opción» quedaron desactivados. Se canceló ese cambio sin crear versión.
- Quiz de energía `b9ffc509…`: desde 4 descartado, se abrió la aprobación 3 como
  base, editó solo el título y guardó **5 pendiente**, reintentos false. La
  aprobación **`4b356f05-1aca-4b7d-80aa-fb573d5d158a`** (quiz 3) quedó intacta;
  ninguna llamada a IA ni aprobación automática. El estado anterior «4 descartado»
  permanece en el historial, actualizado cronológicamente por esta prueba.
- HTTP real: enunciado/explicación vacíos, una sola opción, opción vacía/duplicada,
  clave ausente, índices múltiples o índice inválido → **400**; versión antigua
  → **409**; escritura de otra cuenta → **404**. Sin insertar versiones ni cambiar
  cabecera/aprobación. Se comprobó antes y después de existir la aprobación 4.
  HTML inicial del proyecto sin la clave de respuestas; esto aún no demuestra
  la proyección ni calificación del lector de HU030.
- Móvil **390×844**, documento de ancho **390**, DPR 1,25, teclado y foco visibles;
  cero errores de consola observados. Se restauraron viewport y visibilidad.
  35 solicitudes, siete publicaciones y los 31/cuatro anteriores intactos;
  ambos SHA-256 originales coinciden con HU028. No se cambió el contenido del PDF.

Nueve capturas reales cargadas: dos para SCRUM-115, dos SCRUM-197, dos SCRUM-198
y tres SCRUM-116. Scripts y resultados en `HU019/HU029`, fuera de Git; grants
temporales eliminados. Falta vincularlas en comentarios únicos y registrar el PR.

SCRUM-198 conserva un pendiente expreso de **HU030**: comprobar que la clave y
explicación reservada no llegan al lector antes de enviar su intento, y evaluar
en servidor. No se declara terminada esa parte por haber probado el editor o
el HTML inicial privado. HU028/SCRUM-114 sigue esperando la exclusión de borradores
y rechazados en publicación de HU032. Se continuará HU030 sin integrar los PR.

### Entrega de HU029 y ajuste del orden de integración

Commit funcional **`4533c49166ece7595d695fcc8cba4e5f590120d4`**, publicado en
**[PR #35](https://github.com/Danilo2334/PDF_Interactivo/pull/35)**, borrador sobre
`codex/scrum-40-hu028-mini-quiz` (#34). GitHub confirmó abierto, sin merge y sin
conflictos. Cadena **#30 → #31 → #32 → #33 → #34 → #35**.

SCRUM-115 **Finalizado**, comentario único **10165**, dos imágenes;
SCRUM-197 **Finalizado**, **10166**, dos imágenes;
SCRUM-198 **En curso**, **10167**, dos imágenes y pendiente de lector/HU030;
SCRUM-116 **Finalizado**, **10168**, tres imágenes.
SCRUM-41 **En curso**, resumen madre único **10169**. Se verificaron en
`renderedBody` los nueve archivos/miniaturas y enlaces al PR, sin duplicar comentarios.
SCRUM-114 conserva su comentario **10163**, actualizado con la validación de
configuración de HU029 y el pendiente de publicación; mantiene sus tres imágenes.

Al leer el requisito completo de **HU030 / SCRUM-42**, Jira establece expresamente
«Orden de integración: después de configurar el quiz en HU028–HU029 y disponer
de la publicación y acceso del lector de HU032–HU033». Exige lectores reales desde
un enlace publicado y vigente, con identificación opcional. Por ello se actualiza
la intención anterior de continuar inmediatamente HU030: implementar primero
**HU031 → HU032 → HU033**, luego verificar/integrar los intentos de **HU030**.
No se presentará una simulación privada del propietario como acceso del lector.

HU031 reutilizará visor, tarjetas, multimedia y quiz en una vista privada del
propietario; sus intentos de prueba no deben alterar resultados reales. Su
comparación con el lector publicado queda pendiente de HU032–HU033. HU032 exige
un despliegue HTTPS mínimo (SCRUM-226), versiones aprobadas fijadas y enlace único;
no basta el localhost para finalizarla. No se han creado publicaciones externas
ni activado servicios de pago. La producción local sigue en 3000 con HU029.

## 2026-10-28 — HU031 / SCRUM-43: vista previa privada de la experiencia

Rama `codex/scrum-43-hu031-vista-previa`, desde `0617858` (entrega documentada
de HU029). No añade migraciones, dependencias ni llamadas de IA. La evaluación
de respuestas es determinista en servidor; no se consulta Gemini para calificar.

Se reutilizan `PdfViewer`, `ReinforcementCard`, `VisualResource`, `SummaryResource`
y los recursos multimedia existentes. `QuizPlayer` recibe solo título, opciones,
enunciados y regla de reintentos; nunca recibe índice correcto ni explicación
reservada en su carga inicial. Después de enviar se muestra resultado, correcta/
incorrecta, respuesta y explicación. Se reutilizará su presentación con el lector
real, manteniendo separado el ciclo de intentos persistidos de HU030.

La vista previa obtiene los cambios **guardados**, incluidos borradores propios,
sin exigir publicación. Distingue borrador de contenido aprobado. Una explicación
generada sin revisión preparada puede verse privadamente sin crear cabecera de
revisión por GET. El quiz corresponde a la misma solicitud y versión del refuerzo;
omite quizzes descartados o con elección «omitir», conservando la aprobación
anterior compatible. No mezcla fuentes. Las consultas se paginan explícitamente.

`GET /api/projects/[projectId]/preview` exige sesión activa, rol autorizado,
propiedad y documento vigente. `POST` en la misma ruta comprueba origen y obtiene
otra vez el quiz autorizado; una versión/fuente que ya no corresponde devuelve
409. **Ambos son de solo lectura**: no crean trabajos, revisiones, intentos ni
resultados. No se habilitó acceso anónimo a rutas privadas ni se cambiaron RLS.

El editor permanece montado y oculto mientras se prueba la experiencia; su visor
y lecturas periódicas quedan pausados. El encabezado con renombrar/reemplazar/
eliminar se oculta en el modo previo. Un botón en los controles del visor permite
entrar desde la página activa; desde otros paneles se ofrece la misma acción.
Volver restaura sección, página, zoom, selección, posición y formularios locales.
Los cambios locales sin guardar no se presentan como guardados en la vista previa.

### Verificación y correcciones observadas

**344/344 pruebas automatizadas**, lint y build de producción/TypeScript
aprobados. Se actualizaron los dobles de prueba del workspace para el nuevo
componente y se añadieron proyección sin clave, calificación de solo lectura,
aislamiento, paginación y conservación del borrador. Tras el acceso desde el visor
se repitieron 54 casos afectados; tras corregir el retorno del panel, 27 casos,
lint y build. No se actualizaron Node/Next ni las dependencias.

Resultados reales en producción autenticada:

- Proyecto digital: **ocho refuerzos en vista previa**, uno en borrador privado,
  y dos quizzes asociados. Hay **siete refuerzos aprobados en `reinforcements`**;
  esto no equivale todavía a un enlace público de experiencia de HU032.
  Los quizzes de energía 5 y agua 6 son borradores propios; las aprobaciones
  anteriores siguen separadas.
- Carga inicial del quiz sin clave/explicación; HTTP **401** sin sesión, **404**
  otra cuenta en lectura/evaluación, **409** documento cambiado o quiz ajeno,
  **403** origen ajeno y **400** respuesta incompleta. La evaluación devuelve
  solo la retroalimentación posterior. Consultas HTTP antes/después conservaron
  todos los registros leídos.
- Prueba de agua con reintentos bloqueados (quiz 5): respuesta incorrecta,
  **0/1**, explicación posterior, controles de opciones deshabilitados y sin
  botón de reintento. Luego se guardó por HTTP normal del propietario **quiz 6
  pendiente con reintentos true**, para probar la otra configuración; aprobación
  4 `05092a69-f076-4955-a23f-3cd196d90b0b` intacta. Este cambio de fixture QA
  ocurrió **antes** de guardar la línea base de las pruebas visuales.
- Quiz 6 en vista previa: respuesta correcta **1/1**, reintentar limpió selección
  y retroalimentación, segunda respuesta incorrecta **0/1**. Las respuestas de
  prueba no cambiaron estado ni versiones. Tras esas operaciones y navegar/
  consultar multimedia, comparación profunda de **diez tablas** idéntica:
  solicitudes, refuerzos, cabeceras/versiones de revisión, cabeceras/versiones/
  eventos/trabajos de quiz, tarjetas y multimedia. Las 36 solicitudes corresponden
  al total de la cuenta QA en ambos proyectos; **35** pertenecen al digital.
  No se afirma haber contrastado tablas de resultados de HU030 aún no implementadas.
- Conservación del editor: página **2**, zoom **125 %**, zona rectangular,
  categoría, observación y texto manual sin enviar. Antes/después:
  **x=0, y=2171,199951171875**, desplazamiento horizontal
  **0,800000011920929**, selección y todos los campos idénticos. No se envió
  la solicitud temporal. Una segunda prueba conservó íntegra una edición local
  del título del quiz al navegar por otra página en vista previa; el texto local
  no se incluyó en la experiencia guardada y se canceló después sin guardarlo.
- Fallo real corregido: cerrar «Refuerzos» dentro de la vista previa regresaba
  a página 1 al perder la posición. Ahora guarda/restaura el punto de lectura.
  Caso repetido: página **2**, **125 %**, antes/después **x=0,
  y=1883,199951171875, horizontal=0**. Ambas aperturas/cierres conservaron página
  y posición exactas. Este ajuste no cambia el regreso independiente al editor.
- Se consultaron las páginas 1 y 2, tarjetas y diagrama, imagen privada PNG
  **640×360** decodificada y referencia HTTPS existente. Sin controles de agregar/
  retirar recursos, guardar tarjeta o configurar el quiz en modo previo. Esta
  regresión visual acredita imagen y enlace visible; no se presenta como otra
  reproducción de MP4, ya comprobada en HU027.
- Móvil **390×844 CSS**, ancho documental **390**, DPR 1,25, foco/teclado y quiz
  de lectura sin clave anticipada. PDF escaneado: estado vacío correcto, sin
  inventar refuerzos. Cero errores de consola; viewport/visibilidad restaurados.
- Ambos SHA-256 originales coinciden con HU028. Siete refuerzos aprobados,
  35 solicitudes digitales y los 31/cuatro registros anteriores conservados.

Diez capturas reales cargadas: SCRUM-119 dos, SCRUM-201 tres, SCRUM-202 tres,
SCRUM-120 dos. Scripts, línea base, comparaciones y salidas en `HU019/HU031`, fuera
de Git. Grants temporales eliminados. Falta vincular capturas y registrar commit/PR
en los comentarios únicos. El servidor local queda ejecutando producción en 3000.

**Pendiente expreso de SCRUM-120 / HU031**: comparar con la experiencia realmente
publicada tras HU032–HU033, comprobar exclusión de borradores en ese enlace y
volver a contrastar que las pruebas privadas no alteran intentos/resultados
persistidos cuando exista HU030. No finalizar la historia por estas pruebas
privadas. Se continúa HU032 y su despliegue HTTPS mínimo; sin merges automáticos.

### Entrega de HU031

Commit funcional **`3594c817625df20799f4dee953beadc76d982d2f`**, publicado en
**[PR #36](https://github.com/Danilo2334/PDF_Interactivo/pull/36)**, borrador sobre
`codex/scrum-41-hu029-configuracion-quiz` (#35). GitHub confirmó abierto, sin merge
y sin conflictos. Cadena **#30 → #31 → #32 → #33 → #34 → #35 → #36**.

SCRUM-119 **Finalizado**, comentario único **10170**, dos imágenes;
SCRUM-201 **Finalizado**, **10171**, tres imágenes;
SCRUM-202 **Finalizado**, **10172**, tres imágenes;
SCRUM-120 **En curso**, **10173**, dos imágenes y comparación publicada pendiente.
SCRUM-43 **En curso**, resumen madre único **10174**. Lectura posterior confirmó
diez archivos/miniaturas y enlaces al PR, un comentario por subtarea.

Se continúa **HU032 / SCRUM-44**, después HU033 y HU030 según las dependencias
de Jira. Los siete registros actuales de `reinforcements` son refuerzos aprobados
dentro del workspace privado; todavía no existen enlaces públicos de experiencia.
Para las pruebas siguientes: quiz de agua **6 pendiente / true**, **4 aprobado /
true** conservado; energía **5 pendiente / false**, **3 aprobado / false** conservado;
resumen `deeb737f…` aprobado 4 con elección omitir. No publicar los borradores
6/5 ni los descartes del historial. Mantener control de propietario y aprobación
fija en la futura publicación. Servidor de producción local en 3000.

## 2026-10-28 — HU032 / SCRUM-44: versión privada preparada; despliegue en espera

Se continúa desde HU031, rama `codex/scrum-44-hu032-publicacion-enlace` sobre
`ec2082c`, sin merges de la cadena #30–#36. **El propietario pidió esperar antes
del despliegue** al preguntar si ya se publicaría. No se ha desplegado, creado
hosting, habilitado facturación ni publicado ningún enlace de experiencia.

La consulta de las conexiones confirmó Vercel y Render bajo la cuenta de
Francisco, sin proyecto PDF Interactivo en Vercel. No se usaron ni modificaron
esos entornos. Para SCRUM-226 falta conectar el hosting de Danilo y acordar el
despliegue. Esa configuración permanece pendiente; las pruebas siguientes son
de producción **local**, no acreditan acceso externo ni certificado HTTPS.

Implementación de preparación:

- Migración **`20261028232413_immutable_experience_publications.sql`** aplicada
  una vez y reconciliada con el historial remoto. Se creó inicialmente con la
  CLI; se conservan todas las migraciones anteriores. La caché local de la CLI
  queda ignorada en `.gitignore`.
- `experience_publications` almacena versiones privadas inmutables del contenido,
  su SHA-256 y la identidad del PDF original. Conserva la ruta privada del objeto;
  **no duplica ni modifica los bytes del PDF**. Las escrituras solo pasan por un
  RPC con firma de servidor, dominio de operación, caducidad, usuario activo,
  propietario, documento actual y bloqueo del proyecto. Lectura RLS propia;
  sin lectura/escritura anónima, sin inserción/actualización directa autenticada.
- Un único statement selecciona las versiones aprobadas de refuerzos, recursos
  aprobados de esa misma versión, tarjetas compatibles y el quiz aprobado de
  esa fuente. Una edición pendiente no sustituye el quiz aprobado; omitir lo
  excluye. No se preparan explicaciones privadas sin aprobación ni descartes.
- El recibo del propietario devuelve títulos, páginas y cantidades; no claves
  correctas, explicaciones privadas, citas del quiz ni rutas de Storage. La
  instantánea completa solo es privada. La futura proyección de lector de HU033
  debe volver a excluir esas claves; no reutilizar el JSON privado en el navegador.
- Preparar es idempotente por operación y conserva versiones anteriores. La
  base de publicación requiere confirmación explícita y origen HTTPS configurado
  en servidor; no toma Host/X-Forwarded-Host ni produce URLs de localhost.
  El token se crea una sola vez al publicar. Una preparación anterior a otra
  nueva no se puede publicar por accidente.
- `PUBLICATION_ORIGIN` y `PUBLICATION_HTTPS_VERIFIED` son exclusivamente de
  servidor y **siguen sin habilitarse**. No establecer la verificación hasta
  implementar HU033, desplegar el commit correcto y probar realmente el enlace,
  PDF, recursos y aislamiento por HTTPS. Todavía no existe la ruta pública de
  lectura de HU033; este avance prepara su fuente, no acredita el lector.
- Panel de publicación bajo demanda, lista del contenido fijado, confirmación,
  estado privado y botón bloqueado cuando falta el entorno publicado. Copiar
  enlace y confirmación final tienen código, pero **no se probaron con una URL
  publicada real** y no se dan por finalizados.

Verificaciones:

- **348/348** pruebas automatizadas tras incorporar API, instantánea PostgreSQL
  aislada, origen, permisos y regresiones del workspace; lint y build/TypeScript
  correctos. En el primer pase faltaba registrar PublicationPanel en dos fixtures
  VM de tests: se corrigieron sus mapas de dependencias. No se atribuyen esos
  16 fallos iniciales al producto.
- En el proyecto digital se preparó por UI la versión privada **1**, id
  `8af492b6-64e5-495e-a689-342bdaab1485`. Su hash conservado es
  `a287c600d5fd4905a5dd806433e6114aa79e919aa75b07fe2e1847672f1fc0c8`.
  Contiene **7 refuerzos / 2 recursos / 2 quizzes**. Energía fija el quiz aprobado
  **3**, `4b356f05-1aca-4b7d-80aa-fb573d5d158a`; agua fija el aprobado **4**,
  `05092a69-f076-4955-a23f-3cd196d90b0b`. No copia los borradores **5/6** ni la
  explicación nativa de la solicitud personal `1201c3a3…`.
- Se preparó la versión **2**, id `d87b6877-c681-4efa-af0f-549fddc14c79`,
  cancelando únicamente la lectura de su respuesta HTTP después del 200 del RPC
  confirmado. Consulta de BD acreditó la persistencia **antes** del reintento;
  este devolvió el mismo ID y una sola fila. La primera instantánea/hash y seis
  tablas de refuerzos/revisión/quiz/multimedia permanecieron idénticas.
- Proyecto escaneado: versión privada **1**, id
  `45d33e4d-13c5-4fde-ad5e-8affa90b7a67`, **0/0/0**; identidad diferente a la
  digital. Ambas sin token, fecha de publicación ni URL. Recarga y reapertura
  de UI recuperan la versión digital 2 y la escaneada 1.
- HTTP real: **401** sin sesión GET/POST, **404** otra cuenta GET/POST,
  **409** documento cambiado, **400** sin confirmación, **403** origen ajeno,
  **503** al intentar publicar sin HTTPS configurado. RLS otra cuenta devuelve
  cero filas; actualización directa y firma inválida fallan **42501**. No se
  crearon estados públicos ni se falseó un dominio para aprobar la prueba.
- En PostgreSQL **aislado** se probaron URL/token, repetición de publicación,
  preparación antigua, aprobación/omisión, cambios posteriores y bloqueo de
  alteración. Su dominio `isolated.example` es solo un fixture del contrato,
  **no un despliegue ni evidencia real de acceso HTTPS**.
- Prueba móvil **390×844**, ancho documental **375** sin desbordamiento.
  Fallo visual detectado: acción flotante del PDF sobre el panel. Corregida
  suprimiendo esa acción mientras se revisa la publicación, conservando el mismo
  visor y limitando la supresión al documento actual. Repetición real: cero
  acciones flotantes al abrir, una al cerrar; consola sin errores. Después del
  ajuste: **37 casos afectados** y otros **23 del workspace** con nueva regresión,
  lint y otro build correctos. Viewport restaurado.
- Los SHA-256 de ambos PDF originales coinciden con HU028/HU031. Siguen las
  **35 solicitudes digitales**, siete refuerzos y los 31/cuatro registros de
  la línea base anterior sin cambios. No hubo llamadas de IA ni consumo nuevo.
- Asesores de seguridad: mismos cuatro grupos anteriores; ninguna advertencia
  nueva para las tablas/funciones de publicación. No se desactivó RLS ni controles.

Scripts y salidas en `HU019/HU032`, fuera de Git. Se conservan las capturas reales
de preparación, recarga, estado vacío, móvil y bloqueo HTTPS. Los archivos con
grants de carga se eliminan tras usarlos. Se actualizarán los comentarios únicos
de las subtareas con las imágenes y el PR de este avance.

**Pendientes expresos**: despliegue pausado por el propietario, acceso de hosting
de la cuenta correcta, HU033 lector, URL real única/resolución externa,
confirmación/copia real, certificado/recursos y prueba de cambios posteriores en
ese enlace. SCRUM-203/204/122/226 y la historia permanecen **En curso**. No dar
por terminado HU032, HU031/SCRUM-120, HU029/SCRUM-198 ni HU028/SCRUM-114 por estas
pruebas de preparación. No activar las variables de publicación ni hacer merges
para sortear los pendientes. El stash `d6406e0` sigue intacto.

### Entrega de la preparación de HU032

Commit funcional **`75b697e26df02e5c4a22016fb954eee603b9c15a`**, publicado en
**[PR #37](https://github.com/Danilo2334/PDF_Interactivo/pull/37)**, borrador sobre
`codex/scrum-43-hu031-vista-previa` (#36). GitHub confirmó abierto, sin merge,
sin conflictos. No se ha desplegado ni habilitado la publicación.

SCRUM-121 **Finalizado**, comentario único **10175**, cuatro capturas reales
(preparación, recarga, vacío y móvil corregido). SCRUM-203 **En curso**, **10176**;
SCRUM-204 **En curso**, **10177**; SCRUM-122 **En curso**, **10178**;
SCRUM-226 **En curso**, **10179**, una captura del bloqueo real. Lectura posterior
confirmó los cinco archivos/miniaturas y un comentario por subtarea, enlazado
al PR. La historia permanece **En curso** con resumen madre único **10180**.

El servidor queda en producción local, puerto 3000. Próximo trabajo: preparar
HU033 a partir de estas instantáneas privadas, sin activar su acceso público ni
desplegar mientras el propietario pide esperar. Después de acordar hosting,
desplegar y probar el lector real; completar HU030 y los pendientes cruzados
con intentos reales. No sustituirlos con la vista previa ni pruebas aisladas.

## 2026-10-28 — HU033 / SCRUM-45: lector implementado y comprobación local privada

Alcance confirmado por el propietario: **continuar HU033 y las pruebas locales,
sin desplegar todavía**. Rama `codex/scrum-45-hu033-acceso-lector` desde
`8f72713`, sobre la preparación de HU032 / PR #37. No se hicieron merges,
despliegues de la aplicación, altas de hosting ni activación de pagos. El stash
`d6406e0` se conserva y `.env.local` no se modificó.

### Implementación y separación de permisos

- `/read/[token]` y `/api/read/[token]` implementan la entrada del lector, la
  identificación y la entrega de PDF/multimedia. El servidor exige la publicación
  realmente publicada y más reciente del proyecto, origen HTTPS verificado,
  documento actual, propietario activo y coincidencia con la instantánea. Una
  publicación privada, retirada, sustituida o de documento eliminado no debe
  permitir lectura ni entrega directa de archivos.
- El servidor necesita **`SUPABASE_SERVER_KEY`** privada (secret key o legacy
  service_role del mismo proyecto) para leer la publicación y firmar los archivos
  privados sin una sesión del propietario. **No está configurada**: solo se
  comprobó su ausencia, no se imprimió, solicitó por chat, generó ni recuperó una
  clave. No usar la publishable key como sustituto ni desactivar RLS. La
  publicación permanece bloqueada también cuando falta esta configuración,
  aunque alguien configure el origen HTTPS.
- Proyección explícita y validada del lector: títulos, contenido aprobado,
  selección sin identificador privado de documento, recursos y preguntas/opciones.
  Usa identificadores derivados opacos; no serializa usuario/proyecto/documento,
  solicitud, versión privada, rutas de Storage, clave correcta, explicación de
  evaluación ni citas privadas del quiz. Recursos visuales y resúmenes pasan por
  sus esquemas. No se reutiliza directamente la instantánea privada como DTO.
- Cada acceso al contenido o al archivo vuelve a verificar vigencia/propiedad/
  documento y, cuando corresponde, identificación. Storage sigue privado; URL
  firmada **30 segundos**, solo en servidor, sin redirecciones y con timeout.
  Proxy entrega rangos, `no-store`, `nosniff`, CORP same-origin y no-referrer.
  Las páginas de lectura no se indexan ni envían el enlace como Referer.
- Migración **`20261029003154_reader_identification_setting.sql`** aplicada una
  vez y reconciliada con el historial remoto. El nombre UTC del archivo es del
  día 29; esta sesión corresponde al **28 de octubre en Bogotá**. Añade la opción
  de identificación a la instantánea/recibo, por defecto false para versiones
  anteriores. La configuración se elige al preparar una versión, no modifica
  silenciosamente versiones ya fijadas. Reusar una operación con otra opción
  devuelve conflicto. No se añadieron permisos anónimos ni políticas más amplias.
- Nombre o correo son **declarados**, no autenticados ni verificados. No crean
  cuenta ni conceden permisos de propietario. Cookie firmada, HttpOnly, Lax,
  ligada a la publicación y con caducidad de **30 minutos**; Secure en HTTPS.
  No guarda el nombre/correo en texto, logs o BD. La participación y atribución
  persistida de HU030 siguen pendientes y no se simulan con este formulario.
- El lector reutiliza PDF.js/visor mediante una fuente de archivo explícita,
  conserva zoom/página/posición y permite abrir tarjetas, diagramas, resúmenes,
  recursos y fuente original. No monta componentes ni acciones de edición,
  aprobación, creación, retirada o publicación. Los quizzes muestran preguntas/
  opciones sin revelar claves; **todavía no permiten enviar respuestas**, y la
  UI lo dice. No se presentan esas preguntas como intentos reales de HU030.

### Límite y alternativa de comprobación

La revisión automática **rechazó el comando que activaba un acceso temporal QA
sin sesión**, indicando únicamente «bloqueado por política». No se reintentó su
activación ni se modificaron controles para evadir el rechazo. El mecanismo de
leases/flags temporales se retiró por completo del código final; no quedó un
modo de acceso anónimo alternativo ni un almacén global de credenciales.

Se implementó una alternativa más restringida:
`/projects/[projectId]/reader-test/[publicationId]`, con API bajo la misma ruta
privada. **Exige la sesión y permiso del propietario en cada petición**, incluida
identificación, contenido y archivo. Usa la misma proyección/visor del lector,
desde una versión preparada y aprobada. Aviso visible: «Prueba privada del lector
con sesión del propietario. No acredita acceso anónimo ni publicación HTTPS».
Se abre desde «Probar lectura privada de esta versión». Ese prefijo privado
no se acepta como token en la ruta pública.

**No confundir** los resultados visuales siguientes con una publicación pública.
El acceso anónimo positivo, la despublicación real y la vigencia de un enlace
externo siguen sin ejecutarse. El contrato de esos casos se probó aisladamente.

### Resultados reales en producción local

- **356/356** pruebas automatizadas; lint sin advertencias y build de producción
  con TypeScript correctos. Tras el bloqueo adicional por configuración del
  servidor: **45/45 casos afectados**. Se recompiló después del ajuste final de
  mensajes de conexión/validación, sin actualizar dependencias ni Node.
- Preparaciones QA digitales: **3**, id
  `3a57562d-64ee-4e2c-b81e-90192a093e99`, identificación true; **4**, id
  `f8bd2826-1385-47d7-8199-6cd6f9bc34b1`, false. Ambas **7 refuerzos / 2 recursos /
  2 quizzes aprobados**, conservando energía 3 y agua 4, no los borradores 5/6.
  No tienen token, URL ni fecha de publicación. Preparaciones anteriores,
  instantáneas y hashes íntegros. Los reintentos de estos fixtures reutilizan
  sus UUID; no crean versiones adicionales.
- Versión 4: lectura privada directa sin formulario. Versión 3: muestra
  formulario, bloquea PDF directo **403**, rechaza datos vacíos **400**, acepta
  nombre QA y también correo QA sin nombre, y conserva la identificación tras
  recarga. La cookie de identificación sola, sin sesión propietaria, **no abre**
  esa prueba privada: **401**.
- Sin sesión: contenido/archivo privados **401**; otra cuenta: contenido,
  archivo e identificación **404**; recurso ajeno **404**. Intentos HTTP de
  publicación, eliminación, tarjeta y aprobación de quiz solo con cookie de
  identificación: todos **401**, sin mutaciones. Página privada devuelve
  redirección **307** al login. Ruta pública sin publicación y su PDF/identificar:
  **404**; no se fabricaron flags públicos ni estados para obtener un 200.
- PDF digital privado, con y sin identificación: SHA-256
  `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`.
  `Range: bytes=0-63` devuelve **206**, 64 bytes, `bytes 0-63/1580`; rango múltiple
  rechazado **416**. PNG real **6424 bytes**, decodificado en UI **640×360**;
  referencia HTTPS visible y diagrama de agua consultable. No se afirma otra
  reproducción de MP4 ni un envío de respuestas del quiz.
- Proyecto escaneado: instantánea privada 1 sin refuerzos. Estado vacío real;
  SHA-256 `b0bc1809351f249bd352032fbcdd193846e4c44e4199cf4bfbfec24326b71302`.
  Pedir su ruta de archivo con el ID opaco de la imagen digital devuelve **404**:
  no se mezclan archivos/documentos.
- Navegación real páginas 1/2, tarjetas y teclado. Al cerrar el panel, conservación
  exacta: página **2**, zoom **125 %**, **x=0, y=2011,199951171875**, horizontal
  **0**. Misma instancia del visor. Móvil **390×844 CSS**, ancho documental
  **375**, sin desbordamiento; viewport restaurado. Consolas observadas vacías
  incluso en las variantes de error esperadas.
- Comparación profunda de **diez tablas** antes/después idéntica (solicitudes,
  refuerzos, revisión, versiones/eventos/trabajos de quiz, tarjetas y recursos).
  Siguen las **35 solicitudes digitales**, siete refuerzos, los 31/cuatro
  registros de la línea base anterior y ambos originales intactos. No hubo
  llamadas de IA ni consumo nuevo. Asesores: mismos cuatro grupos previos,
  sin nueva advertencia atribuida a esta migración.

Diez capturas reales: SCRUM-123 dos; SCRUM-205 tres; SCRUM-206 dos;
SCRUM-124 tres. Scripts/salidas en `HU019/HU033`, fuera de Git; grants de carga
eliminados tras subir. Se registrarán en un comentario breve por subtarea, sin
duplicar las evidencias anteriores.

**Estado correcto**: SCRUM-45 y SCRUM-123/205/206/124 **En curso**. Falta la
prueba anónima positiva sobre publicación vigente, configuración privada del
servidor/HTTPS cuando se autorice, despublicación y cambios posteriores reales,
además de participación HU030/opiniones habilitadas. No finalizar historias ni
los pendientes cruzados de HU028/HU029/HU031 por esta prueba privada. Mantener
HU032 bloqueada para publicación; no desplegar, fusionar ni habilitar pagos.
