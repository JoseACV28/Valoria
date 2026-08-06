// Barra superior comun de la app.
// Contiene logo, categorias, buscador y el menu de usuario autenticado.
import { useEffect, useState } from "react";
import valoriaLogo from "../../assets/valoria-logo.png";
import { ALL_CATEGORIES } from "../../data/categories";
import styles from "../../styles/Navbar.module.css";

export function Navbar({
  auth,
  currentView,
  onNavigate,
  notifications = [],
  unreadNotifications = 0,
  onOpenNotification,
  onMarkAllNotificationsRead,
  categoryOptions = ALL_CATEGORIES,
  selectedCategory = "",
  onSelectCategory,
  storySearchQuery = "",
  onStorySearchChange,
  writerSearchQuery = "",
  onWriterSearchChange
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    function closeMenus() {
      setCategoriesOpen(false);
      setMenuOpen(false);
      setNotificationsOpen(false);
    }

    window.addEventListener("click", closeMenus);
    window.addEventListener("scroll", closeMenus);

    return () => {
      window.removeEventListener("click", closeMenus);
      window.removeEventListener("scroll", closeMenus);
    };
  }, []);

  function formatNotificationDate(value) {
    if (!value) {
      return "Ahora";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Ahora";
    }

    return date.toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short"
    });
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.brand}>
        <a
          className={styles.logo}
          href="#/"
          onClick={() => onNavigate("home")}
        >
          <img src={valoriaLogo} alt="Valoria" />
        </a>
      </div>

      <nav className={styles.links}>
        <div className={styles.categoriesMenu}>
          <button
            className={styles.linkButton}
            onClick={(event) => {
              event.stopPropagation();
              setCategoriesOpen((current) => !current);
            }}
            type="button"
          >
            Categorias
          </button>

          {categoriesOpen ? (
            <div className={styles.categoriesDropdown}>
              <button
                className={!selectedCategory ? styles.categoryActive : ""}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectCategory?.("");
                  setCategoriesOpen(false);
                }}
                type="button"
              >
                Todas
              </button>
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  className={selectedCategory === category ? styles.categoryActive : ""}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectCategory?.(category);
                    setCategoriesOpen(false);
                  }}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </nav>

      <div className={styles.searchWrap}>
        {typeof onStorySearchChange === "function" ? (
          <>
            <input
              className={styles.search}
              onChange={(event) => onStorySearchChange(event.target.value)}
              placeholder="Buscar historia o etiqueta"
              type="text"
              value={storySearchQuery}
            />
            <input
              className={styles.search}
              onChange={(event) => onWriterSearchChange?.(event.target.value)}
              placeholder="Filtrar por escritor"
              type="text"
              value={writerSearchQuery}
            />
          </>
        ) : (
          <input className={styles.search} placeholder="Buscar" type="text" />
        )}
      </div>

      {auth?.isAuthenticated ? (
        <div className={styles.session}>
          <div className={styles.notificationWrap}>
            <button
              className={styles.notificationButton}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                setNotificationsOpen((current) => !current);
              }}
              type="button"
            >
              <span className={styles.notificationIcon}>🔔</span>
              {unreadNotifications > 0 ? (
                <span className={styles.notificationBadge}>{unreadNotifications}</span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div
                className={styles.notificationDropdown}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.notificationHeader}>
                  <strong>Notificaciones</strong>
                  {unreadNotifications > 0 ? (
                    <button onClick={() => onMarkAllNotificationsRead?.()} type="button">
                      Marcar todo
                    </button>
                  ) : null}
                </div>

                {notifications.length > 0 ? (
                  <div className={styles.notificationList}>
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        className={`${styles.notificationItem} ${
                          !notification.isRead ? styles.notificationUnread : ""
                        }`}
                        onClick={() => {
                          onOpenNotification?.(notification);
                          setNotificationsOpen(false);
                        }}
                        type="button"
                      >
                        <div className={styles.notificationAvatar}>
                          {notification.actorAvatarUrl ? (
                            <img
                              alt={notification.actorName}
                              src={notification.actorAvatarUrl}
                            />
                          ) : (
                            notification.actorName?.slice(0, 1).toUpperCase() || "V"
                          )}
                        </div>
                        <div className={styles.notificationBody}>
                          <strong>{notification.title}</strong>
                          {notification.body ? <span>{notification.body}</span> : null}
                          <small>{formatNotificationDate(notification.createdAt)}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.notificationEmpty}>
                    <p>Aun no tienes interacciones nuevas.</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <button
            className={styles.userButton}
            onClick={(event) => {
              event.stopPropagation();
              setNotificationsOpen(false);
              setMenuOpen((current) => !current);
            }}
            type="button"
          >
            <span className={styles.userBadge}>
              {auth.user?.avatarUrl ? (
                <img src={auth.user.avatarUrl} alt={auth.user?.displayName || "Usuario"} />
              ) : (
                auth.user?.displayName?.slice(0, 1) || "U"
              )}
            </span>
            <span>{auth.user?.displayName}</span>
          </button>

          {menuOpen ? (
            <div
              className={styles.dropdown}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                disabled={currentView === "profile"}
                onClick={() => {
                  onNavigate("profile");
                  setMenuOpen(false);
                }}
                type="button"
              >
                Mi perfil
              </button>
              <button
                disabled={currentView === "creator"}
                onClick={() => {
                  onNavigate("creator");
                  setMenuOpen(false);
                }}
                type="button"
              >
                Pantalla de creador
              </button>
              <button
                disabled={currentView === "languages"}
                onClick={() => {
                  onNavigate("languages");
                  setMenuOpen(false);
                }}
                type="button"
              >
                Idiomas
              </button>
              <button
                disabled={currentView === "help"}
                onClick={() => {
                  onNavigate("help");
                  setMenuOpen(false);
                }}
                type="button"
              >
                Ayuda
              </button>
              <button
                onClick={() => {
                  auth.logout();
                  onNavigate("home");
                  setMenuOpen(false);
                }}
                type="button"
              >
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.guestActions}>
          <button
            className={styles.ghostCta}
            onClick={() => onNavigate("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={styles.cta}
            onClick={() => onNavigate("register")}
            type="button"
          >
            Registro
          </button>
        </div>
      )}
    </header>
  );
}
