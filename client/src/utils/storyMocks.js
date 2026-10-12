// Utilidades de respaldo para la experiencia de lectura.
// Generan capitulos y reseñas ficticias cuando una historia aun no existe en backend.
export function buildFallbackChapters(story) {
  // Crea capitulos demo para que la vista de lectura no quede vacia en historias preliminares.
  const title = story?.title || "Historia";

  return [
    {
      id: `${story?.id || "story"}-ch1`,
      chapter_number: 1,
      title: "Primer umbral",
      excerpt: `El comienzo de ${title}, donde todo cambia sin aviso.`,
      content: `La noche en que comenzo ${title}, nadie imagino lo que vendria despues. Las calles parecian normales, los pasos seguian el ritmo de siempre, pero algo en el aire anunciaba una grieta invisible. Esta es una lectura de muestra para que Valoria ya tenga su propia hoja de lectura y puedas ver como se acomoda una historia dentro del proyecto.`
    },
    {
      id: `${story?.id || "story"}-ch2`,
      chapter_number: 2,
      title: "Lo que no se dijo",
      excerpt: "Los silencios tambien mueven la trama.",
      content: `Cada personaje arrastra una version incompleta de los hechos. En este segundo capitulo ficticio, el conflicto se vuelve mas claro y la historia toma forma con una lectura pensada para pruebas visuales. Cuando tengas capitulos reales en la base, esta hoja mostrara ese contenido automaticamente.`
    }
  ];
}

export function normalizeStoryForReading(story) {
  // Normaliza una historia de cualquier origen para que la hoja de lectura reciba un formato estable.
  return {
    ...story,
    category: story.category || "Ficcion",
    reads: story.reads || "0",
    ratingAverage: Number(story.ratingAverage ?? story.rating_average ?? 0),
    ratingCount: Number(story.ratingCount ?? story.rating_count ?? 0),
    description:
      story.description ||
      "Una historia de muestra dentro de Valoria, lista para abrirse en la hoja de lectura."
  };
}

export function isPersistedStory(story) {
  // Distingue historias reales de base de datos frente a registros temporales o mocks.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    story?.id || ""
  );
}

export function buildFallbackReviews(story) {
  // Genera reseñas de ejemplo cuando una historia aun no acumula interacciones reales.
  return [
    {
      id: `${story?.id || "story"}-review-1`,
      reviewerName: "Lectora Lunar",
      rating: 5,
      review_text: "Me engancho desde la primera escena. Tiene muy buen ritmo."
    },
    {
      id: `${story?.id || "story"}-review-2`,
      reviewerName: "Marco V.",
      rating: 4,
      review_text: "Me gusto el tono y la portada. Quede con ganas de seguir leyendo."
    }
  ];
}
