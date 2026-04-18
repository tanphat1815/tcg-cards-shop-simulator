/** Các hệ năng lượng có thể xuất hiện ở Gym */
export type GymType =
  | 'Fire' | 'Water' | 'Grass' | 'Lightning'
  | 'Psychic' | 'Fighting' | 'Darkness' | 'Metal'

/** Thông tin đầy đủ một Gym Leader */
export interface GymLeader {
  id: string                   // Unique ID vd: 'gym_fire_01'
  name: string                 // Tên hiển thị vd: 'Blaze Master'
  type: GymType                // Hệ chuyên dùng
  difficultyLevel: number      // Level tối thiểu để thách đấu (1-80)
  badgeName: string            // Tên huy hiệu khi thắng vd: 'Ember Badge'
  rewardMoney: number          // Tiền thưởng khi thắng
  rewardExp: number            // XP thưởng khi thắng
  isDefeated: boolean          // Đã bị đánh bại chưa
  townX: number                // Tọa độ X trong Town scene (world coords)
  townY: number                // Tọa độ Y trong Town scene (world coords)
  generatedDeck: any[]         // Deck 5 thẻ đã được generate (raw card data)
}

/** Trạng thái khu vực Town */
export interface TownAreaState {
  isPlayerInTown: boolean           // Player đang ở Town hay Shop
  activeGymId: string | null        // Gym đang hiển thị overlay (null = không có)
  gymLeaders: GymLeader[]           // Danh sách toàn bộ Gym Leaders
}
