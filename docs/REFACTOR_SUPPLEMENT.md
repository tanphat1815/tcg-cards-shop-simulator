# REFACTOR_SUPPLEMENT.md (04 13 2025)
## Tài liệu Bổ sung cho REFACTOR_BLUEPRINT.md
**Đọc file này SAU khi đọc REFACTOR_BLUEPRINT.md**
**Mục đích:** Vá các lỗ hổng nguy hiểm mà Blueprint gốc bỏ sót để AI có thể refactor mà không làm vỡ game.

---

## ⚠️ LƯU Ý QUAN TRỌNG TRƯỚC KHI BẮT ĐẦU

### Reset Data Cũ (Bắt buộc)
Do thay đổi cấu trúc store, data cũ trong localStorage **KHÔNG tương thích**. AI phải thêm đoạn code sau vào `gameStore.ts` trong hàm `loadSave()`:

```typescript
// gameStore.ts - loadSave()
loadSave() {
  // XÓA TOÀN BỘ save cũ để tránh conflict sau refactor
  localStorage.removeItem('tcg-shop-save')
  localStorage.removeItem('tcg-shop-api-cache')
  console.log('[GameStore] Save data cleared due to refactor. Starting fresh.')
  
  // Sau khi đã ổn định, có thể implement load lại ở đây
}
```

**Lý do:** Cấu trúc save cũ dùng `shopStore` flat object. Sau refactor tách thành `furnitureStore` + `customerStore`, format không còn khớp và sẽ gây crash hoặc load data sai vào sai store.

---

## 🔴 BỔ SUNG PHẦN 1: `gameStore.ts` (Facade) — Cập nhật bắt buộc sau Phase 2

Blueprint gốc nói "giữ nguyên Facade" nhưng **không chỉ rõ** cần update những getter/action nào. Đây là danh sách đầy đủ:

### 1.1 Getters cần đổi source sau khi tách shopStore

```typescript
// TRƯỚC (trỏ vào shopStore)
shopState: () => useShopStore().shopState,
waitingCustomers: () => useShopStore().waitingCustomers,
waitingQueue: () => useShopStore().waitingQueue,

// SAU (tách ra 2 store)
// Các getter liên quan FURNITURE → trỏ vào useFurnitureStore()
placedShelves: () => useFurnitureStore().placedShelves,
placedTables: () => useFurnitureStore().placedTables,
placedCashiers: () => useFurnitureStore().placedCashiers,
purchasedFurniture: () => useFurnitureStore().purchasedFurniture,
activeShelfId: () => useFurnitureStore().activeShelfId,
showShelfMenu: () => useFurnitureStore().showShelfMenu,
showBuildMenu: () => useFurnitureStore().showBuildMenu,
isBuildMode: () => useFurnitureStore().isBuildMode,
buildItemId: () => useFurnitureStore().buildItemId,
isEditMode: () => useFurnitureStore().isEditMode,
editFurnitureData: () => useFurnitureStore().editFurnitureData,

// Các getter liên quan CUSTOMER → trỏ vào useCustomerStore()
shopState: () => useCustomerStore().shopState,
waitingCustomers: () => useCustomerStore().waitingQueue.length,
waitingQueue: () => useCustomerStore().waitingQueue,

// showOnlineShop và showBinderMenu vẫn ở furnitureStore hoặc tạo UI store riêng
showOnlineShop: () => useFurnitureStore().showOnlineShop,
showBinderMenu: () => useFurnitureStore().showBinderMenu,

// Cá nhân tôi nghĩ là tạo UI store riêng thay vì gộp chung vào furnitureStore

// Thêm các getter mới cho các tính năng khác
// Inventory
inventory: () => useInventoryStore().inventory,
stock: () => useInventoryStore().stock,
packs: () => useInventoryStore().packs,

// Progression
playerLevel: () => useStatsStore().playerLevel,
playerExp: () => useStatsStore().playerExp,
nextLevelExp: () => useStatsStore().nextLevelExp,

// API
apiCache: () => useApiStore().apiCache,
```

### 1.2 Actions cần đổi target sau khi tách shopStore

