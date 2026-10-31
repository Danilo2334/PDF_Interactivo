# Comparación real de Gemini y GPT — 31/10/2026

**Recomendación: probar GPT Sol como candidato para una integración posterior, conservando revisión del propietario.** En esta muestra explicó mejor los supuestos y límites que Gemini. Astra no aportó una mejora clara que justifique su costo: costó 5,11 veces Sol. Esto es una evaluación del contenido devuelto, no una migración terminada ni una demostración de un agente autónomo. La aplicación continúa con Gemini.

## Alcance y método

Se ejecutaron las funciones actuales de los proveedores del repositorio en `6a6d56f`, con PDF.js real y el mismo corpus QA ya utilizado en HU015–HU019. Se compararon **gemini-3.5-flash-lite**, **gpt-6.1-sol** y **gpt-6-astra**. Hubo dos casos (energía/péndulo y evaporación/condensación), ocho tareas por caso y tres modelos: **48 resultados finales**. Cada quiz hace dos llamadas: generación y evaluación semántica por el mismo modelo, además de los validadores locales. Fueron **54 llamadas completadas con tokens reportados**.

Las tareas corresponden a Jira: análisis HU018/SCRUM-30, recomendaciones HU019/SCRUM-31, explicación detallada HU020/SCRUM-32, ejemplo práctico y analogía HU021/SCRUM-33, diagrama HU022/SCRUM-34, resumen breve HU023/SCRUM-35 y quiz HU028/SCRUM-40. Los criterios y las subtareas se consultaron en Jira. No se probaron video, OCR, imágenes generativas, herramientas autónomas ni búsqueda externa: no forman parte de esta comparación del flujo actual.

Equipo local: Acer Nitro AN515-57, Intel Core i5-11400H 2,70 GHz, aproximadamente 16 GB RAM, Windows y Node 22.23.3. Las llamadas se ejecutaron directamente desde Node a las API remotas; la red doméstica no se caracterizó ni se fijó. El visor se comprobó en el navegador integrado Chromium. Los tiempos no aíslan red/proveedor/carga y no justifican comparaciones de rendimiento estadístico.

El diagnóstico usado como entrada de generación es una referencia **anotada y congelada**, igual para los tres modelos; no se atribuye a un modelo ni se usa como resultado observado. Así se evita que un diagnóstico distinto cambie la dificultad de la generación. El quiz usa el mismo refuerzo QA previamente revisado, también congelado; no se construye sobre la nueva salida de cada modelo. Por ello, esto compara componentes con entradas equivalentes, **no un recorrido completo encadenado de extremo a extremo**.

Se reutilizan instrucciones, datos, límites de salida y validaciones de producción. El hash de la primera petición normalizada coincide entre los tres modelos en cada uno de los 16 grupos caso/tarea. En la segunda llamada del quiz cambia el quiz auditado, como corresponde. Gemini usa su configuración de pensamiento `low`; GPT usa `reasoning.effort=low`, Responses API, `store:false` y tarifa Standard. Temperatura predeterminada de cada proveedor; esas configuraciones no aseguran igual cómputo interno. Los modelos se ejecutaron en orden fijo, no aleatorio. Una muestra por tarea/modelo no permite medir variabilidad ni significancia estadística.

El adaptador GPT existe **solo dentro del script de evaluación**: traduce el transporte HTTP y vuelve a pasar las salidas por las mismas funciones/validadores. No cambia rutas de la aplicación, permisos, Supabase ni el proveedor configurado. No hubo aprobación o publicación de estos contenidos, cambios SQL, merge ni despliegue.

## Documentos originales

| Archivo | Páginas | SHA-256 antes y después |
|---|---:|---|
| QA-HU015-019-digital.pdf | 2 | `e7277d66afd7caba47385cfac2f0e55a2eeb4fb7aa7136409fa35300a6347946` |
| QA-HU015-019-escaneado.pdf | 1 | `b0bc1809351f249bd352032fbcdd193846e4c44e4199cf4bfbfec24326b71302` |

Energía: cuatro líneas de página 1 sobre conservación, potencial/cinética y ausencia de rozamiento. Incluye una línea cercana distractora de temperatura de fusión. Agua: una frase de página 2 que solo menciona evaporación y condensación; no las define ni describe todo el ciclo. El encabezado QA de esa página dice que su contenido no pertenece a la selección de página 1: **no significa que sea ajeno a la página 2**.

