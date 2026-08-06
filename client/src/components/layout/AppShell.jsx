// Capa opcional de layout para escritorio.
// Si algun dia quieres volver al formato centrado anterior, basta con quitar
// este wrapper de las paginas principales sin reescribir su contenido interno.
import { useState } from "react";
import styles from "../../styles/AppShell.module.css";

const footerPrimaryLinks = [
  { label: "Series destacadas", action: (onNavigate) => onNavigate("home", { homeSection: "series-destacadas" }) },
  { label: "Idiomas", action: (onNavigate) => onNavigate("languages") },
  { label: "Escritores", action: (onNavigate) => onNavigate("writers") }
];

const footerSecondaryLinks = [
  { label: "Ayuda", action: (onNavigate) => onNavigate("help") }
];

function buildActions({ auth, onNavigate }) {
  const guestTarget = () => onNavigate("login", { homeSection: "auth" });
  const resolveGuestAction = (authenticatedAction) =>
    auth?.isAuthenticated ? authenticatedAction : guestTarget;

  return [
    {
      id: "home",
      label: "Inicio",
      icon: "⌂",
      onClick: () => onNavigate("home")
    },
    {
      id: "discover",
      label: "Descubrir",
      icon: "◈",
      onClick: () => onNavigate("home", { homeSection: "explorar" })
    },
    {
      id: "illustrations",
      label: "Ilustraciones",
      icon: "▣",
      onClick: () => onNavigate("illustrations")
    },
    {
      id: "community",
      label: "Comunidad",
      icon: "◎",
      onClick: () => onNavigate("home", { homeSection: "comunidad" })
    },
    {
      id: "profile",
      label: "Mi perfil",
      icon: "◌",
      onClick: resolveGuestAction(() => onNavigate("profile"))
    },
    {
      id: "wall",
      label: "Muro",
      icon: "✦",
      onClick: resolveGuestAction(() =>
        onNavigate("profile", { profileTab: "wall" })
      )
    },
    {
      id: "following",
      label: "Siguiendo",
      icon: "↗",
      onClick: resolveGuestAction(() =>
        onNavigate("profile", { profileTab: "following" })
      )
    },
    {
      id: "creator",
      label: "Panel de creador",
      icon: "✎",
      onClick: resolveGuestAction(() => onNavigate("creator"))
    },
    {
      id: "writers",
      label: "Escritores",
      icon: "☰",
      onClick: () => onNavigate("writers")
    },
    {
      id: "illustrators",
      label: "Ilustradores",
      icon: "◫",
      onClick: () => onNavigate("illustrators")
    }
  ];
}

export function AppShell({ auth, currentView, onNavigate, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const actions = buildActions({ auth, onNavigate });

  function handleActionClick(action) {
    action.onClick();
    setMobileMenuOpen(false);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileBrand}>
          <span>Valoria</span>
          <strong>Explora tu universo</strong>
        </div>
        <button
          aria-expanded={mobileMenuOpen}
          className={styles.mobileMenuButton}
          onClick={() => setMobileMenuOpen((current) => !current)}
          type="button"
        >
          {mobileMenuOpen ? "Cerrar" : "Menu"}
        </button>
      </div>

      {mobileMenuOpen ? (
        <button
          aria-label="Cerrar menu"
          className={styles.mobileBackdrop}
          onClick={() => setMobileMenuOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarMobileOpen : ""}`}
      >
        <div className={styles.sidebarBrand}>
          <span>Valoria</span>
          <strong>Explora tu universo</strong>
        </div>

        <nav className={styles.nav}>
          {actions.map((action) => {
            const isActive =
              (action.id === "home" && currentView === "home") ||
              (action.id === "illustrations" &&
                (currentView === "illustrations" ||
                  currentView === "illustration-detail")) ||
              (action.id === "profile" && currentView === "profile") ||
              (action.id === "creator" && currentView === "creator") ||
              (action.id === "writers" && currentView === "writers") ||
              (action.id === "illustrators" && currentView === "illustrators");

            return (
              <button
                key={action.id}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                onClick={() => handleActionClick(action)}
                type="button"
              >
                <span className={styles.navIcon}>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            );
          })}
        </nav>

      </aside>

      <div className={styles.content}>
        {children}

        <footer className={styles.footer}>
          <div className={styles.footerRow}>
            {footerPrimaryLinks.map((item) => (
              <button key={item.label} onClick={() => item.action(onNavigate)} type="button">
                {item.label}
              </button>
            ))}
            {footerSecondaryLinks.map((item) => (
              <button key={item.label} onClick={() => item.action(onNavigate)} type="button">
                {item.label}
              </button>
            ))}
            <span>© 2026 Valoria</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
