# BATTLE_SYSTEM_IMPLEMENTATION_GUIDE.md
## Hướng dẫn Triển khai Tính năng Đấu Bài Pokémon (5v5 Arena)

**Phiên bản:** 1.0  
**Ngày soạn:** 2026-04-17  
**Mục tiêu:** Hướng dẫn đầy đủ để AI Agent (không biết gì về dự án) có thể triển khai tính năng Battle Arena hoàn chỉnh, đúng kiến trúc, không làm vỡ các tính năng hiện có.

---

## ⚠️ NGUYÊN TẮC BẮT BUỘC — ĐỌC TRƯỚC KHI LÀM BẤT CỨ ĐIỀU GÌ

1. **KHÔNG XÓA FILE CŨ.** Chỉ tạo file mới, sau đó cập nhật import.
2. **CHẠY `npm run build` SAU MỖI BƯỚC LỚN.** Nếu lỗi → fix ngay tại bước đó.
3. **Logic → Store, UI → Component.** Mọi tính toán nằm trong Pinia Store hoặc Class logic. Component Vue chỉ render.
4. **Giao tiếp qua Pinia.** Phaser ↔ Vue chỉ giao tiếp qua Pinia store (xem Section 6 trong `PROJECT_ARCHITECTURE.md`).
5. **Sử dụng lại component cũ.** `PokemonCard3D.vue` PHẢI được tái sử dụng cho battle cards.
6. **KHÔNG đặt import Store ở cấp module.** Luôn gọi `useXxxStore()` bên trong một function/action để tránh circular dependency.

---

## 📁 TỔNG QUAN CẤU TRÚC DỰ ÁN HIỆN TẠI

Trước khi làm, hãy hiểu tổng quan. Dự án dùng **Vue 3 + Phaser 3 + Pinia** theo kiến trúc **Feature-based**.

```
src/
├── features/
│   ├── battle/            ← THƯ MỤC MỚI SẼ TẠO
│   ├── inventory/         ← Quản lý thẻ bài, pack, API
│   │   ├── store/
│   │   │   ├── apiStore.ts        ← Lấy data thẻ từ SQLite
│   │   │   ├── inventoryStore.ts  ← Kho hàng, binder
│   │   │   └── cardDetailStore.ts ← Chi tiết thẻ
│   │   └── config/
│   │       └── rarityRegistry.ts  ← isHighRarity(), getRarityBadge()
│   ├── shop-ui/           ← Facade store, GameContainer, UIOverlay
│   │   └── store/
│   │       └── gameStore.ts   ← FACADE STORE (điểm vào duy nhất cho UI)
│   ├── stats/             ← statsStore (tiền, level, exp)
│   ├── furniture/         ← furnitureStore
│   ├── customer/          ← customerStore
│   └── shared/
│       └── components/
│           ├── PokemonCard3D.vue   ← PHẢI TÁI SỬ DỤNG
│           └── EnhancedButton.vue  ← Dùng cho mọi nút bấm
├── game/
│   └── MainScene.ts        ← Phaser scene chính (KHÔNG CHỈNH SỬA)
└── App.vue                 ← Import component vào đây
```

### Các file sẽ tạo mới:
| File | Mục đích |
|------|---------|
| `src/features/battle/types/index.ts` | Type định nghĩa |
| `src/features/battle/managers/BattleLogic.ts` | Logic tính toán thuần |
| `src/features/battle/store/battleStore.ts` | Pinia Store |
| `src/features/battle/components/BattleArena.vue` | Giao diện chính |
| `src/features/battle/components/BattleHelpDialog.vue` | Dialog luật chơi |

### Các file sẽ chỉnh sửa:
| File | Thay đổi |
|------|---------|
| `src/App.vue` | Import và mount `BattleArena.vue` |
| `src/features/shop-ui/components/UIOverlay.vue` | Thêm nút mở Battle Arena |
| `src/features/shop-ui/store/gameStore.ts` | Thêm getter/action cho battle |

---

## BƯỚC 0: XÁC NHẬN MÔI TRƯỜNG

Trước khi code, chạy lệnh sau để đảm bảo project đang build thành công:

```bash
npm run build
```

**Nếu thấy lỗi trước khi bắt đầu → DỪNG LẠI, báo cáo lỗi. KHÔNG tiếp tục.**

Sau đó kiểm tra database có data không:

```bash
# Kiểm tra file SQLite tồn tại
ls public/data/cards.sqlite
```

File `cards.sqlite` phải tồn tại. Nếu không, tính năng gacha và battle sẽ không có data thẻ bài.

---

## BƯỚC 1: TẠO TYPES (src/features/battle/types/index.ts)

Tạo thư mục và file types đầu tiên:

```bash
mkdir -p src/features/battle/types
mkdir -p src/features/battle/managers
mkdir -p src/features/battle/store
mkdir -p src/features/battle/components
```

**Tạo file `src/features/battle/types/index.ts`:**

```typescript
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
  | 'SETUP'         // Đang chọn đội
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

  // === Thuộc tính chiến đấu (thêm vào khi vào trận) ===
  currentHp: number            // HP hiện tại
  attachedEnergies: string[]   // Mảng các hệ năng lượng đang gắn vd ["Fire", "Fire"]
  isKnockedOut: boolean        // Đã bị loại chưa
  isActive: boolean            // Đang ở vị trí tiền tuyến (Active) không

  // === Index trong đội ===
  teamIndex: number            // 0 = Active, 1-4 = Bench
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
}
```

**Kiểm tra:** File này chỉ là type definitions, không cần build check. Tiếp tục bước 2.

---

## BƯỚC 2: TẠO BATTLE LOGIC CLASS (src/features/battle/managers/BattleLogic.ts)

File này chứa toàn bộ logic tính toán **KHÔNG** dùng Vue reactivity. Đây là class thuần TypeScript.

**Tạo file `src/features/battle/managers/BattleLogic.ts`:**

```typescript
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

      // Thuộc tính chiến đấu
      currentHp: hp,
      attachedEnergies: [],
      isKnockedOut: false,
      isActive: teamIndex === 0,
      teamIndex
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
   * - Có thể vừa có Weakness VỪA có Resistance (hiếm nhưng có trong game)
   *
   * @param baseDamage Sát thương cơ bản từ đòn đánh
   * @param attackerTypes Hệ của Pokémon tấn công (thường [types[0]])
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

    // Xác định hệ tấn công: ưu tiên hệ của Pokémon, không có thì dùng hệ đầu của cost
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
   *
   * Thuật toán: Đếm từng loại năng lượng trong cost, kiểm tra với attachedEnergies.
   * Colorless được thỏa mãn bởi bất kỳ năng lượng dư nào.
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
   * Xử lý rút lui: Vứt bỏ (retreat) năng lượng, trả về mảng energy còn lại.
   * Ưu tiên vứt Colorless trước, sau đó vứt năng lượng đặc thù.
   */
  static applyRetreat(card: BattleCard): string[] {
    const retreatCost = card.retreat ?? 0
    if (retreatCost === 0) return card.attachedEnergies

    const remaining = [...card.attachedEnergies]
    let toDiscard = retreatCost

    // Vứt Colorless/non-specific trước
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
   * AI quyết định có nên gắn năng lượng không và gắn vào đâu (Chế độ ADVANCED).
   * Chiến lược đơn giản: Gắn vào Active Pokémon nếu có.
   * Luôn trả về index 0 (Active) nếu còn sống.
   */
  static aiChooseEnergyTarget(enemyTeam: (BattleCard | null)[]): number {
    const active = enemyTeam[0]
    if (active && !active.isKnockedOut) return 0

    // Nếu Active đã chết, gắn vào Bench đầu tiên còn sống
    for (let i = 1; i < enemyTeam.length; i++) {
      const card = enemyTeam[i]
      if (card && !card.isKnockedOut) return i
    }
    return -1 // Không có chỗ gắn
  }

  /**
   * AI chọn Pokémon thay thế khi Active bị KO.
   * Chọn Pokémon Bench đầu tiên còn sống.
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
}
```

**Kiểm tra build:**
```bash
npm run build
```
Nếu lỗi về type → kiểm tra lại file `types/index.ts` đã import đúng chưa.

---

## BƯỚC 3: TẠO BATTLE STORE (src/features/battle/store/battleStore.ts)

Đây là Pinia Store quản lý toàn bộ state trận đấu. **Store này KHÔNG import trực tiếp từ Phaser.**

