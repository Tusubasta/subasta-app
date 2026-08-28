# La Subasta — desplegar en Netlify

Tal como está, este proyecto funciona con modo local y online, usando
Gemini como juez (con tu cuenta de Gemini Pro) y Firebase para
sincronizar las salas online. Es gratis en ambos casos para este uso.

## 1. Conseguir la API key de Gemini

1. Andá a https://aistudio.google.com/apikey (con la misma cuenta de tu
   Gemini Pro).
2. Creá una API key y copiala. Es gratis generarla; el uso de este
   juego entra tranquilo en la cuota gratuita.

## 2. Crear el proyecto de Firebase (para las salas online)

1. Andá a https://console.firebase.google.com → **Crear proyecto**
   (nombre libre, ej. "la-subasta"). Podés desactivar Google Analytics,
   no hace falta.
2. Dentro del proyecto: **Compilación → Realtime Database → Crear
   base de datos**. Elegí una región y arrancá en **modo de prueba**
   (permite lectura/escritura sin login; alcanza para jugar con
   amigos — no pongas nada sensible en las salas).
3. Andá a **Configuración del proyecto** (el engranaje) → bajá hasta
   "Tus apps" → ícono `</>` (Web) → registrá una app (nombre libre,
   sin Hosting).
4. Te va a mostrar un objeto `firebaseConfig`. Copiá esos valores.
5. Abrí `src/firebase.js` en este proyecto y pegalos reemplazando los
   placeholders (`TU_API_KEY`, `TU_PROYECTO`, etc.).

## 3. Instalar y probar en tu máquina (opcional pero recomendado)

```bash
npm install
npm run dev
```

Esto abre el juego en `http://localhost:5173`. El modo local ya
funciona. El juez (Gemini) todavía no va a responder en local porque
la función serverless corre en Netlify — para probarla local también,
instalá `netlify-cli` y corré `netlify dev` en vez de `npm run dev`.

## 4. Subir el código a GitHub

Netlify se conecta mejor a un repo. Si no tenés uno:

```bash
git init
git add .
git commit -m "La Subasta"
```

Subilo a un repo nuevo en GitHub (creá el repo vacío en github.com y
seguí las instrucciones de "push an existing repository").

## 5. Desplegar en Netlify

1. Entrá a https://app.netlify.com → **Add new site → Import an
   existing project** → conectá GitHub → elegí el repo.
2. Netlify va a detectar solo el `netlify.toml` (build: `npm run
   build`, publish: `dist`, functions: `netlify/functions`). Dejalo
   así y dale **Deploy**.
3. Antes de que sirva del todo, andá a **Site configuration →
   Environment variables** y agregá:
   - `GEMINI_API_KEY` = la key que sacaste en el paso 1.
4. Volvé a **Deploys → Trigger deploy → Deploy site** para que tome
   la variable nueva.

Listo: te da una URL tipo `https://tu-sitio.netlify.app` con el juego
completo, modo local y online, y el juez respondiendo con Gemini.

## Notas

- La Realtime Database en "modo de prueba" es pública para cualquiera
  que tenga la URL del proyecto — perfecto para jugar entre amigos con
  un código de sala, pero no la uses para nada confidencial. Si más
  adelante querés cerrarla, Firebase te deja poner reglas de acceso.
- Si en algún momento cambiás de modelo de Gemini, el nombre del
  modelo está en una sola línea de
  `netlify/functions/juez.js` (`gemini-2.5-flash`).
