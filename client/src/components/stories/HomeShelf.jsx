import { ui } from "../../i18n/runtime.js";
// Fila de portadas estilo biblioteca/home.
// Cada tarjeta abre la hoja de lectura correspondiente.
import { StarRating } from "../common/StarRating";
import { clampRating } from "../../utils/ratings";
import styles from "../../styles/HomeShelf.module.css";

export function HomeShelf({
  section,
  onOpenStory,
  onOpenAuthor,
  scrollable = false,
  onHideRecommendation,
  sectionId = ""
}) {
  const showHeader = Boolean(section.title || section.subtitle);

  return (
    <section className={styles.section} id={sectionId || undefined}>
      {showHeader ? (
        <div className={styles.header}>
          <div>
            <h2>{ui(section.title)}</h2>
            <p>{ui(section.subtitle)}</p>
          </div>
        </div>
      ) : null}

      <div className={`${styles.row} ${scrollable ? styles.carousel : ''}`}>
        {section.stories.map((story) => {
          // Se normaliza la nota para que la tarjeta siempre pinte un valor valido.
          const ratingValue = clampRating(
            story.ratingAverage ?? story.rating_average ?? 0
          );

          return (
            <article
              key={story.id}
              className={`${styles.card} ${styles.cardVariantEditorial}`}
            >
              <div className={styles.cardButton}>
                <button type="button" aria-label={ui("Abrir historia {0}",[story.title])} onClick={()=>onOpenStory?.(story)} className={styles.coverWrap}>
                  <span className={`${styles.typePill} ${styles.typePillStory}`}>{ui(" Historia ")}</span>
                  <img loading="lazy" src={story.cover || "/default-cover.svg"} onError={(event) => { if (!event.currentTarget.src.endsWith("/default-cover.svg")) event.currentTarget.src = "/default-cover.svg"; }} alt={story.title} />
                </button>
                <div className={styles.cardCopy}>
                  <h3><button type="button" className={styles.authorLink} onClick={()=>onOpenStory?.(story)}>{story.title}</button></h3>
                  <button
                    className={styles.authorLink}
                    onClick={(event) => {
                      event.stopPropagation();
                      story.authorId ? onOpenAuthor?.(story.authorId) : null;
                    }}
                    type="button"
                  >
                    {story.author}
                  </button>
                  <div>{story.recommendation&&<><p>{ui(story.recommendation.kind==='author'?'Del mismo creador: {0}':'Porque lees {0}',[story.recommendation.kind==='category'?ui(story.recommendation.value):story.recommendation.value])}</p>{onHideRecommendation&&<button className={styles.authorLink} type="button" onClick={()=>onHideRecommendation(story.id)}>{ui('Ocultar recomendación')}</button>}</>}</div>
                  <div className={styles.ratingRow}>
                    <StarRating size="sm" value={ratingValue} icon="heart" />
                    <span>{story.ratingCount || 0}{ui(" reseñas")}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <small>
                      <span aria-hidden="true" className={styles.eyeIcon} />
                      {story.reads}{ui(" vistas ")}</small>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