**Tạo file `src/features/battle/store/battleStore.ts`:**

```typescript
import { defineStore } from 'pinia'
import { BattleLogic } from '../managers/BattleLogic'
import type { BattleCard, BattleLog, BattleMode, BattlePhase, ParsedAttack } from '../types'

/**
 * BattleStore — Quản lý toàn bộ state trận đấu Pokémon.
 *
 * LUỒNG TRẬN ĐẤU:
 * 1. openBattle(cards, mode) → Khởi tạo đội hình từ thẻ trong Binder
 * 2. playerAttack(attackIndex) → Người chơi chọn đòn đánh
 * 3. enemyTurn() (gọi tự động sau playerAttack) → AI thực hiện lượt
 * 4. Lặp lại đến khi có winner
 */
export const useBattleStore = defineStore('battle', {
  state: () => ({
    /** Trạng thái hiển thị Battle Arena */
    isOpen: false,

    /** Chế độ chơi */
    mode: 'BASIC' as BattleMode,

    /** Giai đoạn trận đấu */
    phase: 'IDLE' as BattlePhase,

    /** Lượt hiện tại */
    currentTurn: 'player' as 'player' | 'enemy',

    /** Số lượt đã qua */
    turnNumber: 1,

    /** Đã gắn năng lượng lượt này chưa (chế độ ADVANCED) */
    hasAttachedEnergyThisTurn: false,

    /** Đội người chơi (5 slots, null = trống) */
    playerTeam: Array(5).fill(null) as (BattleCard | null)[],

    /** Đội AI (5 slots, null = trống) */
    enemyTeam: Array(5).fill(null) as (BattleCard | null)[],

    /** Index đòn đang được chọn (UI highlight) */
    selectedAttackIndex: null as number | null,

    /** Lịch sử battle */
    logs: [] as BattleLog[],

    /** Bên thắng */
    winner: null as 'player' | 'enemy' | null,

    /** AI đang thực hiện lượt (block input) */
    isEnemyThinking: false,
  }),

  getters: {
    /** Active Pokémon của người chơi */
    playerActive: (state): BattleCard | null => state.playerTeam[0],

    /** Active Pokémon của AI */
    enemyActive: (state): BattleCard | null => state.enemyTeam[0],

    /** Đội Bench của người chơi (index 1-4) */
    playerBench: (state): (BattleCard | null)[] => state.playerTeam.slice(1),

    /** Đội Bench của AI (index 1-4) */
    enemyBench: (state): (BattleCard | null)[] => state.enemyTeam.slice(1),

    /** Số Pokémon còn sống của người chơi */
    playerAliveCount: (state): number =>
      state.playerTeam.filter(c => c && !c.isKnockedOut).length,

    /** Số Pokémon còn sống của AI */
    enemyAliveCount: (state): number =>
      state.enemyTeam.filter(c => c && !c.isKnockedOut).length,

    /** Trận đấu đang diễn ra không */
    isBattleActive: (state): boolean => state.phase === 'BATTLE',

    /** Có thể thực hiện hành động không */
    canAct: (state): boolean =>
      state.phase === 'BATTLE' &&
      state.currentTurn === 'player' &&
      !state.isEnemyThinking,
  },

  actions: {
    // ─────────────────────────────────────────────────────────────────
    // KHỞI TẠO TRẬN ĐẤU
    // ─────────────────────────────────────────────────────────────────

    /**
     * Mở Battle Arena và khởi tạo trận đấu.
     * @param playerCards Mảng dữ liệu thẻ từ database (tối đa 5)
     * @param mode Chế độ chơi
     */
    openBattle(playerCards: any[], mode: BattleMode = 'BASIC') {
      if (playerCards.length === 0) {
        this.addLog('Cần ít nhất 1 thẻ Pokémon trong Binder để chiến đấu!', 'system')
        return
      }

      this.mode = mode
      this.isOpen = true
      this.phase = 'BATTLE'
      this.currentTurn = 'player'
      this.turnNumber = 1
      this.hasAttachedEnergyThisTurn = false
      this.selectedAttackIndex = null
      this.winner = null
      this.logs = []
      this.isEnemyThinking = false

      // Khởi tạo đội người chơi (tối đa 5 thẻ)
      const playerSlots = playerCards.slice(0, 5)
      this.playerTeam = [
        ...playerSlots.map((card, i) => BattleLogic.createBattleCard(card, i)),
        ...Array(Math.max(0, 5 - playerSlots.length)).fill(null)
      ]

      // Sinh đội AI ngẫu nhiên từ cùng pool thẻ bài
      // Lấy thẻ khác với player để trông đa dạng hơn
      const shuffled = [...playerCards].sort(() => Math.random() - 0.5)
      const enemySlots = shuffled.slice(0, 5)
      this.enemyTeam = [
        ...enemySlots.map((card, i) => BattleLogic.createBattleCard(card, i)),
        ...Array(Math.max(0, 5 - enemySlots.length)).fill(null)
      ]

      this.addLog('⚔️ Trận đấu bắt đầu!', 'system')
      this.addLog(
        `Chế độ: ${mode === 'BASIC' ? 'Cơ bản (không cần Năng lượng)' : 'Nâng cao (Cần gắn Năng lượng)'}`,
        'system'
      )
      this.addLog(
        `Pokémon của bạn: ${this.playerTeam[0]?.name} lên tiền tuyến!`,
        'info'
      )
      this.addLog(
        `Đối thủ: ${this.enemyTeam[0]?.name} lên tiền tuyến!`,
        'info'
      )
    },

    /**
     * Đóng Battle Arena, reset state.
     */
    closeBattle() {
      this.isOpen = false
      this.phase = 'IDLE'
      this.playerTeam = Array(5).fill(null)
      this.enemyTeam = Array(5).fill(null)
      this.logs = []
      this.winner = null
      this.selectedAttackIndex = null
    },

    // ─────────────────────────────────────────────────────────────────
    // HÀNH ĐỘNG NGƯỜI CHƠI
    // ─────────────────────────────────────────────────────────────────

    /**
     * Người chơi tấn công bằng đòn tại index.
     * Sau khi tấn công → Kết thúc lượt → AI thực hiện lượt.
     */
    async playerAttack(attackIndex: number) {
      if (!this.canAct) return

      const attacker = this.playerTeam[0]
      const defender = this.enemyTeam[0]

      if (!attacker || attacker.isKnockedOut) {
        this.addLog('Pokémon Active đã bị loại!', 'system')
        return
      }
      if (!defender || defender.isKnockedOut) {
        this.addLog('Không có đối thủ để tấn công!', 'system')
        return
      }

      const attack = attacker.attacks[attackIndex]
      if (!attack) return

      // Chế độ ADVANCED: Kiểm tra đủ năng lượng
      if (this.mode === 'ADVANCED' && !BattleLogic.canUseAttack(attacker, attack)) {
        this.addLog(
          `⚡ ${attacker.name} chưa đủ Năng lượng để dùng ${attack.name}!`,
          'system'
        )
        return
      }

      // Tính sát thương
      const { finalDamage, isWeakness, isResistance } = BattleLogic.calculateDamage(
        attack.damage,
        attacker.types || [],
        attack.cost,
        defender
      )

      // Áp dụng sát thương
      defender.currentHp = Math.max(0, defender.currentHp - finalDamage)

      // Log
      let logText = `🗡️ ${attacker.name} dùng ${attack.name} gây ${finalDamage} sát thương cho ${defender.name}!`
      if (isWeakness) logText += ' (Điểm Yếu x2!)'
      if (isResistance) logText += ' (Kháng Cự -30)'
      this.addLog(logText, 'attack')

      // Kiểm tra KO
      if (defender.currentHp <= 0) {
        defender.isKnockedOut = true
        this.addLog(`💀 ${defender.name} bị loại!`, 'ko')
        this.promoteEnemyBench()
      }

      this.selectedAttackIndex = null

      // Kiểm tra winner
      if (this.checkAndSetWinner()) return

      // Kết thúc lượt người chơi → AI thực hiện
      this.endPlayerTurn()
    },

    /**
     * Người chơi gắn Năng lượng vào Pokémon (Chế độ ADVANCED).
     * Có thể gắn vào Active hoặc Bench.
     * @param teamIndex Index trong playerTeam (0 = Active, 1-4 = Bench)
     * @param energyType Hệ năng lượng
     */
    attachEnergy(teamIndex: number, energyType: string) {
      if (!this.canAct) return
      if (this.mode === 'ADVANCED' && this.hasAttachedEnergyThisTurn) {
        this.addLog('Chỉ được gắn 1 Năng lượng mỗi lượt!', 'system')
        return
      }

      const card = this.playerTeam[teamIndex]
      if (!card || card.isKnockedOut) return

      card.attachedEnergies.push(energyType)

      if (this.mode === 'ADVANCED') {
        this.hasAttachedEnergyThisTurn = true
      }

      this.addLog(`⚡ Gắn Năng lượng ${energyType} vào ${card.name}!`, 'energy')
    },

    /**
     * Người chơi rút lui Active Pokémon, thay bằng Bench.
     * @param benchIndex Index trong playerBench (0-3 tương ứng với playerTeam 1-4)
     */
    retreat(benchIndex: number) {
      if (!this.canAct) return

      const active = this.playerTeam[0]
      const teamIndex = benchIndex + 1 // Convert từ benchIndex sang teamIndex
      const newActive = this.playerTeam[teamIndex]

      if (!active || active.isKnockedOut) {
        this.addLog('Không có Pokémon Active để rút lui!', 'system')
        return
      }
      if (!newActive || newActive.isKnockedOut) {
        this.addLog('Pokémon Bench đã bị loại!', 'system')
        return
      }

      // Chế độ ADVANCED: Kiểm tra chi phí rút lui
      if (this.mode === 'ADVANCED' && !BattleLogic.canRetreat(active)) {
        this.addLog(
          `${active.name} cần ${active.retreat} Năng lượng để rút lui (hiện có ${active.attachedEnergies.length})!`,
          'system'
        )
        return
      }

      // Chế độ ADVANCED: Vứt bỏ năng lượng
      if (this.mode === 'ADVANCED' && active.retreat && active.retreat > 0) {
        active.attachedEnergies = BattleLogic.applyRetreat(active)
        this.addLog(`♻️ Vứt bỏ ${active.retreat} Năng lượng để rút lui.`, 'retreat')
      }

      // Đổi chỗ Active ↔ Bench
      this.playerTeam[0] = newActive
      this.playerTeam[teamIndex] = active
      this.playerTeam[0]!.isActive = true
      this.playerTeam[0]!.teamIndex = 0
      this.playerTeam[teamIndex]!.isActive = false
      this.playerTeam[teamIndex]!.teamIndex = teamIndex

      this.addLog(`🔄 ${newActive.name} lên tiền tuyến thay ${active.name}!`, 'retreat')

      // Rút lui tốn lượt
      this.endPlayerTurn()
    },

    // ─────────────────────────────────────────────────────────────────
    // LƯỢT AI
    // ─────────────────────────────────────────────────────────────────

    /**
     * Kết thúc lượt người chơi → Bắt đầu lượt AI với delay.
     */
    endPlayerTurn() {
      this.currentTurn = 'enemy'
      this.isEnemyThinking = true

      // Delay để người chơi thấy kết quả trước khi AI hành động
      setTimeout(() => {
        this.executeEnemyTurn()
      }, 1200)
    },

    /**
     * AI thực hiện lượt: Gắn năng lượng (ADVANCED) → Tấn công.
     */
    executeEnemyTurn() {
      const attacker = this.enemyTeam[0]
      const defender = this.playerTeam[0]

      if (!attacker || attacker.isKnockedOut) {
        this.promoteEnemyBench()
        this.startPlayerTurn()
        return
      }

      // Chế độ ADVANCED: AI gắn năng lượng
      if (this.mode === 'ADVANCED') {
        const targetIdx = BattleLogic.aiChooseEnergyTarget(this.enemyTeam)
        if (targetIdx >= 0) {
          const target = this.enemyTeam[targetIdx]!
          const energyType = BattleLogic.getRandomEnergyType(target.types || [])
          target.attachedEnergies.push(energyType)
          this.addLog(`⚡ ${target.name} (Địch) nhận Năng lượng ${energyType}.`, 'energy')
        }
      }

      // AI chọn đòn tấn công
      const chosenAttack = BattleLogic.aiChooseAttack(attacker, this.mode)

      if (!chosenAttack || !defender || defender.isKnockedOut) {
        // AI không có đòn hoặc không có mục tiêu → Bỏ lượt
        this.addLog(`${attacker.name} (Địch) không thể tấn công.`, 'info')
        this.startPlayerTurn()
        return
      }

      // Tính sát thương
      const { finalDamage, isWeakness, isResistance } = BattleLogic.calculateDamage(
        chosenAttack.damage,
        attacker.types || [],
        chosenAttack.cost,
        defender
      )

      // Áp dụng sát thương
      defender.currentHp = Math.max(0, defender.currentHp - finalDamage)

      let logText = `🔥 Địch: ${attacker.name} dùng ${chosenAttack.name} gây ${finalDamage} sát thương cho ${defender.name}!`
      if (isWeakness) logText += ' (Điểm Yếu x2!)'
      if (isResistance) logText += ' (Kháng Cự -30)'
      this.addLog(logText, 'attack')

      // Kiểm tra KO
      if (defender.currentHp <= 0) {
        defender.isKnockedOut = true
        this.addLog(`💀 ${defender.name} bị loại!`, 'ko')
        this.promotePlayerBench()
      }

      // Kiểm tra winner
      if (this.checkAndSetWinner()) {
        this.isEnemyThinking = false
        return
      }

      this.startPlayerTurn()
    },

    // ─────────────────────────────────────────────────────────────────
    // QUẢN LÝ ĐỘI HÌNH KHI KO
    // ─────────────────────────────────────────────────────────────────

    /**
     * Đưa Pokémon Bench của Địch lên tiền tuyến khi Active bị KO.
     */
    promoteEnemyBench() {
      const idx = BattleLogic.aiChooseReplacement(this.enemyTeam)
      if (idx < 0) return // Không còn ai thay thế

      const current = this.enemyTeam[0]
      const newActive = this.enemyTeam[idx]!

      this.enemyTeam[0] = newActive
      this.enemyTeam[idx] = current // Giữ thẻ KO ở đó (để count)
      this.enemyTeam[0]!.isActive = true
      this.enemyTeam[0]!.teamIndex = 0

      this.addLog(`🔄 Địch: ${newActive.name} lên tiền tuyến!`, 'info')
    },

    /**
     * Đưa Pokémon Bench của Người chơi lên tiền tuyến khi Active bị KO.
     * Tự động chọn Pokémon Bench đầu tiên còn sống.
     */
    promotePlayerBench() {
      // Tìm Bench còn sống
      let idx = -1
      for (let i = 1; i < this.playerTeam.length; i++) {
        if (this.playerTeam[i] && !this.playerTeam[i]!.isKnockedOut) {
          idx = i
          break
        }
      }
      if (idx < 0) return

      const current = this.playerTeam[0]
      const newActive = this.playerTeam[idx]!

      this.playerTeam[0] = newActive
      this.playerTeam[idx] = current
      this.playerTeam[0]!.isActive = true
      this.playerTeam[0]!.teamIndex = 0

      this.addLog(`🔄 ${newActive.name} của bạn lên tiền tuyến!`, 'info')
    },

    // ─────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────

    startPlayerTurn() {
      this.currentTurn = 'player'
      this.hasAttachedEnergyThisTurn = false
      this.isEnemyThinking = false
      this.turnNumber++
      this.addLog(`━━━ Lượt ${this.turnNumber} của bạn ━━━`, 'system')
    },

    checkAndSetWinner(): boolean {
      const winner = BattleLogic.checkWinner(this.playerTeam, this.enemyTeam)
      if (winner) {
        this.winner = winner
        this.phase = winner === 'player' ? 'VICTORY' : 'DEFEAT'
        this.addLog(
          winner === 'player' ? '🏆 BẠN ĐÃ CHIẾN THẮNG!' : '💔 BẠN ĐÃ THẤT BẠI...',
          'system'
        )
        return true
      }
      return false
    },

    addLog(text: string, type: BattleLog['type'] = 'info') {
      this.logs.push({
        id: BattleLogic.generateLogId(),
        text,
        type,
        timestamp: Date.now()
      })
      // Giữ tối đa 100 logs để tránh memory leak
      if (this.logs.length > 100) {
        this.logs.splice(0, this.logs.length - 100)
      }
    },

    selectAttack(index: number) {
      if (this.selectedAttackIndex === index) {
        this.selectedAttackIndex = null // Toggle off
      } else {
        this.selectedAttackIndex = index
      }
    }
  }
})
```

