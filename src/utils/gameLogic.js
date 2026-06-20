import { GAME_CONFIG } from '../config/gameConfig'
import { randInt, randFloat, pickRandom, weightedPick, clamp, pairKey } from './random'

const CFG = GAME_CONFIG

export function createInitialGameState() {
  const names = [...CFG.names].sort(() => Math.random() - 0.5)
  const trainees = []
  for (let i = 0; i < CFG.initial.traineeCount; i++) {
    trainees.push(createTrainee(names[i], i))
  }
  const relationships = initRelationships(trainees)
  const dormitory = initDormitory(trainees)
  const dormEffects = calcDormEffects(trainees, dormitory, relationships)
  return {
    day: 1,
    money: CFG.initial.money,
    fans: CFG.initial.fans,
    totalRevenue: 0,
    totalExpenses: 0,
    trainees,
    groups: [],
    relationships,
    schedule: {},
    logs: [{ day: 1, text: '事务所成立！五位练习生已就位，三年征途正式开始。' }],
    pendingEvent: null,
    pendingRating: false,
    gameStatus: 'playing',
    lastSingleDay: {},
    dormitory,
    dormEffects,
  }
}

function createTrainee(name, index) {
  const stats = {}
  for (const key of CFG.stats) {
    stats[key] = randInt(CFG.initial.statMin, CFG.initial.statMax)
  }
  return {
    id: `t${index}_${Date.now()}`,
    name,
    stats,
    fatigue: CFG.initial.fatigue + randInt(-5, 5),
    stress: CFG.initial.stress + randInt(-3, 3),
    status: 'trainee',
    groupId: null,
    illnessDays: 0,
    poachResist: randInt(40, 70),
    fans: 0,
    singlesReleased: 0,
  }
}

function initRelationships(trainees) {
  const rel = {}
  for (let i = 0; i < trainees.length; i++) {
    for (let j = i + 1; j < trainees.length; j++) {
      rel[pairKey(trainees[i].id, trainees[j].id)] = randInt(
        CFG.relationships.initialRange[0],
        CFG.relationships.initialRange[1]
      )
    }
  }
  return rel
}

export function calcTraineeScore(trainee) {
  const w = CFG.rating.scoreWeights
  let score = 0
  for (const key of CFG.stats) {
    score += trainee.stats[key] * w[key]
  }
  const fatiguePenalty = trainee.fatigue > CFG.thresholds.fatigueExhausted ? 0.85 : 1
  const stressPenalty = trainee.stress > CFG.thresholds.stressHigh ? 0.9 : 1
  return Math.round(score * fatiguePenalty * stressPenalty)
}

export function getRelationship(relationships, idA, idB) {
  return relationships[pairKey(idA, idB)] ?? 0
}

export function setRelationship(relationships, idA, idB, value) {
  relationships[pairKey(idA, idB)] = clamp(
    value,
    CFG.relationships.min,
    CFG.relationships.max
  )
}

export function getActiveTrainees(state) {
  return state.trainees.filter((t) => t.status !== 'left')
}

export function getDebutedTrainees(state) {
  return state.trainees.filter((t) => t.status === 'debuted')
}

export function calcProfit(state) {
  return state.totalRevenue - state.totalExpenses
}

export function checkVictory(state) {
  const profit = calcProfit(state)
  const groups = state.groups.length
  const goalsMet =
    groups >= CFG.victory.targetGroups &&
    (!CFG.victory.requirePositiveProfit || profit > 0)

  if (goalsMet) return 'won'

  if (state.day > CFG.victory.totalDays) {
    if (groups < CFG.victory.targetGroups) return 'lost_groups'
    if (CFG.victory.requirePositiveProfit && profit <= 0) return 'lost_profit'
  }
  if (state.money < -20000) return 'lost_bankrupt'
  const active = getActiveTrainees(state)
  if (active.length === 0 && state.groups.length === 0) return 'lost_empty'
  return null
}

function applyRange(val, range, mult = 1) {
  if (!range || range.length < 2) return val
  return val + randInt(Math.round(range[0] * mult), Math.round(range[1] * mult))
}

