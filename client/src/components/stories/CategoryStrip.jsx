import { ui } from '../../i18n/runtime.js';
import { ALL_CATEGORIES, categoryLabel } from '../../data/categories';
import styles from '../../styles/CategoryStrip.module.css';

export function CategoryStrip({ compact = false, counts = null, selectedCategory = '', scope = 'all', onSelectCategory, onViewAll }) {
  const categories = compact ? ALL_CATEGORIES.slice(0, 6) : [...new Set([...ALL_CATEGORIES, ...Object.keys(counts || {})])];
  return <section className={styles.section} aria-label={ui('Categorías')}>
    <div className={styles.header}>
      <div><span>{ui('Categorías')}</span><h2>{ui('Descubre por género')}</h2></div>
      {compact && <button className={styles.viewAll} type="button" onClick={onViewAll}>{ui('Ver todas')} <span aria-hidden="true">→</span></button>}
    </div>
    {!compact && <p className={styles.description}>{ui('Encuentra tu próxima lectura o inspiración visual.')}</p>}
    <div className={compact ? styles.list : styles.grid}>
      {categories.map((category, index) => {
        const entry = counts?.[category];
        const count = counts === null ? null : scope === 'stories' ? (entry?.stories || 0) : scope === 'illustrations' ? (entry?.illustrations || 0) : (entry?.stories || 0) + (entry?.illustrations || 0);
        return <button className={compact ? styles.chip : styles.card} key={category} type="button" aria-pressed={selectedCategory === category} onClick={() => onSelectCategory(category)}>
          {!compact && <span className={styles.symbol} aria-hidden="true">{['♡','✧','☺','✦','☆','❧'][index % 6]}</span>}
          <span className={styles.name}>{ui(categoryLabel(category))}</span>
          {count !== null && <small>{count === 1 ? ui('1 obra') : ui('{0} obras', [count])}</small>}
        </button>;
      })}
    </div>
  </section>;
}
