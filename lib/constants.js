/* constants.js - 拆分自原始主脚本的常量与省份数据 */
/* =================== 常量（与 C++ 保持一致） =================== */
/* 时间与赛季 */
// 原始赛季长度（用于按比例缩放原始比赛日程）
const ORIGINAL_SEASON_WEEKS = 52;
// 缩短后的赛季长度（扩展到32周以容纳国家集训队比赛）
const SEASON_WEEKS = 32;
/* 能力与知识权重 */
const KNOWLEDGE_WEIGHT = 0.6;
const ABILITY_WEIGHT = 0.4;
// 当思维/代码超过该阈值时，对后续的增幅进行衰减（例如 models.addThinking/addCoding 使用）
const ABILITY_DECAY_THRESHOLD = 400;
/* 压力/恢复 */
const RECOVERY_RATE = 7.0;
const FATIGUE_FROM_PRESSURE = 180.0;
const ALPHA1 = 28.0;
/* 省份基础 */
const STRONG_PROVINCE_BUDGET = 200000;
const NORMAL_PROVINCE_BUDGET = 100000;
const WEAK_PROVINCE_BUDGET = 40000;
const STRONG_PROVINCE_TRAINING_QUALITY = 1.3;
const NORMAL_PROVINCE_TRAINING_QUALITY = 0.8;
const WEAK_PROVINCE_TRAINING_QUALITY = 0.3;
/* 比赛日程 */
const COMPETITION_SCHEDULE = [
  // 调整后的原始周数（用于按 ORIGINAL_SEASON_WEEKS 缩放）
  // 第一轮：3,5,7,11,14  第二轮：17,19,21,25,28
  {week:9, name:"CSP-S1", difficulty:65, maxScore:100, numProblems:1},
  {week:17, name:"CSP-S2", difficulty:145, maxScore:400, numProblems:4},
  {week:25, name:"NOIP", difficulty:205, maxScore:400, numProblems:4},
  {week:40, name:"省选", difficulty:340, maxScore:600, numProblems:6},
  {week:52, name:"NOI", difficulty:460, maxScore:700, numProblems:7},
  // 国家集训队比赛（仅在第二年NOI金牌且接受后才会生效）
  // 这些比赛会在接受国家集训队后动态添加到competitions数组，这里的week仅作参考
  // 实际week计算：NOI结束后 + 2周（CTT-day1-2）、+3周（CTT-day3-4）、+4周（CTS）、CTS后+1周（IOI）
  {week:54, name:"CTT-day1-2", difficulty:520, maxScore:600, numProblems:6, nationalTeam:true},
  {week:55, name:"CTT-day3-4", difficulty:520, maxScore:600, numProblems:6, nationalTeam:true},
  {week:56, name:"CTS", difficulty:590, maxScore:800, numProblems:8, nationalTeam:true},
  {week:57, name:"IOI", difficulty:650, maxScore:600, numProblems:6, nationalTeam:true, subtasksPerProblem:15}
];

// 正式比赛题目难度系数配置（每道题相对于比赛基础难度的系数）
// 用于控制题目难度的递增分布和方差
const COMPETITION_DIFFICULTY_FACTORS = {
  "CSP-S1": [1.0],  // 单题，无需多个系数
  "CSP-S2": [0.5, 1.0, 1.5, 2.0],
  "NOIP": [0.5, 0.8, 1.5, 2.5],
  "省选": [0.7, 0.7, 1.2, 1.5, 1.8, 1.8],
  "NOI": [0.5, 0.8, 1.0, 1.2, 1.3, 1.3, 1.5],
  // 国家集训队比赛难度系数
  "CTT-day1-2": [1.2, 1.2, 1.2, 1.5, 1.5, 1.5],
  "CTT-day3-4": [1.2, 1.2, 1.2, 1.5, 1.5, 1.5],
  "CTS": [1.0, 1.2, 1.2, 1.5, 1.5, 1.7, 1.7, 1.7],
  "IOI": [0.8, 0.8, 1.2, 1.5, 1.8, 2.2]
};