function getTrainingMultiplier(trainee, partners, relationships, dormEffects) {
  let mult = 1
  if (trainee.fatigue >= CFG.thresholds.fatigueExhausted) mult *= 0.5
  if (trainee.stress >= CFG.thresholds.stressHigh) mult *= 0.8
  if (trainee.stress >= CFG.thresholds.stressBreakdown) mult *= 0

  let synergyCount = 0
  for (const p of partners) {
    const rel = getRelationship(relationships, trainee.id, p.id)
    if (rel >= CFG.relationships.synergyThreshold) synergyCount++
  }
  if (synergyCount > 0) {
    mult *= 1 + CFG.relationships.synergyBonus * Math.min(synergyCount, 2)
  }

  if (dormEffects && dormEffects[trainee.id]) {
    const eff = dormEffects[trainee.id]
    if (eff.restBonus === 'wellRested') {
      mult *= 1 + DORM_CFG.scheduleSynergy.wellRestedBonus
    } else if (eff.restBonus === 'exhausted') {
      mult *= 1 - DORM_CFG.scheduleSynergy.exhaustedPenalty
    }
    if (eff.harmoniousBonus) {
      mult *= 1 + DORM_CFG.scheduleSynergy.harmoniousRoommateBonus
    }
  }

  return mult
}

