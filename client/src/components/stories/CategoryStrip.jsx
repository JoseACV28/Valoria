// Componente heredado para mostrar categorias en formato banda.
// Hoy no es central en el home, pero queda disponible para futuras variantes.
import styles from "../../styles/CategoryStrip.module.css";

const categories = [
  "Romance",
  "Fantasia",
  "Misterio",
  "Juvenil",
  "Fanfiction",
  "Thriller",
  "Drama",
  "Ciencia ficcion"
];

export function CategoryStrip() {
  return (
    <section id="descubrir" className={styles.section}>
      <div className={styles.header}>
        <span>Categorias</span>
        <h2>Descubre por genero</h2>
      </div>

      <div className={styles.list}>
        {categories.map((category) => (
          <button key={category}>{category}</button>
        ))}
      </div>
    </section>
  );
}
