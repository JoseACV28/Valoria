// Catalogo editorial unificado para historias.
// Se reutiliza en home, filtros y formularios del panel de creador.
export const ALL_CATEGORIES = [
  "Romance",
  "Fantasia",
  "Humor",
  "Ciencia ficcion",
  "Fanfiction",
  "Relato corto",
  "Paranormal",
  "Terror",
  "Misterio",
  "LGBTQ+",
  "Ficcion juvenil",
  "Thriller",
  "Aventura",
  "Historia real"
];

export const categoryLabel = value => ({Fantasia:'Fantasía', 'Ciencia ficcion':'Ciencia ficción', 'Ficcion juvenil':'Ficción juvenil'}[value] || value);
