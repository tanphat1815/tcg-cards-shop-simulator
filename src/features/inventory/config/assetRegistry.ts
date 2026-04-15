/**
 * Asset Registry - Hệ thống quản lý tài nguyên hình ảnh tập trung.
 * Tuân thủ các nguyên tắc:
 * 1. Static Assets: Sử dụng đường dẫn chuỗi (Public folder), không import trực tiếp.
 * 2. TCGdex Sync: Key mapping dựa trên setId của TCGdex API.
 * 3. WebP Preference: Ưu tiên định dạng .webp, hỗ trợ nội suy đường dẫn.
 */

// Các hằng số thư mục gốc (nằm trong thư mục public/)
const BASE_PATH = '/assets';
const PACKS_PATH = `${BASE_PATH}/packs`;
const BOXES_PATH = `${BASE_PATH}/boxes`;
const CARDS_PATH = `${BASE_PATH}/cards`;
const ENTITIES_PATH = `${BASE_PATH}/entities`;

const DEFAULT_IMAGE_EXT = 'webp';

export type AssetType = 'pack' | 'box' | 'card' | 'entity';

/**
 * Cấu hình thủ công cho các asset đặc biệt hoặc không tuân theo quy tắc đặt tên setId.
 */
export const ASSET_OVERRIDES: {
  packs: Record<string, { front?: string; back?: string; ext?: string }>;
  boxes: Record<string, { front?: string; back?: string; ext?: string }>;
  cards: { back: string };
  entities: Record<string, string>;
} = {
  packs: {
    // Ví dụ: 'base1': { front: '/assets/packs/custom_base1.webp' }
  },
  boxes: {},
  cards: {
    back: `${CARDS_PATH}/back.webp`, // Mặt sau thẻ bài mặc định
  },
  entities: {
    'npc_cashier': `${ENTITIES_PATH}/npc/cashier.webp`,
    'npc_customer': `${ENTITIES_PATH}/npc/customer.webp`,
    'shelf_basic': `${ENTITIES_PATH}/furniture/shelf_basic.webp`,
  },
};

/**
 * Hàm lấy đường dẫn ảnh Pack dựa trên setId.
 * Tự động nội suy nếu không có override.
 */
export function getPackVisuals(setId: string) {
  const override = ASSET_OVERRIDES.packs[setId];
  const ext = override?.ext || DEFAULT_IMAGE_EXT;

  return {
    front: override?.front || `${PACKS_PATH}/${setId}.${ext}`,
    back: override?.back || `${PACKS_PATH}/back.${ext}`,
  };
}

/**
 * Hàm lấy đường dẫn ảnh Box dựa trên setId.
 */
export function getBoxVisuals(setId: string) {
  const override = ASSET_OVERRIDES.boxes[setId];
  const ext = override?.ext || DEFAULT_IMAGE_EXT;

  return {
    front: override?.front || `${BOXES_PATH}/${setId}.${ext}`,
    back: override?.back || `${BOXES_PATH}/back.${ext}`,
  };
}

/**
 * Lấy mặt sau thẻ bài.
 */
export function getCardBackUrl() {
  return ASSET_OVERRIDES.cards.back;
}

/**
 * Lấy các asset linh tinh khác (NPC, Furniture...).
 */
export function getMiscAsset(key: string): string {
  return ASSET_OVERRIDES.entities[key] || '';
}

/**
 * Utility: Kiểm tra xem một item có ảnh trong public không (giả định dựa trên setId).
 * Có thể mở rộng để check file tồn tại nếu cần.
 */
export function hasCustomVisual(_type: 'pack' | 'box', setId?: string): boolean {
  if (!setId) return false;
  // Trong môi trường này, ta luôn trả về true để UI ưu tiên render <img> 
  // và dùng thuộc tính @error để fallback về icon nếu file 404.
  return true;
}