// 明确的比赛链顺序（用于链式晋级判断）
// 国家集训队比赛不在此列表中，因为它们的晋级逻辑是特殊的
const COMPETITION_ORDER = ["CSP-S1","CSP-S2","NOIP","省选","NOI"];

const OTHER_CONTRY_MIN_ABILITY = 130;
// IOI奖牌线（相对总分的百分比）
const IOI_GOLD_THRESHOLD = 0.80;
const IOI_SILVER_THRESHOLD = 0.65;
const IOI_BRONZE_THRESHOLD = 0.20;

/* 晋级线基准 - 修改为基于省份强弱的固定分数线（占总分百分比） */
// 各比赛的基准晋级线（占总分百分比）
const COMPETITION_BASE_CUTOFF = {
  "CSP-S1": {
    "强省": 0.70,      // 强省：70%
    "普通省": 0.60,    // 普通省：60%
    "弱省": 0.50       // 弱省：50%
  },
  "CSP-S2": {
    "强省": 0.65,
    "普通省": 0.55,
    "弱省": 0.45
  },
  "NOIP": {
    "强省": 0.60,
    "普通省": 0.50,
    "弱省": 0.40
  },
  "省选": {
    "强省": 0.70,      
    "普通省": 0.60,
    "弱省": 0.50
  },
  "NOI": {
    "强省": 0.80,      // NOI金牌线，所有省份统一为80%
    "普通省": 0.80,    // 与金牌线保持一致
    "弱省": 0.80
  }
};

// 晋级线浮动范围（上下浮动的百分比）
const CUTOFF_FLUCTUATION = 0.05;  // ±5%的浮动

// 旧常量保留用于兼容性（已废弃）
const WEAK_PROVINCE_BASE_PASS_RATE = 0.4;
const NORMAL_PROVINCE_BASE_PASS_RATE = 0.5;
const STRONG_PROVINCE_BASE_PASS_RATE = 0.65;
const PROVINCIAL_SELECTION_BONUS = 0.2;
/* 学生能力范围 */
const STRONG_PROVINCE_MIN_ABILITY = 50.0;
const STRONG_PROVINCE_MAX_ABILITY = 70.0;
const NORMAL_PROVINCE_MIN_ABILITY = 30.0;
const NORMAL_PROVINCE_MAX_ABILITY = 55.0;
const WEAK_PROVINCE_MIN_ABILITY = 20.0;
const WEAK_PROVINCE_MAX_ABILITY = 45.0;

//初始能力
const KNOWLEDGE_ABLILTY_START = 15;

/* 难度修正 */
const EASY_MODE_BUDGET_MULTIPLIER = 1.5;  // 简单模式：预算增加50%（原1.15）
const HARD_MODE_BUDGET_MULTIPLIER = 0.5;  // 困难模式：预算减少50%（原0.7）
const EASY_MODE_ABILITY_BONUS = 20.0;     // 简单模式：能力加成翻倍（原10.0）
const HARD_MODE_ABILITY_PENALTY = 20.0;   // 困难模式：能力惩罚翻倍（原10.0）
/* 设施常量已迁移至 lib/facilities.js */
/* 天气/舒适 */
const BASE_COMFORT_NORTH = 45.0;
const BASE_COMFORT_SOUTH = 55.0;
const EXTREME_COLD_THRESHOLD = 5;
const EXTREME_HOT_THRESHOLD = 35;
/* WEATHER_PENALTY_NO_AC / WEATHER_PENALTY_WITH_AC 已迁移至 lib/facilities.js */
/* 训练 */
const TRAINING_BASE_KNOWLEDGE_GAIN_PER_INTENSITY = 15;
// 最小训练增益：将略微提高默认增益以便学生的思维/代码成长能够匹配题目难度
const TRAINING_THINKING_GAIN_MIN = 0.55;
const TRAINING_CODING_GAIN_MIN = 0.55;

