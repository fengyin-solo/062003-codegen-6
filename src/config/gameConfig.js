/**
 * 偶像养成事务所 — 全部数值规则集中配置
 * 调整平衡性时只需修改此文件
 */
export const GAME_CONFIG = {
  // ── 胜利 / 失败条件 ──
  victory: {
    targetGroups: 3,        // 需培养出道组合数
    totalDays: 1095,        // 3 年（天）
    requirePositiveProfit: true,
  },

  // ── 初始资源 ──
  initial: {
    money: 80000,
    fans: 200,
    traineeCount: 5,
    statMin: 18,
    statMax: 42,
    fatigue: 10,
    stress: 8,
  },

  // ── 五维属性键名 ──
  stats: ['vocal', 'dance', 'rap', 'looks', 'charm'],
  statLabels: {
    vocal: '唱功',
    dance: '舞蹈',
    rap: '说唱',
    looks: '颜值',
    charm: '魅力',
  },

  // ── 日程活动 ──
  activities: {
    vocal: {
      label: '声乐课',
      icon: '🎤',
      statGain: { vocal: [4, 7] },
      fatigue: [10, 14],
      stress: [2, 4],
      moneyCost: 400,
      requiresTraining: true,
    },
    dance: {
      label: '舞蹈课',
      icon: '💃',
      statGain: { dance: [4, 7] },
      fatigue: [12, 16],
      stress: [2, 4],
      moneyCost: 400,
      requiresTraining: true,
    },
    rap: {
      label: '说唱课',
      icon: '🎧',
      statGain: { rap: [4, 7] },
      fatigue: [10, 14],
      stress: [3, 5],
      moneyCost: 400,
      requiresTraining: true,
    },
    physical: {
      label: '体能训练',
      icon: '🏋️',
      statGain: { dance: [1, 3], looks: [0, 1] },
      fatigue: [6, 10],
      stress: [-2, 0],
      moneyCost: 250,
      requiresTraining: true,
    },
    rest: {
      label: '休息',
      icon: '😴',
      statGain: {},
      fatigue: [-28, -18],
      stress: [-10, -5],
      moneyCost: 0,
      requiresTraining: false,
    },
    pr: {
      label: '公关活动',
      icon: '📸',
      statGain: { charm: [2, 4], looks: [1, 3] },
      fatigue: [5, 8],
      stress: [6, 14],
      fansGain: [80, 250],
      moneyCost: 1200,
      requiresTraining: false,
    },
  },

  // ── 疲劳 / 压力阈值 ──
  thresholds: {
    fatigueExhausted: 75,   // 训练效果减半
    fatigueCollapse: 92,    // 强制休息
    stressHigh: 65,         // 训练效果 -20%
    stressBreakdown: 88,    // 当天无法训练
    statCap: 100,
  },

  // ── 每日运营成本 ──
  dailyCosts: {
    baseOperatingCost: 600,
    perTraineeCost: 250,
    perDebutedCost: 800,
    perGroupCost: 500,
  },

  // ── 周末内部评级 ──
  rating: {
    interval: 7,
    debutScoreThreshold: 58,  // 综合评分达标可出道
    minGroupSize: 2,
    maxGroupSize: 5,
    scoreWeights: {
      vocal: 0.22,
      dance: 0.22,
      rap: 0.16,
      looks: 0.2,
      charm: 0.2,
    },
  },

  // ── 单曲发行 ──
  single: {
    creationCost: 15000,
    baseSales: 800,
    statWeight: 0.45,
    fansWeight: 0.35,
    charmWeight: 0.2,
    revenuePerSale: 6,
    cooldownDays: 30,
  },

  // ── 练习生关系 ──
  relationships: {
    min: -100,
    max: 100,
    synergyThreshold: 55,       // 默契线
    competitionThreshold: -35,    // 竞争线
    synergyBonus: 0.25,           // 默契训练加成
    competitionStress: [12, 22],
    dailyDrift: [-3, 3],
    trainingTogether: [4, 9],
    statGapCompetition: 18,
    initialRange: [-15, 25],
  },

  // ── 随机事件 ──
  events: {
    dailyChance: 0.18,
    types: {
      negative_news: {
        label: '负面新闻',
        weight: 22,
        fansLoss: [150, 600],
        stressGain: [8, 18],
        description: '媒体曝出练习生训练期间发生冲突，粉丝舆论下滑。',
      },
      poaching: {
        label: '挖角危机',
        weight: 14,
        successChance: 0.28,
        description: '竞争对手试图挖走你旗下最有潜力的练习生！',
      },
      illness: {
        label: '生病',
        weight: 20,
        duration: [2, 4],
        statDecay: [1, 3],
        stressGain: [5, 10],
        description: '一名练习生身体不适，需要休养。',
      },
      inspiration: {
        label: '灵感爆发',
        weight: 22,
        statBoost: [6, 14],
        description: '一名练习生突然迸发出创作灵感，能力大幅提升！',
      },
      fan_surge: {
        label: '粉丝暴涨',
        weight: 22,
        fansGain: [300, 900],
        description: '一段练习室花絮意外走红，粉丝数激增！',
      },
    },
  },

  // ── 练习生名字池 ──
  names: [
    '林星遥', '苏晚晴', '陈予安', '顾念初', '沈知夏',
    '江月白', '陆清欢', '唐小满', '许未央', '韩鹿鸣',
    '方念慈', '宋时雨', '叶知秋', '周慕青', '赵星河',
  ],

  // ── 存档 ──
  storage: {
    savesKey: 'idol-agency-saves-v1',
    themeKey: 'idol-agency-theme',
    maxSlots: 5,
  },

  // ── 宿舍管理 ──
  dormitory: {
    baseRooms: 4,
    maxPerRoom: 2,
    roomCost: 1500,
    qualityLevels: {
      basic: { label: '标准间', fatigueRecovery: [0, 2], stressRecovery: [0, 1], relationshipBonus: 0 },
      premium: { label: '豪华间', fatigueRecovery: [2, 5], stressRecovery: [1, 3], relationshipBonus: 2 },
      vip: { label: 'VIP间', fatigueRecovery: [5, 9], stressRecovery: [3, 6], relationshipBonus: 4 },
    },
    // 同住事件
    roommateEvents: {
      dailyChance: 0.25,
      types: {
        late_night_chat: {
          label: '深夜谈心',
          weight: 25,
          relGain: [5, 10],
          fatigueCost: [3, 6],
          stressGain: [-4, -1],
          description: '两人彻夜长谈，感情升温。',
        },
        mutual_encouragement: {
          label: '互相鼓励',
          weight: 22,
          relGain: [3, 7],
          stressGain: [-5, -2],
          fatigueCost: [0, 2],
          description: '室友在训练受挫时给予鼓励。',
        },
        practice_together: {
          label: '睡前加练',
          weight: 18,
          relGain: [4, 8],
          fatigueCost: [5, 10],
          statBoostRange: [1, 3],
          description: '两人在宿舍里偷偷加练。',
        },
        gossip_session: {
          label: '八卦时间',
          weight: 15,
          relGain: [2, 5],
          stressGain: [-3, 0],
          fatigueCost: [2, 4],
          description: '两人分享圈内八卦，心情愉悦。',
        },
        conflict_noise: {
          label: '作息冲突',
          weight: 12,
          relGain: [-8, -3],
          fatigueCost: [5, 10],
          stressGain: [3, 7],
          description: '室友作息不合，产生摩擦。',
        },
        stolen_snacks: {
          label: '零食风波',
          weight: 8,
          relGain: [-5, -1],
          stressGain: [2, 5],
          fatigueCost: [1, 3],
          description: '偷吃了室友的零食，关系恶化。',
        },
      },
    },
    // 恢复效果与次日日程联动
    scheduleSynergy: {
      wellRestedBonus: 0.12,
      exhaustedPenalty: 0.18,
      harmoniousRoommateBonus: 0.08,
    },
  },
}
