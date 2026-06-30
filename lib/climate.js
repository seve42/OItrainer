/* climate.js - 独立的地理与气候模块
   负责：各省份季节温度、天气判定、天气事件（台风/强对流/冰雹/沙尘暴）触发概率。
   周数→季节映射计算保持与原有逻辑不变。
*/

/* =========== 季节映射 =========== */
// 保持与 models.js 中 GameState.updateWeather() 完全一致的周→季节逻辑
// 游戏从第1周开始对应9月（秋季开学），每学年16周，共两个学年32周
function getSeasonByWeek(week) {
  const weekInYear = ((week - 1) % 16) + 1; // 1-16
  const monthOffset = Math.floor((weekInYear - 1) * 10 / 16);
  let month = 9 + monthOffset;
  if (month > 12) month = month - 12;
  if (month < 1) month = 1;
  if (month > 12) month = 12;

  if ([3, 4, 5].includes(month)) return 'spring';
  else if ([6, 7, 8].includes(month)) return 'summer';
  else if ([9, 10, 11].includes(month)) return 'autumn';
  else return 'winter';
}

/* =========== 气候数据表 =========== */
// 结构: CLIMATE_TABLE[省份名][季节] = { tempMin, tempMax, precipProb, typhoonProb, severeConvectiveProb, hailProb, sandstormProb }
const CLIMATE_TABLE = {
  '北京': {
    spring: { tempMin: 10, tempMax: 20, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.04, hailProb: 0.01, sandstormProb: 0.04 },
    summer: { tempMin: 24, tempMax: 32, precipProb: 0.35, typhoonProb: 0, severeConvectiveProb: 0.12, hailProb: 0.02, sandstormProb: 0.00 },
    autumn: { tempMin: 12, tempMax: 20, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.00, sandstormProb: 0.01 },
    winter: { tempMin: -5, tempMax: 5,   precipProb: 0.03, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.01 }
  },
  '天津': {
    spring: { tempMin: 10, tempMax: 22, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.04, hailProb: 0.01, sandstormProb: 0.04 },
    summer: { tempMin: 25, tempMax: 33, precipProb: 0.36, typhoonProb: 0, severeConvectiveProb: 0.12, hailProb: 0.02, sandstormProb: 0.00 },
    autumn: { tempMin: 13, tempMax: 22, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.00, sandstormProb: 0.01 },
    winter: { tempMin: -5, tempMax: 4,   precipProb: 0.03, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.01 }
  },
  '河北': {
    spring: { tempMin: 10, tempMax: 22, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.05, hailProb: 0.02, sandstormProb: 0.05 },
    summer: { tempMin: 25, tempMax: 33, precipProb: 0.35, typhoonProb: 0, severeConvectiveProb: 0.12, hailProb: 0.03, sandstormProb: 0.01 },
    autumn: { tempMin: 10, tempMax: 22, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.01, sandstormProb: 0.01 },
    winter: { tempMin: -8, tempMax: 3,   precipProb: 0.04, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.01 }
  },
  '山西': {
    spring: { tempMin: 8,  tempMax: 20, precipProb: 0.18, typhoonProb: 0, severeConvectiveProb: 0.05, hailProb: 0.02, sandstormProb: 0.05 },
    summer: { tempMin: 20, tempMax: 30, precipProb: 0.38, typhoonProb: 0, severeConvectiveProb: 0.10, hailProb: 0.04, sandstormProb: 0.00 },
    autumn: { tempMin: 8,  tempMax: 18, precipProb: 0.20, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.01, sandstormProb: 0.01 },
    winter: { tempMin: -10, tempMax: 3,  precipProb: 0.05, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.02 }
  },
  '内蒙古': {
    spring: { tempMin: 0,   tempMax: 15, precipProb: 0.10, typhoonProb: 0, severeConvectiveProb: 0.03, hailProb: 0.02, sandstormProb: 0.15 },
    summer: { tempMin: 18,  tempMax: 30, precipProb: 0.25, typhoonProb: 0, severeConvectiveProb: 0.08, hailProb: 0.05, sandstormProb: 0.03 },
    autumn: { tempMin: 0,   tempMax: 15, precipProb: 0.10, typhoonProb: 0, severeConvectiveProb: 0.01, hailProb: 0.01, sandstormProb: 0.04 },
    winter: { tempMin: -15, tempMax: -5, precipProb: 0.04, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.04 }
  },
  '辽宁': {
    spring: { tempMin: 6,   tempMax: 18, precipProb: 0.20, typhoonProb: 0,    severeConvectiveProb: 0.04, hailProb: 0.01, sandstormProb: 0.03 },
    summer: { tempMin: 22,  tempMax: 30, precipProb: 0.45, typhoonProb: 0.01, severeConvectiveProb: 0.10, hailProb: 0.02, sandstormProb: 0.00 },
    autumn: { tempMin: 8,   tempMax: 18, precipProb: 0.20, typhoonProb: 0.01, severeConvectiveProb: 0.02, hailProb: 0.01, sandstormProb: 0.00 },
    winter: { tempMin: -10, tempMax: 0,  precipProb: 0.06, typhoonProb: 0,    severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.01 }
  },
  '吉林': {
    spring: { tempMin: 2,   tempMax: 16,  precipProb: 0.18, typhoonProb: 0, severeConvectiveProb: 0.03, hailProb: 0.01, sandstormProb: 0.02 },
    summer: { tempMin: 20,  tempMax: 28,  precipProb: 0.40, typhoonProb: 0, severeConvectiveProb: 0.08, hailProb: 0.02, sandstormProb: 0.00 },
    autumn: { tempMin: 3,   tempMax: 16,  precipProb: 0.18, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.01, sandstormProb: 0.00 },
    winter: { tempMin: -18, tempMax: -5,  precipProb: 0.08, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.00 }
  },
  '黑龙江': {
    spring: { tempMin: 0,   tempMax: 15,  precipProb: 0.17, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.01, sandstormProb: 0.01 },
    summer: { tempMin: 18,  tempMax: 28,  precipProb: 0.35, typhoonProb: 0, severeConvectiveProb: 0.09, hailProb: 0.02, sandstormProb: 0.00 },
    autumn: { tempMin: 0,   tempMax: 15,  precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.01, hailProb: 0.00, sandstormProb: 0.00 },
    winter: { tempMin: -25, tempMax: -10, precipProb: 0.05, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.00 }
  },
  '上海': {
    spring: { tempMin: 12, tempMax: 20, precipProb: 0.30, typhoonProb: 0,    severeConvectiveProb: 0.05, hailProb: 0.01, sandstormProb: 0 },
    summer: { tempMin: 25, tempMax: 33, precipProb: 0.35, typhoonProb: 0.03, severeConvectiveProb: 0.10, hailProb: 0.01, sandstormProb: 0 },
    autumn: { tempMin: 18, tempMax: 25, precipProb: 0.20, typhoonProb: 0.02, severeConvectiveProb: 0.02, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 3,  tempMax: 8,  precipProb: 0.20, typhoonProb: 0,    severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0 }
  },
  '江苏': {
    spring: { tempMin: 12, tempMax: 22, precipProb: 0.28, typhoonProb: 0,    severeConvectiveProb: 0.06, hailProb: 0.01, sandstormProb: 0.01 },
    summer: { tempMin: 25, tempMax: 34, precipProb: 0.38, typhoonProb: 0.02, severeConvectiveProb: 0.12, hailProb: 0.02, sandstormProb: 0 },
    autumn: { tempMin: 15, tempMax: 24, precipProb: 0.22, typhoonProb: 0.01, severeConvectiveProb: 0.02, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 0,  tempMax: 8,  precipProb: 0.18, typhoonProb: 0,    severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.01 }
  },
  '浙江': {
    spring: { tempMin: 13, tempMax: 22, precipProb: 0.45, typhoonProb: 0,    severeConvectiveProb: 0.08, hailProb: 0.02, sandstormProb: 0 },
    summer: { tempMin: 26, tempMax: 34, precipProb: 0.40, typhoonProb: 0.06, severeConvectiveProb: 0.10, hailProb: 0.02, sandstormProb: 0 },
    autumn: { tempMin: 18, tempMax: 26, precipProb: 0.25, typhoonProb: 0.04, severeConvectiveProb: 0.03, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 5,  tempMax: 10, precipProb: 0.28, typhoonProb: 0,    severeConvectiveProb: 0.01, hailProb: 0.00, sandstormProb: 0 }
  },
  '安徽': {
    spring: { tempMin: 13, tempMax: 23, precipProb: 0.32, typhoonProb: 0,    severeConvectiveProb: 0.08, hailProb: 0.02, sandstormProb: 0.01 },
    summer: { tempMin: 26, tempMax: 33, precipProb: 0.38, typhoonProb: 0.01, severeConvectiveProb: 0.12, hailProb: 0.02, sandstormProb: 0 },
    autumn: { tempMin: 16, tempMax: 24, precipProb: 0.22, typhoonProb: 0.01, severeConvectiveProb: 0.02, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 1,  tempMax: 8,  precipProb: 0.18, typhoonProb: 0,    severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.01 }
  },
  '福建': {
    spring: { tempMin: 16, tempMax: 24, precipProb: 0.45, typhoonProb: 0.01, severeConvectiveProb: 0.10, hailProb: 0.01, sandstormProb: 0 },
    summer: { tempMin: 26, tempMax: 34, precipProb: 0.40, typhoonProb: 0.08, severeConvectiveProb: 0.12, hailProb: 0.01, sandstormProb: 0 },
    autumn: { tempMin: 20, tempMax: 28, precipProb: 0.25, typhoonProb: 0.06, severeConvectiveProb: 0.04, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 10, tempMax: 16, precipProb: 0.30, typhoonProb: 0,    severeConvectiveProb: 0.01, hailProb: 0.00, sandstormProb: 0 }
  },
  '江西': {
    spring: { tempMin: 15, tempMax: 24, precipProb: 0.50, typhoonProb: 0,    severeConvectiveProb: 0.12, hailProb: 0.03, sandstormProb: 0 },
    summer: { tempMin: 26, tempMax: 34, precipProb: 0.40, typhoonProb: 0.02, severeConvectiveProb: 0.15, hailProb: 0.02, sandstormProb: 0 },
    autumn: { tempMin: 18, tempMax: 26, precipProb: 0.25, typhoonProb: 0.01, severeConvectiveProb: 0.03, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 5,  tempMax: 10, precipProb: 0.30, typhoonProb: 0,    severeConvectiveProb: 0.01, hailProb: 0.00, sandstormProb: 0 }
  },
  '山东': {
    spring: { tempMin: 10, tempMax: 22, precipProb: 0.20, typhoonProb: 0,    severeConvectiveProb: 0.05, hailProb: 0.03, sandstormProb: 0.02 },
    summer: { tempMin: 24, tempMax: 31, precipProb: 0.40, typhoonProb: 0.02, severeConvectiveProb: 0.12, hailProb: 0.03, sandstormProb: 0 },
    autumn: { tempMin: 14, tempMax: 22, precipProb: 0.20, typhoonProb: 0.01, severeConvectiveProb: 0.02, hailProb: 0.01, sandstormProb: 0 },
    winter: { tempMin: -2, tempMax: 5,  precipProb: 0.12, typhoonProb: 0,    severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.02 }
  },
  '河南': {
    spring: { tempMin: 12, tempMax: 23, precipProb: 0.22, typhoonProb: 0,    severeConvectiveProb: 0.05, hailProb: 0.02, sandstormProb: 0.02 },
    summer: { tempMin: 26, tempMax: 33, precipProb: 0.40, typhoonProb: 0.01, severeConvectiveProb: 0.12, hailProb: 0.02, sandstormProb: 0 },
    autumn: { tempMin: 14, tempMax: 23, precipProb: 0.22, typhoonProb: 0,    severeConvectiveProb: 0.02, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 0,  tempMax: 7,  precipProb: 0.10, typhoonProb: 0,    severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.01 }
  },
  '湖北': {
    spring: { tempMin: 14, tempMax: 24, precipProb: 0.35, typhoonProb: 0,    severeConvectiveProb: 0.10, hailProb: 0.02, sandstormProb: 0 },
    summer: { tempMin: 27, tempMax: 33, precipProb: 0.38, typhoonProb: 0.01, severeConvectiveProb: 0.13, hailProb: 0.02, sandstormProb: 0 },
    autumn: { tempMin: 16, tempMax: 24, precipProb: 0.28, typhoonProb: 0,    severeConvectiveProb: 0.03, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 3,  tempMax: 9,  precipProb: 0.20, typhoonProb: 0,    severeConvectiveProb: 0.01, hailProb: 0.00, sandstormProb: 0 }
  },
  '湖南': {
    spring: { tempMin: 15, tempMax: 25, precipProb: 0.50, typhoonProb: 0,    severeConvectiveProb: 0.15, hailProb: 0.03, sandstormProb: 0 },
    summer: { tempMin: 27, tempMax: 34, precipProb: 0.38, typhoonProb: 0.02, severeConvectiveProb: 0.15, hailProb: 0.02, sandstormProb: 0 },
    autumn: { tempMin: 17, tempMax: 25, precipProb: 0.30, typhoonProb: 0.01, severeConvectiveProb: 0.03, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 4,  tempMax: 9,  precipProb: 0.28, typhoonProb: 0,    severeConvectiveProb: 0.01, hailProb: 0.01, sandstormProb: 0 }
  },
  '广东': {
    spring: { tempMin: 18, tempMax: 27, precipProb: 0.45, typhoonProb: 0.02, severeConvectiveProb: 0.15, hailProb: 0.01, sandstormProb: 0 },
    summer: { tempMin: 27, tempMax: 33, precipProb: 0.45, typhoonProb: 0.10, severeConvectiveProb: 0.15, hailProb: 0.00, sandstormProb: 0 },
    autumn: { tempMin: 22, tempMax: 29, precipProb: 0.25, typhoonProb: 0.08, severeConvectiveProb: 0.05, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 12, tempMax: 18, precipProb: 0.20, typhoonProb: 0,    severeConvectiveProb: 0.01, hailProb: 0.00, sandstormProb: 0 }
  },
  '广西': {
    spring: { tempMin: 18, tempMax: 27, precipProb: 0.45, typhoonProb: 0.01, severeConvectiveProb: 0.15, hailProb: 0.02, sandstormProb: 0 },
    summer: { tempMin: 27, tempMax: 33, precipProb: 0.50, typhoonProb: 0.08, severeConvectiveProb: 0.18, hailProb: 0.01, sandstormProb: 0 },
    autumn: { tempMin: 21, tempMax: 29, precipProb: 0.25, typhoonProb: 0.06, severeConvectiveProb: 0.04, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 12, tempMax: 18, precipProb: 0.22, typhoonProb: 0,    severeConvectiveProb: 0.01, hailProb: 0.00, sandstormProb: 0 }
  },
  '海南': {
    spring: { tempMin: 23, tempMax: 30, precipProb: 0.30, typhoonProb: 0.03, severeConvectiveProb: 0.12, hailProb: 0.00, sandstormProb: 0 },
    summer: { tempMin: 26, tempMax: 33, precipProb: 0.45, typhoonProb: 0.12, severeConvectiveProb: 0.15, hailProb: 0.00, sandstormProb: 0 },
    autumn: { tempMin: 24, tempMax: 30, precipProb: 0.40, typhoonProb: 0.15, severeConvectiveProb: 0.10, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 18, tempMax: 24, precipProb: 0.20, typhoonProb: 0.01, severeConvectiveProb: 0.02, hailProb: 0.00, sandstormProb: 0 }
  },
  '重庆': {
    spring: { tempMin: 16, tempMax: 26, precipProb: 0.40, typhoonProb: 0, severeConvectiveProb: 0.10, hailProb: 0.02, sandstormProb: 0 },
    summer: { tempMin: 26, tempMax: 34, precipProb: 0.38, typhoonProb: 0, severeConvectiveProb: 0.15, hailProb: 0.02, sandstormProb: 0 },
    autumn: { tempMin: 18, tempMax: 24, precipProb: 0.38, typhoonProb: 0, severeConvectiveProb: 0.04, hailProb: 0.00, sandstormProb: 0 },
    winter: { tempMin: 7,  tempMax: 12, precipProb: 0.20, typhoonProb: 0, severeConvectiveProb: 0.01, hailProb: 0.00, sandstormProb: 0 }
  },
  '四川': {
    spring: { tempMin: 15, tempMax: 25, precipProb: 0.35, typhoonProb: 0, severeConvectiveProb: 0.08, hailProb: 0.03, sandstormProb: 0 },
    summer: { tempMin: 24, tempMax: 30, precipProb: 0.45, typhoonProb: 0, severeConvectiveProb: 0.15, hailProb: 0.03, sandstormProb: 0 },
    autumn: { tempMin: 16, tempMax: 22, precipProb: 0.40, typhoonProb: 0, severeConvectiveProb: 0.04, hailProb: 0.01, sandstormProb: 0 },
    winter: { tempMin: 5,  tempMax: 10, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0 }
  },
  '贵州': {
    spring: { tempMin: 13, tempMax: 23, precipProb: 0.45, typhoonProb: 0, severeConvectiveProb: 0.10, hailProb: 0.05, sandstormProb: 0 },
    summer: { tempMin: 22, tempMax: 28, precipProb: 0.50, typhoonProb: 0, severeConvectiveProb: 0.15, hailProb: 0.02, sandstormProb: 0 },
    autumn: { tempMin: 15, tempMax: 22, precipProb: 0.35, typhoonProb: 0, severeConvectiveProb: 0.04, hailProb: 0.01, sandstormProb: 0 },
    winter: { tempMin: 3,  tempMax: 9,  precipProb: 0.30, typhoonProb: 0, severeConvectiveProb: 0.01, hailProb: 0.01, sandstormProb: 0 }
  },
  '云南': {
    spring: { tempMin: 12, tempMax: 25, precipProb: 0.20, typhoonProb: 0, severeConvectiveProb: 0.05, hailProb: 0.04, sandstormProb: 0 },
    summer: { tempMin: 18, tempMax: 28, precipProb: 0.60, typhoonProb: 0, severeConvectiveProb: 0.12, hailProb: 0.03, sandstormProb: 0 },
    autumn: { tempMin: 15, tempMax: 25, precipProb: 0.35, typhoonProb: 0, severeConvectiveProb: 0.05, hailProb: 0.02, sandstormProb: 0 },
    winter: { tempMin: 8,  tempMax: 18, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.01, hailProb: 0.01, sandstormProb: 0 }
  },
  '西藏': {
    spring: { tempMin: 0,   tempMax: 15, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.06, sandstormProb: 0.01 },
    summer: { tempMin: 8,   tempMax: 20, precipProb: 0.50, typhoonProb: 0, severeConvectiveProb: 0.05, hailProb: 0.10, sandstormProb: 0.00 },
    autumn: { tempMin: 0,   tempMax: 15, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.04, sandstormProb: 0.00 },
    winter: { tempMin: -10, tempMax: 5,  precipProb: 0.05, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.01, sandstormProb: 0.01 }
  },
  '陕西': {
    spring: { tempMin: 10, tempMax: 22, precipProb: 0.22, typhoonProb: 0, severeConvectiveProb: 0.06, hailProb: 0.03, sandstormProb: 0.04 },
    summer: { tempMin: 22, tempMax: 32, precipProb: 0.38, typhoonProb: 0, severeConvectiveProb: 0.10, hailProb: 0.04, sandstormProb: 0.00 },
    autumn: { tempMin: 10, tempMax: 20, precipProb: 0.28, typhoonProb: 0, severeConvectiveProb: 0.03, hailProb: 0.01, sandstormProb: 0.01 },
    winter: { tempMin: -3, tempMax: 7,  precipProb: 0.08, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.02 }
  },
  '甘肃': {
    spring: { tempMin: 5,   tempMax: 18, precipProb: 0.18, typhoonProb: 0, severeConvectiveProb: 0.04, hailProb: 0.03, sandstormProb: 0.10 },
    summer: { tempMin: 18,  tempMax: 28, precipProb: 0.35, typhoonProb: 0, severeConvectiveProb: 0.08, hailProb: 0.06, sandstormProb: 0.02 },
    autumn: { tempMin: 5,   tempMax: 16, precipProb: 0.20, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.02, sandstormProb: 0.02 },
    winter: { tempMin: -10, tempMax: 3,  precipProb: 0.05, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.03 }
  },
  '青海': {
    spring: { tempMin: 0,   tempMax: 12,  precipProb: 0.20, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.05, sandstormProb: 0.05 },
    summer: { tempMin: 10,  tempMax: 22,  precipProb: 0.45, typhoonProb: 0, severeConvectiveProb: 0.06, hailProb: 0.10, sandstormProb: 0.01 },
    autumn: { tempMin: 0,   tempMax: 12,  precipProb: 0.20, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.03, sandstormProb: 0.01 },
    winter: { tempMin: -12, tempMax: 0,   precipProb: 0.05, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.01, sandstormProb: 0.03 }
  },
  '宁夏': {
    spring: { tempMin: 5,  tempMax: 18, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.03, hailProb: 0.02, sandstormProb: 0.12 },
    summer: { tempMin: 18, tempMax: 28, precipProb: 0.30, typhoonProb: 0, severeConvectiveProb: 0.06, hailProb: 0.04, sandstormProb: 0.02 },
    autumn: { tempMin: 6,  tempMax: 16, precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.01, sandstormProb: 0.02 },
    winter: { tempMin: -8, tempMax: 2,  precipProb: 0.03, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.06 }
  },
  '新疆': {
    spring: { tempMin: 5,   tempMax: 20,  precipProb: 0.15, typhoonProb: 0, severeConvectiveProb: 0.02, hailProb: 0.03, sandstormProb: 0.10 },
    summer: { tempMin: 20,  tempMax: 30,  precipProb: 0.20, typhoonProb: 0, severeConvectiveProb: 0.05, hailProb: 0.04, sandstormProb: 0.04 },
    autumn: { tempMin: 5,   tempMax: 18,  precipProb: 0.10, typhoonProb: 0, severeConvectiveProb: 0.01, hailProb: 0.01, sandstormProb: 0.03 },
    winter: { tempMin: -15, tempMax: -5,  precipProb: 0.10, typhoonProb: 0, severeConvectiveProb: 0.00, hailProb: 0.00, sandstormProb: 0.02 }
  }
};

