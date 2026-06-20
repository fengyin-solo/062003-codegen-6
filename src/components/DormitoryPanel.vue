<template>
  <div class="dorm-panel card">
    <div class="panel-header">
      <h3>🏠 宿舍管理</h3>
      <div class="header-actions">
        <div class="add-room-select">
          <select v-model="newRoomQuality" class="quality-select">
            <option value="basic">标准间</option>
            <option value="premium">豪华间</option>
            <option value="vip">VIP间</option>
          </select>
          <button class="btn sm primary" @click="onAddRoom">
            + 新建房间
          </button>
        </div>
      </div>
    </div>
    <p class="hint">分配房间、升级设施，同住关系将影响次日训练效果</p>

    <div class="room-list">
      <div
        v-for="room in dormitory"
        :key="room.id"
        class="room-card"
        :class="[`quality-${room.quality}`, { selected: selectedRoom === room.id }]"
        @click="selectedRoom = selectedRoom === room.id ? null : room.id"
      >
        <div class="room-header">
          <div class="room-title">
            <span class="room-name">{{ room.name }}</span>
            <span class="quality-tag">{{ qualityLabel(room.quality) }}</span>
          </div>
          <div class="room-actions" @click.stop>
            <select
              v-if="canUpgrade(room.quality)"
              v-model="upgradeMap[room.id]"
              class="upgrade-select"
              @change="onUpgrade(room.id)"
            >
              <option value="" disabled>升级</option>
              <option v-for="q in nextQualities(room.quality)" :key="q" :value="q">
                → {{ qualityLabel(q) }} ¥{{ upgradeCost(room.quality, q) }}
              </option>
            </select>
          </div>
        </div>

        <div class="quality-stats">
          <span title="疲劳恢复">😴 {{ qualityStats(room.quality).fatigue }}</span>
          <span title="压力恢复">💆 {{ qualityStats(room.quality).stress }}</span>
          <span title="关系加成">🤝 +{{ qualityStats(room.quality).bonus }}</span>
        </div>

        <div class="occupants">
          <div
            v-for="slot in maxPerRoom"
            :key="slot"
            class="occupant-slot"
            :class="{ empty: !room.occupantIds[slot], occupied: room.occupantIds[slot] }"
          >
            <div v-if="room.occupantIds[slot]" class="occupant">
              <span class="occ-name">{{ getTraineeName(room.occupantIds[slot]) }}</span>
              <button
                class="occ-remove"
                @click.stop="$emit('assign-room', room.occupantIds[slot], '')"
                title="移出房间"
              >
                ×
              </button>
            </div>
            <div v-else class="empty-slot">
              <span class="empty-text">空床位</span>
            </div>
          </div>
        </div>

        <div v-if="selectedRoom === room.id" class="assign-section" @click.stop>
          <div class="assign-label">分配入住：</div>
          <div class="unassigned-list">
            <button
              v-for="t in unassignedTrainees"
              :key="t.id"
              class="btn sm assign-btn"
              :disabled="room.occupantIds.length >= maxPerRoom"
              @click="onAssignRoom(t.id, room.id)"
            >
              + {{ t.name }}
            </button>
            <span v-if="unassignedTrainees.length === 0" class="no-unassigned">
              所有练习生已分配
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="dorm-synergy-tip">
      <h4>💡 次日日程联动效果</h4>
      <ul>
        <li><span class="tip-good">精力充沛</span>（疲劳≤25）：训练效果 +12%</li>
        <li><span class="tip-bad">疲惫不堪</span>（疲劳≥70）：训练效果 -18%</li>
        <li><span class="tip-good">舍友默契</span>（关系≥55）：训练效果 +8%</li>
        <li>房间等级越高，疲劳/压力恢复越强</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  dormitory: Array,
  trainees: Array,
  money: Number,
})

const emit = defineEmits(['assign-room', 'upgrade-room', 'add-room'])

const DORM_CFG = GAME_CONFIG.dormitory
const maxPerRoom = DORM_CFG.maxPerRoom

