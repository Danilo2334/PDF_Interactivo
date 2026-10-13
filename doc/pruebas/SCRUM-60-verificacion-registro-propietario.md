# SCRUM-60 - Verificación completa del registro de propietario

## Información general

| Campo | Valor |
|---|---|
| Historia relacionada | SCRUM-6 - HU001 Registro de propietario |
| Tarea | SCRUM-60 - Verificar registro completo |
| Fecha de ejecución | 03/10/2026 |
| Rama | feature/scrum-6-hu001-registro-propietario |
| Entorno | Desarrollo local |
| Resultado general | Aprobado |

## Flujo verificado

El propietario completa el formulario de registro. La información es
validada en cliente y servidor. Posteriormente, Supabase Auth crea la
cuenta y el trigger de base de datos registra los datos básicos en la
tabla `profiles`. Finalmente, la aplicación informa el resultado al
usuario.

## Casos de prueba

| ID | Prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| CP-01 | Enviar formulario vacío | Mostrar errores en los tres campos | Los errores se muestran junto a cada campo | Aprobado |
| CP-02 | Ingresar correo inválido | Rechazar el formato del correo | Se muestra el mensaje de correo inválido | Aprobado |
| CP-03 | Ingresar contraseña corta | Exigir mínimo 8 caracteres | La contraseña es rechazada | Aprobado |
| CP-04 | Ingresar contraseña sin mayúscula o número | Informar el requisito faltante | Se muestra el mensaje correspondiente | Aprobado |
| CP-05 | Registrar un correo nuevo | Crear la cuenta y el perfil del propietario | El usuario aparece en Auth y en `profiles` | Aprobado |
| CP-06 | Registrar nuevamente el mismo correo | Rechazar el correo duplicado | Se muestra “Este correo ya está registrado” | Aprobado |
| CP-07 | Ejecutar lint | No presentar errores | Finalizó sin errores | Aprobado |
| CP-08 | Ejecutar build de producción | Compilar correctamente | Compilación completada correctamente | Aprobado |

## Verificación por capas

| Capa | Evidencia | Estado |
|---|---|---|
| Interfaz | Formulario renderizado y mensajes visibles | Aprobado |
| Validación cliente | Campos inválidos rechazados antes del envío | Aprobado |
| Validación servidor | Datos validados nuevamente mediante Zod | Aprobado |
| Autenticación | Usuario creado mediante Supabase Auth | Aprobado |
| Persistencia | Propietario almacenado en la tabla `profiles` | Aprobado |
| Manejo de duplicados | Segundo registro del mismo correo rechazado | Aprobado |
| Calidad técnica | Lint y build ejecutados correctamente | Aprobado |

## Evidencias

Las capturas de los siguientes resultados fueron adjuntadas en
la tarea SCRUM-60 de Jira:

1. Validación de campos obligatorios.
2. Validación de correo inválido.
3. Validaciones de contraseña.
4. Mensaje de cuenta creada.
5. Registro almacenado en la tabla `profiles`.
6. Mensaje de correo duplicado.
7. Resultado de lint y build.

## Observación técnica

Durante las pruebas se alcanzó el límite del servicio de correo de
desarrollo de Supabase. La confirmación por correo fue desactivada
temporalmente para completar las pruebas locales.

Antes del despliegue a producción se deberá configurar un servicio
SMTP y activar nuevamente la confirmación del correo.

## Conclusión

El registro de propietario cumple los criterios definidos para HU001.
El sistema valida los datos, crea la cuenta de forma segura, almacena
el perfil, evita correos duplicados y comunica correctamente el
resultado al usuario.