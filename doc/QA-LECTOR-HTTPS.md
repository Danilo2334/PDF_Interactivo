# QA del lector HTTPS

## Actualización autorizada del recorrido — 09/11/2026, 23:53 Bogotá

QA vigente: `a1e930fd028d350f86c85a6e95a78cb6981f1939`, deployment
`dpl_7kx5PjgQJfqjQNYC1HthZRPXFX1q` READY, mismo proyecto de Danilo y alias
`https://pdf-interactivo-qa.vercel.app`. Build y cinco contratos HTTP aprobados,
incluida revisión exacta. Recorrido guiado, selección de página3, extracción,
detalle por etapas, ilustración existente y lector con explicación/quiz
comprobados en el navegador integrado. Sin llamadas IA nuevas, cambios de
publicación ni merge. Android físico pendiente. Detalle en SCRUM-237 y en la
continuidad; el estado e0152fb que sigue describe el ensayo anterior.

## Estado operativo al 09/11/2026

Ensayo nuevo completado desde carga de PDF hasta lector/quiz, con GPT real:
proyecto 7155218d-eca7-4b89-a309-ea6fa9d74125, solicitud 16215629-d928-4c8a-9a91-90d79e74e723.
Explicación y quiz revisados/aprobados; lector 2/3 persistido, cliente HTTP sin
propietario 3/3, idempotencia y nuevo envío 409. Publicación QA
6b8499ec-4b81-475b-b99f-b8e5384e2497 retirada y republicada: el enlace anterior
devuelve 404 y el actual 200; visibilidad final pública, cambio 3. Solo contiene
el fixture sintético QA-PRESENTACION-20261109, un refuerzo y un quiz.
Se conservan original e intentos. No se comparten tokens en esta documentación.

Uso del equipo visto en Vercel: 4.898/1.000.000 funciones, 150,28 MB/100 GB de
transferencia y CPU 5m41s/4h; ventana Last30Days visible. Margen amplio en esas
cuotas; no equivale a garantía de disponibilidad ni a saldo OpenAI. Contratos
públicos nuevos 5/5, regresiones críticas 20/20. Consolas sin errores observados.
No se cambió código ni se redesplegó. El registro de 06/11 que sigue conserva
los resultados anteriores, distinguidos de este ensayo nuevo.

Origen vigente: https://pdf-interactivo-qa.vercel.app, proyecto de Danilo
prj_pRui4rYL9DnbERflhyhplv2mIoJ3. Deployment READY
dpl_DCmgu6yKWuuh86PA7rPFAs2Abocv, fuente
e0152fb23a194ad587973f628afd5b37b50fd8b7. GPT configurado en servidor con la
clave existente como Secret y modelo gpt-6.1-sol. Hay trece variables en
Production: las ocho anteriores, cuatro de IA y APP_BUILD_REVISION.

Se corrigió la pérdida de APP_BUILD_REVISION al redesplegar: debe persistirse
en la configuración QA además de pasarse al construir, siempre igual al SHA
real de la fuente. Sondeo final5/5 correcto, después de conservar el fallo
inicial de revisión ausente. La sesión del propietario siguió funcionando.

Se completó el flujo positivo real: análisis suficiente, recomendaciones,
elección persistida, explicación Intermedio, revisión y aprobación explícita,
quiz de tres preguntas y publicación QA v3. Lector visual: 2/3 con explicaciones,
recarga y reintento bloqueado; cliente HTTP sin propietario: 3/3, idempotencia
y nuevo envío 409. La proyección inicial no incluye soluciones. Tras retirar
la publicación sintética, lectura/PDF/consulta/envío de intentos devuelven404.
Se conservan sus resultados y el PDF original (SHA-256 de referencia intacto).
Se verificó también contexto insuficiente desde una solicitud nueva del
escaneado: sin llamada IA ni aviso contradictorio de reintento. Suite472/472,
lint y build correctos; IAB en escritorio/móvil sin errores de consola.
El correo de recuperación del titular se verificó el04/11 hasta su nuevo
ingreso; para otros destinatarios todavía falta dominio verificado.
Detalles y referencias en CONTEXTO-PROYECTO.md y OPERACION-Y-COMPATIBILIDAD.md.

Los apartados siguientes conservan los registros históricos del arranque y
pruebas anteriores; sus ocho variables y ausencia de claves IA describen
aquellas fechas, no la configuración actual.

