import { sanitizeImage } from "./imageValidation.js";
import { enforceStorageQuota, withUploadLock } from './uploadQuota.js';
// Utilidades de almacenamiento de archivos.
// Escribe a Supabase Storage si existe config; si no, usa disco local.
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { env } from "../config/env.js";
import { isSupabaseEnabled, supabaseAdmin } from "../config/supabase.js";

function safeFileName(name) {
  // Limpia nombres de archivo para que sean seguros y estables en disco o storage.
  return name.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
}

function buildPublicUploadUrl(request, relativePath) {
  // Construye la URL publica local usada cuando no hay Supabase Storage.
  return `${request.protocol}://${request.get("host")}/${relativePath.replace(/\\/g, "/")}`;
}

export async function storeImageFile({ file, folder, request }) {
  return withUploadLock(request.authUser.id,()=>storeValidatedImage({file,folder,request}));
}
async function storeValidatedImage({ file, folder, request }) {
  // Guarda una imagen en Supabase o en almacenamiento local fallback y devuelve su metadata.
  if (!file) {
    throw new Error("No se recibio ninguna imagen");
  }

  const small=folder==='covers'||folder.startsWith('profiles/')||folder==='illustrations/covers';
  const format=await sanitizeImage(file.buffer,file.mimetype,small?2*1024*1024:15*1024*1024);
  const allowedExtensions={'image/png':['.png'],'image/jpeg':['.jpg','.jpeg'],'image/gif':['.gif'],'image/webp':['.webp']};
  if(!allowedExtensions[format.mime].includes(path.extname(file.originalname||'').toLowerCase()))throw Object.assign(new Error('La extensión del archivo debe corresponder al formato de la imagen.'),{status:400});
  const extension = format.extension;
  const fileName = `${Date.now()}-${randomUUID()}-${safeFileName(
    path.basename(file.originalname || `image${extension}`, extension)
  )}${extension}`;
  const storagePath = `${request.authUser.id}/${folder}/${fileName}`;

  if (isSupabaseEnabled()) {
    await enforceStorageQuota(supabaseAdmin,request.authUser.id,format.buffer.length,[env.supabaseBucket,'story-private-media']);
    const bucket = folder.startsWith("profiles/") ? env.supabaseBucket : "story-private-media";
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, format.buffer, {
        contentType: format.mime,
        upsert: false
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return {
      provider: "supabase",
      storagePath,
      publicUrl: data.publicUrl
    };
  }

  const baseDir = path.join(env.uploadAbsoluteDir, folder);
  await mkdir(baseDir, { recursive: true });

  const absolutePath = path.join(baseDir, fileName);
  await writeFile(absolutePath, format.buffer);

  const relativePath = path.join(env.uploadFallbackDir, folder, fileName);

  return {
    provider: "local",
    storagePath: relativePath.replace(/\\/g, "/"),
    publicUrl: buildPublicUploadUrl(request, relativePath)
  };
}
