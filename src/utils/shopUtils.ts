import { BASE_SHOP_WIDTH, BASE_SHOP_HEIGHT } from '../config/expansionData'

/**
 * Tính toán ranh giới (Bounds) của cửa hàng dựa trên level mở rộng.
 * @param level Cấp độ mở rộng của cửa hàng.
 * @returns Đối tượng chứa x, y, width, height.
 */
export function getShopBounds(level: number) {
  const baseW = BASE_SHOP_WIDTH || 400
  const baseH = BASE_SHOP_HEIGHT || 400
  const extra = level * 100
  
  return {
    x: 1100 - (baseW + extra) / 2,
    y: 1100 - (baseH + extra) / 2,
    w: baseW + extra,
    h: baseH + extra
  }
}
