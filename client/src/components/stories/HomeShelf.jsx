// Fila de portadas estilo biblioteca/home.
// Cada tarjeta abre la hoja de lectura correspondiente.
import { StarRating } from "../common/StarRating";
import { clampRating } from "../../utils/ratings";
import styles from "../../styles/HomeShelf.module.css";

export function HomeShelf({
  section,
  onOpenStory,
  onOpenAuthor,
  sectionId = ""
}) {
  const showHeader = Boolean(section.title || section.subtitle);

  return (
    <section className={styles.section} id={sectionId || undefined}>
      {showHeader ? (
        <div className={styles.header}>
          <div>
            <h2>{section.title}</h2>
            <p>{section.subtitle}</p>
          </div>
        </div>
      ) : null}

      <div className={styles.row}>
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
              <button
                className={styles.cardButton}
                onClick={() => onOpenStory?.(story)}
                type="button"
              >
                <div className={styles.coverWrap}>
                  <span className={`${styles.typePill} ${styles.typePillStory}`}>
                    Historia
                  </span>
                  <img src={story.cover} alt={story.title} />
                </div>
                <div className={styles.cardCopy}>
                  <h3>{story.title}</h3>
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
                  <div className={styles.ratingRow}>
                    <StarRating size="sm" value={ratingValue} icon="heart" />
                    <span>{story.ratingCount || 0} reseñas</span>
                  </div>
                  <div className={styles.metaRow}>
                    <small>
                      <span aria-hidden="true" className={styles.eyeIcon} />
                      {story.reads} vistas
                    </small>
                  </div>
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
