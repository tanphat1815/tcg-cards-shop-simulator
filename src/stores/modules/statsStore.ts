import { defineStore } from 'pinia'
import { getRequiredExp } from '../../config/leveling'
import { EXPANSIONS_LOT_A } from '../../config/expansionData'

/**
 * Store quản lý thống kê và tiến trình của shop
 * Bao gồm tiền, level, thời gian, thống kê hàng ngày
 */
export const useStatsStore = defineStore('stats', {
  state: () => ({
    money: 1000,
    level: 1,
    currentExp: 0,
    showLevelUpNext: false,
    dailyStats: {
      revenue: 0,
      customersServed: 0,
      itemsSold: 0
    },
    currentDay: 1,
    timeInMinutes: 480, // 8:00 AM
    expansionLevel: 0,
    showEndDayModal: false,
    showSettings: false,
    settings: {
      showExpansionPreview: true,
      expansionPreviewStyle: 'GLOW' as 'BLUEPRINT' | 'GLOW'
    },
  }),
  getters: {
    requiredExp: (state) => getRequiredExp(state.level),
  },
  actions: {
    /**
     * Thêm tiền vào shop
     */
    addMoney(amount: number) {
      this.money += amount
    },
    /**
     * Trừ tiền nếu đủ
     */
    spendMoney(amount: number) {
      if (this.money >= amount) {
        this.money -= amount
        return true
      }
      return false
    },
    /**
     * Nhận kinh nghiệm và lên level nếu đủ
     */
    gainExp(amount: number) {
      this.currentExp += amount
      const req = getRequiredExp(this.level)
      if (this.currentExp >= req) {
        this.level++
        this.currentExp = this.currentExp - req
        this.showLevelUpNext = true
        // Recurse in case of massive XP
        this.gainExp(0)
      }
    },
    /**
     * Tăng thời gian
     */
    tickTime(minutes: number) {
      this.timeInMinutes += minutes
      if (this.timeInMinutes >= 1200) {
        this.timeInMinutes = 1200
      }
    },
    /**
     * Bắt đầu ngày mới
     */
    startNewDay(totalSalary: number) {
      // Deduct worker salaries
      this.money -= totalSalary

      // Deduct rent
      let totalRent = 50 // Base rent
      for (let i = 0; i < this.expansionLevel; i++) {
        totalRent += EXPANSIONS_LOT_A[i].rentIncrease
      }
      this.money -= totalRent

      this.currentDay++
      this.timeInMinutes = 480 // 8:00 AM
      this.showEndDayModal = false
      this.dailyStats = { revenue: 0, customersServed: 0, itemsSold: 0 }
    },
    /**
     * Mua mở rộng shop
     */
    buyExpansion() {
      const nextId = this.expansionLevel + 1
      const config = EXPANSIONS_LOT_A.find(e => e.id === nextId)
      if (!config) return false // Max level

      if (this.money < config.cost) return false
      if (this.level < config.requiredLevel) return false

      this.money -= config.cost
      this.expansionLevel = nextId
      return true
    },
    /**
     * Load dữ liệu từ save (phần stats)
     */
    loadStats(parsed: any) {
      this.money = parsed.money ?? 1000
      this.level = parsed.level ?? 1
      this.currentExp = parsed.currentExp ?? 0
      this.currentDay = parsed.currentDay ?? 1
      this.timeInMinutes = parsed.timeInMinutes ?? 480
      this.expansionLevel = parsed.expansionLevel ?? 0
      if (parsed.settings) {
        this.settings = { ...this.settings, ...parsed.settings }
      }
    }
  }
})