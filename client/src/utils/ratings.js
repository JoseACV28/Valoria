// Utilidades de presentacion para valoraciones.
// Convierte notas de 0 a 5 en porcentajes legibles para la UI.
export function clampRating(value = 0) {
  // Asegura que cualquier nota renderizada se mantenga en el rango visual esperado.
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(5, numeric));
}

export function ratingToPercent(value = 0) {
  // Traduce una nota estandar de 5 puntos al porcentaje usado por algunos indicadores.
  return Math.round((clampRating(value) / 5) * 100);
}
