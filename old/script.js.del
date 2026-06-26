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

// On load: no debug output. Keep initialization lightweight.

// Diagnostic helpers: write/read to multiple storage channels to help detect overwrite
// Minimal diagnostics: maintain a sessionStorage backup for cross-page recovery.
// This keeps recovery simple and avoids extra debug-only channels.

/* 每日/每次渲染随机一言 */
const QUOTES = [
  "想想你的对手正在干什么",
  "课间就是用来放松的？",
  "没有天赋异禀的幸运，唯有水滴石穿的坚持",
  "没有一步登天的幻想，唯有日积月累的付出",
  "竞赛生没有特权",
  "自律者出众，懒惰者出局"
];

/* =========== UI 辅助 =========== */
const $ = id => document.getElementById(id);
const currWeek = () => (game?.week) || 0;
function log(msg){
  const el = $('log');
  const wk = currWeek();
  const text = `[周${wk}] ${msg}`;
  if(el){ const p = document.createElement('div'); p.innerText = text; el.prepend(p); }
  else { console.log(text); }
}

// 难度数值到标签的映射（更新为 7 个颜色等级：红/橙/黄/绿/蓝/紫/黑）
// 返回 HTML 字符串：带有 .diff-tag 和额外级别类（兼容旧的 diff-* 类）
function renderDifficultyTag(diff){
  // 传入的 diff 可能为 0-100 的数值
  const d = Number(diff) || 0;
  // 将 0-100 划分为 7 个区间：0-14,15-29,30-44,45-59,60-74,75-89,90-100
  // 并为每个区间返回一个语义标签与颜色类（diff-red, diff-orange, diff-yellow, diff-green, diff-blue, diff-purple, diff-black）
  let label = '';
  let cls = '';
  if(d <= 14){ label = '入门'; cls = 'diff-red'; }
  else if(d <= 39){ label = '普及-'; cls = 'diff-orange'; }
  else if(d <= 54){ label = '普及/提高-'; cls = 'diff-yellow'; }
  else if(d <= 79){ label = '普及+/提高'; cls = 'diff-green'; }
  else if(d <= 94){ label = '提高+/省选-'; cls = 'diff-blue'; }
  else if(d <= 110){ label = '省选/NOI-'; cls = 'diff-purple'; }
  else { label = 'NOI+/CTSC'; cls = 'diff-black'; }

  // 兼容旧的 class 名称：同时保留原有类别映射（以便其他地方可能使用旧类名）
  // 额外附加原有 class 名称以便向后兼容
  const legacy = (d <= 24) ? 'diff-beginner' : (d <= 34) ? 'diff-popular-low' : (d <= 44) ? 'diff-popular-high' : (d <= 64) ? 'diff-advanced-low' : (d <= 79) ? 'diff-provincial' : 'diff-noi';

  // 包装为带背景的 tag（移除 .tag 类以避免被通用样式覆盖）
  return `<span class="diff-tag ${cls} ${legacy}" title="难度: ${d}">${label}</span>`;
}

// 安全渲染：仅在页面具备主 UI 元素时调用 renderAll，避免在测试页面（缺少元素）时抛错
function safeRenderAll(){
  try{
    if(typeof window.renderAll === 'function' && document.getElementById('header-week')){
      window.renderAll();
    }
  }catch(e){ console.error('safeRenderAll error', e); }
}

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

// 弱化人数影响的缩放函数：可以统一控制人数带来的放大效果
// 当前实现使用 sqrt(n) 再向下取整，至少返回 1（避免零人数导致乘积为0的场景）
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
      // treat student as active unless explicitly set to false (backwards compatible)
      active: (s && s.active !== false),
      pressure: Number((s.pressure||0).toFixed(2)),
      thinking: Number((s.thinking||0).toFixed(2)),
      coding: Number((s.coding||0).toFixed(2)),
      // 按维度保存知识，便于后来比较显示每个知识点的变化
      knowledge_ds: Number((s.knowledge_ds||0).toFixed(2)),
      knowledge_graph: Number((s.knowledge_graph||0).toFixed(2)),
      knowledge_string: Number((s.knowledge_string||0).toFixed(2)),
      knowledge_math: Number((s.knowledge_math||0).toFixed(2)),
      knowledge_dp: Number((s.knowledge_dp||0).toFixed(2)),
      // 保留总体知识总和（向后兼容）
      knowledge: Number(s.getKnowledgeTotal?.() || ((s.knowledge_ds||0)+(s.knowledge_graph||0)+(s.knowledge_string||0)+(s.knowledge_math||0)+(s.knowledge_dp||0)))
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
      // 逐维度显示知识点变化（仅在有变化时显示）
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
      // 如果总体知识有变化并且没有逐项展示（兼容旧逻辑），仍保留总体显示
      if(dK !== 0 && !(dDS !==0 || dGraph !==0 || dStr !==0 || dMath !==0 || dDP !==0)) changes.push(`知识 ${dK>0?'+':''}${dK}`);
      if(changes.length) stuParts.push(`${name}: ${changes.join('，')}`);
    }
    if(stuParts.length) parts.push(stuParts.join('； '));

    const summary = parts.length ? parts.join('； ') : '无显著变化';
    // 默认为推送事件卡片；当 opts.suppressPush 为 true 时仅返回汇总，不产生卡片
    if (!opts.suppressPush) {
      pushEvent({ name: title || '变动汇总', description: summary, week: currWeek() });
    }
    return summary;
  }catch(e){ console.error('summarize error', e); return null; }
}

window.__createSnapshot = __createSnapshot;
window.__summarizeSnapshot = __summarizeSnapshot;

