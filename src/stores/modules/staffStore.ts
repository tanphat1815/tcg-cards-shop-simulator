import { defineStore } from 'pinia'
import { WORKERS } from '../../config/workerData'
import type { HiredWorker, WorkerDuty } from '../../types/game'
import { useStatsStore } from './statsStore'

/**
 * Store quản lý nhân viên và hàng chờ khách hàng.
 */
export const useStaffStore = defineStore('staff', {
  state: () => ({
    hiredWorkers: [] as HiredWorker[],
    waitingCustomers: 0,
    waitingQueue: [] as number[], // Danh sách giá tiền khách sẽ trả
  }),

  actions: {
    /**
     * Thuê nhân viên mới.
     */
    hireWorker(workerId: string) {
      const statsStore = useStatsStore()
      const data = WORKERS.find(w => w.id === workerId)
      if (!data || statsStore.money < data.hiringFee || statsStore.level < data.levelUnlocked) return false
      
      statsStore.spendMoney(data.hiringFee)
      this.hiredWorkers.push({
        instanceId: `worker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        workerId: workerId,
        duty: 'NONE'
      })
      return true
    },

    /**
     * Phân công nhiệm vụ cho nhân viên.
     */
    changeWorkerDuty(instanceId: string, duty: WorkerDuty) {
      const worker = this.hiredWorkers.find(w => w.instanceId === instanceId)
      if (!worker) return
      
      // Nếu làm thu ngân, hủy phân công của thu ngân cũ (chỉ 1 thu ngân tại 1 thời điểm)
      if (duty === 'CASHIER') {
        this.hiredWorkers.forEach(w => {
          if (w.duty === 'CASHIER') w.duty = 'NONE'
        })
      }
      worker.duty = duty
    },

    /**
     * Sa thải nhân viên.
     */
    terminateWorker(instanceId: string) {
      this.hiredWorkers = this.hiredWorkers.filter(w => w.instanceId !== instanceId)
    },

    /**
     * Tính tổng lương phải trả cho tất cả nhân viên.
     */
    calculateTotalSalary() {
      let total = 0
      this.hiredWorkers.forEach(hw => {
        const data = WORKERS.find(w => w.id === hw.workerId)
        if (data) total += data.salary
      })
      return total
    },

    /**
     * Thêm khách vào hàng chờ thu ngân.
     */
    addWaitingCustomer(price: number) {
      this.waitingCustomers++
      this.waitingQueue.push(price)
    },

    /**
     * Chấp nhận thanh toán cho khách hàng đầu tiên trong hàng.
     */
    serveCustomer() {
      if (this.waitingCustomers > 0) {
        const statsStore = useStatsStore()
        this.waitingCustomers--
        const price = this.waitingQueue.shift() || 0
        
        statsStore.addMoney(price)
        statsStore.dailyStats.customersServed++
        statsStore.dailyStats.revenue += price
        statsStore.gainExp(5) // Thưởng 5 XP mỗi lần thanh toán
      }
    }
  }
})
