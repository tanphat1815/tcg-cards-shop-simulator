# REFACTOR_BLUEPRINT.md
## Kế Hoạch Tái Cấu Trúc Dự Án TCG Card Shop Webapp

**Phiên bản:** 1.0  
**Ngày soạn:** 2026-04-13  
**Mục đích:** Hướng dẫn AI Agent chuyển đổi từ Kiến Trúc Type-based sang Feature-based để chuẩn bị cho sự phát triển lên tới 10-20 tính năng mới.

---

## 1. KIẾN TRÚC THƯ MỤC MỤC TIÊU (Target Directory Structure)

### 1.1 Sơ Đồ Cây Thư Mục Toàn Cảnh

```
src/
├── features/                                    # NEW: Nhóm theo tính năng (Feature-based)
│   ├── staff/                                   # Feature: Quản lý Nhân Viên
│   │   ├── types/
│   │   │   └── index.ts                        # Interface: WorkerDuty, HiredWorker
│   │   ├── stores/
│   │   │   └── staffStore.ts                   # Pinia Store: Toàn bộ logic nhân viên
│   │   ├── managers/
│   │   │   └── StaffManager.ts                 # Phaser Manager: Điều phối NPC nhân viên
│   │   ├── components/
│   │   │   └── StaffHireDialog.vue             # UI: Dialog thuê nhân viên
│   │   ├── config/
│   │   │   └── workerData.ts                   # Dữ liệu cấu hình worker
│   │   └── README.md                           # Tài liệu tính năng Staff
│   │
│   ├── shop/                                    # Feature: Quản lý Cửa Hàng (phẫu thuật shopStore)
│   │   ├── types/
│   │   │   ├── index.ts                        # Exports tất cả types
│   │   │   ├── furniture.ts                    # ShelfData, PlayTableData, CashierData
│   │   │   └── customer.ts                     # NEW: CustomerQueueEntry, CustomerStats
│   │   ├── stores/
│   │   │   ├── furnitureStore.ts               # NEW: Quản lý nội thất (Shelves, Tables, Cashiers)
│   │   │   ├── customerStore.ts                # NEW: Quản lý hàng chờ khách (Queue Management)
│   │   │   └── README_stores.md                # Doc: cách 2 store gọi nhau
│   │   ├── managers/
│   │   │   ├── FurnitureManager.ts             # Phaser: Render kệ, bàn, quầy
│   │   │   ├── NPCManager.ts                   # Phaser: Render & điều khiển NPC khách
│   │   │   ├── EnvironmentManager.ts           # Phaser: Background, effect
│   │   │   └── CustomerServiceManager.ts       # NEW: Logic phục vụ khách (animation, sound)
│   │   ├── components/
│   │   │   ├── ShelfManagementMenu.vue
│   │   │   ├── BuildMenu.vue
│   │   │   ├── CustomerQueueDisplay.vue        # NEW: Hiển thị hàng chờ
│   │   │   └── EndOfDayModal.vue
│   │   ├── config/
│   │   │   ├── shopData.ts                     # FURNITURE_ITEMS
│   │   │   └── customerRules.ts                # NEW: Quy tắc khách hàng (mức giá, vị trí...)
│   │   ├── services/
│   │   │   └── customerService.ts              # NEW: Logic lập danh sách chờ (algorithm)
│   │   └── README.md
│   │
│   ├── inventory/                              # Feature: Quản lý Kho & Binder Thẻ Bài
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   ├── card.ts                         # CardData, PulledCard
│   │   │   └── stock.ts                        # StockItem, InventoryEntry
│   │   ├── stores/
│   │   │   └── inventoryStore.ts               # Quản lý Binder cá nhân & Shop stock
│   │   ├── managers/
│   │   │   └── BinderManager.ts                # NEW?: Possible Phaser display
│   │   ├── components/
│   │   │   ├── BinderMenu.vue
│   │   │   ├── PackOpeningOverlay.vue
│   │   │   └── CardDisplay.vue                 # NEW: Reusable card component
│   │   ├── config/
│   │   │   └── cardConfig.ts                   # NEW: Rarity weights, pull rates
│   │   └── README.md
│   │
│   ├── api/                                    # Feature: Tích hợp TCGdex API
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   └── tcgdex.ts                       # TcgCard, TcgSet, TcgSeries, etc.
│   │   ├── stores/
│   │   │   └── apiStore.ts                     # Cache, API state management
│   │   ├── services/
│   │   │   ├── tcgdexService.ts                # Direct SDK wrapper
│   │   │   ├── apiService.ts                   # Business logic layer
│   │   │   └── cardRandomizer.ts               # NEW: Weighted random selection algo
│   │   ├── config/
│   │   │   └── apiConfig.ts
│   │   └── README.md
│   │
│   ├── progression/                            # Feature: Cấp độ, Kinh nghiệm, Tiền tệ
│   │   ├── types/
│   │   │   └── index.ts                        # DailyStats, ExpThreshold, etc.
│   │   ├── stores/
│   │   │   └── statsStore.ts                   # Tất cả logic tiến trình người chơi
│   │   ├── config/
│   │   │   ├── leveling.ts
│   │   │   └── expansionData.ts
│   │   ├── components/
│   │   │   └── ProgressionUI.vue               # NEW: Progress bar, level display
│   │   └── README.md
│   │
│   ├── onlineshop/                             # Feature: Cửa hàng trực tuyến (mở rộng)
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   └── OnlineShopMenu.vue
│   │   ├── config/
│   │   │   └── shopListings.ts
│   │   └── README.md
│   │
│   └── shared/                                 # Dùng chung cho nhiều features
│       ├── types/
│       │   └── common.ts                       # Types không phụ thuộc vào feature cụ thể
│       ├── composables/
│       │   ├── useButton.ts
│       │   ├── useModal.ts
│       │   └── useConfirmation.ts
│       ├── components/
│       │   └── (Button, Modal, Dialog là generic)
│       ├── services/
│       │   └── (Utility services)
│       └── styles/
│           └── (Shared CSS/Tailwind)
│
├── game/                                       # Core Phaser Engine (Giữ nguyên cấu trúc)
│   ├── MainScene.ts                            # Scene chính - khởi tạo tất cả Managers
│   └── README.md
│
├── stores/                                     # Pinia Root Store
│   ├── gameStore.ts                            # Facade Pattern (unchanged - giữ API cũ)
│   └── index.ts                                # NEW: Central registration của tất cả stores
│
├── config/                                     # Cấu hình toàn cục (không liên quan feature)
│   └── constants.ts                            # Global constants
│
├── types/
│   └── globals.ts                              # Global types chỉ (không dùng cho feature cụ thể)
│
├── styles/                                     # Styling toàn cục
│   └── global.css
│
├── App.vue
├── main.ts
└── vite-env.d.ts
```

---

## 2. KỂ HOẠCH PHẪU THUẬT "GOD STORE" (shopStore.ts)

### 2.1 Phân Tích Hiện Tại

File `shopStore.ts` hiện tại (18KB+) chứa quá nhiều trách nhiệm:

