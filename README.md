# HistoPad

Proyecto full stack inspirado en Wattpad, separado en `client/` y `server/`.

## Estado del proyecto

`HistoPad` sigue en desarrollo activo. La base principal de historias, perfiles, muro de creador, ilustraciones, notificaciones y exploracion ya esta operativa, pero el proyecto aun no debe considerarse terminado ni cerrado a cambios de estructura o UX.

## Stack elegido

- Cliente: React + Vite
- Estilos: CSS Modules + hoja global
- Servidor: Node.js + Express
- Persistencia preparada para: Supabase Postgres + Supabase Storage
- Auth preparada para: registro y login con Supabase Auth

## Estructura

```text
client/
  src/
    api/
    components/
    data/
    pages/
    styles/
server/
  src/
    config/
    controllers/
    data/
    models/
    routes/
    utils/
supabase/
  schema.sql
  illustrations-schema.sql
docs/
  illustrations-architecture.md
```

## Instalacion

```bash
npm install
```

## Desarrollo

En una terminal:

```bash
npm run dev:server
```

En otra terminal:

```bash
npm run dev:client
```

El cliente queda en `http://localhost:5173` y la API en `http://localhost:4000`.

## Conexion con Supabase

1. Crea un proyecto en Supabase.
2. Ejecuta el SQL de [supabase/schema.sql](/D:/proyectos%20codex/histopad/supabase/schema.sql) en el SQL Editor.
3. Copia [server/.env.example](/D:/proyectos%20codex/histopad/server/.env.example) como `server/.env` y completa:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET`
4. Copia [client/.env.example](/D:/proyectos%20codex/histopad/client/.env.example) como `client/.env` si quieres cambiar la URL de la API.

Sin variables de Supabase, el servidor funciona con datos demo y subida local de archivos.

## Extension de ilustraciones

Si quieres evolucionar Valoria hacia una vertical mixta de historias + ilustraciones, ya dejé preparada la base documental en:

- [supabase/illustrations-schema.sql](/D:/proyectos%20codex/histopad/supabase/illustrations-schema.sql)
- [docs/illustrations-architecture.md](/D:/proyectos%20codex/histopad/docs/illustrations-architecture.md)

`illustrations-schema.sql` agrega tablas para:
- ilustradores
- posts de ilustracion
- series visuales
- etiquetas
- comentarios
- likes
- guardados

Estado actual del proyecto:
- `SUPABASE_URL` configurada
- `SUPABASE_ANON_KEY` o publishable key configurada
- falta `SUPABASE_SERVICE_ROLE_KEY` para activar por completo auth, storage y escritura segura desde el backend

## Auth local de desarrollo

Si todavia no conectas Supabase, puedes probar con:

- correo: `demo@histopad.app`
- contrasena: `demo1234`

## Endpoints listos

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/stories`
- `POST /api/stories`
- `GET /api/stories/:identifier`
- `GET /api/stories/:storyId/chapters`
- `POST /api/stories/:storyId/chapters`
- `POST /api/uploads/story-cover`
- `POST /api/uploads/chapter-image`

## Despliegue sugerido

- Frontend: Vercel o Render Static Site
- Backend: Render Web Service
- Base de datos y storage: Supabase
