This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## IA de los refuerzos

La integración usa llamadas de servidor con salida estructurada y validadores del
dominio. Para seleccionar GPT Sol, configura de forma privada `web/.env.local`:

```dotenv
AI_PROVIDER=openai
OPENAI_ANALYSIS_MODEL=gpt-6.1-sol
```

`OPENAI_API_KEY` debe existir en ese mismo archivo ignorado o en las variables del
servidor. Nunca lleva `NEXT_PUBLIC_`, se versiona ni se envía al navegador.
Encontrar una clave no cambia de proveedor automáticamente. Con
`AI_PROVIDER=openai`, una clave/modelo ausente deshabilita la generación; no usa
Gemini como respaldo ni cambia a otro modelo. La selección explícita
`AI_PROVIDER=gemini` usa `GEMINI_API_KEY` y `GEMINI_ANALYSIS_MODEL`. Sin
`AI_PROVIDER` se conserva la configuración Gemini de instalaciones anteriores.

Las solicitudes OpenAI usan Responses API, `store:false`, razonamiento bajo,
tarifa Standard, sin herramientas ni conversación previa, máximo de salida por
tarea y timeout de hasta 45 segundos. Cada llamada se intenta una vez. El quiz
incluye una segunda llamada acotada de auditoría semántica; no aprueba ni publica
el resultado. La revisión del propietario sigue siendo necesaria.

`AI_USAGE_LOG=1` activa únicamente metadatos de consumo en el servidor: proveedor,
modelo y tokens de entrada, salida y entrada cacheada. No registra claves,
documentos, prompts, respuestas ni identificadores de usuarios. Omítela para no
emitir esos metadatos. Los tokens permiten estimar costo, no acreditan la factura.

Conserva también las variables existentes de Supabase y
`REINFORCEMENT_REQUEST_SECRET`; no generes otro secreto para sustituir el remoto.
Consulta `doc/CONTEXTO-PROYECTO.md` desde la raíz para pruebas y dependencias de
publicación. La integración local no implica un despliegue.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
