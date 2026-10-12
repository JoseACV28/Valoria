import { ui } from '../../i18n/runtime.js';
import { useEffect, useRef, useState } from 'react';
import styles from '../../styles/BookReader.module.css';

// Las columnas conservan todo el contenido y forman pliegos de dos páginas.
export function BookReader({ chapterId, title, blocks, image }) {
  const viewport = useRef(null), flow = useRef(null);
  const [spread, setSpread] = useState(0), [pages, setPages] = useState(1), [columns, setColumns] = useState(2);
  useEffect(() => {
    const outer = viewport.current, inner = flow.current;
    let active = true;
    function measure() {
      if (!active || !outer.clientWidth) return;
      const style = getComputedStyle(inner);
      const count = Number(style.columnCount) || 1;
      const gap = parseFloat(style.columnGap) || 0;
      const columnWidth = (outer.clientWidth - gap * (count - 1)) / count;
      const total = Math.max(count, Math.ceil((inner.scrollWidth + gap - 1) / (columnWidth + gap)));
      setColumns(count); setPages(total);
      const position = Math.max(0, Math.round(outer.scrollLeft / (outer.clientWidth + gap)));
      const lastSpread = Math.ceil(total / count) - 1;
      if (position > lastSpread) outer.scrollLeft = lastSpread * (outer.clientWidth + gap);
      setSpread(Math.min(lastSpread, position));
    }
    const resize = new ResizeObserver(() => { outer.scrollLeft = 0; measure(); });
    resize.observe(outer);
    const preferences = new MutationObserver(measure);
    const reader = outer.closest('[data-reading-theme]');
    if (reader) preferences.observe(reader, { attributes:true, attributeFilter:['style','data-reading-theme'] });
    inner.addEventListener('load', measure, true); outer.addEventListener('scroll', measure);
    outer.scrollLeft = 0; measure();
    document.fonts?.ready.then(measure);
    return () => { active = false; resize.disconnect(); preferences.disconnect(); inner.removeEventListener('load', measure, true); outer.removeEventListener('scroll', measure); };
  }, [chapterId, blocks, image]);
  function go(next) {
    const outer = viewport.current;
    const gap = parseFloat(getComputedStyle(flow.current).columnGap) || 0;
    const target = Math.max(0, Math.min(Math.ceil(pages / columns) - 1, next));
    outer.scrollTo({ left: target * (outer.clientWidth + gap), behavior: 'auto' });
    setSpread(target);
  }
  const first = spread * columns + 1, last = Math.min(pages, first + columns - 1);
  return <div className={styles.paper}>
    <div className={styles.spread}>
      <div ref={viewport} className={styles.viewport} aria-label={ui('Páginas del capítulo')} tabIndex={0} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight') { event.preventDefault(); go(spread + 1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); go(spread - 1); }
      }}>
        <span className={styles.extent} aria-hidden="true" style={{width:`calc(${Math.ceil(pages / columns)} * (100% + ${columns === 2 ? 64 : 32}px) - ${columns === 2 ? 64 : 32}px)`}} />
        <div ref={flow} className={styles.flow}><h3>{title}</h3>{image && <img src={image} alt={ui('Ilustración de {0}', [title])} />}{blocks.map((html, index) => <div key={index} dangerouslySetInnerHTML={{ __html: html }} />)}</div>
      </div>
    </div>
    <nav className={styles.navigation} aria-label={ui('Páginas del libro')}>
      <button type="button" disabled={spread <= 0} onClick={() => go(spread - 1)}>{ui('Página anterior')}</button>
      <span role="status">{columns === 2 ? ui('Páginas {0}–{1} de {2}', [first, last, pages]) : ui('Página {0} de {1}', [first, pages])}</span>
      <button type="button" disabled={spread >= Math.ceil(pages / columns) - 1} onClick={() => go(spread + 1)}>{ui('Página siguiente')}</button>
    </nav>
  </div>;
}
