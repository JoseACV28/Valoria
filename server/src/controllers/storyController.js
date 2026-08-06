// Controlador HTTP para listar, crear y recuperar historias.
import { StoryModel } from "../models/storyModel.js";

export async function getStories(request, response, next) {
  // Lista historias publicas, con opcion de filtrar solo destacadas.
  try {
    const featuredOnly = request.query.featured === "true";
    const stories = await StoryModel.getAll({ featuredOnly });

    response.json({
      total: stories.length,
      stories
    });
  } catch (error) {
    next(error);
  }
}

export async function getStoryById(request, response, next) {
  // Recupera una historia puntual mediante id o slug publico.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.identifier);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    return response.json({ story });
  } catch (error) {
    return next(error);
  }
}

export async function createStory(request, response, next) {
  // Crea una nueva historia asociada al usuario autenticado.
  try {
    const { title, description, category } = request.body;

    if (!title || !description || !category) {
      return response.status(400).json({
        message: "title, description y category son obligatorios"
      });
    }

    const story = await StoryModel.create({
      ...request.body,
      authorId: request.authUser.id,
      authorName: request.authUser.displayName
    });
    return response.status(201).json({ story });
  } catch (error) {
    return next(error);
  }
}

export async function deleteStory(request, response, next) {
  // Elimina una historia solo si el actor autenticado es su autor.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    if (story.authorId !== request.authUser?.id) {
      return response.status(403).json({
        message: "No puedes eliminar historias de otra cuenta"
      });
    }

    await StoryModel.delete(story.id);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function updateStory(request, response, next) {
  // Guarda cambios de metadata editorial sobre una historia existente.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    if (story.authorId !== request.authUser?.id) {
      return response.status(403).json({
        message: "No puedes editar historias de otra cuenta"
      });
    }

    const updatedStory = await StoryModel.update(story.id, request.body);
    return response.json({ story: updatedStory });
  } catch (error) {
    return next(error);
  }
}

export async function getMyStories(request, response, next) {
  // Devuelve la biblioteca privada del creador autenticado.
  try {
    const stories = await StoryModel.getByAuthorId(request.authUser.id);
    return response.json({ stories });
  } catch (error) {
    return next(error);
  }
}

export async function registerStoryRead(request, response, next) {
  // Incrementa el contador de lecturas publicas de la historia.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    const updatedStory = await StoryModel.registerRead(story.id);
    return response.json({ story: updatedStory });
  } catch (error) {
    return next(error);
  }
}
