// Formulario editorial del panel de creador.
// Permite crear historias, subir portada y agregar nuevos capitulos.
import { useEffect, useMemo, useState } from "react";
import {
  createChapter,
  createStory,
  updateStory,
  updateChapter,
  uploadChapterImage,
  uploadStoryCover
} from "../../api/storyApi";
import { ALL_CATEGORIES } from "../../data/categories";
import styles from "../../styles/CreatorStudio.module.css";

const audienceOptions = [
  "General",
  "Teen",
  "Joven adulto",
  "Adulto"
];

const languageOptions = ["Espanol", "English", "Portugues"];

const rightsOptions = [
  "Todos los derechos reservados",
  "Uso con atribucion",
  "Dominio del autor"
];

const coverFileTypes = ["image/png", "image/gif", "image/jpeg", "image/jpg"];
const maxCoverSize = 2 * 1024 * 1024;

const initialStoryForm = {
  title: "",
  category: ALL_CATEGORIES[0],
  synopsis: "",
  storyContent: "",
  status: "draft",
  characters: [],
  tags: [],
  audience: "General",
  language: "Espanol",
  rights: "Todos los derechos reservados",
  mature: false
};

const initialChapterForm = {
  storyId: "",
  category: ALL_CATEGORIES[0],
  title: "",
  chapterNumber: "",
  excerpt: "",
  illustrationUrl: "",
  content: "",
  status: "draft"
};

