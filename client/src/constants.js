// Mirrors server/constants.js — kept in sync manually since both are static.
export const TAX_RATE = 0.08;

export const SIZE_MODIFIERS = { SMALL: -0.5, MEDIUM: 0, LARGE: 0.5 };
export const SIZES = ['SMALL', 'MEDIUM', 'LARGE'];

export const MILK_MODIFIERS = { Regular: 0, Lite: 0, Oat: 0.5, Almond: 0.5, 'Non-Dairy': 0.5 };
export const MILK_LEVELS = Object.keys(MILK_MODIFIERS);

export const SUGAR_LEVELS = ['0%', '25%', '50%', '75%', '100%'];
export const ICE_LEVELS = ['No Ice', 'Less Ice', 'Normal Ice', 'Extra Ice'];

export const ORDER_TYPES = [
  { value: 'DINE_IN', label: 'Dine In' },
  { value: 'TAKE_AWAY', label: 'Take Away' },
];

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
];

export const QUICK_CASH_AMOUNTS = [5, 10, 20, 50, 100];

export const CATEGORY_ICONS = {
  Coffee: '☕',
  Beverages: '🥤',
  'Pastries & Bakery': '🥐',
  Breakfast: '🍳',
  Lunch: '🥪',
  Groceries: '🛒',
};