export function processDay(state) {
  const logs = []
  let money = state.money
  let fans = state.fans
  let totalExpenses = state.totalExpenses
  const relationships = { ...state.relationships }
  const trainees = state.trainees.map((t) => ({ ...t, stats: { ...t.stats } }))
  const schedule = state.schedule
  const dormEffects = state.dormEffects || {}

  const activityGroups = {}
  for (const [traineeId, activity] of Object.entries(schedule)) {
    if (!activityGroups[activity]) activityGroups[activity] = []
    activityGroups[activity].push(traineeId)
  }

  for (const trainee of trainees) {
    if (trainee.status === 'left') continue

    if (trainee.illnessDays > 0) {
      trainee.illnessDays--
      trainee.fatigue = clamp(trainee.fatigue - 5, 0, 100)
      logs.push({ day: state.day, text: `${trainee.name} 仍在休养中（剩余 ${trainee.illnessDays} 天）。` })
      continue
    }

    if (trainee.fatigue >= CFG.thresholds.fatigueCollapse) {
      trainee.fatigue = applyRange(trainee.fatigue, CFG.activities.rest.fatigue)
      trainee.stress = applyRange(trainee.stress, CFG.activities.rest.stress)
      logs.push({ day: state.day, text: `${trainee.name} 过度疲劳，被迫休息。` })
      continue
    }

    const activityKey = schedule[trainee.id]
    if (!activityKey) {
      logs.push({ day: state.day, text: `${trainee.name} 今日未安排日程。` })
      continue
    }

    const activity = CFG.activities[activityKey]
    if (!activity) continue

    money -= activity.moneyCost
    totalExpenses += activity.moneyCost

    const partners = (activityGroups[activityKey] || [])
      .filter((id) => id !== trainee.id)
      .map((id) => trainees.find((t) => t.id === id))
      .filter(Boolean)

    const mult = getTrainingMultiplier(trainee, partners, relationships, dormEffects)

    if (activity.requiresTraining && trainee.stress >= CFG.thresholds.stressBreakdown) {
      logs.push({ day: state.day, text: `${trainee.name} 压力过大，无法集中精力训练。` })
      trainee.stress = clamp(trainee.stress + randInt(2, 5), 0, 100)
      continue
    }

    for (const [stat, range] of Object.entries(activity.statGain || {})) {
      const gain = randInt(range[0], range[1])
      trainee.stats[stat] = clamp(
        trainee.stats[stat] + Math.round(gain * mult),
        0,
        CFG.thresholds.statCap
      )
    }

    trainee.fatigue = clamp(applyRange(trainee.fatigue, activity.fatigue), 0, 100)
    trainee.stress = clamp(applyRange(trainee.stress, activity.stress), 0, 100)

    if (activity.fansGain) {
      const gained = randInt(activity.fansGain[0], activity.fansGain[1])
      fans += gained
      trainee.fans += Math.round(gained * 0.3)
      logs.push({ day: state.day, text: `${trainee.name} 参与公关，粉丝 +${gained}。` })
    }

    for (const p of partners) {
      const cur = getRelationship(relationships, trainee.id, p.id)
      setRelationship(
        relationships,
        trainee.id,
        p.id,
        cur + randInt(CFG.relationships.trainingTogether[0], CFG.relationships.trainingTogether[1])
      )
    }
  }

  for (let i = 0; i < trainees.length; i++) {
    for (let j = i + 1; j < trainees.length; j++) {
      const a = trainees[i]
      const b = trainees[j]
      if (a.status === 'left' || b.status === 'left') continue

      const key = pairKey(a.id, b.id)
      let rel = relationships[key] ?? 0
      rel += randInt(CFG.relationships.dailyDrift[0], CFG.relationships.dailyDrift[1])
      rel = clamp(rel, CFG.relationships.min, CFG.relationships.max)

      const maxStat = (t) => Math.max(...CFG.stats.map((s) => t.stats[s]))
      const gap = Math.abs(maxStat(a) - maxStat(b))
      if (gap >= CFG.relationships.statGapCompetition) {
        rel -= randInt(2, 6)
        const weaker = maxStat(a) < maxStat(b) ? a : b
        weaker.stress = clamp(
          weaker.stress + randInt(CFG.relationships.competitionStress[0], CFG.relationships.competitionStress[1]),
          0,
          100
        )
        if (rel <= CFG.relationships.competitionThreshold) {
          logs.push({
            day: state.day,
            text: `${weaker.name} 感受到来自 ${weaker === a ? b.name : a.name} 的竞争压力！`,
          })
        }
      }

      relationships[key] = rel
    }
  }

  const dailyCost =
    CFG.dailyCosts.baseOperatingCost +
    trainees.filter((t) => t.status === 'trainee').length * CFG.dailyCosts.perTraineeCost +
    trainees.filter((t) => t.status === 'debuted').length * CFG.dailyCosts.perDebutedCost +
    state.groups.length * CFG.dailyCosts.perGroupCost

  money -= dailyCost
  totalExpenses += dailyCost

  const dormitory = state.dormitory ? state.dormitory.map((r) => ({ ...r, occupantIds: [...r.occupantIds] })) : []

  for (const room of dormitory) {
    const evt = generateRoommateEvent(room, trainees, relationships, state.day)
    if (evt) {
      applyRoommateEvent(evt, trainees, relationships, logs, state.day)
    }
  }

  const newDormEffects = applyDormitoryRecovery(trainees, dormitory, relationships, logs, state.day)

  const newDay = state.day + 1
  const pendingRating = state.day % CFG.rating.interval === 0

  let pendingEvent = null
  if (Math.random() < CFG.events.dailyChance) {
    pendingEvent = generateRandomEvent(trainees, state.day)
    if (pendingEvent.type === 'fan_surge') {
      fans += pendingEvent.fansGain
      logs.push({ day: state.day, text: `【${pendingEvent.label}】粉丝 +${pendingEvent.fansGain}！` })
      pendingEvent = null
    } else if (pendingEvent.type === 'inspiration') {
      const target = pendingEvent.target
      const stat = pickRandom(CFG.stats)
      target.stats[stat] = clamp(target.stats[stat] + pendingEvent.statBoost, 0, CFG.thresholds.statCap)
      logs.push({
        day: state.day,
        text: `【${pendingEvent.label}】${target.name} 的${CFG.statLabels[stat]} +${pendingEvent.statBoost}！`,
      })
      pendingEvent = null
    } else if (pendingEvent.type === 'negative_news') {
      fans = Math.max(0, fans - pendingEvent.fansLoss)
      for (const t of trainees) {
        if (t.status !== 'left') {
          t.stress = clamp(t.stress + pendingEvent.stressGain, 0, 100)
        }
      }
      logs.push({
        day: state.day,
        text: `【${pendingEvent.label}】粉丝 -${pendingEvent.fansLoss}，全员压力上升。`,
      })
      pendingEvent = null
    } else if (pendingEvent.type === 'illness') {
      pendingEvent.target.illnessDays = pendingEvent.duration
      pendingEvent.target.stress = clamp(
        pendingEvent.target.stress + pendingEvent.stressGain,
        0,
        100
      )
      logs.push({
        day: state.day,
        text: `【${pendingEvent.label}】${pendingEvent.target.name} 需要休养 ${pendingEvent.duration} 天。`,
      })
      pendingEvent = null
    }
  }

  const nextState = {
    ...state,
    day: newDay,
    money,
    fans,
    totalExpenses,
    trainees,
    relationships,
    schedule: {},
    logs: [...state.logs, ...logs],
    pendingEvent,
    pendingRating,
    dormitory,
    dormEffects: newDormEffects,
  }

  const result = checkVictory(nextState)
  if (result) nextState.gameStatus = result

  return nextState
}

