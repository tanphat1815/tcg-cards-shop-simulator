/**
 * Rarity Registry - Quản lý bậc hiếm và logic liên quan đến thẻ bài.
 */

export const HIGH_RARITY_LIST = [
  'Rare', 'Double Rare', 'Ultra Rare', 'Secret Rare',
  'Illustration Rare', 'Special Illustration Rare',
  'Hyper Secret Rare', 'Mega Secret Rare', 'Ghost Rare'
];

/**
 * Kiểm tra xem thẻ có phải là thẻ hiếm (hỗ trợ hiệu ứng holo) hay không.
 */
export function isHighRarity(card: any): boolean {
  if (!card?.rarity) return false;
  return HIGH_RARITY_LIST.includes(card.rarity);
}

/**
 * Trả về thông tin badge cho độ hiếm.
 */
export function getRarityBadge(card: any): { label: string; cssClass: string } {
  const rarity = card?.rarity || 'Common';
  
  if (['Ghost Rare', 'Hyper Secret Rare', 'Mega Secret Rare'].includes(rarity)) {
    return { label: rarity, cssClass: 'rarity-ghost' };
  }
  if (['Special Illustration Rare', 'Secret Rare', 'Ultra Rare'].includes(rarity)) {
    return { label: rarity, cssClass: 'rarity-ultra' };
  }
  if (['Illustration Rare', 'Double Rare', 'Rare'].includes(rarity)) {
    return { label: rarity, cssClass: 'rarity-rare' };
  }
  if (rarity === 'Uncommon') {
    return { label: 'Uncommon', cssClass: 'rarity-uncommon' };
  }
  return { label: 'Common', cssClass: 'rarity-common' };
}
