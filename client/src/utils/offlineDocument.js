import { contentToHtml, escapeHtml } from './richContent.js';

// The reader is self-contained: system fonts, inline styles, no scripts or remote media.
export function createOfflineDocument(work) {
  const chapters=Array.isArray(work.chapters)?work.chapters:[];
  const title=escapeHtml(work.title||'Historia');
  const index=chapters.map((chapter,index)=>`<li><a href="#capitulo-${index+1}">${escapeHtml(chapter.title||`Capítulo ${index+1}`)}</a></li>`).join('');
  const pages=chapters.map((chapter,index)=>`<section id="capitulo-${index+1}"><p class="chapter-number">Capítulo ${index+1}</p><h2>${escapeHtml(chapter.title||`Capítulo ${index+1}`)}</h2><article>${contentToHtml(chapter.content||'')}</article><a class="back" href="#indice">Volver al índice</a></section>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${title} · Valoria</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#17101f;color:#f6f1fb;font-family:system-ui,sans-serif}main{width:min(780px,100%);margin:auto;padding:24px 16px 48px}header,nav,section{border:1px solid #493654;border-radius:24px;padding:clamp(20px,5vw,36px);margin:0 0 24px;background:#271934;overflow-wrap:anywhere}h1{font-size:clamp(28px,6vw,42px);line-height:1.2}h2{font-size:clamp(22px,5vw,30px)}header p,.chapter-number{color:#d8c3f1}a{color:#d8c3f1}li{margin:14px 0}article{font-family:Georgia,serif;font-size:18px;line-height:1.9;padding:24px;border-radius:18px;background:#efe4d6;color:#493c4e}article p{margin:0 0 1em}blockquote{margin:1.5em 0;padding-left:18px;border-left:3px solid #9572c0;font-style:italic}pre{white-space:pre-wrap;overflow-wrap:anywhere}code{font-size:.9em}article a{color:#614280}.back{display:inline-block;margin-top:24px}footer{padding:8px 20px;color:#d8c3f1;font-size:14px}@media(max-width:480px){article{padding:18px}nav,section{padding:20px}}@media print{body{background:white;color:#222}header,nav,section{background:white;color:#222;border:0;padding:0;break-inside:avoid-page}article{background:white;color:#222}a{color:inherit}.back,footer{display:none}section{break-before:page}}
</style></head><body><main><header><p>VALORIA · LECTURA GUARDADA</p><h1>${title}</h1><p>${escapeHtml(work.author||'')}</p><p>${escapeHtml(work.description||'')}</p></header><nav id="indice" aria-label="Índice de capítulos"><h2>Índice</h2><ol>${index}</ol></nav>${pages}<footer>Copia de texto guardada para leer sin conexión. Las actualizaciones, imágenes y reseñas están disponibles en Valoria cuando tengas conexión.</footer></main></body></html>`;
}

export function downloadFile(text, filename, type='text/html;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}

export function downloadOfflineDocument(work) {
  const filename=(work.slug||work.title||'historia').replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,100)||'historia';
  downloadFile(createOfflineDocument(work),`${filename}-lectura.html`);
}
