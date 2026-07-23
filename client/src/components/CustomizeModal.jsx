import { useMemo, useState } from 'react';
import { SIZES, SUGAR_LEVELS, ICE_LEVELS, MILK_LEVELS } from '../constants';
import { computeUnitPrice, formatMoney, sizePrice } from '../pricing';

export default function CustomizeModal({ product, addons, onCancel, onAdd }) {
  const [size, setSize] = useState('MEDIUM');
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('Normal Ice');
  const [milkLevel, setMilkLevel] = useState('Regular');
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);

  const opts = { size: product.has_size ? size : null, milk_level: product.is_drink ? milkLevel : null, addons: selectedAddons };
  const unitPrice = useMemo(() => computeUnitPrice(product, opts), [product, size, milkLevel, selectedAddons]);

  function toggleAddon(addon) {
    setSelectedAddons((cur) =>
      cur.some((a) => a.id === addon.id) ? cur.filter((a) => a.id !== addon.id) : [...cur, addon]
    );
  }

  function handleAdd() {
    onAdd({
      product,
      qty,
      size: product.has_size ? size : null,
      sugar_level: product.is_drink ? sugarLevel : null,
      ice_level: product.is_drink ? iceLevel : null,
      milk_level: product.is_drink ? milkLevel : null,
      addons: selectedAddons,
      note: note.trim() || null,
      unitPrice,
    });
  }

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-icon">{product.icon}</span>
            {product.name}
          </div>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {product.has_size && (
            <div className="option-group">
              <div className="option-label">Size</div>
              <div className="pill-row">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    className={`pill pill-size ${size === s ? 'pill-active' : ''}`}
                    onClick={() => setSize(s)}
                  >
                    <span className="pill-size-label">{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                    <span className="pill-size-price">{formatMoney(sizePrice(product, s))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.is_drink && (
            <>
              <div className="option-group">
                <div className="option-label">Sugar Level</div>
                <div className="pill-row">
                  {SUGAR_LEVELS.map((s) => (
                    <button key={s} className={`pill ${sugarLevel === s ? 'pill-active' : ''}`} onClick={() => setSugarLevel(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <div className="option-label">Ice Level</div>
                <div className="pill-row">
                  {ICE_LEVELS.map((s) => (
                    <button key={s} className={`pill ${iceLevel === s ? 'pill-active' : ''}`} onClick={() => setIceLevel(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <div className="option-label">Milk</div>
                <div className="pill-row">
                  {MILK_LEVELS.map((s) => (
                    <button key={s} className={`pill ${milkLevel === s ? 'pill-active' : ''}`} onClick={() => setMilkLevel(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {addons.length > 0 && (
                <div className="option-group">
                  <div className="option-label">Add-ons</div>
                  <div className="pill-row">
                    {addons.map((a) => (
                      <button
                        key={a.id}
                        className={`pill ${selectedAddons.some((x) => x.id === a.id) ? 'pill-active' : ''}`}
                        onClick={() => toggleAddon(a)}
                      >
                        {a.name} (+{formatMoney(a.price)})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="option-group">
            <div className="option-label">Note</div>
            <textarea
              className="note-input"
              rows={2}
              placeholder="e.g. no bag, extra napkins..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="option-group qty-row">
            <div className="option-label">Quantity</div>
            <div className="qty-stepper">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-total">{formatMoney(unitPrice * qty)}</div>
          <button className="btn btn-primary" onClick={handleAdd}>Add to Order</button>
        </div>
      </div>
    </div>
  );
}