| Trách Nhiệm | Số State/Action | Nội Dung |
|---|---|---|
| **Nội Thất (Furniture)** | 7 state, 12+ actions | Shelves, Tables, Cashiers, Build Mode |
| **Hàng Chờ Khách (Customer Queue)** | 3 state, 4 actions | Queue, waitingCustomers, serveCustomer |
| **UI Toggles** | 5 state | showShelfMenu, showBinderMenu, ... |

### 2.2 Kế Hoạch Tách (Refactoring Plan)

#### 2.2.1 Store 1: `furnitureStore.ts` - Quản Lý Nội Thất

**Vị trí:** `src/features/shop/stores/furnitureStore.ts`

**State cần di dời:**
```typescript
state() {
  return {
    placedShelves: {} as Record<string, ShelfData>,      // ← từ shopStore
    placedTables: {} as Record<string, PlayTableData>,   // ← từ shopStore
    placedCashiers: {} as Record<string, CashierData>,   // ← từ shopStore
    purchasedFurniture: {} as Record<string, number>,    // ← từ shopStore
    activeShelfId: null as string | null,                // ← từ shopStore
    isBuildMode: false,                                  // ← từ shopStore
    buildItemId: null as string | null,                  // ← từ shopStore
    isEditMode: false,                                   // ← từ shopStore
    editFurnitureData: null as any,                      // ← từ shopStore
    showShelfMenu: false,                                // ← từ shopStore
    showBuildMenu: false,                                // ← từ shopStore
  }
}
```

**Getters cần di dời:**
```typescript
getters: {
  totalPlacedFurniture: (state) => Object.keys(state.placedShelves).length + Object.keys(state.placedTables).length,
  availableFurnitureCount: (state) => (furnitureId) => state.purchasedFurniture[furnitureId] || 0,
  // ... các getters liên quan nội thất khác
}
```

**Actions cần di dời:**
```typescript
actions: {
  // Shelf Management
  setActiveShelfId(id: string)
  openShelfManagement(shelfId: string)
  closeShelfManagement()
  placement: (furnitureId, x, y) => void  // ← từ buyFurniture
  moveToTierSlot(itemId, tierIndex)
  fillTier(itemId, tierIndex)
  clearTier(tierIndex)
  pickupFurniture(furnitureId)
  
  // Build Mode
  enterBuildMode(itemId: string)
  exitBuildMode()
  placeBuilding(x, y, rotation?)
  
  // Edit Mode
  enterEditMode(furnitureId: string)
  exitEditMode()
  updateFurniturePosition(furnitureId, x, y)
  rotateFurniture(furnitureId, rotation)
  
  // Helpers
  _createShelf(id, furnitureId, x, y)
  _createPlayTable(id, furnitureId, x, y, rotation)
  _createCashier(id, furnitureId, x, y)
}
```

#### 2.2.2 Store 2: `customerStore.ts` - Quản Lý Hàng Chờ Khách

**Vị trí:** `src/features/shop/stores/customerStore.ts`

**State cần di dời:**
```typescript
state() {
  return {
    shopState: 'CLOSED' as 'OPEN' | 'CLOSED',           // ← từ shopStore
    waitingCustomers: 0,                                // ← từ shopStore
    waitingQueue: [] as { instanceId: string, price: number, arrivedAt: number }[],
    servedToday: 0,                                      // ← NEW: tracking
    totalRevenue: 0,                                     // ← NEW: từ statsStore (replicate?)
  }
}
```

**Getters:**
```typescript
getters: {
  queueLength: (state) => state.waitingQueue.length,
  nextCustomer: (state) => state.waitingQueue[0] || null,
  averageQueueWaitTime: (state) => {
    // Tính thời gian chờ trung bình
  }
}
```

**Actions:**
```typescript
actions: {
  setShopState(state: 'OPEN' | 'CLOSED')
  addWaitingCustomer(price: number, instanceId: string)
  serveCustomer(): string | null  // ← trả về instanceId để Phaser giải phóng NPC
  removeCustomerFromQueue(instanceId: string)
  forceEndDay()  // ← từ shopStore
}
```

**Lưu ý xử lý Circular Dependency:**
- `customerStore` sẽ import `useStatsStore()` trong `serveCustomer()` action để cộng tiền & XP
- `statisticsStore` sẽ subscribe thay đổi từ `customerStore` (nếu cần)
- **KHÔNG import file này trong statsStore để tránh cycle**

#### 2.2.3 Interaction giữa `furnitureStore` và `customerStore`

```typescript
// Trong furnitureStore: Không gọi customerStore trực tiếp
// Trong customerStore: Không gọi furnitureStore trực tiếp

// Ở cấp độ Phaser (MainScene or Manager):
const furniture = useFurnitureStore()
const customers = useCustomerStore()

// Example flow:
// 1. NPC khách đi tới cashier
// 2. Phaser Manager gọi: customers.addWaitingCustomer(price, npcId)
// 3. Khi player click "Serve", Phaser gọi: const npcId = customers.serveCustomer()
// 4. NPC animation chạy, sau đó Phaser remove NPC
```

---

## 3. KỈ HOẠCH DI DỜI DOMAIN LOGIC & TYPES

### 3.1 Danh Sách Files Vue Chứa Logic Cần Chuyển

| File Vue | Logic Cần Chuyển | Đích (Store) |
|---|---|---|
| `OnlineShopMenu.vue` | Check tiền trước mua | `statsStore` (đã có `buyFurniture`) |
| `ShelfManagementMenu.vue` | Kiểm tra dung lượng tầng | `furnitureStore` → tạo getter `canPlaceItem()` |
| `BinderMenu.vue` | Tính tổng card hiếm | `inventoryStore` → tạo getter `totalRareCards` |
| `UIOverlay.vue` | Logic mở pack → trừ tiền | `inventoryStore.tearPack()` |
| (Phaser Component, không .vue) | Kiểm tra NPC có thể serve | `customerStore` → getter `canServeNext()` |

### 3.2 Mapping Types: Từ Tập Trung → Phân Tán

**Trước (Type-based):**
```
src/types/gameTypes.ts
├── CardData
├── WorkerDuty
├── HiredWorker
├── ShelfTier
├── ShelfData
├── PlayTableData
├── CashierData
└── ... (40+ types)
```

**Sau (Feature-based):**
```
src/features/
├── staff/types/index.ts
│   ├── WorkerDuty
│   └── HiredWorker
├── shop/types/
│   ├── furniture.ts
│   │   ├── ShelfTier
│   │   ├── ShelfData
│   │   ├── PlayTableData
│   │   └── CashierData
│   └── customer.ts
│       ├── CustomerQueueEntry
│       └── CustomerStats
├── inventory/types/
│   ├── card.ts → CardData
│   └── stock.ts → StockItem
├── api/types/
│   ├── tcgdex.ts
│   └── cache.ts
├── progression/types/
│   └── stats.ts
└── shared/types/
    └── common.ts → Những types dùng chung
```

### 3.3 Chi Tiết Di Dời Từng Type

#### Group 1: Staff Types
**From:** `src/types/gameTypes.ts`  
**To:** `src/features/staff/types/index.ts`

