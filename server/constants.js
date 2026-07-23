const TAX_RATE = 0.08;

const SIZE_MODIFIERS = {
  SMALL: -0.5,
  MEDIUM: 0,
  LARGE: 0.5,
};

const MILK_MODIFIERS = {
  Regular: 0,
  Lite: 0,
  Oat: 0.5,
  Almond: 0.5,
  'Non-Dairy': 0.5,
};

const SUGAR_LEVELS = ['0%', '25%', '50%', '75%', '100%'];
const ICE_LEVELS = ['No Ice', 'Less Ice', 'Normal Ice', 'Extra Ice'];
const MILK_LEVELS = Object.keys(MILK_MODIFIERS);

module.exports = { TAX_RATE, SIZE_MODIFIERS, MILK_MODIFIERS, SUGAR_LEVELS, ICE_LEVELS, MILK_LEVELS };
