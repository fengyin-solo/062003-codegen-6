<template>
  <SaveManager
    v-if="screen === 'menu'"
    :slots="slots"
    :theme="theme"
    @new="onNew"
    @load="onLoad"
    @delete="onDelete"
    @toggle-theme="toggleTheme"
  />
  <GameView
    v-else-if="state"
    :state="state"
    :active-trainees="activeTrainees"
    :days-left="daysLeft"
    :profit="profit"
    :theme="theme"
    :can-end-day="canEndDay()"
    :rating-results="getRatingResults()"
    :calc-score="calcTraineeScore"
    @back="backToMenu"
    @toggle-theme="toggleTheme"
    @set-schedule="setSchedule"
    @clear-schedule="clearSchedule"
    @end-day="endDay"
    @dismiss-rating="dismissRating"
    @debut="onDebut"
    @resolve-poaching="handlePoaching"
    @release-single="onReleaseSingle"
    @assign-room="onAssignRoom"
    @upgrade-room="onUpgradeRoom"
    @add-room="onAddRoom"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SaveManager from './components/SaveManager.vue'
import GameView from './components/GameView.vue'
import { useTheme } from './composables/useTheme'
import { useGame } from './composables/useGame'
import { loadAllSaves, deleteSlot } from './utils/storage'

const { theme, toggleTheme } = useTheme()
const slots = ref([])

const {
  state,
  screen,
  profit,
  daysLeft,
  activeTrainees,
  startNewGame,
  loadGame,
  setSchedule,
  clearSchedule,
  canEndDay,
  endDay,
  handlePoaching,
  handleDebut,
  handleReleaseSingle,
  dismissRating,
  backToMenu,
  getRatingResults,
  calcTraineeScore,
  handleAssignRoom,
  handleUpgradeRoom,
  handleAddRoom,
} = useGame()

onMounted(() => {
  slots.value = loadAllSaves()
})

function refreshSlots() {
  slots.value = loadAllSaves()
}

function onNew(i) {
  startNewGame(i)
  refreshSlots()
}

function onLoad(i, slot) {
  loadGame(i, slot)
}

function onDelete(i) {
  if (confirm('确定删除此存档？')) {
    deleteSlot(i)
    refreshSlots()
  }
}

function onDebut(memberIds, groupName, callback) {
  const result = handleDebut(memberIds, groupName)
  if (callback) callback(result)
}

function onReleaseSingle(groupId) {
  const result = handleReleaseSingle(groupId)
  if (result && !result.success) {
    alert(result.message)
  }
}

function showToast(msg) {
  if (!window.__toastTimer) {
    const gameView = document.querySelector('.game-view')
    if (gameView) {
      let toast = gameView.querySelector('.dorm-toast')
      if (!toast) {
        toast = document.createElement('div')
        toast.className = 'dorm-toast'
        toast.style.cssText = `
          position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
          background: var(--bg-card); border: 1px solid var(--accent);
          padding: 0.75rem 1.5rem; border-radius: 8px; z-index: 300;
          box-shadow: var(--shadow); opacity: 0; transition: opacity 0.3s;
          pointer-events: none;
        `
        gameView.appendChild(toast)
      }
      toast.textContent = msg
      toast.style.opacity = '1'
      clearTimeout(window.__toastTimer)
      window.__toastTimer = setTimeout(() => {
        toast.style.opacity = '0'
        window.__toastTimer = null
      }, 2500)
    }
  }
}

function onAssignRoom(traineeId, roomId) {
  const result = handleAssignRoom(traineeId, roomId)
  if (result && !result.success && result.message) {
    alert(result.message)
  }
}

function onUpgradeRoom(roomId, quality) {
  const result = handleUpgradeRoom(roomId, quality)
  if (result && !result.success && result.message) {
    alert(result.message)
  }
}

function onAddRoom(quality) {
  const result = handleAddRoom(quality)
  if (result && !result.success && result.message) {
    alert(result.message)
  }
}
</script>
