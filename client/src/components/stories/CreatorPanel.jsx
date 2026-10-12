import { ui } from "../../i18n/runtime.js";
// Bloque explicativo del area de creadores.
// Resume beneficios del flujo editorial dentro del producto.
import styles from "../../styles/CreatorPanel.module.css";

export function CreatorPanel() {
  return (
    <section id="creadores" className={styles.panel}>
      <div>
        <span>{ui("Para creadores")}</span>
        <h2>{ui("Un flujo listo para publicar series, medir lecturas y construir audiencias.")}</h2>
      </div>

      <div className={styles.features}>
        <article>
          <strong>{ui("Capitulos serializados")}</strong>
          <p>{ui("Ideal para enganchar lectores con entregas semanales.")}</p>
        </article>
        <article>
          <strong>{ui("Metricas visibles")}</strong>
          <p>{ui("Lecturas, votos y comentarios listos para convertir en prueba social.")}</p>
        </article>
        <article>
          <strong>{ui("Diseño editorial")}</strong>
          <p>{ui("Una homepage moderna con enfoque en descubrimiento y conversion.")}</p>
        </article>
      </div>
    </section>
  );
}