// 题目难度归一化系数：比赛定义中使用的是较大的绝对难度值（如 65/175/360），
// 将其缩放到 0-100 的能力尺度以便与学生的 thinking/coding 能力直接比较。
// 例如 divisor=4 会把 360 -> 90（接近 0-100 范围）。可按需微调。
// 将除数设为 3.8，使归一化后的题目难度更平滑
// 你可以将其调整为 3.5/4.0/4.5 来微调整体难度。
const DIFFICULTY_NORMALIZE_DIVISOR = 3.8;
// 将比赛级别难度映射到题目思维/代码难度的线性斜率（一次函数的斜率）。
// 设置为 1.0 表示 difficulty 的每个单位将大致等量影响思维/代码难度。
// 将此值调大可放大影响，调小则减弱影响。
const DIFFICULTY_TO_SKILL_SLOPE = 1.6;
// 专门用于调整“思维难度”的额外系数（相对于归一化后的基础难度的百分比）
// 例如 0.15 表示思维难度比基础难度高 15%。可调以改变思维偏难程度。
const THINKING_DIFFICULTY_BONUS = 0.45;
// 默认编码难度额外系数（保持为 0 表示不额外提高编码难度）
const CODING_DIFFICULTY_BONUS = 0.0;
const TRAINING_PRESSURE_MULTIPLIER_LIGHT = 1.0;
const TRAINING_PRESSURE_MULTIPLIER_MEDIUM = 1.5;
const TRAINING_PRESSURE_MULTIPLIER_HEAVY = 2.5;
const COMPOSITE_TRAINING_PRESSURE_BONUS = 1.2;
// 每次训练/外出集训后，学生有机会获得天赋的总体概率门槛（0.0 - 1.0）。
// 若 Math.random() < GET_TALENT_Probability 则该学生有机会获得最多 1 个天赋。
// 默认值为 0.5，可在页面脚本中覆盖该常量以调整概率。
const GET_TALENT_Probability = 0.15;

/* 比赛/模拟赛增幅上限配置 */
// 参考基准：
// - 中等强度训练知识增幅约：15 (TRAINING_BASE_KNOWLEDGE_GAIN_PER_INTENSITY)
// - 基础班外出集训：思维/代码约 12.0 (OUTFIT_ABILITY_BASE_BASIC)
// - 中级班外出集训：思维/代码约 20.0 (OUTFIT_ABILITY_BASE_INTERMEDIATE)

// 比赛/模拟赛总增幅上限（单个学生单场比赛）
const CONTEST_MAX_TOTAL_KNOWLEDGE_GAIN = 12;     // 知识点总增幅上限（低于中等训练的15）
const CONTEST_MAX_TOTAL_THINKING_GAIN = 6.0;    // 思维总增幅上限（低于基础集训的12）
const CONTEST_MAX_TOTAL_CODING_GAIN = 6.0;      // 代码总增幅上限（低于基础集训的12）

// 4/2 3/3

// 不同难度比赛的增幅系数（相对于上限的比例，0.0-1.0）
const CONTEST_GAIN_RATIOS = {
  // 正式比赛
  'CSP-S1': { knowledge: 0.3, thinking: 0.3, coding: 0.3 },      // 入门级
  'CSP-S2': { knowledge: 0.5, thinking: 0.5, coding: 0.5 },      // 普及级
  'NOIP': { knowledge: 0.7, thinking: 0.7, coding: 0.7 },        // NOIP级
  '省选': { knowledge: 0.9, thinking: 0.9, coding: 0.9 },        // 省选级
  'NOI': { knowledge: 1.0, thinking: 1.0, coding: 1.0 },         // NOI级（最高）
  
  // 网赛（基于难度）
  'online_low': { knowledge: 0.4, thinking: 0.4, coding: 0.4 },      // 低难度网赛 (difficulty < 150)
  'online_medium': { knowledge: 0.6, thinking: 0.6, coding: 0.6 },   // 中等难度网赛 (150-300)
  'online_high': { knowledge: 0.85, thinking: 0.85, coding: 0.85 }   // 高难度网赛 (>300)
};

