/* constants.js - 拆分自原始 script.js 的常量与省份数据 */
/* =================== 常量（与 C++ 保持一致） =================== */
/* 时间与赛季 */
// 原始赛季长度（用于按比例缩放原始比赛日程）
const ORIGINAL_SEASON_WEEKS = 52;
// 缩短后的赛季长度（略微放慢节奏）
const SEASON_WEEKS = 28;
/* 能力与知识权重 */
const KNOWLEDGE_WEIGHT = 0.6;
const ABILITY_WEIGHT = 0.4;
/* 压力/恢复 */
const RECOVERY_RATE = 7.0;
const FATIGUE_FROM_PRESSURE = 180.0;
const ALPHA1 = 28.0;
/* 忘却 */
const KNOWLEDGE_FORGET_RATE = 0.998;
/* 省份基础 */
const STRONG_PROVINCE_BUDGET = 200000;
const NORMAL_PROVINCE_BUDGET = 100000;
const WEAK_PROVINCE_BUDGET = 40000;
const STRONG_PROVINCE_TRAINING_QUALITY = 1.3;
const NORMAL_PROVINCE_TRAINING_QUALITY = 1.0;
const WEAK_PROVINCE_TRAINING_QUALITY = 0.7;
/* 比赛日程 */
const COMPETITION_SCHEDULE = [
  // 调整后的原始周数（用于按 ORIGINAL_SEASON_WEEKS 缩放）
  // 这样在 SEASON_WEEKS = 28 时，两轮缩放后会得到用户指定的周次
  // 第一轮：3,5,7,11,14  第二轮：17,19,21,25,28
  {week:9, name:"CSP-S1", difficulty:65, maxScore:100, numProblems:1},
  {week:17, name:"CSP-S2", difficulty:125, maxScore:400, numProblems:4},
  {week:25, name:"NOIP", difficulty:205, maxScore:400, numProblems:4},
  {week:40, name:"省选", difficulty:340, maxScore:600, numProblems:6},
  {week:52, name:"NOI", difficulty:380, maxScore:700, numProblems:7}
];
// 明确的比赛链顺序（用于链式晋级判断）
const COMPETITION_ORDER = ["CSP-S1","CSP-S2","NOIP","省选","NOI"];
/* 晋级线基准 */
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
/* 难度修正 */
const EASY_MODE_BUDGET_MULTIPLIER = 1.15;
const HARD_MODE_BUDGET_MULTIPLIER = 0.7;
const EASY_MODE_TEACHING_POINTS = 15;
const NORMAL_MODE_TEACHING_POINTS = 10;
const HARD_MODE_TEACHING_POINTS = 5;
const EASY_MODE_ABILITY_BONUS = 10.0;
const HARD_MODE_ABILITY_PENALTY = 10.0;
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
const MOCK_CONTEST_DIFFICULTIES = ["入门级","普及级","NOIP级","省选级","NOI级"]; // 去数值化：只显示等级
const MOCK_CONTEST_DIFF_VALUES = [40, 120, 230, 320, 380];
/* 娱乐 */
const ENTERTAINMENT_COST_MEAL = 3000;
const ENTERTAINMENT_COST_CS = 1000;
/* 放假 */
const VACATION_MAX_DAYS = 7;
/* 比赛奖励 */
const NOI_GOLD_THRESHOLD = 0.9;
const NOI_SILVER_THRESHOLD = 0.6;
const NOI_BRONZE_THRESHOLD = 0.4;
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
/* 劝退消耗声誉 */
const EVICT_REPUTATION_COST = 10;

/* =========== 省份数据 =========== */
const PROVINCES = {
  1:{name:"北京",type:"强省",isNorth:true,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  2:{name:"浙江",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  3:{name:"江苏",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  4:{name:"上海",type:"强省",isNorth:false,baseBudget:STRONG_PROVINCE_BUDGET,trainingQuality:STRONG_PROVINCE_TRAINING_QUALITY},
  5:{name:"广东",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
  6:{name:"湖南",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
  7:{name:"山东",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
  8:{name:"河南",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
  9:{name:"四川",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 10:{name:"湖北",type:"普通省",isNorth:false,baseBudget:NORMAL_PROVINCE_BUDGET,trainingQuality:NORMAL_PROVINCE_TRAINING_QUALITY},
 11:{name:"黑龙江",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 12:{name:"吉林",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 13:{name:"甘肃",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 14:{name:"青海",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 15:{name:"新疆",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY},
 16:{name:"西藏",type:"弱省",isNorth:true,baseBudget:WEAK_PROVINCE_BUDGET,trainingQuality:WEAK_PROVINCE_TRAINING_QUALITY}
};

// small export hint: keep variables in global scope (non-module script loaded before main script)
