/**
 * Các kiểu dữ liệu cơ bản cho hệ thống thẻ bài và cửa hàng.
 */

export interface CardData {
  id: string
  name: string
  hp: number
  type: string
  rarity: string
  marketPrice: number
  imageKey: string
}

/**
 * Trạng thái công việc của nhân viên.
 */
export type WorkerDuty = 'NONE' | 'CASHIER' | 'STOCKER'

/**
 * Dữ liệu nhân viên đã thuê.
 */
export interface HiredWorker {
  instanceId: string;
  workerId: string;
  duty: WorkerDuty;
}

/**
 * Dữ liệu của một tầng trên kệ hàng.
 */
export interface ShelfTier {
  itemId: string | null;      // Vật phẩm đang bày bán trên tầng này
  slots: (string | null)[];  // Danh sách các ID vật phẩm trong từng slot
  maxSlots: number;          // Số lượng slot tối đa (32 cho pack, 4 cho box)
}

/**
 * Dữ liệu của một kệ hàng (Shelf).
 */
export interface ShelfData {
  id: string;
  furnitureId: string; // ID loại kệ từ FURNITURE_ITEMS
  x: number;
  y: number;
  tiers: ShelfTier[]; // Kệ có 3 tầng
}

/**
 * Dữ liệu của bàn đấu bài.
 */
export interface PlayTableData {
  id: string;
  furnitureId: string;
  x: number;
  y: number;
  occupants: (string | null)[]; // ID của khách đang ngồi [ghế 1, ghế 2]
  matchStartedAt: number | null; // Thời điểm trận đấu bắt đầu (ms)
}

/**
 * Dữ liệu của quầy thu ngân.
 */
export interface CashierData {
  id: string;
  furnitureId: string;
  x: number;
  y: number;
}
