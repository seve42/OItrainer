/* script.js (主脚本) 已将大量基础定义拆分到 lib/constants.js, lib/utils.js, lib/models.js
   这些文件必须在 HTML 中先于本文件加载。
*/
if(typeof GameState === 'undefined'){
  console.warn('Warning: GameState is not defined. Ensure lib/models.js is loaded before script.js');
}
// 避免在脚本加载时使用未初始化的局部 `game`（会触发 TDZ）。
// 使用 `window.game` 作为全局持有者，并在需要时懒初始化。
if(typeof window.game === 'undefined' || !window.game){
  try{ window.game = new GameState(); }catch(e){ /* 如果 GameState 不可用，保留为 undefined，稍后在 onload 中处理 */ }
}
// 局部引用始终通过 window.game 访问，避免在全局初始化顺序问题上抛错
let game = window.game;

/* 每日/每次渲染随机一言 */
const QUOTES = [
  "想想你的对手正在干什么",
  "你家孩子跟我保底是个985",
  "课间就是用来放松的？",
  "没有天赋异禀的幸运",
  "努力到无能为力，拼搏到感动自己",
  "失败乃成功之母",
  "唯有水滴石穿的坚持",
  "没有一步登天的幻想",
  "唯有日积月累的付出",
  "竞赛生没有特权"
];

/* =========== UI 辅助 =========== */
const $ = id => document.getElementById(id);
function log(msg){
  try{
    let el = $('log');
    const wk = (game && typeof game.week !== 'undefined') ? game.week : 0;
    if(el){ let p = document.createElement('div'); p.innerText = `[周${wk}] ${msg}`; el.prepend(p); }
    else { console.log(`[周${wk}] ${msg}`); }
  }catch(e){ try{ const wk = (game && typeof game.week !== 'undefined') ? game.week : 0; console.log(`[周${wk}] ${msg}`); }catch(ee){ console.log(msg); } }
}
// 安全获取当前周（如果 game 未初始化则返回 0）
function currWeek(){ return (game && typeof game.week !== 'undefined') ? game.week : 0; }

// 将事件推入突发事件卡片（并保留日志）
// store recent events (用于填充两个预留事件卡)
const recentEvents = [];
function pushEvent(msg){
  // 支持传入字符串或对象 {name, description, week}
  let ev = null;
  const wkDefault = (game && typeof game.week !== 'undefined') ? game.week : 0;
  if(typeof msg === 'string') ev = { name: null, description: msg, week: wkDefault };
  else if(typeof msg === 'object' && msg !== null) ev = { name: msg.name || null, description: msg.description || msg.text || '', week: msg.week || wkDefault };
  else ev = { name: null, description: String(msg), week: wkDefault };

  // 保留日志
  log(`[${ev.week}] ${ev.name? ev.name + '：' : ''}${ev.description}`);
  // avoid exact-duplicate events (same week+description)
  try{
    const key = `${ev.week}::${(ev.name||'')}::${(ev.description||'')}`;
    const exists = recentEvents.some(r => (`${r.week}::${(r.name||'')}::${(r.description||'')}`) === key);
    if(!exists){
      // push to recent list (keep up to 24 events) - still cap to avoid growing forever
      recentEvents.unshift(ev);
      if(recentEvents.length > 24) recentEvents.pop();
    }
  }catch(e){
    // fallback: if anything goes wrong, still push but keep small cap
    recentEvents.unshift(ev);
    if(recentEvents.length > 24) recentEvents.pop();
  }

  // render dynamic event cards container
  renderEventCards();
}

// ===== 状态快照与差异汇总工具 =====
function __createSnapshot(){
  return {
    budget: game.budget || 0,
    reputation: game.reputation || 0,
    students: game.students.map(s=>({
      name: s.name,
      active: !!s.active,
      pressure: Number((s.pressure||0).toFixed(2)),
      thinking: Number((s.thinking||0).toFixed(2)),
      coding: Number((s.coding||0).toFixed(2)),
      knowledge: Number((typeof s.getKnowledgeTotal === 'function') ? s.getKnowledgeTotal() : (
        ((s.knowledge_ds||0)+(s.knowledge_graph||0)+(s.knowledge_string||0)+(s.knowledge_math||0)+(s.knowledge_dp||0))
      ))
    })),
  };
}

function __summarizeSnapshot(before, after, title){
  try{
    const parts = [];
    const db = (after.budget||0) - (before.budget||0);
    if(db !== 0) parts.push(`经费 ${db>0?'+':'-'}¥${Math.abs(db)}`);
    const dr = (after.reputation||0) - (before.reputation||0);
    if(dr !== 0) parts.push(`声誉 ${dr>0?'+':''}${dr}`);

    // students map
    const beforeMap = new Map();
    for(const s of before.students) beforeMap.set(s.name, s);
    const afterMap = new Map();
    for(const s of after.students) afterMap.set(s.name, s);

    // additions
    const added = [];
    for(const [name, s] of afterMap){ if(!beforeMap.has(name)) added.push(name); }
    if(added.length) parts.push(`加入: ${added.join('、')}`);
    // removals
    const removed = [];
    for(const [name, s] of beforeMap){ if(!afterMap.has(name)) removed.push(name); }
    if(removed.length) parts.push(`退队: ${removed.join('、')}`);

    // per-student diffs (only for those present both times)
    const stuParts = [];
    for(const [name, beforeS] of beforeMap){
      if(!afterMap.has(name)) continue;
      const afterS = afterMap.get(name);
      const dP = Number((afterS.pressure - beforeS.pressure).toFixed(2));
      const dT = Number((afterS.thinking - beforeS.thinking).toFixed(2));
      const dC = Number((afterS.coding - beforeS.coding).toFixed(2));
      const dK = Number((afterS.knowledge - beforeS.knowledge).toFixed(2));
      const changes = [];
      if(dP !== 0) changes.push(`压力 ${dP>0?'+':''}${dP}`);
      if(dT !== 0) changes.push(`思维 ${dT>0?'+':''}${dT}`);
      if(dC !== 0) changes.push(`编程 ${dC>0?'+':''}${dC}`);
      if(dK !== 0) changes.push(`知识 ${dK>0?'+':''}${dK}`);
      if(changes.length) stuParts.push(`${name}: ${changes.join('，')}`);
    }
    if(stuParts.length) parts.push(stuParts.join('； '));

    const summary = parts.length ? parts.join('； ') : '无显著变化';
    // push concise event card
  pushEvent({ name: title || '变动汇总', description: summary, week: currWeek() });
  // also log the detailed version
  log(`[${title||'变动'}] ${summary}`);
    return summary;
  }catch(e){ console.error('summarize error', e); return null; }
}

// 便捷接口
window.__createSnapshot = __createSnapshot;
window.__summarizeSnapshot = __summarizeSnapshot;


// 渲染所有突发事件卡（任意数量）到 #event-cards-container
function renderEventCards(){
  const container = document.getElementById('event-cards-container');
  if(!container) return;
  // clear container before render to avoid duplicate DOM nodes
  container.innerHTML = '';
  if(recentEvents.length === 0){
    // show placeholder card similar to original
    const el = document.createElement('div');
    el.className = 'action-card empty';
    el.innerHTML = `<div class="card-title">预留事件</div><div class="card-desc">用于突发事件或活动</div>`;
    container.appendChild(el);
    return;
  }
  // only render events from the last 2 weeks (inclusive)
  const maxWeekDelta = 2;
  const nowWeek = (typeof game !== 'undefined' && game && typeof game.week === 'number') ? game.week : (new Date().getWeek ? new Date().getWeek() : currWeek());
  let shown = 0;
  for(let ev of recentEvents){
    if(typeof ev.week === 'number'){
      const delta = nowWeek - ev.week;
      if(delta > maxWeekDelta) continue; // too old
    }
    // create card
    let card = document.createElement('div');
    card.className = 'action-card event-active';
    let title = ev.name || '突发事件';
    let desc = ev.description || '';
    card.innerHTML = `<div class="card-title">${title}</div><div class="card-desc">${desc}</div>`;
    container.appendChild(card);
    shown++;
    // safety cap: show at most 6 cards to keep UI tidy
    if(shown >= 6) break;
  }
}

// 显示随机事件弹窗：接收事件对象或{name, description, week}
function showEventModal(evt){
  try{
    let title = evt && evt.name ? evt.name : '事件';
    let desc = evt && evt.description ? evt.description : (evt && evt.text ? evt.text : '暂无描述');
  let weekInfo = evt && evt.week ? `[周${evt.week}] ` : `[周${currWeek()}] `;
    // 不再在这里重复 pushEvent（pushEvent 在事件触发处负责），仅展示弹窗
    let html = `<h3>${weekInfo}${title}</h3><div class="small" style="margin-top:6px">${desc}</div>`;
    html += `<div style="text-align:right;margin-top:12px"><button class="btn" onclick="closeModal()">关闭</button></div>`;
    showModal(html);
  }catch(e){ console.error('showEventModal error', e); }
}

// 显示需要玩家选择的事件弹窗：evt = {name, description, week, options: [{label, effect}]}
function showChoiceModal(evt){
  try{
    const title = (evt && evt.name) ? evt.name : '选择事件';
    const desc = (evt && evt.description) ? evt.description : '';
  const weekInfo = (evt && evt.week) ? `[周${evt.week}] ` : `[周${currWeek()}] `;
    // build option buttons
    let opts = '';
    const options = (evt && Array.isArray(evt.options)) ? evt.options : [];
    if(options.length === 0){
      opts = `<div style="text-align:right;margin-top:12px"><button class="btn" onclick="closeModal()">关闭</button></div>`;
    } else {
      opts = '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">';
      for(let i=0;i<options.length;i++){
        const o = options[i];
        const label = o && o.label ? o.label : `选项 ${i+1}`;
        // create a unique handler that calls the effect safely
        opts += `<button class="btn" id="choice-opt-${i}">${label}</button>`;
      }
      opts += `<button class="btn" style="margin-left:6px" id="choice-cancel">取消</button>`;
      opts += '</div>';
    }

    const html = `<h3>${weekInfo}${title}</h3><div class="small" style="margin-top:6px">${desc}</div>${opts}`;
    showModal(html);

  // push event to recent events log for visibility
  try{ if(window.pushEvent) window.pushEvent({ name: title, description: desc, week: evt && evt.week ? evt.week : currWeek() }); }catch(e){}

    // wire up handlers (effects may be functions passed by EventManager)
    for(let i=0;i<options.length;i++){
      const btn = document.getElementById(`choice-opt-${i}`);
      if(!btn) continue;
      ((idx, opt)=>{
        btn.addEventListener('click', ()=>{
          try{ closeModal(); if(opt && typeof opt.effect === 'function') opt.effect(); }
          catch(e){ console.error('choice effect error', e); }
          try{ window.renderAll && window.renderAll(); }catch(e){}
        });
      })(i, options[i]);
    }
    const cancelBtn = document.getElementById('choice-cancel');
    if(cancelBtn){ cancelBtn.addEventListener('click', ()=>{ closeModal(); }); }

  }catch(e){ console.error('showChoiceModal error', e); }
}

