import { defineStore } from 'pinia'
import { WORKERS } from '../config'
import { useStatsStore } from '../../stats/store/statsStore'
import type { HiredWorker, WorkerDuty } from '../types'

/**
 * StaffStore - Quản lý nhân sự và phân công công việc trong Shop.
 */
export const useStaffStore = defineStore('staff', {
  state: () => ({
    /** Danh sách các nhân viên đã được thuê và đang có mặt trong Shop */
    hiredWorkers: [] as HiredWorker[],
  }),
  actions: {
    /**
     * Thuê một nhân viên mới.
     */
    hireWorker(workerId: string) {
      const statsStore = useStatsStore()
      
      if (this.hiredWorkers.some(hw => hw.dataId === workerId)) {
        return false
      }

      const data = WORKERS.find(w => w.id === workerId)
      if (!data) return false
      
      if (!statsStore.spendMoney(data.hiringFee)) return false
      if (statsStore.level < data.levelUnlocked) return false

      this.hiredWorkers.push({
        instanceId: `worker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        dataId: workerId,
        duty: 'NONE',
        x: 0,
        y: 0,
        state: 'IDLE'
      })
      return true
    },

    changeWorkerDuty(instanceId: string, duty: WorkerDuty, targetDeskId?: string | null) {
      const worker = this.hiredWorkers.find(w => w.instanceId === instanceId)
      if (!worker) return

      if (duty === 'CHECKOUT' && targetDeskId) {
        this.hiredWorkers.forEach(w => {
          if (w.duty === 'CHECKOUT' && w.targetDeskId === targetDeskId) {
            w.duty = 'NONE'
            w.targetDeskId = null
          }
        })
      }

      worker.duty = duty
      worker.targetDeskId = (duty === 'CHECKOUT') ? targetDeskId : null
    },

    terminateWorker(instanceId: string) {
      this.hiredWorkers = this.hiredWorkers.filter(w => w.instanceId !== instanceId)
    },

    getTotalSalary(): number {
      let totalSalary = 0
      this.hiredWorkers.forEach(hw => {
        const data = WORKERS.find(w => w.id === hw.dataId)
        if (data) totalSalary += data.salary
      })
      return totalSalary
    },

    loadStaff(parsed: any) {
      this.hiredWorkers = parsed.hiredWorkers ?? []
    }
  }
})