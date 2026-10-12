import { ui } from "../../i18n/runtime.js";
// Bloque editorial rotativo del home.
// Mantiene una sola linea visual y alterna entre especiales de historias
// e ilustraciones para equilibrar ambas verticales.
import { useEffect, useMemo, useState } from "react";
import styles from "../../styles/PromoBanner.module.css";

export function PromoBanner({
  storyCategories = [],
  stories = [],
  illustrationCategories = [],
  illustrations = [],
  onOpenStory,
  onOpenIllustration
}) {
  const slides = useMemo(() => {
    const result = [];

    if (stories.length > 0) {
      result.push({
        id: "stories",
        kind: "story",
        headline: storyCategories.join(" · "),
        description: `Durante estas 24 horas, la vitrina destaca historias reales de ${storyCategories.join(
          " y "
        )} para empujar nuevos descubrimientos dentro de la comunidad.`,
        categories: storyCategories,
        items: stories
      });
    }

    if (illustrations.length > 0) {
      result.push({
        id: "illustrations",
        kind: "illustration",
        headline: illustrationCategories.join(" · "),
        description: `Durante estas 24 horas, la vitrina visual destaca ilustraciones de ${illustrationCategories.join(
          " y "
        )} para expandir el imaginario creativo de Valoria.`,
        categories: illustrationCategories,
        items: illustrations
      });
    }

    return result;
  }, [illustrationCategories, illustrations, stories, storyCategories]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 11000);

    return () => window.clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  const activeSlide = slides[activeIndex];

  if (!activeSlide) {
    return null;
  }

  return (
    <section className={styles.banner}>
      <div className={styles.copy}>
        <span>{ui("Especial Valoria")}</span>
        <strong className={styles.modeLabel}>
          {activeSlide.kind === "story" ? ui("Historias destacadas") : ui("Ilustraciones destacadas")}
        </strong>
        <h2>{activeSlide.headline}</h2>
        <p>{activeSlide.description}</p>
        <div className={styles.categoryRow}>
          {activeSlide.categories.map((category) => (
            <div
              key={`${activeSlide.id}-${category}`}
              className={`${styles.categoryPill} ${
                activeSlide.kind === "illustration" ? styles.categoryPillWarm : ""
              }`}
            >
              {ui(category)}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.stack}>
        {activeSlide.items.slice(0, 3).map((item, index) => (
          <button
            key={item.id || `${item.title}-${index}`}
            className={`${styles.storyCard} ${index === 0 ? styles.storyCardPrimary : ""}`}
            onClick={() => {
              if (activeSlide.kind === "illustration") {
                onOpenIllustration?.(item);
                return;
              }

              onOpenStory?.(item);
            }}
            type="button"
          >
            <img loading="lazy" decoding="async"
              src={activeSlide.kind === "illustration" ? item.coverUrl : item.cover}
              alt={item.title}
            />
            <div className={styles.storyOverlay}>
              <span
                className={`${styles.typePill} ${
                  activeSlide.kind === "illustration" ? styles.typePillWarm : ""
                }`}
              >
                {activeSlide.kind === "story" ? ui("Historia") : ui("Ilustracion")}
              </span>
              <strong>{item.title}</strong>
              <span>{item.author}</span>
            </div>
          </button>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className={styles.controls}>
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ""}`}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
