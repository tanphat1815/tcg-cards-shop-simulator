/**
 * Leveling Configuration
 */
export const XP_PER_LEVEL = 1000;

export const calculateRequiredXP = (level: number): number => {
  return level * XP_PER_LEVEL;
};

export const XP_REWARDS = {
  SERVE_CUSTOMER: 50,
  ITEM_SOLD: 10,
  TRASH_CLEANED: 5,
  MATCH_FINISHED: 100,
  SHELF_RESTOCKED: 20,
  OPEN_PACK_RARE: 15,
  OPEN_PACK_COMMON: 2,
};

/**
 * Shop Expansion Configuration
 */
export const BASE_SHOP_WIDTH = 400;
export const BASE_SHOP_HEIGHT = 400;
export const TILE_SIZE = 40;
export const EXPANSION_WIDTH_STEP = 5 * TILE_SIZE;  // 200px
export const EXPANSION_HEIGHT_STEP = 2 * TILE_SIZE; // 80px

export interface ExpansionLevelInfo {
  id: number;
  requiredLevel: number;
  cost: number;
  rentIncrease: number;
}

export const EXPANSION_LEVELS: ExpansionLevelInfo[] = [
  { id: 1, requiredLevel: 2, cost: 300, rentIncrease: 20 },
  { id: 2, requiredLevel: 3, cost: 400, rentIncrease: 20 },
  { id: 3, requiredLevel: 5, cost: 500, rentIncrease: 20 },
  { id: 4, requiredLevel: 7, cost: 600, rentIncrease: 20 },
  { id: 5, requiredLevel: 11, cost: 900, rentIncrease: 30 },
  { id: 6, requiredLevel: 13, cost: 1050, rentIncrease: 30 },
  { id: 7, requiredLevel: 15, cost: 1200, rentIncrease: 30 },
  { id: 8, requiredLevel: 17, cost: 1350, rentIncrease: 30 },
  { id: 9, requiredLevel: 21, cost: 1900, rentIncrease: 40 },
  { id: 10, requiredLevel: 23, cost: 2100, rentIncrease: 40 },
  { id: 11, requiredLevel: 25, cost: 2300, rentIncrease: 40 },
  { id: 12, requiredLevel: 27, cost: 2500, rentIncrease: 40 },
  { id: 13, requiredLevel: 31, cost: 3300, rentIncrease: 40 },
  { id: 14, requiredLevel: 33, cost: 3550, rentIncrease: 50 },
  { id: 15, requiredLevel: 35, cost: 3800, rentIncrease: 50 },
  { id: 16, requiredLevel: 37, cost: 4050, rentIncrease: 50 },
  { id: 17, requiredLevel: 41, cost: 5100, rentIncrease: 60 },
  { id: 18, requiredLevel: 43, cost: 5400, rentIncrease: 60 },
  { id: 19, requiredLevel: 45, cost: 5700, rentIncrease: 60 },
  { id: 20, requiredLevel: 47, cost: 6000, rentIncrease: 60 },
];

export const getExpansionDimensions = (level: number) => {
  return { 
    extraW: level * EXPANSION_WIDTH_STEP, 
    extraH: level * EXPANSION_HEIGHT_STEP 
  };
};
