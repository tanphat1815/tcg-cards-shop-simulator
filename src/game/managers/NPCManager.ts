import Phaser from 'phaser';
import type MainScene from '../MainScene';
import type { Customer } from '../../types/npc';
import { useInventoryStore } from '../../stores/modules/inventoryStore';
import { useShopStore } from '../../stores/modules/shopStore';
import { DEPTH } from '../../config/renderConfigs';

/**
 * NPCManager: Quản lý toàn bộ hệ thống khách hàng (NPC).
 * Xử lý Spawn, Di chuyển, AI hành vi và tương tác với cửa hàng.
 */
export class NPCManager {
  public customers: Customer[] = [];
  public customerGroup!: Phaser.Physics.Arcade.Group;
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 8000;

  public scene: MainScene;

  constructor(scene: MainScene) {
    this.scene = scene;
    this.customerGroup = this.scene.physics.add.group();
  }

  /**
   * Cập nhật logic toán bộ NPC theo mỗi frame.
   * @param time Thời gian hiện tại.
   * @param delta Thời gian trôi qua giữa các frame.
   */
  public update(time: number, delta: number) {
    const shopStore = useShopStore();

    if (shopStore.shopState === 'OPEN' && time > this.lastSpawnTime + this.spawnInterval) {
      console.log('Spawning NPC at time:', time);
      this.spawnNPC();
      this.lastSpawnTime = time;
      this.spawnInterval = 5000 + Math.random() * 10000;
    }

    for (let i = this.customers.length - 1; i >= 0; i--) {
      const npc = this.customers[i];
      this.updateNPCState(npc, time, delta);
      this.handleNPCMovement(npc, delta);
      this.updateStatusText(npc);
      this.handleStuckRecovery(npc, time);

      if (npc.state === 'LEAVE') {
        const doorLocation = { x: 1100, y: 1350 };
        if (npc.targetY > doorLocation.y && Math.abs(npc.sprite.y - npc.targetY) < 10) {
          npc.sprite.destroy();
          if (npc.statusText) npc.statusText.destroy();
          this.customers.splice(i, 1);
        }
      }
    }
  }

  /**
   * Khởi tạo và spawn một NPC mới tại vị trí cửa hàng.
   */
  private spawnNPC() {
    const spawnX = 1100;
    const spawnY = 1350;
    
    const sprite = this.scene.physics.add.sprite(spawnX, spawnY, 'npc_idle');
    sprite.setCollideWorldBounds(true);
    sprite.setDepth(DEPTH.NPC);
    this.customerGroup.add(sprite);
    
    const npc: Customer = {
      sprite,
      instanceId: `customer_${Date.now()}_${Math.random()}`,
      state: 'SPAWN',
      timer: 0,
      targetX: 1100,
      targetY: 1150,
      targetPrice: 0,
      spawnTime: Date.now(),
      lastDecisionTime: Date.now(),
      checkedShelfIds: [],
      intent: Math.random() > 0.3 ? 'BUY' : 'PLAY'
    };

    this.customers.push(npc);
  }

  /**
   * Máy trạng thái (FSM) xử lý hành vi AI của NPC.
   * @param npc Đối tượng khách hàng.
   * @param _time Thời gian hiện tại.
   * @param delta Thời gian trôi qua.
   */
  private updateNPCState(npc: Customer, _time: number, delta: number) {
    switch (npc.state) {
      case 'SPAWN':
        if (this.isAtTarget(npc)) {
          npc.state = 'WANDER';
        }
        break;

      case 'WANDER':
        if (Date.now() > npc.lastDecisionTime + 2000) {
          if (npc.intent === 'BUY') {
            this.seekItem(npc);
          } else {
            this.seekTable(npc);
          }
          npc.lastDecisionTime = Date.now();
        }
        break;

      case 'SEEK_ITEM':
        if (this.isAtTarget(npc)) {
          npc.state = 'INTERACT';
          npc.timer = 0;
        }
        break;

      case 'INTERACT':
        npc.timer += delta;
        if (npc.timer > 2000) {
          this.buyItemFromShelf(npc);
        }
        break;

      case 'GO_CASHIER':
        if (this.isAtTarget(npc)) {
          npc.state = 'WAITING';
        }
        break;

      case 'WAITING':
        // Đang đợi thu ngân thanh toán
        break;

      case 'SEEK_TABLE':
        if (this.isAtTarget(npc)) {
          this.occupyTable(npc);
          npc.state = 'PLAYING';
        }
        break;

      case 'PLAYING':
        // Đang chơi bài
        break;

      case 'LEAVE':
        break;

      case 'WANT_TO_PLAY':
        this.seekTable(npc);
        break;
    }
  }