// 渲染所有突发事件卡到 #event-cards-container
function renderEventCards(){
  const container = $('event-cards-container');
  if(!container) return;
  container.innerHTML = '';
  
  if(recentEvents.length === 0){
    // 当没有事件时保持容器为空（不显示占位卡片）
    return;
  }

  const nowWeek = currWeek();
  let shown = 0;
  for(let i = 0; i < recentEvents.length; i++){
    const ev = recentEvents[i];
    if(ev.week && (nowWeek - ev.week) > 2) continue; // 只显示最近2周内
    
    // 跳过已处理的事件（已点击选项的事件不应再显示）
    if(ev._isHandled) continue;
    
    const card = document.createElement('div');
    // base classes for event card; add `event-required` when this event has options (needs user choice)
    let cardClass = 'event-card event-active';
    if (ev.options && ev.options.length > 0) {
      cardClass += ' event-required';
    }
    card.className = cardClass;

    // Prepare short summary (one-line) and full detail (preformatted)
  const titleHtml = `<div class="card-title">${ev.name || '突发事件'}` +
            `${(ev.options && ev.options.length > 0) ? '<span class="required-tag">未选择</span>' : ''}` +
            `</div>`;
    const descText = ev.description || '';
    // Escape HTML in description to avoid injecting markup
    const esc = (s) => String(s||'').replace(/[&<>"']/g, function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[ch];});
    const shortDesc = (descText.length > 120) ? descText.slice(0, 118) + '…' : descText;

    let cardHTML = '';
    cardHTML += titleHtml;
    cardHTML += `<div class="card-desc clamp" data-uid="${ev._uid}">${esc(shortDesc)}</div>`;
    // hidden full detail area (pre-wrap for line breaks)
    cardHTML += `<div class="event-detail" data-uid="${ev._uid}" style="display:none">${esc(descText)}</div>`;
    // more / less toggle
    if(descText && descText.length > 60){
      cardHTML += `<button class="more-btn" data-action="toggle-detail" data-uid="${ev._uid}">更多</button>`;
    }

    // 如果有选项，添加选项按钮（保持原有行为）
    if(ev.options && ev.options.length > 0){
      cardHTML += '<div class="event-options" style="margin-top:10px; display:flex; gap:8px;">';
      ev.options.forEach((opt, idx) => {
        cardHTML += `<button class="btn event-choice-btn" data-event-uid="${ev._uid}" data-option-index="${idx}">${opt.label || `选项${idx+1}`}</button>`;
      });
      cardHTML += '</div>';
    }

    card.innerHTML = cardHTML;
    container.appendChild(card);
    
    if(++shown >= 6) break; // 最多显示6个
  }
}

// 是否存在需要玩家选择但尚未处理的事件卡
function hasPendingRequiredEvents(){
  try{
    return recentEvents.some(ev => ev && ev.options && ev.options.length > 0 && !ev._isHandled);
  }catch(e){ return false; }
}

// 事件卡的展开/折叠及更多按钮由容器的全局点击监听处理
// extend existing load handler to support toggle-detail
window.addEventListener('load', () => {
  const container = $('event-cards-container');
  if (!container) return;
  // ensure event-detail animation styles are present
  (function(){
    if(!document.getElementById('event-detail-animations')){
      const s = document.createElement('style');
      s.id = 'event-detail-animations';
      s.textContent = `
        @keyframes et-slide-in-right { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes et-slide-out-right { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(24px); } }
        .event-detail { display: none; }
        .event-detail.visible { display: block; animation: et-slide-in-right 0.25s ease both; }
        .event-detail.hiding { animation: et-slide-out-right 0.22s ease both; }
      `;
      document.head.appendChild(s);
    }
  })();

  container.addEventListener('click', function(e){
    const btn = e.target.closest('.more-btn');
    if (!btn) return;
    const uid = btn.dataset.uid ? parseInt(btn.dataset.uid, 10) : null;
    if (!uid) return;
    const detail = container.querySelector(`.event-detail[data-uid='${uid}']`);
    const desc = container.querySelector(`.card-desc[data-uid='${uid}']`);
    if (!detail || !desc) return;

    // Use CSS classes + animation instead of immediate display toggling
    if (detail.classList.contains('visible')){
      // start hide animation
      detail.classList.remove('visible');
      detail.classList.add('hiding');
      desc.classList.add('clamp');
      btn.innerText = '更多';
      const onAnimEnd = function(ev){
        // only react to our animation
        detail.classList.remove('hiding');
        detail.style.display = 'none';
        detail.removeEventListener('animationend', onAnimEnd);
      };
      detail.addEventListener('animationend', onAnimEnd);
    } else {
      // show and play enter animation
      detail.style.display = 'block';
      // force reflow so the animation runs
      void detail.offsetWidth;
      detail.classList.remove('hiding');
      detail.classList.add('visible');
      desc.classList.remove('clamp');
      btn.innerText = '收起';
    }
  });
});

// 显示事件弹窗
function showEventModal(evt){
  const title = evt?.name || '事件';
  const desc = evt?.description || evt?.text || '暂无描述';
  const weekInfo = `[周${evt?.week || currWeek()}] `;
  showModal(`<h3>${weekInfo}${title}</h3><div class="small" style="margin-top:6px">${desc}</div><div class="modal-actions"><button class="btn" onclick="closeModal()">关闭</button></div>`);
}

// ✅ 重构：全局事件委托处理器
function handleEventChoice(event) {
  const button = event.target.closest('.event-choice-btn');
  if (!button) return;

  const eventUid = parseInt(button.dataset.eventUid, 10);
  const optionIndex = parseInt(button.dataset.optionIndex, 10);

  if (isNaN(eventUid) || isNaN(optionIndex)) return;

  // 通过唯一ID查找事件
  const targetEvent = recentEvents.find(e => e._uid === eventUid);
  if (!targetEvent || targetEvent._isHandled) return;

  // 标记为已处理
  targetEvent._isHandled = true;

  // 禁用所有按钮
  const card = button.closest('.event-card');
  if (card) {
    card.querySelectorAll('.event-choice-btn').forEach(btn => {
      btn.disabled = true;
      btn.classList.add('disabled');
    });
  }

  // 执行选项效果
  const option = targetEvent.options[optionIndex];
  try {
    if (option && typeof option.effect === 'function') {
      option.effect();
    }
  } catch (err) {
    console.error('执行事件选项效果时出错:', err);
  }

  // 强制清除一次性抑制标志
  try {
    if (game && game.suppressEventModalOnce) {
      game.suppressEventModalOnce = false;
    }
  } catch (err) {}

  // 重新渲染
  renderEventCards();
  safeRenderAll();
}

// ✅ 重构：在页面加载时绑定全局监听器
window.addEventListener('load', () => {
  const container = $('event-cards-container');
  if (container) {
    container.addEventListener('click', handleEventChoice);
  }
});

// 显示选择事件弹窗（现改为推送到信息卡片）
function showChoiceModal(evt){
  const title = evt?.name || '选择事件';
  const desc = evt?.description || '';
  const options = evt?.options || [];
  
  // 生成唯一的事件ID，避免重复推送相同事件
  const eventId = `choice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 直接推送到事件卡片而不是弹窗
  pushEvent({ 
    name: title, 
    description: desc, 
    week: evt?.week || currWeek(),
    options: options,
    eventId: eventId
  });
}
// 开发期间用于测试的 `options` 数据已移除 — 该数据在运行时无引用，保留 showChoiceModal 功能。
/* 渲染：主页去数值化（不显示学生具体能力/压力数值） */
function renderAll(){
  // 如果主 UI 元素不存在（例如在独立测试页面），安全退出以避免抛错
  if(!document.getElementById('header-week')) return;
  $('header-week').innerText = `第 ${currWeek()} 周`;
  $('header-province').innerText = `省份: ${game.province_name} (${game.province_type})`;
  const headerBudgetEl = $('header-budget');
  if(headerBudgetEl) headerBudgetEl.innerText = `经费: ¥${game.budget}`;
  // 当经费低于 20000 时添加警示类以高亮显示（红色），否则移除
  try{
    if(headerBudgetEl){
      if(Number(game.budget) < 20000){ headerBudgetEl.classList.add('low-funds'); }
      else { headerBudgetEl.classList.remove('low-funds'); }
    }
  }catch(e){ /* ignore */ }
  $('header-reputation').innerText = `声誉: ${game.reputation}`;
  $('info-week').innerText = currWeek();
    // week info
    const infoWeekEl = $('info-week'); if(infoWeekEl) infoWeekEl.innerText = currWeek();
    // weather: populate both the sidebar detailed elements and the compact header elements (header-weather)
    const tempText = game.temperature.toFixed(1) + "\u00b0C";
    const weatherDesc = game.getWeatherDescription();
    const infoTempEl = $('info-temp'); if(infoTempEl) infoTempEl.innerText = tempText;
    const infoWeatherEl = $('info-weather'); if(infoWeatherEl) infoWeatherEl.innerText = weatherDesc;
    const infoFutureEl = $('info-future-expense'); if(infoFutureEl) infoFutureEl.innerText = game.getFutureExpense();
    // teaching points UI removed; avoid touching $('info-teach') which no longer exists
  // 下场比赛单独面板渲染
  const nextCompText = game.getNextCompetition();
    const nextCompEl = $('next-comp'); if(nextCompEl) nextCompEl.innerText = nextCompText;
    // fill compact header small summary
    const headerNextSmall = $('header-next-comp-small'); if(headerNextSmall) headerNextSmall.innerText = nextCompText;
    // also set header weather compact text
    const headerWeatherText = $('header-weather-text'); if(headerWeatherText) headerWeatherText.innerText = weatherDesc;
    const headerTempHeader = $('header-temp-header'); if(headerTempHeader) headerTempHeader.innerText = tempText;
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
  // comfort (舒适度显示更新)
  const currentComfort = game.getComfort();
  const comfortEl = $('comfort-val');
  if(comfortEl) comfortEl.innerText = Math.floor(currentComfort);
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
    if(s && s.active === false) continue;
    let pressureLevel = s.pressure < 35 ? "低" : s.pressure < 65 ? "中" : "高";
    let pressureClass = s.pressure < 35 ? "pressure-low" : s.pressure < 65 ? "pressure-mid" : "pressure-high";
  // 计算模糊资质与能力等级：思维能力 & 心理素质（确保为数字）
  //const thinkingVal = Number(s.thinking || 0);
  //const mentalVal = Number(s.mental || 0);
 // let aptitudeVal = 0.5 * thinkingVal + 0.5 * mentalVal;
  //let aptitudeGrade = getLetterGrade(Math.floor(aptitudeVal));
  // 能力 = 各能力平均 + 各知识点方差加权
  //let abilityAvg = Number(s.getAbilityAvg ? s.getAbilityAvg() : 0) || 0;
  // 计算知识方差
  //let kArr = [Number(s.knowledge_ds||0), Number(s.knowledge_graph||0), Number(s.knowledge_string||0), Number(s.knowledge_math||0), Number(s.knowledge_dp||0)];
  //let kMean = kArr.reduce((a,v) => a+v, 0) / kArr.length;
  //let variance = kArr.reduce((a,v) => a + Math.pow(v - kMean, 2), 0) / kArr.length;
  //let varNorm = clamp(variance, 0, 100);
  // 50% 能力平均 + 50% 知识方差
  //let abilityVal = abilityAvg * 0.5 + varNorm * 0.5;
  //let abilityGrade = getLetterGrade(Math.floor(abilityVal));
    //const compRaw = Number(s.getComprehensiveAbility ? s.getComprehensiveAbility() : 0);
    //const comp = isFinite(compRaw) ? Math.floor(compRaw) : 0;
    
    // 生成天赋标签HTML
    let talentsHtml = '';
    if(s.talents && s.talents.size > 0){
      const talentArray = Array.from(s.talents);
      talentsHtml = talentArray.map(talentName => {
        const talentInfo = window.TalentManager ? window.TalentManager.getTalentInfo(talentName) : { name: talentName, description: '暂无描述', color: '#2b6cb0' };
        return `<span class="talent-tag" data-talent="${talentName}" style="background-color: ${talentInfo.color}20; color: ${talentInfo.color}; border-color: ${talentInfo.color}40;">
          ${talentName}
          <span class="talent-tooltip">${talentInfo.description}</span>
        </span>`;
      }).join('');
    }
    
    out += `<div class="student-box">
      <button class="evict-btn" data-idx="${game.students.indexOf(s)}" title="劝退">劝退</button>
      
      <div class="student-header">
        <div class="student-name">
          ${s.name}
          ${s.sick_weeks > 0 ? '<span class="warn">[生病]</span>' : ''}
        </div>
        <div class="student-status">
          <span class="label-pill ${pressureClass}">压力: ${pressureLevel}</span>
        </div>
      </div>
      
      <div class="student-details" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:12px;color:#718096;font-weight:600;">知识</span>
          <div class="knowledge-badges">
            <span class="kb" title="数据结构: ${Math.floor(Number(s.knowledge_ds||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_ds||0)))}">
              DS ${getLetterGradeAbility(Math.floor(Number(s.knowledge_ds||0)))}
            </span>
            <span class="kb" title="图论: ${Math.floor(Number(s.knowledge_graph||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_graph||0)))}">
              图论 ${getLetterGradeAbility(Math.floor(Number(s.knowledge_graph||0)))}
            </span>
            <span class="kb" title="字符串: ${Math.floor(Number(s.knowledge_string||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_string||0)))}">
              字符串${getLetterGradeAbility(Math.floor(Number(s.knowledge_string||0)))}
            </span>
            <span class="kb" title="数学: ${Math.floor(Number(s.knowledge_math||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_math||0)))}">
              数学 ${getLetterGradeAbility(Math.floor(Number(s.knowledge_math||0)))}
            </span>
            <span class="kb" title="动态规划: ${Math.floor(Number(s.knowledge_dp||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_dp||0)))}">
              DP ${getLetterGradeAbility(Math.floor(Number(s.knowledge_dp||0)))}
            </span>
            <!-- 直接追加能力徽章到知识徽章组，保持统一样式 -->
            <span class="kb ability" title="思维: ${Math.floor(Number(s.thinking||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.thinking||0)))}">思维${getLetterGradeAbility(Math.floor(Number(s.thinking||0)))}</span>
            <span class="kb ability" title="代码: ${Math.floor(Number(s.coding||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.coding||0)))}">代码${getLetterGradeAbility(Math.floor(Number(s.coding||0)))}</span>
          </div>
        </div>
        
        ${talentsHtml ? `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12px;color:#718096;font-weight:600;">天赋</span><div class="student-talents">${talentsHtml}</div></div>` : ''}
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

  // 如果存在未处理的必选事件，禁用所有行动卡并引导玩家处理事件
  try{
    const pending = hasPendingRequiredEvents();
    const actionCards = Array.from(document.querySelectorAll('.action-card'));
    if(pending){
      // 禁用并添加视觉提示
      actionCards.forEach(ac => {
        ac.classList.add('disabled');
        ac.setAttribute('aria-disabled', 'true');
        ac.setAttribute('tabindex', '-1');
        // 保存原始 onclick 引用以便恢复（比保存字符串更可靠）
        try{
          if(typeof ac._origOnclickFn === 'undefined'){
            ac._origOnclickFn = ac.onclick || null;
          }
        }catch(e){}
        // 设置临时阻塞处理器
        ac.onclick = (e) => { e && e.stopPropagation && e.stopPropagation(); e && e.preventDefault && e.preventDefault();
          const msg = '存在未处理的事件卡片，请先在右侧事件区域选择处理后再进行行动。';
          if(window.toastManager && typeof window.toastManager.show === 'function') window.toastManager.show(msg, 'warning'); else try{ alert(msg); }catch(e){}
          // 将第一个未处理事件滚动进视图并轻微闪烁高亮
          const container = $('event-cards-container');
          if(container){
            const firstPending = container.querySelector('.event-card.event-required');
            if(firstPending){
              try{ firstPending.scrollIntoView({ behavior: 'smooth', block: 'center' }); }catch(e){}
              firstPending.classList.add('highlight-pending');
              setTimeout(()=>{ firstPending.classList.remove('highlight-pending'); }, 1800);
            }
          }
        };
      });
      // 高亮并滚动第一个未处理事件卡
      const container = $('event-cards-container');
      if(container){
        const firstPending = container.querySelector('.event-card.event-required');
        if(firstPending){ try{ firstPending.scrollIntoView({ behavior: 'smooth', block: 'center' }); }catch(e){}; firstPending.classList.add('highlight-pending'); setTimeout(()=>{ firstPending.classList.remove('highlight-pending'); }, 1800); }
      }
    } else {
      // 恢复行动卡的交互
      actionCards.forEach(ac => {
        ac.classList.remove('disabled');
        ac.removeAttribute('aria-disabled');
        ac.setAttribute('tabindex', '0');
        try{
          // 如果我们之前保存了原始 onclick 引用，则恢复它
          if(typeof ac._origOnclickFn !== 'undefined'){
            try{ ac.onclick = ac._origOnclickFn; }catch(e){}
            try{ delete ac._origOnclickFn; }catch(e){}
          } else {
            // 兼容旧逻辑：如果当前 onclick 是我们的阻塞函数（通过文本判断），则清除它
            if(ac.onclick && ac.onclick.toString && ac.onclick.toString().includes('存在未处理的事件卡片')){
              ac.onclick = null;
            }
          }
        }catch(e){}
      });
    }
  }catch(e){ /* ignore UI assist failures */ }

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
      // place the competition action as a regular action-card and add a highlight class
      compCard.className = 'action-card comp-highlight';
      compCard.id = 'comp-only-action'; compCard.setAttribute('role','button'); compCard.tabIndex = 0;
      compCard.innerHTML = `<div class="card-title">参加比赛【${compNow.name}】</div>`;
      compCard.onclick = () => { 
        // 使用新的比赛系统
        if(typeof window.holdCompetitionModalNew === 'function'){
          window.holdCompetitionModalNew(compNow);
        } else {
          holdCompetitionModal(compNow);
        }
      };
      // 插入到事件容器之前，这样顺序与其他 action-card 保持一致（即在事件卡上方）
      const eventContainer = document.getElementById('event-cards-container');
      if(eventContainer && actionContainer.contains(eventContainer)){
        actionContainer.insertBefore(compCard, eventContainer);
      } else {
        actionContainer.appendChild(compCard);
      }
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



/* 新的基于题目的训练函数 */
function trainStudentsWithTask(task, intensity) {
  log(`开始做题训练：${task.name}（难度${task.difficulty}，强度${intensity===1?'轻':intensity===2?'中':'重'}）`);
  const __before = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  
  let weather_factor = game.getWeatherFactor();
  let comfort = game.getComfort();
  let comfort_factor = 1.0 + Math.max(0.0, (50 - comfort) / 100.0);
  
  // 记录每个学生的训练结果
  const trainingResults = [];
  
  for(let s of game.students) {
  if(!s || s.active === false) continue;
    
    // 计算个人舒适度（考虑天气敏感和美食家天赋）
    let personalComfort = comfort;
    
    // 天气敏感：天气影响翻倍
    if(s.talents && s.talents.has('天气敏感')){
      const baseComfort = game.base_comfort;
      const weatherEffect = comfort - baseComfort;
      personalComfort = baseComfort + weatherEffect * 2;
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    // 美食家：食堂效果翻倍
    if(s.talents && s.talents.has('美食家')){
      const canteenBonus = 3 * (game.facilities.canteen - 1);
      personalComfort += canteenBonus; // 额外增加一次食堂效果
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    s.comfort = personalComfort;
    
    let sick_penalty = (s.sick_weeks > 0) ? 0.7 : 1.0;
    
    // 计算学生能力（思维和编码平均）
    const studentAbility = (s.thinking + s.coding) / 2.0;
    
    // 使用题目库中的函数计算增幅倍数
    const boostMultiplier = calculateBoostMultiplier(studentAbility, task.difficulty);
    
    // 应用题目对学生的知识点提升
    const results = applyTaskBoosts(s, task);
    
    // 根据强度和设施调整知识增益
    const libraryLevel = game.facilities.library;
    let libraryBonus = 0;
    if(libraryLevel === 1) libraryBonus = -0.20;
    else if(libraryLevel === 2) libraryBonus = -0.05;
    else if(libraryLevel === 3) libraryBonus = 0.10;
    else if(libraryLevel === 4) libraryBonus = 0.12;
    else if(libraryLevel === 5) libraryBonus = 0.14;
    
    const libraryMultiplier = 1.0 + libraryBonus;
    
    // 强度影响：轻=0.7, 中=1.0, 重=1.3
    const intensityFactor = intensity === 1 ? 0.7 : intensity === 3 ? 1.3 : 1.0;
    
    // 应用所有调整因子（使用新的题库增幅）
    for(const boost of results.boosts) {
      const additionalBoost = Math.floor(boost.actualAmount * (libraryMultiplier - 1.0) * intensityFactor * sick_penalty);
      s.addKnowledge(boost.type, additionalBoost);
    }
    
    // 计算机影响能力提升
    const computerLevel = game.facilities.computer;
    let computerBonus = 0;
    if(computerLevel === 1) computerBonus = -0.2;
    else if(computerLevel === 2) computerBonus = 0;
    else if(computerLevel === 3) computerBonus = 0.1;
    else if(computerLevel === 4) computerBonus = 0.2;
    else if(computerLevel === 5) computerBonus = 0.3;
    
    const computerMultiplier = 1.0 + computerBonus;
    
    // 能力提升：根据题目难度和学生能力
    // 做题会同时提升思维和编码能力，但幅度较小
    const abilityGainBase = boostMultiplier * intensityFactor * (1 - Math.min(0.6, s.pressure/200.0));
    const thinkingGain = uniform(0.6, 1.5) * abilityGainBase * computerMultiplier * (typeof TRAINING_EFFECT_MULTIPLIER !== 'undefined' ? TRAINING_EFFECT_MULTIPLIER : 1.0);
    const codingGain = uniform(1, 2.5) * abilityGainBase * computerMultiplier * (typeof TRAINING_EFFECT_MULTIPLIER !== 'undefined' ? TRAINING_EFFECT_MULTIPLIER : 1.0);
    
    s.thinking += thinkingGain;
    s.coding += codingGain;
  s.thinking = (s.thinking || 0);
  s.coding = (s.coding || 0);
    
    // 压力计算
    let base_pressure = (intensity===1) ? 15 : (intensity===2) ? 25 : 40;
    
    // 难题会增加压力
    const difficultyPressure = Math.max(0, (task.difficulty - studentAbility) * 0.2);
    base_pressure += difficultyPressure;
    
    if(intensity===3) base_pressure *= TRAINING_PRESSURE_MULTIPLIER_HEAVY;
    else if(intensity===2) base_pressure *= TRAINING_PRESSURE_MULTIPLIER_MEDIUM;
    
    let canteen_reduction = game.facilities.getCanteenPressureReduction();
    let pressure_increase = base_pressure * weather_factor * canteen_reduction * comfort_factor;
    if(s.sick_weeks > 0) pressure_increase += 10;
    
    // 应用全局压力增加量增幅
    pressure_increase *= (typeof PRESSURE_INCREASE_MULTIPLIER !== 'undefined' ? PRESSURE_INCREASE_MULTIPLIER : 1.0);
    
    // 处理天赋对压力的影响
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
    
    s.pressure += finalPressureIncrease;
    
    // 记录训练结果用于日志
    trainingResults.push({
      name: s.name,
      multiplier: boostMultiplier,
      boosts: results.boosts
    });
  }
  
  game.weeks_since_entertainment += 1;
  
  // 输出详细的训练日志
  log(`训练结束。题目：${task.name}`);
  /*
  // Toast 反馈
  if (window.toastManager) {
    window.toastManager.show(`训练完成：${task.name}`, 'success');
  }
  */
  // 训练结束后尝试为每位学生获得天赋（按训练强度放大/降低概率）
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
}

  // 标记本周刚刚完成了一次训练，供事件系统检测（如构造题忘放checker）
  try{ game.lastTrainingFinishedWeek = game.week; }catch(e){}
  // 训练结束后立即检查随机事件（会触发依赖刚结束训练的事件）
  try{ checkRandomEvents(); }catch(e){ console.error('post-training checkRandomEvents failed', e); }


// 辅助：为单个学生运行一次隐藏模拟赛，返回总分（0..400）
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

// 计算外出集训费用（与人数呈一次函数关系）
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
  // Apply multiplier to increase/decrease the reputation-based discount effect.
  const discount = (rep / 100.0) * maxDiscount * multiplier;
  const finalCost = Math.max(0, Math.floor(raw * (1.0 - discount)));
    return finalCost;
  } catch (e) {
    console.error('computeOutingCostQuadratic error', e);
    return Math.max(0, Math.floor(adjustedBase + 20000 * n + diffPenalty));
  }
}

// 新的外出集训实现：仅对 selectedNames 的学生进行集训
function outingTrainingWithSelection(difficulty_choice, province_choice, selectedNames, inspireTalents){
  const target = PROVINCES[province_choice];
  const __before = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
  const selectedStudents = game.students.filter(s => s && s.active && selectedNames.includes(s.name));
  const participantCount = selectedStudents.length;
  let final_cost = computeOutingCostQuadratic(difficulty_choice, province_choice, participantCount);
  
  // 计算天赋激发费用
  inspireTalents = inspireTalents || [];
  const talentInspireCost = inspireTalents.length * 12000;
  final_cost += talentInspireCost;

  // 在结算前询问每位参与学生的天赋，收集可能的开支减免（action: 'reduce_outing_cost'）
  try{
    let totalReduction = 0;
    const reductions = [];
    for(let s of selectedStudents){
      try{
        // 首选 student.triggerTalents（实例方法），否则尝试全局 TalentManager
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
      // 通知事件面板（如果存在）和日志
      try{ if(window.pushEvent) window.pushEvent({ name: '集训经费减免', description: `天赋导致集训费用减少 ¥${applied}（来自: ${reductions.map(r=>r.student+':'+'¥'+r.amount).join(', ')}）`, week: game.week }); }catch(e){}
      log(`集训经费减免：共 -¥${applied}（明细: ${reductions.map(r=>r.student+':'+'¥'+r.amount).join(', ')})`);
    }
    // 结束 try 大块
  }catch(e){ console.error('collect outing cost reductions error', e); }

  if(game.budget < final_cost){ alert("经费不足，无法外出集训！"); return; }
  game.recordExpense(final_cost, `外出集训：${target.name}`);
  log(`外出集训：${target.name} (${target.type})，难度:${difficulty_choice}，参与人数:${participantCount}，费用 ¥${final_cost}`);

  // 隐藏模拟赛难度映射：基础班->入门级(0)，提高班->普及级(1)，冲刺班->NOI级(4)
  const DIFFIDX_MAP = {1:0, 2:1, 3:4};
  const diffIdxForHidden = DIFFIDX_MAP[difficulty_choice] || 0;

  // 对每个选中学生进行处理并运行隐藏模拟赛
  for(let s of selectedStudents){
    // run hidden mock (4题, 240分钟 equivalent behavior) and get score 0..400
    let hiddenScore = simulateHiddenMockScore(s, diffIdxForHidden);

    // 标准集训增益基数（沿用原逻辑）
    let knowledge_base = (difficulty_choice===2) ? OUTFIT_KNOWLEDGE_BASE_INTERMEDIATE : (difficulty_choice===3) ? OUTFIT_KNOWLEDGE_BASE_ADVANCED : OUTFIT_KNOWLEDGE_BASE_BASIC;
    let ability_base = (difficulty_choice===2) ? OUTFIT_ABILITY_BASE_INTERMEDIATE : (difficulty_choice===3) ? OUTFIT_ABILITY_BASE_ADVANCED : OUTFIT_ABILITY_BASE_BASIC;
    let pressure_gain = (difficulty_choice===2) ? OUTFIT_PRESSURE_INTERMEDIATE : (difficulty_choice===3) ? OUTFIT_PRESSURE_ADVANCED : OUTFIT_PRESSURE_BASIC;

    // 基于省份训练质量修正
    let knowledge_mult = target.trainingQuality || 1.0;
    let ability_mult = target.trainingQuality || 1.0;

    // 难度惩罚仍然保留（原要求），我们使用 difficulty constants 来影响收获倍率
    const DIFF_GAIN_PENALTY = {1:1.0, 2:1.0, 3:1.0}; // 收获不直接降低，但之后按分数调整

    // 计算原始增益
    let knowledge_min = Math.floor(knowledge_base * knowledge_mult);
    let knowledge_max = Math.floor(knowledge_base * knowledge_mult * 1.8);
    let ability_min = ability_base * ability_mult;
    let ability_max = ability_base * ability_mult * 2.0;

    // 根据隐藏模拟赛分数决定是否触发“实力不匹配”惩罚
    let scoreThreshold = 200; // 要求中的阈值
    let mismatch = (hiddenScore < scoreThreshold);

    // 计算增益与压力
    let knowledge_modifier = 1.0;
    let ability_modifier = 1.0;
    let pressure_multiplier = 1.0;
    if(mismatch){
      knowledge_modifier = 0.2; // 收获减小
      ability_modifier = 0.5;
      pressure_multiplier = 2.0; // 压力乘2
    }

    // apply gains (应用集训效果增幅)
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

    // 集训结束时尝试按正常概率分配天赋
    try{
      if(typeof window !== 'undefined' && window.TalentManager && typeof window.TalentManager.tryAcquireTalent === 'function'){
        try{ window.TalentManager.tryAcquireTalent(s, 1.0); }catch(e){}
      }
    }catch(e){ console.error('outing_finished tryAcquireTalent error', e); }
    
    // 天赋激发：每个选中的天赋有30%概率被获得
    if(inspireTalents && inspireTalents.length > 0){
      for(const talentName of inspireTalents){
        if(Math.random() < 0.3){
          // 检查学生是否已有该天赋
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
  
  // 记录天赋激发费用
  if(talentInspireCost > 0){
    log(`天赋激发费用：¥${talentInspireCost}（${inspireTalents.length}个天赋 × ¥12,000）`);
  }

  game.weeks_since_entertainment += 1;
  log("外出集训完成（1周）。");
  /*
  // Toast 反馈
  if (window.toastManager) {
    if (selectedStudents.some(s => s.hiddenMockScore < 200)) {
      window.toastManager.show(`集训完成，部分学生存在不匹配`, 'warning');
    } else {
      window.toastManager.show(`集训完成：${target.name}`, 'success');
    }
  }
  */
  const __after = __createSnapshot?.();
  if(__before && __after) __summarizeSnapshot(__before, __after, `外出集训：${target.name} 难度${difficulty_choice}`);
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
    if(s && s.active === false) continue;
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
  html += `<table><thead><tr><th>名次</th><th>姓名</th><th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>总分</th><th>备注</th></tr></thead><tbody>`;
  for(let i=0;i<results.length;i++){
    let r = results[i];
    html += `<tr><td>${i+1}</td><td>${r.name}</td>`;
    for(let j=0;j<4;j++) html += `<td>${r.scores[j]}</td>`;
    // placeholder for remark column (will be populated when applying)
    html += `<td>${r.total}</td><td id="mock-remark-${i}"></td></tr>`;
  }
  html += `</tbody></table></div>`;
  html += `<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">关闭不应用</button> <button class="btn" id="mock-apply">应用结果并关闭</button></div>`;
  showModal(html);
  // on apply: perform exact same updates as previous C++ logic (knowledge gain, mental changes, pressure)
  $('mock-apply').onclick = ()=>{
    const __before = typeof __createSnapshot === 'function' ? __createSnapshot() : null;
    // apply
    let base_knowledge_min = Math.floor(2 * (isPurchased?MOCK_CONTEST_GAIN_MULTIPLIER_PURCHASED:1.0));
    let base_knowledge_max = Math.floor(6 * (isPurchased?MOCK_CONTEST_GAIN_MULTIPLIER_PURCHASED:1.0));
    // 模拟赛总知识增益上界（必须小于轻强度综合训练的上界），设为 3
    const MOCK_TOTAL_KNOWLEDGE_CAP = 3;
    for(let s of game.students){
  if(!s || s.active === false) continue;
      let r = results.find(x=>x.name===s.name) || {total:0,scores:[0,0,0,0]};
      let total_score = r.total;
      // 新规则：根据表现决定初始压力（如果总分 < 50% 或 最后一名，则 +20，否则 +5）
      // 这里 total_score < 200 等价于 4 题总分低于 50%
      // note: 是否为最后一名将在后面的结果遍历中判断并应用一次性额外压力，
      // 为避免重复加压，我们先只按分数判定初始压力（最后一名将在备注段落处理）。
      if((total_score || 0) < 200){
        s.pressure += 20;
        try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'mock_result', amount: 20, total_score: total_score }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
      } else {
        s.pressure += 5;
        try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'mock_result', amount: 5, total_score: total_score }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
      }
      let pressure_gain = 20; let mental_change=0; let overall_score_factor=1.0;
      if(total_score < 100){ mental_change = uniform(-16,-6); pressure_gain = 30; overall_score_factor = 0.3; }
      else if(total_score < 200){ mental_change = uniform(-2,4); pressure_gain = 20; overall_score_factor = 0.7; }
      else if(total_score <= 300){ mental_change = uniform(6,16); pressure_gain = 10; overall_score_factor = 1.0; }
      else { mental_change = uniform(2,6); pressure_gain = 16; overall_score_factor = 0.6; }
      // 计算本次在四题中分配到的知识总量，先累加然后截断到 MOCK_TOTAL_KNOWLEDGE_CAP
      let totalKnowledgeThisMock = 0;
      let perProblemKnowledge = [];
      for(let i=0;i<4;i++){
        let problem_score = r.scores[i] || 0;
        let problem_score_factor = problem_score / 100.0;
        let growth_factor = (problem_score_factor * 0.7 + overall_score_factor * 0.3);
        let knowledge_gain = Math.max(0, Math.floor(uniform(base_knowledge_min, base_knowledge_max) * growth_factor));
        perProblemKnowledge.push(knowledge_gain);
        totalKnowledgeThisMock += knowledge_gain;
      }
      // 如果累计知识超过上界，则按比例缩放到上界（保持不同题贡献比例）
      if(totalKnowledgeThisMock > MOCK_TOTAL_KNOWLEDGE_CAP){
        const scale = MOCK_TOTAL_KNOWLEDGE_CAP / totalKnowledgeThisMock;
        for(let i=0;i<perProblemKnowledge.length;i++) perProblemKnowledge[i] = Math.floor(perProblemKnowledge[i] * scale);
      }
      // 将分配后的知识按题目标签均分并应用
      for(let i=0;i<4;i++){
        let tags = questionTagsArray[i];
        let knowledge_gain = perProblemKnowledge[i] || 0;
        if(tags.length>0 && knowledge_gain>0){
          let per = Math.floor(knowledge_gain / tags.length);
          for(let t of tags) s.addKnowledge(t, per);
        }
      }
      s.mental = clamp(s.mental + mental_change, 0,100);
      s.pressure += pressure_gain;
      try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'mock_result', amount: pressure_gain, total_score: total_score }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
    }
    // 额外处理：按与 200 分的差距来计算额外压力（分数远离200，压力越大），最大额外增加 +15
    // 同时在备注栏注明“发挥不佳，压力升高”当 total < 200 或 最后一名
    // 计算规则示例：extra = min(15, Math.ceil(Math.abs(total - 200) / 20)) -> 每差 20 分增加 1 点压力，最多 15
    for(let i=0;i<results.length;i++){
      const r = results[i];
      const remarkElem = $('mock-remark-' + i);
      if(!remarkElem) continue;
      const stu = game.students.find(x=>x.name===r.name);
      if(!stu) { remarkElem.innerText = ''; continue; }
      // 默认备注为空
      remarkElem.innerText = '';
      // 计算额外压力
      const scoreDiff = Math.abs((r.total || 0) - 200);
      let extra = Math.min(15, Math.ceil(scoreDiff / 20));
      // 对于总分 < 200 或 最后一名，显示发挥不佳提示并额外加压（注意：若已按分数给予初始 +20，则这里仍需应用额外差距压力）
      if((r.total || 0) < 200 || i === results.length - 1){
        // 只在 UI 中显示备注并记录额外压力值到 results（实际加压将在用户点击“应用结果”时统一应用并乘以 2）
        remarkElem.innerText = '发挥不佳，压力升高';
        results[i].__extraPressure = extra;
        // 如果是最后一名且其初始加压尚未反映（例如分数>=200但为最后一名），保留原逻辑中额外 +15 的影响，记录在 __extraPressure
        if(i === results.length - 1 && (r.total || 0) >= 200){
          results[i].__extraPressure = (results[i].__extraPressure || 0) + 15;
        }
      }
    }

    // 额外：模拟赛会小幅提升思维能力、中幅提升代码能力（使得模拟赛提升略微高于训练）
    // 调整：当分数大于 50% 时，能力提升开始递减；200 分（50%）为最优提升点，0 分时为 0%，满分时为 50% 点提升的 20%。
    // 实现为分段线性：0..peak 线性上升到 1；peak..max 线性下降到 0.2
    const maxTotalForBoost = (Array.isArray(questionTagsArray) ? questionTagsArray.length : 4) * 100;
    const peakScore = maxTotalForBoost * 0.5; // e.g., 200 for 4 题
    for(let s of game.students){
  if(!s || s.active === false) continue;
      const r = results.find(x => x.name === s.name) || { total: 0 };
      const totalScore = Number(r.total || 0);
      // compute piecewise multiplier
      let boostMult = 0.0;
      if(totalScore <= peakScore){
        boostMult = (peakScore > 0) ? (totalScore / peakScore) : 0.0; // 0 -> 0, peak -> 1
      } else {
        // linear decline from 1 at peak to 0.2 at maxTotalForBoost
        const denom = Math.max(1, (maxTotalForBoost - peakScore));
        boostMult = 1.0 - ((totalScore - peakScore) / denom) * (1.0 - 0.2);
      }
      boostMult = Math.max(0, Math.min(1, boostMult));

      if(boostMult > 0){
        const thinkingBoost = uniform(1.2,2.0) * boostMult;
        const codingBoost = uniform(1.6,2.4) * boostMult;
  s.thinking = (s.thinking || 0) + thinkingBoost;
  s.coding = (s.coding || 0) + codingBoost;
      }
    }
    // 统一应用之前记录的模拟赛额外惩罚：实际增加的压力 = 记录值 * 2
    for(let i=0;i<results.length;i++){
      const r = results[i];
      const extraRec = Number(r.__extraPressure || 0);
      if(extraRec > 0){
        const stu = game.students.find(x=>x.name===r.name);
        if(stu){
          const applied = Math.min(100, Number(stu.pressure || 0) + extraRec * 2) - Number(stu.pressure || 0);
          stu.pressure = Math.min(100, Number(stu.pressure || 0) + extraRec * 2);
          try{ if(typeof log === 'function') log(`[模拟赛惩罚] ${stu.name} 额外压力 +${applied} (记录 ${extraRec})`); }catch(e){}
        }
      }
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
  // comp: {week,name,difficulty,maxScore,numProblems}
  // Build problems dynamically according to comp.numProblems
  const knowledge_types = ["数据结构","图论","字符串","数学","DP"];
  let problems = [];
  const numProblems = (comp && comp.numProblems) ? Math.max(1, comp.numProblems) : 4;
  for(let i=0;i<numProblems;i++){
    let tags = [];
    // CSP-S1: single problem contains all tags
    if(comp.name === 'CSP-S1'){
      tags = knowledge_types.slice();
    } else if(comp.name === 'NOI' && i === 0){
      // NOI: first problem contains all tags
      tags = knowledge_types.slice();
    } else {
      // other problems: 1..3 random tags (distinct)
      let num_tags = uniformInt(1,3);
      let selected_indices = [];
      while(selected_indices.length < num_tags){
        let idx = uniformInt(0, knowledge_types.length-1);
        if(!selected_indices.includes(idx)) selected_indices.push(idx);
      }
      tags = selected_indices.map(j => knowledge_types[j]);
    }
    let min_diff = comp.difficulty * (0.6 + 0.2 * Math.min(i, 3));
    let max_diff = comp.difficulty * (0.8 + 0.2 * Math.min(i, 3));
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
  // pass line no longer depends on reputation
  let pass_line = Math.floor(base_pass_line);
  // Ensure pass line does not exceed 90% of the competition's max score (use computed maxScore)
  try{
    const compMax = (typeof comp.maxScore === 'number') ? comp.maxScore : ( (comp.numProblems||4) * 100 );
    const maxAllowed = Math.floor(compMax * 0.9);
    if(pass_line > maxAllowed) pass_line = maxAllowed;
  }catch(e){ /* ignore if comp data is malformed */ }
  // Apply minimum/maximum pass line bounds per new rules:
  try{
    const compMax = (typeof comp.maxScore === 'number') ? comp.maxScore : ( (comp.numProblems||4) * 100 );
    if(comp.name === 'NOI'){
      const minLine = Math.floor(compMax * 0.8);
      if(pass_line < minLine) pass_line = minLine;
    } else {
      const minLine = Math.floor(compMax * 0.3);
      const maxLine = Math.floor(compMax * 0.9);
      if(pass_line < minLine) pass_line = minLine;
      if(pass_line > maxLine) pass_line = maxLine;
    }
  }catch(e){ /* ignore malformed comp */ }
  // evaluate students using Student.getPerformanceScore for each problem
  // Determine current half-season index (0 or 1) and enforce chain qualification
  const halfIndex = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
  let results = [];
  for(let s of game.students){
    if(s && s.active === false) continue;
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
    // each problem is scored out of 100; total max is numProblems * 100
    for(let i=0;i<problems.length;i++){
      let tags = problems[i].tags;
      let totalK = 0; for(let t of tags) totalK += s.getKnowledgeByType(t);
      let avgK = tags.length>0 ? Math.floor(totalK / tags.length) : 0;
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
  for(let i=0;i<problems.length;i++){
    const pd = problems[i] || {difficulty:0,tags:[]};
    html += `<tr><td>T${i+1}</td><td>${pd.difficulty.toFixed(1)}</td><td>${(pd.tags||[]).join(", ")}</td></tr>`;
  }
  html += `</tbody></table></div>`;
  html += `<div style="margin-top:8px">`;
  // build header with dynamic problem columns
  html += `<table><thead><tr><th>名次</th><th>姓名</th>`;
  for(let i=0;i<problems.length;i++) html += `<th>T${i+1}</th>`;
  html += `<th>总分</th><th>备注</th></tr></thead><tbody>`;
  for(let i=0;i<results.length;i++){
    let r = results[i];
    // Build human-readable remark including participation, 晋级 and optional award hints
    let remark = '';
    if(r.eligible === false){
      remark = '未参加';
    } else {
      // Determine awards/hints for specific competitions (提示性质, 不影响判定)
      // 一等奖 = 晋级 (>= pass_line)
      // 二等奖 = >= 60% of pass_line
      // 三等奖 = >= 40% of pass_line
      const t = (typeof r.total === 'number') ? r.total : (r.total != null ? Number(r.total) : null);
      // default晋级 remark if meets pass line
      if(t != null && t >= pass_line) remark = '晋级';

      if(t != null && (comp.name === 'CSP-S1' || comp.name === 'CSP-S2' || comp.name === 'NOIP')){
        // award hints relative to pass_line
        if(t >= pass_line){
          remark += (remark ? '；' : '') + ' 一等奖 晋级';
        } else if(t >= pass_line * 0.6){
          remark += (remark ? '；' : '') + ' 二等奖';
        } else if(t >= pass_line * 0.4){
          remark += (remark ? '；' : '') + ' 三等奖';
        }
      } else if(comp.name === 'NOI'){
        // 保留原有 NOI 金/银/铜 逻辑（相对 pass_line 的 100%/70%/50%）
        if(t != null && t >= pass_line * 1.0) remark += (remark? '；' : '') + '🥇金牌';
        else if(t != null && t >= pass_line * 0.7) remark += (remark? '；' : '') + '🥈银牌';
        else if(t != null && t >= pass_line * 0.5) remark += (remark? '；' : '') + '🥉铜牌';
      }
    }
    html += `<tr><td>${i+1}</td><td>${r.name}</td>`;
    if(r.eligible === false){
      html += `<td colspan="${problems.length}" style="text-align:center;color:#999">未参加</td>`;
      html += `<td>—</td><td>${remark}</td></tr>`;
    } else {
      for(let j=0;j<problems.length;j++) html += `<td>${r.scores && typeof r.scores[j] !== 'undefined' ? r.scores[j] : ''}</td>`;
      html += `<td>${r.total}</td><td>${remark}</td></tr>`;
    }
  }
  html += `</tbody></table></div>`;
  html += `<div class="modal-actions" style="margin-top:8px"><button class="btn" id="comp-apply">关闭并应用影响</button></div>`;
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

    // 暂存是否需要触发结局的标记，稍后在确认弹窗中处理
    let shouldTriggerEnding = false;
    let endingReason = '';
    // 如果处于第二轮赛季（halfIndexApply === 1）且本场比赛无人晋级 -> 视为晋级链断裂
    try{
      if(halfIndexApply === 1 && pass_count === 0){
        shouldTriggerEnding = true;
        endingReason = '晋级链断裂';
      }
    }catch(e){ console.error('early season-end check failed', e); }

    let gold=0,silver=0,bronze=0;
    if(comp.name==="NOI"){
      // 使用与显示逻辑一致的阈值：pass_line（晋级线）及其系数
      // 这样金牌计数与金牌徽章显示保持一致
      const gold_threshold = pass_line * 1.0;
      const silver_threshold = pass_line * 0.7;
      const bronze_threshold = pass_line * 0.5;
      
      console.log('[NOI金牌检测] comp.maxScore:', comp.maxScore);
      console.log('[NOI金牌检测] pass_line:', pass_line);
      console.log('[NOI金牌检测] 金牌阈值:', gold_threshold);
      console.log('[NOI金牌检测] 银牌阈值:', silver_threshold);
      console.log('[NOI金牌检测] 铜牌阈值:', bronze_threshold);
      
      for(let r of results){
        if(r.eligible !== true) continue;
        console.log(`[NOI金牌检测] ${r.name}: ${r.total} 分`);
        if(r.total >= gold_threshold){
          gold++;
          console.log(`[NOI金牌检测] ${r.name} 获得金牌！`);
        } else if(r.total >= silver_threshold){
          silver++;
          console.log(`[NOI金牌检测] ${r.name} 获得银牌`);
        } else if(r.total >= bronze_threshold){
          bronze++;
          console.log(`[NOI金牌检测] ${r.name} 获得铜牌`);
        }
      }
      console.log(`[NOI金牌检测] 奖牌统计 - 金:${gold} 银:${silver} 铜:${bronze}`);
    }

    // update students' pressure/mental and game state (rewards)
    for(let s of game.students){
      if(!s || s.active === false) continue;
      // find this student's result
      let r = results.find(x=>x.name === s.name) || null;
      if(r && r.eligible === false){
        // Did not participate this competition in current half-season
        // They receive no score; small morale/pressure change to reflect absence
        s.pressure += 5;
        try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'competition', amount: 5, competition: comp.name }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
        s.mental += uniform(-6,-2);
        continue;
      }
      // participant: apply normal effects
      if(comp.name==="NOI"){
        s.pressure += 40;
        try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'competition', amount: 40, competition: comp.name }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
        for(let i=0;i<results.length;i++){
          if(results[i].name === s.name){
            game.noi_rankings.push({name:s.name,rank:i+1});
            if(results[i].eligible === true && results[i].total >= comp.maxScore * NOI_SILVER_THRESHOLD) s.mental += uniform(-5,5);
            else s.mental += uniform(-15,-5);
            break;
          }
        }
      } else if(comp.name==="省选"){
        const delta = uniform(20,35);
        s.pressure += delta;
        try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'competition', amount: delta, competition: comp.name }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
        s.mental += uniform(-5,5);
      } else if(comp.name==="NOIP"){
        const delta = uniform(15,25);
        s.pressure += delta;
        try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'competition', amount: delta, competition: comp.name }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
      } else {
        const delta = uniform(5,10);
        s.pressure += delta;
        try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'competition', amount: delta, competition: comp.name }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
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

  // 弱化人数影响：使用开方缩放（sqrt），避免人数线性放大收益
  const perPassMin = 8000;
  const perPassMax = 20000;
  const rand = uniformInt(perPassMin, perPassMax);
  const effectivePassCount = scaledPassCount(pass_count);
  const grant = Math.round(effectivePassCount * level * rand * provinceCoef);
        // idempotent: ensure grant only applied once per competition-week
        try{
          const halfIndexApply = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
          const grantKey = `${halfIndexApply}_${comp.name}_${comp.week}`;
          if(!game.fundingIssued) game.fundingIssued = new Set();
          if(!game.fundingIssued.has(grantKey)){
            game.budget = (game.budget || 0) + grant;
            const msg = `上级拨款：由于 ${comp.name} 有 ${pass_count} 人晋级，获得拨款 ¥${grant}（等级${level}，省系数${provinceCoef}）`;
            log && log(`[拨款] ${msg}`);
            try{ if(pushEvent) pushEvent({ name:'拨款', description: `¥${grant}`, week: currWeek() }); }catch(e){}
            game.fundingIssued.add(grantKey);
          } else {
            console.log('[script.js] grant already issued for', comp.name, comp.week);
          }
        }catch(e){
          // fallback: apply grant if fundingIssued check fails
          game.budget = (game.budget || 0) + grant;
          const msg = `上级拨款：由于 ${comp.name} 有 ${pass_count} 人晋级，获得拨款 ¥${grant}（等级${level}，省系数${provinceCoef}）`;
          log && log(`[拨款] ${msg}`);
          try{ if(pushEvent) pushEvent({ name:'拨款', description: `¥${grant}`, week: currWeek() }); }catch(e){}
        }
      }
    }catch(e){ console.error('grant error', e); }

    if(comp.name==="NOI"){
      if(gold>0 || silver>0){
        let reward = uniformInt(NOI_REWARD_MIN, NOI_REWARD_MAX);
        game.reputation += uniformInt(30,50);
        game.budget += reward;
        game.had_good_result_recently = true;
        game.weeks_since_good_result = 0;
      }
    } else if(comp.name==="NOIP"){
      if(pass_count>0){
        // 晋级参加 NOIP
        let reward = uniformInt(NOIP_REWARD_MIN, NOIP_REWARD_MAX);
        game.reputation += uniformInt(15,25);
        game.budget += reward;
        game.had_good_result_recently = true;
        game.weeks_since_good_result = 0;
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
        // Create a career record and include the same human-readable remark including award hints
        const record = {
          week: comp.week,
          halfIndex: halfIndexApply,
          name: comp.name,
          passLine: pass_line,
          maxScore: (typeof comp.maxScore === 'number') ? comp.maxScore : ((comp.numProblems||problems.length||4) * 100),
          entries: results.map((r, idx) => {
            let remark = '';
            if(r.eligible === false){
              remark = '未参加';
            } else {
              const t = (typeof r.total === 'number') ? r.total : (r.total != null ? Number(r.total) : null);
              if(t != null && t >= pass_line) remark = '晋级';
              if(t != null && (comp.name === 'CSP-S1' || comp.name === 'CSP-S2' || comp.name === 'NOIP')){
                if(t >= pass_line){ remark += (remark ? '；' : '') + '一等奖'; }
                else if(t >= pass_line * 0.6){ remark += (remark ? '；' : '') + '二等奖'; }
                else if(t >= pass_line * 0.4){ remark += (remark ? '；' : '') + '三等奖'; }
              } else if(comp.name === 'NOI'){
                if(t != null && t >= pass_line * 1.0) remark += (remark? '；' : '') + '🥇金牌';
                else if(t != null && t >= pass_line * 0.7) remark += (remark? '；' : '') + '🥈银牌';
                else if(t != null && t >= pass_line * 0.5) remark += (remark? '；' : '') + '🥉铜牌';
              }
            }
            return { name: r.name, total: r.total, eligible: r.eligible, remark: remark, rank: r.eligible? (r.total!=null? (results.filter(x=>x.eligible===true).map(x=>x.name).indexOf(r.name)+1) : null) : null };
          })
        };
        if(!game.careerCompetitions) game.careerCompetitions = [];
        game.careerCompetitions.push(record);
      }catch(e){ console.error('record career comp failed', e); }
    }catch(e){ console.error('mark completion error', e); }
    log(`${comp.name} 结果已应用`);
    // 比赛不再消耗周数：保留一次性事件模态抑制以避免弹窗干扰
    try{ game.suppressEventModalOnce = true; }catch(e){}
    renderAll();
    
    // 关闭当前弹窗
    closeModal();
    
    // 检查是否需要触发结局（第二次 NOI 或赛季结束）
    try{
      alert(1);
      const halfIndexAfter = (currWeek() > WEEKS_PER_HALF) ? 1 : 0;
      console.log('[国家集训队检测] comp.name:', comp.name);
      console.log('[国家集训队检测] halfIndexAfter:', halfIndexAfter);
      console.log('[国家集训队检测] gold:', gold);
      console.log('[国家集训队检测] WEEKS_PER_HALF:', WEEKS_PER_HALF);
      console.log('[国家集训队检测] currWeek():', currWeek());
      
      // 第二年NOI：检查是否有金牌选手，决定是否进入国家集训队
      if(comp.name === 'NOI' && halfIndexAfter === 1 && gold > 0){
        // 有金牌选手，设置标志并弹出国家集训队选择事件
        console.log('[国家集训队检测] ✅ 条件满足，显示国家集训队选择弹窗');
        // 设置标志，防止周更新时触发赛季结束
        game.nationalTeamChoicePending = true;
        showNationalTeamChoice(results, comp.maxScore, pass_line);
        return; // 不再继续后续逻辑，直接退出
      }
      
      // 如果没有金牌或不是第二年NOI，按原逻辑处理
      if(comp.name === 'NOI' && halfIndexAfter === 1){
        shouldTriggerEnding = true;
        endingReason = '赛季结束';
      }
    }catch(e){ console.error('第二年NOI结算检查失败', e); }
    
    // 检查赛季是否结束
    try{
      if(game.week > SEASON_WEEKS && !game.seasonEndTriggered){
        shouldTriggerEnding = true;
        endingReason = '赛季结束';
      }
    }catch(e){ console.error('post-competition season-end check failed', e); }
    
    // 显示成绩汇总和晋级情况的确认弹窗
    showCompetitionSummary(comp, results, pass_line, pass_count, shouldTriggerEnding, endingReason);
  };

  // 在应用比赛结果后，若当前周已达到赛季末且尚未结算，则立即触发赛季结算（确保最终比赛结果被纳入结算）
  // 注意：这段代码现在移到了 showCompetitionSummary 的确认按钮中
  /*
  try{
    if(game.week > SEASON_WEEKS && !game.seasonEndTriggered){
      console.debug(game.week + "结束");
      triggerGameEnding('赛季结束');
    }
  }catch(e){ console.error('post-competition season-end check failed', e); }
  */
}

/* 显示比赛成绩汇总和晋级情况的确认弹窗 */
function showCompetitionSummary(comp, results, pass_line, pass_count, shouldTriggerEnding, endingReason){
  let html = `<h3>${comp.name} - 成绩汇总</h3>`;
  html += `<div style="margin:12px 0;">`;
  
  // 显示晋级情况
  const eligible_count = results.filter(r => r.eligible === true).length;
  const pass_rate = eligible_count > 0 ? ((pass_count / eligible_count) * 100).toFixed(1) : '0.0';
  
  html += `<div style="background:#f0f8ff;padding:10px;border-radius:5px;margin-bottom:12px;">`;
  html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;">📊 比赛统计</div>`;
  html += `<div>参赛人数：${eligible_count} 人</div>`;
  html += `<div>晋级人数：${pass_count} 人</div>`;
  html += `<div>晋级率：${pass_rate}%</div>`;
  html += `<div>晋级线：${pass_line.toFixed(1)} 分</div>`;
  html += `</div>`;
  
  // 显示晋级学生名单
  const passedStudents = results.filter(r => r.eligible === true && r.total >= pass_line);
  if(passedStudents.length > 0){
    html += `<div style="background:#e8f5e9;padding:10px;border-radius:5px;margin-bottom:12px;">`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#2e7d32;">✅ 晋级名单</div>`;
    for(let s of passedStudents){
      html += `<div style="margin:4px 0;">• ${s.name}：${s.total} 分</div>`;
    }
    html += `</div>`;
  }
  
  // 显示未晋级学生名单
  const failedStudents = results.filter(r => r.eligible === true && r.total < pass_line);
  if(failedStudents.length > 0){
    html += `<div style="background:#ffebee;padding:10px;border-radius:5px;margin-bottom:12px;">`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#c62828;">❌ 未晋级名单</div>`;
    for(let s of failedStudents){
      html += `<div style="margin:4px 0;">• ${s.name}：${s.total} 分</div>`;
    }
    html += `</div>`;
  }
  
  // 如果需要触发结局，显示提示
  if(shouldTriggerEnding){
    html += `<div style="background:#fff3e0;padding:10px;border-radius:5px;margin-bottom:12px;border:2px solid #ff9800;">`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#e65100;">⚠️ 游戏即将结束</div>`;
    html += `<div>结束原因：${endingReason}</div>`;
    html += `</div>`;
  }
  
  html += `</div>`;
  
  // 添加确认按钮
  html += `<div class="modal-actions" style="margin-top:8px;">`;
  html += `<button class="btn" id="comp-summary-confirm">确认并继续</button>`;
  html += `</div>`;
  
  showModal(html);
  
  $('comp-summary-confirm').onclick = ()=>{
    closeModal();
    
    // 如果需要触发结局，现在执行
    if(shouldTriggerEnding){
      try{
        console.log('比赛汇总确认后触发游戏结局：' + endingReason);
        triggerGameEnding(endingReason);
      }catch(e){
        console.error('触发游戏结局失败', e);
      }
    }
  };
}

/* 国家集训队选择弹窗 */
/* 国家集训队选择弹窗 */
function showNationalTeamChoice(noiResults, noiMaxScore, passLine) {
  // 找出所有金牌选手
  // 优先使用传入的 passLine（来自比赛时计算的晋级线），以保证阈值一致
  const goldMedalThreshold = (typeof passLine === 'number' && !isNaN(passLine)) ? passLine : (noiMaxScore * NOI_GOLD_THRESHOLD);
  const goldStudents = noiResults.filter(r => r.eligible === true && r.total >= goldMedalThreshold);
  
  if(goldStudents.length === 0) {
    // 没有金牌选手，直接结束
    triggerGameEnding('赛季结束');
    return;
  }
  
  let html = `<h3>🏅 国家集训队邀请</h3>`;
  html += `<div style="margin:12px 0;">`;
  html += `<div style="background:#fff9c4;padding:12px;border-radius:5px;margin-bottom:12px;border:2px solid #fbc02d;">`;
  html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#f57f17;">🎉 恭喜！</div>`;
  html += `<div style="margin-bottom:8px;">以下学生在NOI中获得金牌，获得国家集训队资格：</div>`;
  for(let s of goldStudents){
    html += `<div style="margin:4px 0;">• ${s.name}（${s.total} 分）</div>`;
  }
  html += `</div>`;
  
  html += `<div style="background:#e3f2fd;padding:12px;border-radius:5px;margin-bottom:12px;">`;
  html += `<div style="font-size:14px;font-weight:bold;margin-bottom:8px;">📋 国家集训队说明</div>`;
  html += `<div style="font-size:13px;line-height:1.6;">`;
  html += `<p>• 进入国家集训队后，将进行CTT、CTS比赛</p>`;
  html += `<p>• 没有金牌的学生将自动退队（不减少声誉）</p>`;
  html += `<p>• 根据CTT+CTS总分排名，入选国家队，参加IOI</p>`;
  html += `</div>`;
  html += `</div>`;
  
  html += `</div>`;
  
  html += `<div class="modal-actions" style="margin-top:8px;">`;
  html += `<button class="btn btn-ghost" id="national-team-decline">否，直接结算</button>`;
  html += `<button class="btn" id="national-team-accept">是，进入国家集训队</button>`;
  html += `</div>`;
  
  showModal(html);
  
  // 拒绝：直接结算
  $('national-team-decline').onclick = ()=>{
    closeModal();
    game.nationalTeamChoicePending = false;
    triggerGameEnding('赛季结束');
  };
  
  // 接受：进入国家集训队
  $('national-team-accept').onclick = ()=>{
    closeModal();
    game.nationalTeamChoicePending = false;
    enterNationalTeam(goldStudents);
  };
}

/* 进入国家集训队 */
function enterNationalTeam(goldStudents) {
  // 标记进入国家集训队模式
  game.inNationalTeam = true;
  game.nationalTeamResults = {
    goldStudents: goldStudents.map(s => s.name),
    cttScores: [],  // 改为数组，用于存储CTT成绩记录
    ctsScores: [],  // 改为数组，用于存储CTS成绩记录
    totalScores: {},
    ioiQualified: []
  };
  
  // 让没有金牌的学生自动退队（不减声誉）
  const goldNames = new Set(goldStudents.map(s => s.name));
  for(let student of game.students) {
    if(student.active !== false && !goldNames.has(student.name)) {
      student.active = false;
      log(`${student.name} 未获得金牌，退出国家集训队`);
    }
  }
  
  log(`进入国家集训队！金牌选手：${Array.from(goldNames).join('、')}`);
  pushEvent({
    name: '进入国家集训队',
    description: `恭喜${goldStudents.length}名学生进入国家集训队！`,
    week: game.week
  });
  
  // 动态添加国家集训队比赛到 competitions 数组
  const currentWeek = game.week;
  const nationalTeamComps = [
    {week: currentWeek + 2, name:"CTT-day1-2", difficulty:500, maxScore:600, numProblems:6, nationalTeam:true},
    {week: currentWeek + 3, name:"CTT-day3-4", difficulty:500, maxScore:600, numProblems:6, nationalTeam:true},
    {week: currentWeek + 4, name:"CTS", difficulty:520, maxScore:800, numProblems:8, nationalTeam:true}
    // IOI 会在 CTS 结束后根据晋级情况动态添加
  ];
  
  // 添加到全局 competitions 数组
  if(typeof window.competitions !== 'undefined' && Array.isArray(window.competitions)) {
    for(let comp of nationalTeamComps) {
      window.competitions.push(comp);
    }
    console.log('[国家集训队] 已添加比赛到 competitions 数组:', nationalTeamComps);
  }
  
  // 刷新UI
  renderAll();
}

/* 计算国家集训队晋级（CTT+CTS） */
function calculateNationalTeamQualification() {
  // 从 nationalTeamResults 中提取成绩
  const cttScores = game.nationalTeamResults.cttScores || [];
  const ctsScores = game.nationalTeamResults.ctsScores || [];
  
  // 计算每个学生的总分（CTT + CTS）
  let totalScores = [];
  let studentScoreMap = {};
  
  // 累计CTT成绩（两天）
  for(let record of cttScores){
    if(!studentScoreMap[record.studentName]){
      studentScoreMap[record.studentName] = { ctt: 0, cts: 0 };
    }
    studentScoreMap[record.studentName].ctt += record.score;
  }
  
  // 累计CTS成绩
  for(let record of ctsScores){
    if(!studentScoreMap[record.studentName]){
      studentScoreMap[record.studentName] = { ctt: 0, cts: 0 };
    }
    studentScoreMap[record.studentName].cts = record.score;
  }
  
  // 构建总分数组
  for(let name in studentScoreMap){
    const scores = studentScoreMap[name];
    totalScores.push({
      name,
      cttScore: scores.ctt,
      ctsScore: scores.cts,
      total: scores.ctt + scores.cts
    });
  }
  
  // 按总分排序
  totalScores.sort((a,b) => b.total - a.total);
  
  // 计算晋级线（总分的50%）
  const maxPossible = 600 + 600 + 800; // CTT-day1-2 + CTT-day3-4 + CTS
  const passLine = maxPossible * 0.5;
  
  // 晋级：前2名且总分超过晋级线
  let qualified = [];
  for(let i = 0; i < Math.min(2, totalScores.length); i++){
    if(totalScores[i].total >= passLine){
      qualified.push(totalScores[i]);
    }
  }
  
  // 如果晋级人数超过2人，提高晋级线
  if(qualified.length > 2){
    qualified = qualified.slice(0, 2);
  }
  
  if(!game.nationalTeamResults.totalScores) game.nationalTeamResults.totalScores = {};
  for(let s of totalScores){
    game.nationalTeamResults.totalScores[s.name] = s.total;
  }
  
  game.nationalTeamResults.ioiQualified = qualified.map(q => q.name);
  
  // 显示晋级结果
  let html = `<h3>🏆 国家队选拔结果</h3>`;
  html += `<div style="margin:12px 0;">`;
  html += `<div style="background:#f0f8ff;padding:12px;border-radius:5px;margin-bottom:12px;">`;
  html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;">📊 总成绩（CTT + CTS）</div>`;
  html += `<table><thead><tr><th>排名</th><th>姓名</th><th>CTT</th><th>CTS</th><th>总分</th><th>结果</th></tr></thead><tbody>`;
  
  for(let i = 0; i < totalScores.length; i++){
    let s = totalScores[i];
    const isQualified = game.nationalTeamResults.ioiQualified.includes(s.name);
    const resultText = isQualified ? '✅ 晋级IOI' : '❌ 未晋级';
    const rowStyle = isQualified ? 'background:#e8f5e9' : '';
    html += `<tr style="${rowStyle}"><td>${i+1}</td><td>${s.name}</td><td>${s.cttScore}</td><td>${s.ctsScore}</td><td><strong>${s.total}</strong></td><td>${resultText}</td></tr>`;
  }
  
  html += `</tbody></table>`;
  html += `<div style="margin-top:8px;font-size:13px;color:#666;">晋级线：${passLine.toFixed(0)} 分（总分50%），最多2人晋级</div>`;
  html += `</div>`;
  
  if(qualified.length > 0){
    html += `<div style="background:#fff9c4;padding:12px;border-radius:5px;margin-bottom:12px;border:2px solid #fbc02d;">`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#f57f17;">🎉 恭喜晋级IOI！</div>`;
    html += `<div>晋级选手：${qualified.map(q => q.name).join('、')}</div>`;
    html += `<div style="margin-top:8px;font-size:13px;">1周后将参加IOI比赛</div>`;
    html += `</div>`;
  } else {
    html += `<div style="background:#ffebee;padding:12px;border-radius:5px;margin-bottom:12px;">`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#c62828;">❌ 无人晋级</div>`;
    html += `<div>没有选手达到晋级标准，国家集训队之旅到此结束</div>`;
    html += `</div>`;
  }
  
  html += `</div>`;
  html += `<div class="modal-actions"><button class="btn" id="nt-qual-confirm">确认</button></div>`;
  
  showModal(html);
  
  $('nt-qual-confirm').onclick = ()=>{
    closeModal();
    
    if(qualified.length > 0){
      // 有人晋级，动态添加IOI比赛到competitions数组
      const currentWeek = game.week;
      const ioiComp = {
        week: currentWeek + 1,
        name: "IOI",
        difficulty: 550,
        maxScore: 600,
        numProblems: 6,
        nationalTeam: true,
        subtasksPerProblem: 15
      };
      
      // 检查是否已添加IOI比赛
      const hasIOI = window.competitions.some(c => c.name === 'IOI' && c.nationalTeam);
      if(!hasIOI){
        window.competitions.push(ioiComp);
        console.log('【国家集训队】动态添加IOI比赛到competitions:', ioiComp);
      }
      
      log(`IOI比赛将在第 ${ioiComp.week} 周进行`);
      pushEvent({
        name: 'IOI晋级',
        description: `${qualified.length}名选手晋级IOI`,
        week: currWeek()
      });
      
      renderAll();
    } else {
      // 无人晋级，游戏结束
      game.inNationalTeam = false;
      triggerGameEnding('赛季结束');
    }
  };
}

/* 计算IOI结果 */
function calculateIOIResults() {
  // 从 careerCompetitions 中提取IOI成绩
  const ioiRecord = game.careerCompetitions.find(c => c.name === 'IOI');
  if(!ioiRecord){
    console.error('未找到IOI比赛记录');
    return;
  }
  
  // IOI 奖牌分配：不再使用固定的基础分数线（IOI_GOLD_THRESHOLD 等），
  // 仅按当前参赛人数的排名百分比分配奖牌（默认 10%/30%/50%）。
  const maxScore = 600; // IOI满分（仅用于检测满分情形）

  // 使用 contest-integration 保存的全部参赛选手成绩（包含国际选手）优先
  const allResults = (game.lastIOIAllResults && Array.isArray(game.lastIOIAllResults) && game.lastIOIAllResults.length > 0)
    ? game.lastIOIAllResults.slice()
    : (ioiRecord.entries || []).map(e => ({ name: e.name, score: Number(e.score) || 0, rank: e.rank || 0, isInternational: false }));

  // 按分数降序排序
  allResults.sort((a,b) => b.score - a.score);

  const n = allResults.length;
  const goldMax = Math.floor(n * 0.10);   // 顶部 X% 为金牌（按当前人数计算）
  const silverMax = Math.floor(n * 0.30); // 接下来 Y% 为银牌
  const bronzeMax = Math.floor(n * 0.50); // 接下来 Z% 为铜牌

  // 按排名直接分配：前 goldMax 名为金牌，接下来 silverMax 名为银牌，接下来 bronzeMax 名为铜牌
  const medals = { gold: [], silver: [], bronze: [], none: [] };
  for(let i = 0; i < allResults.length; i++){
    const r = allResults[i];
    if(i < goldMax) medals.gold.push(r);
    else if(i < goldMax + silverMax) medals.silver.push(r);
    else if(i < goldMax + silverMax + bronzeMax) medals.bronze.push(r);
    else medals.none.push(r);
  }

  // 检测是否有满分（用于特定结局显示）
  let hasFullScore = false;
  let chineseHasFullScore = false; // 专门记录中国队是否满分
  for(const g of [].concat(medals.gold, medals.silver, medals.bronze)){
    if(g.score >= maxScore){
      hasFullScore = true;
      if(!g.isInternational) chineseHasFullScore = true;
    }
  }

  // 强制上限检查（保留以兼容极端情况/平分边界处理）
  function enforceLimit(groupArray, limit, demoteTo){
    if(groupArray.length <= limit) return;
    // 按分数升序排序，先降分低者
    groupArray.sort((a,b) => a.score - b.score);
    while(groupArray.length > limit){
      const demoted = groupArray.shift();
      demoteTo.push(demoted);
    }
  }

  // 执行上限约束（通常不会改变已按排名分配的结果，但在极端平分场景下可保证上限）
  enforceLimit(medals.gold, goldMax, medals.silver);
  enforceLimit(medals.silver, silverMax, medals.bronze);
  enforceLimit(medals.bronze, bronzeMax, medals.none);

  // 重新构建 results 列表（用于显示），保持按分数降序
  const results = [].concat(medals.gold, medals.silver, medals.bronze, medals.none);
  
  // 保存IOI结果到游戏状态
  game.ioiResults = {
    medals,
    hasFullScore,
    chineseHasFullScore, // 保存中国队是否满分的信息
    maxScore
  };
  
  // 显示IOI结果
  let html = `<h3>🌍 IOI 比赛结果</h3>`;
  html += `<div style="margin:12px 0;">`;
  
  // 成绩表
  html += `<div style="background:#f0f8ff;padding:12px;border-radius:5px;margin-bottom:12px;">`;
  html += `<table><thead><tr><th>排名</th><th>姓名</th><th>总分</th><th>奖牌</th></tr></thead><tbody>`;
  
  for(let i = 0; i < results.length; i++){
    let r = results[i];
    let medal = '';
    let rowStyle = '';
    // 判断所在分组
    if(medals.gold.includes(r)){
      medal = '🥇 金牌'; rowStyle = 'background:#fff9c4';
    } else if(medals.silver.includes(r)){
      medal = '🥈 银牌'; rowStyle = 'background:#f5f5f5';
    } else if(medals.bronze.includes(r)){
      medal = '🥉 铜牌'; rowStyle = 'background:#ffebcc';
    }
    html += `<tr style="${rowStyle}"><td>${i+1}</td><td>${r.name}</td><td><strong>${r.score}</strong></td><td>${medal}</td></tr>`;
  }
  
  html += `</tbody></table>`;
  html += `<div style="margin-top:8px;font-size:13px;color:#666;">`;
  html += `奖牌分配规则：前 ${Math.round(100*0.10)}% (金) / ${Math.round(100*0.30)}% (银) / ${Math.round(100*0.50)}% (铜)，按当前参赛人数计算`;
  html += `</div>`;
  html += `</div>`;
  
  // 结局提示 - 只有中国队选手满分才显示AKIOI
  const chineseGoldCount = medals.gold.filter(r => !r.isInternational).length;
  const chineseMedalCount = medals.gold.filter(r => !r.isInternational).length + 
                            medals.silver.filter(r => !r.isInternational).length + 
                            medals.bronze.filter(r => !r.isInternational).length;
  
  if(chineseHasFullScore){
    html += `<div style="background:linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);padding:12px;border-radius:5px;margin-bottom:12px;border:3px solid #ffd700;">`;
    html += `<div style="font-size:18px;font-weight:bold;margin-bottom:8px;color:#b8860b;">👑 AKIOI！满分！</div>`;
    html += `<div>恭喜！中国队选手在IOI上取得满分，这是最高荣誉！</div>`;
    html += `</div>`;
  } else if(chineseGoldCount > 0){
    html += `<div style="background:#fff9c4;padding:12px;border-radius:5px;margin-bottom:12px;border:2px solid #fbc02d;">`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#f57f17;">🥇 获得IOI金牌！</div>`;
    html += `<div>恭喜！中国队选手获得${chineseGoldCount}枚金牌，达成顶尖结局！</div>`;
    html += `</div>`;
  } else if(chineseMedalCount > 0){
    html += `<div style="background:#e3f2fd;padding:12px;border-radius:5px;margin-bottom:12px;">`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#1976d2;">🏅 获得IOI奖牌！</div>`;
    html += `<div>恭喜！中国队选手获得${chineseMedalCount}枚奖牌，达成顶尖结局！</div>`;
    html += `</div>`;
  } else {
    html += `<div style="background:#ffebee;padding:12px;border-radius:5px;margin-bottom:12px;">`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#c62828;">未获得奖牌</div>`;
    html += `<div>虽然中国队未获得奖牌，但选手参加IOI本身就是了不起的成就！</div>`;
    html += `</div>`;
  }
  
  html += `</div>`;
  html += `<div class="modal-actions"><button class="btn" id="ioi-finish">查看结局</button></div>`;
  
  showModal(html);
  
  $('ioi-finish').onclick = ()=>{
    closeModal();
    // 触发特殊结局 - 只有中国队满分才是AKIOI
    if(chineseHasFullScore){
      triggerGameEnding('AKIOI');
    } else if(chineseMedalCount > 0){
      triggerGameEnding('顶尖结局');
    } else {
      triggerGameEnding('赛季结束');
    }
  };
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
  // 防御性检查：如果存在需要玩家选择的未处理事件，则阻止周结算
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
  let comfort = game.getComfort();
  
  // 先处理生病恢复，并检测自愈天赋
  for(let s of game.students){
    if(!s || s.active === false) continue;
    if(s.sick_weeks > 0){
      s.sick_weeks--;
      // 检测自愈天赋：有30%概率额外减少1周病程
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
    
    // 计算个人舒适度用于压力恢复（考虑天赋）
    let personalComfort = comfort;
    
    // 天气敏感：天气影响翻倍
    if(s.talents && s.talents.has('天气敏感')){
      const baseComfort = game.base_comfort;
      const weatherEffect = comfort - baseComfort;
      personalComfort = baseComfort + weatherEffect * 2;
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    // 美食家：食堂效果翻倍（用于压力恢复）
    if(s.talents && s.talents.has('美食家')){
      const canteenBonus = 3 * (game.facilities.canteen - 1);
      personalComfort += canteenBonus;
      personalComfort = Math.max(0, Math.min(100, personalComfort));
    }
    
    let pressure_recovery = RECOVERY_RATE * (personalComfort/100.0) * weeks;
    
    // 检测乐天派天赋：每周额外恢复3点压力
    if(s.talents && s.talents.has('乐天派')){
      pressure_recovery += 3 * weeks;
    }
    
    s.pressure = Math.max(0, s.pressure - pressure_recovery);
    s.pressure = Math.min(100, s.pressure);
  }
  for(let i=0;i<weeks;i++){
    // 周度支出按人数系数调整
    const weeklyRaw = game.getWeeklyCost();
    const weeklyAdj = Math.round(weeklyRaw * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
    game.recordExpense(weeklyAdj, '周维护费用');
    game.week++;
    game.updateWeather();
  }
  // teaching_points 已弃用，移除增量逻辑
  game.weeks_since_good_result += weeks;
  if(game.weeks_since_good_result > 12) game.had_good_result_recently = false;
  // 触发每周/每回合结束相关的天赋事件（兼容旧/新接口）
  try{
    for(let s of game.students){
      if(!s) continue;
      try{
        if(typeof s.triggerTalents === 'function'){
          // 仅触发 week_end，避免同一周内重复触发导致天赋效果叠加
          s.triggerTalents('week_end', {});
        } else if(typeof window !== 'undefined' && window.TalentManager && typeof window.TalentManager.handleStudentEvent === 'function'){
          window.TalentManager.handleStudentEvent(s, 'week_end', {});
        }
      }catch(e){ console.error('triggerTalents week_end/turn_end', e); }
    }
  }catch(e){ console.error('weeklyUpdate trigger talents failed', e); }

  checkRandomEvents();
  // 检查游戏结束条件
  if (checkAndTriggerEnding()) {
    return; // 游戏已结束，不再继续处理
  }
  
  renderAll();
}
// 安全的周更新：在多周跳转时不跳过即将到来的比赛
function safeWeeklyUpdate(weeks = 1) {
  // 如果存在需玩家选择的未处理事件，则阻止推进周数，直到玩家处理完这些事件
  try{
    if(hasPendingRequiredEvents()){
      const msg = '存在未处理的事件卡片，请先处理所有可选择的事件再进行回合推进。';
      console.log('safeWeeklyUpdate blocked: pending required events');
      if(window.toastManager && typeof window.toastManager.show === 'function'){
        window.toastManager.show(msg, 'warning');
      } else {
        try{ alert(msg); }catch(e){}
      }
      return; // 阻止推进
    }
  }catch(e){ /* ignore and continue if check fails */ }
  // If a contest live modal is active, defer the weekly advance until it closes.
  try{
    if(window.__contest_live_modal_active){
      window.__deferred_week_advances = (window.__deferred_week_advances || 0) + Number(weeks || 0);
      console.log('safeWeeklyUpdate: contest modal active, deferring', weeks, 'weeks (total deferred:', window.__deferred_week_advances, ')');
      // also store a timestamp for debugging
      window.__deferred_week_adv_last = Date.now();
      return;
    }
  }catch(e){ /* ignore */ }
  
  // 检查游戏结束条件（包括经费不足等）
  if (checkAndTriggerEnding()) {
    return; // 游戏已结束
  }
  
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
    if(typeof window.holdCompetitionModalNew === 'function'){
      window.holdCompetitionModalNew(comp);
    } else {
      holdCompetitionModal(comp);
    }
    break; // only one per week
  }
}

/* 统一结局触发检查 */
function checkAndTriggerEnding() {
  // 检查是否应该触发结局
  // treat student as active unless explicitly set to false (backwards compatible)
  const activeStudentCount = Array.isArray(game.students) ? game.students.filter(s => s && s.active !== false).length : 0;
  try{ if(typeof window !== 'undefined' && window.__OI_DEBUG_ENDING) console.debug('[ENDING DEBUG] checkAndTriggerEnding activeStudentCount=', activeStudentCount, 'students=', game.students.map(s=>({name: s && s.name, active: s && s.active}))); }catch(e){}
  
  // 条件1：经费小于5000
  if (game.budget < 5000) {
    // 触发统一结局标识
    triggerGameEnding('经费不足');
    return true;
  }

 // alert(activeStudentCount);

  // 条件2：没有学生
  if (activeStudentCount === 0) {
    //alert('所有学生均已退队，游戏结束');
    triggerGameEnding('无学生');
    return true;
  }
  
  // 条件3：晋级链断裂（检查是否在第二赛季且无人有下场比赛资格）
  // 注意：晋级链断裂应该在比赛结束后检查，而不是在周更新时检查
  // 否则会在第二赛季开始时就误判（因为第二赛季的资格数据还未生成）
  // 这个检查已移到 contest-integration.js 的比赛结果处理中
  // 此处不再进行晋级链断裂检查，避免误判
  
  // 条件4：达到赛季结束
  // 注意：如果正在国家集训队流程中或等待国家集训队选择，不触发赛季结束
  if (game.week > SEASON_WEEKS) {
    // 检查是否在国家集训队流程中或等待选择
    if(game.inNationalTeam === true || game.nationalTeamChoicePending === true) {
      console.log('[结算检测] 当前在国家集训队流程中或等待选择，暂不触发赛季结束');
      return false; // 不触发结算，让国家集训队流程继续
    }
    triggerGameEnding('赛季结束');
    return true;
  }
  
  return false;
}

/* 规范化结局文本，兼容历史写法并返回统一的内部标识字符串 */
function normalizeEndingReason(raw) {
  try{
    if(!raw) return '赛季结束';
    const s = String(raw).trim();
    if(s === '') return '赛季结束';
    
    // 优先检查特殊结局
    if(s === 'AKIOI' || s === '👑 AKIOI') return 'AKIOI';
    if(s === '顶尖结局' || s === '🌟 顶尖结局') return '顶尖结局';
    
    // 兼容英文或旧字段
    const low = s.toLowerCase();
    if(low.includes('akioi')) return 'AKIOI';
    if(low.includes('顶尖')) return '顶尖结局';
    if(low.includes('budget') || low.includes('经费') || low.includes('money') || low.includes('fund')) return '经费不足';
    if(low.includes('无学生') || low.includes('all quit') || low.includes('所有学生') || low.includes('退队') || low.includes('崩溃')) return '无学生';
    if(low.includes('晋级链') || low.includes('晋级链断裂') || low.includes('chain') || low.includes('qualification')) return '晋级链断裂';
    if(low.includes('赛季') || low.includes('season')) return '赛季结束';
    
    // 兼容简短老值
    if(s === '无学生') return '无学生';
    if(s === '经费不足' || s === '经费耗尽') return '经费不足';
    if(s === '晋级链断裂') return '晋级链断裂';
    
    return s;
  }catch(e){ return '赛季结束'; }
}

/* 触发游戏结局 */
function triggerGameEnding(reason) {
  //在这里显示这个函数在哪里被调用（debug）
 // alert('[DEBUG] 游戏结束！');
  try {
    // 标记游戏结束
    game.seasonEndTriggered = true;
    // 规范化结局字符串并推送结束事件
    const normalized = reason;
    //alert(normalized + '，游戏结束！');
    pushEvent({ 
      name: '游戏结束', 
      description: `游戏结束原因：${normalized}`, 
      week: game.week 
    });
    
    // 调试: 保存前打印careerCompetitions
    console.log('【DEBUG】 triggerGameEnding saving careerCompetitions:', game.careerCompetitions);
    // 保存游戏状态，使用统一的 saveGame 序列化逻辑
    if(typeof saveGame === 'function') {
      try{ console.debug('triggerGameEnding 将调用 saveGame(), oi_coach_save exists: ' + (localStorage.getItem('oi_coach_save') !== null)); }catch(e){}
      saveGame();
    }
    // 保存结局原因
  try{ console.debug('triggerGameEnding 设置 oi_coach_ending_reason = ' + normalized); }catch(e){}
    // 将规范化后的结局写入 sessionStorage（首选）并写入 localStorage 作为兼容备份
  try{ sessionStorage.setItem('oi_coach_ending_reason', normalized); }catch(e){ console.warn('sessionStorage unavailable for ending_reason', e); }
  try{ localStorage.setItem('oi_coach_ending_reason', normalized); }catch(e){ /* ignore localStorage write failures */ }
    

    // 延迟跳转以确保保存完成
    setTimeout(() => {
      try { 
  try{ console.debug('即将跳转到 end.html, oi_coach_save exists: ' + (localStorage.getItem('oi_coach_save') !== null) + ', length: ' + (localStorage.getItem('oi_coach_save') || '').length); }catch(e){}
        // 临时跨页面传递（用于 file:// 本地打开时 localStorage 可能按文件隔离的场景）
        try{
          // Prefer sessionStorage payload for transfer; fall back to localStorage if needed
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

/* 结局判定 - 移至结算界面计算 */
function checkEnding(){
  // 此函数已废弃，结局判定移至结算界面进行
  return "� 等待结算";
}

/* 当所有学生都退队时的标记函数 - 移除自动结局判定 */
function triggerBadEnding(reason){
  try{ pushEvent(reason || '所有学生已退队'); }catch(e){}
  // 标记所有学生退队，但不立即触发结局
  try{ game.allQuitTriggered = true; }catch(e){}
  // 不再自动跳转到结算页面，让游戏继续运行直到赛季结束
}

function checkAllQuitAndTriggerBadEnding(){
  try{
    if(game && game.allQuitTriggered) return; // 已经触发过
  const active_count = Array.isArray(game.students) ? game.students.filter(s => s && s.active !== false).length : 0;
    if(active_count === 0){
      triggerBadEnding('所有学生已退队，项目失败（坏结局）');
    }
  }catch(e){ console.error('checkAllQuitAndTriggerBadEnding error', e); }
}

/* =========== UI：模态 / 启动 / 交互绑定 =========== */
// showModal: render HTML into modal-root, and if there is a .modal-actions
// block provided in the HTML, relocate it into a top-left action panel to
// reduce mouse travel. Also attach keyboard handlers: Enter triggers the
// first non-ghost button, Escape closes the modal.
function showModal(html){
  const root = $('modal-root');
  if(!root) return;
  root.innerHTML = `<div class="modal"><div class="dialog">${html}</div></div>`;

  // find the dialog and any modal-actions inside it
  const dialog = root.querySelector('.dialog');
  if(!dialog) return;

  const actions = dialog.querySelector('.modal-actions');
  // create action panel only when actions exist
  if(actions){
    const panel = document.createElement('div');
    panel.className = 'modal-action-panel';
    // move child nodes from actions into panel
    while(actions.firstChild){ panel.appendChild(actions.firstChild); }
    // remove the original actions container
    actions.remove();
    // insert panel into dialog
    dialog.appendChild(panel);
    // add a guard spacer so content won't be obscured
    const guard = document.createElement('div'); guard.className = 'modal-action-guard';
    dialog.insertBefore(guard, dialog.firstChild);

    // enlarge hit area for buttons and ensure tabindex
    const buttons = panel.querySelectorAll('button');
    buttons.forEach((b, idx) => {
      b.classList.add('modal-btn');
      if(!b.hasAttribute('tabindex')) b.setAttribute('tabindex', '0');
      // make primary (first) button more prominent
      if(idx === 0) b.classList.add('btn-primary');
    });

    // focus the primary button for quick activation
    const primary = panel.querySelector('button.btn-primary') || panel.querySelector('button');
    if(primary) primary.focus();
  }

  // attach keyboard handler
  function keyHandler(e){
    if(e.key === 'Escape'){
      closeModal();
    }else if(e.key === 'Enter'){
      // trigger first visible non-ghost button in panel, otherwise first button in dialog
      let targetBtn = null;
      const panelBtn = dialog.querySelector('.modal-action-panel button:not(.btn-ghost):not(:disabled)');
      if(panelBtn) targetBtn = panelBtn;
      else targetBtn = dialog.querySelector('button:not(.btn-ghost):not(:disabled)') || dialog.querySelector('button:not(:disabled)');
      if(targetBtn){
        try{ targetBtn.click(); }catch(e){}
      }
    }
  }
  // store handler so we can remove later
  root._modalKeyHandler = keyHandler;
  window.addEventListener('keydown', keyHandler);
}

function closeModal(){
  const root = $('modal-root');
  if(!root) return;
  // remove keyboard handler if attached
  if(root._modalKeyHandler){
    try{ window.removeEventListener('keydown', root._modalKeyHandler); }catch(e){}
    root._modalKeyHandler = null;
  }
  root.innerHTML = '';
}

/* UI 表单与交互 */

/* 训练 UI */
function trainStudentsUI(){
  // 新的训练系统：从题目库中随机抽取5道题供玩家选择
  const tasks = selectRandomTasks(5);
  
  // 生成题目选项卡片
  const taskCards = tasks.map((task, idx) => {
    const boostStr = task.boosts.map(b => `${b.type}+${b.amount}`).join(' ');
    // 渲染难度标签（替换原始数字显示）
    const diffTag = renderDifficultyTag(task.difficulty);
    return `
    <div class="prov-card option-card task-card" data-idx="${idx}" style="min-width:200px;padding:12px;border-radius:6px;cursor:pointer;border:2px solid #ddd;">
      <div class="card-title" style="font-weight:600;margin-bottom:4px">${task.name}</div>
      <div class="small" style="margin:4px 0">难度: ${diffTag}</div>
      <div class="card-desc small muted">${boostStr}</div>
    </div>
  `;
  }).join('');

  // 强度选项
  const intensityHtml = `
    <div id="train-int-grid" style="display:flex;gap:8px;margin-top:6px">
      <button class="prov-btn option-btn" data-val="1">轻度</button>
      <button class="prov-btn option-btn" data-val="2">中度</button>
      <button class="prov-btn option-btn" data-val="3">重度</button>
    </div>
    <div class="small muted" style="margin-top:6px">强度影响压力和训练时长</div>
  `;

  showModal(`<h3>选择训练题目</h3>
    <div class="small muted" style="margin-bottom:10px">从下方5道题目中选择一道进行训练。题目提升效果受学生能力与难度匹配度影响。</div>
    <label class="block">可选题目</label>
    <div id="train-task-grid" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;overflow-x:auto;max-height:300px;overflow-y:auto;">${taskCards}</div>
    <div id="train-task-helper" class="small muted" style="margin-top:6px;display:none;color:#c53030;font-weight:700"></div>
    <label class="block" style="margin-top:14px">训练强度</label>
    ${intensityHtml}
    <div id="train-int-helper" class="small muted" style="margin-top:6px;display:none;color:#c53030;font-weight:700"></div>
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn" id="train-confirm">开始训练（1周）</button>
    </div>`);

  // 题目卡片选择行为
  const tCards = Array.from(document.querySelectorAll('#train-task-grid .task-card'));
  if(tCards.length > 0) tCards[0].classList.add('selected');
  tCards.forEach(c => {
    c.onclick = () => {
      tCards.forEach(x => { x.classList.remove('selected'); x.classList.remove('shake'); });
      c.classList.add('selected');
      // remove helper / highlight when user selects
      const helper = $('train-task-helper'); if(helper){ helper.style.display='none'; helper.innerText=''; }
      const grid = $('train-task-grid'); if(grid) grid.classList.remove('highlight-required');
    };
  });

  // 强度按钮选择行为（默认选中中度）
  const intBtns = document.querySelectorAll('#train-int-grid .option-btn');
  intBtns.forEach((b, i) => {
    if(i === 1) b.classList.add('selected'); // 默认中度
    b.onclick = () => {
      intBtns.forEach(x => { x.classList.remove('selected'); x.classList.remove('shake'); });
      b.classList.add('selected');
      // remove helper / highlight when user selects
      const helper = $('train-int-helper'); if(helper){ helper.style.display='none'; helper.innerText=''; }
      const grid = $('train-int-grid'); if(grid) grid.classList.remove('highlight-required');
    };
  });

  // 确认按钮
  $('train-confirm').onclick = () => {
    let taskBtn = document.querySelector('#train-task-grid .task-card.selected');
    let intBtn = document.querySelector('#train-int-grid .option-btn.selected');

    // Enhanced inline validation & guidance
    if(!taskBtn) {
      const helper = $('train-task-helper'); if(helper){ helper.style.display='block'; helper.innerText='请先选择一道训练题目以开始训练'; }
      const grid = $('train-task-grid'); if(grid) grid.classList.add('highlight-required');
      const first = document.querySelector('#train-task-grid .task-card');
      if(first){ first.classList.add('shake'); setTimeout(()=>first.classList.remove('shake'), 900); try{ first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }catch(e){} }
      return;
    }

    if(!intBtn) {
      const helper = $('train-int-helper'); if(helper){ helper.style.display='block'; helper.innerText='请选择训练强度（轻/中/重）'; }
      const grid = $('train-int-grid'); if(grid) grid.classList.add('highlight-required');
      const first = document.querySelector('#train-int-grid .option-btn');
      if(first){ first.classList.add('shake'); setTimeout(()=>first.classList.remove('shake'), 900); try{ first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }catch(e){} }
      return;
    }

    let taskIdx = parseInt(taskBtn.dataset.idx);
    let selectedTask = tasks[taskIdx];
    let intensity = intBtn ? parseInt(intBtn.dataset.val) : 2;
    
    closeModal();
    
    // 执行新的基于题目的训练
    trainStudentsWithTask(selectedTask, intensity);
    
    // 安全更新：判断下场比赛周数，避免培训跳过比赛
    let nextComp = competitions.find(c => c.week > currWeek());
    let weeksToComp = nextComp ? (nextComp.week - currWeek()) : Infinity;
    let advance = Math.min(1, weeksToComp);
    safeWeeklyUpdate(advance);
    renderAll();
  };
}

/* 模拟赛 UI：付费比赛可选难度和tag，网赛tag随机 */
function holdMockContestUI(){
  // 构建正式比赛难度级别下拉选项（用于付费比赛）
  const officialContestOptions = COMPETITION_SCHEDULE.map((comp, idx) => 
    `<option value="${idx}">${comp.name} (难度${comp.difficulty}, ${comp.numProblems}题)</option>`
  ).join('');
  
  // 构建网赛类型下拉选项
  const onlineContestOptions = ONLINE_CONTEST_TYPES.map((type, idx) => 
    `<option value="${idx}">${type.displayName} (${type.numProblems}题)</option>`
  ).join('');
  
  let kpHtml = KP_OPTIONS.map(k=>`<label style="margin-right:8px"><input type="checkbox" class="kp-option" value="${k.name}"> ${k.name}</label>`).join("<br/>");
  
  showModal(`<h3>配置模拟赛（1周）</h3>
    <div><label class="block">比赛类型</label>
      <select id="mock-purchase">
        <option value="0">网赛（免费）</option>
        <option value="1">付费比赛（可选难度和tag）</option>
      </select>
    </div>
    <div id="mock-difficulty-container" style="margin-top:8px;display:none;">
      <label class="block">比赛难度</label>
      <select id="mock-difficulty">${officialContestOptions}</select>
    </div>
    <div id="mock-online-container" style="margin-top:8px;">
      <label class="block">网赛类型</label>
      <!-- 平铺网赛类型选择（保留隐藏 select 以兼容现有逻辑） -->
      <select id="mock-contest-type" style="display:none">${onlineContestOptions}</select>
      <div id="mock-contest-type-grid" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"></div>
    </div>
    <div id="mock-questions-container" style="margin-top:8px">
    </div>
    <div class="modal-actions" style="margin-top:10px">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn" id="mock-submit">开始模拟赛（1周）</button>
    </div>`);
  
  // 动态更新题目数量和标签选择
  function updateQuestions(){
    const isPurchased = $('mock-purchase').value === "1";
    
    if(isPurchased){
      // 付费比赛：显示难度选择和tag选择
      $('mock-difficulty-container').style.display = 'block';
      $('mock-online-container').style.display = 'none';
      
      const diffIdx = parseInt($('mock-difficulty').value);
      const comp = COMPETITION_SCHEDULE[diffIdx];
      const numProblems = comp.numProblems;
      
      let questionsHtml = '<div class="small">为每题选择 1 或多个 知识点 标签：</div>';
      for(let i = 1; i <= numProblems; i++){
        questionsHtml += `<div style="margin-top:6px"><strong>第 ${i} 题</strong><br/>${kpHtml}</div>`;
      }
      $('mock-questions-container').innerHTML = questionsHtml;
    } else {
      // 网赛：显示网赛类型选择，tag随机
      $('mock-difficulty-container').style.display = 'none';
      $('mock-online-container').style.display = 'block';
      
      const typeIdx = parseInt($('mock-contest-type').value);
      const contestType = ONLINE_CONTEST_TYPES[typeIdx];
      
      $('mock-questions-container').innerHTML = `<div class="small">网赛共 ${contestType.numProblems} 题</div>`;
    }
  }
  
  // 初始化题目列表
  updateQuestions();
  
  // 监听比赛类型和难度变化
  $('mock-purchase').onchange = updateQuestions;
  $('mock-difficulty').onchange = updateQuestions;
  // wire up mock-contest-type changes; the visible grid will sync to hidden select
  $('mock-contest-type').onchange = updateQuestions;

  // render tiled grid for online contest types and sync with hidden select
  function renderMockContestTypeGrid(){
    const grid = document.getElementById('mock-contest-type-grid');
    const hidden = document.getElementById('mock-contest-type');
    if(!grid || !hidden) return;
    grid.innerHTML = '';
    ONLINE_CONTEST_TYPES.forEach((t, idx) => {
      const card = document.createElement('div');
      card.className = 'option-card';
      card.dataset.val = idx;
      card.style.padding = '10px';
      card.style.border = '1px solid #e6e6e6';
      card.style.borderRadius = '8px';
      card.style.cursor = 'pointer';
      card.style.minWidth = '120px';
      card.innerHTML = `<div style="font-weight:600">${t.displayName}</div><div class="small muted">${t.numProblems}题</div>`;
      card.addEventListener('click', ()=>{
        grid.querySelectorAll('.option-card.selected').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        hidden.value = ''+idx;
        // trigger onchange handler
        try{ hidden.onchange && hidden.onchange(); }catch(e){}
      });
      grid.appendChild(card);
    });

    // initial selection
    const initial = hidden.value || '0';
    const chosen = grid.querySelector(`.option-card[data-val='${initial}']`);
    if(chosen) chosen.classList.add('selected');
  }

  try{ renderMockContestTypeGrid(); }catch(e){ console.error('渲染网赛类型网格失败', e); }
  
  $('mock-submit').onclick = ()=>{
    const isPurchased = $('mock-purchase').value === "1";
    let difficultyConfig, numProblems, questionTagsArray = [];
    
    if(isPurchased){
      // 付费比赛：使用选择的难度级别和tag
      const diffIdx = parseInt($('mock-difficulty').value);
      const comp = COMPETITION_SCHEDULE[diffIdx];
      difficultyConfig = {
        type: 'official',
        difficulty: comp.difficulty,
        name: comp.name,
        numProblems: comp.numProblems
      };
      numProblems = comp.numProblems;
      
      // 收集每题的tag
      let kpOptions = Array.from(document.querySelectorAll('.kp-option'));
      let groupSize = KP_OPTIONS.length;
      for(let q = 0; q < numProblems; q++){
        let tags = [];
        for(let k = 0; k < groupSize; k++){
          let idx = q * groupSize + k;
          if(kpOptions[idx] && kpOptions[idx].checked) tags.push(kpOptions[idx].value);
        }
        questionTagsArray.push(tags);
      }
    } else {
      // 网赛：使用选择的网赛类型，tag随机
      const typeIdx = parseInt($('mock-contest-type').value);
      const contestType = ONLINE_CONTEST_TYPES[typeIdx];
      difficultyConfig = {
        type: 'online',
        typeIdx: typeIdx,
        difficulty: contestType.difficulty,
        name: contestType.displayName,
        onlineContestType: contestType.name,
        numProblems: contestType.numProblems
      };
      numProblems = contestType.numProblems;
      
      // 为每题生成随机tag（1-2个）
      const allTags = ["数据结构", "图论", "字符串", "数学", "动态规划"];
      for(let q = 0; q < numProblems; q++){
        let tags = [];
        const numTags = 1 + Math.floor(getRandom() * 2); // 1-2个标签
        for(let j = 0; j < numTags; j++){
          const tag = allTags[Math.floor(getRandom() * allTags.length)];
          if(!tags.includes(tag)) tags.push(tag);
        }
        questionTagsArray.push(tags);
      }
    }
    
    closeModal();
    
    // 扣费
    if(isPurchased){
      let cost = uniformInt(MOCK_CONTEST_PURCHASE_MIN_COST, MOCK_CONTEST_PURCHASE_MAX_COST);
      const adj = Math.round(cost * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
      if(game.budget < adj){ alert("经费不足，无法购买题目"); return; }
      game.recordExpense(adj, '购买付费比赛题目');
      log(`购买付费比赛题目（${difficultyConfig.name}）， ¥${adj}`);
    } else {
      log(`参加网赛（${difficultyConfig.name}，免费）`);
    }
    
    // 使用新的比赛模拟系统
    if(typeof window.holdMockContestModalNew === 'function'){
      window.holdMockContestModalNew(isPurchased, difficultyConfig, questionTagsArray);
    } else {
      alert('比赛系统未加载，请刷新页面');
      return;
    }
    safeWeeklyUpdate(1);
    renderAll();
  };
}

/* 娱乐 UI */
function entertainmentUI(){
  // 水平条形卡片选项
  const opts = [
    {id:1,label:'放假',desc:'减小少许压力',cost:0},
    {id:2,label:`请学生吃饭 (¥${ENTERTAINMENT_COST_MEAL})`,desc:'补充能量,减小一定压力',cost:ENTERTAINMENT_COST_MEAL},
    {id:3,label:'体育运动',desc:`减小一定压力,注意天气影响，当前是${game.getWeatherDescription()}天`,cost:0},
    {id:5,label:`邀请学生打CS`,desc:'适度减压,有可能提升学生能力',cost:ENTERTAINMENT_COST_CS}
  ];
  let cardsHtml = opts.map(o=>`
    <div class="prov-card option-card" data-id="${o.id}" style="min-width:120px;border:1px solid #ddd;padding:8px;border-radius:6px;cursor:pointer;">
      <div class="card-title">${o.label}</div>
      <div class="card-desc small muted">${o.desc}</div>
    </div>
  `).join('');
  showModal(`<h3>娱乐活动（1周）</h3>
    <div style="display:flex;gap:12px;overflow-x:auto;">${cardsHtml}</div>
    <div class="modal-actions" style="margin-top:12px">
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
  game.recordExpense(costAdj, `娱乐活动：${opt.val}`);
    closeModal();
      // apply quick entertainment logic based on numeric id
      for(let s of game.students){
        if(!s || s.active === false) continue;
        if(opt.id === 1){ // 放假
          s.mental += uniform(3,7); var oldP = s.pressure; s.pressure = Math.max(0, s.pressure - uniform(30,45)); var newP = s.pressure;
        } else if(opt.id === 2){ // 吃饭
          s.mental += uniform(8,20); var oldP = s.pressure; s.pressure = Math.max(0, s.pressure - uniform(40,55)); var newP = s.pressure;
        } else if(opt.id === 3){ // 体育运动
          let wf=1.0; if(game.weather==='雪') wf=2.0; else if(game.weather==='雨' && game.facilities.dorm<2) wf=0.5; var oldP = s.pressure; s.pressure = Math.max(0, s.pressure - uniform(20,35)*wf); var newP = s.pressure; s.mental += uniform(3,8);
        } else if(opt.id === 5){ // 打CS
          s.mental += uniform(1,5); s.coding += uniform(0.5,1.0); var oldP = s.pressure; s.pressure = Math.max(0, s.pressure - uniform(10,20)); var newP = s.pressure;
        }
        s.mental = Math.min(100, s.mental);
        // trigger talents and allow them to modify results
        try{
          if(typeof s.triggerTalents === 'function'){
            const results = s.triggerTalents('entertainment_finished', { entertainmentId: opt.id, entertainmentName: opt.val, cost: opt.cost }) || [];
            for(const r of results){ if(!r || !r.result) continue; const out = r.result; if(typeof out === 'object'){
              if(out.action === 'quit_for_esports'){
                // ensure student inactive and log
                s.active = false; s._quit_for_esports = true;
                console.log(out.message || '学生退队去学电竞');
                // also record in game log if available
                if(typeof log === 'function') log(`${s.name} ${out.message || '退队去学电竞'}`);
                // Immediately check unified ending conditions (if no students left, trigger ending)
                try{ checkAndTriggerEnding(); }catch(e){}
              }
              if(out.action === 'vacation_half_minus5'){
                // 恢复一半的减压效果（即将部分减压抵消回去）
                const delta = (typeof oldP !== 'undefined' && typeof newP !== 'undefined') ? (oldP - newP) : 0;
                const addBack = delta * 0.5;
                s.pressure = Math.min(100, s.pressure + addBack);
                console.log(out.message || '睡觉也在想题：压力-5效果减半');
                if(typeof log === 'function') log(`${s.name} ${out.message || '睡觉也在想题：压力-5效果减半'}`);
              }
            } else if(typeof r.result === 'string'){
              // string result, log it
              if(typeof log === 'function') log(`${s.name} ${r.result}`);
            }
            }
          }
        }catch(e){ console.error('triggerTalents entertainment_finished', e); }
      }
  game.weeks_since_entertainment += 1;
  safeWeeklyUpdate(1);
    renderAll();
    log("娱乐活动完成");
    /*
    // Toast 反馈
    if (window.toastManager) {
      window.toastManager.show(`娱乐活动完成：${opt.label}`, 'success');
    }
    */
  };
}

/* 放假 UI */
function takeVacationUI(){
  showModal(`<h3>放假</h3><label class="block">放假天数 (1-${VACATION_MAX_DAYS})</label><input id="vac-days" type="number" min="1" max="${VACATION_MAX_DAYS}" value="1" />
    <div class="modal-actions" style="margin-top:8px"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn" id="vac-confirm">确认</button></div>`);
  $('vac-confirm').onclick = ()=>{
    let days = clampInt(parseInt($('vac-days').value),1,VACATION_MAX_DAYS);
    closeModal();
  let weeks = Math.ceil(days / 7);
    if(!confirm(`放假 ${days} 天，将跳过 ${weeks} 周，确认？`)) return;
    for(let s of game.students){
      if(!s || s.active === false) continue;
      s.mental = Math.min(100, s.mental + days * uniform(3,8));
      const oldP = s.pressure;
      s.pressure = Math.max(0, s.pressure - uniform(20,40) * days / 7.0);
      const newP = s.pressure;
      // trigger talents for vacation end and allow adjustments (e.g., 睡觉也在想题 半减效果)
      try{
        if(typeof s.triggerTalents === 'function'){
          const results = s.triggerTalents('vacation_end', { days: days, weeks: weeks }) || [];
          for(const r of results){ if(!r || !r.result) continue; const out = r.result; if(typeof out === 'object'){
            if(out.action === 'vacation_half_minus5'){
              const delta = (oldP - newP) || 0;
              const addBack = delta * 0.5;
              s.pressure = Math.min(100, s.pressure + addBack);
              if(typeof log === 'function') log(`${s.name} ${out.message || '睡觉也在想题：压力-5效果减半'}`);
            } else if(out.action === 'quit_for_esports'){
              s.active = false; s._quit_for_esports = true; if(typeof log === 'function' ) log(`${s.name} ${out.message || '退队去学电竞'}`);
                // Immediately check unified ending conditions
                try{ checkAndTriggerEnding(); }catch(e){}
            }
          } else if(typeof r.result === 'string'){
            if(typeof log === 'function') log(`${s.name} ${r.result}`);
          } }
        }
      }catch(e){ console.error('triggerTalents vacation_end', e); }
    }
  // 安全更新，避免放假跳过比赛
  safeWeeklyUpdate(weeks);
  renderAll();
  log(`放假 ${days} 天，跳过 ${weeks} 周`);
  };
}



// 劝退单个学生（从学生卡角落触发）
function evictSingle(idx){
  const student = game.students[idx];
  if(!student || student.active === false) return;
  // debug
  try{ if(typeof window !== 'undefined' && window.__OI_DEBUG_ENDING) console.debug('[ENDING DEBUG] evictSingle called idx=', idx, 'student=', student.name, 'preActive=', student.active); }catch(e){}
  student.active = false;
  game.reputation -= EVICT_REPUTATION_COST;
  if(game.reputation < 0) game.reputation = 0;
  log(`劝退学生 ${student.name}，声誉 -${EVICT_REPUTATION_COST}`);
  renderAll();
  // 立即检查统一结局条件（如果无学生则触发结局）
  try{ 
    if(typeof window !== 'undefined' && window.__OI_DEBUG_ENDING) console.debug('[ENDING DEBUG] after evict, calling checkAndTriggerEnding()');
    checkAndTriggerEnding();
  }catch(e){}
}

/* 升级设施 UI */
function upgradeFacilitiesUI(){
  const facs = [{id:"computer",label:"计算机"},{id:"library",label:"资料库"},{id:"ac",label:"空调"},{id:"dorm",label:"宿舍"},{id:"canteen",label:"食堂"}];
  let html = `<h3>升级设施</h3><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">`;
  for(let f of facs){
    let current = game.facilities.getCurrentLevel(f.id);
    let max = game.facilities.getMaxLevel(f.id);
    let cost = game.facilities.getUpgradeCost(f.id);
    // 显示实际扣款（按人数系数调整），同时保留基础费用信息
    const mult = (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1);
    const costAdj = Math.round(cost * mult);
    html += `<div style="padding:8px;border:1px solid #eee;border-radius:6px;">
      <div><strong>${f.label}</strong></div>
      <div class="small">等级：${current} / ${max}</div>
      <div class="small">升级费用：¥${costAdj}（ ¥${cost}， x${mult.toFixed(2)}）</div>
      <div style="margin-top:8px"><button class="btn upgrade" data-fac="${f.id}">升级</button></div>
    </div>`;
  }
  html += `</div><div class="modal-actions" style="margin-top:8px"><button class="btn btn-ghost" onclick="closeModal()">关闭</button></div>`;
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
  // 按人数系数调整为实际扣款
  const mult = (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1);
  const costAdj = Math.round(cost * mult);

  // 使用游戏内模态替代浏览器 confirm，保持样式一致并提供确认/取消按钮
  const modalHtml = `
    <h3>升级设施：${f}</h3>
    <div class="small" style="margin-top:6px">升级到 ${current+1} 级 将扣款 <strong>¥${costAdj}</strong></div>
    <div class="modal-actions" style="margin-top:8px">
      <button class="btn btn-ghost" id="upgrade-cancel">取消</button>
      <button class="btn" id="upgrade-confirm">确认升级</button>
    </div>`;

  showModal(modalHtml);

  // 绑定按钮回调
  const cancelBtn = document.getElementById('upgrade-cancel');
  const confirmBtn = document.getElementById('upgrade-confirm');
  if(cancelBtn) cancelBtn.onclick = () => { try{ closeModal(); }catch(e){} };
  if(confirmBtn) confirmBtn.onclick = () => {
    try{
      if(game.budget < costAdj){ alert("经费不足"); closeModal(); return; }
      game.recordExpense(costAdj, `设施升级：${f}`);
      game.facilities.upgrade(f);
      log(`设施升级：${f} 到等级 ${current+1}（基础 ¥${cost}，调整后 ¥${costAdj}）`);
      /*
      // Toast 反馈
      if (window.toastManager) {
        window.toastManager.show(`设施升级成功：${f} → ${current+1}级`, 'success');
      }
      */
      closeModal();
      renderAll();
    }catch(e){ console.error('upgrade confirm handler error', e); }
  };
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
function saveGame(silent = false){ 
  try{
    // 创建深拷贝，将 Set 转换为数组以便序列化
    const saveData = JSON.parse(JSON.stringify(game, (key, value) => {
      if(value instanceof Set){
        return Array.from(value);
      }
      return value;
    }));
  const savedStr = JSON.stringify(saveData);
  // Prefer sessionStorage for current-session persistence, and write localStorage as backup for older pages
  try{ sessionStorage.setItem('oi_coach_save', savedStr); }catch(e){ console.warn('sessionStorage unavailable for save', e); }
  try{ sessionStorage.setItem('oi_coach_save_diag', savedStr); }catch(e){}
  try{ localStorage.setItem('oi_coach_save', savedStr); }catch(e){}
    // 立即读取以校验写入
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
    // Prefer sessionStorage, fall back to localStorage
    let raw = null;
    try{ raw = sessionStorage.getItem('oi_coach_save'); }catch(e){ raw = null; }
    try{ if(!raw) raw = localStorage.getItem('oi_coach_save'); }catch(e){}
    if(!raw){ alert("无存档"); return; }
    let o = JSON.parse(raw); // rehydrate
    game = Object.assign(new GameState(), o);
  window.game = game; // 确保全局访问
  game.facilities = Object.assign(new Facilities(), o.facilities);
  game.students = (o.students || []).map(s => {
    const student = Object.assign(new Student(), s);
    // 恢复 talents Set（JSON 序列化会将 Set 转为数组）
    if(s.talents && Array.isArray(s.talents)){
      student.talents = new Set(s.talents);
    } else if(s.talents && typeof s.talents === 'object'){
      student.talents = new Set(Object.keys(s.talents).filter(k => s.talents[k]));
    }
    return student;
  });
  renderAll(); alert("已载入存档"); }catch(e){ alert("载入失败："+e); } }

// silent load used by index.html on startup (no alerts)
function silentLoad(){ try{ 
  // Prefer sessionStorage then localStorage
  let raw = null;
  try{ raw = sessionStorage.getItem('oi_coach_save'); }catch(e){ raw = null; }
  try{ if(!raw) raw = localStorage.getItem('oi_coach_save'); }catch(e){}
  if(!raw) return false; let o = JSON.parse(raw); game = Object.assign(new GameState(), o); window.game = game; game.facilities = Object.assign(new Facilities(), o.facilities); game.students = (o.students || []).map(s => { const student = Object.assign(new Student(), s); if(s.talents && Array.isArray(s.talents)){ student.talents = new Set(s.talents); } else if(s.talents && typeof s.talents === 'object'){ student.talents = new Set(Object.keys(s.talents).filter(k => s.talents[k])); } return student; }); return true; }catch(e){ return false; } }

/* 初始化游戏（modal） */
function initGameUI(){
  showModal(`<h3>欢迎 — OI 教练模拟器</h3>
    <label class="block">选择难度</label><select id="init-diff"><option value="1">简单</option><option value="2" selected>普通</option><option value="3">困难</option></select>
    <label class="block">选择省份</label><div id="init-prov-grid" class="prov-grid"></div>
    <label class="block">学生人数 (3-10)</label><input id="init-stu" type="number" min="3" max="10" value="5" />
  <div class="modal-actions" style="margin-top:8px"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn" id="init-start">开始</button></div>`);
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
  
  // 设置会话标记，允许进入 game.html
  // 这个标记在页面刷新或关闭后会自动清除，确保只能通过 start.html 正常进入游戏
  try {
    sessionStorage.setItem('oi_game_active_session', 'true');
  } catch(e) {
    console.error('无法设置 sessionStorage:', e);
  }
  
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
  
  console.log('renderEndSummary called');
  console.log('localStorage keys:', Object.keys(localStorage));
  console.log('oi_coach_save exists:', localStorage.getItem('oi_coach_save') !== null);
  console.log('oi_coach_ending_reason:', localStorage.getItem('oi_coach_ending_reason'));
  console.log('oi_coach_ending:', localStorage.getItem('oi_coach_ending'));
  
  // try to read saved game: prefer sessionStorage, then localStorage, then window.name, then global game
  try{
    // attempt to get a diagnostic backup from sessionStorage first
    let diag = null;
    try{ diag = sessionStorage.getItem('oi_coach_save_diag'); }catch(e){ diag = null; }
    try{ console.debug('session backup length=', diag?diag.length:0); }catch(e){}

    // Primary source: sessionStorage
    let raw = null;
    try{ raw = sessionStorage.getItem('oi_coach_save'); }catch(e){ raw = null; }

    // Fallback to localStorage if sessionStorage missing or short
    try{ if(!raw || (raw.length > 0 && raw.length < 2000)) raw = localStorage.getItem('oi_coach_save') || raw; }catch(e){ raw = raw || null; }

    // If raw is missing or unusually small, try window.name fallback
    try{
      if(!raw || (raw.length > 0 && raw.length < 2000)){
        const maybe = window.name || '';
        if(maybe){
          try{
            const parsedName = JSON.parse(maybe);
            const oldLen = raw ? raw.length : 0;
            if(parsedName && parsedName.oi_coach_save && parsedName.oi_coach_save.length > oldLen){
              // restore into sessionStorage and localStorage for compatibility
              try{ sessionStorage.setItem('oi_coach_save', parsedName.oi_coach_save); }catch(e){}
              try{ localStorage.setItem('oi_coach_save', parsedName.oi_coach_save); }catch(e){}
              if(parsedName.oi_coach_ending_reason) {
                try{ sessionStorage.setItem('oi_coach_ending_reason', parsedName.oi_coach_ending_reason); }catch(e){}
                try{ localStorage.setItem('oi_coach_ending_reason', parsedName.oi_coach_ending_reason); }catch(e){}
              }
              try{ console.info('renderEndSummary restored oi_coach_save from window.name; oldLen=' + oldLen + ', newLen=' + parsedName.oi_coach_save.length); }catch(e){}
              raw = parsedName.oi_coach_save;
            }
          }catch(e){ /* not JSON */ }
        }
      }
    }catch(e){ /* ignore */ }

    // If still no data, try diag session backup
    try{ if((!raw || raw.length < 2000) && diag && diag.length > (raw?raw.length:0)) raw = diag; }catch(e){}

    if(!raw){ 
      // 尝试从全局game对象获取数据（如果存在）
      if(typeof game !== 'undefined' && game && game.students) {
        console.log('No storage data found, using global game object');
        raw = JSON.stringify(game);
        // 临时保存到 sessionStorage/localStorage 以便下次使用
        try{ sessionStorage.setItem('oi_coach_save', raw); }catch(e){}
        try{ localStorage.setItem('oi_coach_save', raw); }catch(e){}
        try{ if(!sessionStorage.getItem('oi_coach_ending_reason')) sessionStorage.setItem('oi_coach_ending_reason','赛季结束'); }catch(e){}
        try{ if(!localStorage.getItem('oi_coach_ending_reason')) localStorage.setItem('oi_coach_ending_reason','赛季结束'); }catch(e){}
      } else {
        el.innerText = '无结算记录，无法显示结局。请确保游戏正常结束。\n\n调试信息：\n- 存储中无oi_coach_save数据\n- 全局game对象不存在或无效'; 
        return; 
      }
    }
    
    let o;
    try {
      o = JSON.parse(raw);
      console.log('Parsed game data:', o);
      // 调试: 查看careerCompetitions字段
      console.log('careerCompetitions in parsed data:', o.careerCompetitions);
      // 调试: 打印每个学生的 active 字段以排查结算界面显示问题
      try{
        if(o.students && Array.isArray(o.students)){
          for(let i=0;i<o.students.length;i++){
            try{ console.debug(`student[${i}] name=${o.students[i].name} active=${o.students[i].active} pressure=${o.students[i].pressure}`); }catch(e){}
          }
        }
      }catch(e){ console.error('Debug student active check failed', e); }
    } catch(parseError) {
      console.error('Failed to parse saved game data:', parseError);
      el.innerText = '结算数据格式错误，无法显示结局。';
      return;
    }
    
  // 基本信息
  // treat student as active unless explicitly set to false
  let active = (o.students || []).filter(s => s && s.active !== false).length;
    let initial = o.initial_students || (o.students? o.students.length : 0);
    let rep = o.reputation || 0;
    let budget = o.budget || 0;
    let totalExpenses = o.totalExpenses || 0;
    let week = o.week || 0;
    
    // 计算平均压力
    let avgP = 0; 
    if(o.students && o.students.length>0){ 
      avgP = Math.round(o.students.filter(s => s && s.active !== false).reduce((a,s)=>a+(s.pressure||0),0) / Math.max(1, active)); 
    }
    
  // 获取结局原因 - 优先 sessionStorage，再 localStorage，再存档内字段
  let rawEnding = '';
  try{ rawEnding = sessionStorage.getItem('oi_coach_ending_reason') || sessionStorage.getItem('oi_coach_ending') || ''; }catch(e){ rawEnding = ''; }
  try{ if(!rawEnding || rawEnding.length===0) rawEnding = localStorage.getItem('oi_coach_ending_reason') || localStorage.getItem('oi_coach_ending') || ''; }catch(e){}
  let endingReason = normalizeEndingReason(rawEnding || (o.endingReason || o.oi_coach_ending_reason || '赛季结束'));
    
    console.log('Game data loaded:', {
      students: o.students ? o.students.length : 0,
      active,
      budget,
      totalExpenses,
      week,
      endingReason
    });
    // 调试: 在渲染比赛生涯前打印career变量
    console.log('About to build career display, careerCompetitions array:', o.careerCompetitions);
    
    // 构建学生详细信息（卡片风格，与 game.html 中 student-box 保持一致）
    let studentsHtml = '';
    if(o.students && o.students.length > 0) {
      studentsHtml += `<div style="margin-top:12px"><h4>👥 学生详细信息</h4></div>`;
      studentsHtml += `<div style="max-height:260px;overflow:auto;border:1px solid #ddd;border-radius:4px;padding:8px;background:#fafafa">`;
      // 使用类似游戏内的 student-box 布局
      for(let s of o.students) {
        // 兼容旧存档：将未明确标记为 false 的视为在队
        const isActive = (s && s.active !== false);
        const pressureLevel = (s && typeof s.pressure === 'number') ? (s.pressure < 35 ? '低' : s.pressure < 65 ? '中' : '高') : '—';
        const pressureClass = (s && typeof s.pressure === 'number') ? (s.pressure < 35 ? 'pressure-low' : s.pressure < 65 ? 'pressure-mid' : 'pressure-high') : '';
        const thinkingVal = Number(s.thinking || 0);
        const codingVal = Number(s.coding || 0);
        const mentalVal = Number(s.mental || 0);
        const thinkGrade = getLetterGradeAbility(Math.floor(thinkingVal));
        const codeGrade = getLetterGradeAbility(Math.floor(codingVal));
        const mentalRounded = Math.round(mentalVal || 0);
        // 计算知识各维度字母等级
        const k_ds = getLetterGrade(Math.floor(Number(s.knowledge_ds || 0)));
        const k_graph = getLetterGrade(Math.floor(Number(s.knowledge_graph || 0)));
        const k_str = getLetterGrade(Math.floor(Number(s.knowledge_string || 0)));
        const k_math = getLetterGrade(Math.floor(Number(s.knowledge_math || 0)));
        const k_dp = getLetterGrade(Math.floor(Number(s.knowledge_dp || 0)));
        // 天赋显示（如果有 TalentManager 可用则显示说明 tooltip）
        let talentsHtml = '';
        try{
          if(s.talents && (s.talents instanceof Array || s.talents instanceof Set)){
            const talentArray = Array.from(s.talents);
            talentsHtml = talentArray.map(tn => {
              const info = (window.TalentManager && typeof window.TalentManager.getTalentInfo === 'function') ? window.TalentManager.getTalentInfo(tn) : { name: tn, description: '', color: '#2b6cb0' };
              return `<span class="talent-tag" data-talent="${tn}" style="background-color:${info.color}20;color:${info.color};border-color:${info.color}40;margin-right:6px;">${tn}<span class="talent-tooltip">${info.description||''}</span></span>`;
            }).join('');
          }
        }catch(e){ talentsHtml = '';} 

        studentsHtml += `<div class="student-box" style="margin-bottom:8px;padding:8px;background:white;border-radius:6px;border:1px solid #eee">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><strong>${s.name}</strong> ${isActive? '': '<span class="warn">[退队]</span>'} <span class="label-pill ${pressureClass}" style="margin-left:8px">压力:${pressureLevel}</span></div>
            <div style="font-size:12px;color:#666">心理:${mentalRounded}</div>
          </div>
          <div class="compact small" style="margin-top:6px">
            能力: 思维:${thinkGrade} 编码:${codeGrade}
            <div style="margin-top:6px">知识: <span class="knowledge-badges">
              <span class="kb" title="数据结构: ${Math.floor(Number(s.knowledge_ds||0))}">数据结构${k_ds}</span>
              <span class="kb" title="图论: ${Math.floor(Number(s.knowledge_graph||0))}">图论${k_graph}</span>
              <span class="kb" title="字符串: ${Math.floor(Number(s.knowledge_string||0))}">字符串${k_str}</span>
              <span class="kb" title="数学: ${Math.floor(Number(s.knowledge_math||0))}">数学${k_math}</span>
              <span class="kb" title="动态规划: ${Math.floor(Number(s.knowledge_dp||0))}">动态规划${k_dp}</span>
            </span></div>
          </div>
          ${talentsHtml ? `<div class="student-talents" style="margin-top:8px">${talentsHtml}</div>` : ''}
        </div>`;
      }
      studentsHtml += `</div>`;
    }
    
    // 构建比赛生涯记录
    let careerHtml = '';
    // 默认从主存档中读取careerCompetitions
    let career = (o.careerCompetitions && Array.isArray(o.careerCompetitions) && o.careerCompetitions.length)
                 ? o.careerCompetitions
                 : null;
    // 若主存档中无数据，尝试从单独存储的localStorage键读取
    const separateRaw = localStorage.getItem('oi_coach_careerCompetitions');
    if((!career || career.length === 0) && separateRaw){
      try {
        const arr = JSON.parse(separateRaw);
        if(Array.isArray(arr) && arr.length > 0){
          career = arr;
          console.log('Using separate careerCompetitions from LS:', career);
        }
      } catch(e) {
        console.error('Failed to parse separate careerCompetitions from LS:', e);
      }
    }
  if(career && career.length > 0){
      careerHtml += `<div style="margin-top:12px"><h4>📊 比赛生涯记录</h4></div>`;
      careerHtml += `<div style="margin-top:8px;max-height:300px;overflow:auto;border:1px solid #ddd;border-radius:4px;padding:8px;background:#fafafa">`;
      
      for(let rec of career){
        const passedCount = rec.passedCount || 0;
        const totalStudents = rec.totalStudents || 0;
        const passRate = totalStudents > 0 ? ((passedCount / totalStudents) * 100).toFixed(0) : '0';
        
        careerHtml += `<div style="margin-bottom:12px;padding:8px;background:white;border-radius:4px;border-left:3px solid #4a90e2">`;
        careerHtml += `<div style="font-weight:bold;margin-bottom:4px">第 ${rec.week} 周 - ${rec.name}</div>`;
        careerHtml += `<div style="font-size:13px;color:#666;margin-bottom:6px">晋级：${passedCount}/${totalStudents} 人 (${passRate}%)</div>`;
        
        if(rec.entries && rec.entries.length > 0){
          careerHtml += `<table style="width:100%;font-size:12px;border-collapse:collapse">`;
          careerHtml += `<thead><tr style="background:#f0f0f0">
            <th style="padding:4px;text-align:left">学生</th>
            <th style="padding:4px;text-align:center">排名</th>
            <th style="padding:4px;text-align:center">分数</th>
            <th style="padding:4px;text-align:left">结果</th>
          </tr></thead><tbody>`;
          
          for(let e of rec.entries){
            const rankText = e.rank ? `#${e.rank}` : (e.eligible === false ? '-' : '—');
            const scoreText = (e.total != null && e.total !== undefined) ? e.total.toFixed ? e.total.toFixed(1) : e.total : 
                             (e.score != null && e.score !== undefined) ? e.score.toFixed ? e.score.toFixed(1) : e.score : '—';
            const passedIcon = e.passed ? '✓' : (e.eligible === false ? '' : '✗');
            const passedStyle = e.passed ? 'color:green;font-weight:bold' : (e.eligible === false ? 'color:#999' : 'color:#d32f2f');
            let remarkText = e.remark || '';
            if(!remarkText){
              if(e.eligible === false) remarkText = '未参加';
              else if(e.passed) remarkText = '晋级';
              else if(e.medal) remarkText = e.medal === 'gold' ? '金牌' : e.medal === 'silver' ? '银牌' : e.medal === 'bronze' ? '铜牌' : '';
            }
            
            careerHtml += `<tr style="border-bottom:1px solid #eee">`;
            careerHtml += `<td style="padding:4px">${e.name}</td>`;
            careerHtml += `<td style="padding:4px;text-align:center">${rankText}</td>`;
            careerHtml += `<td style="padding:4px;text-align:center">${scoreText}</td>`;
            careerHtml += `<td style="padding:4px;${passedStyle}">${passedIcon} ${remarkText}</td>`;
            careerHtml += `</tr>`;
          }
          
          careerHtml += `</tbody></table>`;
        }
        careerHtml += `</div>`;
      }
      
      careerHtml += `</div>`;
    } else {
      careerHtml += `<div class="small muted" style="margin-top:8px">未记录到比赛生涯数据</div>`;
    }

    // 构建时间轴进度条
    let timelineHtml = '';
    if (week > 0) {
      timelineHtml += `<div style="margin-top:12px"><h4>📅 时间轴进度</h4></div>`;
      timelineHtml += `<div style="margin-top:8px;padding:12px;background:#f9f9f9;border-radius:8px">`;
      
      // 构建比赛数据：优先使用全局已缩放的 window.competitions（由 models.js 生成），
      // 否则回退到内置默认赛程（向后兼容）。使用全局数据可保证周数与游戏实际赛季长度一致，
      // 避免因手动硬编码而导致的“周数缩放”显示错误（显示为实际周数/2 等问题）。
      const competitions = (typeof window !== 'undefined' && Array.isArray(window.competitions) && window.competitions.length > 0)
        ? window.competitions.slice().sort((a, b) => a.week - b.week)
        : [
          { name: 'CSP-S1', week: 6 },
          { name: 'CSP-S2', week: 10 },
          { name: 'NOIP', week: 14 },
          { name: '省选', week: 18 },
          { name: 'NOI', week: 22 },
          { name: 'CSP-S1', week: 26 },
          { name: 'CSP-S2', week: 30 },
          { name: 'NOIP', week: 34 },
          { name: '省选', week: 38 },
          { name: 'NOI', week: 42 }
        ];

      // 计算实际最大周数：取当前周数和最后一个比赛周数中的较大值，至少为40
      const lastCompWeek = competitions.length ? Math.max(...competitions.map(c => Number(c.week) || 0)) : 0;
      const maxWeeks = Math.max(week, lastCompWeek, typeof SEASON_WEEKS !== 'undefined' ? SEASON_WEEKS : 40);
      
      // 计算进度百分比（基于动态的maxWeeks）
      const progressPercent = Math.min(100, (week / maxWeeks) * 100);
      
      // 进度条
      timelineHtml += `<div style="position:relative;height:20px;background:#e0e0e0;border-radius:10px;margin-bottom:12px">`;
      timelineHtml += `<div style="height:100%;background:linear-gradient(90deg, #4caf50, #2196f3);border-radius:10px;width:${progressPercent}%" title="进度：第${week}周"></div>`;
      timelineHtml += `<div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);color:white;font-size:12px;font-weight:bold">第 ${week} 周</div>`;
      timelineHtml += `</div>`;
      
      // 比赛大头针
      timelineHtml += `<div style="position:relative;height:30px">`;
      
      for (let comp of competitions) {
        const position = (comp.week / maxWeeks) * 100;
        const isPast = comp.week <= week;
        const pinColor = isPast ? '#4caf50' : '#ffc107';
        const pinIcon = isPast ? '✓' : '📍';
        
        timelineHtml += `<div style="position:absolute;left:${position}%;transform:translateX(-50%);top:0">`;
        timelineHtml += `<div style="width:20px;height:20px;background:${pinColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="${comp.name} - 第${comp.week}周">`;
        timelineHtml += `${pinIcon}`;
        timelineHtml += `</div>`;
        timelineHtml += `<div style="position:absolute;top:22px;left:50%;transform:translateX(-50%);font-size:10px;white-space:nowrap;color:#666">${comp.name}</div>`;
        timelineHtml += `</div>`;
      }
      
      timelineHtml += `</div>`;
      timelineHtml += `</div>`;
    }
    
    // 构建完整的结算信息
    el.innerHTML = `
      ${o.isDailyChallenge ? `<div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:12px 16px;border-radius:8px;margin-bottom:16px;text-align:center;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        <div style="font-size:16px;font-weight:bold;margin-bottom:4px">📅 今日挑战</div>
        <div style="font-size:13px;opacity:0.9">${o.dailyChallengeDate || '日期未知'} · 种子: ${o.dailyChallengeSeed || 'N/A'}</div>
      </div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <h4>📈 基本信息</h4>
          <div style="background:#f9f9f9;padding:12px;border-radius:8px">
            <div>初始人数: <strong>${initial}</strong></div>
            <div>当前在队: <strong>${active}</strong></div>
            <div>平均压力: <strong>${avgP}</strong></div>
            <div>声誉: <strong>${rep}</strong></div>
            <div>进行到第: <strong>${week}</strong> 周</div>
          </div>
        </div>
        <div>
          <h4>💰 财务状况</h4>
          <div style="background:#f9f9f9;padding:12px;border-radius:8px">
            <div>当前金额: <strong>¥${budget.toLocaleString()}</strong></div>
            <div>累计消费: <strong>¥${totalExpenses.toLocaleString()}</strong></div>
            <div>结束原因: <strong>${endingReason}</strong></div>
          </div>
        </div>
      </div>
      ${timelineHtml}
      ${studentsHtml}
      ${careerHtml}
      <div id="ending-result" style="margin-top:16px;padding:16px;background:#e3f2fd;border-radius:8px;text-align:center">
        <div style="font-size:18px;font-weight:bold;margin-bottom:8px">最终结局</div>
        <div id="ending-text" class="ending-highlight" style="font-size:24px;font-weight:bold">
          正在计算结局...
        </div>
      </div>
    `;
    
    // 计算并显示最终结局（使用新的结局判定逻辑）
    setTimeout(() => {
      const finalEnding = calculateFinalEnding(o, endingReason);
      const endingEl = document.getElementById('ending-text');
      const container = document.getElementById('ending-result');
      const descText = mapEndingToDescription(finalEnding);
      if(endingEl) {
        endingEl.textContent = finalEnding;
        endingEl.classList.add('ending-animate');
        setTimeout(() => endingEl.classList.remove('ending-animate'), 2500);
      }
      if(container) {
        let descEl = document.getElementById('ending-desc');
        if(!descEl){
          descEl = document.createElement('div');
          descEl.id = 'ending-desc';
          descEl.style.marginTop = '8px';
          descEl.style.color = '#0d47a1';
          descEl.style.fontSize = '14px';
          descEl.style.lineHeight = '1.4';
          descEl.className = 'small muted';
          container.appendChild(descEl);
        }
        descEl.textContent = descText;
      }
    }, 500);
    
  }catch(e){ 
    el.innerText = '读取结算数据失败：' + e.message; 
    console.error('renderEndSummary error:', e);
  }
}

/* 计算最终结局 */
function calculateFinalEnding(gameData, endingReason) {
  try {
    // 检查学生数量（兼容旧存档：未设置 active 则视为在队）
    const activeStudents = (gameData.students || []).filter(s => s && s.active !== false).length;
    
    // 规范化输入的 endingReason 以避免多写法问题
    const norm = normalizeEndingReason(endingReason);
    
    // 优先级1：检查特殊结局（AKIOI、顶尖结局）
    if(norm === 'AKIOI'){
      return "👑 AKIOI";
    }
    
    if(norm === '顶尖结局'){
      return "🌟 顶尖结局";
    }
    
    // 优先级2：检查是否进入国家集训队（保底荣耀结局）
    if (gameData.inNationalTeam === true) {
      return "🌟 荣耀结局";
    }
    
    // 优先级3：检查经费（优先级高于其他普通结局）
    if (gameData.budget < 5000) {
      return "💸 经费耗尽结局";
    }
    
    // 优先级4：检查是否有NOI金牌（荣耀结局）
    let hasNoiGold = false;
    if (gameData.careerCompetitions && Array.isArray(gameData.careerCompetitions)) {
      for (let comp of gameData.careerCompetitions) {
        if (comp.name === 'NOI' && comp.entries && Array.isArray(comp.entries)) {
          for (let entry of comp.entries) {
            if (entry.medal === 'gold') {
              hasNoiGold = true;
              break;
            }
          }
        }
        if (hasNoiGold) break;
      }
    }
    
    if (hasNoiGold) {
      return "🌟 荣耀结局";
    }
    
    // 优先级5：基于结束原因判定（使用规范化值）
    switch (norm) {
      case '经费不足':
        return "💸 经费耗尽结局";
      case '无学生':
        return "😵 崩溃结局";
      case '晋级链断裂':
        return "💼 普通结局";
      case '赛季结束':
      default:
        return "💼 普通结局";
    }
  } catch (e) {
    console.error('calculateFinalEnding error:', e);
    return "❓ 未知结局";
  }
}

// 根据结局标题返回约50字的短描述
function mapEndingToDescription(endingTitle){
  const map = {
    '💸 经费耗尽结局': '项目经费枯竭，无法继续运作。研究与招生被迫停摆，学校的信息学团队被迫解散，曾经的努力戛然而止。',
    '🌟 荣耀结局': '队伍取得辉煌胜利，获得NOI金牌或进入国家集训队，你也因此成为金牌教练，学校声誉大增，学生与导师名声大振，未来发展与资源扶持接踵而至。',
    '🌟 顶尖结局': '学生在IOI国际赛场上获得奖牌，为国争光！这是信息学竞赛的最高荣誉，你培养出了世界级选手，成为传奇教练。',
    '👑 AKIOI': '不可思议！学生在IOI上取得满分，这是人类智慧的巅峰表现！你的名字将永远铭刻在信息学竞赛的历史上，成为最伟大的教练之一。',
    '😵 崩溃结局': '管理失误，团队陷入混乱，学生因为高压管理训练接连AFO，与赛事缺乏支撑，最终不得不终止项目。',
    '💼 普通结局': '项目平稳结束，虽无惊艳成就但积累了经验，信息学团队平稳地继续发展。',
    '❓ 未知结局': '结局信息不完整或读取异常，无法判定具体结果。请检查存档或重放以获得正确结算。'
  };
  return map[endingTitle] || '这是一个结局的简短描述，概述项目在赛季结束时的主要走向与影响。';
}

/* initGame 逻辑（与 C++ 一致） */
function initGame(difficulty, province_choice, student_count){
  game = new GameState();
  window.game = game; // 确保全局访问
  game.difficulty = clampInt(difficulty,1,3);
  let prov = PROVINCES[province_choice] || PROVINCES[1];
  // store province id and climate reference for weather system
  game.province_id = province_choice;
  game.province_name = prov.name; game.province_type = prov.type; game.is_north = prov.isNorth; game.budget = prov.baseBudget; game.base_comfort = prov.isNorth?BASE_COMFORT_NORTH:BASE_COMFORT_SOUTH;
  // attach climate object (if present) to game for models to use
  try{ game.province_climate = prov.climate || null; }catch(e){ game.province_climate = null; }
  if(game.difficulty===1){ game.budget = Math.floor(game.budget * EASY_MODE_BUDGET_MULTIPLIER); }
  else if(game.difficulty===3){ game.budget = Math.floor(game.budget * HARD_MODE_BUDGET_MULTIPLIER); }
  
  // 检查是否有对点招生的学生
  let recruitedStudents = [];
  try {
    const recruitedData = sessionStorage.getItem('oi_recruited_students');
    if(recruitedData){
      recruitedStudents = JSON.parse(recruitedData);
      sessionStorage.removeItem('oi_recruited_students'); // 清除数据
    }
  } catch(e) {
    console.error('Failed to load recruited students:', e);
  }
  
  // 从初始金钱中扣除招生费用
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
  
  // 先添加对点招生的学生
  for(let recruited of recruitedStudents){
    const newStud = new Student(recruited.name, recruited.thinking, recruited.coding, recruited.mental);
    
    // 应用学前培养的天赋
    if(recruited.talents && recruited.talents.size > 0){
      for(let talentName of recruited.talents){
        newStud.addTalent(talentName);
      }
    } else {
      // 如果对点招生学生没有显式天赋，分配一个初始天赋（按天赋概率权重选择）
      try{ if(window.TalentManager && typeof window.TalentManager.assignInitialTalent === 'function') window.TalentManager.assignInitialTalent(newStud); }catch(e){}
    }
    
    game.students.push(newStud);
    log(`对点招生：${recruited.name} 加入队伍`);
  }
  
  // 然后添加普通学生
  for(let i=0;i<student_count;i++){
    let name = generateName();
    // 使用高方差正态分布生成初始资质，保持平均数但增大方差
    let mean = (min_val + max_val) / 2;
    let stddev = (max_val - min_val);
    let thinking = clamp(normal(mean, stddev), 0, 100);
    let coding = clamp(normal(mean, stddev), 0, 100);
    let mental = clamp(normal(mean, stddev), 0, 100);
    const newStud = new Student(name, thinking, coding, mental);
    // 初始学生强制分配一个天赋（按各天赋的 prob 权重随机），以满足“初始学生100%附带随机一个天赋”的需求
    try{ if(window.TalentManager && typeof window.TalentManager.assignInitialTalent === 'function') window.TalentManager.assignInitialTalent(newStud); }catch(e){}
    game.students.push(newStud);
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
  
  // 注册默认特质到特质管理器（如果可用）
  if(window.TalentManager && typeof window.TalentManager.registerDefaultTalents === 'function'){
    try{
      window.TalentManager.registerDefaultTalents(game, { uniform, uniformInt, normal, clamp });
    }catch(e){ console.error('registerDefaultTalents failed', e); }
  }
  
  // If we're on game.html (has action cards), load saved game silently and bind UI. Otherwise (start/end pages) skip game bindings.
  if(document.getElementById('action-train')){
    // If game.html was opened with new-game params, initialize from them
    const qs = (function(){ try{ return new URLSearchParams(window.location.search); }catch(e){ return null; } })();
    if(qs && qs.get('new') === '1'){
      const diff = clampInt(parseInt(qs.get('d')||2),1,3);
      const prov = clampInt(parseInt(qs.get('p')||1),1,Object.keys(PROVINCES).length);
      const count = clampInt(parseInt(qs.get('c')||5),3,10);
      
      // 检查是否是今日挑战模式
      const isDaily = qs.get('daily') === '1';
      const seed = qs.get('seed') ? parseInt(qs.get('seed')) : null;
      
      if(isDaily && seed !== null){
        // 今日挑战模式：设置固定种子
        if(typeof setRandomSeed === 'function'){
          setRandomSeed(seed);
          console.log(`[今日挑战] 种子已设置: ${seed}`);
        } else {
          console.warn('[今日挑战] setRandomSeed 函数未定义，种子设置失败');
        }
        // 保存今日挑战标记到游戏状态
        initGame(diff, prov, count);
        game.isDailyChallenge = true;
        game.dailyChallengeSeed = seed;
        try{
          const dailyDate = sessionStorage.getItem('oi_daily_challenge_date');
          if(dailyDate) game.dailyChallengeDate = dailyDate;
        }catch(e){}
        console.log(`[今日挑战] 游戏初始化完成，省份: ${prov}, 种子: ${seed}`);
      } else {
        // 普通模式：不设置种子，使用默认随机
        if(typeof setRandomSeed === 'function'){
          setRandomSeed(null);
        }
        initGame(diff, prov, count);
      }
      
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
      <label class="block">选择学生（点击卡片选择参加）</label>
      <div id="out-student-grid" class="student-grid" style="max-height:180px;overflow:auto;border:1px solid #eee;padding:6px;margin-bottom:8px"></div>
      
      <!-- 天赋激发面板（默认折叠） -->
      <div class="talent-inspire-panel collapsible collapsed" style="margin-top:12px;margin-bottom:12px;padding:10px;border:1px solid #e2e8f0;border-radius:6px;background:#f7fafc">
        <h4 class="collapsible-head" style="margin:0;cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between">
          <span>✨ 天赋激发</span>
          <span class="collapse-arrow" style="font-size:12px;transition:transform 0.2s">▼</span>
        </h4>
        <div class="collapsible-content" style="margin-top:8px">
          <div class="small muted" style="margin-bottom:8px">每选择一个激发天赋消耗 ¥12,000，参加集训的学生有 30% 概率获得该天赋</div>
          <div id="out-talent-grid" class="talent-grid" style="max-height:200px;overflow:auto"></div>
        </div>
      </div>
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div>预计费用: <strong id="out-cost-preview">¥0</strong> <span id="out-talent-cost-text" style="font-size:12px;color:#666"></span></div>
        <div style="font-size:12px;color:#666">费用与人数和声誉有关</div>
      </div>
      <div class="modal-actions" style="margin-top:8px">
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
    
    // 渲染天赋激发网格
    const outTalentGrid = document.getElementById('out-talent-grid');
    if(outTalentGrid && window.TalentManager){
      const allTalents = window.TalentManager.getRegistered() || [];
      allTalents.forEach(talentName => {
        const info = window.TalentManager.getTalentInfo(talentName) || { name: talentName, description: '', color: '#2b6cb0' };
        const card = document.createElement('div');
        card.className = 'talent-card';
        card.dataset.talent = talentName;
        card.dataset.selected = '0';
        card.style.cssText = 'cursor:pointer;opacity:0.5;transition:opacity 0.2s';
        
        const top = document.createElement('div');
        const dot = document.createElement('span');
        dot.className = 'color-dot';
        dot.style.background = info.color || '#2b6cb0';
        const title = document.createElement('span');
        title.className = 'title';
        title.textContent = talentName;
        top.appendChild(dot);
        top.appendChild(title);
        
        const desc = document.createElement('div');
        desc.className = 'desc';
        desc.textContent = info.description || '';
        
        card.appendChild(top);
        card.appendChild(desc);
        
        card.onclick = () => {
          if(card.dataset.selected === '1'){
            card.dataset.selected = '0';
            card.style.opacity = '0.5';
          } else {
            card.dataset.selected = '1';
            card.style.opacity = '1.0';
          }
          updateOutingCostPreview();
        };
        
        outTalentGrid.appendChild(card);
      });
    }
    
    // 添加折叠面板功能
    const talentInspirePanel = document.querySelector('.talent-inspire-panel');
    if(talentInspirePanel){
      const head = talentInspirePanel.querySelector('.collapsible-head');
      const arrow = head.querySelector('.collapse-arrow');
      head.onclick = () => {
        talentInspirePanel.classList.toggle('collapsed');
        if(talentInspirePanel.classList.contains('collapsed')){
          arrow.style.transform = 'rotate(0deg)';
        } else {
          arrow.style.transform = 'rotate(180deg)';
        }
      };
    }
    
    // render student selection cards
    const outStudentGrid = document.getElementById('out-student-grid');
    const activeStudents = game.students.filter(s=>s && s.active);
    activeStudents.forEach(s => {
      const card = document.createElement('div');
      card.className = 'student-card';
      card.style.cssText = 'display:inline-block;padding:6px;margin:4px;border:1px solid #ddd;border-radius:6px;cursor:pointer;min-width:120px;text-align:left;font-size:13px;opacity:0.45';
      card.dataset.name = s.name;
      card.dataset.selected = '0'; // default NOT selected
      // Use the same badge/grade display as the main game UI to ensure consistency
      let talentsHtml = '';
      if(s.talents && s.talents.size > 0){
        const talentArray = Array.from(s.talents);
        talentsHtml = talentArray.map(talentName => {
          const talentInfo = window.TalentManager ? window.TalentManager.getTalentInfo(talentName) : { name: talentName, description: '暂无描述', color: '#2b6cb0' };
          return `<span class="talent-tag" data-talent="${talentName}" style="background-color: ${talentInfo.color}20; color: ${talentInfo.color}; border-color: ${talentInfo.color}40;">
          ${talentName}
          <span class="talent-tooltip">${talentInfo.description}</span>
        </span>`;
        }).join('');
      }
      card.innerHTML = `<strong style="display:block">${s.name}</strong>
        <div style="color:#666;margin-top:4px">
          <span style="font-size:12px;color:#718096;font-weight:600;">知识</span>
          <div class="knowledge-badges">
            <span class="kb" title="数据结构: ${Math.floor(Number(s.knowledge_ds||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_ds||0)))}">
              DS ${getLetterGradeAbility(Math.floor(Number(s.knowledge_ds||0)))}
            </span>
            <span class="kb" title="图论: ${Math.floor(Number(s.knowledge_graph||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_graph||0)))}">
              图论 ${getLetterGradeAbility(Math.floor(Number(s.knowledge_graph||0)))}
            </span>
            <span class="kb" title="字符串: ${Math.floor(Number(s.knowledge_string||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_string||0)))}">
              字符串${getLetterGradeAbility(Math.floor(Number(s.knowledge_string||0)))}
            </span>
            <span class="kb" title="数学: ${Math.floor(Number(s.knowledge_math||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_math||0)))}">
              数学 ${getLetterGradeAbility(Math.floor(Number(s.knowledge_math||0)))}
            </span>
            <span class="kb" title="动态规划: ${Math.floor(Number(s.knowledge_dp||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.knowledge_dp||0)))}">
              DP ${getLetterGradeAbility(Math.floor(Number(s.knowledge_dp||0)))}
            </span>
            <!-- ability badges (keep same visual style) -->
            <span class="kb ability" title="思维: ${Math.floor(Number(s.thinking||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.thinking||0)))}">思维${getLetterGradeAbility(Math.floor(Number(s.thinking||0)))}</span>
            <span class="kb ability" title="代码: ${Math.floor(Number(s.coding||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.coding||0)))}">代码${getLetterGradeAbility(Math.floor(Number(s.coding||0)))}</span>
          </div>
        </div>
        ${talentsHtml ? `<div style="display:flex;align-items:center;gap:6px;margin-top:6px;"><span style="font-size:12px;color:#718096;font-weight:600;">天赋</span><div class="student-talents">${talentsHtml}</div></div>` : ''}
      `;
      card.onclick = () => {
        if(card.dataset.selected === '1'){ card.dataset.selected = '0'; card.style.opacity = '0.45'; }
        else { card.dataset.selected = '1'; card.style.opacity = '1.0'; }
        updateOutingCostPreview();
      };
      outStudentGrid.appendChild(card);
    });
    // initial cost preview
    function updateOutingCostPreview(){
      const selectedCount = Array.from(document.querySelectorAll('#out-student-grid .student-card')).filter(c=>c.dataset.selected==='1').length || 0;
      const d = parseInt($('out-diff').value);
      const p = parseInt(document.querySelector('#out-prov-grid .prov-btn.selected').dataset.val);
      const baseCost = computeOutingCostQuadratic(d, p, selectedCount);
      
      // 计算天赋激发费用
      const selectedTalents = Array.from(document.querySelectorAll('#out-talent-grid .talent-card')).filter(c=>c.dataset.selected==='1').length || 0;
      const talentCost = selectedTalents * 12000;
      const totalCost = baseCost + talentCost;
      
      document.getElementById('out-cost-preview').textContent = `¥${totalCost}`;
      const talentCostText = document.getElementById('out-talent-cost-text');
      if(talentCostText){
        if(selectedTalents > 0){
          talentCostText.textContent = `(含天赋激发 ¥${talentCost})`;
        } else {
          talentCostText.textContent = '';
        }
      }
    }
    // bind diff/prov change to update preview
    document.getElementById('out-diff').onchange = updateOutingCostPreview;
    // when province selected, update preview as well via prov btn onclick added earlier
    Array.from(document.querySelectorAll('#out-prov-grid .prov-btn')).forEach(b => { b.onclick = (ev) => { document.querySelectorAll('#out-prov-grid .prov-btn').forEach(bb => bb.classList.remove('selected')); b.classList.add('selected'); updateOutingCostPreview(); }; });
    updateOutingCostPreview();
    $('out-go').onclick = () => {
      const d = parseInt($('out-diff').value);
      const p = parseInt(document.querySelector('#out-prov-grid .prov-btn.selected').dataset.val);
      // collect selected students
      const selectedNames = Array.from(document.querySelectorAll('#out-student-grid .student-card')).filter(c=>c.dataset.selected==='1').map(c=>c.dataset.name);
      if(!selectedNames || selectedNames.length === 0){ alert('请至少选择一名学生参加集训！'); return; }
      
      // collect selected inspire talents
      const selectedTalents = Array.from(document.querySelectorAll('#out-talent-grid .talent-card')).filter(c=>c.dataset.selected==='1').map(c=>c.dataset.talent);
      
      closeModal();
      outingTrainingWithSelection(d, p, selectedNames, selectedTalents);
      // 安全更新，避免外出集训跳过比赛
      safeWeeklyUpdate(1);
      renderAll();
    };
  };
    // 移除保存/载入按钮绑定（按钮已从HTML中删除）
    // document.getElementById('action-save').onclick = ...
    
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
    
    // 启动新手引导（仅在新游戏时）
    if (qs && qs.get('new') === '1' && window.tutorialManager) {
      setTimeout(() => {
        window.tutorialManager.start();
      }, 500);
    }
  } else {
    // not index page: do nothing. start.html will call renderStartPageUI; end.html will call renderEndSummary.
  }
};
/* ==================== 调试函数 ==================== */

/**
 * 调试函数：生成超强学生并跳转到第二年NOI
 * 使用方法：在浏览器控制台中输入 debugzak() 即可
 */
function debugzak() {
  if(typeof game === 'undefined' || !game) {
    console.error('游戏未初始化，请先开始游戏');
    alert('请先开始游戏再使用调试功能');
    return;
  }
  
  console.log('🔧 [调试] 开始生成超强学生并跳转到NOI...');
  
  // 1. 清空当前学生
  game.students = [];
  
  // 2. 创建超强学生
  const superStudent = new Student('zak', 500, 500, 500);
  // 设置所有知识点为500
  superStudent.knowledge_ds = 500;
  superStudent.knowledge_graph = 500;
  superStudent.knowledge_string = 500;
  superStudent.knowledge_math = 500;
  superStudent.knowledge_dp = 500;
  // 设置其他属性
  superStudent.pressure = 0; // 无压力
  superStudent.comfort = 100; // 最高舒适度
  superStudent.sick_weeks = 0; // 不生病
  superStudent.active = true; // 激活状态
  
  game.students.push(superStudent);
  console.log('✅ [调试] 已创建超强学生：', superStudent.name);
  
  // 3. 设置充足经费
  game.budget = 1000000;
  console.log('✅ [调试] 已设置经费：¥1,000,000');
  
  // 4. 跳转到第二年NOI前（假设SEASON_WEEKS=28，第二年NOI在第14周）
  // 先找到第二年NOI的周数
  const secondYearNOI = competitions.find(c => c.name === 'NOI' && c.week > WEEKS_PER_HALF);
  const targetWeek = secondYearNOI ? secondYearNOI.week - 1 : 27; // NOI前一周
  
  if(game.week < targetWeek) {
    const weeksToJump = targetWeek - game.week;
    console.log(`⏭️ [调试] 从第${game.week}周跳转到第${targetWeek}周（跳过${weeksToJump}周）...`);
    game.week = targetWeek;
  }
  
  // 5. 授予所有比赛的晋级资格（第二赛季）
  const halfIndex = 1; // 第二赛季
  if(!game.qualification[halfIndex]) {
    game.qualification[halfIndex] = {};
  }
  
  // 授予所有比赛的晋级资格
  for(let compName of COMPETITION_ORDER) {
    if(!game.qualification[halfIndex][compName]) {
      game.qualification[halfIndex][compName] = new Set();
    }
    game.qualification[halfIndex][compName].add(superStudent.name);
  }
  console.log('✅ [调试] 已授予所有比赛晋级资格');
  
  // 6. 标记已完成第二赛季前的所有比赛
  if(!game.completedCompetitions) {
    game.completedCompetitions = new Set();
  }
  
  for(let comp of competitions) {
    if(comp.week < targetWeek && comp.week > WEEKS_PER_HALF) {
      const key = `${halfIndex}_${comp.name}_${comp.week}`;
      game.completedCompetitions.add(key);
    }
  }
  console.log('✅ [调试] 已标记完成前序比赛');
  
  // 7. 更新天气
  game.updateWeather();
  
  // 8. 刷新UI
  if(typeof renderAll === 'function') {
    renderAll();
  }
  
  console.log('🎉 [调试] 完成！');
  console.log(`📊 当前状态：`);
  console.log(`   - 周数: ${game.week}/${SEASON_WEEKS}`);
  console.log(`   - 学生: ${game.students.length}人`);
  console.log(`   - 经费: ¥${game.budget.toLocaleString()}`);
  console.log(`   - 下场比赛: ${game.getNextCompetition()}`);
  console.log('💡 提示：现在可以参加NOI比赛了！');
  
  alert(`🔧 调试模式已激活！\n\n✅ 已创建"${superStudent.name}"\n✅ 已跳转到第${game.week}周\n✅ 已授予所有晋级资格\n✅ 经费：¥${game.budget.toLocaleString()}\n\n下场比赛：${game.getNextCompetition()}\n\n提示：点击"参加比赛"按钮即可开始NOI比赛`);
}

/**
 * 调试函数：直接跳转到国家集训队（假设已完成NOI并获得金牌）
 * 使用方法：在浏览器控制台中输入 debugEnterNationalTeam() 即可
 */
/*
function debugEnterNationalTeam() {
  if(typeof game === 'undefined' || !game) {
    console.error('游戏未初始化，请先开始游戏');
    alert('请先开始游戏再使用调试功能');
    return;
  }
  
  console.log('🔧 [调试] 开始模拟进入国家集训队...');
  
  // 先执行debugJumpToNOI确保基础设置
  debugJumpToNOI();
  
  // 模拟NOI金牌成绩
  const superStudent = game.students[0];
  const mockNOIResults = [
    { name: superStudent.name, total: 700, scores: [100,100,100,100,100,100,100], eligible: true }
  ];
  
  console.log('✅ [调试] 模拟NOI金牌成绩：700分');
  
  // 直接调用国家集训队选择弹窗
  setTimeout(() => {
    showNationalTeamChoice(mockNOIResults, 700);
    console.log('✅ [调试] 已弹出国家集训队选择弹窗');
    console.log('💡 提示：请在弹窗中选择"是，进入国家集训队"');
  }, 500);
  
  alert('🔧 调试模式：国家集训队\n\n✅ 已模拟NOI金牌（700分）\n✅ 即将弹出国家集训队选择弹窗\n\n提示：在弹窗中选择"是"即可进入集训队流程');
}
*/
/**
 * 调试函数：显示当前游戏状态
 * 使用方法：在浏览器控制台中输入 debugShowStatus() 即可
 */
/*
function debugShowStatus() {
  if(typeof game === 'undefined' || !game) {
    console.error('游戏未初始化');
    return;
  }
  
  console.log('📊 ==================== 游戏状态 ====================');
  console.log(`周数: ${game.week}/${SEASON_WEEKS}`);
  console.log(`半赛季: ${game.week > WEEKS_PER_HALF ? '第二年' : '第一年'}`);
  console.log(`经费: ¥${game.budget.toLocaleString()}`);
  console.log(`声誉: ${game.reputation}`);
  console.log(`学生数: ${game.students.length}人`);
  
  if(game.students.length > 0) {
    console.log('\n👥 学生列表:');
    game.students.forEach((s, i) => {
      if(s && s.active !== false) {
        console.log(`  ${i+1}. ${s.name}`);
        console.log(`     - 思维:${Math.floor(s.thinking)} 编码:${Math.floor(s.coding)} 心理:${Math.floor(s.mental)}`);
        console.log(`     - 知识: DS:${Math.floor(s.knowledge_ds)} 图:${Math.floor(s.knowledge_graph)} 串:${Math.floor(s.knowledge_string)} 数:${Math.floor(s.knowledge_math)} DP:${Math.floor(s.knowledge_dp)}`);
        console.log(`     - 压力:${Math.floor(s.pressure)} 舒适度:${Math.floor(s.comfort)}`);
      }
    });
  }
  
  console.log(`\n🏆 下场比赛: ${game.getNextCompetition()}`);
  
  if(game.inNationalTeam) {
    console.log('\n🎖️ 国家集训队模式：激活');
    console.log(`   阶段: ${game.nationalTeamPhase || '未知'}`);
    if(game.nationalTeamResults) {
      console.log(`   金牌学生: ${game.nationalTeamResults.goldStudents?.join(', ') || '无'}`);
      console.log(`   IOI晋级: ${game.nationalTeamResults.ioiQualified?.join(', ') || '未定'}`);
    }
  }
  
  console.log('==================================================');
}

// 将调试函数暴露到全局window对象，方便在控制台调用
if(typeof window !== 'undefined') {
  window.debugJumpToNOI = debugJumpToNOI;
  window.debugEnterNationalTeam = debugEnterNationalTeam;
  window.debugShowStatus = debugShowStatus;
  console.log('🔧 调试函数已加载！可用命令：');
  console.log('   - debugJumpToNOI()          : 生成超强学生并跳转到第二年NOI');
  console.log('   - debugEnterNationalTeam()  : 模拟进入国家集训队');
  console.log('   - debugShowStatus()         : 显示当前游戏状态');
}

*/

