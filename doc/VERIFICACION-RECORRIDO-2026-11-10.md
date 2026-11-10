# Revisión transversal del recorrido — 10/11/2026

Solicitud de Danilo: navegación guiada con flechas, mini quiz ABCD con envío y
puntaje, conservar las historias y comprobar la IA. Seguimiento SCRUM-237 y
SCRUM-238. Se leyeron los criterios actuales de las 46 historias en Jira.
Esta tabla distingue cobertura de regresión de una ejecución visual nueva;
no sustituye los comentarios y evidencias anteriores de cada subtarea.

## Trazabilidad de las 46 historias

| Historias | Ubicación o contrato conservado | Comprobación de regresión |
| --- | --- | --- |
| HU001–HU005 / SCRUM-6,14–17 | Registro, login, logout, recuperación y perfil, fuera del workspace | `auth-entry`, `supabase-cookies`, `change-password`, `profile`; no se cambian credenciales. Correo para destinatarios externos sigue pendiente de dominio. |
| HU006–HU008 / SCRUM-18–20 | Carga, validación y listado | `direct-pdf-transfer`, `pdf-file-transfer`, `error-recovery`; límite 20 MiB conservado, no se añade límite de páginas. |
| HU009–HU010 / SCRUM-21–22 | PDF original; navegación, miniaturas y zoom en desplegable | `pdf-navigation`, `readable-page-text`, `view-budgets`; se conserva el visor y su fuente. |
| HU011 / SCRUM-23 | Información y administración del documento | `rename-document`, `replace-document`, `delete-document`, `document-conflicts-database`; siguen confirmaciones y autorización. No se ejecuta una eliminación de datos personales para esta regresión visual. |
| HU012–HU016 / SCRUM-24–28 | Paso 1: página/fragmento → texto → dificultad → envío | `page-selection`, `fragment-selection`, `extract-selection-text`, `difficulty`, `reinforcement-request`, `reinforcement-database`; borrador temporal separado del registro persistido. |
| HU017 / SCRUM-29 | Paso 2: solicitudes, filtros, detalle e historial | `request-list`, `request-states-database`; ninguna flecha genera ni aprueba contenido. |
| HU018–HU019 / SCRUM-30–31 | Análisis y recomendaciones dentro de la solicitud | `contextual-analysis`, `analysis-api/database`, `recommendations`, `recommendation-api/database`; contexto insuficiente, citas y permisos conservados. |
| HU020–HU023 / SCRUM-32–35 | Generación del formato elegido; explicación, ejemplo, visual o resumen | `explanation`, `example`, `visual`, `visual-artwork`, `summary` y sus API/database; no se cambia el modelo ni los contratos de estos formatos. El quiz nuevo sí cambia su contrato de generación a cuatro opciones. |
| HU024 / SCRUM-36 | Revisión explícita y versiones | `owner-review-api`, `regeneration-api/database/ui`, `summary-review`; aprobar sigue siendo una acción separada. |
| HU025–HU027 / SCRUM-37–39 | Paso 3: panel, tarjetas y multimedia | `reinforcement-card`, `reinforcement-markers`, `reinforcement-media`, `media-transfer`; referencias al PDF y recursos autorizados conservados. |
| HU028 / SCRUM-40 | Mini quiz opcional después del refuerzo | `quiz`, `quiz-api`, `quiz-ui`; nuevas generaciones ABCD, 1–3 preguntas; no inventar distractores para completar cuatro opciones. |
| HU029 / SCRUM-41 | Edición y aprobación privada del quiz | `quiz-ui`; compatibilidad de versiones existentes de 2–5 opciones, respuesta única y reintentos. No se reescriben automáticamente quizzes aprobados. |
| HU030 / SCRUM-42 | Selección de opciones → envío → resultado | `quiz-abcd`, `quiz-focus`, `quiz-attempt-api/database`; envío único, calificación del servidor, explicaciones y bloqueo o permiso de reintentos. |
| HU031 / SCRUM-43 | Vista previa privada | `experience-preview`; ensayo separado de intentos del lector. |
| HU032–HU033 / SCRUM-44–45 | Compartir y consultar resultados → publicación; lector HTTPS | `publication`, `publication-api`, `reader`, `reader-api/repository`; aprobaciones y respuestas reservadas conservadas. |
| HU034–HU035 / SCRUM-46–47 | Lector, navegación, foco y controles adaptables | `reader-navigation/layout`, `quiz-focus`; flechas operables con teclado y opciones de al menos44px. Viewport emulado no acredita Android físico ni Safari. |
| HU036 / SCRUM-48 | Control de publicación dentro de compartir | `publication-visibility`; retirada y sustitución mantienen su autorización. |
| HU037–HU039 / SCRUM-49–51 | Estadísticas agrupadas y resultados del quiz | `reader-visits`, `reinforcement-opens`, `quiz-results`; usar la guía no crea intentos ni opiniones. |
| HU040 / SCRUM-52 | Valoración del lector | `reader-feedback`; pendiente táctil SCRUM-137 conserva su estado. |
| HU041 / SCRUM-53 | Analítica por documento/periodo y CSV | `analytics`; no se sustituye ni recalifica el historial. |
| HU042–HU043 / SCRUM-54–55 | Roles, propiedad y rutas privadas | Regresiones de autorización en APIs; no hay cambios en RLS ni mecanismos de sesión. |
| HU044 / SCRUM-56 | Carga y renderizado limitado del PDF | `view-budgets`, `pdf-navigation`, `direct-pdf-transfer`; no se repite ni atribuye un objetivo RNF con un sondeo HTTP. |
| HU045 / SCRUM-57 | Errores accionables y recuperación | `error-recovery`, fallos de proveedor, cuota/timeout, idempotencia y respuestas perdidas; sin reintentos ilimitados. |
| HU046 / SCRUM-58 | Compatibilidad y operación | `operations`, `operations-monitor`, `operation-notifications`; permanecen pendientes matriz real de dos últimas versiones de navegadores y operación continua. |

## Verificación automatizada de este cambio

481/481 pruebas, lint y build de producción con TypeScript aprobados. Incluye
dos pruebas nuevas: rechazar generaciones sin cuatro opciones conservando
quizzes anteriores; selección de todas las respuestas, bloqueo de doble envío,
puntaje y retroalimentación del servidor sin soluciones previas. Las pruebas
automatizadas del proveedor usan simulaciones y no se presentan como IA real.

## Límites del cierre

No se declara cierre completo del proyecto: SCRUM-137/231 requieren dispositivos
y navegadores reales; SCRUM-232 operación continua; SCRUM-233 dominio para correo
externo. No se cierran tareas vacías heredadas ni sprints por inferencia. PR y
despliegue se registran por separado con su revisión exacta. Resultados visuales
y de IA real se incorporan a la continuidad y a los comentarios de Jira.

## Resultado visual y proveedor real

Verificado el10/11 en local y QA f2b1490: flechas y foco por teclado, quiz nuevo GPT de tres preguntas/cuatro opciones, envío incompleto bloqueado, resultado privado2/3 (67 %) y lector anónimo3/3 (100 %) persistente tras recarga. Sin reintentos según su configuración; consola sin errores observados y viewport390×844 sin desbordamiento. Análisis de contexto técnico insuficiente rechazado por GPT. SCRUM-238 Finalizado; SCRUM-237 conserva pendiente Android físico/integración. Las capturas reales y el detalle están en Jira y continuidad. No se atribuyen pruebas físicas ni garantía de calidad universal.