  private isAtTarget(npc: Customer): boolean {
    const dist = Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, npc.targetX, npc.targetY);
    return dist < 10;
  }

  private seekItem(npc: Customer) {
    const shopStore = useShopStore();
    const availableShelves = Object.values(shopStore.placedShelves).filter(s => !npc.checkedShelfIds.includes(s.id));
    
    if (availableShelves.length > 0) {
      const shelf = availableShelves[Math.floor(Math.random() * availableShelves.length)];
      npc.targetX = shelf.x;
      npc.targetY = shelf.y + 40;
      npc.assignedTableId = shelf.id;
      npc.state = 'SEEK_ITEM';
    } else {
      this.npcLeaveShop(npc);
    }
  }

  private buyItemFromShelf(npc: Customer) {
    const inventoryStore = useInventoryStore();
    const shelfId = npc.assignedTableId;
    if (!shelfId) return;

    const itemId = inventoryStore.npcTakeItemFromSlot(shelfId);
    if (itemId) {
      const price = inventoryStore.shopItems[itemId]?.sellPrice || 10;
      npc.targetPrice += price;
      
      if (Math.random() > 0.5) {
        npc.state = 'WANDER';
      } else {
        npc.targetY = 1100;
        npc.state = 'GO_CASHIER';
      }
    } else {
      npc.checkedShelfIds.push(shelfId);
      npc.state = 'WANDER';
    }
  }

  private seekTable(npc: Customer) {
    const shopStore = useShopStore();
    const availableTables = Object.values(shopStore.placedTables).filter(t => t.occupants.some(o => o === null));
    
    if (availableTables.length > 0) {
      const table = availableTables[Math.floor(Math.random() * availableTables.length)];
      const seatIdx = table.occupants.indexOf(null);
      npc.assignedTableId = table.id;
      npc.seatIndex = seatIdx;
      
      npc.targetX = table.x + (seatIdx === 0 ? -15 : 15);
      npc.targetY = table.y;
      npc.state = 'SEEK_TABLE';
    } else {
      if (Math.random() > 0.5) {
        npc.intent = 'BUY';
        npc.state = 'WANDER';
      } else {
        this.npcLeaveShop(npc);
      }
    }
  }

  private occupyTable(npc: Customer) {
    const shopStore = useShopStore();
    if (npc.assignedTableId && npc.seatIndex !== null) {
      shopStore.joinTable(npc.assignedTableId, npc.instanceId);
      shopStore.startMatch(npc.assignedTableId);
    }
  }

  public npcLeaveShop(npc: Customer) {
    npc.state = 'LEAVE';
    const doorLocation = { x: 1100, y: 1350 };
    npc.targetX = doorLocation.x;
    npc.targetY = npc.sprite.y;
  }

  private handleNPCMovement(npc: Customer, _delta: number) {
    const speed = 150;
    const sprite = npc.sprite;
    
    const dx = npc.targetX - sprite.x;
    const dy = npc.targetY - sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;
      sprite.setVelocity(vx, vy);

      if (Math.abs(vx) > Math.abs(vy)) {
        sprite.play(vx > 0 ? 'npc_walk_right' : 'npc_walk_left', true);
      } else {
        sprite.play(vy > 0 ? 'npc_walk_down' : 'npc_walk_up', true);
      }
    } else {
      sprite.setVelocity(0, 0);
      sprite.play('npc_idle', true);

      // Chuyển giai đoạn đi ra cửa
      if (npc.state === 'LEAVE' && npc.targetX === 1100 && npc.sprite.y < 1200) {
        npc.targetY = 1350;
      }
    }
  }

  private updateStatusText(npc: Customer) {
    if (!npc.statusText) {
      npc.statusText = this.scene.add.text(npc.sprite.x, npc.sprite.y - 40, '', {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT);
    }
    npc.statusText.setPosition(npc.sprite.x, npc.sprite.y - 40);
    npc.statusText.setText(`${npc.state}${npc.targetPrice > 0 ? ' ($' + npc.targetPrice + ')' : ''}`);
  }

  private handleStuckRecovery(npc: Customer, time: number) {
    const velocity = (npc.sprite.body as Phaser.Physics.Arcade.Body).velocity;
    if (npc.state !== 'WAITING' && npc.state !== 'PLAYING' && npc.state !== 'INTERACT') {
      if (Math.abs(velocity.x) < 1 && Math.abs(velocity.y) < 1) {
        if (!npc.lastMoveAttemptTime) npc.lastMoveAttemptTime = time;
        if (time - npc.lastMoveAttemptTime > 3000) {
          npc.targetX += (Math.random() - 0.5) * 100;
          npc.targetY += (Math.random() - 0.5) * 100;
          npc.lastMoveAttemptTime = time;
        }
      } else {
        npc.lastMoveAttemptTime = 0;
      }
    }
  }
}