```typescript
export type WorkerDuty = 'NONE' | 'CASHIER' | 'STOCKER'

export interface HiredWorker {
  instanceId: string
  workerId: string
  duty: WorkerDuty
  targetDeskId?: string
}
```

#### Group 2: Shop / Furniture Types
**From:** `src/types/gameTypes.ts`  
**To:** `src/features/shop/types/furniture.ts`

```typescript
export interface ShelfTier {
  itemId: string | null
  slots: (string | null)[]
  maxSlots: number
}

export interface ShelfData {
  id: string
  furnitureId: string
  x: number
  y: number
  tiers: ShelfTier[]
}

export interface PlayTableData {
  id: string
  furnitureId: string
  x: number
  y: number
  occupants: (string | null)[]
  matchStartedAt: number | null
  rotation?: number
}

export interface CashierData {
  id: string
  furnitureId: string
  x: number
  y: number
}
```

#### Group 3: Shop / Customer Types (NEW)
**New File:** `src/features/shop/types/customer.ts`

```typescript
export interface CustomerQueueEntry {
  instanceId: string
  price: number
  arrivedAt: number  // timestamp
  patience: number   // 0-100, nếu quá lâu → rời đi
}

export interface CustomerStats {
  totalServed: number
  totalRevenue: number
  averageWaitTime: number
}
```

#### Group 4: Inventory / Card Types
**From:** `src/types/gameTypes.ts`  
**To:** `src/features/inventory/types/card.ts`

```typescript
export interface CardData {
  id: string
  name: string
  hp: number
  type: string
  rarity: string
  marketPrice: number
  imageKey: string
}

export interface PulledCard extends CardData {
  pulledAt: number
  setId: string
}
```

#### Group 5: Common Types (Giữ nguyên)
**Location:** `src/features/shared/types/common.ts`

```typescript
// Types dùng chung mà không phụ thuộc một feature cụ thể
export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}
```

---

## 4. MA TRẬN GIAO TIẾP (Communication Matrix)

### 4.1 Luồng Dữ Liệu Toàn Cảnh

```
┌─────────────────────────────────────────────────────────────────┐
│                           App.vue                               │
│            (Root Vue Component - Render All Menus)              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
         ┌────────────┼────────────┬─────────────────┐
         │            │            │                 │
    GameContainer.vue (Phaser Scene Wrapper)
         │
         ├─→ MainScene.ts (Phaser Scene)
         │   ├─→ Managers:
         │   │   ├─ FurnitureManager
         │   │   ├─ NPCManager
         │   │   ├─ StaffManager
         │   │   └─ EnvironmentManager
         │   └─→ Subscribe to Pinia Stores
         │
         └─→ UI Components (Vue):
             ├─ OnlineShopMenu.vue
             ├─ ShelfManagementMenu.vue
             ├─ BinderMenu.vue
             ├─ EndOfDayModal.vue
             └─ UIOverlay.vue (Buttons)

                    ↓↓↓ (All access via) ↓↓↓

         ┌─────────────────────────────────────┐
         │    Root Pinia Store (gameStore)     │ ← Facade Pattern
         └────┬────────────────────────────────┘
              │
         ┌────┼────┬────────┬──────────────┐
         │    │    │        │              │
    features/
    ├── staff/stores/staffStore
    │   (hiredWorkers, duties)
    │
    ├── shop/stores/
    │   ├── furnitureStore
    │   │   (shelves, tables, build-mode state)
    │   └── customerStore
    │       (queue, shop-state)
    │
    ├── inventory/stores/inventoryStore
    │   (personal binder, shop inventory)
    │
    ├── api/stores/apiStore
    │   (TCGdex cache, series/sets)
    │
    └── progression/stores/statsStore
        (money, level, exp, daily-stats)
```

### 4.2 Chi Tiết từng Kênh Giao Tiếp

#### **Kênh 1: Pack Opening Flow**

```
UIOverlay.vue (Click "Tear Pack")
    ↓
inventoryStore.tearPack(packId)
    ├─→ Get sourceSetId từ shopItems
    ├─→ apiStore.getWeightedRandomCardsFromSet(setId, 8)
    ├─→ Add cards to personalBinder
    └─→ Emit event để PackOpeningOverlay.vue show animation

PackOpeningOverlay.vue (Listen to change)
    ├─→ Animate card reveals
    └─→ addMoney (via statsStore)
```

**Files liên quan:**
- `src/features/inventory/stores/inventoryStore.ts` - tearPack action
- `src/features/inventory/components/PackOpeningOverlay.vue`
- `src/features/api/stores/apiStore.ts` - getWeightedRandomCardsFromSet

---

#### **Kênh 2: Furniture Placement Flow**

```
OnlineShopMenu.vue (Click "Buy Furniture")
    ↓
Check: statsStore.money >= price
    ↓
statsStore.buyFurniture(furnitureId)
    ├─→ Deduct money
    ├─→ Add to purchasedFurniture
    └─→ Return success flag

OnlineShopMenu.vue (If success)
    ├─→ Enter build mode: furnitureStore.enterBuildMode(itemId)
    └─→ Listener trong MainScene.ts (Phaser)

MainScene.ts (Subscribe via watch)
    ├─→ Detect furnitureStore.isBuildMode === true
    ├─→ FurnitureManager.setPreviewMode(itemId)
    └─→ Enable click-to-place

Player click on game canvas
    ↓
Phaser emit 'furniture-place' event
    ↓
furnitureStore.placeBuilding(x, y, rotation)
    ├─→ Create ShelfData / PlayTableData
    ├─→ Add to placedShelves / placedTables
    └─→ Deduct from purchasedFurniture

FurnitureManager (Listening)
    └─→ Render phần nội thất mới
```

**Files liên quan:**
- `src/features/shop/stores/furnitureStore.ts`
- `src/features/progression/stores/statsStore.ts` - buyFurniture
- `src/features/shop/managers/FurnitureManager.ts`
- `src/components/OnlineShopMenu.vue`

---

#### **Kênh 3: Customer Service Flow**

```
NPCManager.ts (Phaser Manager)
    ├─→ NPC đi tới cashier
    └─→ Call: customerStore.addWaitingCustomer(price, npcId)

customerStore.addWaitingCustomer()
    ├─→ Add entry to waitingQueue
    └─→ Emit change (auto-reactive)

UI Component: CustomerQueueDisplay.vue (Subscribe)
    └─→ Show queue length + next customer

Player click "Serve Customer"
    ↓
UIOverlay.vue or Dialog
    ├─→ customeStore.serveCustomer()
    └─→ Returns: { npcId, success }

customerStore.serveCustomer()
    ├─→ Shift queue
    ├─→ statsStore.addMoney(price)
    ├─→ statsStore.gainExp(XP)
    └─→ Return npcId

NPCManager.ts (Listening)
    ├─→ Play "happy" animation
    ├─→ Remove NPC from scene
    └─→ Free up seat
```

**Files liên quan:**
- `src/features/shop/stores/customerStore.ts`
- `src/features/shop/managers/NPCManager.ts`
- `src/features/shop/components/CustomerQueueDisplay.vue` (NEW)
- `src/features/progression/stores/statsStore.ts`

