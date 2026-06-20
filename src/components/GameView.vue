<template>
  <div class="game-view">
    <GameHeader
      :state="state"
      :days-left="daysLeft"
      :profit="profit"
      :theme="theme"
      @back="$emit('back')"
      @toggle-theme="$emit('toggle-theme')"
    />

    <div class="tabs-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'training' }"
        @click="activeTab = 'training'"
      >
        📅 训练日程
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'dormitory' }"
        @click="activeTab = 'dormitory'"
      >
        🏠 宿舍管理
      </button>
    </div>

    <div class="game-body">
      <aside class="sidebar">
        <div class="trainee-grid">
          <TraineeCard
            v-for="t in activeTrainees"
            :key="t.id"
            :trainee="t"
            :score="calcScore(t)"
            :dorm-room="getDormRoom(t.id)"
            :dorm-effects="state.dormEffects"
          />
        </div>
      </aside>

      <main class="main-panel">
        <template v-if="activeTab === 'training'">
          <SchedulePanel
            :trainees="activeTrainees"
            :schedule="state.schedule"
            :can-end="canEndDay"
            :dorm-effects="state.dormEffects"
            @set="(id, act) => $emit('set-schedule', id, act)"
            @clear="$emit('clear-schedule')"
            @end-day="$emit('end-day')"
          />
          <DayLog :logs="state.logs" />
        </template>
        <template v-else-if="activeTab === 'dormitory'">
          <DormitoryPanel
            :dormitory="state.dormitory"
            :trainees="state.trainees"
            :money="state.money"
            @assign-room="onAssignRoom"
            @upgrade-room="(id, q) => $emit('upgrade-room', id, q)"
            @add-room="(q) => $emit('add-room', q)"
          />
          <DayLog :logs="state.logs" :filter="dormLogFilter" />
        </template>
      </main>

      <aside class="right-panel">
        <GroupsPanel
          :groups="state.groups"
          :trainees="state.trainees"
          :money="state.money"
          @release="(id) => $emit('release-single', id)"
        />
        <RelationshipPanel
          :trainees="state.trainees"
          :relationships="state.relationships"
        />
      </aside>
    </div>

    <RatingModal
      v-if="state.pendingRating && state.gameStatus === 'playing'"
      :results="ratingResults"
      @close="$emit('dismiss-rating')"
      @debut="showDebut = true"
    />

    <DebutModal
      v-if="showDebut"
      :candidates="ratingResults"
      @close="showDebut = false"
      @confirm="onDebut"
    />

    <EventModal
      v-if="state.pendingEvent"
      :event="state.pendingEvent"
      @resolve="(keep) => $emit('resolve-poaching', keep)"
    />

    <GameOverModal
      v-if="state.gameStatus !== 'playing'"
      :status="state.gameStatus"
      :state="state"
      :profit="profit"
      @back="$emit('back')"
    />

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GameHeader from './GameHeader.vue'
import TraineeCard from './TraineeCard.vue'
import SchedulePanel from './SchedulePanel.vue'
import DayLog from './DayLog.vue'
import GroupsPanel from './GroupsPanel.vue'
import RelationshipPanel from './RelationshipPanel.vue'
import DormitoryPanel from './DormitoryPanel.vue'
import RatingModal from './RatingModal.vue'
import DebutModal from './DebutModal.vue'
import EventModal from './EventModal.vue'
import GameOverModal from './GameOverModal.vue'

const props = defineProps({
  state: Object,
  activeTrainees: Array,
  daysLeft: Number,
  profit: Number,
  theme: String,
  canEndDay: Boolean,
  ratingResults: Array,
  calcScore: Function,
})

const emit = defineEmits([
  'back',
  'toggle-theme',
  'set-schedule',
  'clear-schedule',
  'end-day',
  'dismiss-rating',
  'debut',
  'resolve-poaching',
  'release-single',
  'assign-room',
  'upgrade-room',
  'add-room',
])

const showDebut = ref(false)
const toast = ref('')
const activeTab = ref('training')

function dormLogFilter(log) {
  return /🏠|🏨|🛏️|🏗️|宿舍|房间|室友|同住/.test(log.text)
}

function getDormRoom(traineeId) {
  if (!props.state?.dormitory) return null
  return props.state.dormitory.find((r) => r.occupantIds.includes(traineeId))
}

function onAssignRoom(traineeId, roomId) {
  if (roomId === '') {
    const unassignedRoom = props.state.dormitory.find(
      (r) => r.occupantIds.length < 2 && !r.occupantIds.includes(traineeId)
    )
    if (unassignedRoom) {
      emit('assign-room', traineeId, unassignedRoom.id)
      showToastMsg('练习生已重新分配至空房')
    }
  } else {
    emit('assign-room', traineeId, roomId)
  }
}

function onDebut(memberIds, groupName) {
  emit('debut', memberIds, groupName, (result) => {
    if (result?.success) {
      showDebut.value = false
      showToastMsg('出道成功！')
    } else if (result?.message) {
      showToastMsg(result.message)
    }
  })
}

function showToastMsg(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2500)
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

.tab-btn {
  padding: 0.75rem 1.25rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.95rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  font-family: inherit;
  font-weight: 500;
}

.tab-btn:hover {
  color: var(--text-secondary);
}

.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.game-body {
  display: grid;
  grid-template-columns: 1fr 1.1fr 0.9fr;
  gap: 1rem;
  padding: 1rem;
  flex: 1;
}

@media (max-width: 1100px) {
  .game-body {
    grid-template-columns: 1fr;
  }
}

.sidebar .trainee-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.main-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-card);
  border: 1px solid var(--accent);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  z-index: 200;
  box-shadow: var(--shadow);
}
</style>