/* =========== 气候模块API =========== */

/**
 * 根据省份名和季节获取气候数据行
 * @param {string} provinceName - 省份名（含"省"/"市"/"自治区"等后缀会被自动去除）
 * @param {string} season - 季节: 'spring'|'summer'|'autumn'|'winter'
 * @returns {object|null} 气候数据行，或 null
 */
function getClimateRow(provinceName, season) {
  if (!provinceName || !season) return null;
  // 规范化省份名：去除后缀
  let name = String(provinceName).replace(/(省|市|自治区|特别行政区)/g, '').trim();
  const table = CLIMATE_TABLE[name];
  if (!table) return null;
  return table[season] || null;
}

/**
 * 计算省份当周温度
 * @param {string} provinceName - 省份名
 * @param {number} week - 游戏周数
 * @returns {number} 温度值（保留1位小数）
 */
function calculateTemperature(provinceName, week) {
  const season = getSeasonByWeek(week);
  const row = getClimateRow(provinceName, season);
  if (!row) {
    // fallback: 默认温度
    const defaults = { spring: 18, summer: 28, autumn: 18, winter: 5 };
    return Math.round((defaults[season] || 15) * 10) / 10;
  }
  // 在 [tempMin, tempMax] 范围内随机
  const temp = uniform(row.tempMin, row.tempMax);
  return Math.round(temp * 10) / 10;
}