function generateRandomEvent(trainees, day) {
  const active = trainees.filter((t) => t.status !== 'left' && t.illnessDays === 0)
  if (active.length === 0) return null

  const types = Object.entries(CFG.events.types).map(([key, val]) => ({
    key,
    ...val,
  }))
  const picked = weightedPick(types)
  const target = pickRandom(active)

  const event = {
    type: picked.key,
    label: picked.label,
    description: picked.description,
    day,
    target,
    resolved: false,
  }

  switch (picked.key) {
    case 'poaching':
      event.successChance = picked.successChance
      break
    case 'illness':
      event.duration = randInt(picked.duration[0], picked.duration[1])
      event.stressGain = randInt(picked.stressGain[0], picked.stressGain[1])
      break
    case 'inspiration':
      event.statBoost = randInt(picked.statBoost[0], picked.statBoost[1])
      break
    case 'negative_news':
      event.fansLoss = randInt(picked.fansLoss[0], picked.fansLoss[1])
      event.stressGain = randInt(picked.stressGain[0], picked.stressGain[1])
      break
    case 'fan_surge':
      event.fansGain = randInt(picked.fansGain[0], picked.fansGain[1])
      break
  }

  return event
}

export function resolvePoachingEvent(state, keepTrainee) {
  const event = state.pendingEvent
  if (!event || event.type !== 'poaching') return state

  const logs = [...state.logs]
  const trainees = state.trainees.map((t) => ({ ...t, stats: { ...t.stats } }))
  const target = trainees.find((t) => t.id === event.target.id)

  if (keepTrainee) {
    const cost = randInt(8000, 15000)
    logs.push({
      day: state.day,
      text: `【挖角危机】你花费 ¥${cost} 成功挽留 ${target.name}！`,
    })
    target.stress = clamp(target.stress + randInt(5, 12), 0, 100)
    return {
      ...state,
      money: state.money - cost,
      totalExpenses: state.totalExpenses + cost,
      trainees,
      logs,
      pendingEvent: null,
    }
  }

  const roll = Math.random()
  const resist = target.poachResist / 100
  if (roll > event.successChance * (1 - resist * 0.5)) {
    logs.push({ day: state.day, text: `【挖角危机】${target.name} 决定留在事务所。` })
    return { ...state, trainees, logs, pendingEvent: null }
  }

  target.status = 'left'
  logs.push({ day: state.day, text: `【挖角危机】${target.name} 被竞争对手挖走，离开了事务所！` })
  const result = checkVictory({ ...state, trainees })
  return {
    ...state,
    trainees,
    logs,
    pendingEvent: null,
    gameStatus: result || state.gameStatus,
  }
}

export function debutGroup(state, memberIds, groupName) {
  const members = state.trainees.filter((t) => memberIds.includes(t.id))
  if (members.length < CFG.rating.minGroupSize || members.length > CFG.rating.maxGroupSize) {
    return { success: false, message: `出道人数需在 ${CFG.rating.minGroupSize}-${CFG.rating.maxGroupSize} 人之间` }
  }

  for (const m of members) {
    if (m.status !== 'trainee') return { success: false, message: `${m.name} 无法出道` }
    if (calcTraineeScore(m) < CFG.rating.debutScoreThreshold) {
      return { success: false, message: `${m.name} 综合评分未达标（需 ≥${CFG.rating.debutScoreThreshold}）` }
    }
  }

  const groupId = `g_${Date.now()}`
  const trainees = state.trainees.map((t) => {
    if (memberIds.includes(t.id)) {
      return { ...t, status: 'debuted', groupId }
    }
    return t
  })

  const avgStats = {}
  for (const key of CFG.stats) {
    avgStats[key] = Math.round(members.reduce((s, m) => s + m.stats[key], 0) / members.length)
  }

  const groups = [
    ...state.groups,
    {
      id: groupId,
      name: groupName || `${members.map((m) => m.name[0]).join('')}组`,
      memberIds: [...memberIds],
      debutedDay: state.day,
      avgStats,
      totalSales: 0,
      singles: [],
    },
  ]

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `🎉 组合「${groupName || groups[groups.length - 1].name}」正式出道！成员：${members.map((m) => m.name).join('、')}`,
    },
  ]

  return {
    success: true,
    state: { ...state, trainees, groups, logs, pendingRating: false },
  }
}

