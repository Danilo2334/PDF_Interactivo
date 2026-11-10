# Guion de presentación de PDF Interactivo

Preparación del 9 de noviembre de 2026. Este documento explica qué mostrar;
no sustituye el registro de resultados reales de Jira y la continuidad.

Ensayo realizado: [QA-PRESENTACION-20261109](https://pdf-interactivo-qa.vercel.app/projects/7155218d-eca7-4b89-a309-ea6fa9d74125).
Contiene una explicación y un quiz de tres preguntas generados con Sol y
aprobados tras revisión. Su publicación v1 está pública con enlace renovado,
solo para este material sintético. El enlace se consulta en Revisar publicación;
no se copia su token al repositorio. El ensayo completo y sus límites están en
la última entrada de CONTEXTO-PROYECTO.md. Las instrucciones siguientes describen
el recorrido; no hace falta repetir la generación para consultar lo guardado.

## Abrir la aplicación

Usar https://pdf-interactivo-qa.vercel.app/dashboard desde el PC o el celular.
El propietario inicia sesión con su cuenta. Un lector de una publicación
pública utiliza su enlace de lectura y no necesita la cuenta del propietario.
No mostrar claves, formularios con contraseñas ni configuración de proveedores.

## Demostración del propietario

1. Mostrar Mis documentos y abrir un PDF de prueba identificado como QA.
2. Explicar que el visor conserva el original; navegar y cambiar el zoom.
3. Marcar un fragmento, abrir Solicitud de refuerzo y extraer su texto digital.
4. Elegir categoría, describir una dificultad concreta y guardar la dificultad.
5. Confirmar el texto y enviar la solicitud. Mostrar que tiene identificador.
6. Abrir Solicitudes y Ver solicitud e historial. Revisar el contexto antes de
   analizar: página, fragmento y necesidad deben corresponder al mismo caso.
7. Ejecutar el análisis real. Explicar tema, conceptos, alcance y citas; si falta
   contexto, mostrar el motivo y preparar una solicitud más completa.
8. Obtener recomendaciones, explicar sus razones y elegir un formato adecuado.
   Guardar la elección antes de generar; no afirmar que siempre aparecen todos.
9. Configurar el nivel o modalidad, generar una sola vez y revisar el resultado.
   Mostrar que inicialmente no se publica ni se aprueba automáticamente.
10. Aprobar explícitamente el contenido revisado. Si se eligió un mini quiz,
    revisar también preguntas, opciones, soluciones y razones antes de aprobarlo.

Caso de energía ya probado: distinguir conservar la cantidad total de cambiar
de forma, bajo las condiciones de sistema aislado y ausencia de rozamiento.
No pedir al breve PDF definiciones o detalles que no contiene como si fuera
un caso positivo seguro. El rechazo de contexto insuficiente es un resultado
válido del sistema, no una respuesta que deba reemplazarse por una ficticia.

## Demostración del lector

Preparar una versión que incluya solo material aprobado. Compartir únicamente
el documento QA elegido para la demostración. Abrir su enlace en la sesión de
lector preparada, consultar el refuerzo y responder el quiz. Mostrar la nota,
la explicación de las respuestas y la conservación al recargar. Respetar la
configuración de reintentos. Un enlace abierto con la sesión del propietario
no se presenta como una prueba de aislamiento anónimo.

Mostrar que retirar la publicación bloquea nuevas consultas sin borrar el
original ni los resultados. No retirar una publicación ajena o necesaria para
otro usuario. El enlace de lectura es acceso al material compartido: entregarlo
solo al público previsto y no incluir su token en registros técnicos.

## Preparación y contingencia

Conservar un refuerzo y un quiz ya revisados para poder mostrar la lectura sin
generar otra vez con IA. Esto no ofrece funcionamiento sin Internet: la lectura
y la calificación siguen necesitando el servidor. Si la generación nueva falla,
mostrar el aviso real y el contenido previamente aprobado, indicando cuándo
se produjo; no presentar material guardado como una nueva generación en vivo.

Antes de la exposición, comprobar acceso desde la red del lugar, sesión del
celular, cuotas de alojamiento y crédito del proveedor. No estrenar una
migración de hosting ni modificar la versión del QA durante la demostración.
Los pendientes formales siguen en Jira; el guion no declara el proyecto cerrado.

Para añadir el acceso en el celular, consultar la sección correspondiente de
[la guía de estudio](GUIA-PARA-ESTUDIAR-EL-PROYECTO.md). No hay un APK en esta versión.

## Ensayo final en el Android del propietario

El propietario confirmó Android el09/11. Esta lista sigue pendiente de ejecución
en su teléfono: los resultados IAB de360×800 y800×360 no la sustituyen.

1. Abrir Chrome y el enlace del proyecto QA-PRESENTACION-20261109 de arriba.
   Iniciar sesión personalmente. Anotar modelo del teléfono, versión de Android
   y versión de Chrome (menú → Configuración → Información de Chrome).
2. Pasar de página1 a2, usar los botones +/− del visor y comprobar que no vuelve
   a otra página. Volver a1; abrir Refuerzos y expandir el título de energía.
   Girar el teléfono y desplazar el contenido: texto y botones deben poder leerse
   y pulsarse. Cerrar el panel y comprobar página/zoom conservados.
3. En Revisar publicación, copiar el enlace vigente. Abrirlo en una pestaña de
   incógnito de Chrome para probar como lector sin la cuenta del propietario.
   No retirar ni republicar mientras se utiliza ese enlace en la presentación.
4. Tocar con el dedo el indicador1 o Refuerzos, expandir la tarjeta y consultar
   la explicación. En la valoración elegir Útil, cambiar a Sigue sin ser claro
   y volver a Útil: debe quedar una sola opción. Enviar una vez y comprobar la
   confirmación. No usar el modo propietario para acreditar esta valoración.
5. Responder las tres preguntas del quiz y enviar una vez. Deben aparecer nota
   y razones. Recargar esa misma pestaña: conservar el resultado y respetar el
   bloqueo de reintentos. No cerrar la sesión de incógnito entre ambos pasos.
6. Probar la red del lugar de exposición y, si hace falta, datos móviles. No hay
   modo offline. Añadir el dashboard a la pantalla de inicio desde Chrome normal,
   menú → Instalar y crear acceso directo → Crear acceso directo (según versión).

Para registrar el resultado: indicar dispositivo/versiones, red, pasos que
pasaron y cualquier aviso exacto. Capturar solo pantallas de PDF/refuerzo/nota,
sin campos de contraseñas ni URL que muestre el token de lectura. Un resultado
comunicado por el propietario se identifica como tal; no como observación del
agente. Solo después se evalúa cerrar el caso táctil aplicable de SCRUM-137.


## Recorrido guiado disponible en QA — SCRUM-237 (09/11/2026)

QA actualizado con autorización a a1e930f y comprobado en navegador integrado a390×844. La mejora organiza las funciones existentes, sin cambiar el alcance de las historias. PR#66 sigue sin merge; la comprobación táctil de esta versión en Android real permanece pendiente. Recarga la página en Chrome del celular para cargar el recorrido nuevo.

1. En el proyecto, lee «Aprende con tu PDF, paso a paso». Abre el PDF y marca el fragmento que no entiendes. Para saltar de página o cambiar zoom, abre «Ir a página, zoom y vista previa».
2. Pulsa «Abrir solicitud de refuerzo»: extrae/revisa el texto y confírmalo. Después elige categoría, describe tu dificultad y guárdala. El tercer paso permite enviar. Cerrar el formulario conserva el borrador durante esta visita; recargar/salir descarta lo no enviado.
3. Pulsa «Continuar al análisis de mi solicitud». En «1. Analizar el fragmento», revisa el contexto si lo necesitas y ejecuta el análisis. Si falta contexto, prepara una selección suficiente; no inventes un resultado.
4. En «2. Elegir cómo entenderlo», obtén recomendaciones, lee la justificación y guarda una opción. En «3. Generar y revisar el refuerzo», configura ese formato, genera y revisa. Aprobar es una decisión separada; el mini quiz es opcional después de generar.
5. Consulta los aprobados en «Refuerzos». Publicación y estadísticas permanecen en «Compartir y consultar resultados (opcional)». Historial y regeneración siguen en «Más opciones».

Antes de exponer, comprobar en Android real: selección en página posterior a la segunda, regreso al formulario sin pérdida, controles con teclado móvil y diagrama con sus números/explicaciones legibles.
