import { formatMoney, sizePrice } from '../pricing';

function ProductCard({ product, onSelect }) {
  const outOfStock = product.track_stock && product.stock_qty <= 0;
  const lowStock = product.track_stock && product.stock_qty > 0 && product.stock_qty <= 5;

  return (
    <button className="product-card" disabled={outOfStock} onClick={() => onSelect(product)}>
      {outOfStock && <div className="stock-badge stock-out">Out of stock</div>}
      {!outOfStock && lowStock && <div className="stock-badge stock-low">Low: {product.stock_qty}</div>}
      <div className="product-top">
        <div className="product-image">
          {product.image_path ? <img src={product.image_path} alt={product.name} /> : <span className="product-emoji">{product.icon || '🧾'}</span>}
        </div>
        {product.has_size ? (
          <div className="product-price product-price-stack">
            <div className="price-minor"><span className="price-size-letter">S</span>{formatMoney(sizePrice(product, 'SMALL'))}</div>
            <div className="price-main"><span className="price-size-letter">M</span>{formatMoney(sizePrice(product, 'MEDIUM'))}</div>
            <div className="price-minor"><span className="price-size-letter">L</span>{formatMoney(sizePrice(product, 'LARGE'))}</div>
          </div>
        ) : (
          <div className="product-price">{formatMoney(product.base_price)}</div>
        )}
      </div>
      <div className="product-name">{product.name}</div>
    </button>
  );
}

export default function ProductGrid({ products, onSelect }) {
  if (products.length === 0) {
    return <div className="empty-state">No products in this category yet.</div>;
  }
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onSelect={onSelect} />
      ))}
    </div>
  );
}