**Kiểm tra build:**
```bash
npm run build
```
Lỗi thường gặp: Import type sai path → kiểm tra lại `../types` và `../managers/BattleLogic`.

---

## BƯỚC 4: TẠO BATTLE HELP DIALOG (src/features/battle/components/BattleHelpDialog.vue)

**Tạo file `src/features/battle/components/BattleHelpDialog.vue`:**

```vue
<script setup lang="ts">
import { useBattleStore } from '../store/battleStore'
import EnhancedButton from '../../../features/shared/components/EnhancedButton.vue'

const battleStore = useBattleStore()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
    <div class="bg-gray-900 border-2 border-indigo-500/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="bg-indigo-900/40 px-8 py-5 border-b border-indigo-500/30 flex items-center justify-between">
        <h2 class="text-2xl font-black text-white flex items-center gap-3">
          📖 Luật Chơi Pokémon TCG
        </h2>
        <span class="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-900/50 px-3 py-1 rounded-full border border-indigo-500/30">
          {{ battleStore.mode === 'BASIC' ? 'Cơ Bản' : 'Nâng Cao' }}
        </span>
      </div>

      <div class="p-8 space-y-6 max-h-[60vh] overflow-y-auto">

        <!-- Mục tiêu -->
        <section>
          <h3 class="text-lg font-black text-yellow-400 mb-3 flex items-center gap-2">🎯 Mục tiêu</h3>
          <p class="text-gray-300 leading-relaxed">
            Tiêu diệt toàn bộ <strong class="text-white">5 Pokémon</strong> của đối phương để giành chiến thắng.
          </p>
        </section>

        <!-- Active & Bench -->
        <section>
          <h3 class="text-lg font-black text-blue-400 mb-3 flex items-center gap-2">🃏 Active & Bench</h3>
          <ul class="space-y-2 text-gray-300 text-sm leading-relaxed">
            <li>✅ <strong class="text-white">Active Pokémon</strong> — Ở tiền tuyến. Có thể tấn công và nhận sát thương.</li>
            <li>🛡️ <strong class="text-white">Bench Pokémon</strong> (Dự bị) — Ở phía sau. An toàn, không nhận sát thương trực tiếp.</li>
            <li>🔄 Khi Active bị loại, một Pokémon Bench sẽ lên thay.</li>
          </ul>
        </section>

        <!-- Khắc hệ -->
        <section>
          <h3 class="text-lg font-black text-red-400 mb-3 flex items-center gap-2">⚡ Khắc Hệ</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
              <div class="text-red-400 font-black text-lg mb-1">💥 Điểm Yếu (Weakness)</div>
              <p class="text-gray-300 text-sm">Tấn công trúng Điểm Yếu → sát thương x2</p>
            </div>
            <div class="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
              <div class="text-blue-400 font-black text-lg mb-1">🛡️ Kháng Cự (Resistance)</div>
              <p class="text-gray-300 text-sm">Tấn công trúng Kháng Cự → sát thương giảm 30</p>
            </div>
          </div>
        </section>

        <!-- Chế độ Cơ bản -->
        <section v-if="battleStore.mode === 'BASIC'">
          <h3 class="text-lg font-black text-green-400 mb-3 flex items-center gap-2">🌟 Chế độ Cơ Bản</h3>
          <ul class="space-y-2 text-gray-300 text-sm leading-relaxed">
            <li>⚔️ <strong class="text-white">Tấn công</strong> — Chọn bất kỳ đòn nào để tấn công. Đánh xong mất lượt.</li>
            <li>🔄 <strong class="text-white">Rút lui</strong> — Đổi Active ↔ Bench bất kỳ lúc nào trong lượt. Miễn phí nhưng mất lượt.</li>
            <li>❌ Không cần Năng lượng để tấn công.</li>
          </ul>
        </section>

        <!-- Chế độ Nâng cao -->
        <section v-if="battleStore.mode === 'ADVANCED'">
          <h3 class="text-lg font-black text-purple-400 mb-3 flex items-center gap-2">⚡ Chế độ Nâng Cao</h3>
          <ul class="space-y-2 text-gray-300 text-sm leading-relaxed">
            <li>
              ⚡ <strong class="text-white">Gắn Năng lượng</strong> — Mỗi lượt chỉ được gắn <strong class="text-yellow-400">ĐÚNG 1 Năng lượng</strong>
              vào bất kỳ Pokémon nào trên sân của bạn. Hãy tính toán kỹ!
            </li>
            <li>
              ⚔️ <strong class="text-white">Điều kiện tấn công</strong> — Đòn đánh chỉ khả dụng nếu Pokémon đang có đủ
              <strong class="text-purple-300">loại và số lượng Năng lượng</strong> quy định trong đòn đó.
            </li>
            <li>
              🔄 <strong class="text-white">Chi phí Rút lui</strong> — Pokémon cần có đủ số Năng lượng gắn ≥ chỉ số Retreat.
              Khi rút lui, số năng lượng tương ứng bị vứt đi.
            </li>
          </ul>
        </section>

        <!-- Lưu ý -->
        <div class="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <p class="text-gray-400 text-xs text-center italic">
            💡 Tip: Bắt đầu bằng chế độ Cơ Bản để làm quen. Khi đã thành thạo, chuyển sang Nâng Cao để trải nghiệm luật TCG tiêu chuẩn.
          </p>
        </div>

      </div>

      <div class="px-8 py-5 border-t border-gray-700/50 bg-gray-800/30">
        <EnhancedButton variant="primary" size="lg" fullWidth @click="emit('close')">
          Đã Hiểu, Chiến Thôi! ⚔️
        </EnhancedButton>
      </div>
    </div>
  </div>
</template>
```