/* 外出集训 */
const OUTFIT_BASE_COST_BASIC = 17000;
const OUTFIT_BASE_COST_INTERMEDIATE = 25000;
const OUTFIT_BASE_COST_ADVANCED = 70000;
const STRONG_PROVINCE_COST_MULTIPLIER = 1.5;
const WEAK_PROVINCE_COST_MULTIPLIER = 0.7;
const OUTFIT_KNOWLEDGE_BASE_BASIC = 8;
const OUTFIT_KNOWLEDGE_BASE_INTERMEDIATE = 15;
const OUTFIT_KNOWLEDGE_BASE_ADVANCED = 25;
const OUTFIT_ABILITY_BASE_BASIC = 12.0;
const OUTFIT_ABILITY_BASE_INTERMEDIATE = 20.0;
const OUTFIT_ABILITY_BASE_ADVANCED = 35.0;
const OUTFIT_PRESSURE_BASIC = 30;
const OUTFIT_PRESSURE_INTERMEDIATE = 50;
const OUTFIT_PRESSURE_ADVANCED = 75;
/* 声誉对外出集训/商业/媒体的影响系数 */
// 声誉越高，外出集训费用越低：最大折扣比例（相对于原价）
const OUTFIT_REPUTATION_DISCOUNT = 0.60; // 最高可减免 60%
// 声誉对外出集训折扣的倍增系数：将最终应用到折扣上以增加或减少声誉影响。
// 例如 2.0 表示当前折扣效果翻倍（更依赖声誉以降低费用）。
const OUTFIT_REPUTATION_DISCOUNT_MULTIPLIER = 2.0;
// 声誉对商业活动收益的加成比例（rep=100 时最大加成为 COMMERCIAL_REP_BONUS）
const COMMERCIAL_REP_BONUS = 0.50; // 最高 +50%
// 声誉对媒体采访收益的加成比例（rep=100 时最大加成为 MEDIA_REP_BONUS）
const MEDIA_REP_BONUS = 0.40; // 最高 +40%
/* 模拟赛 */
const MOCK_CONTEST_PURCHASE_MIN_COST = 3000;
const MOCK_CONTEST_PURCHASE_MAX_COST = 8000;
const MOCK_CONTEST_GAIN_MULTIPLIER_PURCHASED = 1.8;

// 网赛类型配置（替代原有的难度级别）
const ONLINE_CONTEST_TYPES = [
  {name: "Atcoder-ABC", numProblems: 7, difficulty: 120, displayName: "Atcoder ABC"},
  {name: "Atcoder-ARC", numProblems: 4, difficulty: 230, displayName: "Atcoder ARC"},
  {name: "Codeforces-Div3", numProblems: 5, difficulty: 120, displayName: "Codeforces Div.3"},
  {name: "Codeforces-Div2", numProblems: 5, difficulty: 230, displayName: "Codeforces Div.2"},
  {name: "Codeforces-Div1", numProblems: 5, difficulty: 370, displayName: "Codeforces Div.1"},
  {name: "洛谷月赛", numProblems: 4, difficulty: 240, displayName: "洛谷月赛"},
  {name: "Ucup", numProblems: 4, difficulty: 370, displayName: "Ucup"}
];

