/*
  game.js: 核心游戏逻辑
  包含游戏状态管理、回合更新、训练、比赛、事件处理等。
*/

// 避免在脚本加载时使用未初始化的局部 `game`（会触发 TDZ）。
// 使用 `window.game` 作为全局持有者，并在需要时懒初始化。
if(typeof window.game === 'undefined' || !window.game){
  try{ window.game = new GameState(); }catch(e){ /* 如果 GameState 不可用，保留为 undefined，稍后在 onload 中处理 */ }
}
// 局部引用始终通过 window.game 访问，避免在全局初始化顺序问题上抛错
let game = window.game;

const currWeek = () => (game?.week) || 0;

// 将事件推入突发事件卡片（并保留日志）
const recentEvents = [];
// 为每个事件生成唯一ID的计数器
let _eventIdCounter = 0;

function pushEvent(msg){
  const wkDefault = currWeek();
  const ev = (typeof msg === 'string') 
    ? { name: null, description: msg, week: wkDefault }
    : { 
        name: msg.name || null, 
        description: msg.description || msg.text || '', 
        week: msg.week || wkDefault,
        options: msg.options || null,  // 支持选项
        eventId: msg.eventId || null   // 用于区分同一事件的不同实例
      };

  // 为每个事件分配唯一的内部ID
  ev._uid = ++_eventIdCounter;

  log(`${ev.name ? ev.name + '：' : ''}${ev.description}`);
  
  const key = `${ev.week}::${ev.name||''}::${ev.description||''}::${ev.eventId||''}`;
  if(!recentEvents.some(r => `${r.week}::${r.name||''}::${r.description||''}::${r.eventId||''}` === key)){
    recentEvents.unshift(ev);
    if(recentEvents.length > 24) recentEvents.pop();
  }
  renderEventCards();
}

// 弱化人数影响的缩放函数
function scaledPassCount(n){
  n = Number(n) || 0;
  if(n <= 0) return 0;
  return Math.max(1, Math.floor(Math.sqrt(n)));
}

// ===== 状态快照与差异汇总工具 =====
function __createSnapshot(){
  return {
    budget: game.budget || 0,
    reputation: game.reputation || 0,
    students: game.students.map(s=>({
      name: s.name,
      active: (s && s.active !== false),
      pressure: Number((s.pressure||0).toFixed(2)),
      thinking: Number((s.thinking||0).toFixed(2)),
      coding: Number((s.coding||0).toFixed(2)),
      knowledge_ds: Number((s.knowledge_ds||0).toFixed(2)),
      knowledge_graph: Number((s.knowledge_graph||0).toFixed(2)),
      knowledge_string: Number((s.knowledge_string||0).toFixed(2)),
      knowledge_math: Number((s.knowledge_math||0).toFixed(2)),
      knowledge_dp: Number((s.knowledge_dp||0).toFixed(2)),
      knowledge: Number(s.getKnowledgeTotal?.() || ((s.knowledge_ds||0)+(s.knowledge_graph||0)+(s.knowledge_string||0)+(s_knowledge_math||0)+(s.knowledge_dp||0)))
    }))
  };
}

function __summarizeSnapshot(before, after, title, opts){
  try{
    opts = opts || {};
    const parts = [];
    const db = (after.budget||0) - (before.budget||0);
    if(db !== 0) parts.push(`经费 ${db>0?'+':'-'}¥${Math.abs(db)}`);
    const dr = (after.reputation||0) - (before.reputation||0);
    if(dr !== 0) parts.push(`声誉 ${dr>0?'+':''}${dr}`);

    const beforeMap = new Map(before.students.map(s => [s.name, s]));
    const afterMap = new Map(after.students.map(s => [s.name, s]));

    const added = [...afterMap.keys()].filter(n => !beforeMap.has(n));
    if(added.length) parts.push(`加入: ${added.join('、')}`);
    
    const removed = [...beforeMap.keys()].filter(n => !afterMap.has(n));
    if(removed.length) parts.push(`退队: ${removed.join('、')}`);

    const stuParts = [];
    for(const [name, beforeS] of beforeMap){
      const afterS = afterMap.get(name);
      if(!afterS) continue;
      const changes = [];
      const dP = Number((afterS.pressure - beforeS.pressure).toFixed(2));
      const dT = Number((afterS.thinking - beforeS.thinking).toFixed(2));
      const dC = Number((afterS.coding - beforeS.coding).toFixed(2));
      const dK = Number((afterS.knowledge - beforeS.knowledge).toFixed(2));
      if(dP !== 0) changes.push(`压力 ${dP>0?'+':''}${dP}`);
      if(dT !== 0) changes.push(`思维 ${dT>0?'+':''}${dT}`);
      if(dC !== 0) changes.push(`编程 ${dC>0?'+':''}${dC}`);
      const dDS = Number(((afterS.knowledge_ds || 0) - (beforeS.knowledge_ds || 0)).toFixed(2));
      const dGraph = Number(((afterS.knowledge_graph || 0) - (beforeS.knowledge_graph || 0)).toFixed(2));
      const dStr = Number(((afterS.knowledge_string || 0) - (beforeS.knowledge_string || 0)).toFixed(2));
      const dMath = Number(((afterS.knowledge_math || 0) - (beforeS.knowledge_math || 0)).toFixed(2));
      const dDP = Number(((afterS.knowledge_dp || 0) - (beforeS.knowledge_dp || 0)).toFixed(2));
      if(dDS !== 0) changes.push(`数据结构 ${dDS>0?'+':''}${dDS}`);
      if(dGraph !== 0) changes.push(`图论 ${dGraph>0?'+':''}${dGraph}`);
      if(dStr !== 0) changes.push(`字符串 ${dStr>0?'+':''}${dStr}`);
      if(dMath !== 0) changes.push(`数学 ${dMath>0?'+':''}${dMath}`);
      if(dDP !== 0) changes.push(`DP ${dDP>0?'+':''}${dDP}`);
      if(dK !== 0 && !(dDS !==0 || dGraph !==0 || dStr !==0 || dMath !==0 || dDP !==0)) changes.push(`知识 ${dK>0?'+':''}${dK}`);
      if(changes.length) stuParts.push(`${name}: ${changes.join('，')}`);
    }
    if(stuParts.length) parts.push(stuParts.join('； '));

    const summary = parts.length ? parts.join('； ') : '无显著变化';
    if (!opts.suppressPush) {
      pushEvent({ name: title || '变动汇总', description: summary, week: currWeek() });
    }
    return summary;
  }catch(e){ console.error('summarize error', e); return null; }
}

window.__createSnapshot = __createSnapshot;
window.__summarizeSnapshot = __summarizeSnapshot;

function hasPendingRequiredEvents(){
  try{
    return recentEvents.some(ev => ev && ev.options && ev.options.length > 0 && !ev._isHandled);
  }catch(e){ return false; }
}

function handleEventChoice(event) {
  const button = event.target.closest('.event-choice-btn');
  if (!button) return;

  const eventUid = parseInt(button.dataset.eventUid, 10);
  const optionIndex = parseInt(button.dataset.optionIndex, 10);

  if (isNaN(eventUid) || isNaN(optionIndex)) return;

  const targetEvent = recentEvents.find(e => e._uid === eventUid);
  if (!targetEvent || targetEvent._isHandled) return;

  targetEvent._isHandled = true;

  const card = button.closest('.event-card');
  if (card) {
    card.querySelectorAll('.event-choice-btn').forEach(btn => {
      btn.disabled = true;
      btn.classList.add('disabled');
    });
  }

  const option = targetEvent.options[optionIndex];
  try {
    if (option && typeof option.effect === 'function') {
      option.effect();
    }
  } catch (err) {
    console.error('执行事件选项效果时出错:', err);
  }

  try {
    if (game && game.suppressEventModalOnce) {
      game.suppressEventModalOnce = false;
    }
  } catch (err) {}

  renderEventCards();
  safeRenderAll();
}