/**
 * 根据温度和降水概率判定天气
 * @param {string} provinceName - 省份名
 * @param {number} week - 游戏周数
 * @param {number} temperature - 当前温度（可选，不传则自动计算）
 * @returns {{ temperature: number, weather: string, season: string }}
 */
function determineWeather(provinceName, week, temperature) {
  const season = getSeasonByWeek(week);
  const row = getClimateRow(provinceName, season);

  let temp = temperature;
  if (typeof temp !== 'number') {
    temp = calculateTemperature(provinceName, week);
  }

  const precipProb = row ? row.precipProb : 0.25;
  const precipRoll = getRandom();

  let weather;
  if (precipRoll < precipProb) {
    // 降水：温度<=0 则为雪，否则为雨
    weather = (temp <= 0) ? '雪' : '雨';
  } else {
    // 无降水：70%晴，30%阴
    const skyRoll = getRandom();
    weather = (skyRoll < 0.7) ? '晴' : '阴';
  }

  // 北方冬季额外雪概率
  if (season === 'winter' && weather === '雨' && temp <= 2 && getRandom() < 0.5) {
    weather = '雪';
  }

  return { temperature: temp, weather, season };
}

/**
 * 判断某个天气事件是否应在本周触发
 * @param {string} provinceName - 省份名
 * @param {number} week - 游戏周数
 * @param {string} eventType - 事件类型: 'typhoon'|'severe_convective'|'hail'|'sandstorm'
 * @returns {boolean}
 */