---

## BƯỚC 5: TẠO BATTLE ARENA (src/features/battle/components/BattleArena.vue)

Đây là file lớn nhất. Tạo đầy đủ:

**Tạo file `src/features/battle/components/BattleArena.vue`:**

```vue
<script setup lang="ts">
/**
 * BattleArena.vue — Giao diện chính của bàn đấu Pokémon
 *
 * Layout:
 * ┌─────────────────────────────┐
 * │  Enemy Bench (nhỏ, trên)    │
 * │  Enemy Active (to, giữa)    │
 * │─────────────────────────────│
 * │  Player Active (to, giữa)   │
 * │  Player Bench (nhỏ, dưới)   │
 * │  Controls (đòn, năng lượng) │
 * └─────────────────────────────┘
 */
import { ref, computed, nextTick, watch } from 'vue'
import { useBattleStore } from '../store/battleStore'
import { useInventoryStore } from '../../inventory/store/inventoryStore'
import { useApiStore } from '../../inventory/store/apiStore'
import PokemonCard3D from '../../shared/components/PokemonCard3D.vue'
import EnhancedButton from '../../shared/components/EnhancedButton.vue'
import BattleHelpDialog from './BattleHelpDialog.vue'
import { BattleLogic } from '../managers/BattleLogic'
import type { BattleCard } from '../types'

const battleStore = useBattleStore()
const inventoryStore = useInventoryStore()
const apiStore = useApiStore()

// ─── UI State ──────────────────────────────────────────────────────
const showHelp = ref(false)
const showModeSelect = ref(false)
const selectedEnergyType = ref<string>('Fire')
const logContainer = ref<HTMLElement | null>(null)
const loadingBattle = ref(false)

// Auto-scroll log khi có log mới
watch(() => battleStore.logs.length, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

// ─── Computed ──────────────────────────────────────────────────────

/** Danh sách hệ năng lượng có thể chọn */
const energyTypes = [
  'Fire', 'Water', 'Grass', 'Lightning', 'Psychic',
  'Fighting', 'Darkness', 'Metal', 'Dragon', 'Colorless'
]

/** Thẻ bài trong binder để đưa vào trận */
const binderCards = computed(() => {
  const cardIds = Object.keys(inventoryStore.personalBinder)
  const result: any[] = []

  for (const id of cardIds) {
    for (const setCards of Object.values(apiStore.setCardsCache)) {
      const found = (setCards as any[]).find(c => c.id === id)
      if (found) {
        result.push(found)
        break
      }
    }
  }
  return result.filter(c => c && c.hp) // Chỉ lấy Pokémon có HP (có thể đánh)
})

/** Active của player */
const playerActive = computed(() => battleStore.playerActive)

/** Active của địch */
const enemyActive = computed(() => battleStore.enemyActive)

/** Tính % HP */
function hpPercent(card: BattleCard): number {
  if (!card || card.hp <= 0) return 0
  return Math.max(0, Math.min(100, (card.currentHp / card.hp) * 100))
}

/** Màu HP bar dựa trên % */
function hpBarColor(card: BattleCard): string {
  const pct = hpPercent(card)
  if (pct > 50) return 'bg-green-500'
  if (pct > 25) return 'bg-yellow-500'
  return 'bg-red-500'
}

/** Kiểm tra đòn có thể dùng (chế độ ADVANCED) */
function isAttackUsable(card: BattleCard, attackIndex: number): boolean {
  if (battleStore.mode === 'BASIC') return true
  const attack = card.attacks[attackIndex]
  if (!attack) return false
  return BattleLogic.canUseAttack(card, attack)
}

/** Màu log theo type */
function logColor(type: string): string {
  const colors: Record<string, string> = {
    attack: 'text-red-300',
    ko: 'text-red-500 font-black',
    energy: 'text-yellow-400',
    retreat: 'text-blue-400',
    system: 'text-gray-500 italic text-center',
    info: 'text-gray-200'
  }
  return colors[type] || 'text-gray-300'
}

// ─── Actions ──────────────────────────────────────────────────────

/** Mở modal chọn chế độ để bắt đầu trận */
async function startBattle(mode: 'BASIC' | 'ADVANCED') {
  showModeSelect.value = false

  if (binderCards.value.length === 0) {
    alert('Bạn cần có thẻ Pokémon trong Binder! Hãy mở Pack trước.')
    return
  }

  loadingBattle.value = true

  // Load card data nếu chưa có trong cache
  for (const id of Object.keys(inventoryStore.personalBinder).slice(0, 5)) {
    await apiStore.ensureCardInCache(id)
  }

  loadingBattle.value = false
  battleStore.openBattle(binderCards.value, mode)
}

function handleAttack(index: number) {
  if (!battleStore.canAct) return
  battleStore.playerAttack(index)
}

function handleAttachEnergy(teamIndex: number) {
  if (!battleStore.canAct) return
  battleStore.attachEnergy(teamIndex, selectedEnergyType.value)
}

function handleRetreat(benchIndex: number) {
  if (!battleStore.canAct) return
  battleStore.retreat(benchIndex)
}

function close() {
  if (battleStore.phase === 'BATTLE') {
    if (!confirm('Bỏ cuộc? Trận đấu chưa kết thúc.')) return
  }
  battleStore.closeBattle()
}
</script>

<template>
  <!-- ════════════════════════════════════════════════════════════════
       TRIGGER BUTTON — Khi Battle chưa mở, hiện nút mở
  ════════════════════════════════════════════════════════════════ -->
  <div v-if="!battleStore.isOpen">
    <!-- Nút này sẽ được gọi từ UIOverlay, không hiển thị trực tiếp -->
  </div>

  <!-- ════════════════════════════════════════════════════════════════
       BATTLE ARENA OVERLAY — Toàn màn hình khi đang đấu
  ════════════════════════════════════════════════════════════════ -->
  <Transition name="battle-fade">
    <div
      v-if="battleStore.isOpen"
      class="absolute inset-0 z-[200] flex flex-col bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 overflow-hidden"
    >

      <!-- ── TOP BAR ──────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 py-3 bg-black/40 border-b border-gray-700/50 shrink-0">
        <div class="flex items-center gap-4">
          <span class="text-xl font-black text-white tracking-tighter">⚔️ BATTLE ARENA</span>
          <span class="text-xs font-bold uppercase text-indigo-400 bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-500/30">
            {{ battleStore.mode }}
          </span>
          <span v-if="battleStore.phase === 'BATTLE'" class="text-xs text-gray-400">
            Lượt {{ battleStore.turnNumber }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <EnhancedButton variant="ghost" size="sm" :icon="{ name: 'help' }" defaultText="" @click="showHelp = true" title="Luật chơi" />
          <EnhancedButton variant="danger" size="sm" :icon="{ name: 'close' }" defaultText="" @click="close" title="Thoát" />
        </div>
      </div>

      <!-- ── MAIN CONTENT ─────────────────────────────────────────── -->
      <div class="flex-grow flex overflow-hidden">

        <!-- LEFT: BATTLEFIELD ──────────────────────────────────────── -->
        <div class="flex-grow flex flex-col min-w-0 overflow-hidden">

          <!-- === SETUP / MODE SELECT === -->
          <div v-if="battleStore.phase === 'IDLE'" class="flex-grow flex flex-col items-center justify-center gap-8 p-8">
            <h2 class="text-4xl font-black text-white text-center">⚔️ POKÉMON BATTLE</h2>
            <p class="text-gray-400 text-center max-w-md">
              Chọn chế độ chơi và đưa Pokémon từ Binder của bạn vào trận!
              <br><span class="text-yellow-400">Cần ít nhất 1 thẻ Pokémon (có HP) trong Binder.</span>
            </p>

            <div v-if="binderCards.length === 0" class="text-center">
              <p class="text-red-400 font-bold mb-4">Binder trống! Hãy mở Pack để có thẻ bài.</p>
              <EnhancedButton variant="secondary" size="lg" @click="close">Quay lại</EnhancedButton>
            </div>

            <div v-else class="flex flex-col gap-4 w-full max-w-md">
              <p class="text-center text-sm text-gray-300">
                Bạn có <strong class="text-white">{{ binderCards.length }}</strong> Pokémon sẵn sàng chiến đấu
              </p>

              <!-- Chế độ chơi -->
              <div class="grid grid-cols-2 gap-4">
                <div
                  class="bg-green-900/20 border-2 border-green-500/50 rounded-xl p-5 cursor-pointer hover:border-green-400 hover:bg-green-900/30 transition-all group"
                  @click="startBattle('BASIC')"
                >
                  <div class="text-3xl mb-2">🌟</div>
                  <h3 class="font-black text-green-400 text-lg">Cơ Bản</h3>
                  <p class="text-xs text-gray-400 mt-1">Không cần Năng lượng. Phù hợp người mới.</p>
                  <EnhancedButton variant="success" size="sm" fullWidth class="mt-3 group-hover:scale-105">BẮT ĐẦU</EnhancedButton>
                </div>
                <div
                  class="bg-purple-900/20 border-2 border-purple-500/50 rounded-xl p-5 cursor-pointer hover:border-purple-400 hover:bg-purple-900/30 transition-all group"
                  @click="startBattle('ADVANCED')"
                >
                  <div class="text-3xl mb-2">⚡</div>
                  <h3 class="font-black text-purple-400 text-lg">Nâng Cao</h3>
                  <p class="text-xs text-gray-400 mt-1">Cần Năng lượng. Luật TCG chuẩn.</p>
                  <EnhancedButton variant="info" size="sm" fullWidth class="mt-3 group-hover:scale-105">BẮT ĐẦU</EnhancedButton>
                </div>
              </div>
            </div>

            <div v-if="loadingBattle" class="text-gray-400 text-sm animate-pulse">
              Đang tải dữ liệu thẻ bài...
            </div>
          </div>

          <!-- === BATTLE / RESULT === -->
          <div v-else class="flex-grow flex flex-col overflow-hidden">

            <!-- VICTORY/DEFEAT SCREEN -->
            <div
              v-if="battleStore.phase === 'VICTORY' || battleStore.phase === 'DEFEAT'"
              class="flex-grow flex flex-col items-center justify-center gap-6 p-8"
            >
              <div class="text-8xl">{{ battleStore.phase === 'VICTORY' ? '🏆' : '💔' }}</div>
              <h2
                class="text-5xl font-black"
                :class="battleStore.phase === 'VICTORY' ? 'text-yellow-400' : 'text-red-400'"
              >
                {{ battleStore.phase === 'VICTORY' ? 'CHIẾN THẮNG!' : 'THẤT BẠI...' }}
              </h2>
              <p class="text-gray-300 text-center">
                {{ battleStore.phase === 'VICTORY'
                  ? 'Xuất sắc! Bạn đã tiêu diệt toàn bộ đội địch!'
                  : 'Toàn bộ Pokémon của bạn đã bị loại. Hãy thử lại!' }}
              </p>
              <div class="flex gap-4">
                <EnhancedButton variant="primary" size="lg" @click="showModeSelect = true; battleStore.phase = 'IDLE'">
                  Chơi Lại
                </EnhancedButton>
                <EnhancedButton variant="secondary" size="lg" @click="close">
                  Thoát
                </EnhancedButton>
              </div>
            </div>

            <!-- ACTIVE BATTLE FIELD -->
            <div v-else class="flex-grow flex flex-col overflow-hidden p-4 gap-3">

              <!-- === ENEMY SIDE === -->
              <div class="flex flex-col gap-2">

                <!-- Enemy Bench (nhỏ, phía trên) -->
                <div class="flex justify-center gap-2">
                  <div
                    v-for="(card, idx) in battleStore.enemyBench"
                    :key="`enemy-bench-${idx}`"
                    class="relative"
                    style="width: 70px;"
                  >
                    <div v-if="card" class="relative">
                      <PokemonCard3D :card="card" width="70px" :is-back="false" />
                      <!-- KO overlay -->
                      <div v-if="card.isKnockedOut" class="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                        <span class="text-xs text-red-400 font-black">KO</span>
                      </div>
                      <!-- Mini HP bar -->
                      <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 rounded-b">
                        <div
                          class="h-full rounded-b transition-all"
                          :class="hpBarColor(card)"
                          :style="{ width: `${hpPercent(card)}%` }"
                        ></div>
                      </div>
                    </div>
                    <div v-else class="w-full h-24 rounded-lg border border-gray-700/30 border-dashed"></div>
                  </div>
                </div>

                <!-- Enemy Active (to, giữa) -->
                <div class="flex justify-center items-end gap-4">
                  <div v-if="enemyActive" class="relative" style="width: 150px;">
                    <!-- KO Overlay -->
                    <div v-if="enemyActive.isKnockedOut" class="absolute inset-0 z-10 bg-black/80 rounded-xl flex items-center justify-center">
                      <span class="text-2xl font-black text-red-400">KO</span>
                    </div>
                    <PokemonCard3D :card="enemyActive" width="150px" :is-back="false" />
                    <!-- HP Info -->
                    <div class="mt-2 text-center">
                      <div class="text-xs font-bold text-gray-300">{{ enemyActive.name }}</div>
                      <div class="w-full bg-gray-700 rounded-full h-2 mt-1">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          :class="hpBarColor(enemyActive)"
                          :style="{ width: `${hpPercent(enemyActive)}%` }"
                        ></div>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-0.5">
                        {{ enemyActive.currentHp }} / {{ enemyActive.hp }} HP
                      </div>
                    </div>
                  </div>

                  <!-- Enemy Status -->
                  <div class="flex flex-col items-center gap-1 text-center">
                    <span class="text-xs font-bold text-red-400 uppercase tracking-widest">ĐỊCH</span>
                    <span class="text-sm text-gray-300">{{ battleStore.enemyAliveCount }}/5 còn sống</span>
                    <div
                      v-if="battleStore.currentTurn === 'enemy' && battleStore.phase === 'BATTLE'"
                      class="flex items-center gap-1 text-xs text-yellow-400 animate-pulse"
                    >
                      <span class="w-2 h-2 bg-yellow-400 rounded-full inline-block animate-bounce"></span>
                      Đang suy nghĩ...
                    </div>
                  </div>
                </div>
              </div>

              <!-- DIVIDER -->
              <div class="flex items-center gap-3 shrink-0">
                <div class="flex-grow h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                <span class="text-xs font-black text-gray-500 uppercase tracking-widest">VS</span>
                <div class="flex-grow h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
              </div>

              <!-- === PLAYER SIDE === -->
              <div class="flex flex-col gap-2">

                <!-- Player Active -->
                <div class="flex justify-center items-start gap-4">
                  <div v-if="playerActive" class="relative" style="width: 150px;">
                    <div v-if="playerActive.isKnockedOut" class="absolute inset-0 z-10 bg-black/80 rounded-xl flex items-center justify-center">
                      <span class="text-2xl font-black text-red-400">KO</span>
                    </div>
                    <PokemonCard3D :card="playerActive" width="150px" :is-back="false" />
                    <!-- HP + Energy -->
                    <div class="mt-2 text-center">
                      <div class="text-xs font-bold text-white">{{ playerActive.name }}</div>
                      <div class="w-full bg-gray-700 rounded-full h-2 mt-1">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          :class="hpBarColor(playerActive)"
                          :style="{ width: `${hpPercent(playerActive)}%` }"
                        ></div>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-0.5">
                        {{ playerActive.currentHp }} / {{ playerActive.hp }} HP
                      </div>
                      <!-- Năng lượng đang gắn -->
                      <div v-if="playerActive.attachedEnergies.length > 0" class="flex flex-wrap justify-center gap-0.5 mt-1">
                        <span
                          v-for="(e, i) in playerActive.attachedEnergies"
                          :key="i"
                          class="text-[9px] bg-gray-800 border border-gray-600 px-1 py-0.5 rounded"
                        >{{ e[0] }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Player Status -->
                  <div class="flex flex-col items-center gap-1 text-center">
                    <span class="text-xs font-bold text-green-400 uppercase tracking-widest">BẠN</span>
                    <span class="text-sm text-gray-300">{{ battleStore.playerAliveCount }}/5 còn sống</span>
                    <div
                      v-if="battleStore.currentTurn === 'player' && battleStore.phase === 'BATTLE' && !battleStore.isEnemyThinking"
                      class="flex items-center gap-1 text-xs text-green-400"
                    >
                      <span class="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse"></span>
                      Lượt của bạn
                    </div>
                  </div>
                </div>

                <!-- Player Bench -->
                <div class="flex justify-center gap-2">
                  <div
                    v-for="(card, idx) in battleStore.playerBench"
                    :key="`player-bench-${idx}`"
                    class="relative cursor-pointer group"
                    style="width: 70px;"
                    @click="handleRetreat(idx)"
                  >
                    <div v-if="card" class="relative">
                      <!-- Hover: hiện tooltip đổi lượt -->
                      <div
                        v-if="!card.isKnockedOut && battleStore.canAct && playerActive && !playerActive.isKnockedOut"
                        class="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-green-400 bg-gray-900 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
                      >
                        Click để đổi
                      </div>
                      <PokemonCard3D :card="card" width="70px" :is-back="false" />
                      <div v-if="card.isKnockedOut" class="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                        <span class="text-xs text-red-400 font-black">KO</span>
                      </div>
                      <!-- Mini HP -->
                      <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 rounded-b">
                        <div
                          class="h-full rounded-b transition-all"
                          :class="hpBarColor(card)"
                          :style="{ width: `${hpPercent(card)}%` }"
                        ></div>
                      </div>
                      <!-- Energy count -->
                      <div v-if="card.attachedEnergies.length > 0" class="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                        {{ card.attachedEnergies.length }}
                      </div>
                    </div>
                    <div v-else class="w-full h-24 rounded-lg border border-gray-700/30 border-dashed"></div>
                  </div>
                </div>

              </div>

              <!-- === CONTROLS: ĐÒN ĐÁNH & NĂNG LƯỢNG === -->
              <div
                v-if="battleStore.canAct && playerActive && !playerActive.isKnockedOut"
                class="shrink-0 bg-gray-900/80 border-t border-gray-700/50 p-3 space-y-3"
              >

                <!-- Đòn đánh -->
                <div>
                  <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">⚔️ Chọn đòn tấn công</div>
                  <div class="grid gap-2" :class="playerActive.attacks.length > 2 ? 'grid-cols-2' : 'grid-cols-1'">
                    <button
                      v-for="(attack, idx) in playerActive.attacks"
                      :key="idx"
                      class="text-left rounded-xl border-2 px-4 py-2.5 transition-all text-sm font-bold"
                      :class="[
                        isAttackUsable(playerActive, idx)
                          ? 'bg-red-900/30 border-red-500/60 text-red-300 hover:bg-red-900/50 hover:border-red-400 cursor-pointer'
                          : 'bg-gray-800/30 border-gray-700/30 text-gray-600 cursor-not-allowed opacity-50',
                        battleStore.selectedAttackIndex === idx ? 'ring-2 ring-red-400 border-red-400' : ''
                      ]"
                      :disabled="!isAttackUsable(playerActive, idx)"
                      @click="handleAttack(idx)"
                    >
                      <div class="flex justify-between items-center">
                        <span>{{ attack.name }}</span>
                        <span class="text-base font-black">
                          {{ attack.damage > 0 ? `${attack.damage}` : '—' }}
                        </span>
                      </div>
                      <div v-if="attack.cost.length > 0" class="flex gap-0.5 mt-1">
                        <span
                          v-for="(e, i) in attack.cost"
                          :key="i"
                          class="text-[9px] bg-gray-800 px-1 py-0.5 rounded border border-gray-700"
                        >{{ e }}</span>
                      </div>
                      <p v-if="attack.text" class="text-[10px] text-gray-500 mt-1 line-clamp-1">{{ attack.text }}</p>
                    </button>
                  </div>
                  <p v-if="playerActive.attacks.length === 0" class="text-center text-gray-600 text-sm py-2 italic">
                    Pokémon này không có đòn đánh.
                  </p>
                </div>

                <!-- Gắn Năng lượng (chế độ ADVANCED) -->
                <div v-if="battleStore.mode === 'ADVANCED'" class="border-t border-gray-700/50 pt-3">
                  <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center justify-between">
                    <span>⚡ Gắn Năng lượng</span>
                    <span
                      class="text-[9px]"
                      :class="battleStore.hasAttachedEnergyThisTurn ? 'text-red-400' : 'text-green-400'"
                    >
                      {{ battleStore.hasAttachedEnergyThisTurn ? 'Đã dùng lượt này' : 'Còn 1 lần' }}
                    </span>
                  </div>
                  <div class="flex gap-2 items-center flex-wrap">
                    <!-- Chọn hệ năng lượng -->
                    <select
                      v-model="selectedEnergyType"
                      class="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-500"
                    >
                      <option v-for="e in energyTypes" :key="e" :value="e">{{ e }}</option>
                    </select>

                    <!-- Gắn vào Active -->
                    <EnhancedButton
                      variant="warning"
                      size="sm"
                      :disabled="battleStore.hasAttachedEnergyThisTurn"
                      @click="handleAttachEnergy(0)"
                    >
                      + Vào Active
                    </EnhancedButton>

                    <!-- Gắn vào Bench (chọn theo index) -->
                    <template v-for="(card, idx) in battleStore.playerBench" :key="`energy-bench-${idx}`">
                      <EnhancedButton
                        v-if="card && !card.isKnockedOut"
                        variant="secondary"
                        size="sm"
                        :disabled="battleStore.hasAttachedEnergyThisTurn"
                        @click="handleAttachEnergy(idx + 1)"
                      >
                        + B{{ idx + 1 }}
                      </EnhancedButton>
                    </template>
                  </div>
                </div>

              </div>

              <!-- Chờ AI -->
              <div
                v-else-if="battleStore.isEnemyThinking"
                class="shrink-0 bg-gray-900/80 border-t border-gray-700/50 p-4 text-center"
              >
                <div class="flex items-center justify-center gap-2 text-yellow-400">
                  <span class="animate-spin">⚙️</span>
                  <span class="font-bold">Địch đang suy nghĩ...</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- RIGHT: BATTLE LOG ───────────────────────────────────────── -->
        <div class="w-64 shrink-0 border-l border-gray-700/50 bg-gray-950/60 flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-700/50 bg-gray-900/40">
            <span class="text-xs font-black uppercase tracking-widest text-gray-500">📜 Diễn Biến Trận</span>
          </div>
          <div
            ref="logContainer"
            class="flex-grow overflow-y-auto p-3 space-y-1.5 text-xs"
          >
            <div
              v-for="log in battleStore.logs"
              :key="log.id"
              class="leading-relaxed"
              :class="logColor(log.type)"
            >
              {{ log.text }}
            </div>
            <div v-if="battleStore.logs.length === 0" class="text-gray-600 text-center italic pt-4">
              Trận đấu chưa bắt đầu...
            </div>
          </div>
        </div>

      </div>
    </div>
  </Transition>

  <!-- ── HELP DIALOG ──────────────────────────────────────────────── -->
  <Transition name="fade">
    <BattleHelpDialog v-if="showHelp" @close="showHelp = false" />
  </Transition>
</template>

<style scoped>
.battle-fade-enter-active { transition: opacity 0.4s ease; }
.battle-fade-leave-active { transition: opacity 0.3s ease; }
.battle-fade-enter-from, .battle-fade-leave-to { opacity: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

**Kiểm tra build:**
```bash
npm run build
```

Lỗi thường gặp:
- `Cannot find module '../../inventory/store/inventoryStore'` → Kiểm tra đường dẫn relative import.
- `Property X does not exist on type BattleCard` → Đảm bảo type trong `types/index.ts` đầy đủ.

---

## BƯỚC 6: CẬP NHẬT UIOverlay.vue — Thêm nút mở Battle Arena

**File cần sửa:** `src/features/shop-ui/components/UIOverlay.vue`

Tìm phần "controls buttons" trong UIOverlay. Cụ thể tìm khối:

```vue
<div class="mt-5 pt-5 border-t border-gray-700/50 flex gap-3">
  <EnhancedButton variant="primary" ...>SHOP</EnhancedButton>
  <EnhancedButton variant="success" ...>BUILD</EnhancedButton>
  <EnhancedButton variant="secondary" ...>CONFIG</EnhancedButton>
