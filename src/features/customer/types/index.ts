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
