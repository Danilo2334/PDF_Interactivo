# Preparación del lector HTTPS — 31/10/2026

Estado: preparación local, sin desplegar ni publicar. Código de aplicación de
`develop` en `ee9f805`; PR #30–#41 integrados. Esta rama solo añade comprobación
de configuración y documentación. HU030/HU032/HU033 siguen En curso.

## Qué falta realmente

| Requisito | Comprobado hoy | Acción necesaria |
| --- | --- | --- |
| Hosting de Danilo | Lectura y rol OWNER confirmados en el equipo correcto; cuenta personal Hobby activa. Crear proyecto vacío mediante el conector devuelve403. | Resolver el acceso de creación o usar un acceso oficial alternativo autenticado del mismo titular; no desplegar. |
| Clave privada de servidor | `SUPABASE_SERVER_KEY` ausente en la configuración local. | Usar una clave existente del Supabase correcto, solo como Secret del futuro proyecto QA. No enviarla por chat. |
| Dominio y sesión de despliegue | No hay origen QA asignado ni epoch compartido configurado para hosting. | Asignar dominio estable y UUID de despliegue común a sus funciones. El wrapper local ya genera su propio epoch. |
| Retirada editorial | HU036 / SCRUM-48 y sus cuatro subtareas Por hacer; API solo prepare/publish. | Implementar y revisar HU036 para probar retirada real y dejar la muestra sin publicar al terminar. |
| Prueba externa | No ejecutada. Publicación deshabilitada. | Autorizar después un despliegue QA y comprobar certificado, redirecciones y lector. |

Desplegar sí es el siguiente paso de infraestructura para cerrar HTTPS, pero no
resuelve por sí mismo la despublicación. Se puede arrancar el entorno con la
publicación bloqueada y comprobar TLS/login; antes del ensayo público completo
debe estar disponible la retirada editorial. No cerrar historias por localhost.

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

Resultado real con configuración local: cinco comprobaciones correctas y cuatro
pendientes (clave servidor, origen, URL del sitio coincidente y epoch de hosting).
El secreto de firma tiene formato correcto, el proyecto Supabase coincide y no
se detectaron las credenciales de servidor conocidas con prefijo público. No se
leyeron ni escribieron secretos remotos. La identidad de las nuevas claves secret
debe comprobarse en el proyecto; su prefijo no demuestra a qué BD pertenecen.

Validación del comprobador: sintaxis y ESLint correctos; ensayo aislado de fases,
rechazo de HTTP/local y credencial pública, y ausencia de valores en la salida.
Esos datos de formato son ficticios y no se presentan como prueba HTTPS.
Regresión local existente de publicación/lector/intentos: **14/14** pruebas
automatizadas aprobadas (incluye PostgreSQL aislado); no son intentos reales.

## Configuración futura del proyecto QA

Proyecto separado `pdf-interactivo-qa` propuesto, aún sin ID ni URL reservados.
Destino confirmado: equipo `danilo-carlosamas-projects`, ID
`team_I5CBYezIIEWl8FIlhW7vqMR4`. La conexión correcta se llama **Danilo Carlosama**;
la conexión anterior llamada Vercel corresponde a Francisco y no debe usarse.
Consulta de identidad, equipo y proyectos correcta tras reiniciar Codex. La lista
de miembros confirma `danilo2334` con rol OWNER. El intento de crear el proyecto
vacío (sin repositorio, previews automáticas deshabilitadas) devolvió403:
`You don't have permission to create the project`. Consulta posterior por nombre:
cero proyectos. No atribuir la causa a un rol incorrecto ni afirmar que reconectar
lo resuelve: la respuesta no concreta la causa. CLI Vercel no está instalado, por
lo que no existe actualmente un acceso alternativo CLI autenticado comprobado.
No se verificó consumo/cuota restante ni se creó ningún recurso.
Vercel: Next.js, raíz `web`, Node22.x, `npm ci`, `npm run build`, salida estándar.
No importar el repositorio ni asociar ramas ahora: eso puede iniciar despliegues.
Si se resuelve la creación antes del despliegue, crear solamente el proyecto
vacío en el equipo indicado y comprobar que tiene cero deployments.
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
No reejecutar migraciones: la de intentos `20261029010922` ya fue conciliada.
Si se prueba recuperación de cuenta, añadir el callback QA exacto en Supabase
preservando los existentes. No abrir permisos ni desactivar RLS.

Costo propuesto USD0 de hosting nuevo solo si el uso cumple Hobby personal/no
comercial y hay cuota. Se confirmó Hobby activo en la cuenta personal de Danilo;
no se ha comprobado la cuota restante ni contratado un plan para el proyecto QA.
Sin Pro, tarjetas, dominios comprados ni servicios adicionales.
[Condiciones Hobby](https://vercel.com/docs/plans/hobby).

Para probar lector sin cuenta Vercel no sirve quedarse en una Preview protegida:
Standard Protection protege las URLs de deployment y permite el dominio Production.
Ese dominio pertenecería a un proyecto QA separado; la futura exposición requiere
autorizar el despliegue/publicación. No cambiar protección en cuentas ajenas.
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
  lector en todas. Hay ocho ensayos de propietario separados: v3=1, v4=4, v5=3.
- V3 exige identificación; v4/v5 no. **No publicar v3 directamente**: existen
  versiones posteriores y el servidor lo impide. Para probar identificación,
  preparar la próxima versión mediante UI con esa opción, sin alterar SQL.
- Última v5 privada: `e5ddc59f-3d42-4145-a4e3-2788ef14da7a`.
- Proyecto escaneado QA: una instantánea privada vacía, sin quizzes ni intentos.
- Las solicitudes de Sol siguen privadas y pendientes de aprobación; no se
  aprueban automáticamente para completar este ensayo. Los datos anteriores bastan.

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
