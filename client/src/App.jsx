import {ActivityState} from './components/common/ActivityState';
import { ui } from "./i18n/runtime.js";
import { canonicalHashUrl } from './utils/navigationUrl';
// Punto de orquestacion principal del cliente.
// Mantiene la navegacion por hash para que el refresh preserve la vista actual.
import { lazy, useEffect, useState } from "react";
import { fetchIllustration } from "./api/illustrationApi";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "./api/notificationApi";
import { fetchStory } from "./api/storyApi";

import { useAuth } from "./hooks/useAuth";
import { HomePage } from "./pages/HomePage";

const UsabilityPage=lazy(()=>import('./pages/UsabilityPage').then(x=>({default:x.UsabilityPage})));
const ChallengesPage=lazy(()=>import('./pages/ChallengesPage').then(x=>({default:x.ChallengesPage})));
const CollaborationPage = lazy(() => import("./pages/CollaborationPage").then(page => ({default:page.CollaborationPage})));
const AccountPage=lazy(()=>import('./pages/AccountPage').then(page=>({default:page.AccountPage})));
const InformationPage=lazy(()=>import('./pages/InformationPage').then(page=>({default:page.InformationPage})));
const SupportPage=lazy(()=>import('./pages/SupportPage').then(page=>({default:page.SupportPage})));
const PasswordRecoveryPage=lazy(()=>import('./pages/PasswordRecoveryPage').then(page=>({default:page.PasswordRecoveryPage})));
const AdministrationPage = lazy(() => import("./pages/AdministrationPage").then(page => ({default:page.AdministrationPage})));
const TrashPage = lazy(() => import('./pages/TrashPage').then(page=>({default:page.TrashPage})));
const OfflineReadingPage = lazy(() => import('./pages/OfflineReadingPage').then(page=>({default:page.OfflineReadingPage})));
const LibraryPage = lazy(() => import("./pages/LibraryPage").then(page => ({default:page.LibraryPage})));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard").then((page) => ({ default: page.CreatorDashboard })));
const CreatorProfilePage = lazy(() => import("./pages/CreatorProfilePage").then((page) => ({ default: page.CreatorProfilePage })));
const HelpPage = lazy(() => import("./pages/HelpPage").then((page) => ({ default: page.HelpPage })));
const IllustrationDetailPage = lazy(() => import("./pages/IllustrationDetailPage").then((page) => ({ default: page.IllustrationDetailPage })));
const IllustrationExplorePage = lazy(() => import("./pages/IllustrationExplorePage").then((page) => ({ default: page.IllustrationExplorePage })));
const IllustratorsPage = lazy(() => import("./pages/IllustratorsPage").then((page) => ({ default: page.IllustratorsPage })));
const LanguagesPage = lazy(() => import("./pages/LanguagesPage").then((page) => ({ default: page.LanguagesPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((page) => ({ default: page.RegisterPage })));
const ReadingPage = lazy(() => import("./pages/ReadingPage").then((page) => ({ default: page.ReadingPage })));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage").then((page) => ({ default: page.UserProfilePage })));
const WritersPage = lazy(() => import("./pages/WritersPage").then((page) => ({ default: page.WritersPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((page) => ({ default: page.SearchPage })));

const STORY_CACHE_KEY = "valoria-last-story";
const ILLUSTRATION_CACHE_KEY = "valoria-last-illustration";

function parseHashRoute() {
  // Interpreta la URL hash actual y la traduce a una vista interna de la SPA.
  const hash = window.location.hash.replace(/^#/, "") || window.location.pathname || "/";
  if(hash.startsWith('/info/'))return {view:'information',documentKey:hash.slice(6),storyIdentifier:'',profileId:''};
  if(hash==='/usability')return {view:'usability',storyIdentifier:'',profileId:''};
  if(hash==='/challenges')return {view:'challenges',storyIdentifier:'',profileId:''};
  if(hash==='/support')return {view:'support',storyIdentifier:'',profileId:''};
  if(hash==='/account')return {view:'account',storyIdentifier:'',profileId:''};
  if(hash==='/forgot-password'||hash==='/reset-password')return {view:hash==='/forgot-password'?'forgot-password':'reset-password',storyIdentifier:'',profileId:''};
  if (hash === "/search" || hash.startsWith("/search?")) {
    const params = new URLSearchParams(hash.split("?")[1] || "");
    return { view: "search", query: params.get("q") || "", scope: params.get("type") || "all", field: params.get("field") || "", options:Object.fromEntries(["category","sort","language","completed","page"].map(key=>[key,params.get(key)||""])), storyIdentifier: "", profileId: "", illustrationIdentifier: "" };
  }

  if (hash === "/collaborations") return {view:"collaborations",storyIdentifier:"",profileId:""};
  if (hash === "/administration") return {view:"administration",storyIdentifier:"",profileId:""};
  if (hash === '/trash') return {view:'trash',storyIdentifier:'',profileId:''};
  if (hash === '/offline' || hash.startsWith('/offline/')) return {view:'offline',storyIdentifier:decodeURIComponent(hash.slice('/offline/'.length))||'',profileId:''};
  if (hash === "/library") return {view:"library",storyIdentifier:"",profileId:""};
  if (hash === "/creator") {
    return { view: "creator", storyIdentifier: "" };
  }

  if (hash === "/login") {
    return { view: "login", storyIdentifier: "" };
  }

  if (hash === "/register") {
    return { view: "register", storyIdentifier: "" };
  }

  if (hash === "/profile") {
    return { view: "profile", storyIdentifier: "", profileId: "" };
  }

  if (hash === "/writers") {
    return { view: "writers", storyIdentifier: "", profileId: "" };
  }

  if (hash === "/illustrators") {
    return { view: "illustrators", storyIdentifier: "", profileId: "", illustrationIdentifier: "" };
  }

  if (hash === "/illustrations") {
    return { view: "illustrations", storyIdentifier: "", profileId: "", illustrationIdentifier: "" };
  }

  if (hash === "/languages") {
    return { view: "languages", storyIdentifier: "", profileId: "" };
  }

  if (hash === "/help") {
    return { view: "help", storyIdentifier: "", profileId: "" };
  }

  if (hash.startsWith("/creator-profile/")) {
    return {
      view: "creator-profile",
      storyIdentifier: "",
      profileId: decodeURIComponent(hash.slice("/creator-profile/".length))
    };
  }

  if (hash.startsWith("/story/")) {
    return {
      view: "reading",
      storyIdentifier: decodeURIComponent(hash.slice("/story/".length)),
      profileId: "",
      illustrationIdentifier: ""
    };
  }

  if (hash.startsWith("/illustration/")) {
    return {
      view: "illustration-detail",
      storyIdentifier: "",
      profileId: "",
      illustrationIdentifier: decodeURIComponent(
        hash.slice("/illustration/".length)
      )
    };
  }

  return { view: "home", storyIdentifier: "", profileId: "", illustrationIdentifier: "" };
}

function writeHashRoute(view, storyIdentifier = "", profileId = "", illustrationIdentifier = "") {
  if(view==='information'){window.location.hash='/info/privacy';return;}
  if(view==='support'){window.location.hash='/support';return;}
  if(view==='account'){window.location.hash='/account';return;}
  // Sincroniza la navegacion interna con el hash para soportar refresh y enlaces directos.
  if(view==="search"){window.location.hash="/search";return;}
  if (view === "collaborations") {window.location.hash="/collaborations";return;}
  if (view === "administration") {window.location.hash="/administration";return;}
  if (view === 'trash') {window.location.hash='/trash';return;}
  if (view === 'offline') {window.location.hash=storyIdentifier?`/offline/${encodeURIComponent(storyIdentifier)}`:'/offline';return;}
  if (view === "library") {window.location.hash="/library";return;}
  if(view==='usability'){window.location.hash='/usability';return;}
  if(view==='challenges'){window.location.hash='/challenges';return;}
  if (view === "creator") {
    window.location.hash = "/creator";
    return;
  }

  if (view === "login") {
    window.location.hash = "/login";
    return;
  }

  if (view === "register") {
    window.location.hash = "/register";
    return;
  }

  if (view === "profile") {
    window.location.hash = "/profile";
    return;
  }

  if (view === "writers") {
    window.location.hash = "/writers";
    return;
  }

  if (view === "illustrators") {
    window.location.hash = "/illustrators";
    return;
  }

  if (view === "illustrations") {
    window.location.hash = "/illustrations";
    return;
  }

  if (view === "languages") {
    window.location.hash = "/languages";
    return;
  }

  if (view === "help") {
    window.location.hash = "/help";
    return;
  }

  if (view === "creator-profile" && profileId) {
    window.location.hash = `/creator-profile/${encodeURIComponent(profileId)}`;
    return;
  }

  if (view === "reading" && storyIdentifier) {
    window.history.pushState({},'',`/story/${encodeURIComponent(storyIdentifier)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }

  if (view === "illustration-detail" && illustrationIdentifier) {
    window.history.pushState({},'',`/illustration/${encodeURIComponent(illustrationIdentifier)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }

  window.location.hash = "/";
}

function readCachedStory() {
  // Recupera la ultima historia abierta para soportar recargas y transiciones suaves.
  try {
    const raw = window.localStorage.getItem(STORY_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistStory(story) {
  // Guarda la ultima historia visitada en almacenamiento local.
  window.localStorage.setItem(STORY_CACHE_KEY, JSON.stringify(story));
}

function readCachedIllustration() {
  // Recupera la ultima ilustracion abierta para soportar recargas y transiciones suaves.
  try {
    const raw = window.localStorage.getItem(ILLUSTRATION_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistIllustration(illustration) {
  // Guarda la ultima ilustracion visitada en almacenamiento local.
  window.localStorage.setItem(ILLUSTRATION_CACHE_KEY, JSON.stringify(illustration));
}

export default function App() {
  const [routeError,setRouteError]=useState(null),[routeRetry,setRouteRetry]=useState(0);
  // Orquesta rutas, filtros globales y paso de contexto entre las vistas principales.
  const auth = useAuth();
  const [view, setView] = useState(() => parseHashRoute().view);
  const [informationKey,setInformationKey]=useState(()=>parseHashRoute().documentKey||'privacy');
  const [storyIdentifier, setStoryIdentifier] = useState(
    () => parseHashRoute().storyIdentifier
  );
  const [profileId, setProfileId] = useState(() => parseHashRoute().profileId);
  const [illustrationIdentifier, setIllustrationIdentifier] = useState(
    () => parseHashRoute().illustrationIdentifier
  );
  const [homeSection, setHomeSection] = useState("");
  const [homeSectionRequestKey, setHomeSectionRequestKey] = useState(0);
  const [profileTab, setProfileTab] = useState("info");
  const [selectedStory, setSelectedStory] = useState(() => readCachedStory());
  const [selectedIllustration, setSelectedIllustration] = useState(() =>
    readCachedIllustration()
  );
  useEffect(()=>{document.title=view==='reading'&&selectedStory?`${selectedStory.title} · Valoria`:view==='illustration-detail'&&selectedIllustration?`${selectedIllustration.title} · Valoria`:'Valoria';},[view,selectedStory,selectedIllustration]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState(() => parseHashRoute().query || "");
  const [searchRoute, setSearchRoute] = useState(() => parseHashRoute());
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    function handleHashChange() {
      const canonicalUrl = canonicalHashUrl(window.location);
      if (canonicalUrl) window.history.replaceState(window.history.state, '', canonicalUrl);
      const route = parseHashRoute();
      setInformationKey(route.documentKey||'privacy');
      if (route.view === "search") {
        setSearchRoute(route);
        setSearchQuery(route.query);
        setSelectedCategory(route.options?.category||"");
      }
      setView(route.view);
      setStoryIdentifier(route.storyIdentifier);
      setProfileId(route.profileId);
      setIllustrationIdentifier(route.illustrationIdentifier);
    }

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener('popstate',handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener('popstate',handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (view !== "reading" || !storyIdentifier || auth.status === "loading") {
      return;
    }

    let active = true;

    async function loadStoryFromRoute() {
      setRouteError(null);
      try {const data=await fetchStory(storyIdentifier,auth.token);if(active){setSelectedStory(data.story);persistStory(data.story);}}
      catch {if(active){setSelectedStory(null);setRouteError({type:'reading',identifier:storyIdentifier});}}
    }

    loadStoryFromRoute();

    return () => {
      active = false;
    };
  }, [storyIdentifier, view, auth.token, auth.status,routeRetry]);

  useEffect(() => {
    if (view !== "illustration-detail" || !illustrationIdentifier || auth.status === "loading") {
      return;
    }

    let active = true;

    async function loadIllustrationFromRoute() {
      setRouteError(null);
      try {const data=await fetchIllustration(illustrationIdentifier,auth.token);if(active){setSelectedIllustration(data.illustration);persistIllustration(data.illustration);}}
      catch {if(active){setSelectedIllustration(null);setRouteError({type:'illustration-detail',identifier:illustrationIdentifier});}}
    }

    loadIllustrationFromRoute();

    return () => {
      active = false;
    };
  }, [illustrationIdentifier, view, auth.token, auth.status,routeRetry]);

  useEffect(() => {
    let intervalId = 0;

    async function loadNotifications() {
      if (!auth.isAuthenticated || !auth.token) {
        setNotifications([]);
        setUnreadNotifications(0);
        return;
      }

      try {
        const data = await fetchNotifications(auth.token);
        setNotifications(data.notifications || []);
        setUnreadNotifications(Number(data.unreadCount || 0));
      } catch {}
    }

    loadNotifications();

    if (auth.isAuthenticated) {
      intervalId = window.setInterval(loadNotifications, 20000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [auth.isAuthenticated, auth.token]);

  function handleNavigate(nextView, options = {}) {
    // Navegacion centralizada entre vistas, perfiles, lectura y home filtrado.
    setView(nextView);
    setHomeSection(options.homeSection || "");
    if (options.homeSection) {
      setHomeSectionRequestKey((current) => current + 1);
    }
    setProfileTab(nextView === "profile" ? options.profileTab || "info" : "info");
    if (nextView !== "reading") {
      setStoryIdentifier("");
    }
    if (nextView !== "illustration-detail") {
      setIllustrationIdentifier("");
    }
    if (nextView !== "profile" && nextView !== "creator-profile") {
      setProfileId("");
    }
    if ((nextView === "profile" || nextView === "creator-profile") && options.profileId) {
      setProfileId(options.profileId);
    }
    if (nextView === "illustration-detail" && options.illustrationIdentifier) {
      setIllustrationIdentifier(options.illustrationIdentifier);
    }
    writeHashRoute(
      nextView,
      options.storyIdentifier || "",
      options.profileId || "",
      options.illustrationIdentifier || ""
    );
  }

  function handleOpenStory(story) {
    // Abre una historia desde cualquier tarjeta y persiste su contexto de lectura.
    const nextIdentifier = story.slug || story.id;
    setSelectedStory(story);
    setStoryIdentifier(nextIdentifier);
    setView("reading");
    persistStory(story);
    writeHashRoute("reading", nextIdentifier);
  }

  function handleOpenIllustration(illustration) {
    // Abre el detalle de una ilustracion y guarda su contexto local.
    const nextIdentifier = illustration.slug || illustration.id;
    setSelectedIllustration(illustration);
    setIllustrationIdentifier(nextIdentifier);
    setView("illustration-detail");
    persistIllustration(illustration);
    writeHashRoute("illustration-detail", "", "", nextIdentifier);
  }

  function navigateToFilteredHome() {
    // Lleva al home y activa la zona de exploracion cuando cambian filtros estructurales.
    setView("home");
    setHomeSection("explorar");
    setHomeSectionRequestKey((current) => current + 1);
    writeHashRoute("home");
  }

  async function handleOpenNotification(notification) {
    if (!notification) {
      return;
    }

    if (auth.token && !notification.isRead) {
      try {
        await markNotificationRead(notification.id, auth.token);
      } catch {}
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              isRead: true,
              readAt: item.readAt || new Date().toISOString()
            }
          : item
      )
    );
    setUnreadNotifications((current) => Math.max(0, current - (notification.isRead ? 0 : 1)));

    if (
      notification.type?.startsWith("story_review") &&
      notification.routeIdentifier
    ) {
      handleNavigate("reading", { storyIdentifier: notification.routeIdentifier });
      return;
    }

    if(notification.routeView==='collaborations'){
      handleNavigate('collaborations');return;
    }
    if (notification.routeView === "profile") {
      handleNavigate("profile", { profileTab: notification.routeTab || "info" });
      return;
    }

    if (notification.routeView === "reading" && notification.routeIdentifier) {
      handleNavigate("reading", { storyIdentifier: notification.routeIdentifier });
      return;
    }

    if (notification.routeView === "illustration-detail" && notification.routeIdentifier) {
      handleNavigate("illustration-detail", {
        illustrationIdentifier: notification.routeIdentifier
      });
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (!auth.token) {
      return;
    }

    try {
      await markAllNotificationsRead(auth.token);
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString()
        }))
      );
      setUnreadNotifications(0);
    } catch {}
  }

  const navbarFilters = {
    searchQuery,
    searchScope: searchRoute.scope || "all",
    onSearchChange: setSearchQuery,
    onClearSearchCategory: () => {setSelectedCategory("");const params=new URLSearchParams(window.location.hash.split("?")[1]||"");params.delete("category");window.location.hash=`/search?${params}`;},
    onSearchSubmit: (query = searchQuery, scope = "all", field = "", extra = view === 'search' ? (searchRoute.options || {}) : {}) => {
      const params = new URLSearchParams({ q: query.trim(), type: scope, ...extra });
      if (field) params.set("field", field);
      window.location.hash = `/search?${params}`;
    },
    selectedCategory,
    storySearchQuery: "",
    writerSearchQuery: "",
    onSelectCategory: (category) => {
      setSelectedCategory(category);
      const params=new URLSearchParams(window.location.hash.split("?")[1]||"");params.set("category",category);params.set("type","stories");params.delete("page");window.location.hash=`/search?${params}`;
    },
    notifications,
    unreadNotifications,
    onOpenNotification: handleOpenNotification,
    onMarkAllNotificationsRead: handleMarkAllNotificationsRead
  };

  if(routeError?.type===view&&routeError.identifier===(view==='reading'?storyIdentifier:illustrationIdentifier))return <main style={{maxWidth:800,margin:'10vh auto',padding:24}}><ActivityState kind="error" message="La obra no está disponible o no tienes acceso. Puedes volver a intentarlo." action="Reintentar" onAction={()=>setRouteRetry(x=>x+1)}/><button type="button" onClick={()=>handleNavigate('home')}>{ui('Ir al inicio')}</button></main>;
  if(view==='usability')return <UsabilityPage key={auth.user?.id||'guest'} auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate}/>;
  if(view==='challenges')return <ChallengesPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate}/>;
  if(view==='account')return <AccountPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate}/>;
  if(view==='support')return <SupportPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate}/>;
  if(view==='information')return <InformationPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} documentKey={informationKey}/>;
  if (view === "collaborations") return <CollaborationPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} />;
  if(view==='forgot-password'||view==='reset-password')return <PasswordRecoveryPage key={view} auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} reset={view==='reset-password'}/>;
  if (view === "administration") return <AdministrationPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} />;
  if (view === 'trash') return <TrashPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate}/>;
  if (view === 'offline') return <OfflineReadingPage key={auth.user?.id||"guest"} auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} identifier={storyIdentifier}/>;
  if (view === "library") return <LibraryPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} />;
  if (view === "search") {
    return <SearchPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} onOpenStory={handleOpenStory} onOpenIllustration={handleOpenIllustration} query={searchRoute.query || ""} scope={searchRoute.scope || "all"} field={searchRoute.field || ""} options={searchRoute.options || {}} />;
  }

  if (view === "creator") {
    return <CreatorDashboard auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} />;
  }

  if (view === "writers") {
    return <WritersPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} />;
  }

  if (view === "illustrators") {
    return (
      <IllustratorsPage
        auth={auth}
        navFilters={navbarFilters}
        onNavigate={handleNavigate}
      />
    );
  }

  if (view === "illustrations") {
    return (
      <IllustrationExplorePage
        auth={auth}
        navFilters={navbarFilters}
        onNavigate={handleNavigate}
        onOpenIllustration={handleOpenIllustration}
      />
    );
  }

  if (view === "languages") {
    return <LanguagesPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} />;
  }

  if (view === "help") {
    return <HelpPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} />;
  }

  if (view === "register") {
    return <RegisterPage auth={auth} navFilters={navbarFilters} onNavigate={handleNavigate} />;
  }

  if (view === "profile") {
    return (
      <UserProfilePage
        auth={auth}
        initialTab={profileTab}
        navFilters={navbarFilters}
        onNavigate={handleNavigate}
      />
    );
  }

  if (view === "creator-profile") {
    return (
      <CreatorProfilePage
        auth={auth}
        navFilters={navbarFilters}
        onNavigate={handleNavigate}
        profileId={profileId}
      />
    );
  }

  if (view === "reading" && selectedStory &&
      (String(selectedStory.id) === String(storyIdentifier) || selectedStory.slug === storyIdentifier) &&
      (selectedStory.status !== "draft" || selectedStory.authorId === auth.user?.id)) {
    return (
      <ReadingPage
        key={`${selectedStory.id}:${auth.user?.id || "guest"}`}
        auth={auth}
        navFilters={navbarFilters}
        onNavigate={handleNavigate}
        story={selectedStory}
      />
    );
  }

  if (view === "illustration-detail" && selectedIllustration &&
      (selectedIllustration.id === illustrationIdentifier || selectedIllustration.slug === illustrationIdentifier) &&
      ((selectedIllustration.status === "published" && selectedIllustration.visibility !== "private") ||
        selectedIllustration.authorId === auth.user?.id)) {
    return (
      <IllustrationDetailPage
        auth={auth}
        illustration={selectedIllustration}
        navFilters={navbarFilters}
        onNavigate={handleNavigate}
      />
    );
  }

  if (view === "reading" || view === "illustration-detail") {
    return <ActivityState kind="loading" title="Cargando Valoria..."/>;
  }

  return (
    <HomePage
      auth={auth}
      currentView={view}
      homeSection={homeSection}
      homeSectionRequestKey={homeSectionRequestKey}
      navFilters={navbarFilters}
      onNavigate={handleNavigate}
      onOpenIllustration={handleOpenIllustration}
      onOpenStory={handleOpenStory}
      showLoginPanel={view === "login"}
    />
  );
}
