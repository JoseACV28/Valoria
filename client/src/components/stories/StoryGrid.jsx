import { ui } from "../../i18n/runtime.js";
// Grilla editorial heredada de una version anterior del home.
// Se conserva por si se quiere reutilizar en otras pantallas.
import styles from "../../styles/StoryGrid.module.css";

export function StoryGrid({ stories }) {
  return (
    <section id="tendencias" className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span>{ui("Tendencias")}</span>
          <h2>{ui("Historias destacadas")}</h2>
        </div>
        <p>{ui("Una vitrina editorial con enfoque mobile-first y lectura por capitulos.")}</p>
      </div>

      <div className={styles.grid}>
        {stories.map((story) => (
          <article key={story.id} className={styles.card}>
            <img loading="lazy" decoding="async" src={story.cover || "/default-cover.svg"} onError={(event) => { if (!event.currentTarget.src.endsWith("/default-cover.svg")) event.currentTarget.src = "/default-cover.svg"; }} alt={story.title} />
            <div className={styles.content}>
              <div className={styles.meta}>
                <span>{ui(story.category)}</span>
                <span>{story.reads}{ui(" lecturas")}</span>
              </div>
              <h3>{story.title}</h3>
              <p>{story.description}</p>
              <footer>
                <strong>{story.author}</strong>
                <button>{ui("Leer ahora")}</button>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
