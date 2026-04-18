/**
 * BattleLogic.ts
 * Class thuần TypeScript chứa logic tính toán trận đấu.
 * KHÔNG import bất kỳ Vue store nào ở đây.
 * Nhận data vào, trả kết quả ra — thuần hàm (pure functions).
 */

import type { BattleCard, ParsedAttack, EnergyType } from '../types'

export class BattleLogic {

  // ─────────────────────────────────────────────────────────────────
  // 1. PARSE DATA TỪ DATABASE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Parse chuỗi HP ("120", "90") thành số nguyên.
   * Trả về 60 nếu không hợp lệ (HP tối thiểu để game không lỗi).
   */
  static parseHp(hpValue: any): number {
    if (typeof hpValue === 'number') return Math.max(10, hpValue)
    if (typeof hpValue === 'string') {
      const parsed = parseInt(hpValue.replace(/\D/g, ''), 10)
      return isNaN(parsed) ? 60 : Math.max(10, parsed)
    }
    return 60
  }

  /**
   * Parse chuỗi sát thương ("50+", "120x", "30", "") thành số nguyên.
   * Regex lấy số đầu tiên trong chuỗi.
   * Nếu không có số → trả về 10 (sát thương tối thiểu).
   */
  static parseDamage(dmgString: string | number | undefined | null): number {
    if (typeof dmgString === 'number') return Math.max(0, dmgString)
    if (!dmgString || dmgString === '') return 10
    const match = String(dmgString).match(/(\d+)/)
    if (!match) return 10
    return parseInt(match[1], 10)
  }

  /**
   * Parse chi phí rút lui (retreat).
   * Trong database là số nguyên, nhưng đôi khi có thể là null/undefined.
   */
  static parseRetreat(retreatValue: any): number {
    if (typeof retreatValue === 'number') return Math.max(0, retreatValue)
    if (typeof retreatValue === 'string') {
      const parsed = parseInt(retreatValue, 10)
      return isNaN(parsed) ? 0 : Math.max(0, parsed)
    }
    return 0
  }

  /**
   * Parse mảng attacks từ dữ liệu thô database thành ParsedAttack[].
   * attacks trong DB là JSON array, mỗi item có: name, damage, text, cost
   */
  static parseAttacks(rawAttacks: any): ParsedAttack[] {
    if (!rawAttacks || !Array.isArray(rawAttacks)) return []

    return rawAttacks
      .filter((atk: any) => atk && atk.name) // Bỏ attacks không có tên
      .map((atk: any): ParsedAttack => ({
        name: atk.name || 'Unknown Attack',
        damage: BattleLogic.parseDamage(atk.damage),
        rawDamage: String(atk.damage || '0'),
        text: atk.text || atk.effect || '',
        cost: Array.isArray(atk.cost) ? atk.cost : []
      }))
  }