---

### 4.3 Bảng Tham Chiếu: Import Relationships

| From File | Import From | Type | Purpose |
|---|---|---|---|
| `furnitureStore.ts` | `inventoryStore` | Pinia | Check dung lượng hàng hóa |
| `furnitureStore.ts` | `statsStore` | Pinia | Check tiền khi buyFurniture |
| `customerStore.ts` | `statsStore` | Pinia | Cộng tiền khi serve |
| `inventoryStore.ts` | `apiStore` | Pinia | Get random cards |
| `inventoryStore.ts` | `statsStore` | Pinia | Add XP khi mở pack |
| `apiStore.ts` | Services | Direct | Gọi TCGdex API |
| `FurnitureManager.ts` | `furnitureStore` | Pinia | Render shelves/tables |
| `NPCManager.ts` | `customerStore` | Pinia | Quản lý NPC khách |
| `StaffManager.ts` | `staffStore` | Pinia | Quản lý NPC nhân viên |
| UI Components | Multiple Stores | Pinia | Display & trigger actions |

---

### 4.4 Manager Import Strategy - RECOMMENDED APPROACH ⭐

**Câu hỏi:** Khi Managers được di dời vào `features/*/managers/`, làm thế nào để import chúng từ `MainScene.ts`?

**Trả lời:** Dùng **Hybrid Direct + Barrel Pattern** để cân bằng giữa Modularity và Maintainability.

#### 4.4.1 Cách 1: Pure Direct Import ❌ (KHÔNG khuyến cáo)

```typescript
// src/game/MainScene.ts
import { StaffManager } from '@/features/staff/managers/StaffManager'
import { FurnitureManager } from '@/features/shop/managers/FurnitureManager'
import { NPCManager } from '@/features/shop/managers/NPCManager'
import { EnvironmentManager } from '@/features/shop/managers/EnvironmentManager'
import { CustomerServiceManager } from '@/features/shop/managers/CustomerServiceManager'

// ❌ Vấn đề: MainScene.ts bị lộn xộn, khó maintain nếu thêm managers mới
```

**Nhược điểm:**
- MainScene.ts sẽ có 10+ import statements
- Khó add/remove managers: phải sửa MainScene mỗi lần
- Không rõ dependencies

---

#### 4.4.2 Cách 2: Pure Barrel Pattern ❌ (Không 100% Modular)

```typescript
// src/game/managers/index.ts (Barrel file - re-export tất cả)
export { StaffManager } from '@/features/staff/managers/StaffManager'
export { FurnitureManager } from '@/features/shop/managers/FurnitureManager'
export { NPCManager } from '@/features/shop/managers/NPCManager'
// ... etc

// src/game/MainScene.ts
import { StaffManager, FurnitureManager, NPCManager } from '@/game/managers'

// ✅ Ưu: Clean import
// ❌ Vấn đề: Vẫn là centralized, không 100% modular
```

---

#### 4.4.3 Cách 3: Hybrid Direct + Barrel (✅ KHUYẾN CÁO)

**Chiến lược:** Managers nằm trong features, nhưng MainScene import **trực tiếp** từ features (KHÔNG qua barrel).

```typescript
// src/game/MainScene.ts
import { StaffManager } from '@/features/staff/managers/StaffManager'
import { FurnitureManager } from '@/features/shop/managers/FurnitureManager'
import { NPCManager } from '@/features/shop/managers/NPCManager'
import { EnvironmentManager } from '@/features/shop/managers/EnvironmentManager'
import { CustomerServiceManager } from '@/features/shop/managers/CustomerServiceManager'

export class MainScene extends Phaser.Scene {
  private staffManager!: StaffManager
  private furnitureManager!: FurnitureManager
  private npcManager!: NPCManager
  private environmentManager!: EnvironmentManager
  private customerServiceManager!: CustomerServiceManager

  create() {
    // Initialize managers - order MATTERS!
    this.environmentManager = new EnvironmentManager(this)
    this.furnitureManager = new FurnitureManager(this)
    this.npcManager = new NPCManager(this)
    this.staffManager = new StaffManager(this)
    this.customerServiceManager = new CustomerServiceManager(this)
    
    // Setup listeners
    this._setupStoreListeners()
  }

  private _setupStoreListeners() {
    const staffStore = useStaffStore()
    const furnitureStore = useFurnitureStore()
    const customerStore = useCustomerStore()

    // Furniture changes → notify FurnitureManager
    watch(() => furnitureStore.placedShelves, (newShelves) => {
      this.furnitureManager.updateShelves(newShelves)
    }, { deep: true })

    // Staff changes → notify StaffManager
    watch(() => staffStore.hiredWorkers, (newWorkers) => {
      this.staffManager.updateWorkers(newWorkers)
    }, { deep: true })

    // Customer queue → notify NPCManager
    watch(() => customerStore.waitingQueue, (newQueue) => {
      this.npcManager.updateQueue(newQueue)
    }, { deep: true })
  }
}
```

**✅ Lợi ích của Hybrid Approach:**
1. **100% Modular** - Managers sống hoàn toàn trong features
2. **Explicit Dependencies** - Rõ ràng manager nào đến từ feature nào
3. **Easy to Navigate** - Click "Go to Definition" → jump vào `features/staff/managers/StaffManager`
4. **No Circular Deps** - MainScene là single entry point, Managers không gọi nhau
5. **Tree-shakeable** - Nếu bỏ một feature, dễ dàng comment 1-2 dòng import
6. **Self-documenting** - Import statements là "documentation" cho cấu trúc

---

#### 4.4.4 Cách 3 Chi Tiết: Tệp Cấu Hình (OPTIONAL - Cấp độ cao hơn)

Nếu muốn quản lý Managers **một cách declarative**:

```typescript
// src/game/config/managerConfig.ts
export const MANAGER_REGISTRY = [
  { name: 'environment', ManagerClass: EnvironmentManager, feature: 'shop' },
  { name: 'furniture', ManagerClass: FurnitureManager, feature: 'shop' },
  { name: 'npc', ManagerClass: NPCManager, feature: 'shop' },
  { name: 'staff', ManagerClass: StaffManager, feature: 'staff' },
  { name: 'customerService', ManagerClass: CustomerServiceManager, feature: 'shop' },
] as const

// src/game/MainScene.ts
import { MANAGER_REGISTRY } from './config/managerConfig'

export class MainScene extends Phaser.Scene {
  private managers: Record<string, any> = {}

  create() {
    // Initialize all managers from registry
    for (const { name, ManagerClass } of MANAGER_REGISTRY) {
      this.managers[name] = new ManagerClass(this)
    }
    
    this._setupStoreListeners()
  }

  // Access: this.managers['furniture'].updateShelves()
}
```

**Ưu điểm:** Dễ add/remove managers chỉ bằng cách thêm/xóa dòng trong config  
**Nhược điểm:** Ít explicit, khó type-check

---

### 4.4.5 Summary: Khuyến Cáo Chính Thức

