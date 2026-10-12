import {newClientId} from '../../utils/clientId.js';
import {PublicationPreview} from '../common/PublicationPreview';
import { ui } from "../../i18n/runtime.js";
import { STORY_LANGUAGES, languageLabel } from '../../data/languages';
import { SaveStatus } from '../common/SaveStatus';
import { saveWorkspace, listWorkspace, deleteWorkspace } from "../../api/workspaceApi";
// Formulario editorial del panel de creador.
// Permite crear historias, subir portada y agregar nuevos capitulos.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  createChapter,
  createStory,
  updateStory,
  updateChapter,
  uploadChapterImage,
  uploadStoryCover
} from "../../api/storyApi";
import { readEditorialDraft, useEditorialDraft } from "../../hooks/useEditorialDraft";
import { WriterPlanning } from "./WriterPlanning";
import { contentToHtml, sanitizeHtml } from "../../utils/richContent";
const LazyEditor = lazy(() => import("../common/RichTextEditor").then(module => ({default:module.RichTextEditor})));
function RichTextEditor(props){return <Suspense fallback={<p>{ui('Cargando editor…')}</p>}><LazyEditor {...props}/></Suspense>;}
import { ALL_CATEGORIES } from "../../data/categories";
import styles from "../../styles/CreatorStudio.module.css";

const audienceOptions = [
  "General",
  "Teen",
  "Joven adulto",
  "Adulto"
];