  /**
   * Chuyển đổi một thẻ bài từ database thành BattleCard sẵn sàng cho trận đấu.
   * @param cardData Dữ liệu thẻ từ SQLite (đã qua processCardRow trong apiStore)
   * @param teamIndex Vị trí trong đội (0 = Active, 1-4 = Bench)
   */
  static createBattleCard(cardData: any, teamIndex: number): BattleCard {
    const hp = BattleLogic.parseHp(cardData.hp)
    const attacks = BattleLogic.parseAttacks(cardData.attacks)

    return {
      // Thông tin gốc
      id: cardData.id || `card_${Date.now()}_${Math.random()}`,
      name: cardData.name || 'Unknown Pokémon',
      image: cardData.image,
      hp,
      rarity: cardData.rarity,
      types: Array.isArray(cardData.types) ? cardData.types : [],
      weaknesses: Array.isArray(cardData.weaknesses) ? cardData.weaknesses : [],
      resistances: Array.isArray(cardData.resistances) ? cardData.resistances : [],
      retreat: BattleLogic.parseRetreat(cardData.retreatCost ?? cardData.retreat),
      attacks,
      rawCardData: cardData,

      // Thuộc tính chiến đấu
      currentHp: hp,
      attachedEnergies: [],
      isKnockedOut: false,
      isActive: teamIndex === 0,
      teamIndex,
      isHit: false,
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. TÍNH TOÁN SÁT THƯƠNG
  // ─────────────────────────────────────────────────────────────────

  /**
   * Kiểm tra xem attackType có phải điểm yếu của defender không.
   */
  static isWeakness(attackType: string, defender: BattleCard): boolean {
    if (!defender.weaknesses || !attackType) return false
    return defender.weaknesses.some(w =>
      w.type && w.type.toLowerCase() === attackType.toLowerCase()
    )
  }

  /**
   * Kiểm tra xem attackType có phải kháng cự của defender không.
   */
  static isResistance(attackType: string, defender: BattleCard): boolean {
    if (!defender.resistances || !attackType) return false
    return defender.resistances.some(r =>
      r.type && r.type.toLowerCase() === attackType.toLowerCase()
    )
  }

  /**
   * Tính sát thương cuối cùng sau khi áp dụng Weakness và Resistance.
   *
   * Luật chuẩn:
   * - Weakness: sát thương x2
   * - Resistance: sát thương - 30 (tối thiểu 10)
   *
   * @param baseDamage Sát thương cơ bản từ đòn đánh
   * @param attackerTypes Hệ của Pokémon tấn công
   * @param attackCost Chi phí đòn đánh (để xác định loại năng lượng chính)
   * @param defender Pokémon đang phòng thủ
   */
  static calculateDamage(
    baseDamage: number,
    attackerTypes: string[],
    attackCost: string[],
    defender: BattleCard
  ): { finalDamage: number; isWeakness: boolean; isResistance: boolean } {
    let damage = baseDamage
    let weakness = false
    let resistance = false

    // Xác định hệ tấn công: ưu tiên hệ của Pokémon
    const attackTypes = attackerTypes.length > 0
      ? attackerTypes
      : attackCost.filter(c => c !== 'Colorless')

    for (const type of attackTypes) {
      if (BattleLogic.isWeakness(type, defender)) {
        damage = damage * 2
        weakness = true
      }
      if (BattleLogic.isResistance(type, defender)) {
        damage = Math.max(10, damage - 30)
        resistance = true
      }
    }

    return {
      finalDamage: Math.max(0, damage),
      isWeakness: weakness,
      isResistance: resistance
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. KIỂM TRA ĐIỀU KIỆN (CHẾ ĐỘ ADVANCED)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Kiểm tra xem Pokémon có đủ năng lượng để dùng đòn đánh không (Chế độ ADVANCED).
   * Năng lượng "Colorless" có thể được thay thế bởi BẤT KỲ hệ nào.
   */
  static canUseAttack(card: BattleCard, attack: ParsedAttack): boolean {
    if (!attack.cost || attack.cost.length === 0) return true // Free attack
    const attached = [...card.attachedEnergies]
    const colorlessCost = attack.cost.filter(c => c === 'Colorless').length
    const specificCosts = attack.cost.filter(c => c !== 'Colorless')

    // Đầu tiên, thỏa mãn các yêu cầu năng lượng cụ thể
    for (const needed of specificCosts) {
      const idx = attached.findIndex(e => e.toLowerCase() === needed.toLowerCase())
      if (idx === -1) return false // Thiếu năng lượng đặc thù
      attached.splice(idx, 1)
    }

    // Sau đó, thỏa mãn Colorless bằng năng lượng còn lại
    return attached.length >= colorlessCost
  }

  /**
   * Kiểm tra điều kiện rút lui (Chế độ ADVANCED).
   * Pokémon phải có số năng lượng >= retreat cost.
   */
  static canRetreat(card: BattleCard): boolean {
    const retreatCost = card.retreat ?? 0
    if (retreatCost === 0) return true // Free retreat
    return card.attachedEnergies.length >= retreatCost
  }

  /**
   * Xử lý rút lui: Vứt bỏ năng lượng, trả về mảng energy còn lại.
   */
  static applyRetreat(card: BattleCard): string[] {
    const retreatCost = card.retreat ?? 0
    if (retreatCost === 0) return card.attachedEnergies

    const remaining = [...card.attachedEnergies]
    let toDiscard = retreatCost

    for (let i = remaining.length - 1; i >= 0 && toDiscard > 0; i--) {
      remaining.splice(i, 1)
      toDiscard--
    }

    return remaining
  }

  // ─────────────────────────────────────────────────────────────────
  // 4. AI LOGIC (Đơn giản)
  // ─────────────────────────────────────────────────────────────────

  /**
   * AI chọn đòn tấn công: Chọn đòn có sát thương cao nhất có thể dùng.
   * Trong chế độ BASIC: Có thể dùng mọi đòn.
   * Trong chế độ ADVANCED: Chỉ dùng đòn đủ năng lượng.
   */
  static aiChooseAttack(
    attacker: BattleCard,
    mode: 'BASIC' | 'ADVANCED'
  ): ParsedAttack | null {
    if (!attacker.attacks || attacker.attacks.length === 0) return null

    const usableAttacks = mode === 'BASIC'
      ? attacker.attacks
      : attacker.attacks.filter(atk => BattleLogic.canUseAttack(attacker, atk))

    if (usableAttacks.length === 0) return null

    // Chọn đòn có sát thương cao nhất
    return usableAttacks.reduce((best, atk) =>
      atk.damage > best.damage ? atk : best
    )
  }

  /**
   * AI quyết định gắn năng lượng vào đâu (Chế độ ADVANCED).
   * Chiến lược đơn giản: Gắn vào Active Pokémon nếu có.
   */
  static aiChooseEnergyTarget(enemyTeam: (BattleCard | null)[]): number {
    const active = enemyTeam[0]
    if (active && !active.isKnockedOut) return 0

    for (let i = 1; i < enemyTeam.length; i++) {
      const card = enemyTeam[i]
      if (card && !card.isKnockedOut) return i
    }
    return -1
  }

  /**
   * AI chọn Pokémon thay thế khi Active bị KO.
   */
  static aiChooseReplacement(team: (BattleCard | null)[]): number {
    for (let i = 1; i < team.length; i++) {
      if (team[i] && !team[i]!.isKnockedOut) return i
    }
    return -1
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. KIỂM TRA TRẠNG THÁI THẮNG/THUA
  // ─────────────────────────────────────────────────────────────────

  /**
   * Kiểm tra xem một đội có bị tiêu diệt hoàn toàn không.
   */
  static isTeamDefeated(team: (BattleCard | null)[]): boolean {
    return team.every(card => !card || card.isKnockedOut)
  }

  /**
   * Trả về bên thắng nếu có, null nếu trận đấu đang diễn ra.
   */
  static checkWinner(
    playerTeam: (BattleCard | null)[],
    enemyTeam: (BattleCard | null)[]
  ): 'player' | 'enemy' | null {
    if (BattleLogic.isTeamDefeated(enemyTeam)) return 'player'
    if (BattleLogic.isTeamDefeated(playerTeam)) return 'enemy'
    return null
  }

  // ─────────────────────────────────────────────────────────────────
  // 6. UTILITIES
  // ─────────────────────────────────────────────────────────────────

  /** Tạo ID ngẫu nhiên cho battle log */
  static generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  }

  /** Lấy tên hệ năng lượng ngẫu nhiên để AI gắn vào Pokémon */
  static getRandomEnergyType(pokemonTypes: string[]): string {
    if (pokemonTypes && pokemonTypes.length > 0) {
      return pokemonTypes[0] // Gắn đúng hệ của Pokémon
    }
    const types: EnergyType[] = ['Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Colorless']
    return types[Math.floor(Math.random() * types.length)]
  }

  /**
   * Mô tả chi phí năng lượng thành emoji/text dễ đọc.
   */
  static formatEnergyCost(cost: string[]): string {
    const emojiMap: Record<string, string> = {
      'Fire': '🔥', 'Water': '💧', 'Grass': '🌿', 'Lightning': '⚡',
      'Psychic': '🔮', 'Fighting': '👊', 'Darkness': '🌑', 'Metal': '⚙️',
      'Dragon': '🐉', 'Fairy': '✨', 'Colorless': '⚪'
    }
    if (!cost || cost.length === 0) return 'Miễn phí'
    return cost.map(c => emojiMap[c] || c).join('')
  }

  /**
   * Tính phần trăm HP còn lại của một BattleCard.
   */
  static getHpPercent(card: BattleCard): number {
    if (card.hp <= 0) return 0
    return Math.max(0, Math.min(100, (card.currentHp / card.hp) * 100))
  }

  /**
   * Lấy màu HP bar dựa trên phần trăm HP.
   */
  static getHpColor(percent: number): string {
    if (percent > 50) return '#4ade80'  // Xanh lá
    if (percent > 25) return '#facc15'  // Vàng
    return '#f87171'                    // Đỏ
  }
}
