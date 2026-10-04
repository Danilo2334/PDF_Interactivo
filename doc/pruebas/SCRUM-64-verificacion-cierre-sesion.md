# SCRUM-64 - Verificación del cierre de sesión

## Información general

| Campo | Valor |
|---|---|
| Historia relacionada | SCRUM-15 - HU003 Cierre de sesión |
| Tarea | SCRUM-64 - Probar el cierre y la invalidación de sesión |
| Fecha | 04/10/2026 |
| Rama | feature/scrum-15-hu003-cierre-sesion |
| Entorno | Desarrollo local |

## Flujo verificado

El usuario autenticado solicita cerrar su sesión desde el panel. La aplicación
invalida la sesión mediante Supabase Auth, elimina las cookies asociadas y
redirige al formulario de ingreso. Las rutas privadas vuelven a validar la
identidad antes de mostrar información.

## Casos de prueba

| ID | Prueba | Resultado esperado | Estado |
|---|---|---|---|
| CP-01 | Abrir el panel con una sesión vigente | Mostrar la opción “Cerrar sesión” | Aprobado |
| CP-02 | Activar el cierre de sesión | Mostrar el estado “Cerrando sesión...” mientras se procesa | Aprobado |
| CP-03 | Completar el cierre de sesión | Redirigir a `/login?logout=success` | Aprobado |
| CP-04 | Revisar la página de ingreso después del cierre | Mostrar “Cerraste sesión correctamente” | Aprobado |
| CP-05 | Intentar abrir `/dashboard` después del cierre | Redirigir a `/login` | Aprobado |
| CP-06 | Usar el botón Atrás después del cierre | Impedir que el panel vuelva a quedar accesible | Aprobado |
| CP-07 | Iniciar sesión nuevamente | Permitir crear una nueva sesión válida | Aprobado |
| CP-08 | Ejecutar `npm run lint` | Finalizar sin errores ni advertencias | Aprobado |
| CP-09 | Ejecutar `npm run build` | Compilar todas las rutas correctamente | Aprobado |

## Evidencias requeridas en Jira

1. Opción de cierre visible en el panel autenticado.
2. Estado de procesamiento del botón.
3. Confirmación mostrada después de cerrar la sesión.
4. Redirección al intentar reutilizar una ruta privada.
5. Resultado de la navegación hacia atrás.
6. Nuevo inicio de sesión correcto.
7. Resultados de `lint` y `build`.

## Verificación automática realizada

```text
npm run lint  -> aprobado
npm run build -> aprobado
```

## Criterio de cierre

SCRUM-64 y HU003 podrán marcarse como finalizadas cuando CP-01 a CP-07 se
ejecuten en el navegador, sus resultados coincidan con lo esperado y las
capturas correspondientes se adjunten en Jira.
