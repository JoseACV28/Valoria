import { LanguageSwitcher } from './LanguageSwitcher';
import {ThemeSwitcher} from './ThemeSwitcher';
import { ui, getLocale } from "../../i18n/runtime.js";
// Barra superior comun de la app.
// Contiene logo, buscador y el menu de usuario autenticado.
import { useEffect, useState, useRef } from "react";
import valoriaLogo from "../../assets/valoria-logo.webp";
import { userNavigationGroups } from '../../data/navigation';
import { usePopoverSpace } from '../../hooks/usePopoverSpace';
import styles from "../../styles/Navbar.module.css";

export function Navbar({
  variant = 'editorial',
  auth,
  currentView,
  onNavigate,
  notifications = [],
  unreadNotifications = 0,
  onOpenNotification,
  onMarkAllNotificationsRead,
  searchQuery = "",
  searchScope = "all",
  onSearchChange,
  onSearchSubmit
}) {
  const userMenuButtonRef = useRef(null);
  const profileGroups = userNavigationGroups(auth.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [userDropdownRef,menuAvailableHeight] = usePopoverSpace(menuOpen,84);
  const [notificationsRef,notificationsHeight] = usePopoverSpace(notificationsOpen);

  const [suggestions,setSuggestions]=useState([]);
  useEffect(()=>{
    let active=true;const controller=new AbortController();
    if(searchQuery.trim().length<2){setSuggestions([]);return;}
    const timer=setTimeout(()=>{
      fetch(`${import.meta.env.VITE_API_URL||'http://localhost:4000/api'}/search?suggest=true&q=${encodeURIComponent(searchQuery)}`,{signal:controller.signal,headers:auth.token?{Authorization:`Bearer ${auth.token}`}:{}}).then(response=>response.ok?response.json():null).then(data=>{if(active&&data)setSuggestions(data.suggestions||[]);}).catch(()=>{});
    },300);
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[searchQuery,auth.token]);

  useEffect(() => {
    function closeMenus() {
      setMenuOpen(false);
      setNotificationsOpen(false);
    }

    window.addEventListener("click", closeMenus);
    function escapeMenus(event){if(event.key==='Escape'){const userMenu=document.getElementById('valoria-user-navigation');if(userMenu)userMenuButtonRef.current?.focus();closeMenus();}}
    window.addEventListener('keydown',escapeMenus);

    return () => {
      window.removeEventListener("click", closeMenus);
      window.removeEventListener('keydown',escapeMenus);
    };
  }, []);

  function formatNotificationDate(value) {
    if (!value) {
      return ui("Ahora");
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return ui("Ahora");
    }

    return date.toLocaleString(getLocale(), {
      dateStyle: "short",
      timeStyle: "short"
    });
  }

  return (
    <header className={`${styles.navbar} ${variant === 'editorial' ? styles.editorial : ''}`}>
      <div className={styles.brand}>
        <a
          className={styles.logo}
          href="/#/"
          onClick={(event) => {
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onNavigate("home");
          }}
        >
          <img src={valoriaLogo} alt={ui("Valoria")} />
        </a>
      </div>


      <form className={styles.searchWrap} role="search" onSubmit={(event) => {
        event.preventDefault();
        onSearchSubmit?.(searchQuery, currentView === "writers" ? "writers" : currentView === "illustrators" ? "illustrators" : currentView === "search" ? searchScope : "all");
      }}>
        <datalist id="valoria-search-suggestions">{suggestions.map(value=><option key={value} value={value}/>)}</datalist>
        <input list="valoria-search-suggestions" className={styles.search} aria-label={ui("Buscar en Valoria")} placeholder={ui("Buscar en Valoria")} type="search" value={searchQuery} onChange={(event) => onSearchChange?.(event.target.value)} />
        <button className={styles.searchSubmit} type="submit" aria-label={ui("Buscar")}><span className={styles.searchLabel}>{ui("Buscar")}</span><svg className={styles.searchIcon} aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button>
      </form>

      {auth?.isAuthenticated ? (
        <div className={styles.session}>
          <ThemeSwitcher/>
          <LanguageSwitcher onOpen={()=>{setMenuOpen(false);setNotificationsOpen(false);}}/>
          <div className={styles.notificationWrap}>
            <button
              className={styles.notificationButton}
              aria-label={ui('Notificaciones')}
              aria-expanded={notificationsOpen}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                setNotificationsOpen((current) => !current);
              }}
              type="button"
            >
              <span className={styles.notificationIcon} aria-hidden="true">🔔</span>
              {unreadNotifications > 0 ? (
                <span className={styles.notificationBadge}>{unreadNotifications}</span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div
                className={styles.notificationDropdown}
                ref={notificationsRef}
                style={{maxHeight:notificationsHeight}}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.notificationHeader}>
                  <strong>{ui("Notificaciones")}</strong>
                  {unreadNotifications > 0 ? (
                    <button onClick={() => onMarkAllNotificationsRead?.()} type="button">{ui(" Marcar todo ")}</button>
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
                            notification.actorName?.slice(0, 1).toUpperCase() || ui("V")
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
                    <p>{ui("Aun no tienes interacciones nuevas.")}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <button
            className={styles.userButton}
            ref={userMenuButtonRef}
            aria-label={ui("Menú de usuario")}
            aria-controls="valoria-user-navigation"
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation();
              setNotificationsOpen(false);
              setMenuOpen((current) => !current);
            }}
            type="button"
          >
            <span className={styles.userBadge}>
              {auth.user?.avatarUrl ? (
                <img src={auth.user.avatarUrl} alt={auth.user?.displayName || ui("Usuario")} />
              ) : (
                auth.user?.displayName?.slice(0, 1) || ui("U")
              )}
            </span>
            <span>{auth.user?.displayName}</span>
          </button>

          {menuOpen ? (
            <div
              className={styles.dropdown}
              ref={userDropdownRef}
              style={{ '--user-menu-height': `${menuAvailableHeight}px` }}
              onClick={(event) => event.stopPropagation()}
            >
              <nav id="valoria-user-navigation" className={styles.dropdownScroll} aria-label={ui("Menú de usuario")}>
                {profileGroups.map(group => (
                  <section className={styles.dropdownGroup} key={group.label} aria-label={ui(group.label)}>
                    <p className={styles.dropdownHeading}>{ui(group.label)}</p>
                    {group.items.map(item => (
                      <button key={item.id} type="button"
                        aria-current={!item.options && currentView === item.view ? 'page' : undefined}
                        onClick={() => { onNavigate(item.view, item.options); setMenuOpen(false); }}>
                        <span className={styles.dropdownIcon} aria-hidden="true">{item.icon}</span>
                        <span>{ui(item.label)}</span>
                      </button>
                    ))}
                  </section>
                ))}
              </nav>
              <button
                className={styles.logoutButton}
                disabled={logoutBusy}
                onClick={async () => {
                  setLogoutBusy(true); setLogoutError('');
                  try {
                    await auth.logout();
                    onNavigate("home"); setMenuOpen(false);
                  } catch (error) { setLogoutError(error.message); }
                  finally { setLogoutBusy(false); }
                }}
                type="button"
              >
                {logoutBusy ? ui("Cerrando sesión…") : ui("Cerrar sesion")}
              </button>
              {logoutError && <p role="alert">{ui(logoutError)}</p>}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.guestActions}>
          <ThemeSwitcher/>
          <LanguageSwitcher onOpen={()=>{setMenuOpen(false);setNotificationsOpen(false);}}/>
          <button
            className={styles.ghostCta}
            onClick={() => onNavigate("login")}
            type="button"
          >{ui(" Login ")}</button>
          <button
            className={styles.cta}
            onClick={() => onNavigate("register")}
            type="button"
          >{ui(" Registro ")}</button>
        </div>
      )}
    </header>
  );
}

