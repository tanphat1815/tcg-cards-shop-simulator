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
