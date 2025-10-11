/* models.js - Student / Facilities / GameState / competitions 构建 */
// 依赖：constants.js, utils.js

class Student {
  constructor(name,thinking,coding,mental){
    this.name=name; this.thinking=thinking; this.coding=coding; this.mental=mental;
    this.knowledge_ds=uniformInt(0,3)|0;
    this.knowledge_graph=uniformInt(0,3)|0;
    this.knowledge_string=uniformInt(0,3)|0;
    this.knowledge_math=uniformInt(0,3)|0;
    this.knowledge_dp=uniformInt(0,3)|0;
    this.pressure=20; this.comfort=50;
    this.burnout_weeks=0; this.depression_count=0; this.high_pressure_weeks=0;
    this.active=true; this.sick_weeks=0;
  }
  getAbilityAvg(){ return (this.thinking + this.coding + this.mental)/3.0; }
  getKnowledgeTotal(){ return (this.knowledge_ds + this.knowledge_graph + this.knowledge_string + this.knowledge_math + this.knowledge_dp)/5.0; }
  getComprehensiveAbility(){
    let ability_avg = this.getAbilityAvg();
    let knowledge_total = this.getKnowledgeTotal();
    return ABILITY_WEIGHT*ability_avg + KNOWLEDGE_WEIGHT*knowledge_total;
  }
  getMentalIndex(){
    let noise = normal(0,3.0);
    let result = this.mental - ALPHA1*(this.pressure/100.0)*(1 - this.comfort/100.0) + noise;
    return clamp(result,0,100);
  }
  getPerformanceScore(difficulty,maxScore,knowledge_value){
    let comprehensive = this.getComprehensiveAbility();
    let mental_idx = this.getMentalIndex();
    let knowledge_bonus = knowledge_value * 2.0; // 与 C++ 相同
    let effective_ability = comprehensive + knowledge_bonus;
    let performance_ratio = sigmoid((effective_ability - difficulty)/10.0);
    let stability_factor = mental_idx/100.0;
    let base_noise = 0.05;
    let sigma_performance = (100 - mental_idx)/200.0 + base_noise;
    let random_factor = normal(0, sigma_performance);
    let final_ratio = performance_ratio * stability_factor * (1 + random_factor);
    final_ratio = clamp(final_ratio,0,1);
    return Math.max(0, final_ratio * maxScore);
  }
  calculateKnowledgeGain(base_gain, facility_bonus, sick_penalty){
    let learning_efficiency = (0.6*(this.thinking/100.0) + 0.4)*(1.0 - this.pressure / FATIGUE_FROM_PRESSURE);
    return Math.floor(base_gain * learning_efficiency * facility_bonus * sick_penalty);
  }
  getKnowledgeByType(type){
    if(type==='数据结构') return this.knowledge_ds;
    if(type==='图论') return this.knowledge_graph;
    if(type==='字符串') return this.knowledge_string;
    if(type==='数学') return this.knowledge_math;
    if(type==='DP' || type==='动态规划') return this.knowledge_dp;
    return 0;
  }
  addKnowledge(type,amount){
    if(type==='数据结构') this.knowledge_ds += amount;
    else if(type==='图论') this.knowledge_graph += amount;
    else if(type==='字符串') this.knowledge_string += amount;
    else if(type==='数学') this.knowledge_math += amount;
    else if(type==='DP' || type==='动态规划') this.knowledge_dp += amount;
  }
}

