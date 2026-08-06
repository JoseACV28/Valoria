// Grilla editorial heredada de una version anterior del home.
// Se conserva por si se quiere reutilizar en otras pantallas.
import styles from "../../styles/StoryGrid.module.css";

export function StoryGrid({ stories }) {
  return (
    <section id="tendencias" className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span>Tendencias</span>
          <h2>Historias destacadas</h2>
        </div>
        <p>Una vitrina editorial con enfoque mobile-first y lectura por capitulos.</p>
      </div>

      <div className={styles.grid}>
        {stories.map((story) => (
          <article key={story.id} className={styles.card}>
            <img src={story.cover} alt={story.title} />
            <div className={styles.content}>
              <div className={styles.meta}>
                <span>{story.category}</span>
                <span>{story.reads} lecturas</span>
              </div>
              <h3>{story.title}</h3>
              <p>{story.description}</p>
              <footer>
                <strong>{story.author}</strong>
                <button>Leer ahora</button>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
