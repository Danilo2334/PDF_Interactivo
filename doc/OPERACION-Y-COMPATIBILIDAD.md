# HU046 — operación y compatibilidad

Proyecto Danilo2334/PDF_Interactivo; SCRUM-58, Sprint7 activo. Corte de consulta:
02/11/2026, America/Bogota. Esta matriz registra objetivos y cobertura; una fila
pendiente no constituye compatibilidad aprobada ni evidencia de ejecución.

Equipo disponible: Microsoft Windows11 Home Single Language,10.0.26200,
build26200. Versiones instaladas obtenidas de ProductVersion de los ejecutables,
no de un user agent modificado. No hay resultado real de Safari en este equipo.

## Matriz de navegadores y actualización

La cobertura objetivo es N/N−1: las dos ramas mayores estables generales más
recientes de escritorio, con su último parche publicado. Se excluyen Beta,
Nightly y Early Stable. Las actualizaciones dentro de una rama se registran
sin sustituir la prueba de la rama anterior. Cada fila conserva el pendiente
de ejecución real; la política no cambia un resultado no ejecutado en aprobado.

Revalidación del02/11 tras integrar PR #48–#62: las fuentes oficiales de Google,
Microsoft, Mozilla y Apple conservan las versiones objetivo de la tabla. La
entrada Edge de02/11 es Android/iOS; no sustituye el parche Stable de escritorio.
ProductVersion sigue siendo Chrome156.0.8078.74, Edge156.0.4314.58 yFirefox88.0,
en Windows11 10.0.26200. No se instaló ni actualizó un navegador.
El inventario de control sigue ofreciendo IAB y MCP Apps, sin una sesión de
navegador de marca conectada. No se operó la ventana personal de Chrome ni se
repitieron los intentos previamente rechazados. Esta revalidación documental
no añade una regresión ejecutada a149/231 ni una prueba táctil física a137.

| Navegador | Versiones concretas consultadas | Sistema de prueba | Estado real |
| --- | --- | --- | --- |
| Chrome | 156.0.8078.80 y155.0.8059.85 | Windows del equipo local | Pendiente en esas versiones exactas; ProductVersion instalado156.0.8078.74 al02/11. No acredita la versión activa ni una prueba ejecutada. |
| Edge | 156.0.4314.58 y155.0.4283.62 | Windows del equipo local | .58 instalado, recorrido formal pendiente;155 no disponible en la sesión. |
| Firefox | 159.0 y158.0.1 | Windows del equipo local | Pendiente; instalado88.0, que no satisface la matriz. |
| Safari | 27.2(20625.2.8) y26.6(20624.4.5) | macOS/iOS compatible, equipo real por registrar | No hay dispositivo Apple ni sesión de Safari disponible. Pendiente. |
| Navegador integrado | UA reducido Chrome156.0.0.0,Win32 | Windows del equipo local | Recorridos reales anteriores en HU038–HU045; cobertura complementaria. No sustituye las cuatro marcas/versiones. |

Fuentes oficiales consultadas el01/11 y contrastadas de nuevo el02/11; se
conservan también fuera de Git en HU046-REAL y HU046-SUPERVISION-20261102:

- [Chrome Stable de29/10](https://chromereleases.googleblog.com/2026/10/stable-channel-update-for-desktop_02107719452.html)
  y[rama155 de15/10](https://chromereleases.googleblog.com/2026/10/stable-channel-update-for-desktop_01886704284.html).
  Las publicaciones indican pares .79/.80 y.84/.85 para Windows/Mac. El catálogo
  VersionHistory también lista157 Early Stable; no se presenta como despliegue
  estable general. Registrar la versión completa del ejecutable realmente usado.
- [Edge Security Updates](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnotes-security):
  .58 de30/10 y.56 de29/10. La página funcional Stable llevaba .56 y no sustituye
  el parche de seguridad posterior. Rama anterior155:155.0.4283.62,16/10.
- [Mozilla product details](https://product-details.mozilla.org/1.0/firefox_versions.json)
  confirma159.0;[notas oficiales](https://www.firefox.com/en-US/releases/)
  y[158.0.1](https://www.firefox.com/en-US/firefox/158.0.1/releasenotes/).
  El historial stability incluye ESR: no elegir las primeras filas por fecha
  como si fueran las últimas ramas Release.
- [Safari Release Notes, Markdown oficial](https://developer.apple.com/documentation/safari-release-notes.md):
  27.2 publicado26/10 y26.6 publicado27/07. La actualización27.1 es de23/10 dentro
  de la rama27. La página indexada por el buscador
  conservaba contenido anterior; se consultó directamente la fuente actual.

Actualizar antes de cada liberación y cuando el proveedor publique un estable:
registrar fecha/fuente, versión completa, arquitectura y sistema operativo real;
añadir la fila nueva, conservar el resultado anterior y repetir los flujos
críticos. No marcar una versión como probada por cambiar user agent, emular su
viewport o ejecutar WebKit/Chromium genérico. Un fallo crítico o una fila exigida
sin evidencia bloquea la declaración de compatibilidad y la entrega definitiva.

Flujos por cada fila: acceso/aislamiento, carga PDF válido/dañado y progreso,
primera página, texto/zona, navegación/zoom y restauración tardía, dificultad y
solicitud, diagnóstico/recomendación/generación aprobada, texto/diagrama,
imagen/MP4, publicación/retirada, lector autorizado, quiz/resultado/reintento,
teclado/foco y consola. Para cada caso registrar resultado observado, URL QA sin
tokens en el informe, fixture, versión/OS, fecha, captura nativa y correlación de
errores. Un ensayo privado no acredita acceso de lector público.

## Métricas, fuentes y límites

| Magnitud | Fuente vigente | Uso correcto |
| --- | --- | --- |
| Listado disponible≤3s | SCRUM-146,comentario10078 | Medición de recarga hasta vista utilizable; no TTFB aislado. |
| Primera página PDF2,02MB≤5s | SCRUM-146,comentario10078 | Equipo/red/caché y tamaño documentados; no todo el PDF renderizado. |
| Primera página PDF19MB≤10s | SCRUM-146,comentario10078 | Reutilizar sus9 mediciones reales; no trasladar el límite a la API. |
| Panel Refuerzos≤3s | Criterio incorporado por el propietario en SCRUM-108 | Incluye consulta y contenido visible; excluye generación IA. |
| Disponibilidad histórica,tasa de errores,latencia API | No hay SLO/ventana/umbral acordados en esas fuentes | Registrar muestras; mantener pendiente la alerta de degradación. No inventar99,9% ni extrapolar una muestra a un mes. |

`/api/health` es liveness público, sin consultas de dependencias. Muestra solo
estado, fecha y revisión Git válida embebida al construir con `APP_BUILD_REVISION`.
No expone variables ni acredita por sí solo Supabase, Storage, IA o lectura.

`web/scripts/check-operations.mjs` verifica el QA de Danilo con cliente anónimo
independiente: login200, ruta privada→login, PDF privado401, origen ajeno403 y
liveness/revisión esperada. Solo acepta el origen QA nombrado; `--local` permite
explícitamente loopback para pruebas. No sigue redirects externos ni usa cookies
personales; no envía quizzes, publica ni consume IA. El POST probado se rechaza antes
de toda escritura. Una petición por caso, presupuesto técnico de15s por petición,
sin reintentos automáticos. Ese timeout no es un SLO ni un límite RNF aprobado.

El reporte registra muestras, tiempo HTTP por caso,p50,p95,máximo, porcentaje de
respuestas y de comprobaciones fallidas. Los401/403 esperados no son incidentes.
Una respuesta/redirect/revisión que viola el contrato genera `alerts` y salida1:
detener liberación, conservar reporte y buscar su referencia en los registros.
No copia cuerpos, cookies, nombres ni textos privados. El workflow manual
`.github/workflows/operations-qa.yml` ejecuta el comprobador y falla el job ante
un incidente. No se ha instalado un servicio externo ni un cron de pago; un
workflow manual no constituye vigilancia continua ni entrega de notificaciones
comprobada. SCRUM-232 sigue pendiente de esa configuración y de SLO explícitos.

### Registro por series y alertas de contrato — 02/11/2026

`web/scripts/monitor-operations.mjs` reutiliza esos cinco contratos. Cada
ejecución crea un directorio nuevo y conserva `samples.jsonl`, `events.jsonl`,
`summary.json` y `summary.md`. No sobrescribe resultados anteriores. Registra
fechas, revisión esperada, tiempos HTTP, estados y referencias de diagnóstico;
no guarda cuerpos, cookies, claves ni mensajes arbitrarios del proveedor.
Solo consulta el QA nombrado y exige un SHA completo constante durante la serie.

La primera violación de contrato abre un incidente por operación; las siguientes
no duplican el aviso. El primer resultado correcto posterior lo recupera con el
mismo ID. Un fallo anterior sigue invalidando el resultado acumulado aunque el
último sondeo sea correcto. Esta política deriva del bloqueo de liberación ya
implementado en86dec12/check-operations.mjs; no redefine los límites RNF de interfaz
ni incorpora un SLO de latencia, disponibilidad o tasa de errores.

La serie es finita: 1–1440 sondeos, espera de15–3600s entre el fin de uno y el
inicio del siguiente, sin solapamientos ni reintentos HTTP automáticos. Valores
de operación, no umbrales de aceptación RNF. Cada ejecución mantiene sus propios
incidentes: no se promete deduplicación global entre procesos. Antes de cada
espera se escribe un resumen incompleto; una interrupción o fallo de persistencia
no puede dejar una serie parcial presentada como aprobada. Salida0 exige todos
los sondeos correctos y finalización;1 indica una comprobación fallida;2 indica
configuración, persistencia o ejecución incompleta.

Ejemplo de ejecución manual, con destino nuevo fuera de Git:

```powershell
$env:QA_EXPECTED_REVISION='<SHA completo del código que ya está en QA>'
$env:QA_MONITOR_DIR='<directorio nuevo dentro de una carpeta de evidencias existente>'
$env:QA_MONITOR_SAMPLES='3'
$env:QA_MONITOR_INTERVAL_SECONDS='15'
node web/scripts/monitor-operations.mjs
```

El workflow manual permite1/3/6 sondeos, publica el resumen de job y conserva
los archivos como artifact durante7d incluso si el sondeo falla. upload-artifact
v4 fijado a ea165f8d65b6e75b540449e92b4886f43607fa02, verificado en el repositorio
oficial. No se configura un cron ni se da por comprobada una notificación humana.
El repositorio es público; el artifact contiene únicamente los datos sanitizados
descritos, nunca una sesión o contenido de usuarios.

Bloqueo concreto del workflow remoto: la rama por defecto es main y el archivo
operations-qa.yml no está allí (GET oficial404 al02/11). GitHub exige ese archivo
en la rama por defecto para habilitar workflow_dispatch; no basta con subirlo a
esta rama. No se hizo merge ni se cambió main para sortear ese requisito.
Fuentes: [evento workflow_dispatch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)
y [resúmenes de job](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary).

Prueba real del02/11, QA con revisiónc4508f2:3 sondeos/15 contratos correctos,
0 incidentes, p50 HTTP310,17ms, p95 y máximo2206ms. Son15 observaciones de contrato,
no disponibilidad de un mes ni tiempos de renderizado. La prueba separada con
SHA esperado000…000 llamó al QA real, registró un incidente liveness_revision
CONTRACT_MISMATCH y salida1. Ese20% de comprobaciones fallidas fue deliberado
(1de5); no fue una caída del servicio. No se modificaron respuestas o despliegues.
La deduplicación, recuperación, interrupción y saneamiento de datos se verifican
en pruebas automatizadas, sin presentarlas como una alerta real recibida.

El02/11 se detectó una ventana nativa de Chrome y se intentó restaurarla para
ampliar SCRUM-231. La revisión automática de Computer Use detuvo el control al
no poder determinar con certeza su URL. No se continuó la automatización UI,
no se ejecutó el recorrido y no hay captura nueva de aceptación de navegador.
Se preservan las evidencias anteriores. SCRUM-149/231/232 y HU046 siguen En curso
por la cobertura, vigilancia continua, notificación y SLO aún pendientes.

## Verificación y reversión del QA

Destino exclusivo: equipo `danilo-carlosamas-projects`, proyecto
`prj_pRui4rYL9DnbERflhyhplv2mIoJ3`, dominio
`https://pdf-interactivo-qa.vercel.app`. Hobby, sin conectar Git ni activar pagos.
Ninguna orden de este procedimiento cambia main ni autoriza merges.

Antes de desplegar: árbol limpio; identificar SHA, revisar diff,pruebas,lint,build;
guardar el deployment previo y comprobar por CLI equipo/proyecto/estado/alias.
Exportar fuente desde Git; excluir .env.local, credenciales,fixtures privados y
capturas. Conservar las8 variables QA; no copiar las claves IA locales.
Pasar `--build-env APP_BUILD_REVISION=<SHA completo verificado>` para el liveness.

Después del despliegue ejecutar el comprobador con `QA_EXPECTED_REVISION` igual
al SHA fuente. Comprobar consola/lector y casos afectados en navegador: el sondeo
anónimo no sustituye los recorridos autenticados. No aprobar solo porque el build
del hosting terminó. Una comprobación crítica fallida detiene la liberación;
un fallo real de datos/seguridad o pérdida de contenido exige retirar exposición
y revisar alcance, no reintentar sin límite.

Reversión: inspeccionar de nuevo el deployment anterior de ESTE proyecto;
usar CLI oficial `vercel rollback <deployment anterior> --yes --scope
danilo-carlosamas-projects`. Comprobar que el alias estable apunta al deployment
correcto y ejecutar el sondeo nuevamente. Para un deployment anterior sin health
usar `--legacy`, registrar esa limitación y comprobar la identidad por CLI.
No falsear una revisión ni usar un proyecto de otra cuenta para hacer pasar el
sondeo. Tras la prueba, promover la versión comprobada con `vercel promote`
solo dentro del QA autorizado y repetir el sondeo con revisión exacta.

Revertir aplicación no revierte datos. La migración de recibos HU045 es aditiva;
el código anterior no la utiliza y las filas confirmadas se conservan. No ejecutar
DROP, migraciones inversas, restauración de base ni cambio de secretos como parte
de la reversión. Ante una futura migración incompatible, bloquear promoción y
preparar una corrección hacia adelante o un plan de datos explícito antes de actuar.

Este apartado es el procedimiento; los resultados reales de su ejecución se
registrarán al final con SHA/deployments/reporte. No se presenta como prueba ya
realizada ni se finaliza HU046 con la matriz pendiente.

## Ejecución real del01/11/2026

Código `86dec12e467fad5e270bead9d3ce0e7a7d0a166a`:432/432 pruebas,lint ybuild.
Exportación Git limpia; construcción en Vercel con revisión embebida, Node22,
máquina basic de2 cores/8GB. Se conservó equipo/proyecto ylas8 variables QA;
no se subieron claves IA ni se activó facturación. No hubo llamadas IA enHU046.
CLIautenticada accedió al candidato protegido; no se desactivó Deployment
Protection ni se expuso su credencial. Ese acceso autenticado no se contó como
prueba de acceso público.

| Fase real | Resultado de sondeo anónimo | Máximo HTTP observado |
| --- | --- | --- |
| Baseline anterior,4 casos,sin health |4/4,0 fallos |2289,07ms |
| Candidato,5 casos,revisión exacta |5/5,0 fallos |2057,96ms |
| Revisión esperada deliberadamente incorrecta |Salida1,alerta CONTRACT_MISMATCH solo en liveness_revision |586,38ms |
| Reversión al anterior,4 casos,sin health |4/4,0 fallos |1866,92ms |
| Promoción final del candidato,5 casos,revisión exacta |5/5,0 fallos |1691,78ms |

Anterior:`dpl_9tJhQ9A1TywXaXiCmi7JEEwqkLDV`,
`pdf-interactivo-d5rpy73ay-danilo-carlosamas-projects.vercel.app`, código e3dfd023.
Candidato y estado final:`dpl_8BYoFrHQJppTM331CDQBHuZoubHQ`,
`pdf-interactivo-bxjqz38es-danilo-carlosamas-projects.vercel.app`, código86dec12.
Se comprobó por CLI que el alias estable volvió al anterior y quedó finalmente
en el candidato. El anterior carece de/api/health: por eso el sondeo de reversión
usa explícitamente4 contratos y su identidad se verifica por deployment, no
mediante una revisión inventada en el endpoint.

La revisión incorrecta fue una inyección controlada en el PARÁMETRO del sondeo;
no se desplegó una aplicación rota ni se simuló una respuesta. El20% de esa
muestra son1/5 comprobaciones fallidas deliberadas, no una tasa real de errores
del servicio. El código de salida1 permite detener la liberación. La reversión
y posterior promoción se ejecutaron realmente por CLI, sin merges ni SQL inverso.

El panel privado siguió autenticado después de ambos cambios. Indicadores reales
del documento digital:12 visitas,49 aperturas,13 intentos y4 opiniones, conservados.
Capturas nativas01/02/03 y reportes reales enHU046-REAL fuera deGit. El endpoint
fue comprobado también por el cliente anónimo contra el dominio estable.
Estos resultados no acreditan compatibilidad de las8 versiones, vigilancia24/7,
notificaciones recibidas ni objetivos de degradación aún no acordados.

## Condiciones concretas para completar lo pendiente

- SCRUM-149/231: acceso verificable a las ocho versiones de marca de la matriz,
  con perfiles QA separados y un sistema Apple real para Safari. Registrar
  sistema, versión activa y resultado observado de cada flujo; el IAB no los
  sustituye. No cerrar la compatibilidad ni declarar aprobadas filas pendientes.
- SCRUM-137: completar la selección y envío de claridad con un gesto táctil.
  Registrar dispositivo o emulación utilizados; el criterio Jira exige el
  control táctil, sin fijar un modelo de hardware. Ratón, teclado y viewport
  móvil por sí solos no acreditan el gesto. No declarar hardware físico si
  únicamente se ha usado emulación.
- SCRUM-232: acordar SLO/ventana/umbral para degradación y el destino de avisos,
  y disponer de un ejecutor continuo comprobable. El workflow solo manual y
  presente en develop no acredita vigilancia24/7 ni notificación recibida.
  Mantener los contratos y límites RNF vigentes; no inventar umbrales API.
- SCRUM-233: dominio/remitente de correo autorizado y verificado en el proveedor
  SMTP, configuración privada en Supabase y prueba de recuperación real. No
  solicitar claves por chat ni reducir la seguridad para sortear el bloqueo.
- SCRUM-236: Finalizado tras completar también la comprobación visual pública
  móvil, según la ejecución posterior documentada abajo. Se conservan las
  capturas locales, públicas de escritorio/móvil y todas las versiones aprobadas.

El candidato de código revisado esbaf41bec85b0ea42394d2b2230ca3197a0ce28a4,
develop después de #62. Inicialmente se preparó sin desplegar. Posteriormente
el propietario autorizó expresamente actualizar únicamente este QA con ese SHA;
la ejecución y sus límites quedan registrados a continuación.

Intento de abrir Edge con perfil QA separado desde terminal: rechazado por el
control automático con «blocked by policy», sin detalle adicional. No se repitió
el comando ni se declaró el navegador probado. La herramienta de navegador
habilitada solo ofreció IAB yMCP Apps. Se preservaron las ventanas personales.

## Ejecución QA autorizada del02/11/2026 — SCRUM-236

Autorización literal: «Sí, actualizar únicamente el QA con baf41be». Fuente
exportada desde Git y ZIP contrastado; mismo proyecto/equipo de Danilo, raíz web,
Node22 y ocho variables QA existentes. Sin enlace Git, pagos, cambios en main,
nuevas claves ni llamadas IA. La CLI oficial autenticada comprobó el candidato
protegido sin desactivar Deployment Protection y después promovió el alias QA.

| Identidad | Valor comprobado |
| --- | --- |
| Fuente | baf41bec85b0ea42394d2b2230ca3197a0ce28a4 |
| Deployment final | dpl_5P2Cy4EMS9hpKAKXqvTg3RFV9TzZ |
| Alias | https://pdf-interactivo-qa.vercel.app |
| Anterior disponible para reversión | dpl_GXtWpykpve985kw6ipvqg5nZtb2B |

Sondeo anónimo real después de promover, con revisión exacta:

| Contrato | HTTP | Tiempo observado |
| --- | --- | --- |
| Login |200 |948,64ms |
| Página privada |307 |184,27ms |
| PDF privado |401 |589,63ms |
| Escritura desde origen ajeno |403 |361,97ms |
| Liveness/revisión |200 |178,48ms |

5/5 aprobados, máximo948,64ms. Es una muestra de contratos, no una prueba de
disponibilidad permanente ni un SLO. Reporte qa-live-health-check.json fuera deGit.

Se publicó temporalmente el fixture sintético QA-SCRUM236-agua, con un único
visual aprobado v2 y dos escenas anotadas. Acceso anónimo real, PDF/versión
aprobada idénticos, sin IDs privados en la respuesta; apertura, recarga,
cierre/reapertura, zoom125% y ampliación mediante teclado comprobados. Sin
errores de consola antes de la retirada. Las capturas05/06 muestran las escenas
frente al original;11 muestra el acceso rechazado después de retirar.

Viewport390×844: panel derecho359,20px dentro del ancho útil375px, sin desborde
del panel; navegación por teclado comprobada. Las capturas de ese viewport
salieron incompletas/inconsistentes y se excluyeron de Jira. No se declara
aprobada la comprobación visual pública móvil ni una prueba táctil física.

La publicación temporal1b7586f0-ea71-43cf-a4d0-9748e6d7ab71 quedó unpublished:
lector y PDF404, sin publicación pública actual. Se conservaron aprobación,
contenido y PDF1334B, SHA-256
0c9af69fde08b476c25801b079ffd456466afe0f55116869d7b37f3e4913f909.
La sesión personal no se utilizó ni se invalidó; el cliente backend QA usó una
cuenta sintética y cookies solo en memoria. No se publica el enlace-capacidad.

## Cierre visual móvil del02/11/2026 — SCRUM-236

Se identificó una diferencia de escala en la captura: Page.getLayoutMetrics
reportaba390×844 en cssLayoutViewport y488×1055 en layoutViewport. El recorte
provenía de la captura con escala de Windows125%, no de un desborde del panel.
Emulation.setDeviceMetricsOverride mantuvo el diseño390×844 con deviceScaleFactor1
y scale0,8 únicamente para la imagen del navegador. Se esperó el diseño estrecho
estable y se capturó directamente Page.captureScreenshot; sin recomponer,
agrandar o modificar imágenes ni código. Referencia del parámetro:
[CDP Emulation](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setDeviceMetricsOverride).
El override se retiró al terminar. No se modificó la escala global de Windows.

Mismo QA baf41be, sin otro despliegue. Se republicó temporalmente la misma
publicación QA v1 y el mismo visual aprobado v2. El enlace retirado anterior
siguió rechazado; el flujo normal entregó el enlace vigente, omitido de informes.
Evaporación, condensación, anotaciones y explicaciones visibles, título completo
y panel dentro del ancho disponible. Ampliar habilitó región de276px con960px
de contenido; foco y flechas movieron80px. Volver al ancho, zoom125%, cerrar y
reabrir conservaron el estado esperado; tras recargar se recuperaron las dos
ilustraciones aprobadas. Consola final sin errores.

Las capturas móviles03-lector-movil-explicaciones.jpg,
04-lector-movil-condensacion.jpg y06-lector-movil-retirado.jpg son390×844,
reales de la aplicación. Se inspeccionaron y cargan en el visor de Jira.
Se conservan las capturas defectuosas fuera de Git, excluidas de aceptación.
Esta prueba acredita diseño estrecho y teclado; la pantalla táctil física137
y las marcas/versiones149/231 siguen pendientes.

Retirada final mediante el flujo normal: lector/PDF404, ninguna publicación
pública actual, mismo SHA-256, contenido y aprobación. SCRUM-236 Finalizado;
comentario10242 único con12 adjuntos, incluidos los9 anteriores intactos.
La frase editorial del fixture aprobado se conserva sin reescribir su historial.

## Pendientes reales después del cierre visual

| Frente | Tareas | Requisito aún no acreditado |
| --- | --- | --- |
| Claridad táctil | HU040/SCRUM-52,137 | Selección y envío con gesto táctil completo; registrar dispositivo o emulación utilizados. |
| Compatibilidad | HU046/SCRUM-58,149/231 | Sistemas/versiones concretos de la matriz y recorridos completos en ocho versiones de marca, incluido Safari real. |
| Supervisión | HU046/SCRUM-58,232 | Ejecutor continuo, destino autorizado de avisos y SLO/ventana/umbrales documentados antes de configurar alertas. |
| Recuperación por correo | SCRUM-233,EP01/SCRUM-5 | Dominio/remitente SMTP autorizado y verificado, configuración privada y recorrido real de recuperación. |

La matriz documental y el inventario se conservan. No se declara probada una
marca por el resultado del IAB, ni se define un umbral nuevo como si estuviera
acordado. El workflow manual sigue en develop y no se modificó main.

## Evaluación de alertas RNF de interfaz — SCRUM-232,02/11/2026

PR #64 incorpora web/scripts/check-view-budgets.mjs. Complementa el sondeo HTTP
con la evaluación de mediciones de interfaz ya recogidas. No abre navegadores,
no mide por sí mismo una vista y no activa vigilancia o envío de avisos.
Las fuentes de presupuesto se consultaron directamente en Jira:

| Perfil | Límite | Fuente y alcance |
| --- | --- | --- |
| documents_ready |3000ms |146/comentario10078, recarga hasta listado utilizable. |
| pdf_first_page_2_02mb |5000ms |146/10078, escenario de referencia2,02MB/15páginas. |
| pdf_first_page_19mb |10000ms |146/10078, escenario de referencia19MB/19páginas. |
| reinforcements_ready |3000ms |108, pulsación hasta contenido utilizable, PDF ya abierto, consultas incluidas y sin generar IA. |

Los perfiles PDF deben identificarse expresamente como los escenarios RNF de
referencia; no se clasifican otros documentos por aproximación de tamaño. No
se trasladan estos límites al TTFB, latencia API o disponibilidad mensual.

Contrato de entrada: schemaVersion1, kind real/historical/simulation y1–1000
mediciones. Cada medición aporta metric, elapsedMs y context con production,
visible, authenticated, usable e includesServerQueries verdaderos,
includesAiGeneration falso y trigger reload/open-panel. Los PDF identifican
referencePdf; el panel exige pdfAlreadyOpen. Kind real requiere SHA completo
de la fuente y observedAt UTC por medición; la procedencia debe comprobarla
quien recoge la evidencia. Declarar esos campos no autentica por sí solo una
medición. Una vista de carga o un escenario no aplicable se rechazan.

La primera superación abre view_budget_exceeded; repetirla no duplica el
incidente. Una medición posterior dentro del presupuesto lo recupera con el
mismo ID. Cualquier incumplimiento anterior mantiene el resultado acumulado
no aprobado. Cada evento referencia su muestra, duración, límite y fuente Jira.
Solo se copian campos permitidos; no URLs de lectura, texto de documentos,
cookies, nombres o claves recibidos en campos adicionales.

CLI: definir QA_VIEW_INPUT como archivo JSON de mediciones y QA_VIEW_OUTPUT
como directorio nuevo dentro de la carpeta de evidencias; ejecutar
`node web/scripts/check-view-budgets.mjs`. Máximo1MiB de entrada. Guarda
samples.jsonl,events.jsonl ysummary.json; nunca sobrescribe un directorio
existente. El resumen empieza incompleto y solo se completa después de guardar
los registros. Salidas0=mediciones dentro del límite,1=incumplimiento,
2=entrada/ejecución/persistencia inválida o incompleta. El tipo de procedencia
se conserva también cuando todas las mediciones cumplen.

Ejecución real del evaluador, con datos históricos reales de146/10078:

| Serie histórica leída | Duraciones en ms | Evaluación |
| --- | --- | --- |
| Listado |804 /1300 /1295 |3/3 dentro de3000. |
| Primera página2,02MB |3548 /2853 /3039 |3/3 dentro de5000. |
| Primera página19MB |3738 /3419 /4144 |3/3 dentro de10000. |

Resultado CLI0,9 muestras,0 incumplimientos, kind historical y revisiónnull
porque la fuente no identifica el SHA de aquella medición. Son mediciones
conservadas, no recargas nuevas ni nueva prueba de disponibilidad. Las pruebas
de degradación/recuperación usan kind simulation y no representan un incidente
real del QA.471/471 pruebas ylint aprobados;6/6 dirigidas repetidas tras revisar
la limpieza segura de temporales. No cambió la aplicación servida ni se reinició
un servidor. Las salidas se conservan fuera deGit en SCRUM-232-RNF-20261102.

232 continúa En curso: falta conectar recogida operativa y comprobar el destino
de los avisos. La modalidad/cadencia y cualquier SLO API o ventana de errores
siguen por concretar; no se inventan ni se atribuyen a los límites de interfaz.
Este incremento no equivale a un servicio permanente o una notificación recibida.

## Acceso necesario para completar SMTP y compatibilidad

Se abrió el panel SMTP del proyecto Supabase correcto, solo lectura: custom
SMTP activo y host smtp.resend.com. No se leyó ni modificó su contraseña.
Resend/domains redirigió a Log in to Resend; no se pudo confirmar todavía
qué dominios/remitentes autorizados hay en la cuenta de Danilo. Inicio de sesión
personal solicitado en esa pestaña, sin claves por chat. El proveedor exige
[dominio verificado](https://resend.com/docs/send-with-supabase-smtp), y el SMTP
predeterminado de Supabase limita destinatarios a miembros del equipo y no
sustituye una recuperación general de usuarios:
[SMTP de Supabase](https://supabase.com/docs/guides/auth/auth-smtp).
No se cambió de proveedor, remitente, controles de seguridad ni facturación.

Inventario actualizado de Browser Use: IAB yMCP Apps. La apertura independiente
de Edge por la API documentada devolvió Browser is not available: edge. No se
automatizaron las ventanas personales de Chrome, instaló software o volvió a
ejecutar un comando antes rechazado. Esto no añade una regresión de marca o un
gesto táctil físico;149/231/137 conservan sus pendientes y evidencias anteriores.

Revisión de137: su criterio pide verificar ratón, teclado y pantalla táctil;
no fija hardware físico obligatorio. Para intentar resolver el gesto pendiente
se probó Input.synthesizeTapGesture, documentado por CDP, en una pantalla404 de
diagnóstico sin publicación ni datos de usuario. El puente IAB respondió que
ese método no está soportado; la observación registró cero eventos. No se volvió
a intentar dispatchTouchEvent ni la conversión ratón→táctil incompleta anterior.
Se retiraron listeners y emulaciones, y se cerró la pestaña. La limitación es
completar el gesto con las herramientas conectadas, no un fallo observado del
control. Un navegador con soporte táctil completo o un dispositivo permitiría
continuar; el resultado debería identificar claramente si usa emulación.

## Resend de Danilo: revisión autenticada del 04/11/2026

El enlace comunicado por el propietario terminó en bad_oauth_state expirado;
la consulta directa a /domains confirmó que no había sesión. Se renovó el mismo
inicio de Google con danilocarlosama96@gmail.com y se accedió al panel Resend.
El selector solo muestra el equipo danilocarlosama96. No se copiaron estados
OAuth ni credenciales a archivos de proyecto, Jira o documentación.

Observación real del equipo: No domains yet y No API keys yet. Transactional,
Marketing y Team figuran Free. Billing indica que no hay métodos de pago ni
facturas. Los extras de pago aparecen deshabilitados; no se pulsó Upgrade ni
se cambió facturación. Usage muestra 0/0 en límites diarios/mensuales, por lo
que no se da por comprobada una cuota o capacidad de envío. Vercel CLI 65.9.0,
whoami danilo2334 y equipo team_I5CBYezIIEWl8FIlhW7vqMR4: inventario de dominios
vacío, count 0 y sin página siguiente. No hubo compras ni modificaciones DNS.

Formulario preparado y sin enviar: nombre PDF Interactivo QA SMTP, permiso
Sending access y All domains, dado que el equipo no tiene dominios. No se
pulsó Add ni se generó una clave. Se pidió confirmación en el paso de creación
de una credencial persistente y para su configuración como SMTP del proyecto
Supabase zqodybtzssvqozrckfgw. No se atribuyó a esta cuenta la clave SMTP
anterior: la revisión no permite identificar su propietario y el equipo visto
no dispone de claves existentes.

Ruta gratuita de prueba propuesta: usar el remitente de prueba de Resend y
el correo del titular danilocarlosama96@gmail.com. El proveedor restringe ese
remitente a su propio correo; otros destinatarios requieren verificar un
dominio y cambiar From:
[restricción oficial de resend.dev](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
Por tanto, una eventual prueba del titular no acreditaría recuperación general.
Si el propietario dispone de un dominio en otro proveedor, falta identificarlo
y verificar el acceso DNS antes de preparar sus registros reales.

Capturas originales fuera de Git en SCRUM-233-RESEND-20261104: formulario con
permiso de envío y sin clave creada, dominios vacíos y plan Free. Se añaden
al mismo comentario 10103 de SCRUM-233, conservando las tres anteriores. Son
evidencias del proveedor y de la preparación, no un envío o recuperación
aprobados. La issue permanece En curso. No se enviaron correos, cambiaron
contraseñas, modificó SMTP o activaron pagos; la sesión Resend queda conservada.

### Configuración y prueba autorizadas del 04/11/2026

Después de la revisión anterior, el titular autorizó expresamente la creación
de PDF Interactivo QA SMTP y su uso en Supabase para probar gratis su correo.
Se creó una sola clave con Sending access; la tabla API keys confirma ese
permiso y Last used después del envío. El secreto se copió privadamente al
campo Password del SMTP, se limpió del portapapeles si aún era el mismo y se
descartó de la variable temporal. No se escribió en .env, capturas, logs o Git.

Configuración efectiva de Supabase zqodybtzssvqozrckfgw: custom SMTP activo,
smtp.resend.com:465, usuario resend, remitente onboarding@resend.dev y nombre
PDF Interactivo QA. Se guardó una vez y se recargó para comprobar persistencia.
Los campos protegidos no se desvelaron. No se cambió facturación, DNS, RLS,
autoconfirmación, permisos o controles de sesión. No hace falta desplegar la
aplicación para aplicar esta configuración de Auth.

Prueba real del QA HTTPS existente baf41be: una solicitud desde
/forgot-password a danilocarlosama96@gmail.com mostró el mensaje neutro y
Resend confirmó Delivered, asunto Reset your password, registro
01a1a4fe-f06b-75f4-aaa1-13c8f647f1b1. Se inspeccionaron únicamente origen,
ruta y destino del enlace: proyecto correcto /auth/v1/verify, tipo recovery,
callback del QA con next=/reset-password. No se registraron URLs con tokens.
La primera apertura llegó al formulario Nueva contraseña con campos vacíos.
Una segunda apertura del mismo enlace fue rechazada como inválida/expirada;
no hubo segundo envío ni reintentos automáticos. Se cerró esa pestaña negativa.

La primera pestaña válida se dejó visible al titular para completar en privado
la contraseña, su confirmación y envío, seguido del inicio de sesión. Sigue
pendiente observar ese resultado. No volver a abrir el enlace consumido:
si la sesión de recuperación caduca, solicitar un nuevo correo desde la app,
respetando los límites del proveedor y sin registrar el enlace.

La entrega al titular supera el fallo SMTP de esa prueba, pero resend.dev sigue
restringido a su correo; un destinatario distinto requiere dominio verificado.
SCRUM-233 permanece En curso hasta cubrir el alcance pendiente. Se actualizaron
el único comentario 10103 y la continuidad, preservando seis adjuntos y
añadiendo cuatro capturas reales sin secretos del envío, entrega, formulario
vacío y rechazo de reutilización. Sin pagos, nuevo deploy o cambios de código.