</div>
```

**Thêm import battleStore** vào đầu `<script setup>` của UIOverlay.vue:
```typescript
import { useBattleStore } from '../../battle/store/battleStore'
const battleStore = useBattleStore()
```

**Thêm nút Battle** vào khối buttons đó (thêm vào cuối):
```vue
<EnhancedButton
  variant="danger"
  size="md"
  :icon="{ name: 'star', position: 'left' }"
  @click="battleStore.isOpen = true"
  title="Mở Battle Arena"
>
  BATTLE
</EnhancedButton>
```

**Kiểm tra build:**
```bash
npm run build
```

---

## BƯỚC 7: CẬP NHẬT App.vue — Import và Mount BattleArena

**File cần sửa:** `src/App.vue`

**Thêm import** vào phần `<script setup>` (sau dòng `import CardDetailOverlay`):

```typescript
import BattleArena from './features/battle/components/BattleArena.vue'
```

**Thêm component** vào `<template>` (sau `<CardDetailOverlay />`):

```vue
<BattleArena />
```

Template cuối sẽ trông như sau:
```vue
<template>
  <div class="relative w-full h-screen overflow-hidden bg-gray-900">
    <GameContainer />
    <UIOverlay />
    <PackOpeningOverlay />
    <EndOfDayModal />
    <BinderMenu />
    <ShelfManagementMenu />
    <OnlineShopMenu />
    <DevModeMenu />
    <BuildMenu />
    <SettingsModal />
    <CardDetailOverlay />
    <BattleArena />   <!-- ← THÊM VÀO ĐÂY -->
  </div>
