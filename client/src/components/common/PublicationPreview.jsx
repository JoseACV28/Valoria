import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {ui} from '../../i18n/runtime';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {contentToHtml,sanitizeHtml} from '../../utils/richContent';
import styles from '../../styles/PublicationPreview.module.css';
export function PublicationPreview({title,description,cover,content,chapterTitle,images=[],onClose,onConfirm}) {
  const [size,setSize]=useState('desktop'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const root=useDialogFocus(true,()=>{if(!busy)onClose();});
  useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[]);
  async function confirm(){if(busy)return;setBusy(true);setError('');try{const result=await onConfirm();if(result===false)setError('No se pudo publicar. Revisa el mensaje del editor.');}catch{setError('No se pudo publicar. Revisa el mensaje del editor.');}finally{setBusy(false);}}
  return createPortal(<div className={styles.backdrop} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><section ref={root} className={styles.dialog} data-publication-preview="true" role="dialog" aria-modal="true" aria-label={ui('Vista previa de publicación')}>
    <header className={styles.header}><div><h2>{ui('Vista previa de publicación')}</h2><p>{ui(onConfirm?'Revisa la obra antes de hacerla pública.':'Así se verá tu contenido; esta vista no publica cambios.')}</p></div><button type="button" disabled={busy} onClick={onClose}>{ui('Cerrar')}</button></header>
    <nav className={styles.controls} aria-label={ui('Tamaño de vista previa')}><button type="button" aria-pressed={size==='desktop'} onClick={()=>setSize('desktop')}>{ui('Escritorio')}</button><button type="button" aria-pressed={size==='mobile'} onClick={()=>setSize('mobile')}>{ui('Móvil')}</button></nav>
    <div className={styles.scroll}><article className={`${styles.page} ${size==='mobile'?styles.mobile:''}`}>
      <div className={styles.cover}>{cover&&<img src={cover} alt={title||''}/>}<div><span>{ui('Tu publicación')}</span><h1>{title||ui('Historia sin título')}</h1><p>{description}</p></div></div>
      {images.map((image,i)=><img key={i} className={styles.gallery} src={image.publicUrl||image.previewUrl} alt={image.altText||''}/>)}
      {content&&<section className={styles.paper}><h2>{chapterTitle||ui('Capítulo 1')}</h2><div dangerouslySetInnerHTML={{__html:sanitizeHtml(contentToHtml(content))}}/></section>}
    </article></div>
    <footer className={styles.footer}><p role="alert">{ui(error)}</p><button type="button" disabled={busy} onClick={onClose}>{ui('Volver al editor')}</button>{onConfirm&&<button type="button" disabled={busy} onClick={confirm}>{ui(busy?'Publicando…':'Confirmar publicación')}</button>}</footer>
  </section></div>,document.body);
}
