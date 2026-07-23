import { useEffect, useState } from 'react';
import { api } from '../../api';
import { sizePrice } from '../../pricing';

const emptyForm = {
  category_id: '',
  name: '',
  base_price: '',
  price_small: '',
  price_large: '',
  icon: '',
  has_size: false,
  is_drink: false,
  track_stock: true,
  stock_qty: 0,
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProductsTab() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [addons, setAddons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [addonForm, setAddonForm] = useState({ name: '', price: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [cats, prods, adds] = await Promise.all([
      api.getCategories(),
      api.getProducts({ includeInactive: true }),
      api.getAddons(true),
    ]);
    setCategories(cats);
    setProducts(prods);
    setAddons(adds);
    if (!form.category_id && cats.length) setForm((f) => ({ ...f, category_id: cats[0].id }));
  }

  useEffect(() => { refresh().catch((e) => setError(e.message)); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const created = await api.createProduct({
        category_id: Number(form.category_id),
        name: form.name.trim(),
        base_price: Number(form.base_price),
        price_small: form.price_small === '' ? null : Number(form.price_small),
        price_large: form.price_large === '' ? null : Number(form.price_large),
        icon: form.icon.trim(),
        has_size: form.has_size,
        is_drink: form.is_drink,
        track_stock: form.track_stock,
        stock_qty: Number(form.stock_qty) || 0,
      });
      if (imageFile) {
        const dataUrl = await fileToDataUrl(imageFile);
        const { image_path } = await api.uploadImage(dataUrl);
        await api.updateProduct(created.id, { ...created, image_path });
      }
      setForm({ ...emptyForm, category_id: form.category_id });
      setImageFile(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateField(product, field, value) {
    setError('');
    try {
      await api.updateProduct(product.id, { ...product, [field]: value });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handlePhotoChange(product, file) {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      const { image_path } = await api.uploadImage(dataUrl);
      await api.updateProduct(product.id, { ...product, image_path });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function restock(product, delta) {
    setError('');
    try {
      await api.restockProduct(product.id, delta);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddonCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createAddon({ name: addonForm.name.trim(), price: Number(addonForm.price) });
      setAddonForm({ name: '', price: '' });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateAddonField(addon, field, value) {
    setError('');
    try {
      await api.updateAddon(addon.id, { ...addon, [field]: value });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-section">
      {error && <div className="error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      <h2>Add Product</h2>
      <form className="inline-form" onSubmit={handleCreate}>
        <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <input placeholder="Price M" type="number" step="0.01" required value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))} style={{ width: 80 }} />
        <input placeholder="Price S" type="number" step="0.01" value={form.price_small} onChange={(e) => setForm((f) => ({ ...f, price_small: e.target.value }))} style={{ width: 80 }} />
        <input placeholder="Price L" type="number" step="0.01" value={form.price_large} onChange={(e) => setForm((f) => ({ ...f, price_large: e.target.value }))} style={{ width: 80 }} />
        <input placeholder="Icon (emoji)" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} style={{ width: 60 }} />
        <input placeholder="Stock" type="number" value={form.stock_qty} onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))} style={{ width: 70 }} />
        <label className="checkbox-label"><input type="checkbox" checked={form.has_size} onChange={(e) => setForm((f) => ({ ...f, has_size: e.target.checked }))} /> Has size</label>
        <label className="checkbox-label"><input type="checkbox" checked={form.is_drink} onChange={(e) => setForm((f) => ({ ...f, is_drink: e.target.checked }))} /> Drink customization</label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        <button className="btn btn-primary" type="submit" disabled={busy}>Add</button>
      </form>

      <h2>Products</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th></th><th>Name</th><th>Category</th><th>Price S</th><th>Price M (default)</th><th>Price L</th><th>Drink?</th><th>Stock</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={!p.active ? 'row-inactive' : ''}>
              <td>
                <label className="photo-cell" title="Click to change photo">
                  {p.image_path ? <img className="table-thumb" src={p.image_path} alt="" /> : <span>{p.icon}</span>}
                  <input
                    type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => handlePhotoChange(p, e.target.files?.[0] || null)}
                  />
                </label>
              </td>
              <td>{p.name}</td>
              <td>
                <select
                  value={p.category_id}
                  onChange={(e) => updateField(p, 'category_id', Number(e.target.value))}
                >
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </td>
              <td>
                {p.has_size ? (
                  <input
                    key={`s-${p.id}-${p.price_small}-${p.base_price}`}
                    type="number" step="0.01" defaultValue={sizePrice(p, 'SMALL')} style={{ width: 70 }}
                    onBlur={(e) => Number(e.target.value) !== sizePrice(p, 'SMALL') && updateField(p, 'price_small', Number(e.target.value))}
                  />
                ) : (
                  <button className="btn-link" onClick={() => updateField(p, 'has_size', 1)}>+ Add size</button>
                )}
              </td>
              <td>
                <input
                  type="number" step="0.01" defaultValue={p.base_price} style={{ width: 70 }}
                  onBlur={(e) => Number(e.target.value) !== p.base_price && updateField(p, 'base_price', Number(e.target.value))}
                />
              </td>
              <td>
                {p.has_size ? (
                  <input
                    key={`l-${p.id}-${p.price_large}-${p.base_price}`}
                    type="number" step="0.01" defaultValue={sizePrice(p, 'LARGE')} style={{ width: 70 }}
                    onBlur={(e) => Number(e.target.value) !== sizePrice(p, 'LARGE') && updateField(p, 'price_large', Number(e.target.value))}
                  />
                ) : (
                  <button className="btn-link" onClick={() => updateField(p, 'has_size', 1)}>+ Add size</button>
                )}
              </td>
              <td>{p.is_drink ? '✓' : ''}</td>
              <td>
                <div className="stock-cell">
                  <button onClick={() => restock(p, -1)}>-</button>
                  <span>{p.stock_qty}</span>
                  <button onClick={() => restock(p, 1)}>+</button>
                  <button onClick={() => restock(p, 10)}>+10</button>
                </div>
              </td>
              <td>{p.active ? 'Active' : 'Hidden'}</td>
              <td>
                {p.active
                  ? <button className="btn btn-danger" onClick={() => updateField(p, 'active', 0)}>Hide</button>
                  : <button className="btn" onClick={() => updateField(p, 'active', 1)}>Restore</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Add-ons</h2>
      <form className="inline-form" onSubmit={handleAddonCreate}>
        <input placeholder="Add-on name" required value={addonForm.name} onChange={(e) => setAddonForm((f) => ({ ...f, name: e.target.value }))} />
        <input placeholder="Price" type="number" step="0.01" required value={addonForm.price} onChange={(e) => setAddonForm((f) => ({ ...f, price: e.target.value }))} style={{ width: 80 }} />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Price</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {addons.map((a) => (
            <tr key={a.id} className={!a.active ? 'row-inactive' : ''}>
              <td>{a.name}</td>
              <td>
                <input
                  type="number" step="0.01" defaultValue={a.price} style={{ width: 70 }}
                  onBlur={(e) => Number(e.target.value) !== a.price && updateAddonField(a, 'price', Number(e.target.value))}
                />
              </td>
              <td>{a.active ? 'Active' : 'Hidden'}</td>
              <td>
                {a.active
                  ? <button className="btn btn-danger" onClick={() => updateAddonField(a, 'active', 0)}>Hide</button>
                  : <button className="btn" onClick={() => updateAddonField(a, 'active', 1)}>Restore</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