export function releaseSingle(state, groupId) {
  const group = state.groups.find((g) => g.id === groupId)
  if (!group) return { success: false, message: '组合不存在' }

  const lastDay = state.lastSingleDay[groupId] || 0
  if (state.day - lastDay < CFG.single.cooldownDays) {
    return {
      success: false,
      message: `距上次发歌还需 ${CFG.single.cooldownDays - (state.day - lastDay)} 天`,
    }
  }

  if (state.money < CFG.single.creationCost) {
    return { success: false, message: '资金不足' }
  }

  const members = state.trainees.filter((t) => group.memberIds.includes(t.id))
  const statAvg =
    CFG.stats.reduce((s, k) => s + group.avgStats[k], 0) / CFG.stats.length
  const charmAvg = group.avgStats.charm
  const popularity = state.fans + members.reduce((s, m) => s + m.fans, 0)

  const sales = Math.round(
    CFG.single.baseSales +
      statAvg * CFG.single.statWeight * 50 +
      popularity * CFG.single.fansWeight * 0.08 +
      charmAvg * CFG.single.charmWeight * 30 +
      randInt(-200, 400)
  )

  const revenue = sales * CFG.single.revenuePerSale
  const groups = state.groups.map((g) => {
    if (g.id !== groupId) return g
    return {
      ...g,
      totalSales: g.totalSales + sales,
      singles: [
        ...g.singles,
        { day: state.day, sales, revenue, title: `单曲 Vol.${g.singles.length + 1}` },
      ],
    }
  })

  const trainees = state.trainees.map((t) => {
    if (!group.memberIds.includes(t.id)) return t
    return { ...t, singlesReleased: t.singlesReleased + 1, fans: t.fans + Math.round(sales * 0.05) }
  })

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `💿 ${group.name} 发行新单曲，销量 ${sales.toLocaleString()}，收入 ¥${revenue.toLocaleString()}！`,
    },
  ]

  return {
    success: true,
    state: {
      ...state,
      money: state.money - CFG.single.creationCost + revenue,
      totalRevenue: state.totalRevenue + revenue,
      totalExpenses: state.totalExpenses + CFG.single.creationCost,
      fans: state.fans + Math.round(sales * 0.02),
      groups,
      trainees,
      logs,
      lastSingleDay: { ...state.lastSingleDay, [groupId]: state.day },
    },
    sales,
    revenue,
  }
}

export function getRatingResults(state) {
  return getActiveTrainees(state)
    .filter((t) => t.status === 'trainee')
    .map((t) => ({
      ...t,
      score: calcTraineeScore(t),
      canDebut: calcTraineeScore(t) >= CFG.rating.debutScoreThreshold,
    }))
    .sort((a, b) => b.score - a.score)
}

const DORM_CFG = GAME_CONFIG.dormitory

export function initDormitory(trainees) {
  const rooms = []
  for (let i = 0; i < DORM_CFG.baseRooms; i++) {
    rooms.push({
      id: `room_${i}`,
      name: `${i + 1}号房`,
      quality: 'basic',
      occupantIds: [],
    })
  }
  const active = trainees.filter((t) => t.status !== 'left')
  for (let i = 0; i < active.length; i++) {
    const roomIdx = Math.floor(i / DORM_CFG.maxPerRoom)
    if (rooms[roomIdx]) {
      rooms[roomIdx].occupantIds.push(active[i].id)
    }
  }
  return rooms
}

export function getRoommates(dormitory, traineeId) {
  const room = dormitory.find((r) => r.occupantIds.includes(traineeId))
  if (!room) return []
  return room.occupantIds.filter((id) => id !== traineeId)
}

export function getTraineeRoom(dormitory, traineeId) {
  return dormitory.find((r) => r.occupantIds.includes(traineeId)) || null
}

