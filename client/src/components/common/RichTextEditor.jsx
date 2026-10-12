import { ui } from "../../i18n/runtime.js";
import { useEffect, useId, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { contentToHtml, safeLink, sanitizeHtml, serializeRichContent } from "../../utils/richContent";
import styles from "../../styles/RichTextEditor.module.css";

const emojis = ["😊", "❤️", "✨", "🔥", "🌙", "🌸", "😢", "😂", "💜", "⭐", "🎉", "📖", "💭", "⚡", "🌊", "🦋"];

export function RichTextEditor({ value = "", onChange, label = "Contenido", placeholder = "Escribe tu historia..." }) {
  const id = useId();
  const root = useRef(null);
  const changeRef = useRef(onChange);
  const lastEmitted = useRef(value);
  const [advanced, setAdvanced] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [panel, setPanel] = useState("");
  const [link, setLink] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  changeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, protocols: ["http", "https", "mailto"] } }),
      TextStyleKit.configure({ backgroundColor: false, lineHeight: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder })
    ],
    content: contentToHtml(value),
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: styles.canvas, role: "textbox", "aria-label": label, "aria-multiline": "true", "aria-required": "true", spellcheck: "true" },
      transformPastedHTML: sanitizeHtml
    },
    onUpdate: ({ editor: current }) => {
      const next = serializeRichContent(current.getHTML());
      lastEmitted.current = next;
      changeRef.current(next);
    }
  });

  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      editor.chain().setMeta("addToHistory", false)
        .setContent(contentToHtml(value), { emitUpdate: false }).run();
      lastEmitted.current = value;
    }
  }, [editor, value]);

  useEffect(() => {
    if (!focusMode) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    editor?.commands.focus();
    function handleKey(event) {
      if (event.key === "Escape") { event.preventDefault(); setFocusMode(false); }
      if (event.key === "Tab") {
        const controls = [...root.current.querySelectorAll('button:not([disabled]),select,input,textarea,[contenteditable="true"]')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [focusMode, editor]);

  if (!editor) return <div role="status">{ui("Preparando espacio de escritura...")}</div>;
  const words = (editor.getText().trim().match(/\S+/g) || []).length;
  const paragraphStyle = editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p";
  function tool(title, text, action, active, disabled = false) {
    return <button type="button" aria-label={ui(title)} title={ui(title)} aria-pressed={active} disabled={disabled}
      onMouseDown={(event) => event.preventDefault()} onClick={action}>{ui(text)}</button>;
  }
  function openPanel(next) {
    setPanel(panel === next ? "" : next); setMessage("");
    if (next === "link") setLink(editor.getAttributes("link").href || "");
  }
  function insertLink() {
    const href = safeLink(link);
    if (!href) { setMessage("Introduce un enlace https://, http:// o mailto: válido."); return; }
    const chain = editor.chain().focus();
    if (editor.state.selection.empty) chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    else chain.extendMarkRange("link").setLink({ href }).run();
    setPanel(""); setLink(""); setMessage("");
  }
  function insertCode() {
    if (!code.trim()) return;
    editor.chain().focus().insertContent([{ type: "codeBlock", content: [{ type: "text", text: code }] }, { type: "paragraph" }]).run();
    setCode(""); setPanel("");
  }
  return (
    <section ref={root} className={styles.editor + (focusMode ? " " + styles.focusMode : "")}
      role={focusMode ? "dialog" : undefined} aria-modal={focusMode ? "true" : undefined} aria-label={focusMode ? ui("Escritura sin distracciones") : undefined}>
      <div className={styles.toolbar} role="group" aria-label={ui('Formato de {0}',[ui(label)])}>
        <div className={styles.essential}>
          {tool("Deshacer", "↶", () => editor.chain().focus().undo().run(), undefined, !editor.can().undo())}
          {tool("Rehacer", "↷", () => editor.chain().focus().redo().run(), undefined, !editor.can().redo())}
          <select aria-label={ui("Estilo de párrafo")} value={paragraphStyle} onChange={(event) => {
            const chain = editor.chain().focus();
            event.target.value === "p" ? chain.setParagraph().run() : chain.setHeading({ level: event.target.value === "h2" ? 2 : 3 }).run();
          }}><option value="p">{ui("Párrafo")}</option><option value="h2">{ui("Título")}</option><option value="h3">{ui("Subtítulo")}</option></select>
          {tool("Negrita", <strong>{ui("B")}</strong>, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
          {tool("Cursiva", <em>{ui("I")}</em>, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
          {tool("Cita", "❝ Cita", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
          {tool("Separador de escena", "⁂", () => editor.chain().focus().setHorizontalRule().run())}
        </div>
        <div className={styles.viewTools}>
          <button type="button" aria-expanded={advanced} aria-controls={id + "-advanced"} onClick={() => { setAdvanced(!advanced); setPanel(""); }}>{ui("Más opciones")}</button>
          <button type="button" aria-pressed={focusMode} onClick={() => setFocusMode(!focusMode)}>{focusMode ? ui("Volver al panel") : ui("Concentración")}</button>
        </div>
      </div>
      {advanced && <div id={id + "-advanced"} className={styles.advanced} role="group" aria-label={ui("Herramientas adicionales")}>
        <label>{ui("Tipografía")}<select aria-label={ui("Tipo de letra")} value={editor.getAttributes("textStyle").fontFamily || ""} onChange={(event) => {
          const chain = editor.chain().focus(); event.target.value ? chain.setFontFamily(event.target.value).run() : chain.unsetFontFamily().run();
        }}><option value="">{ui("Del relato")}</option><option value="Georgia">{ui("Serif")}</option><option value="Arial">{ui("Sans serif")}</option><option value="Verdana">{ui("Verdana")}</option><option value="monospace">{ui("Monoespaciada")}</option></select></label>
        <label>{ui("Tamaño")}<select aria-label={ui("Tamaño de letra")} value={editor.getAttributes("textStyle").fontSize || ""} onChange={(event) => {
          const chain = editor.chain().focus(); event.target.value ? chain.setFontSize(event.target.value).run() : chain.unsetFontSize().run();
        }}><option value="">{ui("Del relato")}</option><option value="14px">{ui("Pequeña")}</option><option value="18px">{ui("Normal")}</option><option value="24px">{ui("Grande")}</option><option value="30px">{ui("Muy grande")}</option></select></label>
        <label>{ui("Color")}<input type="color" aria-label={ui("Color del texto")} defaultValue="#f6f1fb" onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} /></label>
        {tool("Subrayado", "Subrayado", () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"))}
        {tool("Tachado", "Tachado", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"))}
        {tool("Alinear a la izquierda", "Izquierda", () => editor.chain().focus().setTextAlign("left").run())}
        {tool("Centrar texto", "Centrar", () => editor.chain().focus().setTextAlign("center").run())}
        {tool("Alinear a la derecha", "Derecha", () => editor.chain().focus().setTextAlign("right").run())}
        {tool("Lista con viñetas", "Viñetas", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {tool("Lista numerada", "Numeración", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
        {tool("Insertar enlace", "Enlace", () => openPanel("link"))}
        {tool("Insertar emoji", "Emojis", () => openPanel("emoji"))}
        {tool("Insertar bloque de código", "Código", () => openPanel("code"))}
        {tool("Quitar formato", "Quitar formato", () => editor.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run())}
      </div>}
      {panel && <div className={styles.panel}>
        {panel === "emoji" && <div className={styles.emojis} aria-label={ui("Emojis")}>
          {emojis.map((emoji) => <button key={emoji} type="button" aria-label={"Emoji " + emoji} onMouseDown={(event) => event.preventDefault()} onClick={() => { editor.chain().focus().insertContent({ type: "text", text: emoji }).run(); setPanel(""); }}>{emoji}</button>)}
        </div>}
        {panel === "link" && <><label htmlFor={id + "-link"}>{ui("Dirección del enlace")}</label><input id={id + "-link"} type="url" placeholder={ui("https://...")} value={link} onChange={(event) => setLink(event.target.value)} /><button type="button" onClick={insertLink}>{ui("Añadir enlace")}</button>
          {editor.isActive("link") && <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); setPanel(""); }}>{ui("Quitar enlace")}</button>}</>}
        {panel === "code" && <><label htmlFor={id + "-code"}>{ui("Código o texto especial")}</label><textarea id={id + "-code"} rows="5" placeholder={ui("Escribe código para mostrar como texto")} value={code} onChange={(event) => setCode(event.target.value)} /><small>{ui("Se muestra como texto; no se ejecuta.")}</small><button type="button" onClick={insertCode}>{ui("Añadir bloque")}</button></>}
        <button type="button" onClick={() => { setPanel(""); setMessage(""); }}>{ui("Cerrar herramientas")}</button>
        {message && <p role="alert">{ui(message)}</p>}
      </div>}
      <EditorContent editor={editor} className={styles.manuscript} />
      <div className={styles.footer}><span>{words} {words === 1 ? ui("palabra") : ui("palabras")}</span><span>{words ? Math.max(1, Math.ceil(words / 200)) + " min de lectura" : ui("Tu historia empieza aquí")}</span></div>
    </section>
  );
}
