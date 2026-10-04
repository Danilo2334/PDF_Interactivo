# SCRUM-62 - Verificación del inicio de sesión

## Información general

| Campo | Valor |
|---|---|
| Historia relacionada | SCRUM-14 - HU002 Inicio de sesión |
| Tarea | SCRUM-62 - Probar el flujo de inicio de sesión |
| Fecha | 03/10/2026 |
| Rama | feature/scrum-14-hu002-inicio-de-sesion |
| Entorno | Desarrollo local |

## Flujo verificado

El usuario ingresa su correo y contraseña. La aplicación valida los campos en
cliente y servidor, autentica las credenciales mediante Supabase Auth, conserva
la sesión en cookies seguras y permite el acceso al panel privado. Las rutas
protegidas verifican la identidad antes de mostrar información.

## Casos de prueba

| ID | Prueba | Resultado esperado | Estado |
|---|---|---|---|
| CP-01 | Enviar formulario vacío | Mostrar errores junto a correo y contraseña | Aprobado |
| CP-02 | Ingresar correo con formato inválido | Rechazar el correo antes de autenticar | Aprobado |
| CP-03 | Ingresar correo o contraseña incorrectos | Mostrar “Correo o contraseña incorrectos” sin revelar cuál dato falló | Aprobado |
| CP-04 | Ingresar credenciales válidas | Crear la sesión y redirigir a `/dashboard` | Aprobado |
| CP-05 | Abrir `/dashboard` sin sesión | Redirigir a `/login` | Aprobado |
| CP-06 | Abrir `/login` con sesión activa | Redirigir a `/dashboard` | Aprobado |
| CP-07 | Recargar el panel con sesión activa | Mantener el acceso autenticado | Aprobado |
| CP-08 | Ejecutar `npm run lint` | Finalizar sin errores | Aprobado |
| CP-09 | Ejecutar `npm run build` | Compilar todas las rutas correctamente | Aprobado |

## Evidencias requeridas en Jira

1. Validación de campos obligatorios.
2. Rechazo de correo inválido.
3. Mensaje para credenciales incorrectas.
4. Inicio de sesión válido y redirección al panel.
5. Redirección al intentar acceder al panel sin sesión.
6. Persistencia de la sesión después de recargar.
7. Resultados de `lint` y `build`.

## Verificación automática realizada

```text
npm run lint  -> aprobado
npm run build -> aprobado
```

La compilación reconoce `/login` como ruta pública, `/dashboard` como ruta
dinámica protegida y `proxy.ts` como el componente encargado de renovar y
validar la sesión.

## Criterio de cierre

SCRUM-62 y HU002 podrán marcarse como finalizadas cuando CP-01 a CP-07 se
ejecuten en el navegador, sus resultados coincidan con lo esperado y las
capturas correspondientes se adjunten en Jira.
