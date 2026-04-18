import { defineStore } from 'pinia'
import { BattleLogic } from '../managers/BattleLogic'
import type { BattleCard, BattleLog, BattleMode, BattlePhase } from '../types'
// Theo kiến trúc PROJECT_ARCHITECTURE.md: Không import ở cấp module-level.
// useGameStore() được gọi BÊN TRONG function/action để tránh circular dependency.
import { useGameStore } from '../../shop-ui/store/gameStore'
import { useApiStore } from '../../inventory/store/apiStore'

/**
 * BattleStore — Quản lý toàn bộ state trận đấu Pokémon.
 *
 * LUỒNG:
 * 1. openSetup()          → Mở màn hình chọn deck
 * 2. toggleDeckCard()     → Chọn/bỏ chọn thẻ bài từ binder
 * 3. confirmDeck(mode)    → Xác nhận deck và chế độ chơi → bắt đầu trận
 * 4. playerAttack()       → Người chơi chọn đòn đánh
 * 5. enemyTurn()          → AI tự động thực hiện lượt
 * 6. closeBattle()        → Đóng Battle Arena
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

    /** Lịch sử battle log */
    logs: [] as BattleLog[],

    /** Bên thắng */
    winner: null as 'player' | 'enemy' | null,

    /** AI đang thực hiện lượt (block input) */
    isEnemyThinking: false,

    // === Deck Setup ===
    /** Cards đã chọn để build deck (raw card data từ binder cache) */
    selectedDeckCards: [] as any[],

    /** Xem dialog help hay không */
    showHelp: false,

    /** ID của Gym đang thách đấu (nếu có) */
    currentGymId: null as string | null,
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

    /** Số thẻ đã chọn trong deck setup */
    selectedDeckCount: (state): number => state.selectedDeckCards.length,

    /** Deck đã đủ số lượng để đánh chưa (cần ít nhất 1, tối đa 5) */
    isDeckReady: (state): boolean =>
      state.selectedDeckCards.length >= 1 && state.selectedDeckCards.length <= 5,
  },

  actions: {
    // ─────────────────────────────────────────────────────────────────
    // DECK SETUP PHASE
    // ─────────────────────────────────────────────────────────────────

    /**
     * Mở màn hình setup deck.
     * Gọi pauseGame trên gameStore để tạm dừng Phaser.
     */
    openSetup() {
      this.isOpen = true
      this.phase = 'SETUP'
      this.selectedDeckCards = []
      this.logs = []
      this.winner = null

      // Pause Phaser engine (thông qua gameStore facade)
      useGameStore().pauseGame()
    },

    /**
     * Toggle chọn/bỏ chọn một thẻ trong màn hình setup deck.
     * Giới hạn tối đa 5 thẻ.
     */
    toggleDeckCard(cardData: any) {
      const idx = this.selectedDeckCards.findIndex(c => c.id === cardData.id)
      if (idx >= 0) {
        // Đã chọn → bỏ chọn
        this.selectedDeckCards.splice(idx, 1)
      } else {
        // Chưa chọn và chưa đủ 5 → thêm vào
        if (this.selectedDeckCards.length < 5) {
          this.selectedDeckCards.push(cardData)
        }
      }
    },

    /**
     * Xác nhận deck và bắt đầu trận đấu.
     * AI sẽ dùng cùng pool thẻ, xáo trộn để tạo đội ngẫu nhiên.
     */
    confirmDeck(mode: BattleMode = 'BASIC') {
      if (!this.isDeckReady) {
        this.addLog('⚠️ Cần chọn ít nhất 1 thẻ Pokémon để chiến đấu!', 'system')
        return
      }

      this.mode = mode
      this.phase = 'BATTLE'
      this.currentTurn = 'player'
      this.turnNumber = 1
      this.hasAttachedEnergyThisTurn = false
      this.selectedAttackIndex = null
      this.isEnemyThinking = false

      // Khởi tạo đội người chơi
      const playerSlots = this.selectedDeckCards.slice(0, 5)
      this.playerTeam = [
        ...playerSlots.map((card, i) => BattleLogic.createBattleCard(card, i)),
        ...Array(Math.max(0, 5 - playerSlots.length)).fill(null)
      ]

      // Gọi các store bọc trong function để tránh circular
      const apiStore = useApiStore()
      const gameStore = useGameStore()
      const playerLevel = gameStore.level || 1

      // Gom tất cả các thẻ bài từ SET đã được unlock theo level
      const validSetIds = new Set<string>()
      for (const item of Object.values(apiStore.shopItems as Record<string, any>)) {
        if (item.requiredLevel <= playerLevel && item.sourceSetId) {
          validSetIds.add(item.sourceSetId)
        }
      }

      let enemyPool: any[] = []
      for (const setId of validSetIds) {
        const setCards = apiStore.setCardsCache[setId] || []
        // Chỉ lấy những lá bài CHẮC CHẮN ĐÁNH ĐƯỢC (có HP & chiêu thức)
        const validCards = setCards.filter((c: any) => 
          c.hp && parseInt(c.hp) > 0 && c.attacks && c.attacks.length > 0
        )
        enemyPool.push(...validCards)
      }

      // Fallback nếu người chơi mới tinh chưa có bộ bài nào trong cache DB: dùng bài người chơi
      if (enemyPool.length === 0) {
        enemyPool = [...this.selectedDeckCards]
      }

      // Sinh đội AI ngẫu nhiên từ Enemy Pool
      const shuffled = enemyPool.sort(() => Math.random() - 0.5)
      const enemySlots = shuffled.slice(0, 5)
      this.enemyTeam = [
        ...enemySlots.map((card, i) => BattleLogic.createBattleCard(card, i)),
        ...Array(Math.max(0, 5 - enemySlots.length)).fill(null)
      ]

      this.addLog('⚔️ Trận đấu bắt đầu!', 'system')
      this.addLog(
        `Chế độ: ${mode === 'BASIC' ? '🟢 Cơ bản (không cần Năng lượng)' : '🔵 Nâng cao (Cần gắn Năng lượng)'}`,
        'system'
      )
      this.addLog(`Pokémon của bạn: ${this.playerTeam[0]?.name} lên tiền tuyến!`, 'info')
      this.addLog(`Đối thủ: ${this.enemyTeam[0]?.name} lên tiền tuyến!`, 'info')
    },

    /**
     * Mở Battle Arena với deck do Gym Leader cung cấp sẵn.
     * Bỏ qua màn hình SETUP, vào thẳng BATTLE.
     * @param enemyDeck Deck 5 thẻ đã được gymStore generate
     * @param gymId ID của Gym Leader (để mark defeated sau khi thắng)
     */
    async openBattleWithDeck(enemyDeck: any[], gymId: string) {
      // Validation: cần player có ít nhất 1 thẻ trong binder
      const { useInventoryStore } = await import('../../inventory/store/inventoryStore')
      const { useApiStore } = await import('../../inventory/store/apiStore')
      const inventoryStore = useInventoryStore()
      const apiStore = useApiStore()

      // Lấy deck player từ binder (lấy tối đa 5 thẻ đầu tiên)
      const binderCardIds = Object.keys(inventoryStore.personalBinder).slice(0, 5)
      if (binderCardIds.length === 0) {
        this.addLog('⚠️ Bạn chưa có thẻ bài trong Binder! Hãy mở Pack trước.', 'system')
        return
      }

      const playerCards: any[] = []
      for (const cardId of binderCardIds) {
        for (const setCards of Object.values(apiStore.setCardsCache)) {
          const found = (setCards as any[]).find((c: any) => c.id === cardId)
          if (found) { playerCards.push(found); break }
        }
      }

      this.isOpen = true
      this.currentGymId = gymId  // Lưu lại để mark defeated khi thắng
      this.mode = 'BASIC'
      this.phase = 'BATTLE'
      this.currentTurn = 'player'
      this.turnNumber = 1
      this.hasAttachedEnergyThisTurn = false
      this.selectedAttackIndex = null
      this.isEnemyThinking = false
      this.logs = []
      this.winner = null

      // Khởi tạo đội player từ binder
      this.playerTeam = [
        ...playerCards.map((card, i) => BattleLogic.createBattleCard(card, i)),
        ...Array(Math.max(0, 5 - playerCards.length)).fill(null),
      ]

      // Khởi tạo đội Gym Leader từ deck được generate
      const validEnemyDeck = enemyDeck.filter(Boolean).slice(0, 5)
      this.enemyTeam = [
        ...validEnemyDeck.map((card, i) => BattleLogic.createBattleCard(card, i)),
        ...Array(Math.max(0, 5 - validEnemyDeck.length)).fill(null),
      ]

      this.addLog('🏟️ Trận đấu Gym bắt đầu!', 'system')
      this.addLog(`Pokémon của bạn: ${this.playerTeam[0]?.name} lên tiền tuyến!`, 'info')
      this.addLog(`Gym Leader: ${this.enemyTeam[0]?.name} lên tiền tuyến!`, 'info')

      useGameStore().pauseGame()
    },

    /**
     * Đóng Battle Arena, reset state, resume Phaser.
     */
    closeBattle() {
      this.isOpen = false
      this.phase = 'IDLE'
      this.playerTeam = Array(5).fill(null)
      this.enemyTeam = Array(5).fill(null)
      this.logs = []
      this.winner = null
      this.selectedAttackIndex = null
      this.selectedDeckCards = []

      // Resume Phaser engine
      useGameStore().resumeGame()
    },

    // ─────────────────────────────────────────────────────────────────
    // HÀNH ĐỘNG NGƯỜI CHƠI
    // ─────────────────────────────────────────────────────────────────

    /**
     * Người chơi tấn công bằng đòn tại index.
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

      // Áp dụng sát thương + hit animation
      defender.currentHp = Math.max(0, defender.currentHp - finalDamage)
      this.triggerHitEffect(this.enemyTeam, 0)

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
      if (await this.checkAndSetWinner()) return

      // Kết thúc lượt người chơi → AI thực hiện
      this.endPlayerTurn()
    },

    /**
     * Người chơi gắn Năng lượng vào Pokémon (Chế độ ADVANCED).
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
      if (this.mode === 'ADVANCED') this.hasAttachedEnergyThisTurn = true
      this.addLog(`⚡ Gắn Năng lượng ${energyType} vào ${card.name}!`, 'energy')
    },

    /**
     * Người chơi rút lui Active Pokémon, thay bằng Bench.
     * benchIndex: 0-3 → teamIndex: 1-4
     */
    retreat(benchIndex: number) {
      if (!this.canAct) return

      const active = this.playerTeam[0]
      const teamIndex = benchIndex + 1
      const newActive = this.playerTeam[teamIndex]

      if (!active || active.isKnockedOut) return
      if (!newActive || newActive.isKnockedOut) {
        this.addLog('Pokémon đó đã bị loại!', 'system')
        return
      }

      // Chế độ ADVANCED: Kiểm tra đủ năng lượng để rút lui
      if (this.mode === 'ADVANCED' && !BattleLogic.canRetreat(active)) {
        this.addLog(
          `${active.name} cần ${active.retreat ?? 0} Năng lượng để rút lui! (Hiện có: ${active.attachedEnergies.length})`,
          'system'
        )
        return
      }

      // Áp dụng thả năng lượng khi rút lui
      if (this.mode === 'ADVANCED') {
        active.attachedEnergies = BattleLogic.applyRetreat(active)
      }

      // Swap vị trí
      this.playerTeam[0] = newActive
      this.playerTeam[teamIndex] = active
      newActive.teamIndex = 0
      newActive.isActive = true
      active.teamIndex = teamIndex
      active.isActive = false

      this.addLog(`🔄 ${newActive.name} lên tiền tuyến thay cho ${active.name}!`, 'retreat')
    },

    // ─────────────────────────────────────────────────────────────────
    // INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────────

    /**
     * Trigger hiệu ứng shake + flash đỏ lên một thẻ khi nhận sát thương.
     * isHit = true trong 400ms rồi reset về false.
     */
    triggerHitEffect(team: (BattleCard | null)[], index: number) {
      const card = team[index]
      if (!card) return
      card.isHit = true
      setTimeout(() => {
        if (team[index]) team[index]!.isHit = false
      }, 400)
    },

    endPlayerTurn() {
      this.currentTurn = 'enemy'
      this.hasAttachedEnergyThisTurn = false
      this.turnNumber++
      this.startEnemyTurn()
    },

    async startEnemyTurn() {
      this.isEnemyThinking = true
      this.addLog(`🤖 Lượt ${this.turnNumber} - Đối thủ đang suy nghĩ...`, 'info')

      await new Promise(resolve => setTimeout(resolve, 1200))

      const enemyActive = this.enemyTeam[0]
      if (!enemyActive || enemyActive.isKnockedOut) {
        this.currentTurn = 'player'
        this.isEnemyThinking = false
        return
      }

      // Chế độ ADVANCED: AI gắn năng lượng
      if (this.mode === 'ADVANCED') {
        const energyTarget = BattleLogic.aiChooseEnergyTarget(this.enemyTeam)
        if (energyTarget >= 0) {
          const targetCard = this.enemyTeam[energyTarget]
          if (targetCard) {
            const energyType = BattleLogic.getRandomEnergyType(targetCard.types || [])
            targetCard.attachedEnergies.push(energyType)
            this.addLog(`⚡ Đối thủ gắn ${energyType} vào ${targetCard.name}!`, 'energy')
            await new Promise(resolve => setTimeout(resolve, 800))
          }
        }
      }

      // AI tấn công
      const chosenAttack = BattleLogic.aiChooseAttack(enemyActive, this.mode)
      if (!chosenAttack) {
        this.addLog(`${enemyActive.name} bỏ lượt!`, 'info')
      } else {
        const playerActive = this.playerTeam[0]
        if (playerActive && !playerActive.isKnockedOut) {
          const { finalDamage, isWeakness, isResistance } = BattleLogic.calculateDamage(
            chosenAttack.damage,
            enemyActive.types || [],
            chosenAttack.cost,
            playerActive
          )

          playerActive.currentHp = Math.max(0, playerActive.currentHp - finalDamage)
          this.triggerHitEffect(this.playerTeam, 0)

          let logText = `🤖 ${enemyActive.name} dùng ${chosenAttack.name} gây ${finalDamage} sát thương cho ${playerActive.name}!`
          if (isWeakness) logText += ' (Điểm Yếu x2!)'
          if (isResistance) logText += ' (Kháng Cự -30)'
          this.addLog(logText, 'attack')

          if (playerActive.currentHp <= 0) {
            playerActive.isKnockedOut = true
            this.addLog(`💀 ${playerActive.name} bị loại!`, 'ko')
            this.promotePlayerBench()
          }
        }
      }

      this.isEnemyThinking = false
      if (await this.checkAndSetWinner()) return
      this.currentTurn = 'player'
    },

    /** Đưa Bench đầu tiên còn sống của enemy lên Active */
    promoteEnemyBench() {
      const benchIdx = BattleLogic.aiChooseReplacement(this.enemyTeam)
      if (benchIdx < 0) return
      const bench = this.enemyTeam[benchIdx]!
      const old = this.enemyTeam[0]
      this.enemyTeam[0] = bench
      this.enemyTeam[benchIdx] = old
      bench.teamIndex = 0
      bench.isActive = true
      this.addLog(`💫 ${bench.name} của đối thủ lên tiền tuyến!`, 'info')
    },

    /** Đưa Bench đầu tiên còn sống của player lên Active */
    promotePlayerBench() {
      const benchIdx = BattleLogic.aiChooseReplacement(this.playerTeam)
      if (benchIdx < 0) return
      const bench = this.playerTeam[benchIdx]!
      const old = this.playerTeam[0]
      this.playerTeam[0] = bench
      this.playerTeam[benchIdx] = old
      bench.teamIndex = 0
      bench.isActive = true
      this.addLog(`💫 ${bench.name} của bạn lên tiền tuyến!`, 'info')
    },

    async checkAndSetWinner(): Promise<boolean> {
      const winner = BattleLogic.checkWinner(this.playerTeam, this.enemyTeam)
      if (winner) {
        this.winner = winner
        this.phase = winner === 'player' ? 'VICTORY' : 'DEFEAT'
        this.addLog(
          winner === 'player' ? '🏆 Bạn đã chiến thắng!' : '💔 Bạn đã thua!',
          'system'
        )

        // Nếu thắng Gym Leader → Cập nhật trạng thái Gym
        if (winner === 'player' && this.currentGymId) {
          const { useGymStore } = await import('../../gym/store/gymStore')
          useGymStore().defeatGymLeader(this.currentGymId)
          this.currentGymId = null
        }
        
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
      if (this.logs.length > 100) this.logs.shift()
    },

    toggleHelp() {
      this.showHelp = !this.showHelp
    },
  }
})