```typescript
// Nhóm FURNITURE actions → delegate sang useFurnitureStore()
setShopState(newState) { useCustomerStore().setShopState(newState) },  // ← customerStore!
addWaitingCustomer(price, instanceId) { useCustomerStore().addWaitingCustomer(price, instanceId) },
serveCustomer() { return useCustomerStore().serveCustomer() },
forceEndDay() { useCustomerStore().forceEndDay() },

openShelfManagement(shelfId) { useFurnitureStore().openShelfManagement(shelfId) },
closeShelfManagement() { useFurnitureStore().closeShelfManagement() },
moveToTierSlot(itemId, tierIndex) { useFurnitureStore().moveToTierSlot(itemId, tierIndex) },
fillTier(itemId, tierIndex) { useFurnitureStore().fillTier(itemId, tierIndex) },
clearTier(shelfId, tierIndex) { useFurnitureStore().clearTier(shelfId, tierIndex) },
clearEntireShelf() { useFurnitureStore().clearEntireShelf() },
npcTakeItemFromSlot(shelfId) { return useFurnitureStore().npcTakeItemFromSlot(shelfId) },

buyFurniture(furnitureId) { return useFurnitureStore().buyFurniture(furnitureId) },
startBuildMode(furnitureId) { useFurnitureStore().startBuildMode(furnitureId) },
cancelBuildMode() { useFurnitureStore().cancelBuildMode() },
placeFurniture(x, y, rotation) { return useFurnitureStore().placeFurniture(x, y, rotation) },
pickUpFurniture(instanceId, type) { return useFurnitureStore().pickUpFurniture(instanceId, type) },
warehouseFurniture() { useFurnitureStore().warehouseFurniture() },
toggleEditMode() { useFurnitureStore().toggleEditMode() },

joinTable(tableId, instanceId) { return useFurnitureStore().joinTable(tableId, instanceId) },
startMatch(tableId) { useFurnitureStore().startMatch(tableId) },
finishMatch(tableId) { useFurnitureStore().finishMatch(tableId) },
```

### 1.3 Import mới cần thêm vào gameStore.ts

```typescript
// Thêm 2 import mới, giữ nguyên các import cũ khác
import { useFurnitureStore } from './modules/furnitureStore'  // NEW
import { useCustomerStore } from './modules/customerStore'    // NEW
// XÓA: import { useShopStore } from './modules/shopStore'   — không còn dùng trực tiếp
```

---

## 🔴 BỔ SUNG PHẦN 2: `App.vue` — Subscribe Pattern phải đổi

Blueprint gốc **hoàn toàn bỏ qua** vấn đề này. Đây là bug quan trọng nhất sau refactor.

### Vấn đề
```typescript
// App.vue HIỆN TẠI — sẽ KHÔNG còn hoạt động sau refactor
store.$subscribe(() => {
  store.saveGame()
}, { deep: true })
```

**Lý do vỡ:** Pinia subscribe trên Facade Store sẽ KHÔNG bắt được thay đổi từ `furnitureStore` hay `customerStore`. Getter proxy không trigger subscription.

### Giải pháp — Subscribe vào từng store con

```typescript
// App.vue — SAU REFACTOR
import { useGameStore } from './stores/gameStore'
import { useFurnitureStore } from './stores/modules/furnitureStore'
import { useCustomerStore } from './stores/modules/customerStore'
import { useInventoryStore } from './stores/modules/inventoryStore'
import { useStatsStore } from './stores/modules/statsStore'

const store = useGameStore()
const furnitureStore = useFurnitureStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()
const statsStore = useStatsStore()

onMounted(() => {
  store.loadSave()

  // Subscribe vào TẤT CẢ store con để auto-save
  const saveCallback = () => store.saveGame()

  statsStore.$subscribe(saveCallback, { deep: true })
  inventoryStore.$subscribe(saveCallback, { deep: true })
  furnitureStore.$subscribe(saveCallback, { deep: true })
  customerStore.$subscribe(saveCallback, { deep: true })
})
```

---

## 🔴 BỔ SUNG PHẦN 3: `NPCManager.ts` — Import phải đổi sau Phase 2

`NPCManager.ts` hiện tại import trực tiếp `useShopStore` để lấy `waitingQueue` và `placedCashiers`. Sau khi tách, AI phải update các chỗ sau:

### 3.1 Các import cần đổi trong NPCManager.ts

```typescript
// TRƯỚC
import { useShopStore } from '../../stores/modules/shopStore'

// SAU — tách thành 2 import
import { useFurnitureStore } from '../../stores/modules/furnitureStore'
import { useCustomerStore } from '../../stores/modules/customerStore'
```

### 3.2 Các chỗ dùng shopStore trong NPCManager.ts cần đổi

