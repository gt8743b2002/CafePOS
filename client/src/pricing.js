import { SIZE_MODIFIERS, MILK_MODIFIERS } from './constants';

// Mirrors server/index.js sizePrice() — used for live display only;
// the server always recomputes authoritatively at checkout.
export function sizePrice(product, size) {
  if (size === 'SMALL' && product.price_small != null) return product.price_small;
  if (size === 'LARGE' && product.price_large != null) return product.price_large;
  return product.base_price + (SIZE_MODIFIERS[size] ?? 0);
}

// Mirrors server/index.js computeLinePrice() — used for live display only;
// the server always recomputes authoritatively at checkout.
export function computeUnitPrice(product, opts) {
  let unit = product.has_size && opts.size ? sizePrice(product, opts.size) : product.base_price;
  if (product.is_drink && opts.milk_level) {
    unit += MILK_MODIFIERS[opts.milk_level] ?? 0;
  }
  const addonsTotal = (opts.addons || []).reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  unit += addonsTotal;
  return Math.max(0, unit);
}

export function formatMoney(n) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}
