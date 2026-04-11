import Phaser from 'phaser';
import type MainScene from '../MainScene';
import { useShopStore } from '../../stores/modules/shopStore';
import { getShopBounds } from '../../utils/shopUtils';
import { DEPTH } from '../../config/renderConfigs';

/**
 * BuildManager: Quản lý chế độ xây dựng, xem trước diện tích và đặt vật dụng.
 */
export class BuildManager {
  private buildGhost: Phaser.GameObjects.Sprite | null = null;
  private expansionGraphics: Phaser.GameObjects.Graphics | null = null;

  public scene: MainScene;

  constructor(scene: MainScene) {
    this.scene = scene;
  }

  /**
   * Cập nhật logic xem trước khi đang trong chế độ xây dựng.
   */
  public update() {
    const shopStore = useShopStore();

    if (shopStore.isBuildMode && (shopStore.buildItemId || shopStore.editFurnitureData)) {
       this.handleGhostMovement();
    } else {
       this.clearGhost();
    }

    this.drawExpansionPreview();
  }

  /**
   * Hiển thị sprite "bóng ma" đi theo chuột để chọn vị trí đặt.
   */
  private handleGhostMovement() {
    const shopStore = useShopStore();
    const pointer = this.scene.input.activePointer;
    const furnitureId = shopStore.buildItemId || shopStore.editFurnitureData?.furnitureId;

    if (!this.buildGhost && furnitureId) {
      this.buildGhost = this.scene.add.sprite(pointer.worldX, pointer.worldY, furnitureId);
      this.buildGhost.setAlpha(0.6);
      this.buildGhost.setDepth(DEPTH.GHOST);
    }

    if (this.buildGhost) {
      // Snapping vào grid 10px
      const snapX = Math.round(pointer.worldX / 10) * 10;
      const snapY = Math.round(pointer.worldY / 10) * 10;
      this.buildGhost.setPosition(snapX, snapY);

      // Kiểm tra tính hợp lệ của vị trí đặt
      const isValid = this.isValidPlacement(snapX, snapY, furnitureId || '');
      this.buildGhost.setTint(isValid ? 0xffffff : 0xff0000);

      // Nhấp chuột để đặt đồ (chỉ khi hợp lệ)
      if (pointer.isDown && pointer.button === 0 && isValid) {
        const placedData = shopStore.placeFurniture(snapX, snapY);
        if (placedData) {
          this.scene.events.emit('furniture-placed', placedData);
          this.clearGhost();
        }
      }
      
      // Nhấp phải chuột để hủy
      if (pointer.rightButtonDown()) {
        shopStore.cancelBuildMode();
      }
    }
  }

  /**
   * Kiểm tra xem vị trí đặt đồ có hợp lệ không (nằm trong shop, không đè lên đồ khác).
   */
  private isValidPlacement(x: number, y: number, _furnitureId: string): boolean {
    const shopStore = useShopStore();
    const bounds = getShopBounds(shopStore.expansionLevel);

    // 1. Kiểm tra nằm trong ranh giới shop (có trừ đi lề tường khoảng 20px)
    const margin = 20;
    if (x < bounds.x + margin || x > bounds.x + bounds.w - margin ||
        y < bounds.y + margin || y > bounds.y + bounds.h - margin) {
      return false;
    }

    // 2. Kiểm tra va chạm với các đồ vật khác
    // Tạo một vùng chữ nhật tạm thời để check va chạm
    const ghostRect = new Phaser.Geom.Rectangle(x - 20, y - 20, 40, 40);
    const furnitureGroup = this.scene.furnitureManager.furnitureGroup;
    
    let isOverlapping = false;
    furnitureGroup.getChildren().forEach((child: any) => {
        // Nếu là đồ đang edit thì bỏ qua không check va chạm với chính nó
        if (shopStore.editFurnitureData && child.getData('id') === shopStore.editFurnitureData.id) return;
        
        const childRect = child.getBounds();
        if (Phaser.Geom.Rectangle.Overlaps(ghostRect, childRect)) {
            isOverlapping = true;
        }
    });

    return !isOverlapping;
  }

  private clearGhost() {
    if (this.buildGhost) {
      this.buildGhost.destroy();
      this.buildGhost = null;
    }
  }

  /**
   * Vẽ vùng diện tích shop có thể mở rộng (màu xanh neon hoặc blueprint).
   */
  private drawExpansionPreview() {
    const shopStore = useShopStore();
    if (!shopStore.settings.showExpansionPreview) {
      if (this.expansionGraphics) this.expansionGraphics.clear();
      return;
    }

    if (!this.expansionGraphics) {
      this.expansionGraphics = this.scene.add.graphics().setDepth(DEPTH.PREVIEW);
    }

    const graphics = this.expansionGraphics;
    graphics.clear();

    const currentLevel = shopStore.expansionLevel;
    const style = shopStore.settings.expansionPreviewStyle;

    const color = style === 'BLUEPRINT' ? 0x0000FF : 0x00FF00;
    graphics.lineStyle(3, color, 0.5);
    
    // Vẽ khung shop theo các level tiếp theo (ví dụ level + 1)
    const nextBounds = getShopBounds(currentLevel + 1);
    graphics.strokeRect(nextBounds.x, nextBounds.y, nextBounds.w, nextBounds.h);
  }
}