```typescript
// Trong handleInteract() — lấy placedCashiers và addWaitingCustomer
// TRƯỚC:
const store = useGameStore()
const shopStore = useShopStore()
store.addWaitingCustomer(customer.targetPrice, customer.instanceId)
const cashier = Object.values(shopStore.placedCashiers)[0]

// SAU:
const furnitureStore = useFurnitureStore()
const customerStore = useCustomerStore()
customerStore.addWaitingCustomer(customer.targetPrice, customer.instanceId)
const cashier = Object.values(furnitureStore.placedCashiers)[0]

// Trong handleWaiting() — lấy waitingQueue
// TRƯỚC:
const shopStore = useShopStore()
const myIndex = shopStore.waitingQueue.findIndex(...)
const cashier = Object.values(shopStore.placedCashiers)[0]

// SAU:
const customerStore = useCustomerStore()
const furnitureStore = useFurnitureStore()
const myIndex = customerStore.waitingQueue.findIndex(...)
const cashier = Object.values(furnitureStore.placedCashiers)[0]

// Trong updateNPCs() — check isInQueue
// TRƯỚC:
const isInQueue = gameStore.waitingQueue.some(...)

// SAU:
const isInQueue = useCustomerStore().waitingQueue.some(...)
```

---

## 🔴 BỔ SUNG PHẦN 4: Circular Dependency — `inventoryStore` ↔ `gameStore`

### Vấn đề hiện tại
```typescript
// inventoryStore.ts — dòng cuối closePackOpening()
import { useGameStore } from '../gameStore'  // ← import gameStore
const gameStore = useGameStore()
gameStore.saveGame()  // ← gọi saveGame của gameStore
```

`gameStore.ts` lại import `inventoryStore`. Đây là **circular dependency** tiềm ẩn.

### Giải pháp
Trong `inventoryStore.ts`, thay vì gọi `gameStore.saveGame()`, tự implement save trực tiếp:

```typescript
// inventoryStore.ts — closePackOpening()
closePackOpening() {
  this.isOpeningPack = false
  this.currentPack = []

  // Tự save thay vì gọi gameStore để tránh circular dependency
  // Chỉ save phần inventory, không cần save toàn bộ game
  try {
    const existing = JSON.parse(localStorage.getItem('tcg-shop-save') || '{}')
    existing.shopInventory = this.shopInventory
    existing.personalBinder = this.personalBinder
    localStorage.setItem('tcg-shop-save', JSON.stringify(existing))
  } catch (e) {
    console.warn('[InventoryStore] Auto-save failed:', e)
  }
}
```

**Hoặc** (cách sạch hơn): Xóa hoàn toàn auto-save trong `closePackOpening()` và để `App.vue` subscribe handle việc save.

---

## 🟠 BỔ SUNG PHẦN 5: `ShelfManagementMenu.vue` — Import cần đổi

File này hiện import `useShopStore` để dùng cả furniture lẫn customer logic:

```typescript
// TRƯỚC
import { useShopStore } from '../stores/modules/shopStore'
const shopStore = useShopStore()

// SAU
import { useFurnitureStore } from '../stores/modules/furnitureStore'
const furnitureStore = useFurnitureStore()

// Đổi tất cả shopStore.xxx → furnitureStore.xxx trong template và script
// Ví dụ:
// shopStore.activeShelfId      → furnitureStore.activeShelfId
// shopStore.placedShelves      → furnitureStore.placedShelves
// shopStore.showShelfMenu      → furnitureStore.showShelfMenu
// shopStore.clearTier()        → furnitureStore.clearTier()
// shopStore.fillTier()         → furnitureStore.fillTier()
// shopStore.moveToTierSlot()   → furnitureStore.moveToTierSlot()
// shopStore.clearEntireShelf() → furnitureStore.clearEntireShelf()
// shopStore.closeShelfManagement() → furnitureStore.closeShelfManagement()
```

---

## 🟠 BỔ SUNG PHẦN 6: `BuildMenu.vue` — Import cần đổi

```typescript
// TRƯỚC
import { useShopStore } from '../stores/modules/shopStore'
const shopStore = useShopStore()

// SAU
import { useFurnitureStore } from '../stores/modules/furnitureStore'
const furnitureStore = useFurnitureStore()

// Đổi tất cả:
// shopStore.showBuildMenu    → furnitureStore.showBuildMenu
// shopStore.purchasedFurniture → furnitureStore.purchasedFurniture
// shopStore.isEditMode       → furnitureStore.isEditMode
// shopStore.startBuildMode() → furnitureStore.startBuildMode()
// shopStore.toggleEditMode() → furnitureStore.toggleEditMode()
```

---

## 🟠 BỔ SUNG PHẦN 7: `OnlineShopMenu.vue` — Import cần đổi

