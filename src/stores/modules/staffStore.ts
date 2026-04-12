import { defineStore } from 'pinia'
import { WORKERS } from '../../config/workerData'
import { useStatsStore } from './statsStore'
import type { HiredWorker, WorkerDuty } from '../../types/gameTypes'

/**
 * StaffStore - Quản lý nhân sự và phân công công việc trong Shop.
 * 
 * Các trách nhiệm chính:
 * - Tuyển dụng: Kiểm tra điều kiện (tiền, level) và ngăn chặn thuê trùng nhân viên.
 * - Phân công: Quản lý các loại nhiệm vụ (Duty) như Thu ngân, Kiểm kho.
 * - Tài chính: Tính toán tổng chi phí tiền lương hàng ngày.
 * - Lưu trữ: Duy trì danh sách nhân viên hiện có xuyên suốt các Scene.
 */
export const useStaffStore = defineStore('staff', {
  state: () => ({
    /** Danh sách các nhân viên đã được thuê và đang có mặt trong Shop */
    hiredWorkers: [] as HiredWorker[],
  }),
  actions: {
    /**
     * Thuê một nhân viên mới.
     * @param workerId ID định danh của nhân viên trong workerData.
     * @returns {boolean} True nếu thuê thành công.
     */
    hireWorker(workerId: string) {
      const statsStore = useStatsStore()
      
      // 1. Ngăn chặn thuê trùng một nhân viên nhiều lần
      if (this.hiredWorkers.some(hw => hw.workerId === workerId)) {
        console.warn(`[Staff] Nhân viên với ID ${workerId} đã có mặt trong shop.`)
        return false
      }

      // 2. Tìm kiếm thông tin profile nhân viên
      const data = WORKERS.find(w => w.id === workerId)
      if (!data) return false
      
      // 3. Kiểm tra điều kiện tài chính và cấp độ
      if (!statsStore.spendMoney(data.hiringFee)) return false
      if (statsStore.level < data.levelUnlocked) return false

      // 4. Tạo thực thể (instance) nhân viên với ID duy nhất
      this.hiredWorkers.push({
        instanceId: `worker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        workerId: workerId,
        duty: 'NONE' // Mặc định khi mới thuê sẽ không có nhiệm vụ
      })
      return true
    },

    /**
     * Phân công hoặc thay đổi nhiệm vụ cho nhân viên.
     * 
     * Quy tắc đặc biệt: 
     * - Nhiệm vụ 'CASHIER' (Thu ngân) là độc bản. 
     * - Nếu gán CASHIER cho nhân viên A, nhân viên B đang làm CASHIER sẽ tự động bị Reset về NONE.
     */
    changeWorkerDuty(instanceId: string, duty: WorkerDuty) {
      const worker = this.hiredWorkers.find(w => w.instanceId === instanceId)
      if (!worker) return

      // Logic Unassign: Đảm bảo shop chỉ có tối đa 1 thu ngân
      if (duty === 'CASHIER') {
        this.hiredWorkers.forEach(w => {
          if (w.duty === 'CASHIER') w.duty = 'NONE'
        })
      }

      worker.duty = duty
    },

    /**
     * Sa thải nhân viên. 
     * Nhân viên sẽ bị xóa hoàn toàn khỏi Shop và danh sách trả lương.
     */
    terminateWorker(instanceId: string) {
      this.hiredWorkers = this.hiredWorkers.filter(w => w.instanceId !== instanceId)
    },

    /**
     * Tính toán tổng quỹ lương phải trả vào mỗi cuối ngày.
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
     * Khôi phục danh sách nhân sự từ bản lưu.
     */
    loadStaff(parsed: any) {
      this.hiredWorkers = parsed.hiredWorkers ?? []
    }
  }
})