export function assignRoom(state, traineeId, roomId) {
  const dormitory = state.dormitory.map((r) => ({ ...r, occupantIds: [...r.occupantIds] }))
  const logs = [...state.logs]
  const trainees = state.trainees.map((t) => ({ ...t, stats: { ...t.stats } }))

  const targetRoom = dormitory.find((r) => r.id === roomId)
  if (!targetRoom) {
    return { success: false, message: '房间不存在', state }
  }

  const currentRoom = dormitory.find((r) => r.occupantIds.includes(traineeId))
  const trainee = trainees.find((t) => t.id === traineeId)

  if (currentRoom && currentRoom.id === roomId) {
    return { success: false, message: `${trainee.name} 已在此房间`, state }
  }

  if (targetRoom.occupantIds.length >= DORM_CFG.maxPerRoom) {
    return { success: false, message: '房间已满', state }
  }

  if (currentRoom) {
    currentRoom.occupantIds = currentRoom.occupantIds.filter((id) => id !== traineeId)
  }
  targetRoom.occupantIds.push(traineeId)

  const roommateIds = targetRoom.occupantIds.filter((id) => id !== traineeId)
  const roommates = roommateIds.map((id) => trainees.find((t) => t.id === id)).filter(Boolean)

  if (roommates.length > 0) {
    logs.push({
      day: state.day,
      text: `🏠 ${trainee.name} 搬入${targetRoom.name}，与 ${roommates.map((r) => r.name).join('、')} 成为室友。`,
    })
  } else {
    logs.push({
      day: state.day,
      text: `🏠 ${trainee.name} 搬入${targetRoom.name}独居。`,
    })
  }

  return {
    success: true,
    state: { ...state, dormitory, logs, trainees },
  }
}

export function upgradeRoom(state, roomId, newQuality) {
  const qualityLevels = Object.keys(DORM_CFG.qualityLevels)
  if (!qualityLevels.includes(newQuality)) {
    return { success: false, message: '房间等级无效', state }
  }

  const dormitory = state.dormitory.map((r) => ({ ...r }))
  const room = dormitory.find((r) => r.id === roomId)
  if (!room) {
    return { success: false, message: '房间不存在', state }
  }

  const currentIdx = qualityLevels.indexOf(room.quality)
  const targetIdx = qualityLevels.indexOf(newQuality)
  if (targetIdx <= currentIdx) {
    return { success: false, message: '只能升级到更高等级', state }
  }

  const upgradeCost = DORM_CFG.roomCost * (targetIdx - currentIdx)
  if (state.money < upgradeCost) {
    return { success: false, message: `资金不足，需 ¥${upgradeCost}`, state }
  }

  room.quality = newQuality
  const oldLabel = DORM_CFG.qualityLevels[qualityLevels[currentIdx]].label
  const newLabel = DORM_CFG.qualityLevels[newQuality].label

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `🛏️ ${room.name} 从${oldLabel}升级为${newLabel}，花费 ¥${upgradeCost}。`,
    },
  ]

  return {
    success: true,
    state: {
      ...state,
      dormitory,
      logs,
      money: state.money - upgradeCost,
      totalExpenses: state.totalExpenses + upgradeCost,
    },
  }
}

export function addRoom(state, quality = 'basic') {
  const qualityLevels = Object.keys(DORM_CFG.qualityLevels)
  if (!qualityLevels.includes(quality)) {
    return { success: false, message: '房间等级无效', state }
  }

  const cost = DORM_CFG.roomCost * (qualityLevels.indexOf(quality) + 1)
  if (state.money < cost) {
    return { success: false, message: `资金不足，需 ¥${cost}`, state }
  }

  const newRoomId = `room_${Date.now()}`
  const roomNum = state.dormitory.length + 1
  const dormitory = [
    ...state.dormitory,
    {
      id: newRoomId,
      name: `${roomNum}号房`,
      quality,
      occupantIds: [],
    },
  ]

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `🏗️ 新建${DORM_CFG.qualityLevels[quality].label}「${roomNum}号房」，花费 ¥${cost}。`,
    },
  ]

  return {
    success: true,
    state: {
      ...state,
      dormitory,
      logs,
      money: state.money - cost,
      totalExpenses: state.totalExpenses + cost,
    },
  }
}

