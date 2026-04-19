import { defineStore } from 'pinia'
import type { CartState } from '../types/cart'
import { getPackVisuals, getBoxVisuals } from '../config/assetRegistry'
import { useInventoryStore } from '../store/inventoryStore'
import { useStatsStore } from '../../stats/store/statsStore'

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
    isOpen: false,
    addModalItemId: null,
  }),

  getters: {
    totalItems: (state) => state.items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: (state) => state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    itemCount: (state) => state.items.length,
  },

  actions: {
    openAddModal(itemId: string) {
      this.addModalItemId = itemId
    },
    closeAddModal() {
      this.addModalItemId = null
    },
    toggleCart() {
      this.isOpen = !this.isOpen
    },
    closeCart() {
      this.isOpen = false
    },

    addItem(shopItem: any, qty: number) {
      const existing = this.items.find(i => i.itemId === shopItem.id)
      if (existing) {
        existing.quantity += qty
        return
      }
      const imageUrl = shopItem.type === 'pack'
        ? getPackVisuals(shopItem.sourceSetId ?? shopItem.id).front
        : getBoxVisuals(shopItem.sourceSetId ?? shopItem.id).front

      this.items.push({
        itemId: shopItem.id,
        name: shopItem.name,
        type: shopItem.type,
        unitPrice: shopItem.buyPrice,
        sellPrice: shopItem.sellPrice,
        basePrice: shopItem.basePrice ?? shopItem.buyPrice,
        rarityBonusPercent: shopItem.rarityBonusPercent ?? 0,
        quantity: qty,
        imageUrl,
        sourceSetId: shopItem.sourceSetId,
      })
    },

    updateQuantity(itemId: string, delta: number) {
      const item = this.items.find(i => i.itemId === itemId)
      if (!item) return
      item.quantity = Math.max(0, item.quantity + delta)
      if (item.quantity === 0) this.removeItem(itemId)
    },

    removeItem(itemId: string) {
      this.items = this.items.filter(i => i.itemId !== itemId)
    },

    /**
     * Thực hiện thanh toán: duyệt từng CartItem, gọi inventoryStore.buyStock
     * Trả về { success: boolean, failedItems: string[] }
     */
    checkout(): { success: boolean; failedItems: string[] } {
      const inventoryStore = useInventoryStore()
      const statsStore = useStatsStore()

      const failedItems: string[] = []
      const totalCost = this.subtotal

      if (statsStore.money < totalCost) {
        return { success: false, failedItems: ['Không đủ tiền'] }
      }

      for (const cartItem of this.items) {
        const ok = inventoryStore.buyStock(cartItem.itemId, cartItem.quantity)
        if (!ok) failedItems.push(cartItem.name)
      }

      if (failedItems.length === 0) {
        this.items = []
        this.isOpen = false
        return { success: true, failedItems: [] }
      }
      return { success: false, failedItems }
    },
  },
})
