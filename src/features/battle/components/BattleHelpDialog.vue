<script setup lang="ts">
import { useBattleStore } from '../store/battleStore'

const store = useBattleStore()
</script>

<template>
  <Teleport to="body">
    <div v-if="store.showHelp" class="help-backdrop" @click.self="store.toggleHelp()">
      <div class="help-dialog">
        <div class="help-header">
          <div class="help-title">
            <span class="help-icon">📖</span>
            <h2>Hướng dẫn Đấu bài Pokémon TCG</h2>
          </div>
          <button class="close-btn" @click="store.toggleHelp()">✕</button>
        </div>

        <div class="help-body">
          <section class="help-section">
            <h3>🎯 Mục tiêu</h3>
            <p>Hạ gục toàn bộ 5 Pokémon của đối thủ để giành chiến thắng!</p>
          </section>

          <section class="help-section">
            <h3>🔄 Lượt đánh</h3>
            <ul>
              <li><strong>Chế độ Cơ bản:</strong> Mỗi lượt bạn chọn 1 đòn đánh và tấn công.</li>
              <li><strong>Chế độ Nâng cao:</strong> Gắn 1 năng lượng → Chọn đòn đánh (cần đủ NL).</li>
            </ul>
          </section>

          <section class="help-section">
            <h3>⚡ Năng lượng (Chế độ Nâng cao)</h3>
            <ul>
              <li>Mỗi lượt chỉ gắn được <strong>1 năng lượng</strong> vào bất kỳ Pokémon nào.</li>
              <li>Đòn đánh yêu cầu loại năng lượng phù hợp. <strong>⚪ Colorless</strong> = bất kỳ.</li>
              <li>Rút lui tiêu tốn năng lượng bằng số Retreat Cost.</li>
            </ul>
          </section>

          <section class="help-section">
            <h3>💪 Điểm yếu & Kháng cự</h3>
            <ul>
              <li><strong>Weakness (×2):</strong> Tấn công đúng điểm yếu → sát thương gấp đôi!</li>
              <li><strong>Resistance (-30):</strong> Tấn công loại kháng → giảm 30 sát thương.</li>
            </ul>
          </section>

          <section class="help-section">
            <h3>🔄 Rút lui (Retreat)</h3>
            <ul>
              <li>Click thẻ Bench → Xác nhận để thay Pokémon Active.</li>
              <li>Chế độ Cơ bản: Rút lui miễn phí. Nâng cao: Tốn năng lượng.</li>
            </ul>
          </section>

          <section class="help-section">
            <h3>🔍 Xem chi tiết thẻ</h3>
            <ul>
              <li><strong>Click chuột phải</strong> vào bất kỳ thẻ nào để xem thông tin đầy đủ.</li>
            </ul>
          </section>

          <div class="help-tip">
            💡 <strong>Tip:</strong> Hệ lửa 🔥 yếu nước 💧, nước yếu sét ⚡, sét yếu đất 👊...
          </div>
        </div>

        <div class="help-footer">
          <button class="btn-close-help" @click="store.toggleHelp()">Đã hiểu!</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.help-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.help-dialog {
  background: linear-gradient(145deg, #1e2235, #16192e);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(99,102,241,0.15);
  overflow: hidden;
}

.help-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(99, 102, 241, 0.12);
}

.help-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.help-icon {
  font-size: 24px;
}

.help-title h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #e2e8f0;
}

.close-btn {
  background: rgba(255,255,255,0.08);
  border: none;
  color: #94a3b8;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.close-btn:hover { background: rgba(239,68,68,0.2); color: #ef4444; }

.help-body {
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-section h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: #a5b4fc;
}

.help-section p,
.help-section li {
  margin: 0;
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.6;
}

.help-section ul {
  padding-left: 18px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.help-tip {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.25);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
  color: #fde68a;
  line-height: 1.5;
}

.help-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  justify-content: flex-end;
}

.btn-close-help {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border: none;
  color: white;
  padding: 10px 28px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-close-help:hover { opacity: 0.85; transform: translateY(-1px); }
</style>
