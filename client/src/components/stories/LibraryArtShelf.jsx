import { ui } from '../../i18n/runtime';
import styles from '../../styles/LibraryHome.module.css';

export function LibraryArtShelf({ title, subtitle, works, onOpenIllustration, onNavigate, children }) {
  if (!works.length) return null;
  return <section className={styles.shelf}>
    <div className={styles.sectionHeading}>
      <div><h2>{ui(title)}</h2>{subtitle && <p className={styles.shelfSubtitle}>{ui(subtitle)}</p>}</div>
      {children && <div className={styles.sectionLinks}>{children}</div>}
    </div>
    <div className={styles.books}>{works.map(work => <article key={work.id} className={styles.book}>
      <button type="button" aria-label={ui('Abrir ilustración {0}',[work.title])} className={styles.bookLink} onClick={() => onOpenIllustration(work)}>
        <span className={`${styles.cover} ${styles.artwork}`}><img loading="lazy" src={work.coverUrl || '/default-illustration.svg'} alt="" onError={event => {if (!event.currentTarget.src.endsWith('/default-illustration.svg')) event.currentTarget.src = '/default-illustration.svg';}} /><span className={styles.workBadge}>{ui('Ilustración')}</span></span>
        <h3>{work.title}</h3>
      </button>
      {work.authorId ? <button type="button" className={styles.author} onClick={() => onNavigate('creator-profile', {profileId:work.authorId})}>{work.author}</button> : <span className={styles.author}>{work.author}</span>}
    </article>)}</div>
  </section>;
}
