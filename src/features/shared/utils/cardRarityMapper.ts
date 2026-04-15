/**
 * POKEMON CARD RARITY MAPPER
 * Maps TCGdex API rarity strings to simeydotme/pokemon-cards-css classes.
 */

export function mapRarityToCSS(rarity?: string): string {
  if (!rarity) return 'common';

  const r = rarity.toUpperCase();

  // VMAX, VSTAR
  if (r.includes('VMAX') || r.includes('VSTAR')) {
    return 'rare holo vmax';
  }

  // V
  if (r === 'V' || r.includes(' V ')) {
    return 'rare holo v';
  }

  // Hyper, Secret, Gold
  if (r.includes('HYPER') || r.includes('SECRET') || r.includes('GOLD')) {
    return 'rare secret';
  }

  // Ultra, Illustration, Full Art
  if (r.includes('ULTRA') || r.includes('ILLUSTRATION') || r.includes('FULL ART')) {
    return 'rare ultra';
  }

  // Shiny, Radiant
  if (r.includes('SHINY') || r.includes('RADIANT')) {
    return 'radiant rare';
  }

  // Holo, ACE SPEC
  if (r.includes('HOLO') || r.includes('ACE SPEC')) {
    // Some cards are "rare holo cosmos" in the library, we can check for cosmos if needed
    // For now, default to rare holo
    return 'rare holo';
  }

  // Default (Common, Uncommon, etc)
  return 'common';
}