// Debug helper: 在控制台调用 testShowChoiceModal() 可以弹出一个示例选择弹窗
function testShowChoiceModal(){
  const options = [
    { label: '接受', effect: () => { 
        const raw = 5000; const adj = Math.round(raw * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
        game.budget = Math.max(0, game.budget - adj); log(`测试：已接受，扣除经费 ¥${adj}`);
      } },
    { label: '拒绝', effect: () => { log('测试：已拒绝'); } }
  ];
  showChoiceModal({ name: '测试选择事件', description: '这是一个用于验证的测试弹窗。', week: currWeek(), options });
}
window.testShowChoiceModal = testShowChoiceModal;
/* 渲染：主页去数值化（不显示学生具体能力/压力数值） */
function renderAll(){
  $('header-week').innerText = `第 ${currWeek()} 周`;
  $('header-province').innerText = `省份: ${game.province_name} (${game.province_type})`;
  $('header-budget').innerText = `经费: ¥${game.budget}`;
  $('header-reputation').innerText = `声誉: ${game.reputation}`;
  $('info-week').innerText = currWeek();
  $('info-temp').innerText = game.temperature.toFixed(1) + "°C";
  $('info-weather').innerText = game.getWeatherDescription();
  $('info-future-expense').innerText = game.getFutureExpense();
  $('info-teach').innerText = game.teaching_points;
  // 下场比赛单独面板渲染
  const nextCompText = game.getNextCompetition();
  $('next-comp').innerText = nextCompText;
  $('info-next-competition').innerText = `下场比赛：${nextCompText}`;
  // 随机一言
  const q = QUOTES[ Math.floor(Math.random() * QUOTES.length) ];
  $('daily-quote').innerText = q;
  // 如果距离下场比赛 <=4周则高亮面板
  let match = nextCompText.match(/还有(\d+)周/);
  let weeksLeft = match ? parseInt(match[1],10) : null;
  const panel = $('next-competition-panel');
  if(weeksLeft !== null && weeksLeft <= 4){ panel.className = 'next-panel highlight'; }
  else { panel.className = 'next-panel normal'; }
  // 比赛时间轴按周次排序展示
  const scheduleComps = competitions.slice().sort((a, b) => a.week - b.week);
  $('comp-schedule').innerText = scheduleComps.map(c => `${c.week}:${c.name}`).join("  |  ");
  // facilities
  $('fac-computer').innerText = game.facilities.computer;
  $('fac-library').innerText = game.facilities.library;
  $('fac-ac').innerText = game.facilities.ac;
  $('fac-dorm').innerText = game.facilities.dorm;
  $('fac-canteen').innerText = game.facilities.canteen;
  $('fac-maint').innerText = game.facilities.getMaintenanceCost();
  // students: only show name, star-level (知识掌握 visual), pressure level (低/中/高), and small tags (生病 / 退队)
  let out = '';
  for(let s of game.students){
    if(!s.active) continue;
    let pressureLevel = s.pressure < 35 ? "低" : s.pressure < 65 ? "中" : "高";
    let pressureClass = s.pressure < 35 ? "pressure-low" : s.pressure < 65 ? "pressure-mid" : "pressure-high";
  // 计算模糊资质与能力等级：思维能力 & 心理素质
  let aptitudeVal = 0.5 * s.thinking + 0.5 * s.mental;
  let aptitudeGrade = getLetterGrade(Math.floor(aptitudeVal));
  // 能力 = 各能力平均 + 各知识点方差加权
  let abilityAvg = s.getAbilityAvg();
  // 计算知识方差
  let kArr = [s.knowledge_ds, s.knowledge_graph, s.knowledge_string, s.knowledge_math, s.knowledge_dp];
  let kMean = kArr.reduce((a,v) => a+v, 0) / kArr.length;
  let variance = kArr.reduce((a,v) => a + Math.pow(v - kMean, 2), 0) / kArr.length;
  let varNorm = clamp(variance, 0, 100);
  // 50% 能力平均 + 50% 知识方差
  let abilityVal = abilityAvg * 0.5 + varNorm * 0.5;
  let abilityGrade = getLetterGrade(Math.floor(abilityVal));
    const comp = Math.floor(s.getComprehensiveAbility());
    out += `<div class="student-box" style="margin-bottom:6px">
      <button class="evict-btn" data-idx="${game.students.indexOf(s)}" title="劝退">劝退</button>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><strong>${s.name}</strong> ${s.sick_weeks>0?'<span class="warn">[生病]</span>':''} <span class="label-pill ${pressureClass}">压力:${pressureLevel}</span></div>
      </div>
      <div class="compact small" style="margin-top:3px">
        实力: <progress value="${comp}" max="100" style="vertical-align:middle;width:70%;"></progress> ${comp} | 资质:${aptitudeGrade} 能力:${abilityGrade}
      </div>
    </div>`;
  }
  if(out==='') out = '<div class="muted">目前没有活跃学生</div>';
  $('student-list').innerHTML = out;
  // bind per-student evict buttons
  document.querySelectorAll('#student-list .evict-btn').forEach(b=>{
    b.onclick = (e) => {
      const idx = parseInt(b.dataset.idx,10);
      if(isNaN(idx)) return;
      // confirm and evict single
      if(game.reputation < EVICT_REPUTATION_COST){ alert('声誉不足，无法劝退'); return; }
      if(!confirm(`确认劝退 ${game.students[idx].name}？将消耗声誉 ${EVICT_REPUTATION_COST}`)) return;
      evictSingle(idx);
    };
  });
  // render dynamic event cards
  renderEventCards();

  // Competition-week: 如果当前周有未完成的比赛，则注入 "参加比赛" 按钮
  // 只处理尚未完成的比赛
  let compNow = null;
  const sortedComps = Array.isArray(competitions) ? competitions.slice().sort((a,b)=>a.week - b.week) : [];
  for (let comp of sortedComps) {
    if (comp.week === currWeek()) {
      const half = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
      const key = `${half}_${comp.name}_${comp.week}`;
      if (!game.completedCompetitions || !game.completedCompetitions.has(key)) {
        compNow = comp;
      }
      break;
    }
  }
  // render competition action card
  const actionContainer = document.querySelector('.action-cards');
  if (compNow) {
    if (!document.getElementById('comp-only-action')) {
      const compCard = document.createElement('div');
      compCard.className = 'action-card'; compCard.id = 'comp-only-action'; compCard.setAttribute('role','button'); compCard.tabIndex = 0;
      compCard.innerHTML = `<div class="card-title">参加比赛【${compNow.name}】</div>`;
      compCard.onclick = () => { holdCompetitionModal(compNow); };
      actionContainer.appendChild(compCard);
    }
    document.body.classList.add('comp-week');
  } else {
    document.body.classList.remove('comp-week');
    const compCard = document.getElementById('comp-only-action');
    if (compCard) compCard.remove();
  }
}

// Returns competition object if this week has one, otherwise null

// Render a minimal UI that shows only the "参加比赛" button and auto-starts the competition.

/* ======= 主要逻辑函数（训练/集训/活动/周结算/随机事件/比赛等） ======= */
/* 训练（1周） */
function trainStudents(topic,intensity){
  log(`开始 ${topic} 训练（${intensity===1?'轻':intensity===2?'中':'重'}）`);
  const __before = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  let weather_factor = game.getWeatherFactor();
  let comfort = game.getComfort();
  let comfort_factor = 1.0 + Math.max(0.0, (50 - comfort) / 100.0);
  let facility_eff = game.facilities.getLibraryEfficiency();
  for(let s of game.students){
    if(!s.active) continue;
    s.comfort = comfort;
    let sick_penalty = (s.sick_weeks > 0) ? 0.7 : 1.0;
    let base_gain = intensity * TRAINING_BASE_KNOWLEDGE_GAIN_PER_INTENSITY;
    let knowledge_gain = s.calculateKnowledgeGain(base_gain, facility_eff, sick_penalty);
    knowledge_gain = Math.max(0, knowledge_gain);
    if(topic === "数据结构"){
      s.knowledge_ds += knowledge_gain;
      s.thinking += uniform(TRAINING_THINKING_GAIN_MIN, TRAINING_THINKING_GAIN_MIN + 1.0)*(1 - Math.min(0.6, s.pressure/200.0));
      s.coding += uniform(TRAINING_CODING_GAIN_MIN, TRAINING_CODING_GAIN_MIN + 1.0)*(1 - Math.min(0.6, s.pressure/200.0));
    } else if(topic === "图论"){
      s.knowledge_graph += knowledge_gain;
      s.thinking += uniform(TRAINING_THINKING_GAIN_MIN + 0.4, TRAINING_THINKING_GAIN_MIN + 1.4)*(1 - Math.min(0.6,s.pressure/200.0));
    } else if(topic === "字符串"){
      s.knowledge_string += knowledge_gain;
      s.coding += uniform(TRAINING_CODING_GAIN_MIN + 0.6, TRAINING_CODING_GAIN_MIN + 1.6)*(1 - Math.min(0.6,s.pressure/200.0));
    } else if(topic === "数学"){
      s.knowledge_math += knowledge_gain;
      s.thinking += uniform(TRAINING_THINKING_GAIN_MIN + 1.0, TRAINING_THINKING_GAIN_MIN + 2.0)*(1 - Math.min(0.6,s.pressure/200.0));
    } else if(topic === "DP"){
      s.knowledge_dp += knowledge_gain;
      s.thinking += uniform(TRAINING_THINKING_GAIN_MIN + 0.8, TRAINING_THINKING_GAIN_MIN + 1.4)*(1 - Math.min(0.6,s.pressure/200.0));
    } else if(topic === "综合"){
      let avg_gain = Math.max(1, Math.floor(knowledge_gain * 0.25));
      s.knowledge_ds += avg_gain; s.knowledge_graph += avg_gain; s.knowledge_string += avg_gain; s.knowledge_math += avg_gain; s.knowledge_dp += avg_gain;
      let computer_eff = game.facilities.getComputerEfficiency();
      s.thinking += uniform(TRAINING_THINKING_GAIN_MIN, TRAINING_THINKING_GAIN_MIN + 0.6) * computer_eff * (1 - Math.min(0.6, s.pressure/200.0));
      s.coding += uniform(TRAINING_CODING_GAIN_MIN, TRAINING_CODING_GAIN_MIN + 0.6) * computer_eff * (1 - Math.min(0.6, s.pressure/200.0));
    }
    s.thinking = Math.min(100.0, s.thinking);
    s.coding = Math.min(100.0, s.coding);
    let base_pressure = (intensity===1)?10 : (intensity===2)?20 : 30;
    if(intensity===3) base_pressure *= TRAINING_PRESSURE_MULTIPLIER_HEAVY;
    else if(intensity===2) base_pressure *= TRAINING_PRESSURE_MULTIPLIER_MEDIUM;
    if(topic === "综合") base_pressure *= COMPOSITE_TRAINING_PRESSURE_BONUS;
    let canteen_reduction = game.facilities.getCanteenPressureReduction();
    let pressure_increase = base_pressure * weather_factor * canteen_reduction * comfort_factor;
    if(s.sick_weeks > 0) pressure_increase += 10;
    s.pressure += pressure_increase;
  }
  game.weeks_since_entertainment += 1;
    log("训练结束（1周）。");
  const __after = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  if(__before && __after) __summarizeSnapshot(__before, __after, `训练：${topic}`);
}

/* 外出集训（略） - 保持与前版本一致（不改动逻辑，仅 UI 触发） */
function outingTraining(difficulty_choice, province_choice){
  let target = PROVINCES[province_choice];
  const __before = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  let base_cost = OUTFIT_BASE_COST_BASIC;
  if(difficulty_choice===2) base_cost = OUTFIT_BASE_COST_INTERMEDIATE;
  else if(difficulty_choice===3) base_cost = OUTFIT_BASE_COST_ADVANCED;
  if(target.type==="强省") base_cost = Math.floor(base_cost * STRONG_PROVINCE_COST_MULTIPLIER);
  else if(target.type==="弱省") base_cost = Math.floor(base_cost * WEAK_PROVINCE_COST_MULTIPLIER);
  let final_cost = base_cost + uniformInt(-3000,3000);
  let knowledge_base = OUTFIT_KNOWLEDGE_BASE_BASIC;
  let ability_base = OUTFIT_ABILITY_BASE_BASIC;
  let pressure_gain = OUTFIT_PRESSURE_BASIC;
  if(difficulty_choice===2){
    knowledge_base = OUTFIT_KNOWLEDGE_BASE_INTERMEDIATE;
    ability_base = OUTFIT_ABILITY_BASE_INTERMEDIATE;
    pressure_gain = OUTFIT_PRESSURE_INTERMEDIATE;
  } else if(difficulty_choice===3){
    knowledge_base = OUTFIT_KNOWLEDGE_BASE_ADVANCED;
    ability_base = OUTFIT_ABILITY_BASE_ADVANCED;
    pressure_gain = OUTFIT_PRESSURE_ADVANCED;
  }
  let knowledge_mult=1.0, ability_mult=1.0;
  if(difficulty_choice===2){ knowledge_mult=1.2; ability_mult=1.2; }
  else if(difficulty_choice===3){ knowledge_mult=1.5; ability_mult=1.5; }
  knowledge_mult *= target.trainingQuality;
  ability_mult *= target.trainingQuality;
  let knowledge_min = Math.floor(knowledge_base * knowledge_mult);
  let knowledge_max = Math.floor(knowledge_base * knowledge_mult * 1.8);
  let ability_min = ability_base * ability_mult;
  let ability_max = ability_base * ability_mult * 2.0;
  if(game.budget < final_cost){ alert("经费不足，无法外出集训！"); return; }
  game.budget -= final_cost;
  log(`外出集训：${target.name} (${target.type})，难度:${difficulty_choice}，费用 ¥${final_cost}`);
  // 隐藏模拟赛难度映射：基础班->普及级(1)，提高班->NOIP级(2)，冲刺班->NOI级(4)
  const DIFFIDX_MAP = {1:1, 2:2, 3:4};
  const diffIdxForHidden = DIFFIDX_MAP[difficulty_choice] || 1;
  for(let s of game.students){
    if(!s.active) continue;
    // 先对单个学生做一次隐藏模拟赛（不弹窗），用于调整收益与压力
    let hiddenScore = simulateHiddenMockScore(s, diffIdxForHidden);
    // 根据分数独立计算增益修正与压力修正
    let knowledge_modifier = 1.0;
    let ability_modifier = 1.0;
    let pressure_delta = 0;
    if(hiddenScore < 100){
      knowledge_modifier = 0.6; ability_modifier = 0.6; pressure_delta = 10;
    } else if(hiddenScore > 200){
      knowledge_modifier = 1.3; ability_modifier = 1.3; pressure_delta = -10;
    }

    let knowledge_gain = Math.floor(uniformInt(knowledge_min, knowledge_max) * knowledge_modifier);
    s.knowledge_ds += knowledge_gain; s.knowledge_graph += knowledge_gain; s.knowledge_string += knowledge_gain; s.knowledge_math += knowledge_gain; s.knowledge_dp += knowledge_gain;
    let ability_gain = uniform(ability_min, ability_max) * ability_modifier;
    s.thinking += ability_gain; s.coding += ability_gain; s.mental += ability_gain * 0.5;
    s.thinking = Math.min(100,s.thinking); s.coding = Math.min(100,s.coding); s.mental = Math.min(100,s.mental);
    // apply pressure (base pressure + per-student delta)
    s.pressure += pressure_gain + pressure_delta;
    s.comfort -= 10;
    // 记录隐藏模拟赛分数供调试（不会在 UI 自动显示）
    s.hiddenMockScore = hiddenScore;
  }
  game.weeks_since_entertainment += 1;
    log("外出集训完成（1周）。");
  const __after = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  if(__before && __after) __summarizeSnapshot(__before, __after, `外出集训：${target.name} 难度${difficulty_choice}`);
}

// 辅助：为单个学生运行一次隐藏模拟赛，返回总分（0..400），不弹窗
function simulateHiddenMockScore(s, diffIdx){
  const knowledge_types = ["数据结构","图论","字符串","数学","动态规划"];
  let total = 0;
  for(let qi=0; qi<4; qi++){
    let num_tags = uniformInt(1,3);
    let selected = [];
    while(selected.length < num_tags){
      let idx = uniformInt(0,4);
      if(!selected.includes(knowledge_types[idx])) selected.push(knowledge_types[idx]);
    }
    let totalK = 0; for(let t of selected) totalK += s.getKnowledgeByType(t);
    let avgK = selected.length>0 ? Math.floor(totalK / selected.length) : 0;
    let knowledge_multiplier = 3.5;
    let ability_avg = s.getAbilityAvg();
    let mental_idx = s.getMentalIndex();
    let perf = sigmoid((ability_avg + avgK * knowledge_multiplier - 0) / 15.0);
    let difficulty_proxy = MOCK_CONTEST_DIFF_VALUES[diffIdx] || 30;
    let stability = mental_idx / 100.0;
    let sigma = (100 - mental_idx) / 150.0 + 0.08;
    let random_factor = normal(0, sigma);
    let final_ratio = perf * stability * (1 + random_factor) * sigmoid((ability_avg + avgK * knowledge_multiplier - difficulty_proxy) / 10.0);
    final_ratio = clamp(final_ratio, 0, 1);
    let score = Math.floor(final_ratio * 100 / 10) * 10;
    score = clampInt(score,0,100);
    total += score;
  }
  return total;
}

/* 模拟赛：支持每题多 tag、难度显示为等级（MOCK_CONTEST_DIFFICULTIES），并在弹窗里显示每题得分表格
   - 对“多 tag”微调公式：对 mock contest 使用知识权重 3.5（略高于正式比赛的 2.0），使多标签贡献更明显。
   - 显示：弹窗呈现每题标签、每个学生每题成绩与总分；关闭弹窗时才把成绩带来的知识/心理/压力变化应用到学生（与 C++ 的逻辑一致）
*/
const KP_OPTIONS = [{id:1,name:"数据结构"},{id:2,name:"图论"},{id:3,name:"字符串"},{id:4,name:"数学"},{id:5,name:"动态规划"}];

function holdMockContestModal(isPurchased, diffIdx, questionTagsArray){
  // questionTagsArray: array of arrays of tag names for 4 questions
  let base_difficulty_label = MOCK_CONTEST_DIFFICULTIES[diffIdx];
  // compute results but DO NOT apply changes yet
  let results = [];
  for(let s of game.students){
    if(!s.active) continue;
    let total = 0; let scores = [];
    for(let qi=0; qi<4; qi++){
      let tags = questionTagsArray[qi]; // array of strings
      // compute average knowledge across tags
      let totalK = 0;
      for(let t of tags) totalK += s.getKnowledgeByType(t);
      let avgK = tags.length>0 ? Math.floor(totalK / tags.length) : 0;
      // Micro-tuned formula for mock contest:
      // effective_difficulty = diff_factor (we don't expose numeric diff to player)
      // We use knowledge multiplier 3.5 here (微调)
      let knowledge_multiplier = 3.5;
      let ability_avg = s.getAbilityAvg();
      let mental_idx = s.getMentalIndex();
      // compute a performance ratio similar to C++ but with modified knowledge weight
      let perf = sigmoid((ability_avg + avgK * knowledge_multiplier - /*difficulty proxy*/ 0) / 15.0);
  // 使用指定的难度数值作为内部 difficulty proxy，使模拟赛与正式赛难度一致
  let difficulty_proxy = MOCK_CONTEST_DIFF_VALUES[diffIdx] || 30;
  let stability = mental_idx / 100.0;
  let sigma = (100 - mental_idx) / 150.0 + 0.08;
  let random_factor = normal(0, sigma);
  // 把 difficulty_proxy 引入 perf 计算：类似正式比赛用 (ability - difficulty)/scale 的思路
  // 这里我们将 difficulty_proxy 映射到与能力尺度相近的影响：除以 10
  let final_ratio = perf * stability * (1 + random_factor) * sigmoid((ability_avg + avgK * knowledge_multiplier - difficulty_proxy) / 10.0);
      final_ratio = clamp(final_ratio, 0, 1);
      // score out of 100 per problem
      let score = Math.floor(final_ratio * 100 / 10) * 10;
      score = clampInt(score,0,100);
      scores.push(score);
      total += score;
    }
    results.push({name:s.name,total,scores});
  }
  results.sort((a,b)=>b.total - a.total);
  // Build modal HTML showing per-question tags and a table of scores
  let html = `<h3>模拟赛结果 — 难度：${base_difficulty_label}</h3>`;
  html += `<div class="small">题目标签：</div>`;
  html += `<table><thead><tr><th>题号</th><th>标签</th></tr></thead><tbody>`;
  for(let i=0;i<4;i++){
    html += `<tr><td>T${i+1}</td><td>${questionTagsArray[i].join(" , ") || "（无）"}</td></tr>`;
  }
  html += `</tbody></table>`;
  html += `<div style="margin-top:8px">`;
  html += `<table><thead><tr><th>名次</th><th>姓名</th><th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>总分</th></tr></thead><tbody>`;
  for(let i=0;i<results.length;i++){
    let r = results[i];
    html += `<tr><td>${i+1}</td><td>${r.name}</td>`;
    for(let j=0;j<4;j++) html += `<td>${r.scores[j]}</td>`;
    html += `<td>${r.total}</td></tr>`;
  }
  html += `</tbody></table></div>`;
  html += `<div style="text-align:right;margin-top:8px"><button class="btn btn-ghost" onclick="closeModal()">关闭不应用</button> <button class="btn" id="mock-apply">应用结果并关闭</button></div>`;
  showModal(html);
  // on apply: perform exact same updates as previous C++ logic (knowledge gain, mental changes, pressure)
  $('mock-apply').onclick = ()=>{
    const __before = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
    // apply
    let base_knowledge_min = Math.floor(2 * (isPurchased?MOCK_CONTEST_GAIN_MULTIPLIER_PURCHASED:1.0));
    let base_knowledge_max = Math.floor(6 * (isPurchased?MOCK_CONTEST_GAIN_MULTIPLIER_PURCHASED:1.0));
    for(let s of game.students){
      if(!s.active) continue;
      let r = results.find(x=>x.name===s.name) || {total:0,scores:[0,0,0,0]};
      let total_score = r.total;
      let pressure_gain = 20; let mental_change=0; let overall_score_factor=1.0;
      if(total_score < 100){ mental_change = uniform(-16,-6); pressure_gain = 30; overall_score_factor = 0.3; }
      else if(total_score < 200){ mental_change = uniform(-2,4); pressure_gain = 20; overall_score_factor = 0.7; }
      else if(total_score <= 300){ mental_change = uniform(6,16); pressure_gain = 10; overall_score_factor = 1.0; }
      else { mental_change = uniform(2,6); pressure_gain = 16; overall_score_factor = 0.6; }
      for(let i=0;i<4;i++){
        let tags = questionTagsArray[i];
        let totalK = 0; for(let t of tags) totalK += s.getKnowledgeByType(t);
        let avgK = tags.length>0 ? Math.floor(totalK / tags.length) : 0;
        let problem_score = r.scores[i] || 0;
        let problem_score_factor = problem_score / 100.0;
        let growth_factor = (problem_score_factor * 0.7 + overall_score_factor * 0.3);
        let knowledge_gain = Math.max(0, Math.floor(uniform(base_knowledge_min, base_knowledge_max) * growth_factor));
        // distribute to tags (均等分配)
        if(tags.length>0){
          let per = Math.floor(knowledge_gain / tags.length);
          for(let t of tags) s.addKnowledge(t, per);
        }
      }
      s.mental = clamp(s.mental + mental_change, 0,100);
      s.pressure += pressure_gain;
    }
    closeModal();
    log("模拟赛结果已应用（1周结算后的效果）。");
    renderAll();
    // 尝试在内部创建 after 快照并调用汇总（使用 handler 内的 __before）
    try{
      const __after = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
      if(typeof __before !== 'undefined' && __before && __after && typeof __summarizeSnapshot === 'function'){
        __summarizeSnapshot(__before, __after, `模拟赛（${base_difficulty_label}）`);
      }
    }catch(e){ /* 忽略汇总错误 */ }
  };
}
/* 正式比赛：使用 C++ 一致的 getPerformanceScore，且以弹窗显示每题成绩、总分、晋级/奖牌
   - 比赛周触发时只弹窗显示比赛（要求 5 ）
*/
function holdCompetitionModal(comp){
  // comp: {week,name,difficulty,maxScore}
  // Build problems: 4 problems each with 1..3 tags (like C++ implementation)
  const knowledge_types = ["数据结构","图论","字符串","数学","DP"];
  let problems = [];
  for(let i=0;i<4;i++){
    let num_tags = uniformInt(1,3);
    let selected_indices = [];
    while(selected_indices.length < num_tags){
      let idx = uniformInt(0,4);
      if(!selected_indices.includes(idx)) selected_indices.push(idx);
    }
    let tags = selected_indices.map(j => knowledge_types[j]);
    let min_diff = comp.difficulty * (0.6 + 0.2 * i);
    let max_diff = comp.difficulty * (0.8 + 0.2 * i);
    let difficulty = uniform(min_diff, max_diff);
    problems.push({tags,difficulty});
  }
  // compute pass line as in C++
  let base_pass_line = 0;
  // find comp data in competitions list to compute passline by province
  let compData = competitions.find(c=>c.name===comp.name);
  if(compData){
    let base_rate = WEAK_PROVINCE_BASE_PASS_RATE;
    if(game.province_type === "强省") base_rate = STRONG_PROVINCE_BASE_PASS_RATE;
    else if(game.province_type === "普通省") base_rate = NORMAL_PROVINCE_BASE_PASS_RATE;
    if(comp.name === "省选") base_rate += PROVINCIAL_SELECTION_BONUS;
    base_pass_line = comp.maxScore * base_rate;
  }
  let dynamic_factor = 1.0 - (game.reputation - 50) * 0.01;
  let pass_line = Math.floor(base_pass_line * dynamic_factor);
  // Ensure pass line does not exceed 90% of the competition's max score
  try{
    const maxAllowed = Math.floor(comp.maxScore * 0.9);
    if(pass_line > maxAllowed) pass_line = maxAllowed;
  }catch(e){ /* ignore if comp.maxScore is not present */ }
  // evaluate students using Student.getPerformanceScore for each problem
  // Determine current half-season index (0 or 1) and enforce chain qualification
  const halfIndex = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
  let results = [];
  for(let s of game.students){
    if(!s.active) continue;
    // determine eligibility based on competition chain
    let isEligible = true;
    const compIdx = COMPETITION_ORDER.indexOf(comp.name);
    if(compIdx > 0){
      const prevComp = COMPETITION_ORDER[compIdx - 1];
      if(!game.qualification[halfIndex] || !game.qualification[halfIndex][prevComp] || !game.qualification[halfIndex][prevComp].has(s.name)){
        isEligible = false;
      }
    }
    if(!isEligible){
      // not allowed to participate this competition in current half-season
      results.push({name:s.name,total:null,scores:null,eligible:false});
      continue;
    }
    let total = 0; let scores = [];
    for(let i=0;i<4;i++){
      let tags = problems[i].tags;
      let totalK = 0; for(let t of tags) totalK += s.getKnowledgeByType(t);
      let avgK = Math.floor(totalK / tags.length);
      let score = s.getPerformanceScore(problems[i].difficulty, 100, avgK);
      let final = Math.floor(score);
      final = Math.floor(final/10)*10;
      final = clampInt(final,0,100);
      scores.push(final);
      total += final;
    }
    results.push({name:s.name,total,scores,eligible:true});
  }
  // sort: participants by total desc first, then non-participants at end
  results.sort((a,b)=>{
    if(a.eligible === false && b.eligible !== false) return 1;
    if(b.eligible === false && a.eligible !== false) return -1;
    if(a.total == null && b.total == null) return 0;
    return (b.total || 0) - (a.total || 0);
  });
  // Build modal HTML
  let html = `<h3>${comp.name} - 正式比赛结果</h3>`;
  html += `<div class="small">晋级线: ${pass_line.toFixed(1)} 分</div>`;
  html += `<div style="margin-top:8px">`;
  html += `<table><thead><tr><th>题号</th><th>难度(内部)</th><th>标签</th></tr></thead><tbody>`;
  for(let i=0;i<4;i++){
    html += `<tr><td>T${i+1}</td><td>${problems[i].difficulty.toFixed(1)}</td><td>${problems[i].tags.join(", ")}</td></tr>`;
  }
  html += `</tbody></table></div>`;
  html += `<div style="margin-top:8px">`;
  html += `<table><thead><tr><th>名次</th><th>姓名</th><th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>总分</th><th>备注</th></tr></thead><tbody>`;
  for(let i=0;i<results.length;i++){
    let r = results[i];
    let remark = '';
    if(r.eligible === false){ remark = '未参加'; }
    else if(r.total >= pass_line) remark = '晋级';
    if(comp.name === "NOI"){
      if(r.eligible === true && r.total >= comp.maxScore * NOI_GOLD_THRESHOLD) remark += (remark? "；":"") + "🥇金牌";
      else if(r.eligible === true && r.total >= comp.maxScore * NOI_SILVER_THRESHOLD) remark += (remark? "；":"") + "🥈银牌";
      else if(r.eligible === true && r.total >= comp.maxScore * NOI_BRONZE_THRESHOLD) remark += (remark? "；":"") + "🥉铜牌";
    }
    html += `<tr><td>${i+1}</td><td>${r.name}</td>`;
    if(r.eligible === false){
      html += `<td colspan="4" style="text-align:center;color:#999">未参加</td>`;
      html += `<td>—</td><td>${remark}</td></tr>`;
    } else {
      for(let j=0;j<4;j++) html += `<td>${r.scores[j]}</td>`;
      html += `<td>${r.total}</td><td>${remark}</td></tr>`;
    }
  }
  html += `</tbody></table></div>`;
  html += `<div style="text-align:right;margin-top:8px"><button class="btn" id="comp-apply">关闭并应用影响</button></div>`;
  // Show modal (important: per user's request, 比赛周只弹窗显示比赛)
  showModal(html);
  $('comp-apply').onclick = ()=>{
    const __before = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
    // apply effects (mirrors C++ logic) but only for eligible participants
  const halfIndexApply = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
    // ensure qualification structure exists
    if(!game.qualification[halfIndexApply]) game.qualification[halfIndexApply] = {};
    if(!game.qualification[halfIndexApply][comp.name]) game.qualification[halfIndexApply][comp.name] = new Set();

    // count passes only among eligible participants and record qualifications
    let pass_count = 0;
    for(let r of results){
      if(r.eligible === true && r.total >= pass_line){
        game.qualification[halfIndexApply][comp.name].add(r.name);
        pass_count++;
      }
    }

    // 如果处于第二轮赛季（halfIndexApply === 1）且本场比赛无人晋级 -> 视为晋级链断裂，直接结束赛季
    try{
      if(halfIndexApply === 1 && pass_count === 0){
        const ending = "🔚 晋级链断裂：本轮比赛无人晋级，赛季提前结束";
        // 记录事件与日志
  try{ pushEvent({ name: '赛季终止', description: ending, week: currWeek() }); }catch(e){}
        try{ log(`赛季提前结束：${ending}`); }catch(e){}
        // 标记并保存当前游戏状态与结局文本
        try{ game.seasonEndTriggered = true; localStorage.setItem('oi_coach_save', JSON.stringify(game)); localStorage.setItem('oi_coach_ending', ending); }catch(e){}
        // 显示结算提示并跳转到结算页面
        closeModal();
        showModal(`<h3>赛季结束</h3><div class="small">${ending}</div><div style="text-align:right;margin-top:8px"><button class="btn" onclick="(function(){ closeModal(); window.location.href='end.html'; })()">查看结算页面</button></div>`);
        renderAll();
        return; // 中止后续比赛应用逻辑
      }
    }catch(e){ console.error('early season-end check failed', e); }

    let gold=0,silver=0,bronze=0;
    if(comp.name==="NOI"){
      for(let r of results){
        if(r.eligible !== true) continue;
        if(r.total >= comp.maxScore * NOI_GOLD_THRESHOLD) gold++;
        else if(r.total >= comp.maxScore * NOI_SILVER_THRESHOLD) silver++;
        else if(r.total >= comp.maxScore * NOI_BRONZE_THRESHOLD) bronze++;
      }
    }

    // update students' pressure/mental and game state (rewards)
    for(let s of game.students){
      if(!s.active) continue;
      // find this student's result
      let r = results.find(x=>x.name === s.name) || null;
      if(r && r.eligible === false){
        // Did not participate this competition in current half-season
        // They receive no score; small morale/pressure change to reflect absence
        s.pressure += 5;
        s.mental += uniform(-6,-2);
        continue;
      }
      // participant: apply normal effects
      if(comp.name==="NOI"){
        s.pressure += 40;
        for(let i=0;i<results.length;i++){
          if(results[i].name === s.name){
            game.noi_rankings.push({name:s.name,rank:i+1});
            if(results[i].eligible === true && results[i].total >= comp.maxScore * NOI_SILVER_THRESHOLD) s.mental += uniform(-5,5);
            else s.mental += uniform(-15,-5);
            break;
          }
        }
      } else if(comp.name==="省选"){
        s.pressure += uniform(20,35);
        s.mental += uniform(-5,5);
      } else if(comp.name==="NOIP"){
        s.pressure += uniform(15,25);
      } else {
        s.pressure += uniform(5,10);
      }
    }

    // --- 新增：当有学生晋级时触发上级拨款 ---
    try{
      if(pass_count > 0){
        // 比赛等级映射（用户要求）
        const levelMap = { 'CSP-S1': 0.3, 'CSP-S2': 1, 'NOIP': 2 };
        const level = levelMap[comp.name] || 1;
        // 省份强弱系数：根据 game.province_type（'强省','普通省','弱省'）决定
        let provinceCoef = 1.0;
        try{
          const t = (game.province_type || '').toString();
          if(t.includes('强')) provinceCoef = 1.2;
          else if(t.includes('弱')) provinceCoef = 0.8;
          else provinceCoef = 1.0;
        }catch(e){ provinceCoef = 1.0; }

        const perPassMin = 8000;
        const perPassMax = 20000;
        const rand = uniformInt(perPassMin, perPassMax);
        const grant = Math.round(pass_count * level * rand * provinceCoef);
        game.budget = (game.budget || 0) + grant;
  const msg = `上级拨款：由于 ${comp.name} 有 ${pass_count} 人晋级，获得拨款 ¥${grant}（等级${level}，省系数${provinceCoef}）`;
  log && log(`[拨款] ${msg}`);
  // 事件卡显示只保留金额，以保持简洁
  pushEvent && pushEvent({ name:'上级拨款', description: `¥${grant}`, week: currWeek() });
      }
    }catch(e){ console.error('grant error', e); }

    if(comp.name==="NOI"){
      if(gold>0 || silver>0){
        let reward = uniformInt(NOI_REWARD_MIN, NOI_REWARD_MAX);
        game.reputation += uniformInt(30,50);
        game.budget += reward;
        game.had_good_result_recently = true;
        game.weeks_since_good_result = 0;
        game.teaching_points += 5 * (gold + silver);
      }
    } else if(comp.name==="NOIP"){
      if(pass_count>0){
        // 晋级参加 NOIP
        let reward = uniformInt(NOIP_REWARD_MIN, NOIP_REWARD_MAX);
        game.reputation += uniformInt(15,25);
        game.budget += reward;
        game.had_good_result_recently = true;
        game.weeks_since_good_result = 0;
        game.teaching_points += 5 * pass_count;
        // 重置模拟赛/正式赛阻塞状态
        game.mockBlockedThisYear = false;
        game.mockBlockedReason = "";
      } else {
        // 未晋级时设置阻塞原因
        game.mockBlockedThisYear = true;
        game.mockBlockedReason = "CSP-S2 未晋级，无法参加 NOIP";
      }
    } else if(comp.name==="省选"){
      if(pass_count>0){
        game.reputation += uniformInt(10,20);
      }
    } else if(comp.name==="CSP-S2"){
      // NOTE: results.length includes non-participants; use number of eligible participants
      let eligibleCount = results.filter(r=>r.eligible===true).length;
      if(pass_count >= eligibleCount * 0.7){
        let reward = uniformInt(CSP_S2_REWARD_MIN, CSP_S2_REWARD_MAX);
        game.reputation += uniformInt(5,10);
        game.budget += reward;
        game.mockBlockedThisYear = false; game.mockBlockedReason = "";
      } else {
        game.mockBlockedThisYear = true;
        game.mockBlockedReason = "CSP-S2 未达到要求，无法参加本年度比赛";
      }
    } else if(comp.name==="CSP-S1"){
      let eligibleCount = results.filter(r=>r.eligible===true).length;
      if(pass_count >= eligibleCount * 0.8){
        let reward = uniformInt(CSP_S1_REWARD_MIN, CSP_S1_REWARD_MAX);
        game.reputation += uniformInt(2,5);
        game.budget += reward;
      }
    }
  closeModal();
  const __after = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  if(__before && __after) __summarizeSnapshot(__before, __after, `比赛：${comp.name}`);
    // 标记为已完成，使用唯一键避免重复触发
    try{
  const halfIndexApply = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
      const doneKey = `${halfIndexApply}_${comp.name}_${comp.week}`;
      if(!game.completedCompetitions) game.completedCompetitions = new Set();
      game.completedCompetitions.add(doneKey);
      // 记录本场比赛到生涯记录（包括每个学生的名次/分数/备注）
      try{
        const record = {
          week: comp.week,
          halfIndex: halfIndexApply,
          name: comp.name,
          passLine: pass_line,
          maxScore: comp.maxScore || 400,
          entries: results.map((r, idx) => ({ name: r.name, total: r.total, eligible: r.eligible, remark: (r.eligible===false? '未参加' : (r.total>=pass_line? '晋级':'')), rank: r.eligible? (r.total!=null? (results.filter(x=>x.eligible===true).map(x=>x.name).indexOf(r.name)+1) : null) : null }))
        };
        if(!game.careerCompetitions) game.careerCompetitions = [];
        game.careerCompetitions.push(record);
      }catch(e){ console.error('record career comp failed', e); }
    }catch(e){ console.error('mark completion error', e); }
    log(`${comp.name} 结果已应用`);
    // 比赛不再消耗周数：保留一次性事件模态抑制以避免弹窗干扰
    try{ game.suppressEventModalOnce = true; }catch(e){}
    renderAll();
  };

  // 在应用比赛结果后，若当前周已达到赛季末且尚未结算，则立即触发赛季结算（确保最终比赛结果被纳入结算）
  try{
  if(currWeek() >= SEASON_WEEKS && !game.seasonEndTriggered){
      // mark and save
      game.seasonEndTriggered = true;
      let ending = checkEnding();
  try{ pushEvent({ name: '赛季结束', description: `赛季结束：${ending}`, week: currWeek() }); }catch(e){}
      try{ localStorage.setItem('oi_coach_save', JSON.stringify(game)); localStorage.setItem('oi_coach_ending', ending); }catch(e){}
      showModal(`<h3>赛季结束</h3><div class="small">本轮赛季结算：${ending}</div><div style="text-align:right;margin-top:8px"><button class="btn" onclick="(function(){ closeModal(); window.location.href='end.html'; })()">查看结算页面</button></div>`);
    }
  }catch(e){ console.error('post-competition season-end check failed', e); }
}

/* 随机事件（和周结算） - 使用 events.js 的 EventManager 调度，可扩展 */
function checkRandomEvents(){
  if(window.EventManager && typeof window.EventManager.checkRandomEvents === 'function'){
    try{
      // If current week is a competition week, suppress event modals so they don't conflict
      // with the competition modal. We still let events run and be recorded (pushEvent),
      // but avoid opening modals that may trigger user actions or navigation.
      // Two situations when we want to silence event modals:
      // 1) It's currently a competition week (to avoid conflicting modals)
      // 2) A one-time suppression flag is set on the game (used after applying competition results
      //    to advance week without allowing event modals to steal focus). See where
      //    `game.suppressEventModalOnce` is set in the competition flow.
  const compNow = (typeof competitions !== 'undefined') ? competitions.find(c => c.week === currWeek()) : null;
      const suppressOnce = game && game.suppressEventModalOnce;
      if(compNow || suppressOnce){
        // temporarily replace modal showing functions with safe variants that only push events
        const origShowEventModal = window.showEventModal;
        const origShowChoiceModal = window.showChoiceModal;
        try{
          // Only suppress non-interactive event modals during competition weeks or one-time suppression.
          // Choice modals (that require player input) should still be allowed so the player can
          // respond to invitations/choices even during competition weeks.
          window.showEventModal = function(evt){ try{ if(window.pushEvent) window.pushEvent(evt); }catch(e){} };
          // Keep choice modal intact to allow player interaction. Do NOT override window.showChoiceModal here.
          window.EventManager.checkRandomEvents(game);
        }finally{
          // restore originals
          window.showEventModal = origShowEventModal;
          window.showChoiceModal = origShowChoiceModal;
          // clear the one-time suppression flag after use
          if(suppressOnce){ try{ game.suppressEventModalOnce = false; }catch(e){} }
        }
      } else {
        window.EventManager.checkRandomEvents(game);
      }
      window.renderAll();
    }
    catch(e){ console.error('EventManager.checkRandomEvents error', e); }
  } else {
    // fallback: no events manager available
    console.warn('EventManager 未注册，跳过随机事件处理');
  }
  window.renderAll();
}

/* 周结算（默认 2 周） */
function weeklyUpdate(weeks=1){
  let comfort = game.getComfort();
  for(let s of game.students) if(s.sick_weeks > 0) s.sick_weeks--;
  for(let s of game.students){
    if(!s.active) continue;
    function applyForgetting(knowledge){
      if(knowledge <=0) return 0;
      let original = knowledge;
      let forget_rate = KNOWLEDGE_FORGET_RATE;
      if(knowledge > 50) forget_rate = 1.0 - (1.0 - forget_rate) * 0.5;
      let new_val = Math.floor(knowledge * Math.pow(forget_rate, weeks));
      return Math.max(new_val, Math.floor(original * 0.8));
    }
    s.knowledge_ds = applyForgetting(s.knowledge_ds);
    s.knowledge_graph = applyForgetting(s.knowledge_graph);
    s.knowledge_string = applyForgetting(s.knowledge_string);
    s.knowledge_math = applyForgetting(s.knowledge_math);
    s.knowledge_dp = applyForgetting(s.knowledge_dp);
    let pressure_recovery = RECOVERY_RATE * (comfort/100.0) * weeks;
    s.pressure = Math.max(0, s.pressure - pressure_recovery);
    s.pressure = Math.min(100, s.pressure);
  }
  for(let i=0;i<weeks;i++){
    // 周度支出按人数系数调整
    const weeklyRaw = game.getWeeklyCost();
    const weeklyAdj = Math.round(weeklyRaw * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
    game.budget -= weeklyAdj;
    game.week++;
    game.updateWeather();
  }
  game.teaching_points += weeks;
  game.weeks_since_good_result += weeks;
  if(game.weeks_since_good_result > 12) game.had_good_result_recently = false;
  checkRandomEvents();
  // 如果到达第二赛季末（累计周数 >= SEASON_WEEKS），优先检查本周是否有未完成的正式比赛（如有则先打开比赛模态，赛季结算延后）
  if(currWeek() > SEASON_WEEKS && !game.seasonEndTriggered){
    try{
  const compThisWeek = Array.isArray(competitions) ? competitions.find(c => c.week === currWeek()) : null;
  const halfIndex = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
  const doneKey = compThisWeek ? `${halfIndex}_${compThisWeek.name}_${compThisWeek.week}` : null;
      const isCompleted = compThisWeek && game.completedCompetitions && game.completedCompetitions.has(doneKey);
      if(compThisWeek && !isCompleted){
        // 在赛季最后一周有尚未完成的正式比赛：直接打开比赛模态，延后赛季结算
        try{ holdCompetitionModal(compThisWeek); }catch(e){ console.error('open comp modal failed', e); }
      } else {
        // 无未完成比赛，正常触发赛季结算
        game.seasonEndTriggered = true;
  let ending = checkEnding();
  try{ pushEvent({ name: '赛季结束', description: `赛季结束：${ending}`, week: currWeek() }); }catch(e){}
        // 保存结算到 localStorage 以便 end.html 展示，并跳转到结算页
        try{
          localStorage.setItem('oi_coach_save', JSON.stringify(game));
          localStorage.setItem('oi_coach_ending', ending);
        }catch(e){}
        showModal(`<h3>赛季结束</h3><div class="small">本轮赛季结算：${ending}</div><div style="text-align:right;margin-top:8px"><button class="btn" onclick="(function(){ closeModal(); window.location.href='end.html'; })()">查看结算页面</button></div>`);
      }
    }catch(e){ console.error('season-end check failed', e); }
  }
  renderAll();
}
// 安全的周更新：在多周跳转时不跳过即将到来的比赛
function safeWeeklyUpdate(weeks = 1) {
  // 如果当前经费不足以维持下一周，则直接触发坏结局并跳转到结算页
  try{
    const nextWeekCostRaw = game.getWeeklyCost();
    const nextWeekCost = Math.round(nextWeekCostRaw * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
    if(typeof nextWeekCost === 'number' && game.budget < nextWeekCost){
      try{ pushEvent('经费不足，无法继续下一周，触发坏结局'); }catch(e){}
      try{
        localStorage.setItem('oi_coach_save', JSON.stringify(game));
        localStorage.setItem('oi_coach_ending', '💸 经费枯竭');
      }catch(e){}
      showModal(`<h3>经费不足</h3><div class="small">经费不足，项目无法继续，已进入结算页面。</div><div style="text-align:right;margin-top:8px"><button class="btn" onclick="(function(){ closeModal(); window.location.href='end.html'; })()">查看结算页面</button></div>`);
      renderAll();
      return;
    }
  }catch(e){ /* ignore */ }
  // 查找按周排序后的下场比赛
  const sorted = Array.isArray(competitions) ? competitions.slice().sort((a, b) => a.week - b.week) : [];
  let nextComp = sorted.find(c => c.week > currWeek());
  let weeksToComp = nextComp ? (nextComp.week - currWeek()) : Infinity;
  if (weeksToComp <= weeks) {
    // 跳转至比赛周
    weeklyUpdate(weeksToComp);
    // 剩余周数继续更新
    let rem = weeks - weeksToComp;
    if (rem > 0) weeklyUpdate(rem);
  } else {
    weeklyUpdate(weeks);
  }
}

/* 检查并在比赛周“只弹窗显示比赛” */
function checkCompetitions(){
  // 遍历按周排序后的比赛，确保与周次对齐
  const sorted = Array.isArray(competitions) ? competitions.slice().sort((a,b)=>a.week - b.week) : [];
  for(let comp of sorted){
  if(comp.week !== currWeek()) continue;
    // 构建唯一键：半季索引 + 比赛名 + 周数，避免误触发
  const halfIndex = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
    const key = `${halfIndex}_${comp.name}_${comp.week}`;
    if(game.completedCompetitions && game.completedCompetitions.has(key)){
      // 已完成，跳过
      continue;
    }
    // open modal for official competition and do application inside modal
    holdCompetitionModal(comp);
    break; // only one per week
  }
}

/* 结局判定 */
function checkEnding(){
  let active_count = game.students.filter(s=>s.active).length;
  let avg_pressure = 0;
  if(active_count>0) avg_pressure = game.students.filter(s=>s.active).reduce((a,s)=>a+s.pressure,0)/active_count;
  if(game.budget <= 0) {
    // 当经费耗尽或为 0 时触发坏结局，同时记录事件日志
    try{ pushEvent('经费耗尽，项目无法继续（坏结局触发）'); }catch(e){}
    return "💸 经费枯竭";
  }
  if(active_count < game.initial_students * 0.5) return "😵 心理崩溃";
  let has_gold=false, has_medal=false;
  for(let r of game.noi_rankings){ if(r.rank <= 3) has_gold=true; if(r.rank <=10) has_medal=true; }
  if(has_gold) return "🌟 荣耀结局";
  else if(has_medal) return "🏅 优秀结局";
  else if(active_count >= game.initial_students * 0.6 && avg_pressure <= 60) return "💼 平凡结局";
  else return "💼 平凡结局";
}

/* =========== UI：模态 / 启动 / 交互绑定 =========== */
function showModal(html){ $('modal-root').innerHTML = `<div class="modal"><div class="dialog">${html}</div></div>`; }
function closeModal(){ $('modal-root').innerHTML = ''; }

/* UI 表单与交互 */

/* 训练 UI */
function trainStudentsUI(){
  // render training types as horizontal option cards (same style as 娱乐 modal)
  const types = [
    {val:'数据结构', label:'数据结构', desc:'一定幅度提升数据结构技巧'},
    {val:'图论', label:'图论', desc:'一定幅度提升图论技巧'},
    {val:'字符串', label:'字符串', desc:'一定幅度提升字符串技巧'},
    {val:'数学', label:'数学', desc:'一定幅度提升数学技巧'},
    {val:'DP', label:'DP', desc:'一定幅度提升动态规划技巧'},
    {val:'综合', label:'综合训练', desc:'混合训练，提升幅度细微，压力开销大'}
  ];
  const typeCards = types.map(t=>`
    <div class="prov-card option-card" data-val="${t.val}" style="min-width:140px;padding:10px;border-radius:6px;cursor:pointer;">
      <div class="card-title">${t.label}</div>
      <div class="card-desc small muted">${t.desc}</div>
    </div>
  `).join('');

  showModal(`<h3>训练学生</h3>
    <label class="block">训练类型</label>
    <div id="train-type-grid" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;overflow-x:auto">${typeCards}</div>
    <label class="block" style="margin-top:10px">强度</label>
    <div id="train-int-grid" style="display:flex;gap:8px;margin-top:6px">
      <button class="prov-btn option-btn" data-val="1">轻</button>
      <button class="prov-btn option-btn" data-val="2">中</button>
      <button class="prov-btn option-btn" data-val="3">重</button>
    </div>
    <div style="margin-top:12px;text-align:right">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn" id="train-confirm">开始训练（1周）</button>
    </div>`);

  // wire up selection behavior for type cards (use option-card style like entertainment)
  const tCards = Array.from(document.querySelectorAll('#train-type-grid .option-card'));
  if(tCards.length>0) tCards[0].classList.add('selected');
  tCards.forEach(c=>{ c.onclick = ()=>{ tCards.forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); }; });
  // intensity buttons behavior
  document.querySelectorAll('#train-int-grid .option-btn').forEach(b=>{
    b.onclick = ()=>{ document.querySelectorAll('#train-int-grid .option-btn').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); };
  });

  $('train-confirm').onclick = ()=>{
    let topicBtn = document.querySelector('#train-type-grid .option-card.selected');
    let intBtn = document.querySelector('#train-int-grid .option-btn.selected');
    let topic = topicBtn ? topicBtn.dataset.val : '综合';
    let intensity = intBtn ? parseInt(intBtn.dataset.val) : 2;
    closeModal();
  trainStudents(topic, intensity);
  // 安全更新：判断下场比赛周数，避免培训跳过比赛
  let nextComp = competitions.find(c => c.week > currWeek());
  let weeksToComp = nextComp ? (nextComp.week - currWeek()) : Infinity;
  let advance = Math.min(1, weeksToComp);
  safeWeeklyUpdate(advance);
  renderAll();
  };
}

/* 模拟赛 UI：每题多标签（checkbox），难度以等级显示 */
function holdMockContestUI(){
  // Purchase option + difficulty level (labels) + 4 questions each multi-select checkboxes for tags
  let kpHtml = KP_OPTIONS.map(k=>`<label style="margin-right:8px"><input type="checkbox" class="kp-option" value="${k.name}"> ${k.name}</label>`).join("<br/>");
  showModal(`<h3>配置模拟赛（1周）</h3>
    <div><label class="block">是否购买题目</label><select id="mock-purchase"><option value="0">否（网赛）</option><option value="1">是（付费）</option></select></div>
    <div style="margin-top:8px"><label class="block">难度等级</label>
      <select id="mock-diff">${MOCK_CONTEST_DIFFICULTIES.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select>
    </div>
    <div style="margin-top:8px"><div class="small">为每题选择 1 或多个 知识点 标签：</div>
      ${[1,2,3,4].map(i=>`<div style="margin-top:6px"><strong>第 ${i} 题</strong><br/>${kpHtml}</div>`).join('')}
    </div>
    <div style="margin-top:10px;text-align:right">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
  <button class="btn" id="mock-submit">开始模拟赛（1周）</button>
    </div>`);
  $('mock-submit').onclick = ()=>{
    // read config
    let isPurchased = $('mock-purchase').value === "1";
    let diffIdx = parseInt($('mock-diff').value);
    // for each question collect selected tags
    let questionTagsArray = [];
    let kpOptions = Array.from(document.querySelectorAll('.kp-option'));
    let groupSize = KP_OPTIONS.length;
    for(let q=0;q<4;q++){
      let tags = [];
      for(let k=0;k<groupSize;k++){
        let idx = q*groupSize + k;
        if(kpOptions[idx] && kpOptions[idx].checked) tags.push(kpOptions[idx].value);
      }
      questionTagsArray.push(tags);
    }
    closeModal();
    // if purchased, charge (按人数系数调整)
    if(isPurchased){
      let cost = uniformInt(MOCK_CONTEST_PURCHASE_MIN_COST, MOCK_CONTEST_PURCHASE_MAX_COST);
      const adj = Math.round(cost * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
      if(game.budget < adj){ alert("经费不足，无法购买题目"); return; }
      game.budget -= adj;
      log(`购买模拟赛题目，基础 ¥${cost}，调整后 ¥${adj}`);
    } else {
      log("参加网赛（免费）");
    }
    // show modal results and apply after user confirms
  holdMockContestModal(isPurchased, diffIdx, questionTagsArray);
  safeWeeklyUpdate(1);
    renderAll();
  };
}

/* 娱乐 UI */
function entertainmentUI(){
  // 水平条形卡片选项
  const opts = [
    {id:1, val:'训话',label:'打鸡血',desc:'激励团队，提升心情，减压少量',cost:0},
    {id:2, val:'吃饭',label:`请学生吃饭 (¥${ENTERTAINMENT_COST_MEAL})`,desc:'补充能量，中等减压',cost:ENTERTAINMENT_COST_MEAL},
    {id:3, val:'自由活动',label:'允许学生自由活动',desc:'高度减压，注意天气影响',cost:0},
    {id:4, val:'打球',label:'和学生一起打球',desc:'锻炼身体，提升精神，适度减压',cost:0},
    {id:5, val:'打CS',label:`邀请学生打CS`,desc:'适度减压，有可能提升学生能力',cost:ENTERTAINMENT_COST_CS}
  ];
  let cardsHtml = opts.map(o=>`
    <div class="prov-card option-card" data-id="${o.id}" style="min-width:120px;border:1px solid #ddd;padding:8px;border-radius:6px;cursor:pointer;">
      <div class="card-title">${o.label}</div>
      <div class="card-desc small muted">${o.desc}</div>
    </div>
  `).join('');
  showModal(`<h3>娱乐活动（1周）</h3>
    <div style="display:flex;gap:12px;overflow-x:auto;">${cardsHtml}</div>
    <div style="margin-top:12px;text-align:right">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn" id="ent-confirm">确认</button>
    </div>`);
  // default select first
  const entCards = Array.from(document.querySelectorAll('.option-card'));
  if(entCards.length>0) entCards[0].classList.add('selected');
  entCards.forEach(c=>{ c.onclick = ()=>{ entCards.forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); }; });
  $('ent-confirm').onclick = ()=>{
    let sel = document.querySelector('.option-card.selected');
    let id = sel ? parseInt(sel.dataset.id) : opts[0].id;
    let opt = opts.find(o=>o.id===id) || {cost:0, id: id};
    let cost = opt.cost;
    // ID-based checks: 5 == 打CS
    if(opt.id === 5 && game.facilities.computer < 3){ alert("需要计算机等级 ≥ 3"); return; }
  // 娱乐费用按人数系数调整
  const costAdj = Math.round(cost * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
  if(game.budget < costAdj){ alert("经费不足"); return; }
  game.budget -= costAdj;
    closeModal();
      // apply quick entertainment logic based on numeric id
      for(let s of game.students){
        if(!s.active) continue;
        if(opt.id === 1){ // 训话
          s.mental += uniform(3,7); s.pressure = Math.max(0, s.pressure - uniform(30,45));
        } else if(opt.id === 2){ // 吃饭
          s.mental += uniform(8,20); s.pressure = Math.max(0, s.pressure - uniform(40,55));
        } else if(opt.id === 3){ // 自由活动
          let wf=1.0; if(game.weather==='雪') wf=2.0; else if(game.weather==='雨' && game.facilities.dorm<2) wf=0.5; s.pressure = Math.max(0, s.pressure - uniform(20,35)*wf); s.mental += uniform(3,8);
        } else if(opt.id === 4){ // 打球
          s.mental += uniform(4,8); s.pressure = Math.max(0, s.pressure - uniform(20,35));
        } else if(opt.id === 5){ // 打CS
          s.mental += uniform(1,5); s.coding += uniform(0.5,1.0); s.pressure = Math.max(0, s.pressure - uniform(10,20));
        }
        s.mental = Math.min(100, s.mental);
      }
  game.weeks_since_entertainment += 1;
  safeWeeklyUpdate(1);
    renderAll();
    log("娱乐活动完成");
  };
}

/* 放假 UI */
function takeVacationUI(){
  showModal(`<h3>放假</h3><label class="block">放假天数 (1-${VACATION_MAX_DAYS})</label><input id="vac-days" type="number" min="1" max="${VACATION_MAX_DAYS}" value="1" />
    <div style="text-align:right;margin-top:8px"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn" id="vac-confirm">确认</button></div>`);
  $('vac-confirm').onclick = ()=>{
    let days = clampInt(parseInt($('vac-days').value),1,VACATION_MAX_DAYS);
    closeModal();
  let weeks = Math.ceil(days / 7);
    if(!confirm(`放假 ${days} 天，将跳过 ${weeks} 周，确认？`)) return;
    for(let s of game.students){
      if(!s.active) continue;
      s.mental = Math.min(100, s.mental + days * uniform(3,8));
      s.pressure = Math.max(0, s.pressure - uniform(20,40) * days / 7.0);
    }
  // 安全更新，避免放假跳过比赛
  safeWeeklyUpdate(weeks);
  renderAll();
  log(`放假 ${days} 天，跳过 ${weeks} 周`);
  };
}

/* 劝退学生 UI */
function evictStudentUI(){
  // 列出所有在队学生供选择
  let options = game.students.map((s,i) => s.active ? `<option value="${i}">${s.name}</option>` : '').join('');
  showModal(
    `<h3>劝退学生</h3>
     <label class="block">选择要劝退的学生</label>
     <select id="evict-student">${options}</select>
     <div class="small" style="margin-top:4px">消耗声誉：${EVICT_REPUTATION_COST}</div>
     <div style="text-align:right;margin-top:8px">
       <button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn" id="evict-confirm">确认</button>
     </div>`
  );
  $('evict-confirm').onclick = () => {
    let idx = parseInt($('evict-student').value);
    let student = game.students[idx];
    if(game.reputation < EVICT_REPUTATION_COST){ alert('声誉不足，无法劝退'); return; }
    student.active = false;
    game.reputation -= EVICT_REPUTATION_COST;
    log(`劝退学生 ${student.name}，声誉 -${EVICT_REPUTATION_COST}`);
    closeModal();
    renderAll();
  };
}

// 劝退单个学生（从学生卡角落触发）
function evictSingle(idx){
  const student = game.students[idx];
  if(!student || !student.active) return;
  student.active = false;
  game.reputation -= EVICT_REPUTATION_COST;
  if(game.reputation < 0) game.reputation = 0;
  log(`劝退学生 ${student.name}，声誉 -${EVICT_REPUTATION_COST}`);
  renderAll();
}

/* 升级设施 UI */
function upgradeFacilitiesUI(){
  const facs = [{id:"computer",label:"计算机"},{id:"library",label:"资料库"},{id:"ac",label:"空调"},{id:"dorm",label:"宿舍"},{id:"canteen",label:"食堂"}];
  let html = `<h3>升级设施</h3><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">`;
  for(let f of facs){
    let current = game.facilities.getCurrentLevel(f.id);
    let max = game.facilities.getMaxLevel(f.id);
    let cost = game.facilities.getUpgradeCost(f.id);
    html += `<div style="padding:8px;border:1px solid #eee;border-radius:6px;">
      <div><strong>${f.label}</strong></div>
      <div class="small">等级：${current} / ${max}</div>
      <div class="small">升级费用：¥${cost}</div>
      <div style="margin-top:8px"><button class="btn upgrade" data-fac="${f.id}">升级</button></div>
    </div>`;
  }
  html += `</div><div style="text-align:right;margin-top:8px"><button class="btn btn-ghost" onclick="closeModal()">关闭</button></div>`;
  showModal(html);
  // bind upgrade buttons inside modal
  const modalUpgrades = document.querySelectorAll('#modal-root .btn.upgrade');
  modalUpgrades.forEach(b => {
    b.onclick = () => {
      const fac = b.dataset.fac;
      if(fac){
        upgradeFacility(fac);
        // refresh modal contents to show updated levels/costs
        upgradeFacilitiesUI();
      }
    };
  });
}
function upgradeFacility(f){
  let current = game.facilities.getCurrentLevel(f);
  let max = game.facilities.getMaxLevel(f);
  if(current >= max){ alert("已达最高等级"); return; }
  let cost = game.facilities.getUpgradeCost(f);
  if(!confirm(`升级到 ${current+1} 级 需要 ¥${cost}，确认？`)) return;
  // 升级费用按人数系数调整
  const costAdj = Math.round(cost * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
  if(game.budget < costAdj){ alert("经费不足"); return; }
  game.budget -= costAdj;
  game.facilities.upgrade(f);
  log(`设施升级：${f} 到等级 ${current+1}（基础 ¥${cost}，调整后 ¥${costAdj}）`);
  renderAll();
}

/* 休息 1 周 */
function rest1Week(){
  log("休息1周...");
  for(let s of game.students) if(s.active){ s.pressure = Math.max(0, s.pressure - uniform(16,36)); s.mental = Math.min(100, s.mental + uniform(0.4,1.6)); }
  // 安全更新，避免休息1周跳过比赛
  safeWeeklyUpdate(1);
  renderAll();
}

/* 保存/载入（localStorage 简易） */
function saveGame(){ try{ localStorage.setItem('oi_coach_save', JSON.stringify(game)); alert("已保存到 localStorage"); }catch(e){ alert("保存失败："+e); } }
function loadGame(){ try{ let raw = localStorage.getItem('oi_coach_save'); if(!raw){ alert("无存档"); return; } let o = JSON.parse(raw); // rehydrate
  game = Object.assign(new GameState(), o);
  game.facilities = Object.assign(new Facilities(), o.facilities);
  game.students = (o.students || []).map(s => Object.assign(new Student(), s));
  renderAll(); alert("已载入存档"); }catch(e){ alert("载入失败："+e); } }

// silent load used by index.html on startup (no alerts)
function silentLoad(){ try{ let raw = localStorage.getItem('oi_coach_save'); if(!raw) return false; let o = JSON.parse(raw); game = Object.assign(new GameState(), o); game.facilities = Object.assign(new Facilities(), o.facilities); game.students = (o.students || []).map(s => Object.assign(new Student(), s)); return true; }catch(e){ return false; } }

/* 初始化游戏（modal） */
function initGameUI(){
  showModal(`<h3>欢迎 — OI 教练模拟器</h3>
    <label class="block">选择难度</label><select id="init-diff"><option value="1">简单</option><option value="2" selected>普通</option><option value="3">困难</option></select>
    <label class="block">选择省份</label><div id="init-prov-grid" class="prov-grid"></div>
    <label class="block">学生人数 (3-10)</label><input id="init-stu" type="number" min="3" max="10" value="5" />
    <div style="text-align:right;margin-top:8px"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn" id="init-start">开始</button></div>`);
  // render province buttons
  let grid = document.getElementById('init-prov-grid');
  for(let k in PROVINCES){ let p=PROVINCES[k]; let btn=document.createElement('button'); btn.className='prov-btn'; btn.textContent=p.name; btn.dataset.val=k; btn.onclick=()=>{document.querySelectorAll('#init-prov-grid .prov-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');}; grid.appendChild(btn);}  
  // default select first province
  if(grid.firstChild) grid.firstChild.classList.add('selected');
  $('init-start').onclick = ()=>{
    let diff = parseInt($('init-diff').value);
    let prov = parseInt(document.querySelector('#init-prov-grid .prov-btn.selected').dataset.val);
    let count = clampInt(parseInt($('init-stu').value),3,10);
    closeModal();
    initGame(diff,prov,count);
    renderAll();
  };
}

// Render helpers for Start page (start.html)
function renderStartPageUI(){
  const grid = document.getElementById('start-prov-grid');
  if(!grid) return;
  grid.innerHTML = '';
  for(let k in PROVINCES){ let p=PROVINCES[k]; let btn=document.createElement('button'); btn.className='prov-btn'; btn.textContent=p.name; btn.dataset.val=k; btn.onclick=()=>{document.querySelectorAll('#start-prov-grid .prov-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');}; grid.appendChild(btn);}  
  if(grid.firstChild) grid.firstChild.classList.add('selected');
}

function startFromStartPage(){
  let diff = parseInt(document.getElementById('start-diff').value);
  let provBtn = document.querySelector('#start-prov-grid .prov-btn.selected');
  let prov = provBtn ? parseInt(provBtn.dataset.val) : 1;
  let count = clampInt(parseInt(document.getElementById('start-stu').value),3,10);
  // init game and persist to localStorage, then go to game.html
  // To avoid timing issues with localStorage availability during navigation,
  // pass initialization params via query string and let game.html initialize.
  const url = `game.html?new=1&d=${encodeURIComponent(diff)}&p=${encodeURIComponent(prov)}&c=${encodeURIComponent(count)}`;
  window.location.href = url;
}

// Render end summary on end.html
function renderEndSummary(){
  const el = document.getElementById('end-summary');
  if(!el) return;
  // try to read saved game from localStorage
  try{
    let raw = localStorage.getItem('oi_coach_save');
    if(!raw){ el.innerText = '无结算记录，无法显示结局。'; return; }
    let o = JSON.parse(raw);
    // small summary
    let active = (o.students || []).filter(s=>s.active).length;
    let initial = o.initial_students || (o.students? o.students.length : 0);
    let rep = o.reputation || 0;
    let budget = o.budget || 0;
    // compute avg pressure if available
    let avgP = 0; if(o.students && o.students.length>0){ avgP = Math.round(o.students.filter(s=>s.active).reduce((a,s)=>a+(s.pressure||0),0) / Math.max(1, active)); }
    // decide ending text using checkEnding logic by temporarily rehydrating minimal game
    let tmp = Object.assign(new GameState(), o);
    tmp.students = (o.students || []).map(s => Object.assign(new Student(), s));
    let ending = checkEnding.call({ game: tmp, students: tmp.students, budget: tmp.budget }) ;
    // fallback: call checkEnding directly (it uses global game) - so set global game to tmp then restore
    let prev = game; game = tmp; ending = checkEnding(); game = prev;
    // build career competitions table if present
    let careerHtml = '';
    const career = (o.careerCompetitions && Array.isArray(o.careerCompetitions)) ? o.careerCompetitions : (o.game && o.game.careerCompetitions ? o.game.careerCompetitions : null);
    if(career && career.length > 0){
      careerHtml += `<div style="margin-top:8px"><strong>生涯比赛记录</strong></div>`;
      careerHtml += `<div style="margin-top:6px;max-height:220px;overflow:auto"><table><thead><tr><th>周</th><th>比赛</th><th>名次/参与</th><th>总分</th><th>备注</th></tr></thead><tbody>`;
      for(let rec of career){
        // show top 3 entries quickly
        let rows = [];
        // show each eligible entry as separate row up to 6 rows to avoid huge table
        let shown = 0;
        for(let e of rec.entries){
          if(shown>=6) break;
          const rankText = e.rank? `${e.rank}` : (e.eligible? '-' : '—');
          const totalText = (e.total==null)? '—' : `${e.total}`;
          const remark = e.remark || (e.eligible? '' : '未参加');
          rows.push(`<tr><td>${rec.week}</td><td>${rec.name}</td><td>${rankText}</td><td>${totalText}</td><td>${remark}</td></tr>`);
          shown++;
        }
        careerHtml += rows.join('');
      }
      careerHtml += `</tbody></table></div>`;
    } else {
      careerHtml += `<div class="small muted" style="margin-top:8px">未记录到比赛生涯数据</div>`;
    }

    el.innerHTML = `<div>初始人数: <strong>${initial}</strong></div>
      <div>当前在队: <strong>${active}</strong></div>
      <div>平均压力: <strong>${avgP}</strong></div>
      <div>经费: <strong>¥${budget}</strong></div>
      <div>声誉: <strong>${rep}</strong></div>
      <div style="margin-top:8px;font-weight:600">结局： <span id=\"ending-text\" class=\"ending-highlight\">${ending}</span></div>
      ${careerHtml}`;
    // add a short animation pulse to ending text
    try{ const endEl = document.getElementById('ending-text'); if(endEl){ endEl.classList.add('ending-animate'); setTimeout(()=>{ endEl.classList.remove('ending-animate'); }, 2500); } }catch(e){}
  }catch(e){ el.innerText = '读取结算数据失败：'+e; }
}

/* initGame 逻辑（与 C++ 一致） */
function initGame(difficulty, province_choice, student_count){
  game = new GameState();
  game.difficulty = clampInt(difficulty,1,3);
  let prov = PROVINCES[province_choice] || PROVINCES[1];
  game.province_name = prov.name; game.province_type = prov.type; game.is_north = prov.isNorth; game.budget = prov.baseBudget; game.base_comfort = prov.isNorth?BASE_COMFORT_NORTH:BASE_COMFORT_SOUTH;
  if(game.difficulty===1){ game.budget = Math.floor(game.budget * EASY_MODE_BUDGET_MULTIPLIER); game.teaching_points = EASY_MODE_TEACHING_POINTS; }
  else if(game.difficulty===3){ game.budget = Math.floor(game.budget * HARD_MODE_BUDGET_MULTIPLIER); game.teaching_points = HARD_MODE_TEACHING_POINTS; }
  else game.teaching_points = NORMAL_MODE_TEACHING_POINTS;
  game.initial_students = student_count;
  let min_val,max_val;
  if(game.province_type==="强省"){ min_val = STRONG_PROVINCE_MIN_ABILITY; max_val = STRONG_PROVINCE_MAX_ABILITY; }
  else if(game.province_type==="弱省"){ min_val = WEAK_PROVINCE_MIN_ABILITY; max_val = WEAK_PROVINCE_MAX_ABILITY; }
  else { min_val = NORMAL_PROVINCE_MIN_ABILITY; max_val = NORMAL_PROVINCE_MAX_ABILITY; }
  if(game.difficulty===1){ min_val += EASY_MODE_ABILITY_BONUS; max_val += EASY_MODE_ABILITY_BONUS; }
  else if(game.difficulty===3){ min_val -= HARD_MODE_ABILITY_PENALTY; max_val -= HARD_MODE_ABILITY_PENALTY; }
  game.students = [];
  for(let i=0;i<student_count;i++){
    let name = generateName();
    // 使用高方差正态分布生成初始资质，保持平均数但增大方差
    let mean = (min_val + max_val) / 2;
    let stddev = (max_val - min_val);
    let thinking = clamp(normal(mean, stddev), 0, 100);
    let coding = clamp(normal(mean, stddev), 0, 100);
    let mental = clamp(normal(mean, stddev), 0, 100);
    game.students.push(new Student(name, thinking, coding, mental));
  }
  game.updateWeather();
  log("初始化完成，开始游戏！");
}

/* 绑定按钮 & 启动 */
window.onload = ()=>{
  // 注册默认事件到事件管理器（如果可用）
  if(window.EventManager && typeof window.EventManager.registerDefaultEvents === 'function'){
    try{
      // Inject the simple logger (log) - NOT pushEvent. Passing pushEvent here caused
      // EventManager to call pushEvent when it intended to only log text, creating
      // duplicate event cards. Use `log` to write to the log area without creating cards.
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
  // If we're on game.html (has action cards), load saved game silently and bind UI. Otherwise (start/end pages) skip game bindings.
  if(document.getElementById('action-train')){
    // If game.html was opened with new-game params, initialize from them
    const qs = (function(){ try{ return new URLSearchParams(window.location.search); }catch(e){ return null; } })();
    if(qs && qs.get('new') === '1'){
      const diff = clampInt(parseInt(qs.get('d')||2),1,3);
      const prov = clampInt(parseInt(qs.get('p')||1),1,Object.keys(PROVINCES).length);
      const count = clampInt(parseInt(qs.get('c')||5),3,10);
      initGame(diff, prov, count);
      try{ localStorage.setItem('oi_coach_save', JSON.stringify(game)); }catch(e){}
    } else {
      // try to load saved game; if none, redirect to start page
      const ok = silentLoad();
      if(!ok){ window.location.href = 'start.html'; return; }
    }
    // bindings
    document.getElementById('action-train').onclick = ()=>{ trainStudentsUI(); };
    document.getElementById('action-entertain').onclick = ()=>{ entertainmentUI(); };
    document.getElementById('action-mock').onclick = ()=>{ holdMockContestUI(); };
    document.getElementById('action-outing').onclick = ()=>{ // show outing modal
    showModal(`<h3>外出集训</h3>
      <label class="block">难度</label>
      <select id="out-diff"><option value="1">基础班</option><option value="2">提高班</option><option value="3">冲刺班</option></select>
      <label class="block">地点</label>
      <div id="out-prov-grid" class="prov-grid"></div>
      <div style="text-align:right;margin-top:8px">
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn" id="out-go">前往</button>
      </div>`);
    // render province buttons for outing
    const outGrid = document.getElementById('out-prov-grid');
    Object.keys(PROVINCES).forEach(k => {
      const p = PROVINCES[k];
      const btn = document.createElement('button');
      btn.className = 'prov-btn';
      btn.textContent = p.name;
      btn.dataset.val = k;
      btn.onclick = () => {
        document.querySelectorAll('#out-prov-grid .prov-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
      outGrid.appendChild(btn);
    });
    // default select first
    if(outGrid.firstChild) outGrid.firstChild.classList.add('selected');
    $('out-go').onclick = () => {
      const d = parseInt($('out-diff').value);
      const p = parseInt(document.querySelector('#out-prov-grid .prov-btn.selected').dataset.val);
      closeModal();
  outingTraining(d, p);
      // 安全更新，避免外出集训跳过比赛
      safeWeeklyUpdate(1);
      renderAll();
    };
  };
    document.getElementById('action-save').onclick = ()=>{ if(confirm("保存进度？（将覆盖本地存档）")) saveGame(); else if(confirm("载入存档？")) loadGame(); };
    // bind inline upgrade buttons under facilities (if present)
    document.querySelectorAll('.btn.upgrade').forEach(b => {
      b.onclick = (e) => {
        const fac = b.dataset.fac;
        if(fac) upgradeFacility(fac);
      };
    });
    // action-evict in some UI versions may not exist
    const actionEvictBtn = document.getElementById('action-evict');
    if(actionEvictBtn) actionEvictBtn.onclick = ()=>{ evictStudentUI(); };
    renderAll();
  } else {
    // not index page: do nothing. start.html will call renderStartPageUI; end.html will call renderEndSummary.
  }
};

