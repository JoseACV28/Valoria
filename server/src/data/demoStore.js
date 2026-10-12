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

// Texto de muestra local: permite probar lectura y avance sin configurar Supabase.
const sampleChapters = [
  [
    { title: "La ultima nota", content: "El viento del puerto se llevo la ultima nota antes de que Emilia pudiera guardarla. Cerro el estuche del violin y conto las monedas bajo la luz de un farol.\nAl otro lado de la calle, Tomas bajo su camara. Habia fotografiado el mismo cerro durante semanas, pero esa noche la musica le habia cambiado el encuadre.\n—Te falta una cuerda —dijo, señalando el instrumento.\nEmilia sonrio. —Y aun asi te quedaste hasta el final." },
    { title: "Una ciudad en papel", content: "La fotografia aparecio entre las partituras a la mañana siguiente. No tenia firma: solo una direccion en el reverso y una mancha de cafe.\nEmilia reconocio el mirador. Subio los escalones con el violin a la espalda, contando cada descanso como si fuera un compas.\nTomas la esperaba junto a una caja de fotografias. En ninguna salia el mar. Todas mostraban ventanas, manos y rostros que ella habia visto desde su esquina.\n—Queria enseñarte la ciudad que escucha —dijo." }
  ],
  [
    { title: "El libro sin nombre", content: "La biblioteca no figuraba en el mapa. Ines la encontro siguiendo las huellas de agua que alguien habia dejado en un callejon seco.\nDentro, los libros respiraban al mismo tiempo. El bibliotecario le ofrecio un volumen sin titulo y le pidio que no abriera la ultima pagina.\nLa primera frase tenia su letra. La segunda contaba un recuerdo que nunca habia vivido.\nInes miro la puerta. La niebla habia ocupado el lugar de la calle." },
    { title: "Lo que cuesta recordar", content: "Cada estante llevaba el nombre de una persona. Ines encontro el de su madre al fondo, donde la luz llegaba con retraso.\nHabia un solo libro, pequeño y azul. Cuando lo abrio, recordo una cancion, pero olvido el nombre de la plaza donde habia aprendido a andar en bicicleta.\nEl bibliotecario apoyo un reloj sobre la mesa. No tenia agujas.\n—Aqui nada se pierde —dijo—. Pero todo cambia de dueño." }
  ],
  [
    { title: "Una linea fuera de lugar", content: "A las doce, el servidor envio un mensaje que nadie habia programado. Vera lo encontro entre dos registros de lectura: una frase breve y una hora que aun no habia llegado.\nPenso que era una prueba olvidada. Busco al autor del cambio y encontro su propio nombre, con una fecha de tres años antes de entrar a la empresa.\nEn la pantalla aparecio una segunda linea. Esta vez mencionaba la ventana de su oficina.\nVera cerro las cortinas sin levantarse de la silla." },
    { title: "El lector invisible", content: "El mensaje cambiaba cada vez que alguien terminaba un capitulo. Vera abrio una historia desde una cuenta nueva y siguio los eventos de la red.\nNo habia ninguna solicitud extra. Las palabras viajaban en el espacio que dejaban los lectores al cerrar una pagina.\nA las doce y cinco, descubrio que todos los mensajes señalaban un mismo perfil. La cuenta no tenia historias, seguidores ni fecha de registro.\nSolo una descripcion: Estoy leyendo contigo." }
  ]
];

export const demoChapters = demoStories.flatMap((story, storyIndex) =>
  sampleChapters[storyIndex].map((chapter, chapterIndex) => ({
    id: randomUUID(),
    story_id: story.id,
    title: chapter.title,
    slug: `capitulo-${chapterIndex + 1}`,
    chapter_number: chapterIndex + 1,
    content: chapter.content,
    excerpt: chapter.content.split("\n")[0],
    status: "published",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }))
);
export const demoChapterImages = [];
export const demoStoryReviews = [];
export const demoReviewLikes = [];
export const demoWallPosts = [];
export const demoWallComments = [];
export const demoWallCommentLikes = [];
export const demoProfileFollows = [];