El escaneado se abrió con PDF.js y devolvió texto digital vacío. No hubo llamada de visión/OCR a ningún modelo con él. Cambiar de modelo manteniendo este conducto de texto no lo vuelve legible automáticamente. Ambos PDF permanecieron intactos; `results.json` conserva sus textos extraídos y hashes.

## Costo y tiempo observados

| Modelo | Tareas válidas para el contrato | Entrada / salida, tokens | Costo USD estimado | Mediana / máximo por tarea |
|---|---:|---:|---:|---:|
| Gemini 3.5 Flash-Lite | 16/16 | 8.130 / 5.528 | 0,016259 equivalente de pago; configuración gratuita | 2,02 / 11,58 s |
| GPT 6.1 Sol | 16/16 | 10.456 / 6.116 | 0,082072 | 5,97 / 10,67 s |
| GPT 6 Astra | 16/16 | 10.536 / 6.288 | 0,419760 | 7,60 / 15,18 s |

Salida incluye razonamiento: Sol 327 tokens y Astra 329; ninguno reportó tokens de entrada cacheados. Gemini reportó cero tokens de pensamiento en estas respuestas. La duración mide cada función completa, incluyendo las dos llamadas del quiz y su validación; no es tiempo de renderizado de la aplicación ni un SLA. Los intentos técnicos fallidos se excluyen de esta tabla de tareas finales.

**OpenAI total medido por tokens: USD 0,501832.** No es un recibo ni una consulta del saldo/facturación. No incluye la llamada mínima de configuración previa. Los errores sin uso reportado tienen costo desconocido, no cero demostrado. No se activó facturación en Gemini ni un proveedor de pago de respaldo.

Tarifas oficiales consultadas el 31/10/2026, USD por millón de tokens: [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), entrada 2 / salida 10 / entrada cacheada 0,10; [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra), 10 / 50 / 1; [Gemini Flash-Lite](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite), equivalente de pago 0,30 / 2,50 / 0,03. La tarifa de Gemini es una referencia comparable, **no gasto cobrado acreditado**. Los tamaños de token y longitudes de respuesta difieren entre proveedores.

| Tarea; costo conjunto de los dos casos | Gemini equivalente USD | Sol USD | Astra USD |
|---|---:|---:|---:|
| Análisis | 0,000882 | 0,005324 | 0,021970 |
| Recomendación | 0,003037 | 0,012484 | 0,063520 |
| Explicación | 0,001752 | 0,008924 | 0,044070 |
| Ejemplo práctico | 0,002121 | 0,011608 | 0,058540 |
| Analogía | 0,002124 | 0,010824 | 0,058520 |
| Diagrama | 0,002377 | 0,012492 | 0,066310 |
| Resumen | 0,001339 | 0,007086 | 0,031480 |
| Quiz, incluida auditoría | 0,002627 | 0,013330 | 0,075350 |

Generar las ocho tareas para un caso costó Sol USD 0,047010 en energía y 0,035062 en agua; Astra 0,246850 y 0,172910. Un usuario normalmente elige un refuerzo, por lo que esto **no es el precio de una solicitud ordinaria** ni permite extrapolar un número garantizado de usuarios o presentaciones.

## Calidad: revisión cualitativa de las 48 salidas

Revisión realizada por Codex, **no ciega ni validada por un docente independiente**. Se revisaron exactitud conceptual, relación con la dificultad, fidelidad a la fuente, citas, límites y utilidad de los distractores. No se fabricó una puntuación porcentual de calidad. `consistentWithSource:true` es una declaración del generador, no una garantía. Aceptación por contrato significa estructura, citas y demás comprobaciones implementadas; no demuestra corrección educativa integral.