## Registro del 01/11/2026

Estado actual: recorrido real de lector y HU036 ejecutado en
https://pdf-interactivo-qa.vercel.app. Código `ecf721e018b6a862e7b325124e060541176fdfc5`,
deployment `dpl_CxpcaJUdiDMAdvyTw8D5YRDqjFNE` READY, Production del proyecto QA
separado de Danilo, Hobby sin activar pagos. `PUBLICATION_HTTPS_VERIFIED=true`.
Las publicaciones sintéticas se retiraron al terminar: cero públicas, siete
intentos de lector y diez prácticas privadas conservados. Sin llamadas IA.
HU030, HU032, HU033, HU036 y sus subtareas verificadas están Finalizado.
PR #46 integrado a develop en365d282; PR #47 contiene el verificador externo y
su documentación, en borrador y sin merge. El QA conserva la misma aplicación.

Las secciones de bootstrap del 31/10 describen el arranque anterior con el flag
false y acceso pendiente; no son el estado actual. El registro del 01/11 al final
actualiza esos resultados sin presentar una sesión del propietario como anónima.

Continuación local: HU034 y HU035 integradas en PR#44 y#45, después de#43.
Cadena revisada e integrada: #42→#43→#44→#45. Código acumulado:392/392 pruebas,
lint y build correctos. Ya hubo pruebas autenticadas privadas en1280/768/390px:
indicadores/tarjetas, cantidades5/2/0, miniaturas/número, posición, teclado,
gráficos, quiz y alternativas digitales/escaneado. Detectaron salto de página
tras zoom y pérdida de foco del quiz; corregidos en d340243 y repetidos con éxito
después del reingreso personal. Página2 conserva125→100→125→150%; reintentar
enfoca primera respuesta y guardar enfoca Resultado. Ensayo privado4 guardado1/1;
no es resultado de lector. Retorno móvil conserva página2, zoom100%, posición y
foco. SHA del PDF intacto; consola limpia. Ocho subtareas y HU034/HU035 Finalizado
tras la revisión e integración autorizada. Seis capturas finales adicionales en125/208/127/209/128,
con un comentario por issue y todas las anteriores conservadas. Estas pruebas
no acreditan lector anónimo. El bootstrap externo descrito abajo sí acredita la
pantalla de login por HTTPS, no el recorrido completo de publicación/lector.

## Estado actual y pendientes

| Requisito | Comprobado hoy | Acción necesaria |
| --- | --- | --- |
| Hosting de Danilo | QA READY con corrección ecf721e; sin Git automático ni Pro. | Usar CLI con equipo/proyecto explícitos. No desplegar de nuevo por cambios solo documentales. |
| Clave privada de servidor | Proporcionada privadamente por el propietario; lectura mínima aceptada200 y nueve comprobaciones de formato correctas. Ocho variables en Production. | Mantener tres variables de servidor como Secret; ninguna clave IA subida. |
| Dominio y sesión de despliegue | TLS 1.3 válido, certificado Google Trust Services, HTTP→HTTPS308, login personal conservado y carga privada real. | SMTP de recuperación sigue bloqueado en SCRUM-233; no restablecer de nuevo ni extraer cookies personales. |
| Retirada editorial | Pública→Privada→Despublicada, token nuevo al republicar, sustitución y rechazo de vista/PDF/imagen/intentos comprobados en HTTPS. | HU036 Finalizado; corrección visual revisada e integrada en365d282, sin nuevo deployment. |
| Prueba del lector | IAB real y dos sesiones HTTP independientes; además, runner GitHub externo/Linux:9 comprobaciones públicas y4 tras retirar. | HU032 y122/203 Finalizado. Prueba externa HTTP y recursos entregados; no se afirma automatizar un navegador remoto. |

El recorrido positivo se comprobó contra el hosting HTTPS, no contra localhost.
El acceso desde otro equipo se acredita ahora con el runner estándar de GitHub,
sin sesión propietaria ni claves privadas. Ejecutó un cliente HTTP y descargó los
recursos reales; la parte visual se comprobó en IAB por separado. Web y el conector
Vercel habían fallado, pero no se rebajaron criterios ni se cambiaron protecciones:
se utilizó otra máquina y otra vía de verificación. Ejecuciones al final.

## Comprobador privado — bootstrap del 31/10