const languageOptions = STORY_LANGUAGES;

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
  status: "draft",
  scheduledAt: ""
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
  suggestedChapterNumber=1,
  mode = "all"
}) {
  const editorSection=useRef(null);
  const storyDraftKey = `${auth.user?.id}:new-story`;
  const chapterDraftKey = `${auth.user?.id}:chapter:${selectedStoryId}:${chapterDraft?.id || "new"}`;
  const [storyForm, setStoryForm] = useState(() => readEditorialDraft(storyDraftKey)?.data?.form || initialStoryForm);
  const [chapterForm, setChapterForm] = useState(()=>readEditorialDraft(chapterDraftKey)?.data || {...initialChapterForm,storyId:selectedStoryId,category:stories.find(story=>story.id===selectedStoryId)?.category||ALL_CATEGORIES[0],title:chapterDraft?.title||`Capitulo ${Math.max(suggestedChapterNumber,existingChapters.length?Math.max(...existingChapters.map(chapter=>Number(chapter.chapter_number||0)))+1:1)}`,chapterNumber:String(chapterDraft?.chapter_number|| (Math.max(suggestedChapterNumber,existingChapters.length?Math.max(...existingChapters.map(chapter=>Number(chapter.chapter_number||0)))+1:1))),content:chapterDraft?.content||"",excerpt:chapterDraft?.excerpt||"",status:chapterDraft?.status||"draft"});
  const [storyCover, setStoryCover] = useState(null);
  const [chapterImage, setChapterImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [characterInput, setCharacterInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [storyMessage, setStoryMessage] = useState("");
  const [chapterMessage, setChapterMessage] = useState("");
  const [loadingStory, setLoadingStory] = useState(false);
  const storySubmissionPending = useRef(false);
  const chapterSubmissionPending = useRef(false);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const storySubmissionId = useRef(readEditorialDraft(storyDraftKey)?.data?.submissionId || newClientId());
  const storyDraftValue = useMemo(()=>({form:storyForm,characterInput,tagInput,submissionId:storySubmissionId.current}),[storyForm,characterInput,tagInput]);
  const storySaveStatus = useEditorialDraft(storyDraftKey,storyDraftValue,(saved)=>{if(saved?.form){setStoryForm(saved.form);setCharacterInput(saved.characterInput||"");setTagInput(saved.tagInput||"");storySubmissionId.current=saved.submissionId||newClientId();}},auth.token,mode!=="chapter" && !loadingStory);
  const chapterSaveStatus = useEditorialDraft(chapterDraftKey,chapterForm,setChapterForm,auth.token,mode!=="story" && !loadingChapter);
  const [previewOpen,setPreviewOpen] = useState(false),[publicationTarget,setPublicationTarget]=useState('');
  const [versionChoice,setVersionChoice] = useState("");
  useEffect(()=>{const warn=(event)=>{if(storyCover||chapterImage||/No se pudo|pendiente|Guardando|Sin conexión|Sin sincronizar/.test(storySaveStatus)||/No se pudo|pendiente|Guardando|Sin conexión|Sin sincronizar/.test(chapterSaveStatus)){event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[storyCover,chapterImage,storySaveStatus,chapterSaveStatus]);
  useEffect(()=>{
    const warn=event=>{
      if(!(storyCover||chapterImage||/No se pudo|pendiente|Guardando|Sin conexión|Sin sincronizar/.test(storySaveStatus)||/No se pudo|pendiente|Guardando|Sin conexión|Sin sincronizar/.test(chapterSaveStatus)))return;
      const action=event.target.closest('button,a');
      if(action?.closest('[data-publication-preview]'))return;
      if(action && !editorSection.current?.contains(action) && !window.confirm('Hay archivos que todavía no se han subido o contenido sin guardar. ¿Quieres salir del editor?')){event.preventDefault();event.stopPropagation();}
    };
    document.addEventListener('click',warn,true);return()=>document.removeEventListener('click',warn,true);
  },[storyCover,chapterImage,storySaveStatus,chapterSaveStatus]);
  const availableStories = useMemo(() => stories.length > 0, [stories]);
  const selectedStory = useMemo(
    () => stories.find((story) => story.id === (chapterForm.storyId || selectedStoryId)) || null,
    [chapterForm.storyId, selectedStoryId, stories]
  );
  const isEditingChapter = Boolean(chapterDraft?.id);
  const originalIllustrationUrl =
    chapterDraft?.chapter_images?.find((image) => image.image_role === "creator")
      ?.public_url || "";
  useEffect(()=>{
    if(!chapterDraft?.id || !auth.token || readEditorialDraft(chapterDraftKey)?.data)return;
    let active=true;
    listWorkspace('drafts',auth.token).then(({items})=>{
      const schedule=items.find(item=>item.key===`schedule:${chapterDraft.id}`);
      if(active && schedule && ['pending','processing'].includes(schedule.data.state)){
        const date=new Date(schedule.data.date);
        const local=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
        setChapterForm(current=>({...current,scheduledAt:current.scheduledAt||local}));
      }
    }).catch(()=>{});
    return()=>{active=false;};
  },[chapterDraftKey,auth.token]);
  const nextChapterNumber = useMemo(() => {
    if (!existingChapters.length) {
      return suggestedChapterNumber;
    }

    return (
      Math.max(suggestedChapterNumber-1,
        ...existingChapters.map((chapter) => Number(chapter.chapter_number || 0))
      ) + 1
    );
  }, [existingChapters,suggestedChapterNumber]);

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
        status: chapterDraft.status || "draft",
        ...(readEditorialDraft(chapterDraftKey)?.data || {})
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
      title: `Capitulo ${nextChapterNumber}`,
      ...(readEditorialDraft(chapterDraftKey)?.data || {})
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

  async function handleStorySubmit(event,confirmed=false) {
    event?.preventDefault();
    if ((!confirmed && event?.nativeEvent.submitter?.getAttribute("data-create-story") !== "true") || storySubmissionPending.current) return;
    if (!storyForm.storyContent.trim()) {
      setStoryMessage("Escribe el contenido del primer capitulo.");
      return;
    }
    if(storyForm.status==='published'&&!confirmed){setPublicationTarget('story');return;}
    storySubmissionPending.current = true;
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
          submissionId: storySubmissionId.current,
          characters: [...new Set([...storyForm.characters, characterInput.trim()].filter(Boolean))],
          tags: [...new Set([...storyForm.tags, tagInput.trim()].filter(Boolean))],
          description: storyForm.synopsis,
          excerpt: storyForm.synopsis,
          coverUrl
        },
        auth.token
      );

      const createdChapter = result.chapter || null;
      // Attach the planning notebook to the created story, preserving it privately.
      const notesKey=`valoria-notes:${auth.user?.id}:new`;
      try{
        const notes=JSON.parse(localStorage.getItem(notesKey)||'null');
        if(notes){localStorage.setItem(`valoria-notes:${auth.user?.id}:${result.story.id}`,JSON.stringify({...notes,_pending:false}));await saveWorkspace('notes',result.story.id,{...notes,_pending:false},auth.token);localStorage.removeItem(notesKey);await deleteWorkspace('notes','new',auth.token);}
      }catch{ /* The original local notebook remains available if synchronization fails. */ }


      storySubmissionId.current = newClientId();
      const cleared={form:initialStoryForm,characterInput:'',tagInput:'',submissionId:storySubmissionId.current};
      try{localStorage.setItem(`valoria-draft:${storyDraftKey}`,JSON.stringify({data:cleared,savedAt:Date.now(),versions:[]}));}catch{}
      await saveWorkspace('drafts',storyDraftKey,{current:cleared,versions:[]},auth.token).catch(()=>{});
      setStoryForm(initialStoryForm);
      setStoryCover(null);
      setCharacterInput("");
      setTagInput("");
      setStoryMessage(
        createdChapter
          ? `Historia creada: ${result.story.title}. Se guardo tambien el Capitulo 1.`
          : `Historia creada: ${result.story.title}`
      );
      setPublicationTarget('');setPreviewOpen(false);
      onStoryCreated(result.story);
      if (createdChapter) {
        onChapterCreated?.(createdChapter);
      }
    } catch (error) {
      setStoryMessage(error.message);return false;
    } finally {
      storySubmissionPending.current = false;
      setLoadingStory(false);
    }
  }

  async function clearChapterDraft(){
    try{localStorage.removeItem(`valoria-draft:${chapterDraftKey}`);}catch{}
    await deleteWorkspace('drafts',chapterDraftKey,auth.token).catch(()=>{});
  }

  async function handleChapterSubmit(event,confirmed=false) {
    event?.preventDefault();
    if((!confirmed&&event?.nativeEvent.submitter?.getAttribute("data-save-chapter")!=="true") || chapterSubmissionPending.current)return;
    if (!chapterForm.content.trim()) {
      setChapterMessage("Escribe el contenido del capitulo.");
      return;
    }
    if(chapterForm.status==='published'&&!confirmed){setPublicationTarget('chapter');return;}
    chapterSubmissionPending.current=true;
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
        scheduledAt: chapterForm.scheduledAt ? new Date(chapterForm.scheduledAt).toISOString() : "",
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
        await clearChapterDraft();
        setPublicationTarget('');setPreviewOpen(false);
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
        await clearChapterDraft();
        setPublicationTarget('');setPreviewOpen(false);
        onChapterCreated?.(result.chapter);
      }
    } catch (error) {
      setChapterMessage(error.message);return false;
    } finally {
      chapterSubmissionPending.current=false;
      setLoadingChapter(false);
    }
  }

  return (
    <section ref={editorSection} className={styles.section}>
      <SaveStatus text={mode === 'chapter' ? chapterSaveStatus : storySaveStatus}/>
      <p>{ui("Los archivos elegidos se suben al guardar. Si recargas antes, tendrás que seleccionarlos de nuevo.")}</p>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
        <button type="button" onClick={()=>setPreviewOpen(current=>!current)}>{ui("Vista previa")}</button>
        <select aria-label={ui("Versiones del borrador")} value={versionChoice} onChange={event=>{setVersionChoice(event.target.value);const saved=readEditorialDraft(mode==='chapter'?chapterDraftKey:storyDraftKey);const version=saved?.versions?.[Number(event.target.value)];if(version){if(mode==='chapter')setChapterForm(version.data);else setStoryForm(version.data.form);}}}>
          <option value="">{ui("Recuperar una versión anterior")}</option>
          {(readEditorialDraft(mode==='chapter'?chapterDraftKey:storyDraftKey)?.versions||[]).map((version,index)=><option key={index} value={index}>{new Date(version.at).toLocaleString('es-CL')}</option>)}
        </select>
      </div>
      {(previewOpen||publicationTarget)&&<PublicationPreview title={mode==='chapter'?selectedStory?.title:storyForm.title} description={mode==='chapter'?selectedStory?.description:storyForm.synopsis} cover={mode==='chapter'?selectedStory?.cover:coverPreview} chapterTitle={mode==='chapter'?chapterForm.title:'Capítulo 1'} content={mode==='chapter'?chapterForm.content:storyForm.storyContent} onClose={()=>{setPreviewOpen(false);setPublicationTarget('');}} onConfirm={publicationTarget?()=>publicationTarget==='story'?handleStorySubmit(null,true):handleChapterSubmit(null,true):undefined}/>}
      <WriterPlanning content={mode==='story'?storyForm.storyContent:chapterForm.content} key={mode==='story'?"new":selectedStoryId||"new"} storyId={mode==='story'?"new":selectedStoryId||"new"} auth={auth} />
      <div className={styles.heading}>
        <div>
          <span>{ui("Studio")}</span>
          <h2>
            {mode === "story"
              ? ui("Crear una nueva historia")
              : mode === "chapter"
                ? isEditingChapter
                  ? ui("Modificar un capitulo existente")
                  : ui("Agregar un nuevo capitulo")
                : ui("Listo para Supabase y subida de imagenes")}
          </h2>
        </div>
        <p>
          {mode === "story"
            ? ui("Abre el formulario solo cuando quieras empezar una nueva historia.")
            : mode === "chapter"
              ? isEditingChapter
                ? ui("Ajusta contenido, estado o numero del capitulo seleccionado.")
                : ui("Publica capitulos solo sobre la historia que tengas seleccionada.")
              : ui("Puedes probar la creacion ahora mismo. Sin credenciales usa respaldo local; con Supabase activo persiste en la nube.")}
        </p>
      </div>

      <div className={styles.grid}>
        {mode !== "chapter" ? (
        <form className={styles.card} onSubmit={handleStorySubmit} onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing || event.target.tagName !== "INPUT" || ["submit", "button", "file"].includes(event.target.type)) return;
          event.preventDefault();
          if (event.target.dataset.storyList === "tag") addTag();
          if (event.target.dataset.storyList === "character") addCharacter();
        }}>
          <div className={styles.storyComposer}>
            <aside className={styles.coverPanel}>
              <div className={styles.coverPreview}>
                {coverPreview ? (
                  <img src={coverPreview} alt={ui("Vista previa de portada")} />
                ) : (
                  <div className={styles.coverPlaceholder}>
                    <strong>{ui("Anadiras una portada")}</strong>
                    <span>{ui("Recomendado: vertical y contrastada")}</span>
                  </div>
                )}
              </div>

              <label className={styles.uploadLabel}>
                <span>{ui("Portada")}</span>
                <div className={styles.filePicker}>
                  <label className={styles.fileButton}>
                    <input
                      className={styles.fileInput}
                      type="file"
                      accept=".png,.gif,.jpg,.jpeg,image/png,image/gif,image/jpeg"
                      onChange={handleCoverChange}
                    />{ui(" Elegir portada ")}</label>
                  <small className={styles.fileName}>
                    {storyCover?.name || ui("Ningun archivo seleccionado")}
                  </small>
                </div>
                <small className={styles.uploadNote}>{ui(" Debe estar en formato PNG, GIF, JPG, de menos de 2MB. Dimensiones recomendadas: 512X800 px. ")}</small>
              </label>
            </aside>

            <div className={styles.detailsPanel}>
              <div className={styles.panelTitle}>
                <h3>{ui("Detalles de la historia")}</h3>
                {!auth.isAuthenticated ? (
                  <p className={styles.message}>{ui(" Inicia sesion para publicar historias e imagenes. ")}</p>
                ) : null}
              </div>

              <label className={styles.field}>
                <span>{ui("Titulo")}</span>
                <input
                  placeholder={ui("Historia sin titulo")}
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
                <span>{ui("Sinopsis o descripcion general")}</span>
                <textarea
                  rows="5"
                  placeholder={ui("Resume el corazon de la historia, el tono y lo que engancha.")}
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

              <div className={styles.field}>
                <span>{ui("Historia")}</span>
                <RichTextEditor label="Historia" value={storyForm.storyContent} placeholder={ui("Escribe el primer capitulo de tu historia...")} onChange={(content) => setStoryForm((current) => ({ ...current, storyContent: content }))} />
              </div>

              <div className={styles.field}>
                <span>{ui("Personajes principales")}</span>
                <div className={styles.inlineBuilder}>
                  <input
                    placeholder={ui("Nombre")}
                    aria-label={ui("Nombre del personaje")}
                    data-story-list="character"
                    value={characterInput}
                    onChange={(event) => setCharacterInput(event.target.value)}
                  />
                  <button onClick={addCharacter} type="button" aria-label={ui("Agregar personaje")}>
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
                        {character}{ui(" x ")}</button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={styles.twoCols}>
                <label className={`${styles.field} ${styles.categoryField}`}>
                  <span>{ui("Categoria")}</span>
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
                        {ui(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>{ui("Estado")}</span>
                  <select
                    value={storyForm.status}
                    onChange={(event) =>
                      setStoryForm((current) => ({
                        ...current,
                        status: event.target.value
                      }))
                    }
                  >
                    <option value="draft">{ui("Borrador")}</option>
                    <option value="published">{ui("Publicado")}</option>
                  </select>
                </label>
              </div>

              <div className={styles.field}>
                <span>{ui("Etiquetas")}</span>
                <div className={styles.inlineBuilder}>
                  <input
                    placeholder={ui("Agrega una etiqueta")}
                    aria-label={ui("Agregar etiqueta")}
                    data-story-list="tag"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                  />
                  <button onClick={addTag} type="button" aria-label={ui("Agregar etiqueta a la historia")}>
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
                  <span>{ui("Audiencia principal")}</span>
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
                        {ui(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>{ui("Idioma")}</span>
                  <select
                    value={storyForm.language}
                    onChange={(event) =>
                      setStoryForm((current) => ({
                        ...current,
                        language: event.target.value
                      }))
                    }
                  >
                    {languageOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {languageLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.metaGrid}>
                <label className={styles.field}>
                  <span>{ui("Derechos de autor")}</span>
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
                        {ui(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.toggleField}>
                  <span>{ui("Clasificacion")}</span>
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
                    {storyForm.mature ? ui("Madura") : ui("General")}
                  </button>
                </label>
              </div>

              <div className={styles.footerNote}>
                <p>{ui(" Tu historia se vera mejor con una portada vertical, etiquetas claras y una descripcion que explique el conflicto principal. ")}</p>
              </div>
            </div>
          </div>

          <button data-create-story="true" disabled={loadingStory || !auth.isAuthenticated} type="submit">
            {loadingStory ? ui("Guardando...") : ui("Crear historia")}
          </button>
          {storyMessage ? <p className={styles.message}>{storyMessage}</p> : null}
        </form>
        ) : null}

        {mode !== "story" ? (
        <form className={styles.card} onSubmit={handleChapterSubmit} onKeyDown={event=>{if(event.key==="Enter" && event.target.tagName==="INPUT")event.preventDefault();}}>
          <div className={styles.panelTitle}>
            <h3>{isEditingChapter ? ui("Editar capitulo") : ui("Agregar capitulo")}</h3>
            {!auth.isAuthenticated ? (
              <p className={styles.message}>{ui(" Inicia sesion para crear capitulos. ")}</p>
            ) : null}
          </div>

          <div className={styles.twoCols}>
            <label className={styles.field}>
              <span>{ui("Historia")}</span>
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
                <option value="">{ui("Selecciona una historia")}</option>
                {stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>{ui("Categoria")}</span>
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
                    {ui(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>{ui("Numero")}</span>
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
            <span>{ui("Titulo del capitulo")}</span>
            <input
              placeholder={ui("Capitulo 1")}
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
            <span>{ui("Resumen")}</span>
            <textarea
              rows="3"
              placeholder={ui("Que se lleva el lector de este capitulo")}
              value={chapterForm.excerpt}
              onChange={(event) =>
                setChapterForm((current) => ({
                  ...current,
                  excerpt: event.target.value
                }))
              }
            />
          </label>

          <div className={styles.field}>
            <span>{ui("Contenido")}</span>
            <label>{ui("Programar publicación (")}{Intl.DateTimeFormat().resolvedOptions().timeZone})<input type="datetime-local" value={chapterForm.scheduledAt||""} onChange={event=>setChapterForm(current=>({...current,scheduledAt:event.target.value,status:"draft"}))}/></label>
            <p>{ui("Deja la fecha vacía para guardar sin programación. Si eliges publicar ahora, borra la fecha.")}</p>
            <RichTextEditor label="Contenido del capitulo" value={chapterForm.content} onChange={(content) => setChapterForm((current) => ({ ...current, content }))} />
          </div>

          <div className={styles.twoCols}>
            <label className={styles.field}>
              <span>{ui("Link de ilustracion")}</span>
              <input
                type="url"
                placeholder={ui("https://...")}
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
              <span>{ui("Imagen del capitulo")}</span>
              <div className={styles.filePicker}>
                <label className={styles.fileButton}>
                  <input
                    className={styles.fileInput}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setChapterImage(event.target.files?.[0] || null)
                    }
                  />{ui(" Elegir imagen ")}</label>
                <small className={styles.fileName}>
                  {chapterImage?.name || ui("Ningun archivo seleccionado")}
                </small>
              </div>
            </label>
          </div>

          <div className={styles.twoCols}>

            <label className={styles.field}>
              <span>{ui("Estado")}</span>
              <select
                value={chapterForm.status}
                onChange={(event) =>
                  setChapterForm((current) => ({
                    ...current,
                    status: event.target.value
                  }))
                }
              >
                <option value="draft">{ui("Borrador")}</option>
                <option value="published">{ui("Publicado")}</option>
              </select>
            </label>
          </div>

          <button
            disabled={
              loadingChapter || !availableStories || !auth.isAuthenticated
            }
            data-save-chapter="true" type="submit"
          >
            {loadingChapter
              ? ui("Guardando...")
              : isEditingChapter
                ? ui("Guardar cambios")
                : ui("Crear capitulo")}
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
