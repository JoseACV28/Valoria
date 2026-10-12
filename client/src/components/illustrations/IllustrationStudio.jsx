import {PublicationPreview} from '../common/PublicationPreview';
import { ui } from "../../i18n/runtime.js";
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
  const [loading, setLoading] = useState(false),[preview,setPreview]=useState(false),[confirming,setConfirming]=useState(false);
  const submissionPending=useRef(false);
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
        collectionName:illustrationDraft.collectionName||"",credits:illustrationDraft.credits||"",usageRights:illustrationDraft.usageRights||"Todos los derechos reservados",
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

  async function handleSubmit(event,confirmed=false) {
    event?.preventDefault();
    if((!confirmed&&event?.nativeEvent.submitter?.getAttribute("data-save-illustration")!=="true") || submissionPending.current)return;
    if(!galleryItems.length){setMessage("Debes agregar al menos una imagen a la galeria.");return false;}
    if(form.status==='published'&&!confirmed){setPreview(true);setConfirming(true);return;}
    submissionPending.current=true;
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
        collectionName: form.collectionName||"",credits:form.credits||"",usageRights:form.usageRights||"Todos los derechos reservados",
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
        setPreview(false);setConfirming(false);onIllustrationUpdated?.(result.illustration);
      } else {
        const result = await createIllustration(payload, auth.token);
        setForm(initialForm);
        setTags([]);
        clearNewGalleryObjectUrls(galleryItems);
        setGalleryItems([]);
        setMessage(`Ilustracion creada: ${result.illustration.title}`);
        setPreview(false);setConfirming(false);onIllustrationCreated?.(result.illustration);
      }
    } catch (error) {
      setMessage(error.message);return false;
    } finally {
      submissionPending.current=false;
      setLoading(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span>{ui("Atelier")}</span>
          <h2>{isEditing ? ui("Editar ilustracion") : ui("Crear una nueva ilustracion")}</h2>
        </div>
        <p>{ui(" Construye una obra visual desde una o varias imagenes, y deja que la primera pieza de la galeria funcione automaticamente como imagen principal. ")}</p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit} onKeyDown={event=>{if(event.key==="Enter" && event.target.tagName==="INPUT"){event.preventDefault();}}}>
        <div className={styles.composer}>
          <aside className={styles.mediaRail}>
            <div className={styles.previewCard}>
              {galleryItems[0]?.publicUrl ? (
                <img alt={ui("Vista previa de galeria")} src={galleryItems[0].publicUrl} />
              ) : (
                <div className={styles.placeholder}>
                  <strong>{ui("Imagen principal")}</strong>
                  <span>{ui("La primera imagen de la galeria se mostrara en la tarjeta y el detalle")}</span>
                </div>
              )}
            </div>

            <div style={{display:'grid',gap:12,marginBottom:16}}>{[['collectionName','Colección o serie'],['credits','Créditos de la obra'],['usageRights','Permisos de uso']].map(([field,label])=><label key={field}>{ui(label)}<input value={form[field]||''} onChange={event=>setForm(current=>({...current,[field]:event.target.value}))}/></label>)}</div>
          <label className={styles.uploadLabel}>
              <span>{ui("Imagen de galeria")}</span>
              <div className={styles.filePicker}>
                <label className={styles.fileButton}>
                  <input
                    className={styles.fileInput}
                    type="file"
                    multiple
                    accept=".png,.gif,.jpg,.jpeg,.webp,image/png,image/gif,image/jpeg,image/webp"
                    onChange={handleGalleryFiles}
                  />{ui(" Agregar imagenes ")}</label>
                <small className={styles.fileName}>
                  {galleryItems.length
                    ? ui("{0} imagenes en la galeria",[galleryItems.length])
                    : ui("Sin imagenes todavia")}
                </small>
              </div>
            </label>

            {galleryItems.length > 0 ? (
              <div className={styles.galleryList}>
                <p className={styles.galleryHint}>{ui(" La primera imagen de esta lista sera la principal dentro del detalle publico. Tambien puedes quitar imagenes ya publicadas antes de guardar cambios. ")}</p>
                {galleryItems.map((item, index) => (
                  <div key={item.id || `${item.publicUrl}-${index}`} className={styles.galleryThumbCard}>
                    <img
                      alt={item.altText || ui("Imagen {0}",[index + 1])}
                      src={item.publicUrl}
                    />
                    <div className={styles.galleryThumbMeta}>
                      <small>{ui(" Imagen ")}{index + 1} {item.isNew ? ui("· nueva") : ui("· publicada")}
                      </small>
                      <div className={styles.galleryThumbActions}>
                        <button
                          className={styles.sortThumbButton}
                          disabled={index === 0}
                          onClick={() => moveGalleryItem(item.id, "up")}
                          type="button"
                        >{ui(" Subir ")}</button>
                        <button
                          className={styles.sortThumbButton}
                          disabled={index === galleryItems.length - 1}
                          onClick={() => moveGalleryItem(item.id, "down")}
                          type="button"
                        >{ui(" Bajar ")}</button>
                        <button
                          className={styles.removeThumbButton}
                          onClick={() => removeGalleryItem(item.id)}
                          type="button"
                        >{ui(" Quitar ")}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </aside>

          <div className={styles.detailsPanel}>
            <label className={styles.field}>
              <span>{ui("Titulo")}</span>
              <input
                placeholder={ui("Nombre de la ilustracion")}
                required
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>{ui("Descripcion")}</span>
              <textarea
                rows="7"
                placeholder={ui("Cuenta el concepto, la escena o la intencion de la pieza.")}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <div className={styles.twoCols}>
              <label className={styles.field}>
                <span>{ui("Categoria principal")}</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                >
                  {ILLUSTRATION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {ui(category)}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>{ui("Categoria secundaria")}</span>
                <select
                  value={form.accentCategory}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      accentCategory: event.target.value
                    }))
                  }
                >
                  <option value="">{ui("Sin segunda categoria")}</option>
                  {ILLUSTRATION_CATEGORIES.filter(
                    (category) => category !== form.category
                  ).map((category) => (
                    <option key={category} value={category}>
                      {ui(category)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={styles.field}>
              <span>{ui("Estado")}</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="draft">{ui("Borrador")}</option>
                <option value="published">{ui("Publicado")}</option>
              </select>
            </label>

            <div className={styles.field}>
              <span>{ui("Etiquetas")}</span>
              <div className={styles.inlineBuilder}>
                <input
                  placeholder={ui("Agrega una etiqueta")}
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

        {preview&&<PublicationPreview title={form.title} description={form.description} images={galleryItems} onClose={()=>{setPreview(false);setConfirming(false);}} onConfirm={confirming?()=>handleSubmit(null,true):undefined}/>}
        <button type="button" onClick={()=>{setPreview(true);setConfirming(false);}}>{ui('Vista previa')}</button>
        <button data-save-illustration="true" disabled={loading || !auth.isAuthenticated} type="submit">
          {loading
            ? ui("Guardando...")
            : isEditing
              ? ui("Guardar cambios")
              : ui("Crear ilustracion")}
        </button>
        {message ? <p className={styles.message}>{ui(message)}</p> : null}
      </form>
    </section>
  );
}
