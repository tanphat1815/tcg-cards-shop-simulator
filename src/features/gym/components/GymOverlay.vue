<!-- src/features/gym/components/GymOverlay.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGymStore } from '../store/gymStore'
import { useBattleStore } from '../../battle/store/battleStore'
import EnhancedButton from '../../shared/components/EnhancedButton.vue'

const gymStore = useGymStore()
const battleStore = useBattleStore()
const isGenerating = ref(false)

const gym = computed(() => gymStore.activeGym)
const isVisible = computed(() => !!gym.value && !battleStore.isOpen)

const typeEmoji: Record<string, string> = {
  Fire: '🔥', Water: '💧', Grass: '🌿', Lightning: '⚡',
  Psychic: '🔮', Fighting: '👊', Darkness: '🌑', Metal: '⚙️',
}

async function handleChallenge() {
  if (!gym.value || gym.value.isDefeated) return
  isGenerating.value = true

  try {
    const deck = await gymStore.generateDeckForGym(gym.value.id)
    // Mở battle với deck được sinh sẵn (openBattleWithDeck sẽ được thêm vào battleStore ở Bước 6)
    // @ts-ignore - Sẽ có trong Bước 6
    battleStore.openBattleWithDeck(deck, gym.value.id)
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <Transition name="gym-slide">
    <div v-if="isVisible" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] pointer-events-auto">
      <div class="bg-gray-900/95 backdrop-blur border-2 border-indigo-500/60 rounded-2xl p-6 shadow-2xl min-w-[320px] max-w-md">
        <div class="flex items-start gap-4 mb-4">
          <div class="text-4xl">{{ typeEmoji[gym!.type] ?? '🏟️' }}</div>
          <div class="flex-grow">
            <h2 class="text-xl font-black text-white">{{ gym!.name }}</h2>
            <p class="text-sm text-indigo-300 font-bold">{{ gym!.type }} Type Gym</p>
            <p class="text-xs text-gray-400">Yêu cầu: Level {{ gym!.difficultyLevel }}</p>
          </div>
          <div v-if="gym!.isDefeated" class="bg-green-500/20 border border-green-500/40 text-green-400 px-3 py-1 rounded-full text-xs font-black">
            ✅ DEFEATED
          </div>
        </div>

        <div class="text-xs text-gray-400 mb-4 border-t border-gray-700/50 pt-3">
          🏅 Phần thưởng: <span class="text-yellow-400 font-bold">${{ gym!.rewardMoney }}</span>
          &nbsp;·&nbsp; <span class="text-blue-400 font-bold">+{{ gym!.rewardExp }} XP</span>
        </div>

        <div class="flex gap-3">
          <EnhancedButton
            variant="secondary"
            size="md"
            @click="gymStore.exitGym()"
          >
            Bỏ qua
          </EnhancedButton>
          <EnhancedButton
            variant="danger"
            size="md"
            fullWidth
            :loading="isGenerating"
            :disabled="gym!.isDefeated"
            @click="handleChallenge"
          >
            {{ gym!.isDefeated ? '✅ Đã Đánh Bại' : '⚔️ Thách Đấu!' }}
          </EnhancedButton>
        </div>

        <p class="text-[10px] text-gray-600 mt-3 text-center">
          Nhấn [E] hoặc di chuyển ra xa để đóng
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.gym-slide-enter-active, .gym-slide-leave-active { transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1); }
.gym-slide-enter-from, .gym-slide-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