// 压力预计算函数：用于在训练前预测压力变化
function calculateTrainingPressure(task, intensity) {
  try {
    let weather_factor = game.getWeatherFactor();
    let comfort = game.getComfort();
    let comfort_factor = 1.0 + Math.max(0.0, (50 - comfort) / 100.0);
    
    let hasQuitRisk = false;
    let hasHighPressure = false;
    
    for(let s of game.students) {
      if(!s || s.active === false) continue;
      
      let personalComfort = comfort;
      
      if(s.talents && s.talents.has('天气敏感')){
        const baseComfort = game.base_comfort;
        const weatherEffect = comfort - baseComfort;
        personalComfort = baseComfort + weatherEffect * 2;
        personalComfort = Math.max(0, Math.min(100, personalComfort));
      }
      
      /* 美食家天赋：享受设施舒适度1.5倍加成 */
      if(s.talents && s.talents.has('美食家')){
        const facilityComfort = game.facilities.getComfortBonus();
        personalComfort += facilityComfort * 0.5;
        personalComfort = Math.max(0, Math.min(100, personalComfort));
      }
      
      const studentAbility = (s.thinking + s.coding) / 2.0;
      let base_pressure = (intensity===1) ? 15 : (intensity===2) ? 25 : 40;
      
      const difficultyPressure = Math.max(0, (task.difficulty - studentAbility) * 0.2);
      base_pressure += difficultyPressure;
      
      if(intensity===3) base_pressure *= TRAINING_PRESSURE_MULTIPLIER_HEAVY;
      else if(intensity===2) base_pressure *= TRAINING_PRESSURE_MULTIPLIER_MEDIUM;
      
      let pressure_increase = base_pressure * weather_factor * comfort_factor;
      if(s.sick_weeks > 0) pressure_increase += 10;
      
      pressure_increase *= (typeof PRESSURE_INCREASE_MULTIPLIER !== 'undefined' ? PRESSURE_INCREASE_MULTIPLIER : 1.0);
      
      // 考虑天赋的压力修正
      let finalPressureIncrease = pressure_increase;
      try{
        if(typeof s.triggerTalents === 'function'){
          const talentResults = s.triggerTalents('pressure_change', { 
            source: 'task_training', 
            amount: pressure_increase, 
            task: task, 
            intensity: intensity,
            preview: true  // 标记为预览模式
          }) || [];
          
          for(const r of talentResults){
            if(!r || !r.result) continue;
            const out = r.result;
            if(typeof out === 'object'){
              const act = out.action;
              if(act === 'moyu_cancel_pressure'){
                finalPressureIncrease = 0;
              } else if(act === 'halve_pressure'){
                finalPressureIncrease = finalPressureIncrease * 0.5;
              } else if(act === 'double_pressure'){
                finalPressureIncrease = finalPressureIncrease * 2.0;
              }
            }
          }
        }
      }catch(e){ /* ignore */ }
      
      const predictedPressure = s.pressure + finalPressureIncrease;
      
      // 检查退队风险：
      // 1. 如果预测压力>=90，且学生已有退队倾向（quit_tendency_weeks >= 1），下周将退队
      // 2. 如果预测压力>=90，即使没有退队倾向，也是高风险（会获得退队倾向）
      const currentQuitWeeks = s.quit_tendency_weeks || 0;
      
      if(predictedPressure >= 90) {
        // 压力将达到90+，这是退队风险
        if(currentQuitWeeks >= 1) {
          // 已有退队倾向，下周将退队
          hasQuitRisk = true;
        } else {
          // 会新获得退队倾向，也标记为退队风险
          hasQuitRisk = true;
        }
      } else if(predictedPressure >= 70) {
        // 高压力但未达退队阈值
        hasHighPressure = true;
      }
    }
    
    return {
      hasQuitRisk: hasQuitRisk,
      hasHighPressure: hasHighPressure
    };
  } catch(e) {
    console.error('calculateTrainingPressure error', e);
    return { hasQuitRisk: false, hasHighPressure: false };
  }
}

