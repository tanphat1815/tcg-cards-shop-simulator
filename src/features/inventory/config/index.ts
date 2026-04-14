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
}

export const STOCK_ITEMS: Record<string, StockItemInfo> = {
  // Empty for now, will be populated by API or defined here
};
