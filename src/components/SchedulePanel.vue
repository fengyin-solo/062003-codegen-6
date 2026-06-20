<template>
  <div class="schedule-panel card">
    <h3>📅 今日日程安排</h3>
    <p class="hint">为每位练习生选择活动，同活动一起训练可提升默契</p>

    <div class="schedule-list">
      <div
        v-for="trainee in schedulable"
        :key="trainee.id"
        class="schedule-row"
      >
        <div class="trainee-info">
          <span class="name">{{ trainee.name }}</span>
          <div v-if="getEffect(trainee.id)" class="synergy-tags">
            <span
              v-if="getEffect(trainee.id).restBonus === 'wellRested'"
              class="synergy-tag good"
              title="精力充沛，训练效果+12%"
            >
              ✨+12%
            </span>
            <span
              v-else-if="getEffect(trainee.id).restBonus === 'exhausted'"
              class="synergy-tag bad"
              title="疲惫不堪，训练效果-18%"
            >
              😵-18%
            </span>
            <span
              v-if="getEffect(trainee.id).harmoniousBonus"
              class="synergy-tag good"
              title="舍友默契，训练效果+8%"
            >
              🤝+8%
            </span>
          </div>
        </div>
        <span v-if="trainee.illnessDays > 0" class="ill-tag">休养中</span>
        <div v-else class="activity-btns">
          <button
            v-for="(act, key) in activities"
            :key="key"
            class="act-btn"
            :class="{ active: schedule[trainee.id] === key }"
            :title="`${act.label} ¥${act.moneyCost}`"
            @click="$emit('set', trainee.id, key)"
          >
            {{ act.icon }}
          </button>
        </div>
        <span v-if="schedule[trainee.id]" class="chosen">
          {{ activities[schedule[trainee.id]]?.label }}
        </span>
      </div>
    </div>

    <div class="legend">
      <span v-for="(act, key) in activities" :key="key" class="legend-item">
        {{ act.icon }} {{ act.label }}
      </span>
    </div>

    <div class="actions">
      <button class="btn ghost" @click="$emit('clear')">清空</button>
      <button class="btn primary" :disabled="!canEnd" @click="$emit('end-day')">
        结束今日 →
      </button>
    </div>
    <p v-if="!canEnd" class="warn">请为所有可安排的练习生选择日程</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  trainees: Array,
  schedule: Object,
  canEnd: Boolean,
  dormEffects: { type: Object, default: null },
})

defineEmits(['set', 'clear', 'end-day'])

const activities = GAME_CONFIG.activities

const schedulable = computed(() =>
  props.trainees.filter((t) => t.status !== 'left')
)

function getEffect(id) {
  if (!props.dormEffects) return null
  return props.dormEffects[id]
}
</script>

<style scoped>
.schedule-panel h3 { margin-bottom: 0.25rem; }

.hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.schedule-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.trainee-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 100px;
}

.name {
  font-weight: 600;
  font-size: 0.9rem;
}

.synergy-tags {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.synergy-tag {
  font-size: 0.65rem;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  font-weight: 700;
}

.synergy-tag.good {
  background: var(--success-soft);
  color: var(--success);
}

.synergy-tag.bad {
  background: var(--danger-soft);
  color: var(--danger);
}

.activity-btns {
  display: flex;
  gap: 0.35rem;
}

.act-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
}

.act-btn:hover { border-color: var(--accent); }
.act-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  transform: scale(1.1);
}

.chosen {
  font-size: 0.8rem;
  color: var(--accent);
}

.ill-tag {
  font-size: 0.8rem;
  color: var(--warning);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.warn {
  text-align: right;
  font-size: 0.8rem;
  color: var(--warning);
  margin-top: 0.5rem;
}
</style>
