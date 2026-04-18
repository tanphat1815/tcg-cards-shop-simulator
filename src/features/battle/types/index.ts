/**
 * Battle System Types
 * Dựa trên CardData từ inventory/store/cardDetailStore.ts
 * BattleCard = CardData + các thuộc tính trận đấu
 */

/** Hệ Năng lượng trong Pokémon TCG */
export type EnergyType =
  | 'Colorless' | 'Fire' | 'Water' | 'Grass' | 'Lightning'
  | 'Psychic' | 'Fighting' | 'Darkness' | 'Metal' | 'Dragon' | 'Fairy'

/** Chế độ chơi */
export type BattleMode = 'BASIC' | 'ADVANCED'

/** Người chơi */
export type PlayerSide = 'player' | 'enemy'

/** Trạng thái trận đấu */
export type BattlePhase =
  | 'IDLE'          // Chưa bắt đầu
  | 'SETUP'         // Đang chọn deck
  | 'BATTLE'        // Đang đánh
  | 'VICTORY'       // Người chơi thắng
  | 'DEFEAT'        // Người chơi thua

/** Một đòn đánh (Attack) đã được parse */
export interface ParsedAttack {
  name: string
  damage: number          // Sát thương đã parse thành số nguyên
  rawDamage: string       // Chuỗi gốc vd "50+", "120x"
  text: string            // Mô tả hiệu ứng
  cost: string[]          // Mảng hệ Năng lượng cần thiết ["Fire", "Colorless"]
}

/** Thẻ bài trong trận đấu (kế thừa data từ SQLite, thêm thuộc tính chiến đấu) */
export interface BattleCard {
  // === Thông tin gốc từ database ===
  id: string
  name: string
  image?: string          // URL ảnh từ TCGdex
  hp: number              // HP tối đa (parse từ string sang số)
  rarity?: string
  types?: string[]        // Hệ của Pokémon ["Fire"]
  weaknesses?: Array<{ type: string; value: string }>   // Điểm yếu
  resistances?: Array<{ type: string; value: string }>  // Kháng cự
  retreat?: number        // Chi phí rút lui (số lượng Colorless cần)
  attacks: ParsedAttack[] // Đòn đánh đã parse

  // === Raw card data để mở CardDetail ===
  rawCardData?: any

  // === Thuộc tính chiến đấu (thêm vào khi vào trận) ===
  currentHp: number            // HP hiện tại
  attachedEnergies: string[]   // Mảng các hệ năng lượng đang gắn vd ["Fire", "Fire"]
  isKnockedOut: boolean        // Đã bị loại chưa
  isActive: boolean            // Đang ở vị trí tiền tuyến (Active) không

  // === Index trong đội ===
  teamIndex: number            // 0 = Active, 1-4 = Bench

  // === Hit effect flag ===
  isHit: boolean               // Đang trong trạng thái bị đánh (animate-shake)
}

/** Log một sự kiện trong trận đấu */
export interface BattleLog {
  id: string
  text: string
  type: 'info' | 'attack' | 'ko' | 'energy' | 'retreat' | 'system'
  timestamp: number
}

/** State đầy đủ của trận đấu */
export interface BattleState {
  phase: BattlePhase
  mode: BattleMode
  currentTurn: PlayerSide
  hasAttachedEnergyThisTurn: boolean  // Chế độ ADVANCED: mỗi lượt chỉ gắn 1 năng lượng
  turnNumber: number

  playerTeam: (BattleCard | null)[]   // 5 slots, index 0 = Active
  enemyTeam: (BattleCard | null)[]    // 5 slots, index 0 = Active (AI)

  selectedAttackIndex: number | null   // Đòn đang được chọn
  logs: BattleLog[]
  winner: PlayerSide | null

  // === Deck Setup Phase ===
  selectedDeckCardIds: string[]        // IDs thẻ người chơi đã chọn để đánh
}
