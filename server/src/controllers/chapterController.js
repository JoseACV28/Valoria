// Controlador HTTP para lectura y creacion de capitulos.
import { ChapterModel } from "../models/chapterModel.js";
import { StoryModel } from "../models/storyModel.js";

export async function getStoryChapters(request, response, next) {
  // Lista los capitulos de una historia para lectura o panel de edicion.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    const chapters = await ChapterModel.getByStoryId(story.id);
    return response.json({ chapters });
  } catch (error) {
    return next(error);
  }
}

export async function createChapter(request, response, next) {
  // Crea un nuevo capitulo y promueve la historia si pasa a publicado.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    if (story.authorId !== request.authUser?.id) {
      return response.status(403).json({
        message: "No puedes modificar capitulos de otra historia"
      });
    }

    const { title, chapterNumber } = request.body;

    if (!title || !chapterNumber) {
      return response.status(400).json({
        message: "title y chapterNumber son obligatorios"
      });
    }

    const chapter = await ChapterModel.create(story.id, request.body);

    let nextStory = null;

    if (chapter.status === "published" && story.status !== "published") {
      nextStory = await StoryModel.update(story.id, { status: "published" });
    }

    return response.status(201).json({
      chapter,
      story: nextStory
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateChapter(request, response, next) {
  // Actualiza contenido, orden y estado de un capitulo existente.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    if (story.authorId !== request.authUser?.id) {
      return response.status(403).json({
        message: "No puedes modificar capitulos de otra historia"
      });
    }

    const { title, chapterNumber } = request.body;

    if (!title || !chapterNumber) {
      return response.status(400).json({
        message: "title y chapterNumber son obligatorios"
      });
    }

    const chapter = await ChapterModel.update(
      story.id,
      request.params.chapterId,
      request.body
    );

    let nextStory = null;

    if (chapter.status === "published" && story.status !== "published") {
      nextStory = await StoryModel.update(story.id, { status: "published" });
    }

    return response.json({
      chapter,
      story: nextStory
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteChapter(request, response, next) {
  // Elimina un capitulo puntual dentro de la historia.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    if (story.authorId !== request.authUser?.id) {
      return response.status(403).json({
        message: "No puedes eliminar capitulos de otra historia"
      });
    }

    await ChapterModel.delete(story.id, request.params.chapterId);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function addChapterIllustration(request, response, next) {
  // Agrega una ilustracion asociada a un capitulo desde el panel del creador.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    if (story.authorId !== request.authUser?.id) {
      return response.status(403).json({
        message: "No puedes ilustrar capitulos de otra historia"
      });
    }

    const { publicUrl, storagePath } = request.body;

    if (!publicUrl || !storagePath) {
      return response.status(400).json({
        message: "publicUrl y storagePath son obligatorios"
      });
    }

    const illustration = await ChapterModel.addIllustration(
      story.id,
      request.params.chapterId,
      {
        ...request.body,
        contributorId: request.authUser?.id || null,
        contributorName: request.authUser?.displayName || request.body.contributorName
      }
    );

    return response.status(201).json({ illustration });
  } catch (error) {
    return next(error);
  }
}