| Approach | Modularity | Maintainability | Tree-shakeable | Recommended |
|---|---|---|---|---|
| **Pure Direct** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✅ | ❌ (Too verbose) |
| **Pure Barrel** | ⭐⭐ | ⭐⭐⭐ | ❌ | ❌ (Not modular) |
| **Hybrid Direct** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | ✅✅✅ (BEST) |
| **Config Registry** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ | ⭐ (Advanced) |

---

**💡 IMPLEMENT RECOMMENDATION:**

```typescript
// ✅ FINAL SOLUTION for MainScene.ts

import { useStaffStore } from '@/features/staff/stores/staffStore'
import { useFurnitureStore } from '@/features/shop/stores/furnitureStore'
import { useCustomerStore } from '@/features/shop/stores/customerStore'

import { StaffManager } from '@/features/staff/managers/StaffManager'
import { FurnitureManager } from '@/features/shop/managers/FurnitureManager'
import { NPCManager } from '@/features/shop/managers/NPCManager'
import { EnvironmentManager } from '@/features/shop/managers/EnvironmentManager'
import { CustomerServiceManager } from '@/features/shop/managers/CustomerServiceManager'

export class MainScene extends Phaser.Scene {
  // Declare managers as private properties
  private environmentManager!: EnvironmentManager
  private furnitureManager!: FurnitureManager
  private npcManager!: NPCManager
  private staffManager!: StaffManager
  private customerServiceManager!: CustomerServiceManager

  create() {
    // Initialize in dependency order
    this.environmentManager = new EnvironmentManager(this)
    this.furnitureManager = new FurnitureManager(this)
    this.npcManager = new NPCManager(this)
    this.staffManager = new StaffManager(this)
    this.customerServiceManager = new CustomerServiceManager(this)
    
    this._setupStoreSubscriptions()
  }

  private _setupStoreSubscriptions() {
    // Each manager subscribes to relevant store changes
  }
}
```

---

## 5. LỘ TRÌNH THỰC TỊ TỪNG BƯỚC (Step-by-Step Execution Plan)

### ⚠️ NGUYÊN TẮC CHUNG
- **KHÔNG** xóa file cũ ngay. Tạo file mới trước, sau đó update các import.
- **Testing** sau mỗi Phase - chạy `npm run build` để kiểm tra TS errors.
- **Backup** trước khi bắt đầu (git commit).

---

### **PHASE 1: Tạo Cấu Trúc Thư Mục & Di Dời Types (2-3 giờ)**

#### Phase 1.1: Tạo thư mục căn bản
```bash
mkdir -p src/features/{staff,shop,inventory,api,progression,shared}/{types,stores,managers,components,config,services}
```

#### Phase 1.2: Di dời file Types
**Files cần tạo:**

1. `src/features/staff/types/index.ts`
   - Copy `WorkerDuty`, `HiredWorker` từ `src/types/gameTypes.ts`

2. `src/features/shop/types/furniture.ts`
   - Copy `ShelfTier`, `ShelfData`, `PlayTableData`, `CashierData`

3. `src/features/shop/types/customer.ts` (NEW)
   - Tạo `CustomerQueueEntry`, `CustomerStats`

4. `src/features/inventory/types/card.ts`
   - Copy `CardData`
   - Thêm `PulledCard` (NEW)

5. `src/features/inventory/types/stock.ts`
   - Copy `StockItemInfo` (từ `shopData.ts`)

6. `src/features/api/types/tcgdex.ts`
   - Copy `TcgCard`, `TcgSet`, `TcgSeries`, `TcgSetSummary` từ `apiService.ts`

7. `src/features/progression/types/stats.ts`
   - Tạo: `DailyStats`, `ExpThreshold`, `LevelConfig`

8. `src/features/shared/types/common.ts`
   - Tạo: `Position`, `Size`, `UUID`