Desde la raíz, con Node 22.x y el archivo privado correspondiente:

```powershell
node --env-file=web/.env.local web/scripts/check-reader-qa.mjs --bootstrap
```

Lee variables, imprime solo nombres de comprobaciones y booleanos, y termina con
código 1 si falta configuración. No realiza red, escrituras ni llamadas IA.
`--bootstrap` exige publicación bloqueada. `--publication` exige el flag true y
solo debe utilizarse después de verificar HTTPS realmente. El script no modifica
ese flag ni demuestra por sí solo titularidad de claves, TLS o acceso externo.

Resultado real con `.env.local`: cinco comprobaciones correctas y cuatro
pendientes (clave servidor, origen, URL del sitio coincidente y epoch de hosting).
El secreto de firma tiene formato correcto, el proyecto Supabase coincide y no
se detectaron las credenciales de servidor conocidas con prefijo público. No se
leyeron ni escribieron secretos remotos. La identidad de las nuevas claves secret
debe comprobarse en el proyecto; su prefijo no demuestra a qué BD pertenecen.

Preparación inicial comprobada (31/10/2026): `web/.env.qa.local`, archivo privado ignorado por
Git, con ocho variables permitidas y sin claves IA. Reutiliza la clave pública y
el secreto de firma existentes; no modifica `.env.local` ni la sesión local.
Origen/URL son `https://pdf-interactivo-qa.vercel.app`, epoch UUID generado y flag
`false`. El comprobador pasa **9/9** tras completar la clave privadamente.
Además, lectura mínima del proyecto con esa clave aceptada200. El comprobador
por sí solo no demuestra TLS ni el recorrido. Para verificar sin imprimir valores:

```powershell
node --env-file=web/.env.qa.local web/scripts/check-reader-qa.mjs --bootstrap
```

Procedimiento privado utilizado para completar la variable: entrar personalmente al
proyecto `zqodybtzssvqozrckfgw` de Supabase → Settings → API Keys y copiar una
clave secret existente (o legacy service_role del mismo proyecto) como valor de
`SUPABASE_SERVER_KEY` en ese archivo. No usar la publishable/anon, crear otra
clave, rotar la remota ni pegarla en chat/Jira. La documentación oficial:
https://supabase.com/docs/guides/getting-started/api-keys.

Se cargaron únicamente estas ocho variables al target Production del proyecto QA,
usando stdin para valores y Secret para clave servidor,secreto de firma y epoch.
No se pasaron valores en argumentos del proceso ni se imprimieron. No
copiar todo `.env.local`, ni usar `env pull` sobre él: lo sobrescribe.

Validación del comprobador: sintaxis y ESLint correctos; ensayo aislado de fases,
rechazo de HTTP/local y credencial pública, y ausencia de valores en la salida.
Esos datos de formato son ficticios y no se presentan como prueba HTTPS.
Regresión local existente de publicación/lector/intentos: **14/14** pruebas
automatizadas aprobadas (incluye PostgreSQL aislado); no son intentos reales.

## Configuración actual del proyecto QA

Proyecto separado `pdf-interactivo-qa` creado vacío, ID
`prj_pRui4rYL9DnbERflhyhplv2mIoJ3`. Ahora con un deployment READY autorizado,
sin Git asociado. Fuente exportada desde Git, no desde el checkout con secretos.
Destino confirmado: equipo `danilo-carlosamas-projects`, ID
`team_I5CBYezIIEWl8FIlhW7vqMR4`. La conexión correcta se llama **Danilo Carlosama**;
la conexión anterior llamada Vercel corresponde a Francisco y no debe usarse.
La lista de miembros confirma a Danilo como OWNER. El conector devolvió403 al
crear; después de la creación por CLI, sigue listando cero proyectos y devuelve404
al consultar ese ID. No se conoce la causa exacta del fallo del conector.
Alternativa comprobada: CLI oficial65.9.0 desde caché npm, autenticada por el
usuario mediante device login. `whoami`, creación, actualización y consulta del
proyecto correctas, siempre con equipo explícito. Cuenta/equipo Hobby.
Configuración leída de vuelta: Next.js, raíz `web`, Node22.x, `npm ci`,
`npm run build`, `previewDeploymentsDisabled=true`, `link=null`.
Antes del despliegue se confirmó cero deployments/variables. Después se cargaron
ocho variables y se creó únicamente el primer deployment aquí identificado.
Mismo ID/equipo/raíz/Node/comandos,sin Git,previews automáticas deshabilitadas.
CLI devuelve dominio `pdf-interactivo-qa.vercel.app`,verified=true,sin redirect.
Protección actual `all_except_custom_domains`, sin modificarla; el ensayo externo
debe usar el dominio Production del proyecto QA, no una Preview protegida.
`publicSource=false` no aparece en la respuesta: no se afirma persistido ese
campo. No se verificó cuota restante. Hobby activo,sin activar pagos.
No importar el repositorio ni asociar ramas ahora: eso puede iniciar despliegues.
No volver a crear el proyecto ni ejecutar `vercel` sin subcomando: puede desplegar.
Mantener la publicación deshabilitada en el primer arranque. No tocar main.