function generateRoommateEvent(room, trainees, relationships, day) {
  if (room.occupantIds.length < 2) return null

  const quality = DORM_CFG.qualityLevels[room.quality]
  const adjustedChance = DORM_CFG.roommateEvents.dailyChance + quality.relationshipBonus * 0.01

  if (Math.random() > adjustedChance) return null

  const types = Object.entries(DORM_CFG.roommateEvents.types).map(([key, val]) => ({
    key,
    ...val,
  }))
  const picked = weightedPick(types)

  const occupants = room.occupantIds
    .map((id) => trainees.find((t) => t.id === id))
    .filter((t) => t && t.status !== 'left')

  if (occupants.length < 2) return null

  const a = pickRandom(occupants)
  const otherOccupants = occupants.filter((t) => t.id !== a.id)
  if (otherOccupants.length === 0) return null
  const b = pickRandom(otherOccupants)

  const curRel = getRelationship(relationships, a.id, b.id)

  const event = {
    type: picked.key,
    label: picked.label,
    description: picked.description,
    roomName: room.name,
    day,
    participants: [a, b],
    resolved: false,
  }

  if (picked.relGain) {
    event.relGain = randInt(picked.relGain[0], picked.relGain[1]) + quality.relationshipBonus
  }
  if (picked.fatigueCost) {
    event.fatigueCost = randInt(picked.fatigueCost[0], picked.fatigueCost[1])
  }
  if (picked.stressGain) {
    event.stressGain = randInt(picked.stressGain[0], picked.stressGain[1])
  }
  if (picked.statBoostRange) {
    event.statBoostRange = [picked.statBoostRange[0], picked.statBoostRange[1]]
    event.statKey = pickRandom(CFG.stats)
  }

  if (curRel >= CFG.relationships.synergyThreshold) {
    if (event.relGain > 0) {
      event.relGain = Math.round(event.relGain * 1.3)
    } else if (event.relGain < 0) {
      event.relGain = Math.round(event.relGain * 0.5)
    }
  }

  return event
}

function applyRoommateEvent(event, trainees, relationships, logs, day) {
  const relGain = event.relGain || 0
  if (event.participants && event.participants.length === 2) {
    const [a, b] = event.participants
    const traineeA = trainees.find((t) => t.id === a.id)
    const traineeB = trainees.find((t) => t.id === b.id)
    if (traineeA && traineeB) {
      setRelationship(relationships, traineeA.id, traineeB.id, getRelationship(relationships, traineeA.id, traineeB.id) + relGain)

      if (event.fatigueCost) {
        traineeA.fatigue = clamp(traineeA.fatigue + event.fatigueCost, 0, 100)
        traineeB.fatigue = clamp(traineeB.fatigue + event.fatigueCost, 0, 100)
      }
      if (event.stressGain) {
        traineeA.stress = clamp(traineeA.stress + event.stressGain, 0, 100)
        traineeB.stress = clamp(traineeB.stress + event.stressGain, 0, 100)
      }
      if (event.statBoostRange && event.statKey) {
        const boost = randInt(event.statBoostRange[0], event.statBoostRange[1])
        traineeA.stats[event.statKey] = clamp(traineeA.stats[event.statKey] + boost, 0, CFG.thresholds.statCap)
        traineeB.stats[event.statKey] = clamp(traineeB.stats[event.statKey] + boost, 0, CFG.thresholds.statCap)
      }

      const relText = relGain >= 0 ? `关系+${relGain}` : `关系${relGain}`
      const detailParts = [relText]
      if (event.fatigueCost) detailParts.push(`疲劳+${event.fatigueCost}`)
      if (event.stressGain) detailParts.push(event.stressGain >= 0 ? `压力+${event.stressGain}` : `压力${event.stressGain}`)
      if (event.statBoostRange && event.statKey) detailParts.push(`${CFG.statLabels[event.statKey]}提升`)

      logs.push({
        day,
        text: `🏨【${event.label}】${traineeA.name} & ${traineeB.name}（${event.roomName}）：${event.description}（${detailParts.join('，')}）`,
      })
    }
  }
}