</template>
```

**Kiểm tra build cuối cùng:**
```bash
npm run build
```
**Phải PASS hoàn toàn không có lỗi.**

---

## BƯỚC 8: TEST THỦ CÔNG (VERIFICATION CHECKLIST)

Chạy `npm run dev` và kiểm tra từng mục:

### 8.1 Kiểm tra Cơ bản (Không cần Pokémon)
```
[ ] App khởi động không có lỗi console đỏ
[ ] Nút "BATTLE" xuất hiện trong Shop Manager (góc trên trái)
[ ] Click "BATTLE" → mở Battle Arena overlay
[ ] Click X/Thoát → đóng Battle Arena
```

### 8.2 Kiểm tra khi Binder trống
```
[ ] Click BATTLE khi chưa mở Pack → hiện thông báo "Binder trống"
[ ] Có thể click "Quay lại" để đóng
```

### 8.3 Kiểm tra sau khi có thẻ trong Binder
```
[ ] Mua Pack từ Online Shop → Xé Pack → Thu thập thẻ vào Binder
[ ] Click BATTLE → hiện 2 lựa chọn: "Cơ Bản" và "Nâng Cao"
[ ] Click "Cơ Bản" → Trận đấu bắt đầu
[ ] Active Pokémon hiện ở giữa, Bench ở trên/dưới
[ ] Tên Pokémon và HP hiển thị đúng
[ ] HP bar hiển thị đúng (xanh → vàng → đỏ khi HP giảm)
[ ] Battle Log bên phải hiện đúng nội dung
```

### 8.4 Kiểm tra Chế độ Cơ Bản
```
[ ] Các đòn đánh hiển thị trong Controls
[ ] Click đòn đánh → sát thương áp dụng lên địch
[ ] HP địch giảm đúng lượng
[ ] Sau khi đánh → "Đang suy nghĩ..." hiện ra
[ ] Sau ~1.2 giây → AI phản công → HP player giảm
[ ] Khi HP = 0 → hiện "KO" trên thẻ
[ ] Khi một bên toàn KO → hiện màn Victory/Defeat
[ ] Click "Chơi Lại" hoặc "Thoát" hoạt động
```

### 8.5 Kiểm tra Chế độ Nâng Cao
```
[ ] Các đòn đánh bị lock (opacity 50%) nếu chưa đủ Năng lượng
[ ] Chọn hệ Năng lượng → Click "+ Vào Active" → Năng lượng hiện bên dưới thẻ
[ ] "Còn 1 lần" → "Đã dùng lượt này" sau khi gắn
[ ] Sau khi gắn đủ → đòn đánh unlock (sáng lên)
[ ] AI cũng gắn năng lượng mỗi lượt (thấy log)
[ ] Retreat: Click vào thẻ Bench → đổi chỗ với Active
[ ] Retreat mode ADVANCED: Nếu Active có ít năng lượng hơn retreat cost → hiện thông báo
```

### 8.6 Kiểm tra Luật Chơi Dialog
```
[ ] Click nút Help (?) → Dialog luật chơi hiện ra
[ ] Nội dung thay đổi theo mode (BASIC/ADVANCED)
[ ] Click "Đã Hiểu" → đóng dialog
```

### 8.7 Kiểm tra Tính năng Cũ KHÔNG bị ảnh hưởng
```
[ ] Shop Manager vẫn hiển thị tiền, level, EXP
[ ] Online Shop vẫn mở và mua được hàng
[ ] Pack Opening vẫn hoạt động
[ ] Binder Menu vẫn hiển thị thẻ
[ ] Shelf Management vẫn hoạt động
[ ] Build Mode vẫn hoạt động
[ ] Save/Load vẫn hoạt động (refresh trang → data vẫn còn)
```

---

## BƯỚC 9: XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi: "Cannot find module"
```
Nguyên nhân: Import path sai
Giải pháp: Kiểm tra lại đường dẫn relative từ file đang sửa đến file cần import
Ví dụ: Từ BattleArena.vue → inventoryStore.ts:
  ../../inventory/store/inventoryStore  ✅
  ../inventory/store/inventoryStore     ❌ (thiếu một cấp ..)
