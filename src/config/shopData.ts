/**
 * Online Shop Data Configuration
 */

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

export interface FurnitureItemInfo {
  id: string;
  name: string;
  buyPrice: number;
  requiredLevel: number;
  capacityStr: string;
  description: string;
  /** Số tầng của kệ hàng (Ví dụ: 3 cho kệ đơn, 4 cho kệ đôi) */
  numTiers?: number;
  /** Sức chứa tối đa của mỗi tầng (Ví dụ: 16 cho kệ đơn, 32 cho kệ đôi) */
  slotsPerTier?: number;
}

export const STOCK_ITEMS: Record<string, StockItemInfo> = {
  // 'pack_basic': {
  //   id: 'pack_basic',
  //   name: 'Basic Card Pack',
  //   buyPrice: 1,
  //   sellPrice: 5,
  //   requiredLevel: 1,
  //   type: 'pack',
  //   volume: 1,
  //   description: 'Pack cơ bản dùng để khởi nghiệp. Chứa 8 thẻ bài ngẫu nhiên.'
  // },
  // 'box_basic_32': {
  //   id: 'box_basic_32',
  //   name: 'Basic Card Box (32 Packs)',
  //   buyPrice: 50,
  //   sellPrice: 100,
  //   requiredLevel: 2,
  //   type: 'box',
  //   volume: 8,
  //   contains: { itemId: 'pack_basic', amount: 32 },
  //   description: 'Hộp nguyên kiện 32 Packs để bán sỉ hoặc thỏa mãn thú vui xé hộp.'
  // },
  // 'pack_rare': {
  //   id: 'pack_rare',
  //   name: 'Rare Card Pack',
  //   buyPrice: 3,
  //   sellPrice: 14,
  //   requiredLevel: 8,
  //   type: 'pack',
  //   volume: 1,
  //   description: 'Pack cao cấp. Tăng đáng kể tỉ lệ ra thẻ Rare (15%).'
  // },
  // 'box_rare_32': {
  //   id: 'box_rare_32',
  //   name: 'Rare Card Box (32 Packs)',
  //   buyPrice: 300,
  //   sellPrice: 500,
  //   requiredLevel: 8,
  //   type: 'box',
  //   volume: 8,
  //   contains: { itemId: 'pack_rare', amount: 32 },
  //   description: 'Hộp hiếm nguyên seal. Lợi nhuận siêu khổng lồ.'
  // }
};

export const FURNITURE_ITEMS: Record<string, FurnitureItemInfo> = {
  'shelf_single': {
    id: 'shelf_single',
    name: 'Single Sided Shelf',
    buyPrice: 300,
    requiredLevel: 3,
    capacityStr: '48 Slots (3x16)',
    description: 'Kệ gỗ 1 mặt tiêu chuẩn. Có thể bày 48 hộp bài.',
    numTiers: 3,
    slotsPerTier: 16
  },
  'shelf_double': {
    id: 'shelf_double',
    name: 'Double Sided Shelf',
    buyPrice: 750,
    requiredLevel: 11,
    capacityStr: '128 Slots (4x32)',
    description: 'Kệ trung tâm 2 mặt cao cấp. Sinh lời cực mạnh.',
    numTiers: 4,
    slotsPerTier: 32
  },
  'play_table': {
    id: 'play_table',
    name: 'Play Table',
    buyPrice: 400,
    requiredLevel: 5,
    capacityStr: '2 Players',
    description: 'Bàn chơi bài cho khách hàng. Tạo XP thụ động khi có người thi đấu.'
  },
  'cashier_desk': {
    id: 'cashier_desk',
    name: 'Cashier Desk',
    buyPrice: 500,
    requiredLevel: 1,
    capacityStr: '1 Staff',
    description: 'Quầy thu ngân tiêu chuẩn. Nơi khách mang hàng tới thanh toán.'
  }
};
