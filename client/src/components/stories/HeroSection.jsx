// Hero principal del home.
// Mezcla historias e ilustraciones destacadas dentro de una misma vitrina.
import { useEffect, useMemo, useState } from "react";
import { StarRating } from "../common/StarRating";
import { clampRating } from "../../utils/ratings";
import styles from "../../styles/HeroSection.module.css";

export function HeroSection({
  stories = [],
  illustrations = [],
  onOpenStory,
  onOpenIllustration
}) {
  const featuredItems = useMemo(() => {
    const storyItems = stories.slice(0, 3).map((story) => ({
      id: `story-${story.id || story.slug || story.title}`,
      type: "story",
      category: story.category,
      metric: `${story.reads} lecturas`,
      title: story.title,
      description: story.description,
      author: story.author,
      cover: story.cover,
      ratingAverage: story.ratingAverage,
      ratingCount: story.ratingCount,
      raw: story
    }));

    const illustrationItems = illustrations.slice(0, 3).map((illustration) => ({
      id: `illustration-${illustration.id || illustration.slug || illustration.title}`,
      type: "illustration",
      category: illustration.categories?.[0] || "Ilustracion",
      metric: `${illustration.viewsCount || 0} vistas`,
      title: illustration.title,
      description:
        illustration.description || "Pieza visual destacada de la comunidad creativa.",
      author: illustration.author,
      cover: illustration.coverUrl,
      likesCount: illustration.likesCount || 0,
      commentsCount: illustration.commentsCount || 0,
      raw: illustration
    }));

    return [...storyItems, ...illustrationItems];
  }, [illustrations, stories]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coverFitMode, setCoverFitMode] = useState("portrait");

  function goToPreviousItem() {
    setActiveIndex((current) =>
      current === 0 ? featuredItems.length - 1 : current - 1
    );
  }

  function goToNextItem() {
    setActiveIndex((current) => (current + 1) % featuredItems.length);
  }

  useEffect(() => {
    if (featuredItems.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      goToNextItem();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [featuredItems.length]);

  useEffect(() => {
    if (activeIndex >= featuredItems.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, featuredItems.length]);

  useEffect(() => {
    setCoverFitMode("portrait");
  }, [activeIndex]);

  const activeItem = featuredItems[activeIndex];
  const activeRating = clampRating(
    activeItem?.ratingAverage ?? activeItem?.rating_average ?? 0
  );

  function handleOpenActiveItem() {
    if (!activeItem) {
      return;
    }

    if (activeItem.type === "illustration") {
      onOpenIllustration?.(activeItem.raw);
      return;
    }

    onOpenStory?.(activeItem.raw);
  }

  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <div className={styles.topline}>
          <span className={styles.badge}>Valoria</span>
        </div>
        {activeItem ? (
          <>
            <div className={styles.carousel}>
              <button
                aria-label="Elemento anterior"
                className={styles.arrow}
                onClick={goToPreviousItem}
                type="button"
              >
                ‹
              </button>

              <div className={styles.storyCopy}>
                <span className={styles.storyMeta}>
                  {activeItem.category} · {activeItem.metric}
                </span>
                <h1>{activeItem.title}</h1>
                <p>{activeItem.description}</p>
                {activeItem.type === "story" ? (
                  <div className={styles.heroRating}>
                    <StarRating value={activeRating} icon="heart" />
                    <span>{activeItem.ratingCount || 0} reseñas</span>
                  </div>
                ) : (
                  <div className={styles.heroRating}>
                    <span>{activeItem.likesCount || 0} me gusta</span>
                    <span>{activeItem.commentsCount || 0} comentarios</span>
                  </div>
                )}

                <div className={styles.storyFooter}>
                  <div>
                    <strong>{activeItem.author}</strong>
                    <small>
                      {activeItem.type === "story"
                        ? "Historia destacada"
                        : "Ilustracion destacada"}
                    </small>
                  </div>
                  <button onClick={handleOpenActiveItem} type="button">
                    {activeItem.type === "story" ? "Leer ahora" : "Ver ahora"}
                  </button>
                </div>
              </div>

              <div className={styles.coverWrap}>
                <span
                  className={`${styles.coverTypeBadge} ${
                    activeItem.type === "story"
                      ? styles.coverTypeStory
                      : styles.coverTypeIllustration
                  }`}
                >
                  {activeItem.type === "story" ? "Historia" : "Ilustracion"}
                </span>
                <div className={styles.coverFrame}>
                  <img
                    className={`${styles.cover} ${
                      coverFitMode === "landscape"
                        ? styles.coverLandscape
                        : coverFitMode === "square"
                          ? styles.coverSquare
                          : styles.coverPortrait
                    }`}
                    src={activeItem.cover}
                    alt={activeItem.title}
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      const ratio = image.naturalWidth / Math.max(image.naturalHeight, 1);

                      if (ratio > 1.15) {
                        setCoverFitMode("landscape");
                        return;
                      }

                      if (ratio > 0.9) {
                        setCoverFitMode("square");
                        return;
                      }

                      setCoverFitMode("portrait");
                    }}
                  />
                </div>
              </div>

              <button
                aria-label="Siguiente elemento"
                className={styles.arrow}
                onClick={goToNextItem}
                type="button"
              >
                ›
              </button>
            </div>
          </>
        ) : (
          <>
            <h1>Historias e ilustraciones para descubrir a tu ritmo.</h1>
            <p>
              Una portada viva para descubrir ficcion serial, arte visual,
              guardar favoritas y volver cada noche a explorar.
            </p>
          </>
        )}

        {featuredItems.length > 1 ? (
          <div className={styles.controls}>
            {featuredItems.map((item, index) => (
              <button
                key={item.id}
                className={`${styles.dot} ${
                  index === activeIndex ? styles.dotActive : ""
                }`}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