const selectedRoom = ref(null)
const newRoomQuality = ref('basic')
const upgradeMap = reactive({})

function qualityLabel(q) {
  return DORM_CFG.qualityLevels[q]?.label || q
}

function qualityStats(q) {
  const level = DORM_CFG.qualityLevels[q]
  if (!level) return { fatigue: '0~0', stress: '0~0', bonus: 0 }
  return {
    fatigue: `${level.fatigueRecovery[0]}~${level.fatigueRecovery[1]}`,
    stress: `${level.stressRecovery[0]}~${level.stressRecovery[1]}`,
    bonus: level.relationshipBonus,
  }
}

function getTraineeName(id) {
  const t = props.trainees?.find((x) => x.id === id)
  return t?.name || '未知'
}

function canUpgrade(q) {
  const levels = Object.keys(DORM_CFG.qualityLevels)
  return levels.indexOf(q) < levels.length - 1
}

function nextQualities(q) {
  const levels = Object.keys(DORM_CFG.qualityLevels)
  const idx = levels.indexOf(q)
  return levels.slice(idx + 1)
}

function upgradeCost(from, to) {
  const levels = Object.keys(DORM_CFG.qualityLevels)
  const diff = levels.indexOf(to) - levels.indexOf(from)
  return DORM_CFG.roomCost * diff
}

const unassignedTrainees = computed(() => {
  if (!props.trainees || !props.dormitory) return []
  const assigned = new Set()
  for (const r of props.dormitory) {
    for (const id of r.occupantIds) assigned.add(id)
  }
  return props.trainees.filter(
    (t) => t.status !== 'left' && !assigned.has(t.id)
  )
})

function onAssignRoom(traineeId, roomId) {
  emit('assign-room', traineeId, roomId)
}

function onUpgrade(roomId) {
  const quality = upgradeMap[roomId]
  if (!quality) return
  emit('upgrade-room', roomId, quality)
  upgradeMap[roomId] = ''
}

function onAddRoom() {
  emit('add-room', newRoomQuality.value)
}
</script>

<style scoped>
.dorm-panel h3 { margin-bottom: 0.25rem; }

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.add-room-select {
  display: flex;
  gap: 0.35rem;
}

.quality-select,
.upgrade-select {
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
}

.hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.room-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.room-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.85rem;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.room-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.room-card.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.room-card.quality-premium {
  background: linear-gradient(135deg, var(--bg-secondary), rgba(192, 132, 252, 0.1));
}

.room-card.quality-vip {
  background: linear-gradient(135deg, var(--bg-secondary), rgba(251, 191, 36, 0.15));
  border-color: var(--warning);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
}

.room-title {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.room-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.quality-tag {
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-secondary);
  width: fit-content;
}

.quality-vip .quality-tag {
  background: var(--warning);
  color: #000;
}

.room-actions {
  flex-shrink: 0;
}

.quality-stats {
  display: flex;
  gap: 0.6rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}

.occupants {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.occupant-slot {
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px dashed var(--border);
}

.occupant-slot.occupied {
  border-style: solid;
  background: var(--bg-card);
}

.occupant {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.occ-name {
  font-size: 0.85rem;
  font-weight: 500;
}

.occ-remove {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--danger-soft);
  color: var(--danger);
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.occ-remove:hover {
  background: var(--danger);
  color: #fff;
}

.empty-slot {
  text-align: center;
}

.empty-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
}

.assign-section {
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border);
}

.assign-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.4rem;
}

.unassigned-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.assign-btn {
  font-size: 0.75rem;
}

.no-unassigned {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
}

.dorm-synergy-tip {
  background: var(--accent-soft);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.dorm-synergy-tip h4 {
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
  color: var(--accent);
}

.dorm-synergy-tip ul {
  list-style: none;
  font-size: 0.78rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.tip-good { color: var(--success); font-weight: 600; }
.tip-bad { color: var(--danger); font-weight: 600; }
</style>