#### Phase 1.3: Update tất cả import trong existing files
**Files cần search & replace:**
- `src/stores/gameStore.ts` - update import types
- `src/stores/modules/shopStore.ts` - update import types
- `src/stores/modules/inventoryStore.ts` - import từ new locations
- Tất cả `.vue` components - import từ features/*/types
- Tất cả Phaser Managers

#### Phase 1.4: Testing
```bash
npm run build  # Kiểm tra TS errors
```

---

### **PHASE 2: Tách shopStore thành 2 Store Mới (3-4 giờ)**

#### Phase 2.1: Tạo `furnitureStore.ts`
**File:** `src/features/shop/stores/furnitureStore.ts`

```typescript
import { defineStore } from 'pinia'
import { useStatsStore } from '../../progression/stores/statsStore'
import { useInventoryStore } from '../../inventory/stores/inventoryStore'
import type { ShelfData, PlayTableData, CashierData } from '../types/furniture'
import { FURNITURE_ITEMS } from '../config/shopData'

export const useFurnitureStore = defineStore('furniture', {
  state: () => ({
    placedShelves: {} as Record<string, ShelfData>,
    placedTables: {} as Record<string, PlayTableData>,
    placedCashiers: {
      'cashier_default': createCashier('cashier_default', 'cashier_desk', 1100, 1100)
    } as Record<string, CashierData>,
    purchasedFurniture: {} as Record<string, number>,
    activeShelfId: null as string | null,
    showShelfMenu: false,
    showBuildMenu: false,
    isBuildMode: false,
    buildItemId: null as string | null,
    isEditMode: false,
    editFurnitureData: null as any,
  }),
  
  getters: {
    // Tất cả logic cũ từ shopStore
  },
  
  actions: {
    // Tất cả actions cũ từ shopStore liên quan nội thất
    openShelfManagement(shelfId: string) { ... },
    closeShelfManagement() { ... },
    enterBuildMode(itemId: string) { ... },
    // ... etc
  }
})

// Helpers
const createEmptyTier = () => ({ itemId: null, slots: [], maxSlots: 0 })
const createShelf = (id, furnitureId, x, y): ShelfData => { ... }
// ... etc
```

**Checklist:**
- [ ] Copy ALL state properties liên quan furniture từ `shopStore`
- [ ] Copy ALL getters liên quan furniture
- [ ] Copy ALL actions liên quan furniture
- [ ] Copy helper functions (`createShelf`, `createPlayTable`, etc.)
- [ ] Update import paths cho `shopData`, `StatsStore`, `InventoryStore`

#### Phase 2.2: Tạo `customerStore.ts`
**File:** `src/features/shop/stores/customerStore.ts`

```typescript
import { defineStore } from 'pinia'
import { useStatsStore } from '../../progression/stores/statsStore'
import type { CustomerQueueEntry } from '../types/customer'

export const useCustomerStore = defineStore('customer', {
  state: () => ({
    shopState: 'CLOSED' as 'OPEN' | 'CLOSED',
    waitingQueue: [] as CustomerQueueEntry[],
    servedToday: 0,
  }),
  
  getters: {
    queueLength: (state) => state.waitingQueue.length,
    nextCustomer: (state) => state.waitingQueue[0] || null,
  },
  
  actions: {
    setShopState(newState: 'OPEN' | 'CLOSED') {
      this.shopState = newState
    },
    
    addWaitingCustomer(price: number, instanceId: string) {
      this.waitingQueue.push({
        instanceId,
        price,
        arrivedAt: Date.now(),
        patience: 100
      })
    },
    
    serveCustomer(): string | null {
      const stats = useStatsStore()
      if (this.waitingQueue.length === 0) return null
      
      const entry = this.waitingQueue.shift()!
      stats.addMoney(entry.price)
      stats.gainExp(5)
      this.servedToday++
      return entry.instanceId
    },
    
    forceEndDay() {
      this.shopState = 'CLOSED'
      useStatsStore().showEndDayModal = true
    }
  }
})
```

**Checklist:**
- [ ] Copy state liên quan queue/customer từ `shopStore`
- [ ] Copy actions: `addWaitingCustomer`, `serveCustomer`, `forceEndDay`
- [ ] Update import `useStatsStore`

#### Phase 2.3: Update `shopStore.ts` cũ (DELETE hoặc convert thành wrapper)

**Option A - Xóa gọn gàng:**
- [ ] Delete `src/stores/modules/shopStore.ts`

**Option B - Giữ wrapper (để tương thích):**
```typescript
// src/stores/modules/shopStore.ts
export { useFurnitureStore as useShopStore }  // ← Aliasing
```

#### Phase 2.4: Update `gameStore.ts` Facade
```typescript
// src/stores/gameStore.ts

import { useFurnitureStore } from './modules/furniture'  // ← NEW path
import { useCustomerStore } from './modules/customer'    // ← NEW

export const useGameStore = defineStore('game', {
  // Update getters to point to new stores
  getters: {
    placedShelves: () => useFurnitureStore().placedShelves,
    // ... etc
  }
})
```

#### Phase 2.5: Update MainScene.ts
```typescript
// src/game/MainScene.ts

import { useFurnitureStore } from '../features/shop/stores/furnitureStore'
import { useCustomerStore } from '../features/shop/stores/customerStore'

// Replace old: useShopStore() → useFurnitureStore()
// Add new: useCustomerStore()
```

#### Phase 2.6: Testing
```bash
npm run build  # Fix any import errors
npm run dev    # Test dalam browser
```

---

### **PHASE 3: Di Dời Config Files & Services (2-3 giờ)**

#### Phase 3.1: Di dời config files
```bash
# Tạo symbolic links hoặc copy files:
cp src/config/shopData.ts src/features/shop/config/
cp src/config/workerData.ts src/features/staff/config/
cp src/config/leveling.ts src/features/progression/config/
cp src/config/expansionData.ts src/features/progression/config/
cp src/config/apiConfig.ts src/features/api/config/
```

#### Phase 3.2: Di dời services
```bash
# API services:
cp src/services/apiService.ts src/features/api/services/
cp src/services/tcgdexService.ts src/features/api/services/

# NEW: Card randomizer service
# Create: src/features/api/services/cardRandomizer.ts
```

#### Phase 3.3: Update tất cả import
**Files cần update:**
- All `.vue` components
- All Stores
- All Managers

**Search & Replace patterns:**
```
FROM: "import { workerData } from '../../config/workerData'"
TO:   "import { workerData } from '../../features/staff/config/workerData'"

FROM: "import { apiService } from '../../services/apiService'"
TO:   "import { apiService } from '../../features/api/services/apiService'"
```

#### Phase 3.4: Testing
```bash
npm run build
```

---

### **PHASE 4: Update Phaser Managers & Scene (2-3 giờ)**

#### Phase 4.0: Manager Import Strategy (READ THIS FIRST!)

**✅ RECOMMENDED APPROACH: Hybrid Direct Import**

Import Managers **trực tiếp** từ `features/*/managers/`, KHÔNG dùng barrel/centralized file.

```typescript
// ✅ CORRECT: Direct imports from features
import { StaffManager } from '@/features/staff/managers/StaffManager'
import { FurnitureManager } from '@/features/shop/managers/FurnitureManager'
import { NPCManager } from '@/features/shop/managers/NPCManager'
import { EnvironmentManager } from '@/features/shop/managers/EnvironmentManager'
import { CustomerServiceManager } from '@/features/shop/managers/CustomerServiceManager'

// ❌ WRONG: Centralized/barrel import
import { StaffManager, FurnitureManager } from '@/game/managers'
```

**Tại sao Direct Import tốt hơn:**
1. ✅ 100% Modular - Manager sống hoàn toàn trong feature
2. ✅ Self-documenting - Rõ ràng manager nào từ feature nào
3. ✅ Easy navigation - Click "Go to Definition" jump vào feature
4. ✅ No abstraction layer - Không cần maintain barrel file
5. ✅ Tree-shakeable - Dễ disable feature bằng comment 1 dòng

#### Phase 4.1: Update imports trong MainScene.ts
```typescript
// src/game/MainScene.ts

// OLD imports (xóa những dòng này):
// import { useShopStore } from '../stores/modules/shopStore'

// NEW imports:
import { useFurnitureStore } from '@/features/shop/stores/furnitureStore'
import { useCustomerStore } from '@/features/shop/stores/customerStore'
import { useStaffStore } from '@/features/staff/stores/staffStore'
import { useInventoryStore } from '@/features/inventory/stores/inventoryStore'
import { useStatsStore } from '@/features/progression/stores/statsStore'

// NEW: Direct imports từ features (NOT từ src/game/managers)
import { StaffManager } from '@/features/staff/managers/StaffManager'
import { FurnitureManager } from '@/features/shop/managers/FurnitureManager'
import { NPCManager } from '@/features/shop/managers/NPCManager'
import { EnvironmentManager } from '@/features/shop/managers/EnvironmentManager'
import { CustomerServiceManager } from '@/features/shop/managers/CustomerServiceManager'

export class MainScene extends Phaser.Scene {
  // Declare manager properties (replace old ones)
  private environmentManager!: EnvironmentManager
  private furnitureManager!: FurnitureManager
  private npcManager!: NPCManager
  private staffManager!: StaffManager
  private customerServiceManager!: CustomerServiceManager

  create() {
    // Initialize managers in dependency order
    // Order: Environment → Furniture → NPC → Staff → CustomerService
    this.environmentManager = new EnvironmentManager(this)
    this.furnitureManager = new FurnitureManager(this)
    this.npcManager = new NPCManager(this)
    this.staffManager = new StaffManager(this)
    this.customerServiceManager = new CustomerServiceManager(this)
    
    this._setupStoreSubscriptions()
  }

  private _setupStoreSubscriptions() {
    // Each manager subscribes to relevant store changes
    const furniture = useFurnitureStore()
    const customers = useCustomerStore()
    const staff = useStaffStore()

    watch(() => furniture.placedShelves, (shelves) => {
      this.furnitureManager.updateShelves(shelves)
    }, { deep: true })

    watch(() => customers.waitingQueue, (queue) => {
      this.npcManager.updateQueue(queue)
    }, { deep: true })

    watch(() => staff.hiredWorkers, (workers) => {
      this.staffManager.updateWorkers(workers)
    }, { deep: true })
  }
}
```

#### Phase 4.2: Update imports trong từng Manager
```typescript
// src/features/staff/managers/StaffManager.ts

