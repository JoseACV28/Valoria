# Arquitectura de Ilustraciones para Valoria

Este documento define la entrada recomendada para integrar una segunda vertical creativa dentro de Valoria:

- `Historias`
- `Ilustraciones`

La meta es que ambas convivan bajo la misma marca, compartan identidad social y mantengan experiencias separadas donde haga falta.

## Principios

1. `Un solo producto, dos verticales`
   - El usuario no debe sentir que navega dos sitios distintos.
   - Historias e ilustraciones comparten cuenta, perfil, seguidores, comentarios, muro y descubrimiento.

2. `Experiencias separadas`
   - La lectura larga sigue viviendo en la vertical de historias.
   - La exploración visual y el grid tipo galería viven en la vertical de ilustraciones.

3. `Perfiles mixtos`
   - Un perfil puede ser solo escritor, solo ilustrador o mixto.

4. `Implementación incremental`
   - Primero se crea la estructura.
   - Luego se habilita exploración visual.
   - Después social, guardados, colecciones y ranking.

## SQL de base

El esquema SQL exacto de esta vertical está en:

- [illustrations-schema.sql](D:/proyectos%20codex/histopad/supabase/illustrations-schema.sql)

Ese archivo agrega:

- `profile_roles`
- `illustration_series`
- `illustration_posts`
- `illustration_images`
- `illustration_categories`
- `illustration_post_categories`
- `illustration_tags`
- `illustration_post_tags`
- `illustration_comments`
- `illustration_comment_likes`
- `illustration_post_likes`
- `illustration_saves`

## Estructura recomendada

### Cliente

```text
client/
  src/
    api/
      illustrationApi.js
      feedApi.js

    components/
      illustrations/
        IllustrationCard.jsx
        IllustrationGrid.jsx
        IllustrationHero.jsx
        IllustrationComposer.jsx
        IllustrationGallery.jsx
        IllustrationComments.jsx
        IllustrationSaveButton.jsx
        IllustrationFilters.jsx

      feed/
        CommunityFeed.jsx
        SpecialValoria.jsx

      directory/
        CreatorCard.jsx
        IllustratorCard.jsx

    data/
      illustrationCategories.js
      illustrationSorts.js

    pages/
      IllustrationExplorePage.jsx
      IllustrationDetailPage.jsx
      IllustrationDashboard.jsx
      IllustratorsPage.jsx

    styles/
      IllustrationExplorePage.module.css
      IllustrationDetailPage.module.css
      IllustrationDashboard.module.css
      IllustrationCard.module.css
      IllustrationGrid.module.css
```

### Servidor

```text
server/
  src/
    controllers/
      illustrationController.js
      illustrationCommentController.js
      feedController.js
      illustratorDirectoryController.js

    models/
      illustrationModel.js
      illustrationCommentModel.js
      feedModel.js
      illustratorDirectoryModel.js

    routes/
      illustrationRoutes.js
      feedRoutes.js
      directoryRoutes.js

    utils/
      illustrationMappers.js
      illustrationSorts.js
```

## Rutas recomendadas

### Frontend

```text
#/illustrations
#/illustrations/:identifier
#/illustration-studio
#/illustrators
```

### Backend

```text
GET    /api/illustrations
GET    /api/illustrations/:identifier
POST   /api/illustrations
PATCH  /api/illustrations/:id
DELETE /api/illustrations/:id

POST   /api/illustrations/:id/images
POST   /api/illustrations/:id/comments
PATCH  /api/illustrations/comments/:commentId
DELETE /api/illustrations/comments/:commentId
POST   /api/illustrations/comments/:commentId/like

POST   /api/illustrations/:id/like
POST   /api/illustrations/:id/save
DELETE /api/illustrations/:id/save

GET    /api/illustrators
GET    /api/feed/home
GET    /api/feed/community
GET    /api/feed/illustrations
```

## Home integrado

El home principal puede convivir con ambas verticales si mantiene este orden:

1. `Hero principal`
2. `Especial Valoria`
   - rota historias o ilustraciones cada 24h
3. `Series destacadas`
4. `Galería destacada`
5. `Comunidad`

## Navegación recomendada

Sidebar izquierda:

- `Inicio`
- `Descubrir`
- `Historias`
- `Ilustraciones`
- `Comunidad`
- `Escritores`
- `Ilustradores`
- `Mi perfil`
- `Muro`
- `Siguiendo`
- `Panel de creador`

## Modelo de perfil

Cada perfil debe mostrar:

- cabecera
- avatar
- bio
- seguidores
- siguiendo
- rol creativo
- pestañas:
  - `Info`
  - `Muro`
  - `Historias`
  - `Ilustraciones`
  - `Siguiendo`

## Experiencia de creador

Un solo panel, con dos modos:

- `Historias`
- `Ilustraciones`

### Historias

- crear historia
- crear capítulo
- publicar
- editar
- borrar

### Ilustraciones

- crear post visual
- subir una o varias imágenes
- elegir serie
- categorías
- etiquetas
- publicar
- editar
- borrar

## Orden de implementación sugerido

### Fase 1

- ejecutar `illustrations-schema.sql`
- crear `illustrationApi.js`
- crear `illustrationModel.js`
- crear `illustrationRoutes.js`
- crear `IllustrationExplorePage.jsx`

### Fase 2

- detalle de ilustración
- comentarios
- likes
- guardados
- directorio de ilustradores

### Fase 3

- integración al home
- feeds combinados
- colecciones
- rankings

## Notas de integración

1. No reutilizar directamente los modelos de historias para ilustraciones.
   - Compartir helpers sí.
   - Compartir tablas no.

2. Reutilizar lo que ya existe:
   - perfiles
   - follows
   - navbar
   - shell
   - uploads
   - estilos base

3. Mantener una separación semántica clara:
   - `story`
   - `illustration`

Eso evita deuda técnica cuando lleguen búsquedas, ranking o analytics por vertical.
