// Bloque explicativo del area de creadores.
// Resume beneficios del flujo editorial dentro del producto.
import styles from "../../styles/CreatorPanel.module.css";

export function CreatorPanel() {
  return (
    <section id="creadores" className={styles.panel}>
      <div>
        <span>Para creadores</span>
        <h2>Un flujo listo para publicar series, medir lecturas y construir audiencias.</h2>
      </div>

      <div className={styles.features}>
        <article>
          <strong>Capitulos serializados</strong>
          <p>Ideal para enganchar lectores con entregas semanales.</p>
        </article>
        <article>
          <strong>Metricas visibles</strong>
          <p>Lecturas, votos y comentarios listos para convertir en prueba social.</p>
        </article>
        <article>
          <strong>Diseño editorial</strong>
          <p>Una homepage moderna con enfoque en descubrimiento y conversion.</p>
        </article>
      </div>
    </section>
  );
}