function applyDormitoryRecovery(trainees, dormitory, relationships, logs, day) {
  const effects = {}

  for (const trainee of trainees) {
    if (trainee.status === 'left') continue

    const room = getTraineeRoom(dormitory, trainee.id)
    if (!room) continue

    const quality = DORM_CFG.qualityLevels[room.quality]
    const fatigueRecovery = randInt(quality.fatigueRecovery[0], quality.fatigueRecovery[1])
    const stressRecovery = randInt(quality.stressRecovery[0], quality.stressRecovery[1])

    trainee.fatigue = clamp(trainee.fatigue - fatigueRecovery, 0, 100)
    trainee.stress = clamp(trainee.stress - stressRecovery, 0, 100)

    let bonus = 0
    const roommateIds = room.occupantIds.filter((id) => id !== trainee.id)
    for (const rmId of roommateIds) {
      const rel = getRelationship(relationships, trainee.id, rmId) || 0
      if (rel >= CFG.relationships.synergyThreshold) {
        bonus += 1
      }
    }
    if (bonus > 0) {
      const extraRecovery = bonus * randInt(1, 2)
      trainee.stress = clamp(trainee.stress - extraRecovery, 0, 100)
      logs.push({
        day,
        text: `🤝 ${trainee.name} 与室友关系默契，额外恢复压力 ${extraRecovery}。`,
      })
    }

    const restBonus = trainee.fatigue <= 25 ? 'wellRested' : trainee.fatigue >= 70 ? 'exhausted' : 'normal'
    effects[trainee.id] = {
      fatigueRecovery,
      stressRecovery,
      restBonus,
      harmoniousBonus: bonus > 0,
    }
  }

  return effects
}

function calcDormEffects(trainees, dormitory, relationships) {
  const effects = {}

  for (const trainee of trainees) {
    if (trainee.status === 'left') continue

    const room = getTraineeRoom(dormitory, trainee.id)
    if (!room) continue

    let bonus = 0
    const roommateIds = room.occupantIds.filter((id) => id !== trainee.id)
    for (const rmId of roommateIds) {
      const rel = getRelationship(relationships, trainee.id, rmId) || 0
      if (rel >= CFG.relationships.synergyThreshold) {
        bonus += 1
      }
    }

    const restBonus = trainee.fatigue <= 25 ? 'wellRested' : trainee.fatigue >= 70 ? 'exhausted' : 'normal'
    effects[trainee.id] = {
      fatigueRecovery: 0,
      stressRecovery: 0,
      restBonus,
      harmoniousBonus: bonus > 0,
    }
  }

  return effects
}

export function calcScheduleSynergyMultiplier(trainee, dormitory, relationships) {
  let mult = 1
  const synergy = DORM_CFG.scheduleSynergy

  const room = getTraineeRoom(dormitory, trainee.id)
  if (!room) return mult

  const quality = DORM_CFG.qualityLevels[room.quality]
  const baseRecovery = (quality.fatigueRecovery[0] + quality.fatigueRecovery[1]) / 2
  const qualityMult = 1 + baseRecovery * 0.01
  mult *= qualityMult

  const roommateIds = room.occupantIds.filter((id) => id !== trainee.id)
  let harmonious = false
  for (const rmId of roommateIds) {
    const rel = getRelationship(relationships, trainee.id, rmId) || 0
    if (rel >= CFG.relationships.synergyThreshold) {
      harmonious = true
      break
    }
  }
  if (harmonious) {
    mult *= 1 + synergy.harmoniousRoommateBonus
  }

  return mult
}

function injectDormitoryEffectsIntoProcessDay(state) {
  const { dormitory, dormEffects } = state
  if (!dormitory) return {}

  const effects = {}
  for (const trainee of state.trainees) {
    if (trainee.status === 'left') continue
    const eff = dormEffects?.[trainee.id]
    if (eff) {
      let mult = 1
      if (eff.restBonus === 'wellRested') {
        mult += DORM_CFG.scheduleSynergy.wellRestedBonus
      } else if (eff.restBonus === 'exhausted') {
        mult -= DORM_CFG.scheduleSynergy.exhaustedPenalty
      }
      if (eff.harmoniousBonus) {
        mult += DORM_CFG.scheduleSynergy.harmoniousRoommateBonus
      }
      effects[trainee.id] = mult
    }
  }
  return effects
}