| Caso y tarea | Gemini | Sol | Astra |
|---|---|---|---|
| Energía: análisis | Tema, conceptos y citas pertinentes; mezcla la conservación total con el foco mecánico al resumir alcance. | Alcance concreto, excluye el distractor de fusión. | Distingue cambio de formas y suma, sin cálculos ajenos. |
| Energía: recomendación | Cinco tipos con justificación; sugerencia visual menciona efecto del rozamiento fuera del caso ideal. | Cuatro tipos, omite resumen; razones ligadas a transformación/suma. | Cuatro tipos similares a Sol; no hay ventaja clara adicional. |
| Energía: explicación | Comprensible, pero añade disipación/calor no desarrollados por la fuente y dice «toda su energía es potencial» sin fijar referencia. | Pasos claros, separa energía total de suma mecánica y limita el caso con rozamiento. | Distinción igualmente clara; fórmula de la suma sin cambiar el alcance. |
| Energía: ejemplo | Reloj ideal, referencia de altura y límites presentes; el reloj real puede distraer, «casi en su totalidad» es impreciso. | Bola/hilo, referencia de potencial cero explícita, caso ilustrativo identificado. | Muy similar a Sol, distingue energía mecánica y total. |
| Energía: analogía | Monedas ilustran suma, pero el robo/pérdida con fricción puede sugerir desaparición de energía. | Compartimentos y fichas; explica que el modelo de solo dos deja de bastar con fricción. | Aclara además que energía no son fichas discretas; más extenso. |
| Energía: diagrama | Relaciones «sistema contiene sin rozamiento» y «sin rozamiento permite potencial» poco útiles y no justificadas. | Tres posiciones útiles, pero dos etiquetas terminan «cre…»: requieren corregirse. | Tres posiciones útiles; dos etiquetas terminan «cre» con guion blando: también incompletas. |
| Energía: resumen | Corto, conserva condiciones y conceptos. | Corto, diferencia suma y formas. | Correcto pero redundante en ausencia de rozamiento. |
| Energía: quiz | Claves/explicaciones sustentadas; varios distractores son categorías incongruentes, demasiado fáciles. | Claves sustentadas; tres, tres y dos opciones. Evalúa recuerdo, no transferencia. | Claves sustentadas; distractores parecidos y nivel de recuerdo, sin ventaja decisiva. |
| Agua: análisis | Identifica tema pero no explicita que faltan definiciones para responder la confusión. | Delimita ciclo incompleto, pero interpreta erróneamente el encabezado QA como contexto ajeno. | Explicita que el texto solo nombra los procesos y faltan datos para diferenciarlos. |
| Agua: recomendación | Cuatro tipos; promete distinguir con fuente que no define y recomienda resumen poco resolutivo. | Cuatro tipos, razones pertinentes, pero también presupone poder explicar diferencias con contexto limitado. | Similar a Sol: justifica opciones, no resuelve por sí mismo la insuficiencia informativa. |
| Agua: explicación | Añade definiciones/nubes pese a la orden de usar exclusivamente el contexto; exceso de alcance. | Dice honestamente qué no se puede explicar con esa fuente; no enseña la diferencia física. | Igual límite explícito y honesto; tampoco resuelve la diferencia sin información adicional. |
| Agua: ejemplo | Olla sobre estufa y «fase inicial»: se centra solo en evaporación y deja la condensación sin resolver. | Agua tibia/tapa fría contrasta ambos, no exige hervir y declara aclaraciones añadidas como ilustrativas. | Similar, añade que las gotas no aparecen necesariamente de inmediato. |
| Agua: analogía | **Error conceptual:** vapor que asciende en «burbujas de aire caliente». Omite la comparación con condensación y amplía a clima planetario. | Puertas líquido/gas en sentidos opuestos, límites explícitos, no necesita ebullición. | Entrada/salida de sala ilustra sentidos opuestos, pero repite al final la interpretación incorrecta de contexto ajeno. |
| Agua: diagrama | Flecha «conduce a» implica secuencia que la fuente no establece; «fases principales» excede la mención. | Pares líquido→gas y gas→líquido, declara que no son ciclo completo. Añade definiciones no dadas por el PDF. | Flechas «menciona» más fieles al alcance; también añade definiciones generales identificadas como límites. |
| Agua: resumen | Repite frase y «procesos esenciales», poco útil para aclarar alcance. | Explicita que faltan diferencias y no demuestra ciclo completo. | Similar a Sol; no amplía a otras etapas. |
| Agua: quiz | Clave correcta, pero «la transición básica» también describe el recurso según la fuente: distractor débil y potencialmente ambiguo, aunque la auditoría del propio modelo lo aceptó. | Dos opciones distinguen dos procesos de ciclo completo, sin inversión de negación; nivel muy básico. | Clave sustentada, pero dos distractores casi equivalentes sobre ciclo completo reducen utilidad. |

