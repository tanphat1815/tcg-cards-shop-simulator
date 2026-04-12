 export interface CardData {
  id: string
  name: string
  hp: number
  type: string
  rarity: string
  marketPrice: number
  imageKey: string
}

export type WorkerDuty = 'NONE' | 'CASHIER' | 'STOCKER'

export interface HiredWorker {
  instanceId: string;
  workerId: string;
  duty: WorkerDuty;
  /** ID của quầy thu ngân được gán cho nhân viên này (Nếu duty là CASHIER) */
  targetDeskId?: string;
}

export interface ShelfTier {
  itemId: string | null;  // Which item fills this tier (null = empty, all slots same type)
  slots: (string | null)[];  // Each slot: itemId or null
  maxSlots: number;          // 32 for packs, 4 for boxes
}

export interface ShelfData {
  id: string;
  furnitureId: string; // ID from FURNITURE_ITEMS
  x: number;
  y: number;
  tiers: ShelfTier[]; // 3 tiers
}

export interface PlayTableData {
  id: string;
  furnitureId: string;
  x: number;
  y: number;
  occupants: (string | null)[]; // instanceIds of NPCs [seat0, seat1]
  matchStartedAt: number | null; // global game time / timestamp
  /** Góc xoay của bàn (0: Ngang, 90: Dọc) */
  rotation?: number;
}

export interface CashierData {
  id: string;
  furnitureId: string;
  x: number;
  y: number;
}

export type NPCState = 'SPAWN' | 'WANDER' | 'SEEK_ITEM' | 'INTERACT' | 'GO_CASHIER' | 'WAITING' | 'LEAVE' | 'WANT_TO_PLAY' | 'SEEK_TABLE' | 'PLAYING'

export interface Customer {
  sprite: Phaser.Physics.Arcade.Sprite;
  state: NPCState;
  timer: number;
  targetX: number;
  targetY: number;
  targetPrice: number;
  intent?: 'BUY' | 'PLAY';
  assignedTableId?: string | null;
  seatIndex?: number | null;
  spawnTime: number;         // Time when NPC entered shop
  lastDecisionTime: number;  // For periodic AI re-scans
  statusText?: Phaser.GameObjects.Text; // Overhead popover
  lastMoveAttemptTime?: number; // For stuck recovery logic
  instanceId: string; // Persistent ID for this NPC
  checkedShelfIds: string[]; // Remember shelves visited but empty
  searchStartTime?: number; // Time when NPC started searching for a table/shelf
}