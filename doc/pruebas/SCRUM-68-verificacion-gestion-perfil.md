# SCRUM-68 - Verificación de la gestión del perfil

## Información general

| Campo | Valor |
|---|---|
| Historia relacionada | SCRUM-17 - HU005 Gestión del perfil |
| Tarea | SCRUM-68 - Probar consulta y actualización del perfil |
| Fecha | 06/10/2026 |
| Rama | feature/scrum-17-hu005-gestion-perfil |
| Entorno | Desarrollo local |

## Flujo verificado

El propietario autenticado accede a su perfil desde el panel, consulta el
nombre y correo asociados con su cuenta y actualiza únicamente el nombre. La
aplicación valida el dato en cliente y servidor, guarda el cambio mediante
Supabase Auth y conserva la información después de recargar o volver a entrar
al perfil. La ruta privada impide el acceso cuando no existe una sesión válida.

## Casos de prueba

| ID | Prueba | Resultado esperado | Estado |
|---|---|---|---|
| CP-01 | Acceder a “Mi perfil” desde el panel | Abrir la ruta `/profile` | Aprobado |
| CP-02 | Consultar los datos del propietario | Mostrar el nombre y el correo de la cuenta autenticada | Aprobado |
| CP-03 | Intentar modificar el correo | Mantener el correo en modo de solo lectura | Aprobado |
| CP-04 | Guardar el nombre `A` | Rechazarlo y mostrar el error de mínimo 2 caracteres | Aprobado |
| CP-05 | Guardar un nombre válido | Actualizar el perfil y mostrar la confirmación de éxito | Aprobado |
| CP-06 | Recargar la página después de actualizar | Conservar el nombre actualizado | Aprobado |
| CP-07 | Volver al panel y entrar nuevamente al perfil | Mostrar el nombre actualizado | Aprobado |
| CP-08 | Abrir `/profile` sin una sesión activa | Redirigir al formulario de inicio de sesión | Aprobado |
| CP-09 | Cancelar una edición antes de guardar | Restaurar el nombre anterior sin almacenar cambios | Aprobado |
| CP-10 | Ejecutar `npm run lint` | Finalizar sin errores | Aprobado |
| CP-11 | Ejecutar `npm run build` | Compilar todas las rutas correctamente | Aprobado |

## Evidencias registradas en Jira

1. Perfil con el nombre y correo del propietario.
2. Validación de un nombre con menos de dos caracteres.
3. Confirmación de la actualización correcta.
4. Persistencia del nombre después de recargar y volver al perfil.
5. Redirección a `/login` al solicitar `/profile` sin sesión.
6. Cancelación de la edición sin guardar cambios.
7. Resultados aprobados de `lint` y `build`.

## Verificación automática realizada

```text
npm run lint  -> aprobado
npm run build -> aprobado
```

La compilación reconoce `/profile` como ruta dinámica. `proxy.ts` renueva la
sesión y realiza la comprobación inicial, mientras que la página y la acción de
actualización vuelven a validar al usuario antes de consultar o modificar sus
datos.

## Resultado

Todos los casos de prueba fueron aprobados. SCRUM-68 y la historia HU005 pueden
marcarse como finalizadas.
