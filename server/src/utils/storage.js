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
  // Guarda una imagen en Supabase o en almacenamiento local fallback y devuelve su metadata.
  if (!file) {
    throw new Error("No se recibio ninguna imagen");
  }

  const extension = path.extname(file.originalname || "") || ".jpg";
  const fileName = `${Date.now()}-${randomUUID()}-${safeFileName(
    path.basename(file.originalname || `image${extension}`, extension)
  )}${extension}`;
  const storagePath = `${folder}/${fileName}`;

  if (isSupabaseEnabled()) {
    const { error } = await supabaseAdmin.storage
      .from(env.supabaseBucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabaseAdmin.storage
      .from(env.supabaseBucket)
      .getPublicUrl(storagePath);

    return {
      provider: "supabase",
      storagePath,
      publicUrl: data.publicUrl
    };
  }

  const baseDir = path.resolve("server", env.uploadFallbackDir, folder);
  await mkdir(baseDir, { recursive: true });

  const absolutePath = path.join(baseDir, fileName);
  await writeFile(absolutePath, file.buffer);

  const relativePath = path.join(env.uploadFallbackDir, folder, fileName);

  return {
    provider: "local",
    storagePath: relativePath.replace(/\\/g, "/"),
    publicUrl: buildPublicUploadUrl(request, relativePath)
  };
}
