import { ui } from "../i18n/runtime.js";
// Centro de ayuda publico.
// Reune preguntas frecuentes simples para orientar a lectores y creadores.
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import styles from "../styles/DirectoryPage.module.css";

// FAQ editorial ficticia, pensada como base de una futura ayuda dinamica o conectada a CMS.
const faqs = [
  {
    question: "Como publico mi primera historia en Valoria?",
    answer: "Crea una cuenta, entra al Panel de creador y usa el boton Crear historia para abrir el formulario editorial."
  },
  {
    question: "Puedo dejar capitulos en borrador antes de publicarlos?",
    answer: "Si. Los capitulos pueden guardarse como borrador y publicarse despues desde la biblioteca del creador."
  },
  {
    question: "Las reseñas cambian segun el capitulo que estoy leyendo?",
    answer: "Si. Cada capitulo mantiene sus propias reseñas, respuestas y me gusta de forma independiente."
  },
  {
    question: "Como agrego ilustraciones a un capitulo?",
    answer: "Desde el formulario de capitulo puedes subir una imagen del creador y luego los lectores pueden sumar ilustraciones de comunidad."
  },
  {
    question: "Puedo editar mi perfil y mis imagenes?",
    answer: "Si. En Mi perfil puedes abrir Edita tu perfil para cambiar nombre visible, descripcion, avatar y portada."
  },
  {
    question: "Que pasa si sigo a un escritor?",
    answer: "Su perfil pasa a tu seccion Siguiendo y el contador de seguidores del creador se actualiza en su vista publica."
  },
  {
    question: "Necesito iniciar sesion para comentar o seguir?",
    answer: "Si. Sin sesion puedes explorar perfiles e historias, pero para interactuar debes ingresar a tu cuenta."
  },
  {
    question: "El modo libro y el modo tradicional guardan el mismo contenido?",
    answer: "Si. Son dos formatos de lectura distintos sobre el mismo capitulo publicado."
  },
  {
    question: "Como encuentro escritores dentro de la plataforma?",
    answer: "Usa el buscador superior y el filtro Escritores. También puedes abrir un perfil desde sus obras."
  },
  {
    question: "Valoria guarda mis lecturas y valoraciones?",
    answer: "Si. Las lecturas, reseñas, likes y seguimiento quedan ligados a la base conectada de la plataforma."
  }
];

export function HelpPage({ auth, navFilters, onNavigate }) {
  return (
    <AppShell auth={auth} currentView="help" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="help" {...navFilters} onNavigate={onNavigate} />

        <section className={styles.hero}>
          <span>{ui("Ayuda")}</span>
          <h1>{ui("Preguntas frecuentes")}</h1>
          <p>{ui("Una guia rapida para entender como publicar, leer e interactuar dentro de Valoria.")}</p>
        </section>

        <section className={styles.section}>
          <button type="button" onClick={()=>onNavigate('support')}>{ui('Centro de soporte')}</button>
          <button type="button" onClick={()=>onNavigate('usability')}>{ui('Prueba guiada del sitio')}</button>
          <div className={styles.faqList}>
            {faqs.map((faq) => (
              <article key={faq.question} className={styles.faqItem}>
                <h2>{ui(faq.question)}</h2>
                <p>{ui(faq.answer)}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
