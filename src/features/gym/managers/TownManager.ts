// src/features/gym/managers/TownManager.ts
import Phaser from 'phaser'
import { useGymStore } from '../store/gymStore'
import { DEPTH } from '../../environment/config'

interface GymBuilding {
  gymId: string
  sprite: Phaser.Physics.Arcade.Sprite
  label: Phaser.GameObjects.Text
  detectionZone: Phaser.GameObjects.Zone
}

export class TownManager {
  private scene: Phaser.Scene
  private townGraphics!: Phaser.GameObjects.Graphics
  private gymBuildings: GymBuilding[] = []
  private lastNearGymId: string | null = null

  // Town bắt đầu từ x=3000 để không đè Shop
  static readonly TOWN_START_X = 3000
  static readonly TOWN_START_Y = 0
  static readonly TOWN_WIDTH = 2000
  static readonly TOWN_HEIGHT = 1500

  public gymGroup!: Phaser.Physics.Arcade.StaticGroup

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.gymGroup = scene.physics.add.staticGroup()
  }

  /** Vẽ nền Town và đặt các Gym buildings */
  initializeTown() {
    this.drawTownBackground()
    this.spawnGymBuildings()
  }

  private drawTownBackground() {
    const { TOWN_START_X, TOWN_START_Y, TOWN_WIDTH, TOWN_HEIGHT } = TownManager
    const g = this.scene.add.graphics().setDepth(DEPTH.FLOOR)
    this.townGraphics = g

    // Nền cỏ xanh đậm
    g.fillStyle(0x2d6a2d)
    g.fillRect(TOWN_START_X, TOWN_START_Y, TOWN_WIDTH, TOWN_HEIGHT)

    // Đường nhựa ngang
    g.fillStyle(0x718096)
    g.fillRect(TOWN_START_X, TOWN_START_Y + 450, TOWN_WIDTH, 80)
    g.fillRect(TOWN_START_X, TOWN_START_Y + 750, TOWN_WIDTH, 80)

    // Đường nhựa dọc
    g.fillRect(TOWN_START_X + 300, TOWN_START_Y, 80, TOWN_HEIGHT)
    g.fillRect(TOWN_START_X + 700, TOWN_START_Y, 80, TOWN_HEIGHT)
    g.fillRect(TOWN_START_X + 1100, TOWN_START_Y, 80, TOWN_HEIGHT)

    // Biển báo khu vực
    this.scene.add.text(
      TOWN_START_X + TOWN_WIDTH / 2,
      TOWN_START_Y + 30,
      '🏙️ GYM TOWN',
      { fontSize: '28px', color: '#f6e05e', fontStyle: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 16, y: 8 } }
    ).setOrigin(0.5).setDepth(DEPTH.UI_TEXT)

    // Cổng quay về Shop (Gate 2)
    this.scene.add.text(
      TOWN_START_X + 50,
      500,
      '🚪 VỀ SHOP',
      { fontSize: '20px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 10, y: 5 } }
    ).setOrigin(0, 0.5).setDepth(DEPTH.FLOOR + 1)
  }

  private spawnGymBuildings() {
    const gymStore = useGymStore()

    for (const leader of gymStore.gymLeaders) {
      const sprite = this.gymGroup.create(leader.townX, leader.townY, 'gym_building') as Phaser.Physics.Arcade.Sprite
      sprite.setDepth(DEPTH.FURNITURE)
      sprite.setData('gymId', leader.id)

      // Màu tint theo hệ
      sprite.setTint(this.getTypeColor(leader.type))

      // Label tên Gym Leader
      const label = this.scene.add.text(
        leader.townX,
        leader.townY - 55,
        `${leader.name}\n[${leader.type}] Lv.${leader.difficultyLevel}`,
        {
          fontSize: '11px',
          color: '#fff',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: { x: 6, y: 3 },
          align: 'center',
        }
      ).setOrigin(0.5).setDepth(DEPTH.UI_TEXT)

      if (leader.isDefeated) {
        sprite.setAlpha(0.5)
        label.setText(label.text + '\n✅ DEFEATED')
      }

      // Detection zone: 80px radius xung quanh building
      const zone = this.scene.add.zone(leader.townX, leader.townY, 80, 80)
      this.scene.physics.add.existing(zone, true)

      this.gymBuildings.push({ gymId: leader.id, sprite, label, detectionZone: zone })
    }
  }

  /**
   * Gọi mỗi frame từ update() trong MainScene.
   * Phát hiện player đứng gần Gym nào → cập nhật gymStore.
   * ⚠️ KHÔNG dùng Vue reactivity ở đây. Chỉ gọi store actions.
   */
  update(playerX: number, playerY: number) {
    const gymStore = useGymStore()
    let nearestGymId: string | null = null

    for (const building of this.gymBuildings) {
      const dist = Phaser.Math.Distance.Between(
        playerX, playerY,
        building.sprite.x, building.sprite.y
      )
      if (dist < 80) {
        nearestGymId = building.gymId
        break
      }
    }

    // Chỉ gọi store action khi thực sự thay đổi (tránh gọi mỗi frame)
    if (nearestGymId !== this.lastNearGymId) {
      this.lastNearGymId = nearestGymId
      if (nearestGymId) {
        gymStore.enterGym(nearestGymId)
      } else {
        gymStore.exitGym()
      }
    }
  }

  /** Làm tươi lại sprite (gọi sau khi defeat Gym) */
  refreshBuildingState() {
    const gymStore = useGymStore()
    for (const building of this.gymBuildings) {
      const leader = gymStore.gymLeaders.find(g => g.id === building.gymId)
      if (leader?.isDefeated) {
        building.sprite.setAlpha(0.5)
      }
    }
  }

  private getTypeColor(type: string): number {
    const colors: Record<string, number> = {
      Fire: 0xff6b35,
      Water: 0x4299e1,
      Grass: 0x48bb78,
      Lightning: 0xecc94b,
      Psychic: 0xed64a6,
      Fighting: 0xed8936,
      Darkness: 0x553c9a,
      Metal: 0xa0aec0,
    }
    return colors[type] ?? 0xffffff
  }

  destroy() {
    this.townGraphics?.destroy()
    this.gymBuildings.forEach(b => {
      b.label.destroy()
      b.detectionZone.destroy()
    })
    this.gymBuildings = []
  }
}
