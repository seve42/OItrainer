/* constants.js - 拆分自原始 script.js 的常量与省份数据 */
/* =================== 常量（与 C++ 保持一致） =================== */
/* 时间与赛季 */
// 原始赛季长度（用于按比例缩放原始比赛日程）
const ORIGINAL_SEASON_WEEKS = 52;
// 缩短后的赛季长度（提高节奏）
const SEASON_WEEKS = 26;
/* 能力与知识权重 */
const KNOWLEDGE_WEIGHT = 0.6;
const ABILITY_WEIGHT = 0.4;
/* 压力/恢复 */
const RECOVERY_RATE = 7.0;
const FATIGUE_FROM_PRESSURE = 180.0;
const ALPHA1 = 28.0;
/* 忘却 */
const KNOWLEDGE_FORGET_RATE = 0.997;
/* 省份基础 */
const STRONG_PROVINCE_BUDGET = 200000;
const NORMAL_PROVINCE_BUDGET = 100000;
const WEAK_PROVINCE_BUDGET = 40000;
const STRONG_PROVINCE_TRAINING_QUALITY = 1.3;
const NORMAL_PROVINCE_TRAINING_QUALITY = 1.0;
const WEAK_PROVINCE_TRAINING_QUALITY = 0.7;
/* 比赛日程 */
const COMPETITION_SCHEDULE = [
  // CSP-S1: 单题，包含所有 TAG（总分 100）
  {week:10, name:"CSP-S1", difficulty:25, maxScore:100, numProblems:1},
  // CSP-S2: 保持不变（4 题）
  {week:15, name:"CSP-S2", difficulty:75, maxScore:400, numProblems:4},
  // NOIP: 保持不变（4 题）
  {week:20, name:"NOIP", difficulty:125, maxScore:400, numProblems:4},
  // 省选：6 道题（总分 600）
  {week:37, name:"省选", difficulty:200, maxScore:600, numProblems:6},
  // NOI：7 道题（总分 700），第一题包含所有 TAG
  {week:50, name:"NOI", difficulty:300, maxScore:700, numProblems:7}
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
const TRAINING_BASE_KNOWLEDGE_GAIN_PER_INTENSITY = 4;
const TRAINING_THINKING_GAIN_MIN = 0.6;
const TRAINING_CODING_GAIN_MIN = 0.6;
const TRAINING_PRESSURE_MULTIPLIER_LIGHT = 1.0;
const TRAINING_PRESSURE_MULTIPLIER_MEDIUM = 1.5;
const TRAINING_PRESSURE_MULTIPLIER_HEAVY = 2.5;
const COMPOSITE_TRAINING_PRESSURE_BONUS = 1.2;
/* 外出集训 */
const OUTFIT_BASE_COST_BASIC = 15000;
const OUTFIT_BASE_COST_INTERMEDIATE = 25000;
const OUTFIT_BASE_COST_ADVANCED = 40000;
const STRONG_PROVINCE_COST_MULTIPLIER = 1.5;
const WEAK_PROVINCE_COST_MULTIPLIER = 0.7;
const OUTFIT_KNOWLEDGE_BASE_BASIC = 5;
const OUTFIT_KNOWLEDGE_BASE_INTERMEDIATE = 10;
const OUTFIT_KNOWLEDGE_BASE_ADVANCED = 18;
const OUTFIT_ABILITY_BASE_BASIC = 3.0;
const OUTFIT_ABILITY_BASE_INTERMEDIATE = 6.0;
const OUTFIT_ABILITY_BASE_ADVANCED = 10.0;
const OUTFIT_PRESSURE_BASIC = 30;
const OUTFIT_PRESSURE_INTERMEDIATE = 50;
const OUTFIT_PRESSURE_ADVANCED = 75;
/* 模拟赛 */
const MOCK_CONTEST_PURCHASE_MIN_COST = 3000;
const MOCK_CONTEST_PURCHASE_MAX_COST = 8000;
const MOCK_CONTEST_GAIN_MULTIPLIER_PURCHASED = 1.8;
const MOCK_CONTEST_DIFFICULTIES = ["入门级","普及级","NOIP级","省选级","NOI级"]; // 去数值化：只显示等级
const MOCK_CONTEST_DIFF_VALUES = [30, 50, 120, 360, 420];
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
