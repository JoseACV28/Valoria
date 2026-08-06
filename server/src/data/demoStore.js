// Base de datos en memoria de desarrollo.
// Mantiene historias, capitulos y reseñas cuando no hay Supabase configurado.
import { randomUUID } from "node:crypto";

export const demoStories = [
  {
    id: randomUUID(),
    title: "Luces sobre Valparaiso",
    slug: "luces-sobre-valparaiso",
    cover_url:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    author_name: "Camila Rojas",
    category: "Romance",
    reads_count: 1200000,
    description:
      "Una violinista callejera y un fotografo nocturno cruzan destinos en una ciudad que nunca deja de mirar al mar.",
    excerpt:
      "Una violinista callejera y un fotografo nocturno cruzan destinos en una ciudad que nunca deja de mirar al mar.",
    status: "published",
    is_featured: true,
    rating_average: 4.8,
    rating_count: 26,
    created_at: new Date().toISOString()
  },
  {
    id: randomUUID(),
    title: "La Biblioteca de la Niebla",
    slug: "la-biblioteca-de-la-niebla",
    cover_url:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80",
    author_name: "Mateo Ferrer",
    category: "Fantasia",
    reads_count: 870000,
    description:
      "Cada libro revela un recuerdo perdido, pero abrir el volumen equivocado puede borrar el tuyo.",
    excerpt:
      "Cada libro revela un recuerdo perdido, pero abrir el volumen equivocado puede borrar el tuyo.",
    status: "published",
    is_featured: true,
    rating_average: 4.6,
    rating_count: 18,
    created_at: new Date().toISOString()
  },
  {
    id: randomUUID(),
    title: "Codigo de Medianoche",
    slug: "codigo-de-medianoche",
    cover_url:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    author_name: "Valentina Mora",
    category: "Thriller",
    reads_count: 642000,
    description:
      "Una desarrolladora descubre una red de mensajes escondidos dentro de una app de lectura social.",
    excerpt:
      "Una desarrolladora descubre una red de mensajes escondidos dentro de una app de lectura social.",
    status: "published",
    is_featured: true,
    rating_average: 4.9,
    rating_count: 31,
    created_at: new Date().toISOString()
  }
];

export const demoChapters = [];
export const demoChapterImages = [];
export const demoStoryReviews = [];
export const demoReviewLikes = [];
export const demoWallPosts = [];
export const demoWallComments = [];
export const demoWallCommentLikes = [];
export const demoProfileFollows = [];
