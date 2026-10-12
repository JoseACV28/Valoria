import { ui } from "../../i18n/runtime.js";
import {useDialogFocus} from "../../hooks/useDialogFocus";
// Capa opcional de layout para escritorio.
// Si algun dia quieres volver al formato centrado anterior, basta con quitar
// este wrapper de las paginas principales sin reescribir su contenido interno.
import { useState,useRef } from "react";
import { NetworkStatus } from '../common/NetworkStatus';
import {QaNotice} from '../common/QaNotice';
import styles from "../../styles/AppShell.module.css";
import valoriaLogo from '../../assets/valoria-logo.webp';

const footerPrimaryLinks = [
  { label: "Series destacadas", action: (onNavigate) => onNavigate("home", { homeSection: "series-destacadas" }) },
  { label: "Idiomas", action: (onNavigate) => onNavigate("languages") },
  { label: "Escritores", action: (onNavigate) => onNavigate("writers") }
];

const footerSecondaryLinks = [
  ...[['Privacidad','privacy'],['Condiciones de uso','terms'],['Derechos de autor','copyright'],['Normas de comunidad','community']].map(([label,key])=>({label,action:()=>{window.location.hash=`/info/${key}`;}})),
  {label:'Centro de soporte',action:onNavigate=>onNavigate('support')},
  { label: "Ayuda", action: (onNavigate) => onNavigate("help") }
];

function buildActions({ onNavigate }) {
  return [
    { id: "home", label: "Inicio", icon: "⌂", onClick: () => onNavigate("home") },
    { id: "search", label: "Descubrir", icon: "◈", onClick: () => onNavigate("search") },
    { id: "illustrations", label: "Ilustraciones", icon: "▣", onClick: () => onNavigate("illustrations") },
    { id: "writers", label: "Escritores", icon: "☰", onClick: () => onNavigate("writers") },
    { id: "illustrators", label: "Ilustradores", icon: "◫", onClick: () => onNavigate("illustrators") },
    { id: "challenges", label: "Desafíos creativos", icon: "✦", onClick: () => onNavigate("challenges") },
    { id: "languages", label: "Idiomas de lectura", icon: "◎", onClick: () => onNavigate("languages") }
  ];
}

export function AppShell({ auth, currentView, onNavigate, children, className = '', homeBrand = true }) {
  const contentRef=useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef=useDialogFocus(mobileMenuOpen,()=>setMobileMenuOpen(false));
  const actions = buildActions({ auth, onNavigate });
  const brand = <a data-home-brand href="/#/" onClick={event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();setMobileMenuOpen(false);onNavigate('home');
  }}><img src={valoriaLogo} alt="" /><span>VALORIA</span></a>;

  function handleActionClick(action) {
    action.onClick();
    setMobileMenuOpen(false);
  }

  return (
    <div data-library-shell className={`${styles.shell} ${className}`}>
      <button type="button" className="skip-content" onClick={()=>{const main=contentRef.current?.querySelector('main');if(main){main.tabIndex=-1;main.focus();}}}>{ui('Saltar al contenido')}</button>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileBrand}>
          {homeBrand ? brand : <>
          <span>{ui("Valoria")}</span>
          <strong>{ui("Explora tu universo")}</strong>
          </>}
        </div>
        <button
          aria-expanded={mobileMenuOpen}
          className={styles.mobileMenuButton}
          onClick={() => setMobileMenuOpen((current) => !current)}
          type="button"
        >
          {mobileMenuOpen ? ui("Cerrar") : ui("Menu")}
        </button>
      </div>

      {mobileMenuOpen ? (
        <button
          aria-label={ui("Cerrar menu")}
          className={styles.mobileBackdrop}
          onClick={() => setMobileMenuOpen(false)}
          type="button"
        />
      ) : null}

      <aside ref={menuRef}
        className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarMobileOpen : ""}`}
      >
        <div className={styles.sidebarScroll}>
        <div className={styles.sidebarBrand}>
          {homeBrand ? brand : <>
          <span>{ui("Valoria")}</span>
          <strong>{ui("Explora tu universo")}</strong>
          </>}
        </div>

        <nav className={styles.nav} aria-label={ui("Explorar obras")}>
          {actions.map((action) => {
            const isActive = action.id === currentView ||
              (action.id === "illustrations" && currentView === "illustration-detail");

            return (
              <button key={action.id} aria-current={isActive ? 'page' : undefined}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                onClick={() => handleActionClick(action)} type="button">
                <span className={styles.navIcon} aria-hidden="true">{action.icon}</span>
                <span>{ui(action.label)}</span>
              </button>
            );
          })}
        </nav>
        </div>
      </aside>

      <div ref={contentRef} className={styles.content}>
        <QaNotice/><NetworkStatus />
        {children}
        <footer className={styles.footer}>
          <div className={styles.footerRow}>
            {footerPrimaryLinks.map((item) => (
              <button key={item.label} onClick={() => item.action(onNavigate)} type="button">
                {ui(item.label)}
              </button>
            ))}
            {footerSecondaryLinks.map((item) => (
              <button key={item.label} onClick={() => item.action(onNavigate)} type="button">
                {ui(item.label)}
              </button>
            ))}
            <span>{ui("© 2026 Valoria")}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

