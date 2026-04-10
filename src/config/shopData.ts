/**
 * Online Shop Data Configuration
 */

export interface StockItemInfo {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  requiredLevel: number;
  isPack: boolean;
  description: string;
}

export interface FurnitureItemInfo {
  id: string;
  name: string;
  buyPrice: number;
  requiredLevel: number;
  capacityStr: string;
  description: string;
}

export const STOCK_ITEMS: Record<string, StockItemInfo> = {
  'basic_pack': {
    id: 'basic_pack',
    name: 'Booster Pack Thường',
    buyPrice: 10,
    sellPrice: 15,
    requiredLevel: 1,
    isPack: true,
    description: 'Chứa 5 thẻ bài chất lượng cơ bản. Tỷ lệ thẻ Rare thấp.'
  },
  'silver_pack': {
    id: 'silver_pack',
    name: 'Silver Booster Pack',
    buyPrice: 25,
    sellPrice: 40,
    requiredLevel: 5,
    isPack: true,
    description: 'Gói bài Bạc. Cơ hội mở ra thẻ Uncommon và Rare cao hơn.'
  },
  'golden_pack': {
    id: 'golden_pack',
    name: 'Golden Box Pack',
    buyPrice: 60,
    sellPrice: 100,
    requiredLevel: 12,
    isPack: true,
    description: 'Hộp bài Vàng. Dành cho giới siêu giàu, nhặt thẻ Rare mỏi tay.'
  }
};

export const FURNITURE_ITEMS: Record<string, FurnitureItemInfo> = {
  'shelf_single': {
    id: 'shelf_single',
    name: 'Single Sided Shelf',
    buyPrice: 300,
    requiredLevel: 3,
    capacityStr: '48 Slots (3x16)',
    description: 'Kệ gỗ 1 mặt tiêu chuẩn. Có thể bày 48 hộp bài.'
  },
  'shelf_double': {
    id: 'shelf_double',
    name: 'Double Sided Shelf',
    buyPrice: 750,
    requiredLevel: 11,
    capacityStr: '96 Slots (6x16)',
    description: 'Kệ trung tâm 2 mặt cao cấp. Sinh lời cực mạnh.'
  }
};