// OLD imports (xóa):
// import { useShopStore } from '../../stores/modules/shopStore'

// NEW imports:
import { useStaffStore } from '../stores/staffStore'
import { useFurnitureStore } from '../../shop/stores/furnitureStore'
import type { HiredWorker, WorkerDuty } from '../types'

export class StaffManager {
  // ... implementation
}
```

```typescript
// src/features/shop/managers/FurnitureManager.ts

import { useFurnitureStore } from '../stores/furnitureStore'
import { useInventoryStore } from '../../inventory/stores/inventoryStore'
import type { ShelfData, PlayTableData } from '../types/furniture'
import { FURNITURE_ITEMS } from '../config/shopData'

export class FurnitureManager {
  // ... implementation
}
```

#### Phase 4.3: Validate NO Circular Dependencies
**Checklist:**
- [ ] Manager A import Store A ✅
- [ ] Manager A không import Manager B ✅ (Chỉ MainScene connect Managers)
- [ ] Store A không import Manager (nếu có, chuyển logic vào MainScene) ✅
- [ ] MainScene là single entry point ✅

**Test command:**
```bash
# Tìm xem có circular imports không:
npm list 2>&1 | grep -i circular

# Hoặc dùng plugin (nếu có):
# npm install --save-dev circular-dependency-plugin
```

#### Phase 4.4: Testing
```bash
npm run build  # Fix any TS errors
npm run dev    # Test trong browser

# Manual checks:
# [ ] Phaser scene initializes without errors
# [ ] Click buttons trigger Phaser events
# [ ] Managers update when stores change
# [ ] No console errors about missing imports
```

---

### **PHASE 5: Update Vue Components (2-3 giờ)**

#### Phase 5.1: Di dời / Update Components
```bash
# Tạo symlink hoặc move vào features:
mkdir -p src/features/shop/components
mkdir -p src/features/inventory/components
mkdir -p src/features/staff/components
mkdir -p src/features/progression/components

# Copy files:
cp src/components/ShelfManagementMenu.vue src/features/shop/components/
cp src/components/BinderMenu.vue src/features/inventory/components/
# ... etc
```

#### Phase 5.2: Update imports trong components
**Example - `BinderMenu.vue`:**
```typescript
// Before:
import { useInventoryStore } from '../stores/modules/inventoryStore'
import { useStatsStore } from '../stores/modules/statsStore'

// After:
import { useInventoryStore } from '../features/inventory/stores/inventoryStore'
import { useStatsStore } from '../features/progression/stores/statsStore'
```

#### Phase 5.3: Update master App.vue
```typescript
// Before:
import { useShopStore } from './stores/modules/shopStore'
import { useInventoryStore } from './stores/modules/inventoryStore'
// ... 5 imports

// After:
// Dùng gameStore facade (unchanged), nhưng gameStore nó sẽ import từ features/
import { useGameStore } from './stores/gameStore'

// Hoặc import trực tiếp từ features (nếu cần cả 2):
import { useFurnitureStore } from './features/shop/stores/furnitureStore'
import { useCustomerStore } from './features/shop/stores/customerStore'
```

#### Phase 5.4: Testing
```bash
npm run build
npm run dev

# Manual test:
# - Click buttons in UI
# - Verify stores update
# - Verify UI reflects store changes
```

---

### **PHASE 6: Clean Up & Final Testing (1-2 giờ)**

#### Phase 6.1: Delete old unused files
```bash
# AFTER verifying all imports updated:
rm -rf src/stores/modules/shopStore.ts  # (if using new structure)
# Keep gameStore.ts as facade
```

#### Phase 6.2: Verify no circular dependencies
```bash
# Visual inspection:
grep -r "import.*shopStore" src/  # Should find NO old references
grep -r "import.*from '../../stores" src/features/  # Verify not going backwards
```

#### Phase 6.3: Full app testing
```bash
npm run build  # Compilation
npm run dev    # Browser test

# TEST CHECKLIST:
# [ ] Open shop - can see items
# [ ] Buy furniture - money deducts, furniture shows in inventory
# [ ] Place furniture - can enter build mode and place item
# [ ] Open pack - get random cards
# [ ] Check Binder - cards display correctly
# [ ] Hire staff - worker appears
# [ ] NPC appears and queues - customer adds to queue
# [ ] Serve customer - queue clears, money adds
# [ ] End day modal - shows stats correctly
```

#### Phase 6.4: Git commit
```bash
git add .
git commit -m "refactor: convert type-based to feature-based architecture

CHANGES:
- Moved types to features/*/types/
- Split shopStore into furnitureStore & customerStore
- Reorganized config files by feature
- Updated all imports across codebase
- Maintained backwards compatibility via gameStore facade

VERIFIED:
- All TS compilation passes
- All imports resolved
- All features functional
"
```

---

## 6. CODING GUIDELINES CHO AI AGENT MỚI

### 6.1 Hard Rules (Bắc Buộc Tuân Thủ)

#### ❌ RULE 1: NEVER Create Global State for Feature-Specific Data
```typescript
// ❌ WRONG - Feature-specific state in gameStore
gameStore.state.staffWorkers = [...]
gameStore.state.furnitureStack = [...]

// ✅ CORRECT - Feature-specific state in feature store
staffStore.state.hiredWorkers = [...]
furnitureStore.state.placedShelves = [...]
```

**Rationale:** Các tính năng sẽ phát triển độc lập. Không có `gameStore` cũng phải chạy được.

---

#### ❌ RULE 2: NO Circular Dependencies
```typescript
// ❌ WRONG - furnitureStore imports customerStore, và customerStore imports furnitureStore
// furnitureStore.ts
import { useCustomerStore } from './customerStore'

// customerStore.ts
import { useFurnitureStore } from './furnitureStore'

// ✅ CORRECT - Gọi từ cấp độ cao hơn (MainScene, gameStore, hoặc UI Component)
// MainScene.ts
const furniture = useFurnitureStore()
const customers = useCustomerStore()
// Xử lý logic ở đây
```

**Rationale:** Tránh race conditions, infinite loops, build errors.

---

#### ❌ RULE 3: Logic ALWAYS Goes in Store Actions, NEVER in Vue Components
```typescript
// ❌ WRONG - Business logic in component
// OnlineShopMenu.vue
<script setup>
const buyItem = (itemId) => {
  if (statsStore.money < price) alert('...')  // ← Logic ở đây!
  statsStore.money -= price
  inventoryStore.items.push(itemId)  // ← Direct state mutation!
}
</script>

// ✅ CORRECT - Business logic in store action
// statsStore.ts
buyItem(itemId) {
  const item = SHOP_ITEMS[itemId]
  if (this.money < item.price) throw Error('Not enough money')
  this.money -= item.price
  this.purchaseHistory.push(itemId)
}

// OnlineShopMenu.vue
<script setup>
const buyItem = (itemId) => {
  try {
    statsStore.buyItem(itemId)
  } catch (e) {
    alert(e.message)
  }
}
</script>
```

**Rationale:** Đảm bảo consistency nếu cùng logic được gọi từ nhiều nơi.

---

#### ❌ RULE 4: NEVER Have Action/Getter Names Conflict Across Stores
```typescript
// ❌ WRONG - Cả hai store đều có phương thức add()
// inventoryStore: add(item)
// staffStore: add(worker)
// → Khó hiểu, dễ nhầm

// ✅ CORRECT - Tên rõ ràng, đặc thù cho feature
// inventoryStore: addItemToInventory(itemId)
// staffStore: hireWorker(workerId)
```

**Naming Convention:**
- `add*` → `addToCart`, `addToQueue`, `addWorker`
- `remove*` → `removeFromShelf`, `removeWorker`
- `update*` → `updatePosition`, `updateDuty`
- `set*` → `setState`, `setActiveShelf`

---

#### ❌ RULE 5: Types MUST Live in feature/*/types/ Directory, NEVER in Global types/
```typescript
// ❌ WRONG
// src/types/gameTypes.ts
export interface ShelfData { ... }  // ← Belongs in shop feature

// ✅ CORRECT
// src/features/shop/types/furniture.ts
export interface ShelfData { ... }
```

