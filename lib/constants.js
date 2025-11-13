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
/* 设施 */
const FACILITY_UPGRADE_COSTS = {
  computer: {base:20000,grow:1.6},
  library: {base:15000,grow:1.5},
  ac: {base:8000,grow:1.4},
  dorm: {base:8000,grow:1.4},
  canteen: {base:8000,grow:1.4}
};
const MAX_COMPUTER_LEVEL = 5;
const MAX_LIBRARY_LEVEL = 5;
const MAX_OTHER_FACILITY_LEVEL = 3;
const COMPUTER_EFFICIENCY_PER_LEVEL = 0.07;
const LIBRARY_EFFICIENCY_PER_LEVEL = 0.06;
const CANTEEN_PRESSURE_REDUCTION_PER_LEVEL = 0.06;
const DORM_COMFORT_BONUS_PER_LEVEL = 5.5;
const AC_COMFORT_BONUS_PER_LEVEL = 9.0;
/* 天气/舒适 */
const BASE_COMFORT_NORTH = 45.0;
const BASE_COMFORT_SOUTH = 55.0;
const EXTREME_COLD_THRESHOLD = 5;
const EXTREME_HOT_THRESHOLD = 35;
const WEATHER_PENALTY_NO_AC = 20.0;
const WEATHER_PENALTY_WITH_AC = 10.0;
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
const NOI_REWARD_MIN = 30000;
const NOI_REWARD_MAX = 50000;
const NOIP_REWARD_MIN = 10000;
const NOIP_REWARD_MAX = 20000;
const CSP_S2_REWARD_MIN = 4000;
const CSP_S2_REWARD_MAX = 8000;
const CSP_S1_REWARD_MIN = 2000;
const CSP_S1_REWARD_MAX = 5000;
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

// 为每个省份提供默认的四季均温与降水概率（如果需要精细调整，可在此表中覆盖）
// 结构：{ seasonalTemps: { spring, summer, autumn, winter }, precipProb: { spring, summer, autumn, winter } }
function createDefaultClimate(isNorth, name){
  const north = {
    seasonalTemps: { spring: 12, summer: 26, autumn: 15, winter: -5 },
    precipProb:    { spring: 0.25, summer: 0.35, autumn: 0.20, winter: 0.10 }
  };
  const south = {
    seasonalTemps: { spring: 18, summer: 30, autumn: 24, winter: 10 },
    precipProb:    { spring: 0.30, summer: 0.45, autumn: 0.30, winter: 0.10 }
  };
  const plateau = {
    seasonalTemps: { spring: 5, summer: 15, autumn: 8, winter: -8 },
    precipProb:    { spring: 0.15, summer: 0.20, autumn: 0.10, winter: 0.05 }
  };
  // special-case by name for well-known climates
  const nameLower = (name||'').toString().toLowerCase();
  // 高原地区优先判断
  if(nameLower.includes('西藏') || nameLower.includes('青海')) return plateau;

  const southNames = [
    '海南','广东','广西','云南','福建','台湾',
    '湖南','湖北','江西','贵州','四川','重庆',
    '浙江','香港','澳门'
  ];

  for(const s of southNames){
    if(nameLower.includes(s)) return south;
  }

  // 默认为北方（若传入了 isNorth 参数也保持兼容）
  return isNorth ? north : north;
}

// 填充 PROVINCES 中 climate 为 null 或缺失的项，以便后续引用时都能得到 climate
for(const k in PROVINCES){
  try{
    const p = PROVINCES[k];
    if(!p.climate) p.climate = createDefaultClimate(p.isNorth || false, p.name || '');
  }catch(e){ /* ignore */ }
}

// 导出到全局 window 对象
if(typeof window !== 'undefined'){
  window.COMPETITION_BASE_CUTOFF = COMPETITION_BASE_CUTOFF;
  window.CUTOFF_FLUCTUATION = CUTOFF_FLUCTUATION;
}

// small export hint: keep variables in global scope (non-module script loaded before main script)
