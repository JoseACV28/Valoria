import { moveToTrash } from '../models/contentRecovery.js';
import { notifyChapterPublished } from "../utils/chapterNotifications.js";
import { savePublicationSchedule } from "../utils/publicationSchedule.js";
// Controlador HTTP para lectura y creacion de capitulos.
import { ChapterModel } from "../models/chapterModel.js";
import { StoryModel } from "../models/storyModel.js";
import { canReadContent } from "../utils/contentAccess.js";

function validateChapterInput(input) {
  return typeof input.title === "string" && input.title.trim() &&
    Number.isSafeInteger(Number(input.chapterNumber)) && Number(input.chapterNumber) > 0 &&
    (input.status === undefined || ["draft", "published"].includes(input.status));
}

export async function getStoryChapters(request, response, next) {
  // Lista los capitulos de una historia para lectura o panel de edicion.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!canReadContent(story, request.authUser)) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    const chapters = await ChapterModel.getByStoryId(story.id, {
      publishedOnly: story.authorId !== request.authUser?.id
    });
    const reserved=story.authorId===request.authUser?.id?await ChapterModel.getByStoryId(story.id,{includeDeleted:true}):chapters;
    return response.json({ chapters,nextChapterNumber:Math.max(0,...reserved.map(x=>Number(x.chapter_number)||0))+1 });
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

    if (!validateChapterInput(request.body)) {
      return response.status(400).json({
        message: "Indica un titulo, un numero de capitulo entero positivo y un estado valido"
      });
    }

    if(request.body.scheduledAt && (!Number.isFinite(Date.parse(request.body.scheduledAt)) || Date.parse(request.body.scheduledAt)<=Date.now() || request.body.status==='published'))return response.status(400).json({message:'La programación debe ser una fecha futura y el capítulo debe quedar en borrador.'});
    const chapter = await ChapterModel.create(story.id, request.body);
    if(chapter.status==='published')notifyChapterPublished(story,chapter).catch(()=>{});

    if(request.body.scheduledAt !== undefined)await savePublicationSchedule(request.authUser.id,story.id,chapter.id,request.body.scheduledAt);
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

    if (!validateChapterInput(request.body)) {
      return response.status(400).json({
        message: "Indica un titulo, un numero de capitulo entero positivo y un estado valido"
      });
    }

    const previous=(await ChapterModel.getByStoryId(story.id)).find(x=>x.id===request.params.chapterId);
    if(!previous)return response.status(404).json({message:'Capítulo no encontrado.'});
    if(request.body.scheduledAt && (!Number.isFinite(Date.parse(request.body.scheduledAt)) || Date.parse(request.body.scheduledAt)<=Date.now() || request.body.status==='published'))return response.status(400).json({message:'La programación requiere una fecha futura y estado borrador.'});
    const chapter = await ChapterModel.update(
      story.id,
      request.params.chapterId,
      request.body
    );

    if(request.body.scheduledAt !== undefined)await savePublicationSchedule(request.authUser.id,story.id,chapter.id,request.body.scheduledAt);
    let nextStory = null;

    if (chapter.status === "published" && story.status !== "published") {
      nextStory = await StoryModel.update(story.id, { status: "published" });
    }

    if(previous?.status!=='published' && chapter.status==='published')notifyChapterPublished(story,chapter).catch(()=>{});
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

    if(!(await ChapterModel.getByStoryId(story.id)).some(chapter=>chapter.id===request.params.chapterId))return response.status(404).json({message:'Capítulo no encontrado.'});
    await moveToTrash('chapter',request.params.chapterId,request.authUser.id);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function addChapterIllustration(request, response, next) {
  // Agrega una ilustracion asociada a un capitulo desde el panel del creador.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!canReadContent(story, request.authUser)) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    const isAuthor = story.authorId === request.authUser?.id;
    const imageRole = request.body.imageRole || "community";
    if (!["creator", "community"].includes(imageRole)) {
      return response.status(400).json({ message: "El rol de imagen no es valido" });
    }

    if (!isAuthor && imageRole === "creator") {
      return response.status(403).json({
        message: "Solo el autor puede añadir ilustraciones del creador"
      });
    }

    const chapters = await ChapterModel.getByStoryId(story.id, { publishedOnly: !isAuthor });
    if (!chapters.some((chapter) => chapter.id === request.params.chapterId)) {
      return response.status(404).json({ message: "Capitulo no encontrado" });
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
        imageRole,
        contributorId: request.authUser?.id || null,
        contributorName: request.authUser?.displayName || request.body.contributorName
      }
    );

    return response.status(201).json({ illustration });
  } catch (error) {
    return next(error);
  }
}
