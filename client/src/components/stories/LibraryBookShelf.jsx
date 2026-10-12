import { ui } from '../../i18n/runtime';
import styles from '../../styles/LibraryHome.module.css';

// Una misma presentación para todas las filas de libros del home nuevo.
// HomeShelf mantiene íntegro el visual de la portada anterior.
export function LibraryBookShelf({ section, onOpenStory, onOpenAuthor, onHideRecommendation, children }) {
  if (!section.stories.length) return null;
  return <section className={styles.shelf}>
    <div className={styles.sectionHeading}>
      <div><h2>{ui(section.title)}</h2>{section.subtitle && <p className={styles.shelfSubtitle}>{ui(section.subtitle)}</p>}</div>
      {children && <div className={styles.sectionLinks}>{children}</div>}
    </div>
    <div className={`${styles.books} ${section.stories.length > 5 ? styles.scrollBooks : ''}`}>
      {section.stories.map(story => <article key={story.id} className={styles.book}>
        <button type="button" aria-label={ui('Abrir historia {0}',[story.title])} className={styles.bookLink} onClick={() => onOpenStory?.(story)}>
          <span className={styles.cover}>
            <img loading="lazy" src={story.cover || '/default-cover.svg'} alt="" onError={event => {
              if (!event.currentTarget.src.endsWith('/default-cover.svg')) event.currentTarget.src = '/default-cover.svg';
            }} />
            <span className={styles.workBadge}>{ui('Historia')}</span>
          </span>
          <h3>{story.title}</h3>
        </button>
        {story.authorId ? <button type="button" className={styles.author} onClick={() => onOpenAuthor?.(story.authorId)}>{story.author}</button> : <span className={styles.author}>{story.author}</span>}
        {story.recommendation && <div className={styles.recommendation}>
          <p>{ui(story.recommendation.kind === 'author' ? 'Del mismo creador: {0}' : 'Porque lees {0}', [story.recommendation.kind === 'category' ? ui(story.recommendation.value) : story.recommendation.value])}</p>
          {onHideRecommendation && <button type="button" className={styles.hideRecommendation} aria-label={`${ui('Ocultar recomendación')}: ${story.title}`} onClick={() => onHideRecommendation(story.id)}>{ui('Ocultar recomendación')}</button>}
        </div>}
      </article>)}
    </div>
  </section>;
}
