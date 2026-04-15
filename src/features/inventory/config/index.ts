export interface StockItemInfo {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  requiredLevel: number;
  type: 'pack' | 'box';
  volume: number; // Volume slot capacity (1 slot = MAX_VOLUME 32)
  contains?: { itemId: string; amount: number }; // Used for unboxing
  description: string;
  sourceSetId?: string; // Store original set ID from API for pack opening
  generation?: string; // e.g. "GENERATION IV"
}

export const STOCK_ITEMS: Record<string, StockItemInfo> = {
  // Empty for now, will be populated by API or defined here
};

// List of Set IDs that should not appear in the shop (e.g. empty card lists or broken metadata)
export const SET_BLACKLIST = [
  'wp', // Wizards Black Star Promos (empty card list in TCGdex)
];