class Facilities {
  constructor(){ this.computer=1; this.ac=1; this.dorm=1; this.library=1; this.canteen=1; }
  getComputerEfficiency(){ return 1.0 + COMPUTER_EFFICIENCY_PER_LEVEL * (this.computer - 1); }
  getLibraryEfficiency(){ return 1.0 + LIBRARY_EFFICIENCY_PER_LEVEL * (this.library - 1); }
  getCanteenPressureReduction(){ return 1.0 - CANTEEN_PRESSURE_REDUCTION_PER_LEVEL * (this.canteen - 1); }
  getDormComfortBonus(){ return DORM_COMFORT_BONUS_PER_LEVEL * (this.dorm - 1); }
  getUpgradeCost(fac){
    let it = FACILITY_UPGRADE_COSTS[fac];
    if(!it) return 0;
    let level = this.getCurrentLevel(fac);
    return Math.floor(it.base * Math.pow(it.grow, level - 1));
  }
  getMaxLevel(fac){
    if(fac==='computer'||fac==='library') return MAX_COMPUTER_LEVEL;
    return MAX_OTHER_FACILITY_LEVEL;
  }
  getCurrentLevel(fac){
    if(fac==='computer') return this.computer;
    if(fac==='library') return this.library;
    if(fac==='ac') return this.ac;
    if(fac==='dorm') return this.dorm;
    if(fac==='canteen') return this.canteen;
    return 0;
  }
  upgrade(fac){
    if(fac==='computer') this.computer++;
    else if(fac==='library') this.library++;
    else if(fac==='ac') this.ac++;
    else if(fac==='dorm') this.dorm++;
    else if(fac==='canteen') this.canteen++;
  }
  getMaintenanceCost(){
    let total = this.computer + this.ac + this.dorm + this.library + this.canteen;
    return Math.floor(100 * Math.pow(total,1.2));
  }
}

class GameState {
  constructor(){
    this.students=[];
    this.facilities=new Facilities();
    this.budget=100000;
    this.week=1;
    this.reputation=50;
    this.temperature=20;
    this.weather="晴";
    this.province_name="";
    this.province_type="";
    this.is_north=false;
    this.difficulty=2;
    this.base_comfort=50;
    this.initial_students=0;
    this.quit_students=0;
    this.had_good_result_recently=false;
    this.weeks_since_entertainment=0;
    this.weeks_since_good_result=0;
    this.noi_rankings=[];
    this.teaching_points=NORMAL_MODE_TEACHING_POINTS;
    this.qualification = [ {}, {} ];
    for(let name of COMPETITION_ORDER){ this.qualification[0][name] = new Set(); this.qualification[1][name] = new Set(); }
    this.seasonEndTriggered = false;
    this.completedCompetitions = new Set();
    this.careerCompetitions = [];
  }
  getWeatherFactor(){
    let factor=1.0;
    let extreme_temp = (this.temperature < EXTREME_COLD_THRESHOLD || this.temperature > EXTREME_HOT_THRESHOLD);
    if(extreme_temp){
      if(this.facilities.ac===1) factor = 1.5;
      if(this.facilities.ac===1 && this.facilities.dorm===1) factor = 2.0;
    }
    return factor;
  }
  getComfort(){
    let comfort = this.base_comfort;
    comfort += this.facilities.getDormComfortBonus();
    comfort += AC_COMFORT_BONUS_PER_LEVEL * (this.facilities.ac - 1);
    comfort += 3 * (this.facilities.canteen - 1);
    let weather_penalty = 0;
    if(this.temperature < EXTREME_COLD_THRESHOLD || this.temperature > EXTREME_HOT_THRESHOLD){
      weather_penalty = WEATHER_PENALTY_WITH_AC;
      if(this.facilities.ac === 1) weather_penalty = WEATHER_PENALTY_NO_AC;
    }
    return clamp(comfort - weather_penalty, 0, 100);
  }
  getWeeklyCost(){
    let active_count = this.students.filter(s=>s.active).length;
    return 1000 + 50*active_count + this.facilities.getMaintenanceCost();
  }
  getDifficultyModifier(){ if(this.difficulty===1) return 0.9; if(this.difficulty===3) return 1.1; return 1.0; }
  getNextCompetition(){ if(Array.isArray(competitions) && competitions.length > 0){ const sorted = competitions.slice().sort((a, b) => a.week - b.week); const next = sorted.find(c => c.week > this.week); if(next){ let weeks_left = next.week - this.week; return next.name + ` (还有${weeks_left}周)`; } } return "无"; }
  updateWeather(){
    if(this.week >=1 && this.week <= 13){ if(this.is_north) this.temperature = uniform(15,28); else this.temperature = uniform(22,36); }
    else if(this.week >=14 && this.week <= 26){ if(this.is_north) this.temperature = uniform(-5,10); else this.temperature = uniform(8,20); }
    else if(this.week >=27 && this.week <= 39){ if(this.is_north) this.temperature = uniform(-10,5); else this.temperature = uniform(5,18); }
    else { if(this.is_north) this.temperature = uniform(8,25); else this.temperature = uniform(15,30); }
    let roll = Math.random();
    if(roll < 0.65) this.weather="晴";
    else if(roll < 0.80) this.weather="阴";
    else if(roll < 0.93) this.weather="雨";
    else this.weather="雪";
    if(this.is_north && this.week >=27 && this.week <=39 && Math.random()<0.3) this.weather="雪";
  }
  getFutureExpense(){ const weekly = this.getWeeklyCost(); const activeCount = Array.isArray(this.students) ? this.students.filter(s=>s.active).length : 0; const mult = activeCount * 0.3; return Math.round(weekly * 4 * mult); }
  getExpenseMultiplier(){ try{ const activeCount = Array.isArray(this.students) ? this.students.filter(s=>s.active).length : 0; return Math.max(0, activeCount * 0.3); }catch(e){ return 1.0; } }
  getWeatherDescription(){ let desc = this.weather; if(this.weather==="雪") desc += " ❄️"; else if(this.weather==="雨") desc += " 🌧️"; else if(this.weather==="晴") desc += " ☀️"; else desc += " ☁️"; if(this.temperature < 0) desc += " (极寒)"; else if(this.temperature < 10) desc += " (寒冷)"; else if(this.temperature < 20) desc += " (凉爽)"; else if(this.temperature < 30) desc += " (温暖)"; else desc += " (炎热)"; return desc; }
}