| Variable de hosting | Valor/origen requerido |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Proyecto existente `zqodybtzssvqozrckfgw`. |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Clave pública del mismo proyecto. |
| SUPABASE_SERVER_KEY | Clave secret existente o legacy service_role del mismo proyecto, exclusivamente servidor. |
| REINFORCEMENT_REQUEST_SECRET | Secreto ya existente coincidente con la BD; no generar otro. |
| PUBLICATION_ORIGIN | Origen HTTPS exacto y estable, sin ruta, parámetros ni puerto. |
| NEXT_PUBLIC_SITE_URL | Mismo origen para enlaces de autenticación. |
| PDF_INTERACTIVO_LOGIN_EPOCH | UUID estable para todas las funciones del mismo despliegue; Vercel no ejecuta el wrapper de npm start. |
| PUBLICATION_HTTPS_VERIFIED | false durante bootstrap; true solo tras verificación TLS real y autorización de la fase pública. |

No copiar `.env.local` completo. OpenAI/Gemini no son necesarios para responder
los quizzes ya guardados. No habrá llamadas nuevas de IA para este recorrido.
No reejecutar migraciones: intentos `20261029010922` y visibilidad
`20261031073708_publication_visibility_controls` ya están aplicadas y conciliadas.
Recuperación solicitada por el propietario: callback QA exacto añadido en Supabase
preservando los dos locales; Site URL global sigue localhost. Correo falló por
SMTP Resend550 en modo pruebas, registrado en SCRUM-233. No abrir permisos ni
desactivar RLS. La recuperación asistida no demuestra que el correo funcione.

