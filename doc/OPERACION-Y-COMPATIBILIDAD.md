# HU046 — operación y compatibilidad

Proyecto Danilo2334/PDF_Interactivo; SCRUM-58, Sprint7 activo. Corte de consulta:
01/11/2026, America/Bogota. Esta matriz registra objetivos y cobertura; una fila
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

| Navegador | Versiones concretas consultadas | Sistema de prueba | Estado real |
| --- | --- | --- | --- |
| Chrome | 156.0.8078.80 y155.0.8059.85 | Windows del equipo local | Pendiente en esas versiones exactas; instalado156.0.8078.48. |
| Edge | 156.0.4314.58 y155.0.4283.62 | Windows del equipo local | .58 instalado, recorrido formal pendiente;155 no disponible en la sesión. |
| Firefox | 159.0 y158.0.1 | Windows del equipo local | Pendiente; instalado88.0, que no satisface la matriz. |
| Safari | 27.2(20625.2.8) y26.6(20624.4.5) | macOS/iOS compatible, equipo real por registrar | No hay dispositivo Apple ni sesión de Safari disponible. Pendiente. |
| Navegador integrado | UA reducido Chrome156.0.0.0,Win32 | Windows del equipo local | Recorridos reales anteriores en HU038–HU045; cobertura complementaria. No sustituye las cuatro marcas/versiones. |

Fuentes oficiales consultadas, conservadas también fuera de Git en HU046-REAL:

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

Intento de abrir Edge con perfil QA separado desde terminal: rechazado por el
control automático con «blocked by policy», sin detalle adicional. No se repitió
el comando ni se declaró el navegador probado. La herramienta de navegador
habilitada solo ofreció IAB yMCP Apps. Se preservaron las ventanas personales.