function trainStudentsWithTask(task, intensity) {
  log(`开始做题训练：${task.name}（难度${task.difficulty}，强度${intensity===1?'轻':intensity===2?'中':'重'}）`);
  const __before = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  
  let weather_factor = game.getWeatherFactor();
  let comfort = game.getComfort();
  let comfort_factor = 1.0 + Math.max(0.0, (50 - comfort) / 100.0);
  
  const trainingResults = [];
  
  for(let s of game.students) {
  if(!s || s.active === false) continue;
    
    let personalComfort = comfort;
    
    if(s.talents && s.talents.has('天气敏感')){
      const baseComfort = game.base_comfort;
      const weatherEffect = comfort - baseComfort;
      personalComfort = baseComfort + weatherEffect * 2;
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    /* 美食家天赋：享受设施舒适度1.5倍加成 */
    if(s.talents && s.talents.has('美食家')){
      const facilityComfort = game.facilities.getComfortBonus();
      personalComfort += facilityComfort * 0.5;
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    // 应用事件产生的临时修正值
    if(typeof s.comfort_modifier === 'number'){
      personalComfort += s.comfort_modifier;
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    s.comfort = personalComfort;
    
    let sick_penalty = (s.sick_weeks > 0) ? 0.7 : 1.0;
    
    const studentAbility = (s.thinking + s.coding) / 2.0;
    
    const boostMultiplier = calculateBoostMultiplier(studentAbility, task.difficulty);
    
    const results = applyTaskBoosts(s, task);
    
    /* 资料库：训练效果（知识）乘区 */
    const libraryMultiplier = game.facilities.getLibraryMultiplier();
    
    const intensityFactor = intensity === 1 ? 0.7 : intensity === 3 ? 1.3 : 1.0;
    
    // 应用知识点增加：基础效率加成 + 资料库加成 + 强度系数 + 生病惩罚
    for(const boost of results.boosts) {
      // 计算总的知识点增加（包含所有加成因素）
      const totalBoost = Math.floor(boost.actualAmount * libraryMultiplier * intensityFactor * sick_penalty);
      s.addKnowledge(boost.type, totalBoost);
      // 更新 actualAmount 为实际增加量，以便日志正确显示
      boost.actualAmount = totalBoost;
    }
    
    /* 计算机：训练效果（思维/代码）乘区 */
    const computerMultiplier = game.facilities.getComputerMultiplier();
    
    const abilityGainBase = boostMultiplier * intensityFactor * (1 - Math.min(0.6, s.pressure/200.0));
    const thinkingGain = uniform(0.6, 1.5) * abilityGainBase * computerMultiplier * (typeof TRAINING_EFFECT_MULTIPLIER !== 'undefined' ? TRAINING_EFFECT_MULTIPLIER : 1.0);
    const codingGain = uniform(1, 2.5) * abilityGainBase * computerMultiplier * (typeof TRAINING_EFFECT_MULTIPLIER !== 'undefined' ? TRAINING_EFFECT_MULTIPLIER : 1.0);
    
    s.thinking += thinkingGain;
    s.coding += codingGain;
    s.thinking = (s.thinking || 0);
    s.coding = (s.coding || 0);
    
    let base_pressure = (intensity===1) ? 15 : (intensity===2) ? 25 : 40;
    
    const difficultyPressure = Math.max(0, (task.difficulty - studentAbility) * 0.2);
    base_pressure += difficultyPressure;
    
    if(intensity===3) base_pressure *= TRAINING_PRESSURE_MULTIPLIER_HEAVY;
    else if(intensity===2) base_pressure *= TRAINING_PRESSURE_MULTIPLIER_MEDIUM;
    
    let pressure_increase = base_pressure * weather_factor * comfort_factor;
    if(s.sick_weeks > 0) pressure_increase += 10;
    
    pressure_increase *= (typeof PRESSURE_INCREASE_MULTIPLIER !== 'undefined' ? PRESSURE_INCREASE_MULTIPLIER : 1.0);
    
    let finalPressureIncrease = pressure_increase;
    try{
      if(typeof s.triggerTalents === 'function'){
        const talentResults = s.triggerTalents('pressure_change', { 
          source: 'task_training', 
          amount: pressure_increase, 
          task: task, 
          intensity: intensity 
        }) || [];
        
        for(const r of talentResults){
          if(!r || !r.result) continue;
          const out = r.result;
          if(typeof out === 'object'){
            const act = out.action;
            if(act === 'moyu_cancel_pressure'){
              finalPressureIncrease = 0;
            } else if(act === 'halve_pressure'){
              finalPressureIncrease = finalPressureIncrease * 0.5;
            } else if(act === 'double_pressure'){
              finalPressureIncrease = finalPressureIncrease * 2.0;
            }
          }
        }
      }
    }catch(e){ console.error('triggerTalents pressure_change', e); }
    
    // 应用事件产生的临时压力修正值
    let totalPressureChange = finalPressureIncrease;
    if(typeof s.pressure_modifier === 'number'){
      totalPressureChange += s.pressure_modifier;
      s.pressure_modifier = 0; // 训练后清除压力修正（已应用）
    }
    
    s.pressure += totalPressureChange;
    
    trainingResults.push({
      name: s.name,
      multiplier: boostMultiplier,
      boosts: results.boosts
    });
  }
  
  game.weeks_since_entertainment += 1;
  
  log(`训练结束。题目：${task.name}`);

  try{
    if(typeof window !== 'undefined' && window.TalentManager && typeof window.TalentManager.tryAcquireTalent === 'function'){
  for(let s of game.students){ if(s && s.active !== false) try{ window.TalentManager.tryAcquireTalent(s, (typeof intensity !== 'undefined' ? (intensity===3?0.8:(intensity===2?0.4:0.2)) : 0.4)); }catch(e){} }
    }
  }catch(e){ console.error('post-task-training tryAcquireTalent error', e); }
  for(const result of trainingResults) {
    const boostStrs = result.boosts.map(b => `${b.type}+${b.actualAmount}`).join(', ');
    const effPercent = Math.round(result.multiplier * 100);
    log(`  ${result.name}: 效率${effPercent}% [${boostStrs}]`);
  }
  
  const __after = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  if(__before && __after) __summarizeSnapshot(__before, __after, `做题训练：${task.name}`);

  try{ game.lastTrainingFinishedWeek = game.week; }catch(e){}
  try{ checkRandomEvents(); }catch(e){ console.error('post-training checkRandomEvents failed', e); }
}

function simulateHiddenMockScore(s, diffIdx){
  const knowledge_types = ["数据结构","图论","字符串","数学","动态规划"];
  let total = 0;
  for(let qi=0; qi<4; qi++){
    const num_tags = uniformInt(1,3);
    const selected = [];
    while(selected.length < num_tags){
      const idx = uniformInt(0,4);
      if(!selected.includes(knowledge_types[idx])) selected.push(knowledge_types[idx]);
    }
    const totalK = selected.reduce((sum, t) => sum + s.getKnowledgeByType(t), 0);
    const avgK = selected.length > 0 ? Math.floor(totalK / selected.length) : 0;
    const ability_avg = s.getAbilityAvg();
    const mental_idx = s.getMentalIndex();
    const difficulty_proxy = MOCK_CONTEST_DIFF_VALUES[diffIdx] || 30;
    
    const perf = sigmoid((ability_avg + avgK * 3.5) / 15.0);
    const stability = mental_idx / 100.0;
    const sigma = (100 - mental_idx) / 150.0 + 0.08;
    const random_factor = normal(0, sigma);
    const final_ratio = clamp(perf * stability * (1 + random_factor) * sigmoid((ability_avg + avgK * 3.5 - difficulty_proxy) / 10.0), 0, 1);
    
    total += clampInt(Math.floor(final_ratio * 100 / 10) * 10, 0, 100);
  }
  return total;
}

function computeOutingCostQuadratic(difficulty_choice, province_choice, participantCount){
  const DIFF_COST_PENALTY = {1:100, 2:300, 3:600};
  const base = (difficulty_choice === 2) ? OUTFIT_BASE_COST_INTERMEDIATE : 
               (difficulty_choice === 3) ? OUTFIT_BASE_COST_ADVANCED : 
               OUTFIT_BASE_COST_BASIC;
  const target = PROVINCES[province_choice] || {type: '普通省'};
  
  let adjustedBase = base;
  if (target.type === '强省') {
    adjustedBase = Math.floor(adjustedBase * STRONG_PROVINCE_COST_MULTIPLIER);
  } else if (target.type === '弱省') {
    adjustedBase = Math.floor(adjustedBase * WEAK_PROVINCE_COST_MULTIPLIER);
  }

  const n = Math.max(0, Number(participantCount || 0));
  const diffPenalty = DIFF_COST_PENALTY[difficulty_choice] || 100;

  try {
    const rep = (typeof game !== 'undefined' && game && typeof game.reputation === 'number') 
      ? clamp(game.reputation, 0, 100) 
      : 0;
    const raw = Math.max(0, Math.floor(adjustedBase + 18000 * n + diffPenalty));
    
  const maxDiscount = (typeof OUTFIT_REPUTATION_DISCOUNT !== 'undefined') ? OUTFIT_REPUTATION_DISCOUNT : 0.30;
  const multiplier = (typeof OUTFIT_REPUTATION_DISCOUNT_MULTIPLIER !== 'undefined') ? OUTFIT_REPUTATION_DISCOUNT_MULTIPLIER : 1.0;
  // 限制折扣最多为 50%，防止声誉过高导致免费
  const discount = Math.min(0.50, (rep / 100.0) * maxDiscount * multiplier);
  const finalCost = Math.max(0, Math.floor(raw * (1.0 - discount)));
    return finalCost;
  } catch (e) {
    console.error('computeOutingCostQuadratic error', e);
    return Math.max(0, Math.floor(adjustedBase + 20000 * n + diffPenalty));
  }
}

function outingTrainingWithSelection(difficulty_choice, province_choice, selectedNames, inspireTalents){
  const target = PROVINCES[province_choice];
  const __before = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  const selectedStudents = game.students.filter(s => s && s.active && selectedNames.includes(s.name));
  const participantCount = selectedStudents.length;
  let final_cost = computeOutingCostQuadratic(difficulty_choice, province_choice, participantCount);
  
  inspireTalents = inspireTalents || [];
  const talentInspireCost = inspireTalents.length * 12000;
  final_cost += talentInspireCost;

  try{
    let totalReduction = 0;
    const reductions = [];
    for(let s of selectedStudents){
      try{
        let results = null;
        if(s && typeof s.triggerTalents === 'function'){
          results = s.triggerTalents('outing_cost_calculate', { province: target.name, difficulty: difficulty_choice, participantCount });
        } else if(typeof window !== 'undefined' && window.TalentManager && typeof window.TalentManager.handleStudentEvent === 'function'){
          results = window.TalentManager.handleStudentEvent(s, 'outing_cost_calculate', { province: target.name, difficulty: difficulty_choice, participantCount });
        }
        if(Array.isArray(results)){
          for(const r of results){
            const res = r && r.result ? r.result : r;
            if(res && res.action === 'reduce_outing_cost' && typeof res.amount === 'number'){
              totalReduction += Number(res.amount) || 0;
              reductions.push({ student: s.name, amount: Number(res.amount), message: res.message });
            }
          }
        }
      }catch(e){ console.error('outing cost talent check error for', s && s.name, e); }
    }
    if(totalReduction > 0){
      const applied = Math.min(final_cost, Math.floor(totalReduction));
      final_cost = Math.max(0, final_cost - applied);
      try{ if(window.pushEvent) window.pushEvent({ name: '集训经费减免', description: `天赋导致集训费用减少 ¥${applied}（来自: ${reductions.map(r=>r.student+':'+'¥'+r.amount).join(', ')}）`, week: game.week }); }catch(e){}
      log(`集训经费减免：共 -¥${applied}（明细: ${reductions.map(r=>r.student+':'+'¥'+r.amount).join(', ')})`);
    }
  }catch(e){ console.error('collect outing cost reductions error', e); }

  if(game.budget < final_cost){ alert("经费不足，无法外出集训！"); return; }
  game.recordExpense(final_cost, `外出集训：${target.name}`);
  log(`外出集训：${target.name} (${target.type})，难度:${difficulty_choice}，参与人数:${participantCount}，费用 ¥${final_cost}`);

  const DIFFIDX_MAP = {1:0, 2:1, 3:4};
  const diffIdxForHidden = DIFFIDX_MAP[difficulty_choice] || 0;

  for(let s of selectedStudents){
    let hiddenScore = simulateHiddenMockScore(s, diffIdxForHidden);

    let knowledge_base = (difficulty_choice===2) ? OUTFIT_KNOWLEDGE_BASE_INTERMEDIATE : (difficulty_choice===3) ? OUTFIT_KNOWLEDGE_BASE_ADVANCED : OUTFIT_KNOWLEDGE_BASE_BASIC;
    let ability_base = (difficulty_choice===2) ? OUTFIT_ABILITY_BASE_INTERMEDIATE : (difficulty_choice===3) ? OUTFIT_ABILITY_BASE_ADVANCED : OUTFIT_ABILITY_BASE_BASIC;
    let pressure_gain = (difficulty_choice===2) ? OUTFIT_PRESSURE_INTERMEDIATE : (difficulty_choice===3) ? OUTFIT_PRESSURE_ADVANCED : OUTFIT_PRESSURE_BASIC;

    let knowledge_mult = target.trainingQuality || 1.0;
    let ability_mult = target.trainingQuality || 1.0;

    const DIFF_GAIN_PENALTY = {1:1.0, 2:1.0, 3:1.0};

    let knowledge_min = Math.floor(knowledge_base * knowledge_mult);
    let knowledge_max = Math.floor(knowledge_base * knowledge_mult * 1.8);
    let ability_min = ability_base * ability_mult;
    let ability_max = ability_base * ability_mult * 2.0;

    let scoreThreshold = 200;
    let mismatch = (hiddenScore < scoreThreshold);

    let knowledge_modifier = 1.0;
    let ability_modifier = 1.0;
    let pressure_multiplier = 1.0;
    if(mismatch){
      knowledge_modifier = 0.2;
      ability_modifier = 0.5;
      pressure_multiplier = 2.0;
    }

    const outfitEffectMult = (typeof OUTFIT_EFFECT_MULTIPLIER !== 'undefined' ? OUTFIT_EFFECT_MULTIPLIER : 1.0);
    const knowledge_gain = Math.floor(uniformInt(knowledge_min, knowledge_max) * knowledge_modifier * outfitEffectMult);
    s.knowledge_ds += knowledge_gain; 
    s.knowledge_graph += knowledge_gain; 
    s.knowledge_string += knowledge_gain; 
    s.knowledge_math += knowledge_gain; 
    s.knowledge_dp += knowledge_gain;
    
    const ability_gain = uniform(ability_min, ability_max) * ability_modifier * outfitEffectMult;
    s.thinking = (s.thinking || 0) + ability_gain;
    s.coding = (s.coding || 0) + ability_gain;
    s.mental = Math.min(100, s.mental + ability_gain * 0.5);

    const pressure_delta = Math.floor(pressure_gain * (mismatch ? pressure_multiplier : 1.0) * (typeof PRESSURE_INCREASE_MULTIPLIER !== 'undefined' ? PRESSURE_INCREASE_MULTIPLIER : 1.0));
    s.pressure = Math.min(100, Number(s.pressure||0) + pressure_delta);
    s.comfort -= 10;

    s.triggerTalents?.('pressure_change', { source: 'outing', amount: pressure_delta, province: target?.name, difficulty_choice });
    s.triggerTalents?.('outing_finished', { province: target?.name, difficulty: difficulty_choice, knowledge_gain });
    s.hiddenMockScore = hiddenScore;

    try{
      if(typeof window !== 'undefined' && window.TalentManager && typeof window.TalentManager.tryAcquireTalent === 'function'){
        try{ window.TalentManager.tryAcquireTalent(s, 1.0); }catch(e){}
      }
    }catch(e){ console.error('outing_finished tryAcquireTalent error', e); }
    
    if(inspireTalents && inspireTalents.length > 0){
      for(const talentName of inspireTalents){
        if(Math.random() < 0.3){
          if(!s.talents.has(talentName)){
            s.talents.add(talentName);
            pushEvent({ 
              name: '天赋激发成功', 
              description: `${s.name} 在集训中获得了天赋「${talentName}」！`, 
              week: game.week 
            });
            log(`${s.name} 激发了天赋：${talentName}`);
          }
        }
      }
    }

    if(mismatch){
      const message = `这次集训与学生${s.name}实力不匹配，压力增加，收获减少`;
      pushEvent({ name: '集训不匹配', description: message, week: game.week });
    }
  }
  
  if(talentInspireCost > 0){
    log(`天赋激发费用：¥${talentInspireCost}（${inspireTalents.length}个天赋 × ¥12,000）`);
  }

  game.weeks_since_entertainment += 1;
  log("外出集训完成（1周）。");

  const __after = __createSnapshot?.();
  if(__before && __after) __summarizeSnapshot(__before, __after, `外出集训：${target.name} 难度${difficulty_choice}`);
}

const KP_OPTIONS = [{id:1,name:"数据结构"},{id:2,name:"图论"},{id:3,name:"字符串"},{id:4,name:"数学"},{id:5,name:"动态规划"}];

function checkRandomEvents(){
  if(window.EventManager && typeof window.EventManager.checkRandomEvents === 'function'){
    try {
      const compNow = (typeof competitions !== 'undefined') ? competitions.find(c => c.week === currWeek()) : null;
      const suppressOnce = game && game.suppressEventModalOnce;
      if(compNow || suppressOnce){
        const origShowEventModal = window.showEventModal;
        const origShowChoiceModal = window.showChoiceModal;
        try{
          window.showEventModal = function(evt){ try{ if(window.pushEvent) window.pushEvent(evt); }catch(e){} };
          window.EventManager.checkRandomEvents(game);
        }finally{
          window.showEventModal = origShowEventModal;
          window.showChoiceModal = origShowChoiceModal;
          if(suppressOnce){ try{ game.suppressEventModalOnce = false; }catch(e){} }
        }
      } else {
        window.EventManager.checkRandomEvents(game);
      }
      window.renderAll();
    }
    catch(e){ console.error('EventManager.checkRandomEvents error', e); }
  } else {
    console.warn('EventManager 未注册，跳过随机事件处理');
  }
  window.renderAll();
}

function weeklyUpdate(weeks=1){
  try{
    if(hasPendingRequiredEvents()){
      const msg = '存在未处理的事件卡片，请先处理所有可选择的事件再进行回合推进。';
      console.log('weeklyUpdate blocked: pending required events');
      if(window.toastManager && typeof window.toastManager.show === 'function'){
        window.toastManager.show(msg, 'warning');
      } else {
        try{ alert(msg); }catch(e){}
      }
      return;
    }
  }catch(e){ /* ignore and continue if check fails */ }
  
  // 触发 week_start 事件
  try{
    for(let s of game.students){
      if(!s) continue;
      try{
        if(typeof s.triggerTalents === 'function'){
          s.triggerTalents('week_start', {});
        } else if(typeof window !== 'undefined' && window.TalentManager && typeof window.TalentManager.handleStudentEvent === 'function'){
          window.TalentManager.handleStudentEvent(s, 'week_start', {});
        }
      }catch(e){ console.error('triggerTalents week_start', e); }
    }
  }catch(e){ console.error('weeklyUpdate trigger week_start talents failed', e); }
  
  let comfort = game.getComfort();
  
  for(let s of game.students){
    if(!s || s.active === false) continue;
    if(s.sick_weeks > 0){
      s.sick_weeks--;
      if(s.talents && s.talents.has('自愈') && s.sick_weeks > 0){
        if(getRandom() < 0.30){
          s.sick_weeks = Math.max(0, s.sick_weeks - 1);
          window.pushEvent && window.pushEvent({
            name: '自愈',
            description: `${s.name} 的自愈能力发挥作用，病程额外减少1周`,
            week: game.week
          });
        }
      }
    }
  }
  
  for(let s of game.students){
  if(!s || s.active === false) continue;
    
    let personalComfort = comfort;
    
    if(s.talents && s.talents.has('天气敏感')){
      const baseComfort = game.base_comfort;
      const weatherEffect = comfort - baseComfort;
      personalComfort = baseComfort + weatherEffect * 2;
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    if(s.talents && s.talents.has('美食家')){
      const facilityComfort = game.facilities.getComfortBonus();
      personalComfort += facilityComfort * 0.5;
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    // 应用事件产生的临时修正值
    if(typeof s.comfort_modifier === 'number'){
      personalComfort += s.comfort_modifier;
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    let pressure_recovery = RECOVERY_RATE * (personalComfort/100.0) * weeks;
    
    if(s.talents && s.talents.has('乐天派')){
      pressure_recovery += 3 * weeks;
    }
    
    // 应用事件产生的临时压力修正值（在恢复之前）
    if(typeof s.pressure_modifier === 'number'){
      s.pressure = Math.min(100, Math.max(0, s.pressure + s.pressure_modifier));
      s.pressure_modifier = 0; // 放假后清除压力修正（已应用）
    }
    
    s.pressure = Math.max(0, s.pressure - pressure_recovery);
    s.pressure = Math.min(100, s.pressure);
  }
  for(let i=0;i<weeks;i++){
    const weeklyRaw = game.getWeeklyCost();
    const weeklyAdj = Math.round(weeklyRaw * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
    game.recordExpense(weeklyAdj, '周维护费用');
    game.week++;
    game.updateWeather();
    
    // 在每周开始时选择本周的训练题目（基础7道+资料库额外题目）
    if (typeof selectRandomTasks === 'function') {
      const extraTasks = game.facilities.getLibraryExtraTasks();
      game.weeklyTasks = selectRandomTasks(7 + extraTasks);
    }
  }
  
  // 检查高二晋级链断裂自动退队（在周数推进后执行）
  try{
    const currentHalf = (game.week > WEEKS_PER_HALF) ? 1 : 0;
    // 只在第二年（高二）执行
    if(currentHalf === 1){
      // 如果正在国家集训队流程中，不触发晋级链断裂检查
      if(game.inNationalTeam === true || game.nationalTeamChoicePending === true){
        // 国家集训队期间不检查晋级链
      } else {
        // 检查当前是否在比赛周
        const isCompetitionWeek = Array.isArray(competitions) && competitions.some(c => c.week === game.week);
        
        if(!isCompetitionWeek){
          // 找到所有晋级链断裂的学生
          const qualificationLostStudents = [];
          
          for(let i = game.students.length - 1; i >= 0; i--){
            const s = game.students[i];
            if(!s || s.active === false) continue;
            
            // 获取学生的晋级状态
            let hasQualification = false;
            try{
              if(typeof getStudentQualificationStatus === 'function'){
                const qualInfo = getStudentQualificationStatus(s);
                hasQualification = qualInfo.hasQualification;
                
                // 特殊处理：如果已经没有下一场比赛了（所有比赛都完成），则认为有晋级资格
                if(!qualInfo.nextContest || qualInfo.nextContest === ''){
                  hasQualification = true;
                }
              }
            }catch(e){ 
              console.error('检查晋级资格失败:', e); 
              hasQualification = true; // 出错时保守处理，不退队
            }
            
            // 如果学生没有晋级资格，自动退队
            if(!hasQualification){
              qualificationLostStudents.push(s.name);
              game.students.splice(i, 1);
              try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('quit', { reason: 'qualification_lost' }); } }catch(e){}
            }
          }
          
          // 如果有学生因晋级链断裂退队，显示提示
          if(qualificationLostStudents.length > 0){
            const msg = `${qualificationLostStudents.join('、')} 因晋级链断裂自动退役（不消耗声誉）`;
            log(`[晋级链断裂] ${msg}`);
            pushEvent({ name:'晋级链断裂退队', description: msg, week: game.week });
            renderAll();
          }
        }
      }
    }
  }catch(e){ console.error('高二晋级链断裂检查失败:', e); }
  
  game.weeks_since_good_result += weeks;
  if(game.weeks_since_good_result > 12) game.had_good_result_recently = false;
  try{
    for(let s of game.students){
      if(!s) continue;
      try{
        if(typeof s.triggerTalents === 'function'){
          s.triggerTalents('week_end', {});
        } else if(typeof window !== 'undefined' && window.TalentManager && typeof window.TalentManager.handleStudentEvent === 'function'){
          window.TalentManager.handleStudentEvent(s, 'week_end', {});
        }
      }catch(e){ console.error('triggerTalents week_end/turn_end', e); }
    }
  }catch(e){ console.error('weeklyUpdate trigger talents failed', e); }

  checkRandomEvents();
  if (checkAndTriggerEnding()) {
    return;
  }
  
  renderAll();
}

function safeWeeklyUpdate(weeks = 1) {
  try{
    if(hasPendingRequiredEvents()){
      const msg = '存在未处理的事件卡片，请先处理所有可选择的事件再进行回合推进。';
      console.log('safeWeeklyUpdate blocked: pending required events');
      if(window.toastManager && typeof window.toastManager.show === 'function'){
        window.toastManager.show(msg, 'warning');
      } else {
        try{ alert(msg); }catch(e){}
      }
      return;
    }
  }catch(e){ /* ignore and continue if check fails */ }
  try{
    if(window.__contest_live_modal_active){
      window.__deferred_week_advances = (window.__deferred_week_advances || 0) + Number(weeks || 0);
      console.log('safeWeeklyUpdate: contest modal active, deferring', weeks, 'weeks (total deferred:', window.__deferred_week_advances, ')');
      window.__deferred_week_adv_last = Date.now();
      return;
    }
  }catch(e){ /* ignore */ }
  
  if (checkAndTriggerEnding()) {
    return;
  }
  
  const sorted = Array.isArray(competitions) ? competitions.slice().sort((a, b) => a.week - b.week) : [];
  let nextComp = sorted.find(c => c.week > currWeek());
  let weeksToComp = nextComp ? (nextComp.week - currWeek()) : Infinity;
  if (weeksToComp <= weeks) {
    weeklyUpdate(weeksToComp);
    let rem = weeks - weeksToComp;
    if (rem > 0) weeklyUpdate(rem);
  } else {
    weeklyUpdate(weeks);
  }
}

function checkCompetitions(){
  const sorted = Array.isArray(competitions) ? competitions.slice().sort((a,b)=>a.week - b.week) : [];
  for(let comp of sorted){
  if(comp.week !== currWeek()) continue;
  const halfIndex = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
    const key = `${halfIndex}_${comp.name}_${comp.week}`;
    if(game.completedCompetitions && game.completedCompetitions.has(key)){
      continue;
    }
    if(typeof window.holdCompetitionModalNew === 'function'){
      window.holdCompetitionModalNew(comp);
    } else {
      holdCompetitionModal(comp);
    }
    break;
  }
}

function checkAndTriggerEnding() {
  const activeStudentCount = Array.isArray(game.students) ? game.students.filter(s => s && s.active !== false).length : 0;
  try{ if(typeof window !== 'undefined' && window.__OI_DEBUG_ENDING) console.debug('[ENDING DEBUG] checkAndTriggerEnding activeStudentCount=', activeStudentCount, 'students=', game.students.map(s=>({name: s && s.name, active: s && s.active}))); }catch(e){}
  
  if (game.budget <= 0) {
    triggerGameEnding('经费不足');
    return true;
  }

  if (activeStudentCount === 0) {
    triggerGameEnding('无学生');
    return true;
  }
  
  if (game.week > SEASON_WEEKS) {
    if(game.inNationalTeam === true || game.nationalTeamChoicePending === true) {
      console.log('[结算检测] 当前在国家集训队流程中或等待选择，暂不触发赛季结束');
      return false;
    }
    triggerGameEnding('赛季结束');
    return true;
  }
  
  return false;
}

function normalizeEndingReason(raw) {
  try{
    if(!raw) return '赛季结束';
    const s = String(raw).trim();
    if(s === '') return '赛季结束';
    
    if(s === 'AKIOI' || s === '👑 AKIOI') return 'AKIOI';
    if(s === '顶尖结局' || s === '🌟 顶尖结局') return '顶尖结局';
    
    const low = s.toLowerCase();
    if(low.includes('akioi')) return 'AKIOI';
    if(low.includes('顶尖')) return '顶尖结局';
    if(low.includes('budget') || low.includes('经费') || low.includes('money') || low.includes('fund')) return '经费不足';
    if(low.includes('无学生') || low.includes('all quit') || low.includes('所有学生') || low.includes('退队') || low.includes('崩溃')) return '无学生';
    if(low.includes('晋级链') || low.includes('晋级链断裂') || low.includes('chain') || low.includes('qualification')) return '晋级链断裂';
    if(low.includes('赛季') || low.includes('season')) return '赛季结束';
    if(low.includes('辞职') || low.includes('resign')) return '辞职';
    
    if(s === '无学生') return '无学生';
    if(s === '经费不足' || s === '经费耗尽') return '经费不足';
    if(s === '晋级链断裂') return '晋级链断裂';
    if(s === '辞职') return '辞职';
    
    return s;
  }catch(e){ return '赛季结束'; }
}

function resignUI(){
  const modalHtml = `
    <h3>确认辞职</h3>
    <div class="small" style="margin-top:12px; line-height:1.6;">
      你确定要辞职吗？<br/>
      辞职将立即结束本赛季并进行结算。<br/>
      此操作无法撤销。
    </div>
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-ghost" id="resign-cancel">取消</button>
      <button class="btn" id="resign-confirm" style="background: #ef4444; border-color: #dc2626;">确认辞职</button>
    </div>`;

  showModal(modalHtml);

  const cancelBtn = document.getElementById('resign-cancel');
  const confirmBtn = document.getElementById('resign-confirm');
  
  if(cancelBtn) cancelBtn.onclick = () => { 
    try{ closeModal(); }catch(e){} 
  };
  
  if(confirmBtn) confirmBtn.onclick = () => {
    try{
      closeModal();
      log("教练选择辞职，赛季提前结束");
      setTimeout(() => {
        triggerGameEnding('辞职');
      }, 100);
    }catch(e){ 
      console.error('resign confirm handler error', e); 
    }
  };
}

function triggerGameEnding(reason) {
  try {
    game.seasonEndTriggered = true;
    const normalized = reason;
    pushEvent({ 
      name: '游戏结束', 
      description: `游戏结束原因：${normalized}`, 
      week: game.week 
    });
    
    console.log('【DEBUG】 triggerGameEnding saving careerCompetitions:', game.careerCompetitions);
    if(typeof saveGame === 'function') {
      try{ console.debug('triggerGameEnding 将调用 saveGame(), oi_coach_save exists: ' + (localStorage.getItem('oi_coach_save') !== null)); }catch(e){}
      saveGame();
    }
  try{ console.debug('triggerGameEnding 设置 oi_coach_ending_reason = ' + normalized); }catch(e){}
  try{ sessionStorage.setItem('oi_coach_ending_reason', normalized); }catch(e){ console.warn('sessionStorage unavailable for ending_reason', e); }
  try{ localStorage.setItem('oi_coach_ending_reason', normalized); }catch(e){ /* ignore localStorage write failures */ }
    
    setTimeout(() => {
      try { 
  try{ console.debug('即将跳转到 end.html, oi_coach_save exists: ' + (localStorage.getItem('oi_coach_save') !== null) + ', length: ' + (localStorage.getItem('oi_coach_save') || '').length); }catch(e){}
        try{
          const payload = {
            oi_coach_save: (function(){ try{ return sessionStorage.getItem('oi_coach_save') || localStorage.getItem('oi_coach_save') || ''; }catch(e){ return localStorage.getItem('oi_coach_save') || ''; } })(),
            oi_coach_ending_reason: (function(){ try{ return sessionStorage.getItem('oi_coach_ending_reason') || localStorage.getItem('oi_coach_ending_reason') || ''; }catch(e){ return localStorage.getItem('oi_coach_ending_reason') || ''; } })()
          };
          try{ window.name = JSON.stringify(payload); }catch(e){}
        }catch(e){}
        window.location.href = 'end.html'; 
      } catch(e) { 
        console.error('Failed to navigate to end.html:', e); 
      }
    }, 100);
    
  } catch(e) {
    console.error('Failed to trigger game ending:', e);
  }
}

function checkEnding(){
  return " 等待结算";
}

function triggerBadEnding(reason){
  try{ pushEvent(reason || '所有学生已退队'); }catch(e){}
  try{ game.allQuitTriggered = true; }catch(e){}
}

function checkAllQuitAndTriggerBadEnding(){
  try{
    if(game && game.allQuitTriggered) return;
  const active_count = Array.isArray(game.students) ? game.students.filter(s => s && s.active !== false).length : 0;
    if(active_count === 0){
      triggerBadEnding('所有学生已退队，项目失败（坏结局）');
    }
  }catch(e){ console.error('checkAllQuitAndTriggerBadEnding error', e); }
}

function evictSingle(idx){
  const student = game.students[idx];
  if(!student || student.active === false) return;
  try{ if(typeof window !== 'undefined' && window.__OI_DEBUG_ENDING) console.debug('[ENDING DEBUG] evictSingle called idx=', idx, 'student=', student.name, 'preActive=', student.active); }catch(e){}
  student.active = false;
  game.reputation -= EVICT_REPUTATION_COST;
  if(game.reputation < 0) game.reputation = 0;
  log(`劝退学生 ${student.name}，声誉 -${EVICT_REPUTATION_COST}`);
  renderAll();
  try{ 
    if(typeof window !== 'undefined' && window.__OI_DEBUG_ENDING) console.debug('[ENDING DEBUG] after evict, calling checkAndTriggerEnding()');
    checkAndTriggerEnding();
  }catch(e){}
}

// upgradeFacility 已迁移至 lib/facilities.js

// showFacilityUpgradeModal 已迁移至 lib/facilities.js

function rest1Week(){
  log("休息1周...");
  for(let s of game.students) if(s.active){ s.pressure = Math.max(0, s.pressure - uniform(16,36)); s.mental = Math.min(100, s.mental + uniform(0.4,1.6)); }
  safeWeeklyUpdate(1);
  renderAll();
}

function saveGame(silent = false){ 
  try{
    const saveData = JSON.parse(JSON.stringify(game, (key, value) => {
      if(value instanceof Set){
        return Array.from(value);
      }
      return value;
    }));
  const savedStr = JSON.stringify(saveData);
  try{ sessionStorage.setItem('oi_coach_save', savedStr); }catch(e){ console.warn('sessionStorage unavailable for save', e); }
  try{ sessionStorage.setItem('oi_coach_save_diag', savedStr); }catch(e){}
  try{ localStorage.setItem('oi_coach_save', savedStr); }catch(e){}
    try{
      const verify = localStorage.getItem('oi_coach_save');
      const len = verify ? verify.length : 0;
      const prefix = verify ? verify.slice(0, 200) : '';
      const suffix = verify ? verify.slice(Math.max(0, verify.length-200)) : '';

    }catch(e){ if(!silent) alert('DEBUG: saveGame 写入后校验失败: '+e.message); }
  }catch(e){ 
    if (!silent) {
      alert("保存失败："+e);
    }
    console.error("Save game failed:", e);
  }
}
function loadGame(){ try{ 
    let raw = null;
    try{ raw = sessionStorage.getItem('oi_coach_save'); }catch(e){ raw = null; }
    try{ if(!raw) raw = localStorage.getItem('oi_coach_save'); }catch(e){}
    if(!raw){ alert("无存档"); return; }
    let o = JSON.parse(raw);
    game = Object.assign(new GameState(), o);
  window.game = game;
  game.facilities = Object.assign(new Facilities(), o.facilities);
  /* 存档迁移：旧版设施(dorm/canteen)转换为新版(fan/network) */
  if(typeof o.facilities.dorm !== 'undefined' && typeof o.facilities.fan === 'undefined'){
    game.facilities.fan = Math.min(o.facilities.dorm || 0, FACILITY_DEFS.fan.maxLevel);
  }
  if(typeof o.facilities.canteen !== 'undefined' && typeof o.facilities.network === 'undefined'){
    game.facilities.network = 0; // canteen无对应新设施
  }
  game.facilities.computer_room = 1; // 机房始终为1
  game.students = (o.students || []).map(s => {
    const student = Object.assign(new Student(), s);
    if(s.talents && Array.isArray(s.talents)){
      student.talents = new Set(s.talents);
    } else if(s.talents && typeof s.talents === 'object'){
      student.talents = new Set(Object.keys(s.talents).filter(k => s.talents[k]));
    }
    return student;
  });
  
  // 恢复本周题目：如果存档中没有或已失效，重新选择（基础7道+资料库额外题目）
  if (!game.weeklyTasks || !Array.isArray(game.weeklyTasks) || game.weeklyTasks.length === 0) {
    if (typeof selectRandomTasks === 'function') {
      const extraTasks = game.facilities.getLibraryExtraTasks();
      game.weeklyTasks = selectRandomTasks(7 + extraTasks);
    }
  }
  
  renderAll(); alert("已载入存档"); }catch(e){ alert("载入失败："+e); } }

function silentLoad(){ try{ 
  let raw = null;
  try{ raw = sessionStorage.getItem('oi_coach_save'); }catch(e){ raw = null; }
  try{ if(!raw) raw = localStorage.getItem('oi_coach_save'); }catch(e){}
  if(!raw) return false; let o = JSON.parse(raw); game = Object.assign(new GameState(), o); window.game = game; game.facilities = Object.assign(new Facilities(), o.facilities); if(typeof o.facilities.dorm !== 'undefined' && typeof o.facilities.fan === 'undefined'){ game.facilities.fan = Math.min(o.facilities.dorm || 0, FACILITY_DEFS.fan.maxLevel); } if(typeof o.facilities.canteen !== 'undefined' && typeof o.facilities.network === 'undefined'){ game.facilities.network = 0; } game.facilities.computer_room = 1; game.students = (o.students || []).map(s => { const student = Object.assign(new Student(), s); if(s.talents && Array.isArray(s.talents)){ student.talents = new Set(s.talents); } else if(s.talents && typeof s.talents === 'object'){ student.talents = new Set(Object.keys(s.talents).filter(k => s.talents[k])); } return student; }); 
  
  // 恢复本周题目：如果存档中没有或已失效，重新选择（基础7道+资料库额外题目）
  if (!game.weeklyTasks || !Array.isArray(game.weeklyTasks) || game.weeklyTasks.length === 0) {
    if (typeof selectRandomTasks === 'function') {
      const extraTasks2 = game.facilities.getLibraryExtraTasks();
      game.weeklyTasks = selectRandomTasks(7 + extraTasks2);
    }
  }
  
  return true; }catch(e){ return false; } }

function startFromStartPage(){
  let diff = parseInt(document.getElementById('start-diff').value);
  let provBtn = document.querySelector('#start-prov-grid .prov-btn.selected');
  let prov = provBtn ? parseInt(provBtn.dataset.val) : 1;
  // 兼容交互式地图：优先从隐藏input读取省份ID
  let mapProv = document.getElementById('start-prov');
  if(mapProv && mapProv.value){
    prov = parseInt(mapProv.value) || prov;
  }
  let count = clampInt(parseInt(document.getElementById('start-stu').value),3,10);
  
  try {
    sessionStorage.setItem('oi_game_active_session', 'true');
  } catch(e) {
    console.error('无法设置 sessionStorage:', e);
  }
  
  const url = `game.html?new=1&d=${encodeURIComponent(diff)}&p=${encodeURIComponent(prov)}&c=${encodeURIComponent(count)}`;
  window.location.href = url;
}

function initGame(difficulty, province_choice, student_count){
  game = new GameState();
  window.game = game;
  game.difficulty = clampInt(difficulty,1,3);
  let prov = PROVINCES[province_choice] || PROVINCES[1];
  game.province_id = province_choice;
  game.province_name = prov.name; game.province_type = prov.type; game.is_north = prov.isNorth; game.budget = prov.baseBudget; game.base_comfort = prov.isNorth?BASE_COMFORT_NORTH:BASE_COMFORT_SOUTH;
  try{ game.province_climate = prov.climate || null; }catch(e){ game.province_climate = null; }
  
  // 如果选择香港(14)或澳门(25)，设置使用繁体中文
  if (province_choice === 14 || province_choice === 25) {
    try {
      if (window.ChineseConverter) {
        window.ChineseConverter.setUseTraditionalChinese(true);
      }
    } catch (e) {
      console.error('设置繁体中文失败:', e);
    }
  }
  
  if(game.difficulty===1){ game.budget = Math.floor(game.budget * EASY_MODE_BUDGET_MULTIPLIER); }
  else if(game.difficulty===3){ game.budget = Math.floor(game.budget * HARD_MODE_BUDGET_MULTIPLIER); }
  
  let recruitedStudents = [];
  try {
    const recruitedData = sessionStorage.getItem('oi_recruited_students');
    if(recruitedData){
      recruitedStudents = JSON.parse(recruitedData);
      sessionStorage.removeItem('oi_recruited_students');
    }
  } catch(e) {
    console.error('Failed to load recruited students:', e);
  }
  
  const totalRecruitCost = recruitedStudents.reduce((sum, s) => sum + s.cost, 0);
  if (totalRecruitCost > 0) {
    game.recordExpense(totalRecruitCost, '招生费用');
  }
  
  game.initial_students = student_count;
  let min_val,max_val;
  if(game.province_type==="强省"){ min_val = STRONG_PROVINCE_MIN_ABILITY; max_val = STRONG_PROVINCE_MAX_ABILITY; }
  else if(game.province_type==="弱省"){ min_val = WEAK_PROVINCE_MIN_ABILITY; max_val = WEAK_PROVINCE_MAX_ABILITY; }
  else { min_val = NORMAL_PROVINCE_MIN_ABILITY; max_val = NORMAL_PROVINCE_MAX_ABILITY; }
  if(game.difficulty===1){ min_val += EASY_MODE_ABILITY_BONUS; max_val += EASY_MODE_ABILITY_BONUS; }
  else if(game.difficulty===3){ min_val -= HARD_MODE_ABILITY_PENALTY; max_val -= HARD_MODE_ABILITY_PENALTY; }
  game.students = [];
  
  for(let recruited of recruitedStudents){
    const newStud = new Student(recruited.name, recruited.thinking, recruited.coding, recruited.mental);
    
    if(recruited.talents && recruited.talents.size > 0){
      for(let talentName of recruited.talents){
        newStud.addTalent(talentName);
      }
    } else {
      try{ if(window.TalentManager && typeof window.TalentManager.assignInitialTalent === 'function') window.TalentManager.assignInitialTalent(newStud); }catch(e){}
    }
    
    game.students.push(newStud);
    log(`对点招生：${recruited.name} 加入队伍`);
  }
  
  for(let i=0;i<student_count;i++){
    // 获取当前所有学生的名字列表以避免重名
    const existingNames = game.students.map(s => s.name);
    let name;
    if (typeof generateUniqueName === 'function') {
      name = generateUniqueName({ region: prov.name, existingNames: existingNames });
    } else if (typeof generateName === 'function') {
      name = generateName({ region: prov.name });
    } else {
      name = '学生';
    }
    let mean = (min_val + max_val) / 2;
    let stddev = (max_val - min_val);
    let thinking = clamp(normal(mean, stddev), 0, 100);
    let coding = clamp(normal(mean, stddev), 0, 100);
    let mental = clamp(normal(mean, stddev), 0, 100);
    const newStud = new Student(name, thinking, coding, mental);
    try{ if(window.TalentManager && typeof window.TalentManager.assignInitialTalent === 'function') window.TalentManager.assignInitialTalent(newStud); }catch(e){}
    game.students.push(newStud);
  }
  game.updateWeather();
  
  // 初始化第一周的题目（基础7道+资料库额外题目）
  if (typeof selectRandomTasks === 'function') {
    const extraTasks = game.facilities.getLibraryExtraTasks();
    game.weeklyTasks = selectRandomTasks(7 + extraTasks);
  }
  
  // 触发 game_start 事件，让天赋系统可以在游戏开始时进行检查
  try{
    for(let s of game.students){
      if(!s) continue;
      try{
        if(typeof s.triggerTalents === 'function'){
          s.triggerTalents('game_start', {});
        } else if(typeof window !== 'undefined' && window.TalentManager && typeof window.TalentManager.handleStudentEvent === 'function'){
          window.TalentManager.handleStudentEvent(s, 'game_start', {});
        }
      }catch(e){ console.error('triggerTalents game_start', e); }
    }
  }catch(e){ console.error('initGame trigger game_start talents failed', e); }
  
  log("初始化完成，开始游戏！");
}

window.onload = ()=>{
  if(window.EventManager && typeof window.EventManager.registerDefaultEvents === 'function'){
    try{
      window.EventManager.registerDefaultEvents({
        game: game,
        PROVINCES: PROVINCES,
        constants: {
          BASE_SICK_PROB: BASE_SICK_PROB,
          SICK_PROB_FROM_COLD_HOT: SICK_PROB_FROM_COLD_HOT,
          QUIT_PROB_BASE: QUIT_PROB_BASE,
          QUIT_PROB_PER_EXTRA_PRESSURE: QUIT_PROB_PER_EXTRA_PRESSURE,
          EXTREME_COLD_THRESHOLD: EXTREME_COLD_THRESHOLD,
          EXTREME_HOT_THRESHOLD: EXTREME_HOT_THRESHOLD
        },
        utils: { uniform: uniform, uniformInt: uniformInt, normal: normal, clamp: clamp, clampInt: clampInt },
        log: log
      });
    }catch(e){ console.error('registerDefaultEvents failed', e); }
  }
  
  if(window.TalentManager && typeof window.TalentManager.registerDefaultTalents === 'function'){
    try{
      window.TalentManager.registerDefaultTalents(game, { uniform, uniformInt, normal, clamp });
    }catch(e){ console.error('registerDefaultTalents failed', e); }
  }
  
  if(document.getElementById('action-train')){
    const qs = (function(){ try{ return new URLSearchParams(window.location.search); }catch(e){ return null; } })();
    if(qs && qs.get('new') === '1'){
      const diff = clampInt(parseInt(qs.get('d')||2),1,3);
      const prov = clampInt(parseInt(qs.get('p')||1),1,Object.keys(PROVINCES).length);
      const count = clampInt(parseInt(qs.get('c')||5),3,10);
      
      const isDaily = qs.get('daily') === '1';
      const seed = qs.get('seed') ? parseInt(qs.get('seed')) : null;
      
      if(isDaily && seed !== null){
        if(typeof setRandomSeed === 'function'){
          setRandomSeed(seed);
          console.log(`[今日挑战] 种子已设置: ${seed}`);
        } else {
          console.warn('[今日挑战] setRandomSeed 函数未定义，种子设置失败');
        }
        initGame(diff, prov, count);
        game.isDailyChallenge = true;
        game.dailyChallengeSeed = seed;
        try{
          const dailyDate = sessionStorage.getItem('oi_daily_challenge_date');
          if(dailyDate) game.dailyChallengeDate = dailyDate;
        }catch(e){}
        console.log(`[今日挑战] 游戏初始化完成，省份: ${prov}, 种子: ${seed}`);
      } else {
        if(typeof setRandomSeed === 'function'){
          setRandomSeed(null);
        }
        initGame(diff, prov, count);
      }
      
      try{ localStorage.setItem('oi_coach_save', JSON.stringify(game)); }catch(e){}
    } else {
      const ok = silentLoad();
      if(!ok){ window.location.href = 'start.html'; return; }
    }
    
    document.getElementById('action-train').onclick = ()=>{ trainStudentsUI(); };
    document.getElementById('action-entertain').onclick = ()=>{ entertainmentUI(); };
    document.getElementById('action-mock').onclick = ()=>{ holdMockContestUI(); };
    document.getElementById('action-outing').onclick = ()=>{ outingTrainingUI(); };
    document.getElementById('action-resign').onclick = ()=>{ resignUI(); };
    
    document.querySelectorAll('.btn.upgrade').forEach(b => {
      b.onclick = (e) => {
        const fac = b.dataset.fac;
        if(fac) upgradeFacility(fac);
      };
    });
    const actionEvictBtn = document.getElementById('action-evict');
    if(actionEvictBtn) actionEvictBtn.onclick = ()=>{ evictStudentUI(); };
    
    // showFacilityUpgradeModal 已在 lib/facilities.js 中暴露到全局
    // 暴露压力预计算函数到全局作用域
    window.calculateTrainingPressure = calculateTrainingPressure;
    
    renderAll();
    
    if (qs && qs.get('new') === '1' && window.tutorialManager) {
      setTimeout(() => {
        window.tutorialManager.start();
      }, 500);
    }
  } else {
    // not index page: do nothing. start.html will call renderStartPageUI; end.html will call renderEndSummary.
  }
};