/* =========== 比赛数据复刻（两赛季） =========== */
const WEEKS_PER_HALF = Math.floor(SEASON_WEEKS / 2);
let competitions = [];
if(Array.isArray(COMPETITION_SCHEDULE)){
  const totalOrig = ORIGINAL_SEASON_WEEKS;
  const firstHalfSize = WEEKS_PER_HALF;
  const secondHalfSize = SEASON_WEEKS - WEEKS_PER_HALF;
  for (let name of COMPETITION_ORDER) {
    const src = COMPETITION_SCHEDULE.find(c => c.name === name);
    if (!src) continue;
    const p = (src.week - 1) / Math.max(1, (totalOrig - 1));
    let newWeek = 1 + Math.round(p * Math.max(0, firstHalfSize - 1));
    if (newWeek < 1) newWeek = 1;
    if (newWeek > firstHalfSize) newWeek = firstHalfSize;
    let copy = Object.assign({}, src);
    copy.week = newWeek;
    competitions.push(copy);
  }
  for (let name of COMPETITION_ORDER) {
    const src = COMPETITION_SCHEDULE.find(c => c.name === name);
    if (!src) continue;
    const p = (src.week - 1) / Math.max(1, (totalOrig - 1));
    let newWeek2 = WEEKS_PER_HALF + 1 + Math.round(p * Math.max(0, secondHalfSize - 1));
    if (newWeek2 < WEEKS_PER_HALF + 1) newWeek2 = WEEKS_PER_HALF + 1;
    if (newWeek2 > SEASON_WEEKS) newWeek2 = SEASON_WEEKS;
    let copy = Object.assign({}, src);
    copy.week = newWeek2;
    competitions.push(copy);
  }
} else { competitions = []; }

/* 全局导出（保持与旧代码兼容的全局变量） */
window.Student = Student;
window.Facilities = Facilities;
window.GameState = GameState;
window.competitions = competitions;
window.WEEKS_PER_HALF = WEEKS_PER_HALF;
