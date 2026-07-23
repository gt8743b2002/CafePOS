import { CATEGORY_ICONS } from '../../constants';

export default function CategoryPicker({ categories, onSelect }) {
  if (categories.length === 0) {
    return <div className="empty-state">No categories available yet.</div>;
  }
  return (
    <div className="category-grid">
      {categories.map((c) => (
        <button key={c.id} className="category-card" onClick={() => onSelect(c.id)}>
          <span className="category-card-icon">{CATEGORY_ICONS[c.name] || '🍽️'}</span>
          <span className="category-card-name">{c.name}</span>
        </button>
      ))}
    </div>
  );
}