Costo propuesto USD0 de hosting nuevo solo si el uso cumple Hobby personal/no
comercial y hay cuota. Se confirmó Hobby activo en la cuenta personal de Danilo;
no se ha comprobado la cuota restante ni contratado un plan para el proyecto QA.
Sin Pro, tarjetas, dominios comprados ni servicios adicionales.
[Condiciones Hobby](https://vercel.com/docs/plans/hobby).

Para probar lector sin cuenta Vercel no sirve quedarse en una Preview protegida:
Standard Protection protege las URLs de deployment y permite el dominio Production.
Ese dominio pertenece al proyecto QA separado ya desplegado; la publicación de
documentos todavía no está habilitada. No cambiar protección en cuentas ajenas.
[Protección](https://vercel.com/docs/deployment-protection).

Vercel Functions mantiene límite de cuerpo de petición/respuesta de 4,5MB; la app
admite cargas mayores. Este QA acotado usa archivos pequeños y no acredita el
límite completo de PDF/vídeo20MiB e imagen5MiB. Antes de la entrega completa,
resolver cargas grandes o elegir alojamiento adecuado; no reducir criterios para
aprobar. [Límite oficial](https://vercel.com/docs/functions/limitations).

## Datos reales disponibles, sin publicarlos

Consulta de solo lectura en Supabase, 31/10/2026, sin claves ni respuestas del quiz:

- Proyecto `QA-HU015-019-digital`, ID `3f600fbc-1b8a-4fbe-a5d1-8ac700c08585`.
  Cinco instantáneas privadas, versiones1–5, cada una con siete refuerzos y dos
  quizzes aprobados; uno permite reintentos y otro los bloquea. Cero intentos de
  lector en todas. Hay diez ensayos de propietario separados: v3=1, v4=4, v5=5.
  Verificación posterior a HU035: PDF digital1580bytes, seis instantáneas totales
  incluyendo escaneado, todas privadas y cero intentos de lector.
- V3 exige identificación; v4/v5 no. **No publicar v3 directamente**: existen
  versiones posteriores y el servidor lo impide. Para probar identificación,
  preparar la próxima versión mediante UI con esa opción, sin alterar SQL.
- Última v5 privada: `e5ddc59f-3d42-4145-a4e3-2788ef14da7a`.
- Proyecto escaneado QA: una instantánea privada vacía, sin quizzes ni intentos.
- Las solicitudes de Sol siguen privadas y pendientes de aprobación; no se
  aprueban automáticamente para completar este ensayo. Los datos anteriores bastan.
- La instantánea v5 pertenece a la cuenta QA temporal, no a la cuenta personal
  de Danilo elegida para ingresar ahora. Respetar aislamiento; no cambiar owner_id,
  copiar credenciales ni presentar una sesión distinta como si fuera la propietaria.

## Recorrido que ejecutará el agente tras habilitar el entorno

1. Fijar SHA completo y cuenta/proyecto/plan; primer arranque con publicación
   bloqueada. Verificar certificado sin excepciones, HTTP→HTTPS, cookies, login,
   PDF.js/worker, ausencia de contenido mixto y permisos de rutas privadas.
2. Tras verificar TLS y tener HU036 disponible, habilitar la fase pública del
   mismo SHA. Publicar solo el proyecto QA con confirmación explícita por UI;
   comprobar recibo, copia del enlace, versión y exclusión de borradores.
3. Abrir enlace como lector sin sesión propietaria. Verificar proyección sin
   correctIndex, explicaciones previas, claves/rutas privadas ni controles de
   edición. Responder ambos quizzes y contrastar nota con intentos del lector.
4. Recargar, doble envío, concurrencia y respuesta perdida **después de persistir**:
   recuperar el mismo intento; probar reintentos permitidos/bloqueados en servidor.
   No confundir cortar antes del envío con perder la respuesta tras el guardado.
5. Usar sesiones aisladas A/B: no basta abrir dos pestañas del mismo perfil.
   Contrastar cookies separadas y que B no recupere nota/respuestas de A; probar
   otro documento, publicación y quiz. Ensayos privados no aumentan intentos lector.
6. Preparar/publicar nueva versión QA con identificación exigida. Comprobar
   identificación declarada, sin convertirla en sesión propietaria. El enlace
   anterior y sus assets/intentos deben quedar inaccesibles tras la sustitución;
   preparar sin publicar no equivale a sustituir.
7. Retirar mediante HU036 real y confirmada. Enlace, PDF, multimedia y operaciones
   de una pestaña ya abierta deben ser rechazados; cero inserciones nuevas y notas
   anteriores conservadas. No usar SQL, borrar proyecto ni fingir retirada.
8. Escritorio, móvil, teclado, recarga, consola, SHA del PDF y contenido original.
   Capturas originales sin secretos; actualizar el único comentario de resultados
   de cada subtarea afectada y mantener evidencias anteriores. Cerrar solo criterios
   observados. Dejar la publicación QA retirada al terminar.

Orden de cierre: SCRUM-226 (HTTPS), SCRUM-122/203/204 (publicación), SCRUM-123/
124/205/206 (lector), SCRUM-117/118/199/200 (intentos), más los contrastes
pendientes de SCRUM-114/198/120. La retirada depende de SCRUM-48 y sus subtareas
129/130/211/212. Este documento no declara ejecutado ninguno de esos positivos.

## Bootstrap real y acceso pendiente

READY en107129ms, Node22.x/Linux y Next16.4.3: compilación y TypeScript correctos.
CLI local65.9.0, CLI del builder65.4.0;2cores/8GB, sin máquina Turbo contratada.
549 archivos,8750396bytes en manifest dry-run, sin.env/.git/.pem/.zip privados.
Archivo de origen exportado de Git a carpeta temporal limpia; no se usó prebuilt
de Windows. No claves IA ni modificación del servidor localhost.

HTTP observado: login HTTPS200; HTTP→HTTPS308; dashboard anónimo307→login;
API privada401; token/asset inexistentes404; escritura con origen ajeno403.
No recursos DOM HTTP en login ni errores/warnings de consola. HTML y diez chunks
del login sin los valores de clave servidor ni secreto de firma; no es una
auditoría de todos los bundles. Runtime:0 errores/fatales en ventana04:20:48–
04:40:48UTC. Build avisó16 vulnerabilidades moderadas del árbol completo;
audit --omit=dev devolvió0. No se aplicó audit fix ni actualizaron dependencias.
Captura real del login adjunta en SCRUM-226; todavía no acredita lector público.

El propietario eligió su cuenta habitual pero no recuerda la contraseña. El
correo de recuperación falló por SMTP550; no insistir con envíos ni inventar
credenciales. Callback añadido:
`https://pdf-interactivo-qa.vercel.app/auth/callback?next=/reset-password`.
Tras su petición explícita de restablecer, se preparó un formulario local temporal
solo para su UUID/email confirmado. Usa API administrativa oficial de Supabase
en servidor; el propietario escribe/confirma/envía personalmente la nueva clave.
No es un arreglo de HU004 ni elimina su requisito de confirmación por correo.
No hay endpoint administrativo añadido a la aplicación desplegada. El auxiliar
no se versiona, expira a10min y se cierra al completar un cambio. Pruebas sin
mutar credenciales:GET200,origen ajeno403,CSRF inválido403. Resultado real del
cambio e inicio de sesión aún pendientes de confirmación personal.
Primer envío personal rechazado por origen, sin cambio de contraseña. Auxiliar
corregido a Referrer-Policy same-origin, manteniendo Origin/Host/CSRF estrictos.
Diagnóstico real sin credenciales desde navegador: origen/formato correctos;
origen ajeno y CSRF inválido403. Formulario vacío reabierto para nuevo envío
personal. Esta corrección del auxiliar no requirió redeploy de la aplicación.

Después del ingreso: comprobar proyectos de esa cuenta y preparar datos QA
propios sin trasladar los registros de la otra cuenta. Completar cookies,PDF y
fase pública/recorrido anterior antes de finalizar las historias. Mantener las
publicaciones QA retiradas al terminar y no publicar documentos reales/ajenos.

## Recorrido ejecutado — 01/11/2026

La recuperación asistida y el login personal se completaron; SMTP233 sigue
pendiente. Separación resuelta mediante loginAction real de las cuentas QA
existentes y cookies HTTP independientes, sin extraer las personales. Las capturas
IAB usan otra cuenta respecto al propietario del fixture; las pruebas anónimas
usan dos almacenes HTTP distintos. No confundir esos alcances.

Tras verificar TLS se habilitó el flag conservando el epoch; la cuenta personal
siguió activa. Se corrigió el aviso privado obsoleto después de publicar (ecf721e),
desplegándolo solo al QA.392/392 pruebas, lint, build y --publication9/9 correctos.
Regresión UI preparar→publicar sin aviso contradictorio, URL y copia verificadas.

Recorrido real: carga privada1580bytes, PDF público idéntico al original, imagen,
dos quizzes, notas1/2 y0/1→1/1, explicaciones, recarga, teclado y móvil390×844.
Sin claves previas de respuestas. Idempotencia, concurrencia200/409, aislamiento A/B
y recuperación al cortar la respuesta tras cabeceras200 comprobados. Identificación
declarada solo cuando la versión la exige: vacío400, PDF previo403, lectura posterior200
y sin autorización privada. Se conservaron las restricciones de la aplicación.

Pública→Privada y Despublicada bloquean nuevas entregas e intentos, incluyendo PDF
e imagen conocidos. Privada permite ensayo del propietario; despublicada lo rechaza.
Token nuevo al republicar y anterior inválido; versión sustituida inaccesible.
Final: cero públicas, siete intentos lector y diez prácticas privadas conservados.
Sin SQL de escritura ni IA. Copias descargadas previamente fuera de la revocación.

TLS1.3 autorizado, certificado *.vercel.app de Google Trust Services válido hasta
29/01/2027, HTTP→HTTPS308. Sin recursos DOM HTTP ni avisos de consola observados.
Runtime0 errores/fatales en04:54:40.750–05:19:40.750UTC. SHA original:
`e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`.

Jira conserva21 comentarios únicos y sus imágenes previas. Once capturas nuevas
dan21 adjuntos en16 subtareas; media/metadatos comprobados y una captura recuperada
con bytes idénticos. HU036, HU033 y HU030 y sus subtareas verificadas Finalizado;
226 y204 también. Corrección y continuidad en
[PR #46](https://github.com/Danilo2334/PDF_Interactivo/pull/46), sin merge.

Pendiente de122/203: prueba desde otro equipo. La edición posterior sin aprobar
ya se contrastó con la publicación, sin cambios en su proyección. Web no pudo abrir el recurso y el conector Vercel
devolvió403; no acreditan ese recorrido. La CLI autorizada de Danilo sí opera el QA.
HU032 En curso. SMTP233 y límite de cargas grandes documentado siguen pendientes;
no activar pagos ni suponer que el archivo pequeño acredita los límites completos.
Para repetir otra prueba hay que republicar y usar el enlace nuevo: los enlaces
anteriores quedan retirados. No reiniciar localhost ni rotar el epoch del QA.

Prueba adicional122: edición normal del refuerzo QA después de publicar la7;
revisión3 pending excluida de la proyección pública. Se descartó únicamente esa
revisión nueva, conservando intactos el refuerzo activo y la versión2 aprobada.
La publicación7 se retiró de nuevo. Captura20 en122, mismo comentario; registro
externo actualizado a33 comprobaciones, todas aprobadas.

Comprobación de configuración de la fase actual (solo nombres/booleanos):

```powershell
node --env-file=web/.env.qa.local web/scripts/check-reader-qa.mjs --publication
```

Los comandos --bootstrap anteriores documentan el arranque con publicación
bloqueada; no son el modo de verificación del flag actual.

## Cierre de HU032 y revisión del PR #46 — 01/11/2026

PR #46 revisado sin hallazgos e integrado a develop en
`365d282d820e807a942703cb9b9336335b7e2964`. QA sin redeploy: mismo código ecf721e,
misma sesión/epoch y mismas variables privadas. Stash d6406e0 conservado.

El pendiente externo se ejecutó en un runner estándar real de GitHub,
github-hosted/Linux/x64, Node22.23.4; repositorio público existente, sin activar
pagos. No usa cuentas de Francisco ni claves privadas. Su cliente HTTP descarga
el HTML y recursos y comprueba la API; no automatiza un navegador remoto. Las
pruebas visuales IAB de la aplicación se documentan por separado.

- [Acceso público externo: PASS9](https://github.com/Danilo2334/PDF_Interactivo/actions/runs/41277921902).
  TLS válido,308,HTML y12 assets813292bytes; versión7 con siete refuerzos aprobados,
  dos cookies anónimas independientes, PDF1580bytes con SHA original, worker1264369,
  imagen6424 y dos quizzes sin claves previas ni resultados heredados.
- [Mismo enlace retirado: PASS4](https://github.com/Danilo2334/PDF_Interactivo/actions/runs/41278037051).
  TLS/redirección/assets siguen válidos; API y PDF404. El HTML del lector200 es
  la página inicial, no contenido publicado. Ningún intento nuevo.
- JSON recuperados de logs en HTTPS-QA/external-github-public.json y
  external-github-retired.json. Capturas21/22 reales; tres adjuntos nuevos en122/203,
  un comentario por issue y todas las imágenes anteriores conservadas.
- HU032/SCRUM-44 y122/203 Finalizado;121/204/226 ya Finalizado. Sin pendientes
  funcionales de HU032. No se afirma resolver SMTP233 ni los límites de carga.

El verificador y workflow están en [PR #47](https://github.com/Danilo2334/PDF_Interactivo/pull/47),
sin merge. Sintaxis/lint y guardas de dominio/HTTPS/estado aprobadas. Solo Node
integrado y Actions oficiales fijadas por SHA; no instala dependencias de la app.
Ejecuta GET reales y no recibe secretos, propietario autenticado ni APIs de IA.
El estado esperado debe coincidir con la fase: public prueba acceso; retired
prueba revocación. No regenerar IA ni reactivar enlaces anteriores para repetirlo.

El QA terminó retirado: cero públicas, siete intentos lector y diez prácticas
privadas. La sesión personal queda conservada. No nuevo deployment ni cambio de
protección. Para repetir acceso público, el agente republicará solo la instantánea
sintética con confirmación normal y utilizará su enlace nuevo; al terminar retirará
la publicación y verificará el mismo enlace en modo retired.

## HU037: visitas del lector — procedimiento y límites

PR #47 quedó integrado a develop el01/11/2026 en2e5030f. HU037 está en
[PR #48](https://github.com/Danilo2334/PDF_Interactivo/pull/48). Su migración nueva
es20261101061105_reader_open_visits.sql, conciliada con la versión asignada
por Supabase; no volver a aplicarla ni ejecutar db push a ciegas. Reutiliza el
secreto de firma y la clave de servidor existentes; no añade proveedor IA ni
variables privadas nuevas. El QA continúa en el proyecto Hobby de Danilo.

La apertura se comunica sólo tras renderizar la primera página del PDF en una
pestaña visible. Descargar HTML, consultar GET de la proyección o ejecutar el
verificador HTTP externo no cuenta por sí solo. El cliente envía un UUID de
operación a POST /api/read/[token]/visits, con origen y cookie de lector válidos;
el servidor verifica publicación vigente y documento actual antes de firmar la
escritura. La identificación pendiente, PDF fallido, ensayo privado, vista previa
y lectura autenticada del propietario no suman. No hay total de visitas en la
proyección pública.

Se acepta como máximo una visita por documento y sesión durante30min desde la
última aceptada. Recarga, navegación, zoom y cambio de versión publicada conservan
la deduplicación. Otra sesión o una reapertura posterior sí suman. La cookie
HttpOnly/Secure/SameSite=Lax dura12h; sólo se almacena un HMAC diferente por
documento, fecha del servidor, referencias del documento/publicación/propietario
y origen HTTPS. No hay IP, user agent, nombre, correo ni nonce original del lector.
No equivale a contar personas únicas: borrar/bloquear cookies o cambiar navegador
puede crear otra sesión. Web Locks serializa la primera cookie entre pestañas en
navegadores compatibles. La operación mantiene su identidad incluso si se pierde
la primera respuesta y su Set-Cookie.

El propietario activo o admin autorizado consulta el agregado mediante
GET /api/projects/[projectId]/visits?documentId=[documentId]. El widget del proyecto
muestra cero, total, última apertura y errores; no lista sesiones individuales.
El permiso administrativo del agregado no concede acceso al PDF privado ajeno.
Al perder autorización se limpia el total anterior;401 exige nuevo login,403
indica falta de permiso y409 que cambió el documento. Retirar/republicar conserva
los eventos mientras exista el documento; eliminarlo elimina sus eventos por FK.

Para repetir QA, utilizar únicamente fixtures sintéticos: abrir PDF público,
registrar los recibos y tiempos reales, recargar con la misma cookie, contrastar
con una segunda sesión y otro documento, probar propietario/ensayo privado,
concurrencia y respuesta descartada, y conciliar API con filas aceptadas en BD.
Para la reapertura posterior esperar30min de reloj real, renovar la cookie de
lector mediante GET normal si caducó, conservar la cookie de visitas y usar una
operación nueva. No alterar fechas, relojes o filas en SQL ni bajar el límite para
aprobar. Los cambios temporales de tiempo de pruebas PGlite son sólo fixtures
aislados, nunca evidencias del QA real. Restaurar bloqueos/viewport, retirar
publicaciones de prueba y comprobar conservación de PDF e intentos al terminar.

Precaución observada: GET /login de esta aplicación elimina el marcador de acceso
por diseño del proxy. Para preparar CDP o pestañas auxiliares usar una ruta de
lectura o el proyecto, conservando el epoch; no abrir /login salvo que realmente
se necesite autenticar. No restaurar ese marcador manualmente ni extraer cookies
personales. Si hace falta login, lo completa el propietario; las pruebas HTTP
sintéticas independientes pueden continuar.

Resultado real HU03701/11/2026:397 pruebas, lint/build; sesiones con reapertura
tras1803.244031s y1834.349283s, total5→7; v8 no duplica, antiguas operaciones
idempotentes y documento ajeno409. Conciliación final7/2/1 y cero públicas, con
PDF e intentos intactos. Ocho capturas en131/132/213/214, todas Finalizado junto
a49. Fuente de aplicación QA dedfffe,dpl_8hAoH66sJKAY6AJdo9uCWgXaGw8A.
HTTP externo: [público PASS9](https://github.com/Danilo2334/PDF_Interactivo/actions/runs/41280983219)
y [mismo enlace7 retirado PASS4](https://github.com/Danilo2334/PDF_Interactivo/actions/runs/41282261536).
No pagos, IA nueva ni SQL de escritura de eventos. Sesión personal restaurada
y viewport/bloqueos retirados. PR48 pendiente de revisión e integración.
