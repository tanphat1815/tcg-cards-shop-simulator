import { defineStore } from 'pinia'
import { WORKERS } from '../../config/workerData'
import { useStatsStore } from './statsStore'
import type { HiredWorker, WorkerDuty } from '../../types/gameTypes'

/**
 * Store quản lý nhân viên
 */
export const useStaffStore = defineStore('staff', {
  state: () => ({
    hiredWorkers: [] as HiredWorker[],
  }),
  actions: {
    /**
     * Thuê nhân viên
     */
    hireWorker(workerId: string) {
      const statsStore = useStatsStore()
      const data = WORKERS.find(w => w.id === workerId)
      if (!data) return false
      if (!statsStore.spendMoney(data.hiringFee)) return false
      if (statsStore.level < data.levelUnlocked) return false

      this.hiredWorkers.push({
        instanceId: `worker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        workerId: workerId,
        duty: 'NONE'
      })
      return true
    },
    /**
     * Thay đổi nhiệm vụ nhân viên
     */
    changeWorkerDuty(instanceId: string, duty: WorkerDuty) {
      const worker = this.hiredWorkers.find(w => w.instanceId === instanceId)
      if (!worker) return

      // If setting to CASHIER, unassign previous cashier
      if (duty === 'CASHIER') {
        this.hiredWorkers.forEach(w => {
          if (w.duty === 'CASHIER') w.duty = 'NONE'
        })
      }

      worker.duty = duty
    },
    /**
     * Sa thải nhân viên
     */
    terminateWorker(instanceId: string) {
      this.hiredWorkers = this.hiredWorkers.filter(w => w.instanceId !== instanceId)
    },
    /**
     * Tính tổng lương
     */
    getTotalSalary(): number {
      let totalSalary = 0
      this.hiredWorkers.forEach(hw => {
        const data = WORKERS.find(w => w.id === hw.workerId)
        if (data) totalSalary += data.salary
      })
      return totalSalary
    },
    /**
     * Load dữ liệu từ save (phần staff)
     */
    loadStaff(parsed: any) {
      this.hiredWorkers = parsed.hiredWorkers ?? []
    }
  }
})