**Exception:** Global types ở `src/features/shared/types/common.ts` chỉ cho những interface không phụ thuộc vào feature cụ thể (Position, Size, UUID).

---

### 6.2 Soft Guidelines (Best Practices)

#### G1: File Size Limits
- **Store file (.ts):** Max 500 lines / file (nếu vượt → tách nhỏ)
- **Vue component (.vue):** Max 300 lines (nếu vượt → extract composables)
- **Manager file (.ts):** Max 400 lines (nếu vượt → chia thành classes nhỏ)

#### G2: Action Return Types
```typescript
// ✅ GOOD - Explicit return types
actions: {
  buyFurniture(itemId: string): boolean { ... }
  serveCustomer(): { npcId: string, success: boolean } { ... }
  async loadCardSet(setId: string): Promise<CardData[]> { ... }
}
```

#### G3: Getter Naming
```typescript
// ✅ GOOD - Clear naming
getters: {
  isMoneyEnough: (state) => (price) => state.money >= price,
  totalPurchasedFurniture: (state) => Object.keys(state.purchasedFurniture).length,
  canPlaceItem: (state) => (tierIndex) => state.placedShelves[state.activeShelfId]?.tiers[tierIndex].slots.length < maxSlots
}
```

#### G4: Action Comments
```typescript
// ✅ GOOD - Clear documentation
actions: {
  /**
   * Open shelf management interface and fetch inventory from inventoryStore.
   * @param shelfId - ID of shelf to manage
   * @throws Error if shelf doesn't exist
   */
  openShelfManagement(shelfId: string) {
    // ...
  },
  
  /**
   * Place a furniture item on map. This action:
   * 1. Validates position and rotation
   * 2. Creates ShelfData/PlayTableData
   * 3. Removes from purchasedFurniture inventory
   * 4. Triggers FurnitureManager re-render
   */
  placeBuilding(x: number, y: number, rotation: number = 0) {
    // ...
  }
}
```

#### G5: Feature-Specific README
Mỗi feature folder phải có `README.md`:
```markdown
# Staff Feature

## Overview
Quản lý nhân viên, công việc, và lương.

## State Structure
- `hiredWorkers`: Mảng nhân viên đã thuê
- `availableWorkers`: DS worker có sẵn để thuê

## Key Actions
- `hireWorker(workerId: string)` - Thuê 1 worker
- `assignDuty(workerId: string, duty: WorkerDuty)` - Gán công việc

## Dependencies
- `statsStore` - Để kiểm tra tiền lương
- `furnitureStore` - Để biết vị trí quầy (CASHIER duty)

## Manager
`StaffManager.ts` - Render NPC workers trên Phaser scene
```

---

### 6.3 Import Path Conventions

#### ✅ Recommended Patterns
```typescript
// Cùng feature → Relative path
// src/features/shop/stores/furnitureStore.ts
import type { ShelfData } from '../types/furniture'
import { FURNITURE_ITEMS } from '../config/shopData'

// Khác feature → Absolute path (nếu cần)
// src/features/shop/stores/furnitureStore.ts
import { useStatsStore } from '../../progression/stores/statsStore'

// Tránh: Deep relative paths
// ❌ WRONG: import { ... } from '../../../stores/modules/stats'
// ✅ CORRECT: Dùng absolute hoặc tổ chức lại
```

#### Alias (Optional nhưng recommended)
**Trong `vite.config.ts`:**
```typescript
resolve: {
  alias: {
    '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
    '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
  }
}
```

**Usage:**
```typescript
import { useStatsStore } from '@stores/gameStore'
import type { ShelfData } from '@features/shop/types/furniture'
```

---

## 7. SUMMARY - BẢNG TÓM TẮT THAY ĐỔI

| Khía Cạnh | Trước (Type-based) | Sau (Feature-based) |
|---|---|---|
| **Cấu trúc thư mục** | Type-based (stores/, config/, types/) | Feature-based (features/staff, features/shop, ...) |
| **shopStore** | 18KB file | Tách thành furnitureStore + customerStore |
| **Types location** | Tập trung: src/types/gameTypes.ts | Phân tán: features/*/types/*.ts |
| **Config location** | Tập trung: src/config/ | Phân tán: features/*/config/ |
| **Services location** | Tập trung: src/services/ | Phân tán: features/*/services/ |
| **Components** | Tập trung: src/components/ | Tổ chức: features/*/components/ |
| **Import paths** | `../../stores/modules/...` | `@features/feature/stores/...` |
| **Circular deps** | Có nguy hiểm | Cấu trúc tránh được |
| **Domain logic** | Rải rác (Vue + Store) | Tập trung trong Store Actions |

---

## 8. VERIFY CHECKLIST

Trước khi AI Agent hoàn tất, hãy kiểm tra:

- [ ] **Build**: `npm run build` không có lỗi
- [ ] **Runtime**: `npm run dev` & browser không crash
- [ ] **Stores**: Tất cả imported stores từ correct paths
- [ ] **No Circular**: `grep -r "from.*features" src/features/ | grep -v "^../"` (không có circular imports)
- [ ] **No Old Paths**: Không còn import từ `stores/modules/shopStore`
- [ ] **Feature READMEs**: Mỗi feature có `README.md`
- [ ] **Types**: Tất cả types ở `features/*/types/`, không ở global
- [ ] **Actions**: Logic kiến bản ở Store Actions, không ở Vue components
- [ ] **Testing**: Manually test key flows (pack opening, furniture placement, NPC service)

---

## 9. CONTACT & SUPPORT

**Nếu AI Agent gặp vấn đề:**

1. **TS Compilation Error**: Kiểm tra import paths - nghĩa là file bị move nhưng import chưa update
2. **Runtime Error - Store undefined**: Kiểm tra xem store có được register trong `src/stores/index.ts` không
3. **Circular Dependency**: Use `npm install --save-dev circular-dependency-plugin` để detect
4. **UI không update**: Kiểm tra xem state có chính xác là `reactive` không (Pinia state mặc định reactive)

---

**End of REFACTOR_BLUEPRINT.md**