```

### Lỗi: "Property X does not exist on type BattleCard"
```
Nguyên nhân: Type chưa khai báo đủ trong types/index.ts
Giải pháp: Thêm property còn thiếu vào interface BattleCard
```

### Lỗi: "Cannot read properties of null (reading 'xxx')"
```
Nguyên nhân: Truy cập vào card null trong team (có slot trống)
Giải pháp: Luôn kiểm tra null trước khi dùng: if (card && !card.isKnockedOut)
```

### Lỗi: Thẻ bài không hiện hình
```
Nguyên nhân: Chưa load card data vào setCardsCache
Giải pháp:
1. Đảm bảo đã gọi await apiStore.ensureCardInCache(id) trong openBattle()
2. Kiểm tra file cards.sqlite tồn tại: ls public/data/cards.sqlite
3. Kiểm tra DBService đã khởi tạo: mở Console → tìm "DB Service: Worker initialized"
```

### Lỗi: HP không giảm sau khi tấn công
```
Nguyên nhân: BattleCard state không reactive (Pinia state bị replace thay vì mutate)
Giải pháp: Sử dụng trực tiếp state mutation thay vì gán object mới
  defender.currentHp -= finalDamage  ✅  (mutation - reactive)
  defender = { ...defender, currentHp: X }  ❌  (replace - không reactive)
