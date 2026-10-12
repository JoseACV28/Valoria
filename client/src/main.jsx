import {ActivityState} from './components/common/ActivityState';
import { ui } from "./i18n/runtime.js";
// Entrada del cliente React.
// Monta la aplicacion completa dentro del contenedor #root.
import React from "react";
import ReactDOM from "react-dom/client";
import { LocaleRoot } from "./i18n/LocaleRoot";
import { getLocale, initializeLocale } from "./i18n/runtime";
document.documentElement.lang=getLocale();
import {applyTheme,readTheme} from './utils/theme';
applyTheme(readTheme());
try{const value=JSON.parse(localStorage.getItem('valoria-accessibility')||'{}');document.documentElement.dataset.contrast=value.contrast?'high':'normal';document.documentElement.dataset.motion=value.motion?'reduced':'system';}catch{}
import "./styles/global.css";
import "./styles/DesignSystem.css"; // Desactivar esta línea para retirar los tokens nuevos; copia completa en docs/design-backups.
import { PageErrorBoundary } from './components/common/PageErrorBoundary';

import { prepareOfflineShell } from './utils/offlineSupport';
prepareOfflineShell(import.meta.env.PROD);

const root=import.meta.hot?.data.root||ReactDOM.createRoot(document.getElementById("root"));
if(import.meta.hot)import.meta.hot.data.root=root;
initializeLocale().then(()=>root.render(
  <React.StrictMode>
    <PageErrorBoundary>
    <React.Suspense fallback={<main className="route-loading"><ActivityState kind="loading" title="Cargando Valoria..."/></main>}>
      <LocaleRoot />
    </React.Suspense>
    </PageErrorBoundary>
  </React.StrictMode>
));

