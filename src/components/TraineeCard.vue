<template>
  <div class="trainee-card card" :class="statusClass">
    <div class="card-top">
      <h4>{{ trainee.name }}</h4>
      <span class="badge" :class="trainee.status">{{ statusLabel }}</span>
    </div>

    <div v-if="dormRoom" class="dorm-info">
      <span class="dorm-icon">🏠</span>
      <span class="dorm-room">{{ dormRoom.name }}</span>
      <span class="dorm-quality">({{ qualityLabel }})</span>
    </div>

    <div class="bars">
      <div class="bar-row">
        <span>疲劳</span>
        <div class="bar"><div class="fill fatigue" :style="{ width: trainee.fatigue + '%' }"></div></div>
        <span>{{ trainee.fatigue }}</span>
      </div>
      <div class="bar-row">
        <span>压力</span>
        <div class="bar"><div class="fill stress" :style="{ width: trainee.stress + '%' }"></div></div>
        <span>{{ trainee.stress }}</span>
      </div>
    </div>

    <div v-if="dormEffect" class="dorm-effect-tags">
      <span
        v-if="dormEffect.restBonus === 'wellRested'"
        class="effect-tag good"
        title="精力充沛，今日训练效果+12%"
      >
        ✨ 精力充沛 +12%
      </span>
      <span
        v-else-if="dormEffect.restBonus === 'exhausted'"
        class="effect-tag bad"
        title="疲惫不堪，今日训练效果-18%"
      >
        😵 疲惫不堪 -18%
      </span>
      <span
        v-if="dormEffect.harmoniousBonus"
        class="effect-tag good"
        title="舍友默契，训练效果+8%"
      >
        🤝 舍友默契 +8%
      </span>
    </div>

    <div class="stats-grid">
      <div v-for="key in statKeys" :key="key" class="stat-cell">
        <span class="stat-label">{{ statLabels[key] }}</span>
        <span class="stat-val">{{ trainee.stats[key] }}</span>
      </div>
    </div>

    <div v-if="score !== null" class="score">
      综合评分 <strong>{{ score }}</strong>
      <span v-if="trainee.status === 'trainee'" class="debut-hint">
        {{ score >= debutThreshold ? '✓ 可出道' : `需 ${debutThreshold}` }}
      </span>
    </div>

    <div v-if="trainee.illnessDays > 0" class="illness">🤒 休养中 ({{ trainee.illnessDays }}天)</div>
    <div v-if="trainee.fans > 0" class="fans">个人粉丝 {{ trainee.fans.toLocaleString() }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  trainee: Object,
  score: { type: Number, default: null },
  dormRoom: { type: Object, default: null },
  dormEffects: { type: Object, default: null },
})

const statKeys = GAME_CONFIG.stats
const statLabels = GAME_CONFIG.statLabels
const debutThreshold = GAME_CONFIG.rating.debutScoreThreshold

const qualityLabel = computed(() => {
  if (!props.dormRoom) return ''
  return GAME_CONFIG.dormitory.qualityLevels[props.dormRoom.quality]?.label || ''
})

const dormEffect = computed(() => {
  if (!props.dormEffects || !props.trainee) return null
  return props.dormEffects[props.trainee.id]
})

const statusLabel = computed(() => {
  const map = { trainee: '练习生', debuted: '已出道', left: '已离开' }
  return map[props.trainee.status] || props.trainee.status
})

const statusClass = computed(() => ({
  debuted: props.trainee.status === 'debuted',
  left: props.trainee.status === 'left',
  ill: props.trainee.illnessDays > 0,
}))
</script>

<style scoped>
.trainee-card {
  padding: 1rem;
  transition: border-color 0.2s;
}

.trainee-card.debuted { border-color: var(--accent); }
.trainee-card.left { opacity: 0.5; }
.trainee-card.ill { border-color: var(--warning); }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.card-top h4 { font-size: 1rem; }

.badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--bg-secondary);
}

.badge.debuted { background: var(--accent-soft); color: var(--accent); }
.badge.left { background: var(--danger-soft); color: var(--danger); }

.dorm-info {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--accent-soft);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dorm-icon { font-size: 0.85rem; }
.dorm-room { font-weight: 600; color: var(--accent); }
.dorm-quality { color: var(--text-muted); }

.bars { margin-bottom: 0.5rem; }

.bar-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.bar-row span:first-child { width: 28px; color: var(--text-muted); }
.bar-row span:last-child { width: 24px; text-align: right; }

.bar {
  flex: 1;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.fill.fatigue { background: var(--warning); }
.fill.stress { background: var(--danger); }

.dorm-effect-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
}

.effect-tag {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}

.effect-tag.good {
  background: var(--success-soft);
  color: var(--success);
}

.effect-tag.bad {
  background: var(--danger-soft);
  color: var(--danger);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.25rem;
  text-align: center;
}

.stat-cell {
  background: var(--bg-secondary);
  border-radius: 6px;
  padding: 0.3rem 0.1rem;
}

.stat-label { display: block; font-size: 0.65rem; color: var(--text-muted); }
.stat-val { font-weight: 700; font-size: 0.85rem; }

.score {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.debut-hint {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: var(--accent);
}

.illness, .fans {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--warning);
}
</style>
