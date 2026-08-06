// Punto de orquestacion principal del cliente.
// Mantiene la navegacion por hash para que el refresh preserve la vista actual.
import { useEffect, useState } from "react";
import { fetchIllustration } from "./api/illustrationApi";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "./api/notificationApi";
import { fetchStory } from "./api/storyApi";
import { fallbackStories } from "./data/fallbackStories";
import { useAuth } from "./hooks/useAuth";
import { CreatorDashboard } from "./pages/CreatorDashboard";
import { CreatorProfilePage } from "./pages/CreatorProfilePage";
import { HomePage } from "./pages/HomePage";
import { HelpPage } from "./pages/HelpPage";
import { IllustrationDetailPage } from "./pages/IllustrationDetailPage";
import { IllustrationExplorePage } from "./pages/IllustrationExplorePage";
import { IllustratorsPage } from "./pages/IllustratorsPage";
import { LanguagesPage } from "./pages/LanguagesPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ReadingPage } from "./pages/ReadingPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { WritersPage } from "./pages/WritersPage";

const STORY_CACHE_KEY = "valoria-last-story";
const ILLUSTRATION_CACHE_KEY = "valoria-last-illustration";

function parseHashRoute() {
  // Interpreta la URL hash actual y la traduce a una vista interna de la SPA.
  const hash = window.location.hash.replace(/^#/, "") || "/";

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
  // Sincroniza la navegacion interna con el hash para soportar refresh y enlaces directos.
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
    window.location.hash = `/story/${encodeURIComponent(storyIdentifier)}`;
    return;
  }

  if (view === "illustration-detail" && illustrationIdentifier) {
    window.location.hash = `/illustration/${encodeURIComponent(illustrationIdentifier)}`;
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
  // Orquesta rutas, filtros globales y paso de contexto entre las vistas principales.
  const auth = useAuth();
  const [view, setView] = useState(() => parseHashRoute().view);
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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [storySearchQuery, setStorySearchQuery] = useState("");
  const [writerSearchQuery, setWriterSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    function handleHashChange() {
      const route = parseHashRoute();
      setView(route.view);
      setStoryIdentifier(route.storyIdentifier);
      setProfileId(route.profileId);
      setIllustrationIdentifier(route.illustrationIdentifier);
    }

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (view !== "reading" || !storyIdentifier) {
      return;
    }

    let active = true;

    async function loadStoryFromRoute() {
      try {
        const data = await fetchStory(storyIdentifier);

        if (active) {
          setSelectedStory(data.story);
          persistStory(data.story);
        }
        return;
      } catch (error) {}

      const cachedStory = readCachedStory();
      const fallbackStory =
        fallbackStories.find(
          (story) =>
            story.id === storyIdentifier || story.slug === storyIdentifier
        ) || null;

      const nextStory =
        cachedStory &&
        (cachedStory.id === storyIdentifier || cachedStory.slug === storyIdentifier)
          ? cachedStory
          : fallbackStory;

      if (active) {
        if (nextStory) {
          setSelectedStory(nextStory);
          return;
        }

        setView("home");
        writeHashRoute("home");
      }
    }

    loadStoryFromRoute();

    return () => {
      active = false;
    };
  }, [storyIdentifier, view]);

  useEffect(() => {
    if (view !== "illustration-detail" || !illustrationIdentifier) {
      return;
    }

    let active = true;

    async function loadIllustrationFromRoute() {
      try {
        const data = await fetchIllustration(illustrationIdentifier);
        if (active) {
          setSelectedIllustration(data.illustration);
          persistIllustration(data.illustration);
        }
        return;
      } catch {}

      const cached = readCachedIllustration();

      if (
        active &&
        cached &&
        (cached.id === illustrationIdentifier || cached.slug === illustrationIdentifier)
      ) {
        setSelectedIllustration(cached);
        return;
      }

      if (active) {
        setView("illustrations");
        writeHashRoute("illustrations");
      }
    }

    loadIllustrationFromRoute();

    return () => {
      active = false;
    };
  }, [illustrationIdentifier, view]);

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

  function navigateToHomeResults() {
    // Redirige al home si una busqueda global se dispara desde otra vista.
    if (view !== "home") {
      setView("home");
      setHomeSection("");
      writeHashRoute("home");
    }
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
    selectedCategory,
    storySearchQuery,
    writerSearchQuery,
    onSelectCategory: (category) => {
      setSelectedCategory(category);
      navigateToFilteredHome();
    },
    onStorySearchChange: (query) => {
      setStorySearchQuery(query);
      navigateToHomeResults();
    },
    onWriterSearchChange: (query) => {
      setWriterSearchQuery(query);
      navigateToHomeResults();
    },
    notifications,
    unreadNotifications,
    onOpenNotification: handleOpenNotification,
    onMarkAllNotificationsRead: handleMarkAllNotificationsRead
  };

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

  if (view === "reading" && selectedStory) {
    return (
      <ReadingPage
        auth={auth}
        navFilters={navbarFilters}
        onNavigate={handleNavigate}
        story={selectedStory}
      />
    );
  }

  if (view === "illustration-detail" && selectedIllustration) {
    return (
      <IllustrationDetailPage
        auth={auth}
        illustration={selectedIllustration}
        navFilters={navbarFilters}
        onNavigate={handleNavigate}
      />
    );
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
