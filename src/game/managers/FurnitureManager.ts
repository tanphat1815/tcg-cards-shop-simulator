import Phaser from 'phaser';
import type MainScene from '../MainScene';
import { useShopStore } from '../../stores/modules/shopStore';
import { STOCK_ITEMS } from '../../config/shopData';
import { DEPTH } from '../../config/renderConfigs';

/**
 * FurnitureManager: Quản lý việc hiển thị (Sprites/Graphics) và tương tác với nội thất.
 * Đồng bộ hóa dữ liệu từ ShopStore vào thế giới Phaser.
 */
export class FurnitureManager {
  private shelfSprites: Record<string, Phaser.Physics.Arcade.Sprite> = {};
  private tableSprites: Record<string, Phaser.Physics.Arcade.Sprite> = {};
  private cashierSprites: Record<string, Phaser.Physics.Arcade.Sprite> = {};
  private shelfGraphics: Record<string, Phaser.GameObjects.Graphics> = {};
  public furnitureGroup!: Phaser.Physics.Arcade.StaticGroup;

  public scene: MainScene;

  constructor(scene: MainScene) {
    this.scene = scene;
    this.furnitureGroup = this.scene.physics.add.staticGroup();
  }

  /**
   * Khởi tạo và vẽ lại toàn bộ nội thất dựa trên dữ liệu trong Store.
   */
  public syncFurniture() {
    const shopStore = useShopStore();
    this.syncShelves(shopStore.placedShelves);
    this.syncTables(shopStore.placedTables);
    this.syncCashiers(shopStore.placedCashiers);
  }

  /**
   * Cập nhật các sprite kệ hàng.
   */
  private syncShelves(shelves: Record<string, any>) {
    Object.keys(this.shelfSprites).forEach(id => {
      if (!shelves[id]) {
        this.shelfSprites[id].destroy();
        if (this.shelfGraphics[id]) this.shelfGraphics[id].destroy();
        delete this.shelfSprites[id];
        delete this.shelfGraphics[id];
      }
    });

    Object.values(shelves).forEach(data => {
      let sprite = this.shelfSprites[data.id];
      if (!sprite) {
        sprite = this.furnitureGroup.create(data.x, data.y, data.furnitureId || 'shelf_texture');
        sprite.setInteractive();
        sprite.setData('id', data.id);
        sprite.setDepth(DEPTH.FURNITURE);
        
        sprite.on('pointerdown', () => {
          const shopStore = useShopStore();
          if (shopStore.isEditMode) {
             shopStore.pickUpFurniture(data.id, 'shelf');
          } else if (!shopStore.isBuildMode) {
             shopStore.openShelfManagement(data.id);
          }
        });

        this.shelfSprites[data.id] = sprite;
        this.shelfGraphics[data.id] = this.scene.add.graphics().setDepth(DEPTH.FURNITURE + 1);
      } else {
        sprite.setPosition(data.x, data.y);
        (sprite.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
      this.drawShelfContent(data);
    });
  }

  /**
   * Vẽ nội dung hàng hóa hiển thị trên kệ.
   */
  private drawShelfContent(shelfData: any) {
    const graphics = this.shelfGraphics[shelfData.id];
    if (!graphics) return;
    graphics.clear();

    shelfData.tiers.forEach((tier: any, tierIdx: number) => {
      if (tier.itemId && tier.slots.length > 0) {
        const itemData = STOCK_ITEMS[tier.itemId as keyof typeof STOCK_ITEMS];
        const color = itemData?.type === 'box' ? 0x8B4513 : 0x4F46E5;
        
        graphics.fillStyle(color, 0.8);
        const fillWidth = (tier.slots.length / tier.maxSlots) * 50;
        graphics.fillRect(shelfData.x - 25, shelfData.y - 40 + (tierIdx * 15), fillWidth, 10);
      }
    });
  }

  /**
   * Cập nhật các sprite bàn đấu.
   */
  private syncTables(tables: Record<string, any>) {
    Object.keys(this.tableSprites).forEach(id => {
      if (!tables[id]) {
        this.tableSprites[id].destroy();
        delete this.tableSprites[id];
      }
    });

    Object.values(tables).forEach(data => {
      let sprite = this.tableSprites[data.id];
      if (!sprite) {
        sprite = this.furnitureGroup.create(data.x, data.y, data.furnitureId || 'play_table');
        sprite.setInteractive();
        sprite.setData('id', data.id);
        sprite.setDepth(DEPTH.TABLE);

        sprite.on('pointerdown', () => {
          const shopStore = useShopStore();
          if (shopStore.isEditMode) {
             shopStore.pickUpFurniture(data.id, 'table');
          }
        });

        this.tableSprites[data.id] = sprite;
      } else {
        sprite.setPosition(data.x, data.y);
        (sprite.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
    });
  }

  /**
   * Cập nhật các sprite quầy thu ngân.
   */
  private syncCashiers(cashiers: Record<string, any>) {
    Object.keys(this.cashierSprites).forEach(id => {
      if (!cashiers[id]) {
        this.cashierSprites[id].destroy();
        delete this.cashierSprites[id];
      }
    });

    Object.values(cashiers).forEach(data => {
      let sprite = this.cashierSprites[data.id];
      if (!sprite) {
        sprite = this.furnitureGroup.create(data.x, data.y, data.furnitureId || 'cashier_desk');
        sprite.setInteractive();
        sprite.setData('id', data.id);
        sprite.setDepth(DEPTH.CASHIER);

        sprite.on('pointerdown', () => {
          const shopStore = useShopStore();
          if (shopStore.isEditMode) {
             shopStore.pickUpFurniture(data.id, 'cashier');
          }
        });

        this.cashierSprites[data.id] = sprite;
      } else {
        sprite.setPosition(data.x, data.y);
        (sprite.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
    });
  }

  /**
   * Xử lý va chạm giữa NPC và nội thất.
   */
  public setupCollisions(npcSprites: Phaser.GameObjects.Group) {
      const shelfGroup = this.scene.physics.add.staticGroup(Object.values(this.shelfSprites));
      const tableGroup = this.scene.physics.add.staticGroup(Object.values(this.tableSprites));
      const cashierGroup = this.scene.physics.add.staticGroup(Object.values(this.cashierSprites));

      this.scene.physics.add.collider(npcSprites, shelfGroup);
      this.scene.physics.add.collider(npcSprites, tableGroup);
      this.scene.physics.add.collider(npcSprites, cashierGroup);
  }
}
