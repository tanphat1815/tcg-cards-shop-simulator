import { defineStore } from 'pinia'
import { getRequiredExp } from '../../config/leveling'
import { EXPANSIONS_LOT_A } from '../../config/expansionData'
import { useStaffStore } from './staffStore'
import { useShopStore } from './shopStore'

/**
 * Store quản lý các chỉ số cơ bản của người chơi (Tiền, Cấp độ, Thời gian).
 */
export const useStatsStore = defineStore('stats', {
  state: () => ({
    money: 1000,
    level: 1,
    currentExp: 0,
    showLevelUpNext: false,
    currentDay: 1,
    timeInMinutes: 480, // 8:00 AM
    dailyStats: {
      revenue: 0,
      customersServed: 0,
      itemsSold: 0
    }
  }),

  getters: {
    /**
     * Tính lượng XP cần thiết để lên cấp tiếp theo.
     */
    requiredExp: (state) => getRequiredExp(state.level),
  },

  actions: {
    /**
     * Cộng tiền cho người chơi.
     */
    addMoney(amount: number) {
      this.money += amount
    },

    /**
     * Trừ tiền người chơi (nếu đủ).
     * @returns {boolean} True nếu thanh toán thành công.
     */
    spendMoney(amount: number) {
      if (this.money >= amount) {
        this.money -= amount
        return true
      }
      return false
    },

    /**
     * Cộng kinh nghiệm và kiểm tra lên cấp.
     */
    gainExp(amount: number) {
      this.currentExp += amount
      const req = this.requiredExp
      if (this.currentExp >= req) {
        this.level++
        this.currentExp = this.currentExp - req
        this.showLevelUpNext = true
        this.gainExp(0) // Đệ quy nếu XP dư quá nhiều
      }
    },

    /**
     * Cập nhật thời gian trong game.
     */
    tickTime(minutes: number, shopState: 'OPEN' | 'CLOSED') {
      if (shopState === 'OPEN') {
        this.timeInMinutes += minutes
        if (this.timeInMinutes >= 1200) { // 8:00 PM
          this.timeInMinutes = 1200
          return true // Trả về true để báo hiệu cần đóng cửa
        }
      }
      return false
    },

    /**
     * Bắt đầu một ngày mới, trừ tiền thuê mặt bằng và lương nhân viên.
     */
    startNewDay() {
      const staffStore = useStaffStore()
      const shopStore = useShopStore()

      // Trừ lương nhân viên
      let totalSalary = staffStore.calculateTotalSalary()
      this.money -= totalSalary
      
      // Trừ tiền thuê mặt bằng
      let totalRent = 50 
      for (let i = 0; i < shopStore.expansionLevel; i++) {
        totalRent += EXPANSIONS_LOT_A[i].rentIncrease
      }
      this.money -= totalRent

      this.currentDay++
      this.timeInMinutes = 480
      this.dailyStats = { revenue: 0, customersServed: 0, itemsSold: 0 }
      shopStore.showEndDayModal = false
    }
  }
})
