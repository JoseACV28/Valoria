// Controlador de subida de imagenes.
// Guarda portadas e imagenes de capitulo en Supabase o fallback local.
import { storeImageFile } from "../utils/storage.js";

export async function uploadChapterImage(request, response, next) {
  // Persiste una imagen usada dentro de un capitulo.
  try {
    const upload = await storeImageFile({
      file: request.file,
      folder: "chapters",
      request
    });

    response.status(201).json({
      file: {
        ...upload,
        altText: request.body.altText || ""
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadStoryCover(request, response, next) {
  // Persiste la portada principal de una historia.
  try {
    const upload = await storeImageFile({
      file: request.file,
      folder: "covers",
      request
    });

    response.status(201).json({
      file: {
        ...upload,
        altText: request.body.altText || ""
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadProfileAvatar(request, response, next) {
  // Persiste el avatar del perfil del usuario.
  try {
    const upload = await storeImageFile({
      file: request.file,
      folder: "profiles/avatar",
      request
    });

    response.status(201).json({
      file: {
        ...upload,
        altText: request.body.altText || ""
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadProfileCover(request, response, next) {
  // Persiste la portada o fondo del perfil.
  try {
    const upload = await storeImageFile({
      file: request.file,
      folder: "profiles/cover",
      request
    });

    response.status(201).json({
      file: {
        ...upload,
        altText: request.body.altText || ""
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadIllustrationCover(request, response, next) {
  // Persiste la portada principal de una ilustracion.
  try {
    const upload = await storeImageFile({
      file: request.file,
      folder: "illustrations/covers",
      request
    });

    response.status(201).json({
      file: {
        ...upload,
        altText: request.body.altText || ""
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadIllustrationImage(request, response, next) {
  // Persiste una imagen de galeria ligada a una ilustracion.
  try {
    const upload = await storeImageFile({
      file: request.file,
      folder: "illustrations/gallery",
      request
    });

    response.status(201).json({
      file: {
        ...upload,
        altText: request.body.altText || ""
      }
    });
  } catch (error) {
    next(error);
  }
}
