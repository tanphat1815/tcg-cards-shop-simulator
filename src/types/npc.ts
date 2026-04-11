import Phaser from 'phaser';

/**
 * Các trạng thái chính trong vòng đời của một khách hàng (NPC).
 */
export type NPCState = 
  | 'SPAWN'         // Đang xuất hiện/đi vào shop
  | 'WANDER'        // Đang đi lang thang tìm quầy/bàn
  | 'SEEK_ITEM'     // Đang đi tới kệ hàng để mua đồ
  | 'INTERACT'      // Đang tương tác với kệ (nhặt đồ)
  | 'GO_CASHIER'    // Đang đi tới quầy thu ngân xếp hàng
  | 'WAITING'       // Đang đứng chờ thanh toán
  | 'LEAVE'         // Đang đi ra khỏi shop (3 giai đoạn)
  | 'WANT_TO_PLAY'  // Muốn chơi bài (sau khi mua hoặc chán nản)
  | 'SEEK_TABLE'    // Đang đi tới bàn đấu bài
  | 'PLAYING';      // Đang trong quá trình thi đấu bài

/**
 * Interface quản lý dữ liệu và trạng thái của một Khách hàng (Customer).
 */
export interface Customer {
  sprite: Phaser.Physics.Arcade.Sprite; // Sprite hiển thị trong Phaser
  state: NPCState;                      // Trạng thái AI hiện tại
  timer: number;                        // Bộ đếm thời gian dùng cho các trạng thái
  targetX: number;                      // Tọa độ X mục tiêu
  targetY: number;                      // Tọa độ Y mục tiêu
  targetPrice: number;                  // Tổng tiền khách sẽ trả (khi mua đồ)
  intent?: 'BUY' | 'PLAY';              // Ý định ban đầu: Mua đồ hay Chơi bài
  assignedTableId?: string | null;      // ID bàn được gán (nếu đang PLAY)
  seatIndex?: number | null;            // Vị trí ghế ngồi (0 hoặc 1)
  spawnTime: number;                    // Thời điểm khách vào shop
  lastDecisionTime: number;             // Lần cuối cùng khách đưa ra quyết định AI
  statusText?: Phaser.GameObjects.Text; // Chữ hiển thị trên đầu khách (Status popover)
  lastMoveAttemptTime?: number;         // Dùng để cứu NPC khi bị kẹt
  instanceId: string;                   // ID duy nhất (persistent) để quản lý qua Pinia
  checkedShelfIds: string[];            // Danh sách kệ đã kiểm tra nhưng hết hàng
  searchStartTime?: number;             // Thời điểm bắt đầu tìm bàn/kệ
}
