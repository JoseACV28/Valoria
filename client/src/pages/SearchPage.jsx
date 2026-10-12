import { CategoryStrip } from '../components/stories/CategoryStrip';
import { categoryLabel } from '../data/categories';
import {ActivityState} from '../components/common/ActivityState';
import { STORY_LANGUAGES, languageLabel } from '../data/languages';
import { ui } from "../i18n/runtime.js";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import { SEARCH_TYPES, searchLink, terms } from "../utils/search";
import styles from "../styles/SearchPage.module.css";

export function SearchPage({ auth, navFilters, onNavigate, onOpenStory, onOpenIllustration, query, scope, field, options = {} }) {
  const [data, setData] = useState({stories:[],illustrations:[],writers:[],illustrators:[]});
  const [counts,setCounts]=useState({});
  const [categories,setCategories]=useState(null);
  const [availableLanguages,setAvailableLanguages]=useState([]);
  const resultsHeader = useRef(null);
  useEffect(() => {
    if (options.category) resultsHeader.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }, [options.category]);
  const optionKey=JSON.stringify(options);
  const changeOptions=patch=>navFilters.onSearchSubmit(query,type,exactField,{...options,...patch,page:1});
  const [status, setStatus] = useState("loading");
  const [errors, setErrors] = useState([]);
  const [retry, setRetry] = useState(0);
  const type = SEARCH_TYPES.some(([key]) => key === scope) ? scope : "all";
  const exactField = type === "stories" && ["character", "tag"].includes(field) ? field : "";
  useEffect(() => {
    let active = true;
    setStatus("loading");
    const params = new URLSearchParams({q:query,field:exactField,...options});
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/search?${params}`,{headers:auth.token?{Authorization:`Bearer ${auth.token}`}:{}}).then(async response=>{if(!response.ok)throw new Error('search');return response.json();}).then(result=>{
      if(!active)return;setData(result.groups);setCounts(result.counts);setCategories(result.categories||{});setAvailableLanguages(result.languages||[]);setErrors([]);setStatus('ready');
    }).catch(()=>{if(active){setErrors(['los resultados']);setStatus('error');setData({stories:[],illustrations:[],writers:[],illustrators:[]});setCounts({});}});
    return ()=>{active=false;};
  },[retry,query,exactField,optionKey,auth.token]);
  const {stories,illustrations,writers,illustrators}=data;
  const languageOptions=[...STORY_LANGUAGES,...availableLanguages.filter(value=>!STORY_LANGUAGES.some(([key])=>key===value)).map(value=>[value,value])];
  const groups = [
    { key: "stories", title: "Historias", items: stories },
    { key: "illustrations", title: "Ilustraciones", items: illustrations },
    { key: "writers", title: "Escritores", items: writers },
    { key: "illustrators", title: "Ilustradores", items: illustrators }
  ].filter((group) => type === "all" || type === group.key);
  const total = groups.reduce((sum, group) => sum + (counts[group.key]||0), 0);
  return <AppShell auth={auth} currentView="search" onNavigate={onNavigate}>
    <main className={styles.page}>
      <Navbar auth={auth} currentView="search" {...navFilters} searchScope={type} onNavigate={onNavigate} />
      {!query && <CategoryStrip counts={categories} scope={type} selectedCategory={options.category || ''} onSelectCategory={category=>navFilters.onSearchSubmit(query, ['stories','illustrations'].includes(type)?type:'all', '', {...options,category,page:1})}/>}
      <section ref={resultsHeader} className={styles.header}>
        <span>{ui("Búsqueda en Valoria")}</span>
        <h1>{query ? ui("Resultados para «{0}»",[query]) : options.category ? ui(categoryLabel(options.category)) : ui("Explora historias, arte y creadores")}</h1>
        <nav className={styles.filters} aria-label={ui("Tipo de resultado")}>
          {SEARCH_TYPES.map(([key, label]) => <button type="button" key={key} aria-pressed={type === key} onClick={() => navFilters.onSearchSubmit(query, key, key === "stories" ? exactField : "", {...options,page:1})}>{ui(label)}</button>)}
        </nav>
        {exactField && <p>{ui("Coincidencia exacta de ")}{exactField === "character" ? ui("personaje") : ui("etiqueta")}: {query}. <button type="button" onClick={() => navFilters.onSearchSubmit(query, "stories")}>{ui("Buscar en todos los campos")}</button></p>}
        {navFilters.selectedCategory && ["all", "stories", "illustrations"].includes(type) && <p>{ui("Categoría: ")}{navFilters.selectedCategory} <button type="button" onClick={() => navFilters.onClearSearchCategory()}>{ui("Quitar categoría")}</button></p>}
        <div className={styles.filters}>
          <label>{ui("Orden")}<select value={options.sort||"recent"} onChange={event=>changeOptions({sort:event.target.value})}><option value="recent">{ui("Más recientes")}</option><option value="popular">{ui("Más populares")}</option><option value="rating">{ui("Mejor valoradas")}</option></select></label>
          <label>{ui("Idioma")}<select value={options.language||''} onChange={event=>changeOptions({language:event.target.value})}><option value="">{ui("Todos")}</option>{languageOptions.filter(([value])=>availableLanguages.includes(value)||value===options.language).map(([value])=><option key={value} value={value}>{languageLabel(value)}</option>)}</select></label>
          <label><input type="checkbox" checked={options.completed==='true'} onChange={event=>changeOptions({completed:event.target.checked?'true':''})}/>{ui(" Historias terminadas")}</label>
        </div>
        <p role="status">{status === "loading" ? ui("Buscando…") : `${total} ${total === 1 ? ui("resultado") : ui("resultados")}${errors.length ? ui(" en los datos disponibles") : ""}`}</p>
      </section>
      {errors.length > 0 && <ActivityState kind="error" action="Reintentar" onAction={()=>setRetry(x=>x+1)}/>}
      {status==='loading'&&<ActivityState kind="loading" title="Buscando…"/>}
      {status === "ready" && groups.map((group) => <section className={styles.section} key={group.key} aria-label={ui(group.title)}>
        <h2>{ui(group.title)} <small>({counts[group.key]||0})</small></h2>
        {group.items.length === 0 ? <ActivityState title="No hay coincidencias" message="Prueba otra búsqueda o cambia los filtros."/> : <div className={styles.grid}>{group.items.map((item) => {
          const creator = ["writers", "illustrators"].includes(group.key);
          return <article className={styles.card} key={item.id}>
            <button type="button" className={styles.open} onClick={() => creator ? onNavigate("creator-profile", { profileId: item.id }) : group.key === "stories" ? onOpenStory(item) : onOpenIllustration(item)}>
              {creator ? (item.avatar ? <img className={styles.avatar} src={item.avatar} alt="" /> : <span className={styles.initial}>{item.name.slice(0, 1)}</span>) : <img className={styles.cover} src={item.coverUrl || item.cover_url || item.cover || "/default-cover.svg"} alt="" onError={(event) => { if (!event.currentTarget.src.endsWith("/default-cover.svg")) event.currentTarget.src = "/default-cover.svg"; }} />}
              <strong>{creator ? item.name : item.title}</strong>
              {creator && <small>{item.count} {group.key === "writers" ? (item.count===1 ? ui("historia publicada") : ui("historias publicadas")) : (item.count===1 ? ui("ilustración publicada") : ui("ilustraciones publicadas"))}</small>}
            </button>
            {!creator && <><button className={styles.author} type="button" disabled={!(item.authorId || item.author_id)} onClick={() => onNavigate("creator-profile", { profileId: item.authorId || item.author_id })}>{item.author}</button>
              {group.key === "stories" && <div className={styles.terms}>
                {terms(item.characters).map((value) => <a key={`character-${value}`} href={searchLink(value, "character")} aria-label={ui("Buscar personaje {0}",[value])}>{value}</a>)}
                {terms(item.tags).map((value) => <a key={`tag-${value}`} href={searchLink(value, "tag")} aria-label={ui("Buscar etiqueta {0}",[value])}>#{value}</a>)}
              </div>}
            </>}
          </article>;
        })}</div>}
      </section>)}
      {status==='ready' && <nav className={styles.filters} aria-label={ui("Paginación de resultados")}><button type="button" disabled={Number(options.page||1)<=1} onClick={()=>navFilters.onSearchSubmit(query,type,exactField,{...options,page:Number(options.page||1)-1})}>{ui("Anterior")}</button><span>{ui("Página ")}{options.page||1}</span><button type="button" disabled={!groups.some(group=>(counts[group.key]||0)>Number(options.page||1)*12)} onClick={()=>navFilters.onSearchSubmit(query,type,exactField,{...options,page:Number(options.page||1)+1})}>{ui("Siguiente")}</button></nav>}
    </main>
  </AppShell>;
}