```

### Lỗi: AI không hành động
```
Nguyên nhân: setTimeout trong endPlayerTurn() không được gọi
Giải pháp: Kiểm tra battleStore.currentTurn đã set thành 'enemy' sau khi player attack
Kiểm tra: Mở Vue DevTools → tab Pinia → battleStore → xem currentTurn và isEnemyThinking
```

### Lỗi: Build TypeScript — "noUnusedLocals"
```
Nguyên nhân: Project bật strict TypeScript (noUnusedLocals: true trong tsconfig.app.json)
Giải pháp: Xóa tất cả import và biến khai báo nhưng không dùng trong các file mới tạo
```

---

## BƯỚC 10: KIỂM TRA CUỐI CÙNG

Sau khi tất cả bước trên hoàn thành và test pass, chạy:

```bash
# Build production để đảm bảo không có lỗi
npm run build

# Kiểm tra không còn import shopStore cũ
grep -r "useShopStore" src/features/battle/

# Kiểm tra không có circular dependency nguy hiểm
grep -r "from '../../battle'" src/features/shop-ui/
grep -r "from '../../battle'" src/features/inventory/
```

**Kết quả mong đợi:**
- `npm run build` → 0 errors
- `grep useShopStore` → 0 kết quả (battle feature không dùng shopStore cũ)

---

## PHỤ LỤC A: DANH SÁCH FILE ĐẦY ĐỦ

### Files MỚI tạo:
```
src/features/battle/types/index.ts              ← Bước 1
src/features/battle/managers/BattleLogic.ts     ← Bước 2
src/features/battle/store/battleStore.ts        ← Bước 3
src/features/battle/components/BattleHelpDialog.vue  ← Bước 4
src/features/battle/components/BattleArena.vue  ← Bước 5
```

### Files được SỬA ĐỔI:
```
src/features/shop-ui/components/UIOverlay.vue   ← Bước 6 (thêm import + nút BATTLE)
src/App.vue                                      ← Bước 7 (thêm import + <BattleArena />)
```

### Files KHÔNG CHỈNH SỬA (dù liên quan):
```
src/game/MainScene.ts        ← Không động vào
src/features/shop-ui/store/gameStore.ts  ← Không cần sửa (battle dùng store riêng)
src/features/inventory/store/apiStore.ts ← Không sửa (chỉ gọi hàm có sẵn)
```

---

## PHỤ LỤC B: KIẾN TRÚC GIAO TIẾP

```
UIOverlay.vue
    │ click "BATTLE"
    ▼
battleStore.isOpen = true
    │
    ▼
BattleArena.vue (mounted, visible)
    │ openBattle(cards, mode)
    ▼
battleStore.openBattle()
    │ BattleLogic.createBattleCard()
    ▼
State: playerTeam, enemyTeam (reactive)
    │
    ▼
BattleArena.vue (renders cards)
    │ PokemonCard3D.vue (re-uses existing component)
    │
    │ playerAttack(idx)
    ▼
battleStore.playerAttack()
    │ BattleLogic.calculateDamage()
    ▼
State update → Vue auto re-renders HP bars
    │
    │ endPlayerTurn() → setTimeout(1200ms)
    ▼
battleStore.executeEnemyTurn()
    │ BattleLogic.aiChooseAttack()
    ▼
State update → Battle continues
```

---

## PHỤ LỤC C: LƯU Ý VỀ PERFORMANCE

1. **PokemonCard3D sử dụng Vanilla JS mouse tracking** — Không có Vue re-render cho mỗi mousemove. Điều này OK và đúng thiết kế.

2. **Battle Log giới hạn 100 entries** — Đã implement trong `addLog()`. Không cần lo memory leak.

3. **setTimeout delay 1.2 giây cho AI** — Đủ để người chơi đọc kết quả. Có thể tăng/giảm trong `endPlayerTurn()`.

4. **Không lưu Battle State vào localStorage** — Thiết kế đúng, trận đấu chỉ tồn tại trong session. Mỗi lần mở app là trận mới.

5. **DBService (Web Worker)** đã được khởi tạo sẵn từ `apiStore`. Battle feature chỉ gọi hàm có sẵn `apiStore.ensureCardInCache()` mà không tạo kết nối mới.

---

*Hướng dẫn này được thiết kế để AI Agent thực hiện TUẦN TỰ từ Bước 0 đến Bước 10.*  
*Mỗi bước phải PASS `npm run build` trước khi tiếp tục.*  
*Nếu gặp lỗi không có trong Bước 9, hãy kiểm tra lại từ đầu bước đó.*