export function CreatorStudio({
  stories,
  onStoryCreated,
  onStoryUpdated,
  onChapterCreated,
  onChapterUpdated,
  auth,
  selectedStoryId = "",
  chapterDraft = null,
  existingChapters = [],
  mode = "all"
}) {
  const [storyForm, setStoryForm] = useState(initialStoryForm);
  const [chapterForm, setChapterForm] = useState(initialChapterForm);
  const [storyCover, setStoryCover] = useState(null);
  const [chapterImage, setChapterImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [characterInput, setCharacterInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [storyMessage, setStoryMessage] = useState("");
  const [chapterMessage, setChapterMessage] = useState("");
  const [loadingStory, setLoadingStory] = useState(false);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const availableStories = useMemo(() => stories.length > 0, [stories]);
  const selectedStory = useMemo(
    () => stories.find((story) => story.id === (chapterForm.storyId || selectedStoryId)) || null,
    [chapterForm.storyId, selectedStoryId, stories]
  );
  const isEditingChapter = Boolean(chapterDraft?.id);
  const originalIllustrationUrl =
    chapterDraft?.chapter_images?.find((image) => image.image_role === "creator")
      ?.public_url || "";
  const nextChapterNumber = useMemo(() => {
    if (!existingChapters.length) {
      return 1;
    }

    return (
      Math.max(
        ...existingChapters.map((chapter) => Number(chapter.chapter_number || 0))
      ) + 1
    );
  }, [existingChapters]);

  useEffect(() => {
    if (isEditingChapter && chapterDraft) {
      const creatorIllustration = (chapterDraft.chapter_images || []).find(
        (image) => image.image_role === "creator"
      );

      setChapterForm({
        storyId: selectedStoryId || chapterDraft.story_id || "",
        category:
          stories.find((story) => story.id === (selectedStoryId || chapterDraft.story_id))
            ?.category || ALL_CATEGORIES[0],
        title: chapterDraft.title || "",
        chapterNumber: String(chapterDraft.chapter_number || ""),
        excerpt: chapterDraft.excerpt || "",
        illustrationUrl: creatorIllustration?.public_url || "",
        content: chapterDraft.content || "",
        status: chapterDraft.status || "draft"
      });
      setChapterImage(null);
      setChapterMessage("");
      return;
    }

    setChapterForm({
      ...initialChapterForm,
      storyId: selectedStoryId || "",
      category:
        stories.find((story) => story.id === selectedStoryId)?.category ||
        ALL_CATEGORIES[0],
      chapterNumber: String(nextChapterNumber),
      title: `Capitulo ${nextChapterNumber}`
    });
    setChapterImage(null);
  }, [chapterDraft, isEditingChapter, nextChapterNumber, selectedStoryId, stories]);

  useEffect(() => {
    if (!chapterForm.storyId) {
      return;
    }

    const matchedStory = stories.find((story) => story.id === chapterForm.storyId);

    if (!matchedStory?.category || matchedStory.category === chapterForm.category) {
      return;
    }

    setChapterForm((current) => ({
      ...current,
      category: matchedStory.category
    }));
  }, [chapterForm.category, chapterForm.storyId, stories]);

  useEffect(() => {
    if (!storyCover) {
      setCoverPreview("");
      return undefined;
    }

    const nextPreview = URL.createObjectURL(storyCover);
    setCoverPreview(nextPreview);

    return () => {
      URL.revokeObjectURL(nextPreview);
    };
  }, [storyCover]);

  function handleCoverChange(event) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setStoryCover(null);
      return;
    }

    if (!coverFileTypes.includes(file.type) || file.size > maxCoverSize) {
      setStoryCover(null);
      setStoryMessage(
        "La portada debe ser PNG, GIF o JPG y pesar menos de 2MB."
      );
      event.target.value = "";
      return;
    }

    setStoryMessage("");
    setStoryCover(file);
  }

  function addCharacter() {
    const value = characterInput.trim();

    if (!value) {
      return;
    }

    setStoryForm((current) => ({
      ...current,
      characters: [...current.characters, value]
    }));
    setCharacterInput("");
  }

  function removeCharacter(index) {
    setStoryForm((current) => ({
      ...current,
      characters: current.characters.filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  function addTag() {
    const value = tagInput.trim();

    if (!value) {
      return;
    }

    setStoryForm((current) => ({
      ...current,
      tags: [...current.tags, value]
    }));
    setTagInput("");
  }

  function removeTag(index) {
    setStoryForm((current) => ({
      ...current,
      tags: current.tags.filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  async function handleStorySubmit(event) {
    event.preventDefault();
    setLoadingStory(true);
    setStoryMessage("");

    try {
      let coverUrl = "";

      if (storyCover) {
        const upload = await uploadStoryCover(
          storyCover,
          storyForm.title,
          auth.token
        );
        coverUrl = upload.file.publicUrl;
      }

      const result = await createStory(
        {
          ...storyForm,
          description: storyForm.synopsis,
          excerpt: storyForm.synopsis,
          coverUrl
        },
        auth.token
      );

      let createdChapter = null;

      if (storyForm.storyContent.trim()) {
        const chapterResult = await createChapter(
          result.story.id,
          {
            title: "Capitulo 1",
            chapterNumber: 1,
            excerpt: storyForm.synopsis,
            content: storyForm.storyContent,
            status: storyForm.status,
            images: []
          },
          auth.token
        );

        createdChapter = chapterResult.chapter;
      }

      setStoryForm(initialStoryForm);
      setStoryCover(null);
      setCharacterInput("");
      setTagInput("");
      setStoryMessage(
        createdChapter
          ? `Historia creada: ${result.story.title}. Se guardo tambien el Capitulo 1.`
          : `Historia creada: ${result.story.title}`
      );
      onStoryCreated(result.story);
      if (createdChapter) {
        onChapterCreated?.(createdChapter);
      }
    } catch (error) {
      setStoryMessage(error.message);
    } finally {
      setLoadingStory(false);
    }
  }

  async function handleChapterSubmit(event) {
    event.preventDefault();
    setLoadingChapter(true);
    setChapterMessage("");

    try {
      const images = [];

      if (
        chapterForm.illustrationUrl.trim() &&
        (!isEditingChapter ||
          chapterForm.illustrationUrl.trim() !== originalIllustrationUrl)
      ) {
        images.push({
          storagePath: chapterForm.illustrationUrl.trim(),
          publicUrl: chapterForm.illustrationUrl.trim(),
          altText: chapterForm.title || "Ilustracion del capitulo",
          imageRole: "creator"
        });
      }

      if (chapterImage) {
        const upload = await uploadChapterImage(
          chapterImage,
          chapterForm.title || "Imagen del capitulo",
          auth.token
        );
        images.unshift({
          ...upload.file,
          imageRole: "creator"
        });
      }

      const payload = {
        title: chapterForm.title,
        chapterNumber: Number(chapterForm.chapterNumber),
        excerpt: chapterForm.excerpt,
        content: chapterForm.content,
        status: chapterForm.status,
        images
      };

      if (chapterForm.storyId && chapterForm.category) {
        const currentStoryCategory = selectedStory?.category || "";

        if (chapterForm.category !== currentStoryCategory) {
          const storyResult = await updateStory(
            chapterForm.storyId,
            {
              category: chapterForm.category
            },
            auth.token
          );
          onStoryUpdated?.(storyResult.story);
        }
      }

      if (isEditingChapter) {
        const result = await updateChapter(
          chapterForm.storyId,
          chapterDraft.id,
          payload,
          auth.token
        );
        setChapterMessage(`Capitulo actualizado: ${result.chapter.title}`);
        setChapterImage(null);
        onChapterUpdated?.(result.chapter);
      } else {
        const result = await createChapter(
          chapterForm.storyId,
          payload,
          auth.token
        );

        setChapterForm({
          ...initialChapterForm,
          storyId: selectedStoryId,
          category:
            stories.find((story) => story.id === selectedStoryId)?.category ||
            ALL_CATEGORIES[0]
        });
        setChapterImage(null);
        setChapterMessage(`Capitulo creado: ${result.chapter.title}`);
        onChapterCreated?.(result.chapter);
      }
    } catch (error) {
      setChapterMessage(error.message);
    } finally {
      setLoadingChapter(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span>Studio</span>
          <h2>
            {mode === "story"
              ? "Crear una nueva historia"
              : mode === "chapter"
                ? isEditingChapter
                  ? "Modificar un capitulo existente"
                  : "Agregar un nuevo capitulo"
                : "Listo para Supabase y subida de imagenes"}
          </h2>
        </div>
        <p>
          {mode === "story"
            ? "Abre el formulario solo cuando quieras empezar una nueva historia."
            : mode === "chapter"
              ? isEditingChapter
                ? "Ajusta contenido, estado o numero del capitulo seleccionado."
                : "Publica capitulos solo sobre la historia que tengas seleccionada."
              : "Puedes probar la creacion ahora mismo. Sin credenciales usa respaldo local; con Supabase activo persiste en la nube."}
        </p>
      </div>

      <div className={styles.grid}>
        {mode !== "chapter" ? (
        <form className={styles.card} onSubmit={handleStorySubmit}>
          <div className={styles.storyComposer}>
            <aside className={styles.coverPanel}>
              <div className={styles.coverPreview}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Vista previa de portada" />
                ) : (
                  <div className={styles.coverPlaceholder}>
                    <strong>Anadiras una portada</strong>
                    <span>Recomendado: vertical y contrastada</span>
                  </div>
                )}
              </div>

              <label className={styles.uploadLabel}>
                <span>Portada</span>
                <div className={styles.filePicker}>
                  <label className={styles.fileButton}>
                    <input
                      className={styles.fileInput}
                      type="file"
                      accept=".png,.gif,.jpg,.jpeg,image/png,image/gif,image/jpeg"
                      onChange={handleCoverChange}
                    />
                    Elegir portada
                  </label>
                  <small className={styles.fileName}>
                    {storyCover?.name || "Ningun archivo seleccionado"}
                  </small>
                </div>
                <small className={styles.uploadNote}>
                  Debe estar en formato PNG, GIF, JPG, de menos de 2MB.
                  Dimensiones recomendadas: 512X800 px.
                </small>
              </label>
            </aside>

            <div className={styles.detailsPanel}>
              <div className={styles.panelTitle}>
                <h3>Detalles de la historia</h3>
                {!auth.isAuthenticated ? (
                  <p className={styles.message}>
                    Inicia sesion para publicar historias e imagenes.
                  </p>
                ) : null}
              </div>

              <label className={styles.field}>
                <span>Titulo</span>
                <input
                  placeholder="Historia sin titulo"
                  value={storyForm.title}
                  onChange={(event) =>
                    setStoryForm((current) => ({
                      ...current,
                      title: event.target.value
                    }))
                  }
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Sinopsis o descripcion general</span>
                <textarea
                  rows="5"
                  placeholder="Resume el corazon de la historia, el tono y lo que engancha."
                  value={storyForm.synopsis}
                  onChange={(event) =>
                    setStoryForm((current) => ({
                      ...current,
                      synopsis: event.target.value
                    }))
                  }
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Historia</span>
                <textarea
                  rows="9"
                  className={styles.storyTextarea}
                  placeholder="Escribe aqui el inicio de tu historia. Este contenido se guardara como el Capitulo 1."
                  value={storyForm.storyContent}
                  onChange={(event) =>
                    setStoryForm((current) => ({
                      ...current,
                      storyContent: event.target.value
                    }))
                  }
                  required
                />
              </label>

              <div className={styles.field}>
                <span>Personajes principales</span>
                <div className={styles.inlineBuilder}>
                  <input
                    placeholder="Nombre"
                    value={characterInput}
                    onChange={(event) => setCharacterInput(event.target.value)}
                  />
                  <button onClick={addCharacter} type="button">
                    +
                  </button>
                </div>
                {storyForm.characters.length > 0 ? (
                  <div className={styles.chipRow}>
                    {storyForm.characters.map((character, index) => (
                      <button
                        key={`${character}-${index}`}
                        className={styles.chip}
                        onClick={() => removeCharacter(index)}
                        type="button"
                      >
                        {character} x
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={styles.twoCols}>
                <label className={`${styles.field} ${styles.categoryField}`}>
                  <span>Categoria</span>
                  <select
                    value={storyForm.category}
                    onChange={(event) =>
                      setStoryForm((current) => ({
                        ...current,
                        category: event.target.value
                      }))
                    }
                    required
                  >
                    {ALL_CATEGORIES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Estado</span>
                  <select
                    value={storyForm.status}
                    onChange={(event) =>
                      setStoryForm((current) => ({
                        ...current,
                        status: event.target.value
                      }))
                    }
                  >
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado</option>
                  </select>
                </label>
              </div>

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
                {storyForm.tags.length > 0 ? (
                  <div className={styles.chipRow}>
                    {storyForm.tags.map((tag, index) => (
                      <button
                        key={`${tag}-${index}`}
                        className={styles.chip}
                        onClick={() => removeTag(index)}
                        type="button"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={styles.metaGrid}>
                <label className={styles.field}>
                  <span>Audiencia principal</span>
                  <select
                    value={storyForm.audience}
                    onChange={(event) =>
                      setStoryForm((current) => ({
                        ...current,
                        audience: event.target.value
                      }))
                    }
                  >
                    {audienceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Idioma</span>
                  <select
                    value={storyForm.language}
                    onChange={(event) =>
                      setStoryForm((current) => ({
                        ...current,
                        language: event.target.value
                      }))
                    }
                  >
                    {languageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.metaGrid}>
                <label className={styles.field}>
                  <span>Derechos de autor</span>
                  <select
                    value={storyForm.rights}
                    onChange={(event) =>
                      setStoryForm((current) => ({
                        ...current,
                        rights: event.target.value
                      }))
                    }
                  >
                    {rightsOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.toggleField}>
                  <span>Clasificacion</span>
                  <button
                    className={`${styles.toggle} ${
                      storyForm.mature ? styles.toggleActive : ""
                    }`}
                    onClick={() =>
                      setStoryForm((current) => ({
                        ...current,
                        mature: !current.mature
                      }))
                    }
                    type="button"
                  >
                    {storyForm.mature ? "Madura" : "General"}
                  </button>
                </label>
              </div>

              <div className={styles.footerNote}>
                <p>
                  Tu historia se vera mejor con una portada vertical, etiquetas
                  claras y una descripcion que explique el conflicto principal.
                </p>
              </div>
            </div>
          </div>

          <button disabled={loadingStory || !auth.isAuthenticated} type="submit">
            {loadingStory ? "Guardando..." : "Crear historia"}
          </button>
          {storyMessage ? <p className={styles.message}>{storyMessage}</p> : null}
        </form>
        ) : null}

        {mode !== "story" ? (
        <form className={styles.card} onSubmit={handleChapterSubmit}>
          <div className={styles.panelTitle}>
            <h3>{isEditingChapter ? "Editar capitulo" : "Agregar capitulo"}</h3>
            {!auth.isAuthenticated ? (
              <p className={styles.message}>
                Inicia sesion para crear capitulos.
              </p>
            ) : null}
          </div>

          <div className={styles.twoCols}>
            <label className={styles.field}>
              <span>Historia</span>
              <select
                value={chapterForm.storyId}
                onChange={(event) =>
                  setChapterForm((current) => ({
                    ...current,
                    storyId: event.target.value
                  }))
                }
                required
                disabled={!availableStories}
              >
                <option value="">Selecciona una historia</option>
                {stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Categoria</span>
              <select
                value={chapterForm.category}
                onChange={(event) =>
                  setChapterForm((current) => ({
                    ...current,
                    category: event.target.value
                  }))
                }
              >
                {ALL_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>Numero</span>
            <input
              type="number"
              min="1"
              value={chapterForm.chapterNumber}
              onChange={(event) =>
                setChapterForm((current) => ({
                  ...current,
                  chapterNumber: event.target.value
                }))
              }
              required
            />
          </label>

          <label className={styles.field}>
            <span>Titulo del capitulo</span>
            <input
              placeholder="Capitulo 1"
              value={chapterForm.title}
              onChange={(event) =>
                setChapterForm((current) => ({
                  ...current,
                  title: event.target.value
                }))
              }
              required
            />
          </label>

          <label className={styles.field}>
            <span>Resumen</span>
            <textarea
              rows="3"
              placeholder="Que se lleva el lector de este capitulo"
              value={chapterForm.excerpt}
              onChange={(event) =>
                setChapterForm((current) => ({
                  ...current,
                  excerpt: event.target.value
                }))
              }
            />
          </label>

          <label className={styles.field}>
            <span>Contenido</span>
            <textarea
              rows="8"
              placeholder="Escribe aqui el texto del capitulo"
              value={chapterForm.content}
              onChange={(event) =>
                setChapterForm((current) => ({
                  ...current,
                  content: event.target.value
                }))
              }
            />
          </label>

          <div className={styles.twoCols}>
            <label className={styles.field}>
              <span>Link de ilustracion</span>
              <input
                type="url"
                placeholder="https://..."
                value={chapterForm.illustrationUrl}
                onChange={(event) =>
                  setChapterForm((current) => ({
                    ...current,
                    illustrationUrl: event.target.value
                  }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>Imagen del capitulo</span>
              <div className={styles.filePicker}>
                <label className={styles.fileButton}>
                  <input
                    className={styles.fileInput}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setChapterImage(event.target.files?.[0] || null)
                    }
                  />
                  Elegir imagen
                </label>
                <small className={styles.fileName}>
                  {chapterImage?.name || "Ningun archivo seleccionado"}
                </small>
              </div>
            </label>
          </div>

          <div className={styles.twoCols}>

            <label className={styles.field}>
              <span>Estado</span>
              <select
                value={chapterForm.status}
                onChange={(event) =>
                  setChapterForm((current) => ({
                    ...current,
                    status: event.target.value
                  }))
                }
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </label>
          </div>

          <button
            disabled={
              loadingChapter || !availableStories || !auth.isAuthenticated
            }
            type="submit"
          >
            {loadingChapter
              ? "Guardando..."
              : isEditingChapter
                ? "Guardar cambios"
                : "Crear capitulo"}
          </button>
          {chapterMessage ? (
            <p className={styles.message}>{chapterMessage}</p>
          ) : null}
        </form>
        ) : null}
      </div>
    </section>
  );
}