```typescript
// TRƯỚC
import { useShopStore } from '../stores/modules/shopStore'
const shopStore = useShopStore()

// SAU
import { useFurnitureStore } from '../stores/modules/furnitureStore'
const furnitureStore = useFurnitureStore()

// Đổi:
// shopStore.buyFurniture()       → furnitureStore.buyFurniture()
// shopStore.purchasedFurniture   → furnitureStore.purchasedFurniture
// shopStore.placedCashiers       → furnitureStore.placedCashiers
// shopStore.showOnlineShop       → furnitureStore.showOnlineShop
// shopStore.isEditMode           → furnitureStore.isEditMode
```

---

## 🟡 BỔ SUNG PHẦN 8: `CustomerServiceManager` — Spec đầy đủ

Blueprint mention `CustomerServiceManager` (NEW) nhưng không có spec. Đây là spec để AI implement:

```typescript
// src/features/shop/managers/CustomerServiceManager.ts
// Hoặc nếu chưa refactor sang features: src/game/managers/CustomerServiceManager.ts

/**
 * CustomerServiceManager - Xử lý các animation và visual feedback
 * khi khách hàng được phục vụ tại quầy thu ngân.
 * 
 * Tách ra từ MainScene để giữ MainScene gọn.
 * Không có AI logic — chỉ xử lý visual effects.
 */
export class CustomerServiceManager {
  private scene: Phaser.Scene
  private lastAutoCheckoutTime: number = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Xử lý Auto Checkout bởi nhân viên Thu ngân (CASHIER).
   * Được gọi từ MainScene.update() mỗi frame.
   */
  public handleAutoCheckout(time: number) {
    const store = useGameStore()
    if (store.waitingCustomers <= 0) return

    const cashier = store.hiredWorkers.find((w: any) => w.duty === 'CASHIER')
    if (!cashier) return

    const workerData = WORKERS.find(w => w.id === cashier.workerId)
    if (!workerData) return

    const cooldown = SPEED_TO_MS[workerData.checkoutSpeed]
    if (time > this.lastAutoCheckoutTime + cooldown) {
      store.serveCustomer()
      this.lastAutoCheckoutTime = time
      this.showAutoCheckoutEffect(cashier)
    }
  }

  /**
   * Hiện popup "💳 Auto" tại vị trí quầy thu ngân.
   */
  private showAutoCheckoutEffect(cashier: any) {
    const shopStore = useFurnitureStore()
    const desk = cashier.targetDeskId 
      ? shopStore.placedCashiers[cashier.targetDeskId]
      : Object.values(shopStore.placedCashiers)[0]
    
    if (!desk) return

    const pulse = this.scene.add.text(desk.x, desk.y - 40, '💳 Auto', {
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5)

    this.scene.tweens.add({
      targets: pulse,
      y: pulse.y - 20,
      alpha: 0,
      duration: 1000,
      onComplete: () => pulse.destroy()
    })
  }
}
```

**Lưu ý khi update MainScene.ts:** Di chuyển `handleAutoCheckout()` hiện có trong MainScene sang class này, sau đó gọi:
```typescript
// MainScene.update()
this.customerServiceManager.handleAutoCheckout(time)
// XÓA: this.handleAutoCheckout(time)
```

---

## 📋 BỔ SUNG PHẦN 9: Thứ tự thực hiện bắt buộc (Override Section 5 của Blueprint)

Blueprint gốc có lộ trình 6 Phase nhưng thiếu checkpoint kiểm tra build. Thứ tự **chính xác** để không vỡ:

```
BƯỚC 0: Git commit (snapshot) + xóa localStorage trong loadSave()
  └─ npm run build ✅

BƯỚC 1: Tạo furnitureStore.ts (copy logic từ shopStore)
  └─ npm run build ✅ (shopStore vẫn tồn tại song song)

BƯỚC 2: Tạo customerStore.ts (copy logic từ shopStore)
  └─ npm run build ✅

BƯỚC 3: Update gameStore.ts Facade — đổi import và getters/actions
  └─ npm run build ✅ (quan trọng nhất, phải pass trước khi tiếp tục)

BƯỚC 4: Update App.vue subscribe pattern
  └─ npm run build ✅

BƯỚC 5: Update NPCManager.ts imports
  └─ npm run build ✅

BƯỚC 6: Update ShelfManagementMenu.vue, BuildMenu.vue, OnlineShopMenu.vue
  └─ npm run build ✅

BƯỚC 7: Xóa shopStore.ts (hoặc convert thành barrel export rỗng)
  └─ npm run build ✅

BƯỚC 8: Di chuyển handleAutoCheckout() sang CustomerServiceManager
  └─ npm run build ✅

BƯỚC 9 (nếu làm feature-based): Di chuyển files vào src/features/
  └─ npm run build ✅
```

