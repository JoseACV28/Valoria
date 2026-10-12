import { ui } from "../../i18n/runtime.js";
// Render simple de iconos de valoracion reutilizable en home, carrusel y lectura.
import styles from "../../styles/StarRating.module.css";

export function StarRating({ value = 0, size = "md", icon = "star" }) {
  const rounded = Math.round(value);
  const glyph = icon === "heart" ? "♥" : "★";

  return (
    <div className={`${styles.stars} ${styles[size]}`} aria-label={ui("{0} de 5",[value])}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`${star <= rounded ? styles.filled : styles.empty} ${
            icon === "heart" ? styles.heart : ""
          }`}
        >
          {glyph}
        </span>
      ))}
    </div>
  );
}