// 保留旧常量以兼容性（已废弃）
const MOCK_CONTEST_DIFFICULTIES = ["Atcoder ABC", "Atcoder ARC", "CF Div.3", "CF Div.2", "CF Div.1"];
const MOCK_CONTEST_DIFF_VALUES = [120, 230, 120, 230, 320];
/* 娱乐 */
const ENTERTAINMENT_COST_MEAL = 3000;
const ENTERTAINMENT_COST_CS = 1000;
/* 放假 */
const VACATION_MAX_DAYS = 7;
/* 比赛奖励 */
const NOI_GOLD_THRESHOLD = 0.8;    // NOI金牌线：80%
const NOI_SILVER_THRESHOLD = 0.56; // NOI银牌线：70% of 金牌线 = 0.8 * 0.7 = 0.56
const NOI_BRONZE_THRESHOLD = 0.4;  // NOI铜牌线：50% of 金牌线 = 0.8 * 0.5 = 0.4

// NOI分级奖励（按奖牌等级）
const NOI_GOLD_REWARD_MIN = 20000;     // 金牌（晋级）奖励最小值
const NOI_GOLD_REWARD_MAX = 40000;     // 金牌（晋级）奖励最大值
const NOI_SILVER_REWARD_MIN = 10000;   // 银牌奖励最小值
const NOI_SILVER_REWARD_MAX = 20000;   // 银牌奖励最大值
const NOI_BRONZE_REWARD_MIN = 5000;   // 铜牌奖励最小值
const NOI_BRONZE_REWARD_MAX = 10000;   // 铜牌奖励最大值

// 其他比赛奖励（保持原有逻辑）
const NOIP_REWARD_MIN = 10000;
const NOIP_REWARD_MAX = 20000;
const CSP_S2_REWARD_MIN = 4000;
const CSP_S2_REWARD_MAX = 8000;
const CSP_S1_REWARD_MIN = 2000;
const CSP_S1_REWARD_MAX = 5000;

// 旧的NOI奖励常量（已废弃，保留用于兼容性）
const NOI_REWARD_MIN = 30000;
const NOI_REWARD_MAX = 50000;
/* 随机事件 */
const BASE_SICK_PROB = 0.025;
const SICK_PROB_FROM_COLD_HOT = 0.03;
const QUIT_PROB_BASE = 0.22;
const QUIT_PROB_PER_EXTRA_PRESSURE = 0.02;
const TALENT_LOST_VALUE = 75; // 触发丧失天赋的压力阈值
/* 劝退消耗声誉 */
const EVICT_REPUTATION_COST = 10;

/* =========== 失误系统 =========== */
// 失误概率基础参数
const MISTAKE_BASE_PROBABILITY = 0.15;  // 代码能力为0时的基础失误概率
const MISTAKE_MIN_PROBABILITY = 0.02;   // 最低失误概率（代码能力>=100时）
const MISTAKE_CODING_FACTOR = 0.0013;   // 代码能力对失误概率的影响系数（每点代码能力降低0.13%失误概率）

// 失误扣分参数
const MISTAKE_MIN_PENALTY = 0.10;       // 最小扣分比例（10%）
const MISTAKE_MAX_PENALTY = 1.00;       // 最大扣分比例（100%）

// 失误理由列表
const MISTAKE_REASONS = [
  "边界条件处理不当",
  "数组越界",
  "忘记特判T1!=T2",
  "循环变量写错",
  "递归边界错误",
  "忘记初始化",
  "取模写漏了",
  "N和M写反了",
  "忘记开longlong",
  "没看到多组数据",
  "忘记清空数组",
  "忘记关闭调试输出",
  "cerr调试忘删TLE了"
];

/* =========== 全局增幅变量 =========== */
// 这些增幅在最终应用影响时作为乘数，默认为1.000
TRAINING_EFFECT_MULTIPLIER = 1.000;      // 训练效果增幅（训练后属性增加）
OUTFIT_EFFECT_MULTIPLIER = 1.000;        // 集训效果增幅（集训后属性增加）
PRESSURE_INCREASE_MULTIPLIER = 1.000;    // 压力增加量增幅
PASS_LINE_MULTIPLIER = 1.000;            // 分数线增幅
DIFFICULTY_MULTIPLIER = 1.000;           // 题目难度增幅
COST_MULTIPLIER = 1.000;                 // 经费消耗增幅

