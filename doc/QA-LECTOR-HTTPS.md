# QA del lector HTTPS — 31/10/2026

Estado: primer QA autorizado desplegado, READY en
https://pdf-interactivo-qa.vercel.app. Código2922125f9054ab1d10b2ce312054c2ea089e64d4,
deployment `dpl_FjRhBZDrJPDMKrRPzZQJNKDdNYTp`, Production del proyecto QA separado
de Danilo. No es entrega final. PUBLICATION_HTTPS_VERIFIED=false; sin contenido
publicado ni llamadas IA. HU030/HU032/HU033,SCRUM-226 y validación pública de
HU036 siguen abiertas hasta sus pruebas autenticadas y de lector real.

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

## Qué falta realmente

| Requisito | Comprobado hoy | Acción necesaria |
| --- | --- | --- |
| Hosting de Danilo | Primer deployment READY, fuente limpia2922125, sin Git automático ni Pro. | Usar CLI con equipo/proyecto explícitos. No desplegar de nuevo por cambios solo documentales. |
| Clave privada de servidor | Proporcionada privadamente por el propietario; lectura mínima aceptada200 y nueve comprobaciones de formato correctas. Ocho variables en Production. | Mantener tres variables de servidor como Secret; ninguna clave IA subida. |
| Dominio y sesión de despliegue | Login HTTPS200 y HTTP→HTTPS308. Origen, URL y epoch común cargados. Callback exacto QA añadido, preservando localhost. | Falta login personal y cookies/visor/recorrido autenticado; no basta ver el login. |
| Retirada editorial | HU036 integrada y revisada en PR#43. Prueba real local privada→despublicada→privada, recarga, conflicto y bloqueo de lector/PDF/imagen/quizzes correctos. | Ejecutar posteriormente la variante pública HTTPS; no darla por comprobada con localhost. |
| Prueba externa | Bootstrap externo comprobado; publicación aún deshabilitada. | Completar acceso personal y fase pública QA; después retirada, recursos e intentos. |

El despliegue inicial ya está hecho. No resuelve por sí mismo la despublicación.
Falta la fase pública QA después del acceso propietario; HU036 ya está integrada.
No cerrar historias por localhost ni por ver únicamente el login desplegado.

## Comprobador privado preparado

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

Preparación actual comprobada: `web/.env.qa.local`, archivo privado ignorado por
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

Después del ingreso: comprobar proyectos de esa cuenta y preparar datos QA
propios sin trasladar los registros de la otra cuenta. Completar cookies,PDF y
fase pública/recorrido anterior antes de finalizar las historias. Mantener las
publicaciones QA retiradas al terminar y no publicar documentos reales/ajenos.