function shouldTriggerWeatherEvent(provinceName, week, eventType) {
  const season = getSeasonByWeek(week);
  const row = getClimateRow(provinceName, season);
  if (!row) return false;

  let prob = 0;
  switch (eventType) {
    case 'typhoon': prob = row.typhoonProb; break;
    case 'severe_convective': prob = row.severeConvectiveProb; break;
    case 'hail': prob = row.hailProb; break;
    case 'sandstorm': prob = row.sandstormProb; break;
    default: return false;
  }

  if (prob <= 0) return false;
  return getRandom() < prob;
}

/**
 * 获取省份的季节信息（温度范围、各事件概率等）
 * @param {string} provinceName
 * @param {number} week
 * @returns {object} { season, temperature, weather, climateRow }
 */
function getProvinceClimateInfo(provinceName, week) {
  const season = getSeasonByWeek(week);
  const row = getClimateRow(provinceName, season);
  const temp = calculateTemperature(provinceName, week);
  const weatherResult = determineWeather(provinceName, week, temp);
  return {
    season,
    temperature: weatherResult.temperature,
    weather: weatherResult.weather,
    climateRow: row
  };
}

/* 导出到全局 */
if (typeof window !== 'undefined') {
  window.getSeasonByWeek = getSeasonByWeek;
  window.CLIMATE_TABLE = CLIMATE_TABLE;
  window.getClimateRow = getClimateRow;
  window.calculateTemperature = calculateTemperature;
  window.determineWeather = determineWeather;
  window.shouldTriggerWeatherEvent = shouldTriggerWeatherEvent;
  window.getProvinceClimateInfo = getProvinceClimateInfo;
}