/* =========== 省份数据 =========== */
const PROVINCES = {
  // 强省
  1:{name:"北京",type:"强省",isNorth:true,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY, climate: null},
  2:{name:"重庆",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  3:{name:"湖南",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  4:{name:"广东",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  5:{name:"四川",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  6:{name:"浙江",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  7:{name:"上海",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  8:{name:"福建",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  9:{name:"江苏",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
 10:{name:"山东",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},

  // 普通省
 11:{name:"湖北",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 12:{name:"江西",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 13:{name:"河北",type:"普通省",isNorth:true,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 14:{name:"香港",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 15:{name:"陕西",type:"普通省",isNorth:true,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 16:{name:"河南",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 17:{name:"安徽",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 18:{name:"黑龙江",type:"普通省",isNorth:true,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 19:{name:"广西",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 20:{name:"辽宁",type:"普通省",isNorth:true,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 21:{name:"吉林",type:"普通省",isNorth:true,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 22:{name:"天津",type:"普通省",isNorth:true,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 23:{name:"山西",type:"普通省",isNorth:true,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 24:{name:"贵州",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},

  // 弱省
 25:{name:"澳门",type:"弱省",isNorth:false,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 26:{name:"新疆",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 27:{name:"海南",type:"弱省",isNorth:false,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 28:{name:"内蒙古",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 29:{name:"云南",type:"弱省",isNorth:false,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 30:{name:"宁夏",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 31:{name:"甘肃",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 32:{name:"青海",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},

  // 兼容性保留：西藏
 33:{name:"西藏",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY}
};

// 气候数据已迁移至 lib/climate.js 模块
// PROVINCES 中的 climate 字段不再使用，保留为空（向后兼容）

/* =========== 比赛模拟引擎参数 =========== */

// --- Subtask（部分分）生成参数 ---
// subtask 数量的随机范围：3~5档（不含强制单档或指定数量场景）
const SUBTASK_COUNT_MIN = 3;
const SUBTASK_COUNT_MAX = 5;
// 难度递增曲线参数：progress 从0到1，指数曲线的基值和指数
// difficultyRatio = BASE + RANGE * progress^EXPONENT
const SUBTASK_DIFFICULTY_BASE_RATIO = 0.35;   // 第一档占题目难度的最低比例
const SUBTASK_DIFFICULTY_RANGE_RATIO = 0.65;  // 难度增长的总幅度
const SUBTASK_DIFFICULTY_EXPONENT = 1.8;       // 难度曲线的凸度（>1使前几档难度更低，后几档陡增）

// --- 能力计算中的知识权重 ---
// 知识对思维能力（thinking）的加成系数（知识点 * 该系数加到思维值上）
const KNOWLEDGE_BONUS_TO_THINKING = 0.5;
// 知识对代码能力（coding）的加成系数
const KNOWLEDGE_BONUS_TO_CODING = 0.3;
// 知识对"综合有效能力"（用于选题判断等）的加成系数
const KNOWLEDGE_BONUS_TO_EFFECTIVE = 0.5;

// --- Sigmoid 概率函数参数 ---
// sigmoid(gap) = 1 / (1 + exp(-gap / SIGMOID_SCALE))
// 该参数控制从"能力不足"到"能力足够"的过渡平滑度；值越大过渡越平缓
const SIGMOID_SCALE = 12.0;

// --- 心理稳定性对通过率的影响 ---
// stability = BASE + RANGE * (mental / 100)，心理指数越高越稳定
const THINKING_STABILITY_BASE = 0.75;   // 思维稳定性基础值
const THINKING_STABILITY_RANGE = 0.25;  // 思维稳定性受心理的影响幅度
const CODING_STABILITY_BASE = 0.8;      // 代码稳定性基础值（比思维更稳定）
const CODING_STABILITY_RANGE = 0.2;     // 代码稳定性受心理的影响幅度（较窄区间）

// --- 知识点门槛惩罚参数 ---
// 题目所需的最小知识值
const KNOWLEDGE_REQUIREMENT_MIN = 15;
// 知识需求占题目思维难度的比例
const KNOWLEDGE_REQUIREMENT_RATIO = 0.35;
// 知识惩罚的指数衰减系数：penalty = exp(-knowledgeGap / DECAY)
const KNOWLEDGE_PENALTY_DECAY = 15.0;
// 知识惩罚的最低保留概率（即使知识完全不够也保留5%的运气空间）
const KNOWLEDGE_PENALTY_MIN = 0.05;

// --- 难度压制参数 ---
// 当题目整体难度超过学生有效能力的这个倍数时，触发难度压制
const DIFFICULTY_SUPPRESSION_RATIO = 2.0;
// 难度压制时将 thinking/coding 通过概率乘以该系数
const DIFFICULTY_SUPPRESSION_FACTOR = 0.45;

// --- 概率值的硬性边界 ---
const PROBABILITY_FLOOR = 0.03;   // 通过率下限（保留极小可能）
const PROBABILITY_CEIL = 0.98;    // 通过率上限（不可能是100%）

// --- 选题策略（selectProblem）参数 ---
// 难度差距阈值：学生有效能力与题目最简单档位难度的差值区间
const SELECT_GAP_VERY_EASY = -20;   // gap <= -20：非常简单的题
const SELECT_GAP_EASY = 0;          // gap <= 0：简单
const SELECT_GAP_MODERATE = 20;     // gap <= 20：适中
const SELECT_GAP_HARD = 40;         // gap <= 40：较难（gap > 40 为很难）
// 对应各区间的加分值
const SELECT_BONUS_VERY_EASY = 80;
const SELECT_BONUS_EASY = 60;
const SELECT_BONUS_MODERATE = 40;
const SELECT_BONUS_HARD = 20;
const SELECT_BONUS_VERY_HARD = 10;
// 顺序开题倾向：题目id每增大1，位置加分减少 POSITION_DECAY
const SELECT_POSITION_BASE = 40;
const SELECT_POSITION_DECAY = 8;

// --- 智能档位选择（selectBestSubtask）参数 ---
// 能力匹配区间：能力/难度比率在此区间内视为最佳匹配
const SUBTASK_MATCH_RATIO_MIN = 0.6;
const SUBTASK_MATCH_RATIO_MAX = 1.4;
// 能力过高时的最低得分和衰减速率
const SUBTASK_OVERMATCH_FLOOR = 60;
const SUBTASK_OVERMATCH_DECAY_RATE = 40;
// 能力过低时的得分衰减系数（乘以比率）
const SUBTASK_UNDERMATCH_DECAY_FACTOR = 100;
// 分值权重（乘以得分获得综合分数中的分值贡献）
const SUBTASK_SCORE_WEIGHT = 0.8;
// 已获得分数的惩罚（已拿到的分数不重复追求）
const SUBTASK_SCORE_PENALTY = -50;

// --- 部分分降级策略参数 ---
// 能力不足以解满分档的判定阈值：thinkingRatio 或 codingRatio 低于此值
const PARTIAL_CANNOT_SOLVE_RATIO = 0.7;
// 开始考虑降级的最短思考时间（分钟）
const PARTIAL_THINK_START = 20;
// 时间因子的分母（(thinkingTime - START) / DIVISOR）
const PARTIAL_TIME_DIVISOR = 40;
// 时间因子的上限
const PARTIAL_TIME_FACTOR_MAX = 0.8;
// 匹配度指数衰减系数：exp(-match * EXPONENT)
const PARTIAL_MATCH_EXP_DECAY = 2.0;
// 过于简单的能力比率阈值
const PARTIAL_OVERPOWER_THRESHOLD = 1.5;
// 过于困难的能力比率阈值
const PARTIAL_UNDERPOWER_THRESHOLD = 0.6;
// 最佳档位位置区间（相对于总档位数的比例）
const PARTIAL_POSITION_OPTIMAL_MIN = 0.4;
const PARTIAL_POSITION_OPTIMAL_MAX = 0.7;
// 时间调整：超过此时间后倾向更低档位
const PARTIAL_TIME_ADJUST_START = 30;
const PARTIAL_TIME_ADJUST_MAX = 60;
// 降级概率
const PARTIAL_DOWNGRADE_PROB_CANNOT = 0.85;   // 能力明显不足时的降级概率
const PARTIAL_DOWNGRADE_PROB_BASE = 0.5;       // 仅时间因素时的基础降级概率

// --- 档位选择的随机性 ---
// 80%概率选择得分最高的档位，15%选择次高，5%随机
const SUBTASK_SELECT_BEST_PROB = 0.80;
const SUBTASK_SELECT_SECOND_PROB = 0.95;

// --- 跳题策略（shouldSkipProblem）参数 ---
// "专注"特质提供的额外耐心时间（分钟）
const SKIP_FOCUS_BONUS = 30;
// 难度差距阈值：决定不同的跳题时间基准
const SKIP_GAP_EXTREME = 50;    // 极难
const SKIP_GAP_HARD = 30;       // 很难
const SKIP_GAP_MODERATE = 10;   // 中等偏难（gap > 10 为能力足够）
// 各难度级别对应的跳题时间阈值（分钟）
const SKIP_TIME_EXTREME = 20;      // 极难：20分钟后可能跳
const SKIP_TIME_HARD = 35;         // 很难：35分钟后可能跳
const SKIP_TIME_MODERATE = 50;     // 中等偏难：50分钟后可能跳
const SKIP_TIME_EASY = 70;         // 能力足够：70分钟后可能跳
// 超时后的跳题概率计算参数
const SKIP_OVERTIME_DIVISOR = 30.0;             // 超时比例分母
const SKIP_PROB_BASE = 0.3;                      // 基础跳题概率（刚超时时）
const SKIP_PROB_INCREMENT = 0.1;                 // 每单位超时比例的增加量
const SKIP_PROB_MAX = 0.7;                       // 跳题概率上限

// --- 题目构建（buildContestConfig）参数 ---
// 难度系数的随机扰动范围（±7.5%）
const BUILD_PERTURBATION_RANGE = 0.15;
// 默认难度递增步长（每道题递增20点，偏移-10）
const BUILD_DIFFICULTY_STEP = 20;
const BUILD_DIFFICULTY_OFFSET = -10;
// 思维/代码难度的最大偏差幅度
const BUILD_MAX_SKEW = 30;
// 思维/代码难度的轻微随机扰动幅度
const BUILD_SKILL_PERTURBATION = 5;

// --- 网赛难度系数配置 ---
// 每种网赛类型对应每道题目的难度系数（乘以比赛基础难度）
const ONLINE_CONTEST_DIFFICULTY_FACTORS = {
  "Atcoder-ABC": [0.33, 0.5, 0.67, 0.83, 1.0, 1.17, 1.33],
  "Atcoder-ARC": [0.52, 0.87, 1.20, 1.52],
  "Codeforces-Div3": [0.4, 0.7, 1.0, 1.3, 1.6],
  "Codeforces-Div2": [0.4, 0.7, 1.0, 1.3, 1.6],
  "Codeforces-Div1": [0.4, 0.7, 1.0, 1.3, 1.6],
  "洛谷月赛": [0.5, 0.8, 1.2, 1.5],
  "Ucup": [0.5, 0.8, 1.2, 1.5]
};


// 导出到全局 window 对象
if(typeof window !== 'undefined'){
  window.COMPETITION_BASE_CUTOFF = COMPETITION_BASE_CUTOFF;
  window.CUTOFF_FLUCTUATION = CUTOFF_FLUCTUATION;
}

// small export hint: keep variables in global scope (non-module script loaded before main script)
