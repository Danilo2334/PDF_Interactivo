# Integración y validación real de Sol — 31/10/2026

Modelo utilizado: `gpt-6.1-sol`, Responses nativa, razonamiento bajo, Standard,
salida estructurada y `store:false`. Proveedor explícito de servidor; sin caída
automática a otro proveedor ni reintentos ilimitados. Claves fuera de Git.
PR [#41](https://github.com/Danilo2334/PDF_Interactivo/pull/41), dependiente del #40.

## Método y resultados observados

Aplicación local con compilación de producción, Node 22.23.3, Next 16.4.3,
navegador integrado Chromium y cuenta propietaria autenticada. Se utilizó una
copia QA digital de dos páginas, proyecto `QA-Sol-20261031-integracion`.
El texto seleccionado, dificultad, diagnóstico, recomendaciones y resultados
persistidos están en [evidence.json](evidence.json), sin cookies ni credenciales.

| Caso real | Resultado |
| --- | --- |
| Conservación de energía | Diagnóstico suficiente, recomendaciones justificadas y explicación detallada persistida; diferencia formas y suma, conserva condición sin rozamiento. |
| Agua, solo nombres de procesos | Insuficiente: faltan definiciones para resolver la dificultad; razón persistida, recomendaciones bloqueadas y aviso comprobado tras recarga y en móvil. |
| Energías y posiciones del péndulo | Insuficiente: el fragmento no aporta esa relación. Se conserva el rechazo, sin relajar el criterio. |
| Diagrama conceptual de energías | Una recomendación pertinente (Imagen); diagrama v2 persistido, v1 conservada. Etiquetas completas y descripción sin disposición espacial inventada. |
| Analogía | Dos compartimentos y fichas; correspondencias y límites explícitos, situación ilustrativa diferenciada del texto original. |
| Resumen | 219/700 caracteres, seis conceptos con citas literales y condición sin rozamiento; excluye el distractor cercano. |
| Quiz de la explicación | Tres preguntas reales y auditoría semántica adicional; dos opciones contrastadas por pregunta, una correcta, explicación y citas. Versión 1 recuperada tras reinicio. |

El consejo interactivo se presenta como mini quiz opcional posterior a generar un
refuerzo; no como elección inicial sin generador compatible. La elección de crear
el quiz fue explícita. Nada quedó aprobado ni publicado automáticamente.

Se detectó un defecto real en la primera descripción del diagrama: hablaba de
nodos superiores/inferiores pese a mostrarse en una fila. Se corrigieron prompt y
validación; una llamada directa a la función de producción comprobó el contrato,
y después una regeneración autenticada real guardó v2 en la aplicación.
La llamada directa no escribió BD ni sustituyó la prueba autenticada.

En la revisión final se encontró otra incidencia: la conexión entre el primer y
tercer nodo pasaba detrás del central. Ahora dibuja una curva separada. Una prueba
geométrica comprueba que no invade el rectángulo intermedio. Se verificó v2 en
producción tras el cambio, sin otra llamada IA. Escritorio 1280×900, ampliación
con Enter y móvil 390×844: página de 375 px sin desbordamiento; gráfico ampliado
desplazable con flechas (40 px observados). Descripción y relaciones accesibles.
Sin errores de consola en la pestaña final.

Los seis contextos persistidos conservan SHA-256 del PDF original:
`e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946`.

## Verificaciones y costo

369/369 pruebas, lint y build de producción aprobados, incluido TypeScript.
Comprobaciones HTTP reales de la primera compilación: login 200, API sin sesión
401 y escritura desde origen ajeno 403. Los casos autenticados se comprobaron
desde la aplicación; las capturas de `capturas/` son originales del navegador.
Los errores/cuotas/proveedor ausente también tienen cobertura automatizada;
no se presentan como fallos reales provocados del proveedor.

18 llamadas reales completadas: 16 iniciales desde la aplicación, una directa a
`generateVisual` y una regeneración autenticada. Total estimado USD **0,096426**.
El flujo análisis + recomendaciones + explicación + quiz y auditoría costó
USD **0,026274**. No son cifras de factura. Cálculo con tokens reportados y tarifa
Standard: entrada USD 2/M, entrada en caché USD 0,10/M y salida USD 10/M, según la
[documentación del modelo](https://developers.openai.com/api/docs/models/gpt-6.1-sol).

La comparación anterior de Astra costó USD 0,419760 por 16 tareas y 18 llamadas,
no por dos respuestas. Sol costó USD 0,082072 en ese conjunto anterior; este ensayo
de integración es un conjunto distinto. No se activaron pagos ni servicios nuevos.

## Registro y límites

Se actualizaron los comentarios existentes, conservando sus capturas anteriores:
SCRUM-94, 182, 96, 184, 185, 186, 103 y 196. Ocho capturas nuevas reales,
sin duplicar el comentario de resultados. Resumen en historias SCRUM-30 a 35 y
SCRUM-40. No se cambiaron estados para simular aprobación de los datos QA.

Esta muestra demuestra el flujo local y permite revisar la calidad concreta de
las respuestas; no garantiza calidad universal ni reemplaza revisión pedagógica.
No prueba el lector HTTPS: el pendiente de HU030/HU032/HU033 continúa separado.
Sin merge, despliegue ni modificación de main. El stash d6406e0 se conserva.