Los tres modelos marcaron suficiente el análisis del texto de agua. Eso sirve para identificar el tema, **no acredita que haya información suficiente para enseñar su diferencia física bajo una política de fuente exclusiva**. La integración futura debe distinguir esos objetivos y pedir contexto adicional o identificar expresamente la explicación educativa añadida. Cambiar solo la clave/modelo no soluciona este problema.

## Incidentes y reproducibilidad

Inicialmente diez generaciones GPT de energía fueron rechazadas por HTTP 400 `invalid_json_schema`: las enumeraciones de `sourceQuote` contenían saltos de línea, que ese formato estricto no aceptó. Se hizo una llamada diagnóstica adicional con el mismo resultado, fuera del libro de tokens completados. No es un error de conocimiento del modelo. El adaptador de evaluación convierte ese enum en una expresión regular anclada equivalente; el validador local sigue exigiendo la cita literal original. Se conservaron los diez fallos y se repitieron explícitamente solo los casos técnicos afectados. Los 48 finales fueron aceptados; no se editaron sus contenidos para conseguirlo.

`results.json` conserva 58 ejecuciones de tarea: 48 finales y diez fallidas. Las reservas conservadoras para presupuestar un HTTP 400 **no son consumo medido**; en la copia del repositorio no se suman como `usd`. Un proceso se interrumpió y se reanudó. La traza final no contiene filas pendientes, pero la primera versión guardaba la llamada después de recibir respuesta: no permite excluir una petición en vuelo perdida durante la interrupción ni conocer su posible costo. El script entregado guarda ahora el estado `in_flight` antes del envío. Los costos de peticiones fallidas o interrumpidas sin tokens no están demostrados. No hubo reintentos automáticos ilimitados. Tope conservador previsto OpenAI: USD 3; el uso con tokens reportados quedó muy por debajo, sin afirmar que sea la factura completa.

Archivos auditables: `results.json` (peticiones, hash lógico, respuestas originales, tiempos, tokens y errores), `metrics.json`, PDF QA y fuentes del quiz bajo `fixtures/`. Solo contienen datos QA; no claves, cookies, respuestas de lectores ni documentos personales. Las capturas son del visor local de comparación que muestra estas respuestas reales, **no una pantalla de GPT integrado en la aplicación**. Se adjuntan en SCRUM-182, SCRUM-185 y SCRUM-196 conservando los comentarios e imágenes anteriores. Las historias madre reciben un resumen breve sin duplicar imágenes ni alterar estados.

Preparación sin consumir API:

```powershell
node web/scripts/compare-ai-providers.mjs --fixtures doc/evaluaciones/2026-10-31-ia/fixtures --out RUTA_LOCAL_DE_RESULTADOS --fixtures-only
```

El script requiere las claves existentes privadas en `web/.env.local`; nunca las imprime. Para una repetición real, añadir `--live` a un directorio de resultados nuevo, bajo consumo expresamente autorizado. `--model`, `--case` y `--task` limitan el alcance; `--retry-technical` permite repetir los rechazos técnicos de esquema. Una carpeta existente conserva resultados y evita repetir éxitos. Para revisar las trazas guardadas sin claves ni llamadas:

```powershell
node web/scripts/render-ai-comparison.mjs --out doc/evaluaciones/2026-10-31-ia --serve
```

El visor escucha solo `127.0.0.1:3001`, sirve únicamente la página comparativa y no publica secretos ni archivos del directorio. Verificación de esta entrega: ejecución real anterior, igualdad de entradas por hash, 48 contratos aceptados, hashes originales conservados, revisión visual del visor, sintaxis Node y lint. No se atribuyen a este cambio pruebas completas de build/UI autenticada/BD que no se hayan repetido.

## Decisión pendiente

Sol es el candidato con mejor equilibrio observado para un piloto: las explicaciones y analogías mejoraron por unos centavos. Mantener Gemini solo por rapidez/costo sin corregir los defectos no protege calidad. Astra puede reservarse para casos difíciles evaluados expresamente; estos dos casos no justifican utilizarlo por defecto. Antes de cambiar la integración: resolver etiquetas cortadas y contexto insuficiente, ampliar corpus a documentos de la presentación, revisar quizzes con docente/propietario y probar el recorrido autenticado completo con persistencia/errores. No se promete calidad universal ni sustituir revisión humana.

Continúan pendientes por separado las pruebas HTTPS del lector en HU030/HU032/HU033. La comparación no las completa. Sin merge, despliegue, publicación de contenido ni sustitución del proveedor en esta entrega.
