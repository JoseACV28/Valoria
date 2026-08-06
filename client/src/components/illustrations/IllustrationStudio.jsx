// Estudio de publicacion para ilustradores.
// Reutiliza el mismo patron del panel de creador de historias,
// pero adaptado a portada, imagen principal, categorias y etiquetas visuales.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createIllustration,
  updateIllustration,
  uploadIllustrationImage
} from "../../api/illustrationApi";
import { ILLUSTRATION_CATEGORIES } from "../../data/illustrationCategories";
import styles from "../../styles/IllustrationStudio.module.css";

const illustrationFileTypes = ["image/png", "image/gif", "image/jpeg", "image/jpg", "image/webp"];
const maxIllustrationSize = 8 * 1024 * 1024;

const initialForm = {
  title: "",
  description: "",
  category: ILLUSTRATION_CATEGORIES[0],
  accentCategory: "",
  status: "draft"
};

export function IllustrationStudio({
  auth,
  illustrationDraft = null,
  onIllustrationCreated,
  onIllustrationUpdated
}) {
  // Estado editorial del formulario, previews y mensaje de resultado.
  const [form, setForm] = useState(initialForm);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const galleryItemsRef = useRef([]);

  const isEditing = Boolean(illustrationDraft?.id);
  // Normaliza las imagenes existentes para mantener una estructura estable
  // al editar una pieza que ya fue creada antes.
  const existingImages = useMemo(
    () =>
      (illustrationDraft?.images || []).map((image) => ({
        id: image.id || image.publicUrl || "",
        publicUrl: image.publicUrl,
        storagePath: image.storagePath || "",
        altText: image.altText || illustrationDraft?.title || "",
        isNew: false,
        objectUrl: ""
      })),
    [illustrationDraft]
  );

  useEffect(() => {
    // Cuando cambia el borrador seleccionado, el estudio se rellena
    // automaticamente para reutilizar el mismo formulario en modo editar.
    if (!illustrationDraft) {
      setForm(initialForm);
      setTags([]);
      setGalleryItems([]);
      setMessage("");
      return;
    }

    const categories = illustrationDraft.categories || [];
    setForm({
      title: illustrationDraft.title || "",
      description: illustrationDraft.description || "",
      category: categories[0] || ILLUSTRATION_CATEGORIES[0],
      accentCategory: categories[1] || "",
      status: illustrationDraft.status || "draft"
    });
    setTags(illustrationDraft.tags || []);
    setGalleryItems(existingImages);
    setMessage("");
  }, [existingImages, illustrationDraft]);

  useEffect(() => {
    galleryItemsRef.current = galleryItems;
  }, [galleryItems]);

  useEffect(() => {
    return () => {
      // Limpia object URLs temporales para no dejar memoria colgada al desmontar el estudio.
      galleryItemsRef.current.forEach((item) => {
        if (item.isNew && item.objectUrl) {
          URL.revokeObjectURL(item.objectUrl);
        }
      });
    };
  }, []);

  function clearNewGalleryObjectUrls(items) {
    items.forEach((item) => {
      if (item.isNew && item.objectUrl) {
        URL.revokeObjectURL(item.objectUrl);
      }
    });
  }

  function handleGalleryFiles(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    const validFiles = [];

    for (const file of files) {
      if (!illustrationFileTypes.includes(file.type) || file.size > maxIllustrationSize) {
        setMessage("Las imagenes deben ser PNG, GIF, JPG o WEBP y pesar menos de 8MB.");
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) {
      event.target.value = "";
      return;
    }

    setMessage("");
    setGalleryItems((current) => [
      ...current,
      ...validFiles.map((file, index) => {
        const objectUrl = URL.createObjectURL(file);
        return {
          id: `new-${Date.now()}-${index}`,
          publicUrl: objectUrl,
          storagePath: "",
          altText: form.title || "Imagen de ilustracion",
          isNew: true,
          objectUrl,
          file
        };
      })
    ]);

    event.target.value = "";
  }

  function removeGalleryItem(itemId) {
    setGalleryItems((current) => {
      const target = current.find((item) => item.id === itemId);

      if (target?.isNew && target.objectUrl) {
        URL.revokeObjectURL(target.objectUrl);
      }

      return current.filter((item) => item.id !== itemId);
    });
  }

  function moveGalleryItem(itemId, direction) {
    // Reordena la galeria manualmente para decidir que imagen se vera primero en el detalle.
    setGalleryItems((current) => {
      const index = current.findIndex((item) => item.id === itemId);

      if (index === -1) {
        return current;
      }

      const nextIndex =
        direction === "up" ? Math.max(0, index - 1) : Math.min(current.length - 1, index + 1);

      if (nextIndex === index) {
        return current;
      }

      const reordered = [...current];
      const [target] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, target);
      return reordered;
    });
  }

  function addTag() {
    // Evita etiquetas vacias o duplicadas.
    const value = tagInput.trim();
    if (!value) {
      return;
    }

    setTags((current) => [...new Set([...current, value])]);
    setTagInput("");
  }

  function removeTag(tagToRemove) {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!galleryItems.length) {
        throw new Error("Debes agregar al menos una imagen a la galeria.");
      }

      // La galeria final mezcla imagenes antiguas que se conservan con nuevas subidas.
      let images = [];

      for (const item of galleryItems) {
        if (item.isNew && item.file) {
          const upload = await uploadIllustrationImage(
            item.file,
            item.altText || form.title || "Imagen de ilustracion",
            auth.token
          );

          images.push({
            publicUrl: upload.file.publicUrl,
            storagePath: upload.file.storagePath || "",
            altText: upload.file.altText || form.title || "Imagen de ilustracion"
          });
          continue;
        }

        images.push({
          publicUrl: item.publicUrl,
          storagePath: item.storagePath || "",
          altText: item.altText || form.title || "Imagen de ilustracion"
        });
      }

      const coverUrl = images[0]?.publicUrl || "";

      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        coverUrl,
        categories: [...new Set([form.category, form.accentCategory].filter(Boolean))],
        tags,
        images
      };

      if (isEditing) {
        const result = await updateIllustration(illustrationDraft.id, payload, auth.token);
        clearNewGalleryObjectUrls(galleryItems);
        setMessage(`Ilustracion actualizada: ${result.illustration.title}`);
        onIllustrationUpdated?.(result.illustration);
      } else {
        const result = await createIllustration(payload, auth.token);
        setForm(initialForm);
        setTags([]);
        clearNewGalleryObjectUrls(galleryItems);
        setGalleryItems([]);
        setMessage(`Ilustracion creada: ${result.illustration.title}`);
        onIllustrationCreated?.(result.illustration);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span>Atelier</span>
          <h2>{isEditing ? "Editar ilustracion" : "Crear una nueva ilustracion"}</h2>
        </div>
        <p>
          Construye una obra visual desde una o varias imagenes, y deja que la
          primera pieza de la galeria funcione automaticamente como imagen principal.
        </p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.composer}>
          <aside className={styles.mediaRail}>
            <div className={styles.previewCard}>
              {galleryItems[0]?.publicUrl ? (
                <img alt="Vista previa de galeria" src={galleryItems[0].publicUrl} />
              ) : (
                <div className={styles.placeholder}>
                  <strong>Imagen principal</strong>
                  <span>La primera imagen de la galeria se mostrara en la tarjeta y el detalle</span>
                </div>
              )}
            </div>

            <label className={styles.uploadLabel}>
              <span>Imagen de galeria</span>
              <div className={styles.filePicker}>
                <label className={styles.fileButton}>
                  <input
                    className={styles.fileInput}
                    type="file"
                    multiple
                    accept=".png,.gif,.jpg,.jpeg,.webp,image/png,image/gif,image/jpeg,image/webp"
                    onChange={handleGalleryFiles}
                  />
                  Agregar imagenes
                </label>
                <small className={styles.fileName}>
                  {galleryItems.length
                    ? `${galleryItems.length} imagenes en la galeria`
                    : "Sin imagenes todavia"}
                </small>
              </div>
            </label>

            {galleryItems.length > 0 ? (
              <div className={styles.galleryList}>
                <p className={styles.galleryHint}>
                  La primera imagen de esta lista sera la principal dentro del detalle publico.
                  Tambien puedes quitar imagenes ya publicadas antes de guardar cambios.
                </p>
                {galleryItems.map((item, index) => (
                  <div key={item.id || `${item.publicUrl}-${index}`} className={styles.galleryThumbCard}>
                    <img
                      alt={item.altText || `Imagen ${index + 1}`}
                      src={item.publicUrl}
                    />
                    <div className={styles.galleryThumbMeta}>
                      <small>
                        Imagen {index + 1} {item.isNew ? "· nueva" : "· publicada"}
                      </small>
                      <div className={styles.galleryThumbActions}>
                        <button
                          className={styles.sortThumbButton}
                          disabled={index === 0}
                          onClick={() => moveGalleryItem(item.id, "up")}
                          type="button"
                        >
                          Subir
                        </button>
                        <button
                          className={styles.sortThumbButton}
                          disabled={index === galleryItems.length - 1}
                          onClick={() => moveGalleryItem(item.id, "down")}
                          type="button"
                        >
                          Bajar
                        </button>
                        <button
                          className={styles.removeThumbButton}
                          onClick={() => removeGalleryItem(item.id)}
                          type="button"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </aside>

          <div className={styles.detailsPanel}>
            <label className={styles.field}>
              <span>Titulo</span>
              <input
                placeholder="Nombre de la ilustracion"
                required
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>Descripcion</span>
              <textarea
                rows="7"
                placeholder="Cuenta el concepto, la escena o la intencion de la pieza."
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <div className={styles.twoCols}>
              <label className={styles.field}>
                <span>Categoria principal</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                >
                  {ILLUSTRATION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Categoria secundaria</span>
                <select
                  value={form.accentCategory}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      accentCategory: event.target.value
                    }))
                  }
                >
                  <option value="">Sin segunda categoria</option>
                  {ILLUSTRATION_CATEGORIES.filter(
                    (category) => category !== form.category
                  ).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={styles.field}>
              <span>Estado</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </label>

            <div className={styles.field}>
              <span>Etiquetas</span>
              <div className={styles.inlineBuilder}>
                <input
                  placeholder="Agrega una etiqueta"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                />
                <button onClick={addTag} type="button">
                  +
                </button>
              </div>
              {tags.length > 0 ? (
                <div className={styles.chipRow}>
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      className={styles.chip}
                      onClick={() => removeTag(tag)}
                      type="button"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <button disabled={loading || !auth.isAuthenticated} type="submit">
          {loading
            ? "Guardando..."
            : isEditing
              ? "Guardar cambios"
              : "Crear ilustracion"}
        </button>
        {message ? <p className={styles.message}>{message}</p> : null}
      </form>
    </section>
  );
}
