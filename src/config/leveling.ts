/**
 * Leveling configuration for TCG Shop Simulator
 */

export const getRequiredExp = (level: number): number => {
  // Example progression: 
  // Level 1 -> 2: 250 XP
  // Level 2 -> 3: 460 XP
  // Level 3 -> 4: 700 XP
  // Formula: 250 * (level ^ 1.2) - or similar.
  // Let's use a simple incremental growth
  if (level <= 1) return 250;
  return Math.floor(250 * Math.pow(level, 1.4));
};

export const XP_REWARDS = {
  SELL_PACK: 5,
  SELL_BOX: 12,
  OPEN_PACK_COMMON: 1,
  OPEN_PACK_UNCOMMON: 3,
  OPEN_PACK_RARE: 10,
};
