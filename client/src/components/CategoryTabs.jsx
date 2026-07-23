import { CATEGORY_ICONS } from '../constants';

export default function CategoryTabs({ categories, selected, onSelect }) {
  return (
    <div className="category-tabs">
      <button className={`tab ${selected === null ? 'tab-active' : ''}`} onClick={() => onSelect(null)}>
        <span className="tab-icon">🍽️</span>
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          className={`tab ${selected === c.id ? 'tab-active' : ''}`}
          onClick={() => onSelect(c.id)}
        >
          <span className="tab-icon">{CATEGORY_ICONS[c.name] || '🍽️'}</span>
          {c.name}
        </button>
      ))}
    </div>
  );
}