**QUY TẮC SẮT:** Mỗi bước PHẢI pass `npm run build` trước khi qua bước tiếp theo. Nếu build lỗi → fix ngay tại bước đó, KHÔNG tiếp tục.

---

## 📋 BỔ SUNG PHẦN 10: Danh sách file cần đổi import (Checklist đầy đủ)

Đây là danh sách **tất cả** file có `import { useShopStore }` cần được update:

| File | Import cũ | Import mới |
|------|-----------|------------|
| `src/stores/gameStore.ts` | `useShopStore` | `useFurnitureStore` + `useCustomerStore` |
| `src/game/managers/NPCManager.ts` | `useShopStore` | `useFurnitureStore` + `useCustomerStore` |
| `src/game/managers/StaffManager.ts` | `useGameStore` (gián tiếp) | Kiểm tra và đổi nếu cần |
| `src/components/ShelfManagementMenu.vue` | `useShopStore` | `useFurnitureStore` |
| `src/components/BuildMenu.vue` | `useShopStore` | `useFurnitureStore` |
| `src/components/OnlineShopMenu.vue` | `useShopStore` | `useFurnitureStore` |
| `src/components/UIOverlay.vue` | `useGameStore` (facade) | Giữ nguyên — facade handle |
| `src/game/MainScene.ts` | `useShopStore` | Kiểm tra từng chỗ, đổi sang store phù hợp |

**Cách tìm nhanh:** Chạy lệnh sau để tìm tất cả file còn import shopStore sau khi refactor:
```bash
grep -r "useShopStore" src/ --include="*.ts" --include="*.vue"
# Kết quả phải là 0 file (ngoại trừ chính shopStore.ts)
```

---

## 🟡 BỔ SUNG PHẦN 11: `shopStore.ts` — Xử lý sau khi tách xong

Sau khi tạo xong `furnitureStore` và `customerStore`, **KHÔNG xóa ngay** `shopStore.ts`. Thay vào đó, convert thành barrel export để tránh breaking change nếu còn sót import nào chưa đổi:

```typescript
// src/stores/modules/shopStore.ts — TEMPORARY BARREL (sau khi tách xong)
// File này sẽ bị xóa ở bước cuối cùng sau khi confirm build pass

export { useFurnitureStore as useShopStore } from './furnitureStore'

// Khi grep "useShopStore" trả về 0 kết quả → xóa file này
```

Cách này đảm bảo nếu AI quên đổi 1-2 chỗ, app vẫn không crash ngay, chỉ log warning.

---

## ✅ Verify Checklist mở rộng (Thay thế checklist ngắn trong Blueprint gốc)

Sau khi hoàn thành toàn bộ refactor, chạy qua checklist này:

### Build & Technical
```bash
# 1. Build phải pass không lỗi
npm run build

# 2. Không còn import shopStore ở ngoài
grep -r "useShopStore" src/ --include="*.ts" --include="*.vue"
# → Phải là 0 kết quả (trừ file shopStore.ts nếu còn)

# 3. Không có circular dependency
# Kiểm tra thủ công: inventoryStore không import gameStore nữa
grep "useGameStore" src/stores/modules/inventoryStore.ts
# → Phải là 0 kết quả
```

### Gameplay Manual Test
```
[ ] Mở app → Console không có lỗi đỏ
[ ] Mở Online Shop → danh sách hàng hiện ra
[ ] Mua furniture → số lượng trong kho tăng
[ ] Vào Build Mode → đặt kệ xuống sàn
[ ] Vào Edit Mode → nhấc kệ lên được
[ ] Mở shop (OPEN) → NPC spawn vào
[ ] NPC lấy hàng từ kệ → xếp hàng thanh toán
[ ] Nhấn "Thanh toán" → tiền tăng, NPC rời đi
[ ] Xé Pack → màn hình pack opening hiện ra
[ ] Kết thúc ngày → modal tổng kết hiện ra
[ ] Bắt đầu ngày mới → đồng hồ reset về 8:00
[ ] Thuê nhân viên → nhân viên xuất hiện trong Phaser
[ ] Nhân viên CASHIER → tự động thanh toán khi có khách
```

---

*Supplement version 1.0 — Bổ sung cho REFACTOR_BLUEPRINT.md*
*Đọc kết hợp với Blueprint gốc, không thay thế.*
