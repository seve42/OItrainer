/*
    render.js: UI 渲染逻辑
    包含所有与 DOM 操作相关的函数，如 `renderAll`、模态框显示、UI 交互等。
*/

/* =========== 晋级状态检查函数 =========== */
/**
 * 获取学生的晋级状态信息
 * @param {Student} student - 学生对象
 * @returns {Object} - { hasQualification: boolean, nextContest: string, html: string }
 */
function getStudentQualificationStatus(student) {
  const result = {
    hasQualification: false,
    nextContest: '',
    html: ''
  };
  
  if (!student || !game || !game.qualification) {
    return result;
  }
  
  try {
    // 确定当前是第几个赛季（上半年还是下半年）
    const currentHalf = (game.week > (typeof WEEKS_PER_HALF !== 'undefined' ? WEEKS_PER_HALF : 16)) ? 1 : 0;
    
    // 获取所有比赛，按周数排序
    const sortedComps = (typeof competitions !== 'undefined' && Array.isArray(competitions)) 
      ? competitions.slice().sort((a, b) => a.week - b.week) 
      : [];
    
    // 找到下一场未进行的比赛
    let nextComp = null;
    for (let comp of sortedComps) {
      if (comp.week > game.week) {
        // 检查这场比赛是否已经完成
        const key = `${currentHalf}_${comp.name}_${comp.week}`;
        if (!game.completedCompetitions || !game.completedCompetitions.has(key)) {
          nextComp = comp;
          break;
        }
      }
    }
    
    if (!nextComp) {
      return result; // 没有下一场比赛
    }
    
    result.nextContest = nextComp.name;
    
    // 检查学生是否已经晋级下一场比赛
    // CSP-S1 不需要晋级资格，所有人都可以参加
    if (nextComp.name === 'CSP-S1') {
      result.hasQualification = true;
      result.html = '<span class="qualification-badge qualified" title="所有学生均可参加CSP-S1">✓</span>';
      return result;
    }
    
    // 检查晋级链：CSP-S1 -> CSP-S2 -> NOIP -> 省选 -> NOI
    const qualChain = {
      'CSP-S2': 'CSP-S1',
      'NOIP': 'CSP-S2',
      '省选': 'NOIP',
      'NOI': '省选'
    };
    
    const requiredComp = qualChain[nextComp.name];
    if (requiredComp) {
      // 检查学生是否在qualification集合中
      const qualSet = game.qualification[currentHalf][requiredComp];
      if (qualSet && (qualSet.has(student.name) || qualSet.has(student))) {
        result.hasQualification = true;
        result.html = `<span class="qualification-badge qualified" title="已晋级${nextComp.name}">✓ ${nextComp.name}</span>`;
      } else {
        result.hasQualification = false;
        result.html = `<span class="qualification-badge not-qualified" title="未晋级${nextComp.name}，需要先通过${requiredComp}">✗ ${nextComp.name}</span>`;
      }
    }
    
  } catch (e) {
    console.error('获取学生晋级状态失败:', e);
  }
  
  return result;
}

// 暴露到全局作用域，供其他模块使用
window.getStudentQualificationStatus = getStudentQualificationStatus;

/* 每日/每次渲染随机一言 */
const QUOTES = [
  "想想你的对手正在干什么",
  "下课必须放松吗？",
  "没有天赋异禀的幸运，唯有水滴石穿的坚持",
  "没有一步登天的幻想，唯有日积月累的付出",
  "竞赛生没有特权你明白吗？",
  "自律者出众，懒惰者出局",
  "重质量，数量次之"
];

/* =========== UI 辅助 =========== */
const $ = id => document.getElementById(id);

function log(msg){
  const el = $('log');
  const wk = currWeek();
  const text = `[周${wk}] ${msg}`;
  if(el){ const p = document.createElement('div'); p.innerText = text; el.prepend(p); }
  else { console.log(text); }
}

function renderDifficultyTag(diff){
  const d = Number(diff) || 0;
  let label = '';
  let cls = '';
  if(d <= 20){ label = '入门'; cls = 'diff-red'; }
  else if(d <= 50){ label = '普及-'; cls = 'diff-orange'; }
  else if(d <= 86){ label = '普及/提高-'; cls = 'diff-yellow'; }
  else if(d <= 103){ label = '普及+/提高'; cls = 'diff-green'; }
  else if(d <=120){ label = '提高+/省选-'; cls = 'diff-blue'; }
  else if(d <= 150){ label = '省选/NOI-'; cls = 'diff-purple'; }
  else { label = 'NOI+/CTSC'; cls = 'diff-black'; }

  const legacy = (d <= 24) ? 'diff-beginner' : (d <= 34) ? 'diff-popular-low' : (d <= 44) ? 'diff-popular-high' : (d <= 64) ? 'diff-advanced-low' : (d <= 79) ? 'diff-provincial' : 'diff-noi';

  return `<span class="diff-tag ${cls} ${legacy}" title="难度: ${d}">${label}</span>`;
}

function safeRenderAll(){
  try{
    if(typeof window.renderAll === 'function' && document.getElementById('header-week')){
      window.renderAll();
    }
  }catch(e){ console.error('safeRenderAll error', e); }
}

function renderEventCards(){
  const container = $('event-cards-container');
  if(!container) return;
  
  // 清空并重建结构，释放旧的DOM引用
  const oldWrapper = document.getElementById('event-cards-wrapper');
  if(oldWrapper){
    // 移除滚动事件监听器
    const clonedWrapper = oldWrapper.cloneNode(false);
    if(oldWrapper.parentNode){
      oldWrapper.parentNode.replaceChild(clonedWrapper, oldWrapper);
    }
  }
  
  container.innerHTML = '';
  
  if(recentEvents.length === 0){
    container.classList.remove('has-overflow');
    return;
  }

  // 创建滚动包装器
  let wrapper = document.createElement('div');
  wrapper.id = 'event-cards-wrapper';
  container.appendChild(wrapper);

  const nowWeek = currWeek();
  let shown = 0;
  
  for(let i = 0; i < recentEvents.length; i++){
    const ev = recentEvents[i];
    if(ev.week && (nowWeek - ev.week) > 2) continue;
    
    if(ev._isHandled) continue;
    
    const card = document.createElement('div');
    let cardClass = 'event-card event-active';
    if (ev.options && ev.options.length > 0) {
      cardClass += ' event-required';
    }
    card.className = cardClass;

    const titleHtml = `<div class="card-title">${ev.name || '突发事件'}` +
            `${(ev.options && ev.options.length > 0) ? '<span class="required-tag">未选择</span>' : ''}` +
            `</div>`;
    const descText = ev.description || '';
    // 基本 HTML 转义（并移除换行/br），确保事件描述为单行显示，避免占位符泄露
    const esc = (s) => String(s||'').replace(/[&<>"']/g, function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[ch];});
    const escNoBr = (s) => {
      if(typeof s !== 'string') s = String(s||'');
      // 将 <br> 和换行符替换为空格，再做 HTML 转义
      const normalized = s.replace(/<br\s*\/?/gi, ' ').replace(/\r?\n/g, ' ');
      return normalized.replace(/[&<>"']/g, function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[ch];});
    };
    // 先把描述标准化为无换行形式，再基于该结果生成 shortDesc（避免截断标签或占位符）
    const normalizedDesc = (typeof descText === 'string') ? descText.replace(/<br\s*\/?/gi, ' ').replace(/\r?\n/g, ' ') : String(descText || '');
    const shortDesc = (normalizedDesc.length > 120) ? normalizedDesc.slice(0, 118) + '…' : normalizedDesc;

    let cardHTML = '';
    cardHTML += titleHtml;
  // 使用 escNoBr，所有换行/BR 将被转为空格，事件描述呈单行显示
  cardHTML += `<div class="card-desc clamp" data-uid="${ev._uid}">${escNoBr(shortDesc)}</div>`;
  cardHTML += `<div class="event-detail" data-uid="${ev._uid}" style="display:none">${escNoBr(descText)}</div>`;
    if(descText && descText.length > 60){
      cardHTML += `<button class="more-btn" data-action="toggle-detail" data-uid="${ev._uid}">更多</button>`;
    }

    if(ev.options && ev.options.length > 0){
      cardHTML += '<div class="event-options" style="margin-top:10px; display:flex; gap:8px;">';
      ev.options.forEach((opt, idx) => {
        cardHTML += `<button class="btn event-choice-btn" data-event-uid="${ev._uid}" data-option-index="${idx}">${opt.label || `选项${idx+1}`}</button>`;
      });
      cardHTML += '</div>';
    }

    card.innerHTML = cardHTML;
    wrapper.appendChild(card);
    
    if(++shown >= 6) break;
  }
  
  // 检查是否有溢出内容
  setTimeout(() => {
    checkEventCardsOverflow();
  }, 100);
}

// 检查事件卡片是否溢出并添加相应的视觉提示
function checkEventCardsOverflow() {
  const container = $('event-cards-container');
  const wrapper = $('event-cards-wrapper');
  if(!container || !wrapper) return;
  
  const hasOverflow = wrapper.scrollHeight > wrapper.clientHeight;
  
  if(hasOverflow) {
    container.classList.add('has-overflow');
    // 仅添加类并监听滚动以控制渐变显示（不创建任何提示 DOM）
    wrapper.addEventListener('scroll', function() {
      const isAtBottom = wrapper.scrollHeight - wrapper.scrollTop <= wrapper.clientHeight + 10;
      if(isAtBottom) {
        container.classList.add('scrolled-to-bottom');
      } else {
        container.classList.remove('scrolled-to-bottom');
      }
    });
  } else {
    container.classList.remove('has-overflow');
    container.classList.remove('scrolled-to-bottom');
  }
}

// 使用单次初始化标志避免重复绑定
if(!window._eventCardsInitialized){
  window._eventCardsInitialized = true;
  
  window.addEventListener('load', () => {
    const container = $('event-cards-container');
    if (!container) return;
    
    // 添加动画样式（仅一次）
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

    // 使用事件委托处理"更多"按钮点击
    container.addEventListener('click', function(e){
      const btn = e.target.closest('.more-btn');
      if (!btn) return;
      const uid = btn.dataset.uid ? parseInt(btn.dataset.uid, 10) : null;
      if (!uid) return;
      const detail = container.querySelector(`.event-detail[data-uid='${uid}']`);
      const desc = container.querySelector(`.card-desc[data-uid='${uid}']`);
      if (!detail || !desc) return;

      if (detail.classList.contains('visible')){
        detail.classList.remove('visible');
        detail.classList.add('hiding');
        desc.classList.add('clamp');
        btn.innerText = '更多';
        const onAnimEnd = function(ev){
          detail.classList.remove('hiding');
          detail.style.display = 'none';
          detail.removeEventListener('animationend', onAnimEnd);
        };
        detail.addEventListener('animationend', onAnimEnd);
      } else {
        detail.style.display = 'block';
        void detail.offsetWidth;
        detail.classList.remove('hiding');
        detail.classList.add('visible');
        desc.classList.remove('clamp');
        btn.innerText = '收起';
      }
    });
    
    // 使用事件委托处理事件选择
    container.addEventListener('click', handleEventChoice);
  });
}

function showEventModal(evt){
  const title = evt?.name || '事件';
  const desc = evt?.description || evt?.text || '暂无描述';
  const weekInfo = `[周${evt?.week || currWeek()}] `;
  showModal(`<h3>${weekInfo}${title}</h3><div class="small" style="margin-top:6px">${desc}</div><div class="modal-actions"><button class="btn" onclick="closeModal()">关闭</button></div>`);
}

function showChoiceModal(evt){
  const title = evt?.name || '选择事件';
  const desc = evt?.description || '';
  const options = evt?.options || [];
  
  const eventId = `choice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  pushEvent({ 
    name: title, 
    description: desc, 
    week: evt?.week || currWeek(),
    options: options,
    eventId: eventId
  });
}

function renderAll(){
  if(!document.getElementById('header-week')) return;
  
  // 清理旧的事件监听器标记
  if(!window._renderAllCleanupDone){
    window._renderAllCleanupDone = true;
  }
  
  $('header-week').innerText = `第 ${currWeek()} 周`;
  $('header-province').innerText = `省份: ${game.province_name} (${game.province_type})`;
  const headerBudgetEl = $('header-budget');
  if(headerBudgetEl) headerBudgetEl.innerText = `经费: ¥${game.budget}`;
  try{
    if(headerBudgetEl){
      if(Number(game.budget) < 20000){ headerBudgetEl.classList.add('low-funds'); }
      else { headerBudgetEl.classList.remove('low-funds'); }
    }
  }catch(e){ /* ignore */ }
  $('header-reputation').innerText = `声誉: ${game.reputation}`;
  $('info-week').innerText = currWeek();
    const infoWeekEl = $('info-week'); if(infoWeekEl) infoWeekEl.innerText = currWeek();
    const tempText = game.temperature.toFixed(1) + "\u00b0C";
    const weatherDesc = game.getWeatherDescription();
    const infoTempEl = $('info-temp'); if(infoTempEl) infoTempEl.innerText = tempText;
    const infoWeatherEl = $('info-weather'); if(infoWeatherEl) infoWeatherEl.innerText = weatherDesc;
    const infoFutureEl = $('info-future-expense'); if(infoFutureEl) infoFutureEl.innerText = game.getFutureExpense();
  const nextCompText = game.getNextCompetition();
    const nextCompEl = $('next-comp'); if(nextCompEl) nextCompEl.innerText = nextCompText;
    const headerNextSmall = $('header-next-comp-small'); if(headerNextSmall) headerNextSmall.innerText = nextCompText;
    const headerWeatherText = $('header-weather-text'); if(headerWeatherText) headerWeatherText.innerText = weatherDesc;
    const headerTempHeader = $('header-temp-header'); if(headerTempHeader) headerTempHeader.innerText = tempText;
  const q = QUOTES[ Math.floor(Math.random() * QUOTES.length) ];
  $('daily-quote').innerText = q;
  let match = nextCompText.match(/还有(\d+)周/);
  let weeksLeft = match ? parseInt(match[1],10) : null;
  const panel = $('next-competition-panel');
  if(weeksLeft !== null && weeksLeft <= 4){ panel.className = 'next-panel highlight'; }
  else { panel.className = 'next-panel normal'; }
  const scheduleComps = competitions.slice().sort((a, b) => a.week - b.week);
  $('comp-schedule').innerText = scheduleComps.map(c => `${c.week}:${c.name}`).join("  |  ");
  
  // 显示学生的平均实际舒适度（包含 modifier 效果）
  // 而不是仅显示全局舒适度，这样事件对舒适度的影响会被反映出来
  const activeStudents = game.students.filter(s => s && s.active !== false);
  let displayComfort = game.getComfort(); // 默认使用全局舒适度
  if(activeStudents.length > 0){
    // 计算学生的平均实际舒适度（考虑个体差异和modifier）
    const avgStudentComfort = activeStudents.reduce((sum, s) => {
      let personalComfort = game.getComfort();
      
      // 应用天赋修正
      if(s.talents && s.talents.has('天气敏感')){
        const baseComfort = game.base_comfort;
        const weatherEffect = personalComfort - baseComfort;
        personalComfort = baseComfort + weatherEffect * 2;
        personalComfort = Math.max(0, Math.min(100, personalComfort));
      }
      if(s.talents && s.talents.has('美食家')){
        const canteenBonus = 3 * (game.facilities.canteen - 1);
        personalComfort += canteenBonus;
        personalComfort = Math.max(0, Math.min(100, personalComfort));
      }
      
      // 应用事件产生的临时修正值
      if(typeof s.comfort_modifier === 'number'){
        personalComfort += s.comfort_modifier;
        personalComfort = Math.max(0, Math.min(100, personalComfort));
      }
      
      return sum + personalComfort;
    }, 0) / activeStudents.length;
    displayComfort = avgStudentComfort;
  }
  
  const comfortEl = $('comfort-val');
  if(comfortEl) comfortEl.innerText = Math.floor(displayComfort);
  $('fac-computer').innerText = game.facilities.computer;
  $('fac-library').innerText = game.facilities.library;
  $('fac-ac').innerText = game.facilities.ac;
  $('fac-dorm').innerText = game.facilities.dorm;
  $('fac-canteen').innerText = game.facilities.canteen;
  $('fac-maint').innerText = game.facilities.getMaintenanceCost();
  
  // 同步更新设施状态显示区域（只读）
  const displayEls = {
    'fac-computer-display': game.facilities.computer,
    'fac-library-display': game.facilities.library,
    'fac-ac-display': game.facilities.ac,
    'fac-dorm-display': game.facilities.dorm,
    'fac-canteen-display': game.facilities.canteen,
    'fac-maint-display': game.facilities.getMaintenanceCost()
  };
  for(let id in displayEls) {
    const el = $(id);
    if(el) el.innerText = displayEls[id];
  }
  // 存储学生列表容器引用以便后续清理
  const studentListEl = $('student-list');
  
  let out = '';
  for(let s of game.students){
    if(s && s.active === false) continue;
    let pressureLevel = s.pressure < 35 ? "低" : s.pressure < 65 ? "中" : "高";
    let pressureClass = s.pressure < 35 ? "pressure-low" : s.pressure < 65 ? "pressure-mid" : "pressure-high";
    
    // 检查是否有退队倾向
    let hasTendency = (s.quit_tendency_weeks && s.quit_tendency_weeks > 0);
    
    // 获取下一场比赛的晋级状态
    let qualificationInfo = getStudentQualificationStatus(s);
    
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
          ${s.sick_weeks > 0 ? '<span class="warn" title="训练效率下降，压力累计加速" aria-label="训练效率下降，压力累计加速">[生病]</span>' : ''}
          ${hasTendency ? '<span class="warn">[退队倾向]</span>' : ''}
          ${qualificationInfo.html}
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
            <span class="kb ability" title="思维: ${Math.floor(Number(s.thinking||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.thinking||0)))}">思维${getLetterGradeAbility(Math.floor(Number(s.thinking||0)))}</span>
            <span class="kb ability" title="代码: ${Math.floor(Number(s.coding||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.coding||0)))}">代码${getLetterGradeAbility(Math.floor(Number(s.coding||0)))}</span>
          </div>
        </div>
        
        ${talentsHtml ? `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12px;color:#718096;font-weight:600;">天赋</span><div class="student-talents">${talentsHtml}</div></div>` : ''}
      </div>
    </div>`;
  }
  if(out==='') out = '<div class="muted">目前没有活跃学生</div>';
  
  // 清理旧的DOM节点和事件监听器
  if(studentListEl){
    // 移除旧的事件监听器
    const oldButtons = studentListEl.querySelectorAll('.evict-btn');
    oldButtons.forEach(btn => {
      const clonedBtn = btn.cloneNode(true);
      if(btn.parentNode){
        btn.parentNode.replaceChild(clonedBtn, btn);
      }
    });
    
    // 更新内容
    studentListEl.innerHTML = out;
  }
  
  // 重新绑定事件（使用事件委托减少监听器数量）
  if(studentListEl && !studentListEl._evictDelegated){
    studentListEl._evictDelegated = true;
    studentListEl.addEventListener('click', function(e){
      const btn = e.target.closest('.evict-btn');
      if(!btn) return;
      const idx = parseInt(btn.dataset.idx,10);
      if(isNaN(idx)) return;
      if(game.reputation < EVICT_REPUTATION_COST){ alert('声誉不足，无法劝退'); return; }
      if(!confirm(`确认劝退 ${game.students[idx].name}？将消耗声誉 ${EVICT_REPUTATION_COST}`)) return;
      evictSingle(idx);
    });
  }
  
  renderEventCards();

  try{
    const pending = hasPendingRequiredEvents();
    const actionCards = Array.from(document.querySelectorAll('.action-card'));
    if(pending){
      actionCards.forEach(ac => {
        ac.classList.add('disabled');
        ac.setAttribute('aria-disabled', 'true');
        ac.setAttribute('tabindex', '-1');
        try{
          if(typeof ac._origOnclickFn === 'undefined'){
            ac._origOnclickFn = ac.onclick || null;
          }
        }catch(e){}
        ac.onclick = (e) => { e && e.stopPropagation && e.stopPropagation(); e && e.preventDefault && e.preventDefault();
          const msg = '存在未处理的事件卡片，请先在右侧事件区域选择处理后再进行行动。';
          if(window.toastManager && typeof window.toastManager.show === 'function') window.toastManager.show(msg, 'warning'); else try{ alert(msg); }catch(e){}
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
      const container = $('event-cards-container');
      if(container){
        const firstPending = container.querySelector('.event-card.event-required');
        if(firstPending){ try{ firstPending.scrollIntoView({ behavior: 'smooth', block: 'center' }); }catch(e){}; firstPending.classList.add('highlight-pending'); setTimeout(()=>{ firstPending.classList.remove('highlight-pending'); }, 1800); }
      }
    } else {
      actionCards.forEach(ac => {
        ac.classList.remove('disabled');
        ac.removeAttribute('aria-disabled');
        ac.setAttribute('tabindex', '0');
        try{
          if(typeof ac._origOnclickFn !== 'undefined'){
            try{ ac.onclick = ac._origOnclickFn; }catch(e){}
            try{ delete ac._origOnclickFn; }catch(e){}
          } else {
            if(ac.onclick && ac.onclick.toString && ac.onclick.toString().includes('存在未处理的事件卡片')){
              ac.onclick = null;
            }
          }
        }catch(e){}
      });
    }
  }catch(e){ /* ignore UI assist failures */ }

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
  const actionContainer = document.querySelector('.action-cards');
  if (compNow) {
    if (!document.getElementById('comp-only-action')) {
      const compCard = document.createElement('div');
      compCard.className = 'action-card comp-highlight';
      compCard.id = 'comp-only-action'; compCard.setAttribute('role','button'); compCard.tabIndex = 0;
      compCard.innerHTML = `<div class="card-title">参加比赛【${compNow.name}】</div>`;
      compCard.onclick = () => { 
        if(typeof window.holdCompetitionModalNew === 'function'){
          window.holdCompetitionModalNew(compNow);
        } else {
          holdCompetitionModal(compNow);
        }
      };
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
  
  // 如果需要使用繁体中文，转换所有动态生成的内容
  try {
    if (window.ChineseConverter && window.ChineseConverter.shouldUseTraditionalChinese()) {
      window.ChineseConverter.convertElementToTraditional(document.body);
    }
  } catch (e) {
    console.error('renderAll 繁体转换失败:', e);
  }
}

function showModal(html){
  const root = $('modal-root');
  if(!root) return;
  root.innerHTML = `<div class="modal"><div class="dialog">${html}</div></div>`;

  const dialog = root.querySelector('.dialog');
  if(!dialog) return;

  const actions = dialog.querySelector('.modal-actions');
  if(actions){
    const panel = document.createElement('div');
    panel.className = 'modal-action-panel';
    while(actions.firstChild){ panel.appendChild(actions.firstChild); }
    actions.remove();
    dialog.appendChild(panel);
    const guard = document.createElement('div'); guard.className = 'modal-action-guard';
    dialog.insertBefore(guard, dialog.firstChild);

    const buttons = panel.querySelectorAll('button');
    buttons.forEach((b, idx) => {
      b.classList.add('modal-btn');
      if(!b.hasAttribute('tabindex')) b.setAttribute('tabindex', '0');
      if(idx === 0) b.classList.add('btn-primary');
    });

    const primary = panel.querySelector('button.btn-primary') || panel.querySelector('button');
    if(primary) primary.focus();
  }

  function keyHandler(e){
    if(e.key === 'Escape'){
      closeModal();
    }else if(e.key === 'Enter'){
      let targetBtn = null;
      const panelBtn = dialog.querySelector('.modal-action-panel button:not(.btn-ghost):not(:disabled)');
      if(panelBtn) targetBtn = panelBtn;
      else targetBtn = dialog.querySelector('button:not(.btn-ghost):not(:disabled)') || dialog.querySelector('button:not(:disabled)');
      if(targetBtn){
        try{ targetBtn.click(); }catch(e){}
      }
    }
  }
  root._modalKeyHandler = keyHandler;
  window.addEventListener('keydown', keyHandler);
  
  // 如果需要使用繁体中文，转换模态框内容
  try {
    if (window.ChineseConverter && window.ChineseConverter.shouldUseTraditionalChinese()) {
      window.ChineseConverter.convertElementToTraditional(dialog);
    }
  } catch (e) {
    console.error('showModal 繁体转换失败:', e);
  }
}

function closeModal(){
  const root = $('modal-root');
  if(!root) return;
  
  // 清理事件监听器
  if(root._modalKeyHandler){
    try{ window.removeEventListener('keydown', root._modalKeyHandler); }catch(e){}
    root._modalKeyHandler = null;
  }
  
  // 清理DOM内的所有按钮事件监听器
  const allButtons = root.querySelectorAll('button');
  allButtons.forEach(btn => {
    const clone = btn.cloneNode(true);
    if(btn.parentNode) btn.parentNode.replaceChild(clone, btn);
  });
  
  // 清空内容
  root.innerHTML = '';
}

function trainStudentsUI(){
  // 从 game 对象读取本周的题目（在周推进时已选好）
  // 如果没有本周题目（例如游戏刚开始），则现场选择
  let tasks = game.weeklyTasks;
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    tasks = selectRandomTasks(7);
    game.weeklyTasks = tasks;
  }
  
  const taskCards = tasks.map((task, idx) => {
    const boostStr = task.boosts.map(b => `${b.type}+${b.amount}`).join(' ');
    const diffTag = renderDifficultyTag(task.difficulty);
    return `
    <div class="prov-card option-card task-card" data-idx="${idx}" style="min-width:200px;padding:12px;border-radius:6px;cursor:pointer;border:2px solid #ddd;">
      <div class="card-title" style="font-weight:600;margin-bottom:4px">${task.name}</div>
      <div class="small" style="margin:4px 0">难度: ${diffTag}</div>
      <div class="card-desc small muted">${boostStr}</div>
    </div>
  `;
  }).join('');

  const intensityHtml = `
    <div style="margin-top:8px;padding:0 4px;text-align:center;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;max-width:220px;margin-left:auto;margin-right:auto;">
        <span class="small" style="color:#666;">轻度</span>
        <span id="intensity-value" style="font-weight:700;font-size:16px;color:var(--accent);">中度</span>
        <span class="small" style="color:#666;">重度</span>
      </div>
      <input type="range" id="intensity-slider" min="1" max="3" value="2" step="1"
        style="width:220px;display:block;margin:0 auto;height:8px;border-radius:4px;outline:none;-webkit-appearance:none;appearance:none;background:linear-gradient(to right, #48bb78 0%, #ecc94b 50%, #f56565 100%);">
    </div>
    <div id="intensity-warning" style="margin-top:12px;font-weight:700;text-align:center;display:none;"></div>
    <div class="small muted" style="margin-top:6px;text-align:center;">强度影响压力和训练效果</div>
  `;

  showModal(`<h3>选择训练题目</h3>
    <div class="small muted" style="margin-bottom:10px">从下方7道题目中选择一道进行训练。题目提升效果受学生能力与难度匹配度影响。</div>
    <label class="block">可选题目</label>
    <div id="train-task-grid" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;overflow-x:auto;max-height:300px;overflow-y:auto;">${taskCards}</div>
    <div id="train-task-helper" class="small muted" style="margin-top:6px;display:none;color:#c53030;font-weight:700"></div>
    <label class="block" style="margin-top:14px">训练强度</label>
    ${intensityHtml}
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn" id="train-confirm">开始训练（1周）</button>
    </div>`);

  // 题目选择逻辑
  const tCards = Array.from(document.querySelectorAll('#train-task-grid .task-card'));
  if(tCards.length > 0) tCards[0].classList.add('selected');
  tCards.forEach(c => {
    c.onclick = () => {
      tCards.forEach(x => { x.classList.remove('selected'); x.classList.remove('shake'); });
      c.classList.add('selected');
      const helper = $('train-task-helper'); if(helper){ helper.style.display='none'; helper.innerText=''; }
      const grid = $('train-task-grid'); if(grid) grid.classList.remove('highlight-required');
      updateIntensityWarning();
    };
  });

  // 滑块控制逻辑
  const slider = document.getElementById('intensity-slider');
  const valueDisplay = document.getElementById('intensity-value');
  
  // 自定义滑块样式（适配不同浏览器）
  const style = document.createElement('style');
  style.textContent = `
    #intensity-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      border: 2px solid var(--accent);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    #intensity-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      border: 2px solid var(--accent);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    #intensity-slider::-webkit-slider-track {
      height: 8px;
      border-radius: 4px;
    }
    #intensity-slider::-moz-range-track {
      height: 8px;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  function updateIntensityWarning() {
    const intensity = parseInt(slider.value);
    const intensityNames = ['', '轻度', '中度', '重度'];
    valueDisplay.textContent = intensityNames[intensity];
    
    const taskBtn = document.querySelector('#train-task-grid .task-card.selected');
    if(!taskBtn) return;
    
    const taskIdx = parseInt(taskBtn.dataset.idx);
    const selectedTask = tasks[taskIdx];
    
    // 预计算压力变化
    const warningDiv = document.getElementById('intensity-warning');
    const result = calculateTrainingPressure(selectedTask, intensity);
    warningDiv.style.display = 'block';
    // 仅使用彩色文本展示简单状态（不显示背景或额外描述）
    if(result.hasQuitRisk) {
      warningDiv.style.color = '#c53030';
      warningDiv.innerText = '压力过大';
    } else if(result.hasHighPressure) {
      warningDiv.style.color = '#d97706';
      warningDiv.innerText = '压力略大';
    } else {
      warningDiv.style.color = '#2f855a';
      warningDiv.innerText = '压力尚可';
    }
  }

  slider.addEventListener('input', updateIntensityWarning);
  updateIntensityWarning();

  $('train-confirm').onclick = () => {
    let taskBtn = document.querySelector('#train-task-grid .task-card.selected');

    if(!taskBtn) {
      const helper = $('train-task-helper'); if(helper){ helper.style.display='block'; helper.innerText='请先选择一道训练题目以开始训练'; }
      const grid = $('train-task-grid'); if(grid) grid.classList.add('highlight-required');
      const first = document.querySelector('#train-task-grid .task-card');
      if(first){ first.classList.add('shake'); setTimeout(()=>first.classList.remove('shake'), 900); try{ first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }catch(e){} }
      return;
    }

    let taskIdx = parseInt(taskBtn.dataset.idx);
    let selectedTask = tasks[taskIdx];
    let intensity = parseInt(slider.value);
    
    closeModal();
    
    trainStudentsWithTask(selectedTask, intensity);
    
    let nextComp = competitions.find(c => c.week > currWeek());
    let weeksToComp = nextComp ? (nextComp.week - currWeek()) : Infinity;
    let advance = Math.min(1, weeksToComp);
    safeWeeklyUpdate(advance);
    renderAll();
  };
}

function holdMockContestUI(){
  const officialContestOptions = COMPETITION_SCHEDULE.map((comp, idx) => 
    `<option value="${idx}">${comp.name} (难度${comp.difficulty}, ${comp.numProblems}题)</option>`
  ).join('');
  
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
      <select id="mock-contest-type" style="display:none">${onlineContestOptions}</select>
      <div id="mock-contest-type-grid" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"></div>
    </div>
    <div id="mock-questions-container" style="margin-top:8px">
    </div>
    <div class="modal-actions" style="margin-top:10px">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn" id="mock-submit">开始模拟赛（1周）</button>
    </div>`);
  
  function updateQuestions(){
    const isPurchased = $('mock-purchase').value === "1";
    
    if(isPurchased){
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
      $('mock-difficulty-container').style.display = 'none';
      $('mock-online-container').style.display = 'block';
      
      const typeIdx = parseInt($('mock-contest-type').value);
      const contestType = ONLINE_CONTEST_TYPES[typeIdx];
      
      $('mock-questions-container').innerHTML = `<div class="small">网赛共 ${contestType.numProblems} 题</div>`;
    }
  }
  
  updateQuestions();
  
  $('mock-purchase').onchange = updateQuestions;
  $('mock-difficulty').onchange = updateQuestions;
  $('mock-contest-type').onchange = updateQuestions;

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
        try{ hidden.onchange && hidden.onchange(); }catch(e){}
      });
      grid.appendChild(card);
    });

    const initial = hidden.value || '0';
    const chosen = grid.querySelector(`.option-card[data-val='${initial}']`);
    if(chosen) chosen.classList.add('selected');
  }

  try{ renderMockContestTypeGrid(); }catch(e){ console.error('渲染网赛类型网格失败', e); }
  
  $('mock-submit').onclick = ()=>{
    const isPurchased = $('mock-purchase').value === "1";
    let difficultyConfig, numProblems, questionTagsArray = [];
    
    if(isPurchased){
      const diffIdx = parseInt($('mock-difficulty').value);
      const comp = COMPETITION_SCHEDULE[diffIdx];
      difficultyConfig = {
        type: 'official',
        difficulty: comp.difficulty,
        name: comp.name,
        numProblems: comp.numProblems
      };
      numProblems = comp.numProblems;
      
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
      
      const allTags = ["数据结构", "图论", "字符串", "数学", "动态规划"];
      for(let q = 0; q < numProblems; q++){
        let tags = [];
        const numTags = 1 + Math.floor(getRandom() * 2);
        for(let j = 0; j < numTags; j++){
          const tag = allTags[Math.floor(getRandom() * allTags.length)];
          if(!tags.includes(tag)) tags.push(tag);
        }
        questionTagsArray.push(tags);
      }
    }
    
    closeModal();
    
    if(isPurchased){
      let cost = uniformInt(MOCK_CONTEST_PURCHASE_MIN_COST, MOCK_CONTEST_PURCHASE_MAX_COST);
      const adj = Math.round(cost * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
      if(game.budget < adj){ alert("经费不足，无法购买题目"); return; }
      game.recordExpense(adj, '购买付费比赛题目');
      log(`购买付费比赛题目（${difficultyConfig.name}）， ¥${adj}`);
    } else {
      log(`参加网赛（${difficultyConfig.name}，免费）`);
    }
    
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

function entertainmentUI(){
  const opts = [
    {id:1,label:'放假',desc:'减小少许压力',cost:0},
    {id:2,label:`请学生吃饭 (¥${ENTERTAINMENT_COST_MEAL})`,desc:'补充能量,减小一定压力',cost:ENTERTAINMENT_COST_MEAL},
    {id:3,label:'体育运动',desc:`减小一定压力,注意天气影响，当前是${game.getWeatherDescription()}天`,cost:0},
    {id:5,label:`邀请学生打游戲`,desc:'适度减压,有可能提升学生能力',cost:ENTERTAINMENT_COST_CS}
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
  const entCards = Array.from(document.querySelectorAll('.option-card'));
  if(entCards.length>0) entCards[0].classList.add('selected');
  entCards.forEach(c=>{ c.onclick = ()=>{ entCards.forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); }; });
  $('ent-confirm').onclick = ()=>{
    let sel = document.querySelector('.option-card.selected');
    let id = sel ? parseInt(sel.dataset.id) : opts[0].id;
    let opt = opts.find(o=>o.id===id) || {cost:0, id: id};
    let cost = opt.cost;
    if(opt.id === 5 && game.facilities.computer < 3){ alert("需要计算机等级 ≥ 3"); return; }
  const costAdj = Math.round(cost * (game.getExpenseMultiplier ? game.getExpenseMultiplier() : 1));
  if(game.budget < costAdj){ alert("经费不足"); return; }
  game.recordExpense(costAdj, `娱乐活动：${opt.val}`);
    closeModal();
      for(let s of game.students){
        if(!s || s.active === false) continue;
        if(opt.id === 1){
          s.mental += uniform(3,7); var oldP = s.pressure; s.pressure = Math.max(0, s.pressure - uniform(30,45)); var newP = s.pressure;
        } else if(opt.id === 2){
          s.mental += uniform(8,20); var oldP = s.pressure; s.pressure = Math.max(0, s.pressure - uniform(40,55)); var newP = s.pressure;
        } else if(opt.id === 3){
          let wf=1.0; if(game.weather==='雪') wf=2.0; else if(game.weather==='雨' && game.facilities.dorm<2) wf=0.5; var oldP = s.pressure; s.pressure = Math.max(0, s.pressure - uniform(20,35)*wf); var newP = s.pressure; s.mental += uniform(3,8);
        } else if(opt.id === 5){
          s.mental += uniform(1,5); s.coding += uniform(0.5,1.0); var oldP = s.pressure; s.pressure = Math.max(0, s.pressure - uniform(10,20)); var newP = s.pressure;
        }
        s.mental = Math.min(100, s.mental);
        try{
          if(typeof s.triggerTalents === 'function'){
            const results = s.triggerTalents('entertainment_finished', { entertainmentId: opt.id, entertainmentName: opt.val, cost: opt.cost }) || [];
            for(const r of results){ if(!r || !r.result) continue; const out = r.result; if(typeof out === 'object'){
              if(out.action === 'quit_for_esports'){
                s.active = false; s._quit_for_esports = true;
                console.log(out.message || '学生退队去学电竞');
                if(typeof log === 'function') log(`${s.name} ${out.message || '退队去学电竞'}`);
                try{ checkAndTriggerEnding(); }catch(e){}
              }
              if(out.action === 'vacation_half_minus5'){
                const delta = (typeof oldP !== 'undefined' && typeof newP !== 'undefined') ? (oldP - newP) : 0;
                const addBack = delta * 0.5;
                s.pressure = Math.min(100, s.pressure + addBack);
                console.log(out.message || '睡觉也在想题：压力-5效果减半');
                if(typeof log === 'function') log(`${s.name} ${out.message || '睡觉也在想题：压力-5效果减半'}`);
              }
            } else if(typeof r.result === 'string'){
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
  };
}

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
                try{ checkAndTriggerEnding(); }catch(e){}
            }
          } else if(typeof r.result === 'string'){
            if(typeof log === 'function') log(`${s.name} ${r.result}`);
          } }
        }
      }catch(e){ console.error('triggerTalents vacation_end', e); }
    }
  safeWeeklyUpdate(weeks);
  renderAll();
  log(`放假 ${days} 天，跳过 ${weeks} 周`);
  };
}

function upgradeFacilitiesUI(){
  const facs = [{id:"computer",label:"计算机"},{id:"library",label:"资料库"},{id:"ac",label:"空调"},{id:"dorm",label:"宿舍"},{id:"canteen",label:"食堂"}];
  let html = `<h3>升级设施</h3><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">`;
  for(let f of facs){
    let current = game.facilities.getCurrentLevel(f.id);
    let max = game.facilities.getMaxLevel(f.id);
    let cost = game.facilities.getUpgradeCost(f.id);
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
  const modalUpgrades = document.querySelectorAll('#modal-root .btn.upgrade');
  modalUpgrades.forEach(b => {
    b.onclick = () => {
      const fac = b.dataset.fac;
      if(fac){
        upgradeFacility(fac);
        upgradeFacilitiesUI();
      }
    };
  });
}

function initGameUI(){
  showModal(`<h3>欢迎 — OI 教练模拟器</h3>
    <label class="block">选择难度</label><select id="init-diff"><option value="1">简单</option><option value="2" selected>普通</option><option value="3">困难</option></select>
    <label class="block">选择省份</label><div id="init-prov-grid" class="prov-grid"></div>
    <label class="block">学生人数 (3-10)</label><input id="init-stu" type="number" min="3" max="10" value="5" />
  <div class="modal-actions" style="margin-top:8px"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn" id="init-start">开始</button></div>`);
  let grid = document.getElementById('init-prov-grid');
  for(let k in PROVINCES){ let p=PROVINCES[k]; let btn=document.createElement('button'); btn.className='prov-btn'; btn.textContent=p.name; btn.dataset.val=k; btn.onclick=()=>{document.querySelectorAll('#init-prov-grid .prov-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');}; grid.appendChild(btn);}  
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

function renderStartPageUI(){
  const grid = document.getElementById('start-prov-grid');
  if(!grid) return;
  grid.innerHTML = '';
  for(let k in PROVINCES){ let p=PROVINCES[k]; let btn=document.createElement('button'); btn.className='prov-btn'; btn.textContent=p.name; btn.dataset.val=k; btn.onclick=()=>{document.querySelectorAll('#start-prov-grid .prov-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');}; grid.appendChild(btn);}  
  if(grid.firstChild) grid.firstChild.classList.add('selected');
}

function renderEndSummary(){
  const el = document.getElementById('end-summary');
  if(!el) return;
  
  console.log('renderEndSummary called');
  console.log('localStorage keys:', Object.keys(localStorage));
  console.log('oi_coach_save exists:', localStorage.getItem('oi_coach_save') !== null);
  console.log('oi_coach_ending_reason:', localStorage.getItem('oi_coach_ending_reason'));
  console.log('oi_coach_ending:', localStorage.getItem('oi_coach_ending'));
  
  try{
    let diag = null;
    try{ diag = sessionStorage.getItem('oi_coach_save_diag'); }catch(e){ diag = null; }
    try{ console.debug('session backup length=', diag?diag.length:0); }catch(e){}

    let raw = null;
    try{ raw = sessionStorage.getItem('oi_coach_save'); }catch(e){ raw = null; }

    try{ if(!raw || (raw.length > 0 && raw.length < 2000)) raw = localStorage.getItem('oi_coach_save') || raw; }catch(e){ raw = raw || null; }

    try{
      if(!raw || (raw.length > 0 && raw.length < 2000)){
        const maybe = window.name || '';
        if(maybe){
          try{
            const parsedName = JSON.parse(maybe);
            const oldLen = raw ? raw.length : 0;
            if(parsedName && parsedName.oi_coach_save && parsedName.oi_coach_save.length > oldLen){
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

    try{ if((!raw || raw.length < 2000) && diag && diag.length > (raw?raw.length:0)) raw = diag; }catch(e){}

    if(!raw){ 
      if(typeof game !== 'undefined' && game && game.students) {
        console.log('No storage data found, using global game object');
        raw = JSON.stringify(game);
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
      console.log('careerCompetitions in parsed data:', o.careerCompetitions);
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
    
    let active = (o.students || []).filter(s => s && s.active !== false).length;
    let initial = o.initial_students || (o.students? o.students.length : 0);
    let rep = o.reputation || 0;
    let budget = o.budget || 0;
    let totalExpenses = o.totalExpenses || 0;
    let week = o.week || 0;
    let difficulty = o.difficulty || 2; // 默认为普通难度
    
    // 难度文本和颜色映射
    const difficultyMap = {
      1: { text: '简单', color: '#4caf50', emoji: '🟢' },
      2: { text: '普通', color: '#2196f3', emoji: '🔵' },
      3: { text: '专家', color: '#f44336', emoji: '🔴' }
    };
    const diffInfo = difficultyMap[difficulty] || difficultyMap[2];
    
    let avgP = 0; 
    if(o.students && o.students.length>0){ 
      avgP = Math.round(o.students.filter(s => s && s.active !== false).reduce((a,s)=>a+(s.pressure||0),0) / Math.max(1, active)); 
    }  let rawEnding = '';
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
    console.log('About to build career display, careerCompetitions array:', o.careerCompetitions);
    
    let studentsHtml = '';
    if(o.students && o.students.length > 0) {
      studentsHtml += `<div style="margin-top:12px"><h4>👥 学生详细信息</h4></div>`;
      studentsHtml += `<div style="max-height:260px;overflow:auto;border:1px solid #ddd;border-radius:4px;padding:8px;background:#fafafa">`;
      for(let s of o.students) {
        const isActive = (s && s.active !== false);
        const pressureLevel = (s && typeof s.pressure === 'number') ? (s.pressure < 35 ? '低' : s.pressure < 65 ? '中' : '高') : '—';
        const pressureClass = (s && typeof s.pressure === 'number') ? (s.pressure < 35 ? 'pressure-low' : s.pressure < 65 ? 'pressure-mid' : 'pressure-high') : '';
        
        let talentsHtml = '';
        try{
          if(s.talents && (s.talents instanceof Array || s.talents instanceof Set)){
            const talentArray = Array.from(s.talents);
            talentsHtml = talentArray.map(tn => {
              const info = (window.TalentManager && typeof window.TalentManager.getTalentInfo === 'function') ? window.TalentManager.getTalentInfo(tn) : { name: tn, description: '', color: '#2b6cb0' };
              return `<span class="talent-tag" data-talent="${tn}" style="background-color:${info.color}20;color:${info.color};border-color:${info.color}40;">${tn}<span class="talent-tooltip">${info.description||''}</span></span>`;
            }).join('');
          }
        }catch(e){ talentsHtml = '';} 

        studentsHtml += `<div class="student-box" style="margin-bottom:8px;padding:8px;background:white;border-radius:6px;border:1px solid #eee">
          <div class="student-header">
            <div class="student-name">
              ${s.name}
              ${s.sick_weeks > 0 ? '<span class="warn" title="训练效率下降，压力累计加速" aria-label="训练效率下降，压力累计加速">[生病]</span>' : ''}
              ${!isActive ? '<span class="warn">[退队]</span>' : ''}
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
                <span class="kb ability" title="思维: ${Math.floor(Number(s.thinking||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.thinking||0)))}">思维${getLetterGradeAbility(Math.floor(Number(s.thinking||0)))}</span>
                <span class="kb ability" title="代码: ${Math.floor(Number(s.coding||0))}" data-grade="${getLetterGradeAbility(Math.floor(Number(s.coding||0)))}">代码${getLetterGradeAbility(Math.floor(Number(s.coding||0)))}</span>
              </div>
            </div>
            
            ${talentsHtml ? `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12px;color:#718096;font-weight:600;">天赋</span><div class="student-talents">${talentsHtml}</div></div>` : ''}
          </div>
        </div>`;
      }
      studentsHtml += `</div>`;
    }
    
    let careerHtml = '';
    let career = (o.careerCompetitions && Array.isArray(o.careerCompetitions) && o.careerCompetitions.length)
                 ? o.careerCompetitions
                 : null;
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
        
        // 计算本场比赛的表现分
        const contestPerformance = calculateContestPerformanceScore(rec);
        
        careerHtml += `<div style="margin-bottom:12px;padding:8px;background:white;border-radius:4px;border-left:3px solid #4a90e2">`;
        careerHtml += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">`;
        careerHtml += `<div style="font-weight:bold">第 ${rec.week} 周 - ${rec.name}</div>`;
        careerHtml += `<div style="font-size:12px;color:#1976d2;font-weight:600">表现分: ${contestPerformance.toFixed(2)}</div>`;
        careerHtml += `</div>`;
        // IOI 为国际赛，不存在“晋级”概念；避免将其他国家/队伍的晋级数据计入本队统计
        if (/IOI/i.test(rec.name)) {
          // 统计奖牌数（如果有）并显示参赛人数及奖牌信息
          let gold = 0, silver = 0, bronze = 0;
          if (rec.entries && Array.isArray(rec.entries)) {
            for (let e of rec.entries) {
              if (e && e.medal) {
                if (e.medal === 'gold') gold++;
                else if (e.medal === 'silver') silver++;
                else if (e.medal === 'bronze') bronze++;
              }
            }
          }
          careerHtml += `<div style="font-size:13px;color:#666;margin-bottom:6px">国际赛（无晋级制） · 参赛人数: ${totalStudents} 人 · 奖牌：金${gold} 银${silver} 铜${bronze}</div>`;
        } else {
          careerHtml += `<div style="font-size:13px;color:#666;margin-bottom:6px">晋级：${passedCount}/${totalStudents} 人 (${passRate}%)</div>`;
        }
        
        if(rec.entries && rec.entries.length > 0){
          careerHtml += `<table style="width:100%;font-size:12px;border-collapse:collapse">`;
          careerHtml += `<thead><tr style="background:#f0f0f0">
            <th style="padding:4px;text-align:left">学生</th>
            <th style="padding:4px;text-align:center">排名</th>
            <th style="padding:4px;text-align:center">分数</th>
            <th style="padding:4px;text-align:center">贡献值</th>
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
            
            // 计算该学生在本场的贡献值
            const contribution = calculateStudentContribution(e, rec.name);
            
            careerHtml += `<tr style="border-bottom:1px solid #eee">`;
            careerHtml += `<td style="padding:4px">${e.name}</td>`;
            careerHtml += `<td style="padding:4px;text-align:center">${rankText}</td>`;
            careerHtml += `<td style="padding:4px;text-align:center">${scoreText}</td>`;
            careerHtml += `<td style="padding:4px;text-align:center;color:#1976d2">${contribution.toFixed(2)}</td>`;
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

    let timelineHtml = '';
    if (week > 0) {
      timelineHtml += `<div style="margin-top:12px"><h4>📅 时间轴进度</h4></div>`;
      timelineHtml += `<div style="margin-top:8px;padding:12px;background:#f9f9f9;border-radius:8px">`;
      
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

      const lastCompWeek = competitions.length ? Math.max(...competitions.map(c => Number(c.week) || 0)) : 0;
      const maxWeeks = Math.max(week, lastCompWeek, typeof SEASON_WEEKS !== 'undefined' ? SEASON_WEEKS : 40);
      
      const progressPercent = Math.min(100, (week / maxWeeks) * 100);
      
      timelineHtml += `<div style="position:relative;height:20px;background:#e0e0e0;border-radius:10px;margin-bottom:12px">`;
      timelineHtml += `<div style="height:100%;background:linear-gradient(90deg, #4caf50, #2196f3);border-radius:10px;width:${progressPercent}%" title="进度：第${week}周"></div>`;
      timelineHtml += `<div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);color:white;font-size:12px;font-weight:bold">第 ${week} 周</div>`;
      timelineHtml += `</div>`;
      
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
    
    // 计算表现分
    const performanceScoreData = calculatePerformanceScore(o);
    
    el.innerHTML = `
      ${o.isDailyChallenge ? `<div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:12px 16px;border-radius:8px;margin-bottom:16px;text-align:center;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        <div style="font-size:16px;font-weight:bold;margin-bottom:4px">📅 今日挑战</div>
        <div style="font-size:13px;opacity:0.9">${o.dailyChallengeDate || '日期未知'} · 种子: ${o.dailyChallengeSeed || 'N/A'}</div>
      </div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <h4>📈 基本信息</h4>
          <div style="background:#f9f9f9;padding:12px;border-radius:8px">
            <div>游戏难度: <strong style="color:${diffInfo.color}">${diffInfo.emoji} ${diffInfo.text}</strong></div>
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
        <div>
          <h4> 表现分</h4>
          <div style="background:#f9f9f9;padding:12px;border-radius:8px">
            <div style="font-size:20px;font-weight:bold;color:#1976d2;margin-bottom:8px">${performanceScoreData.totalScore.toFixed(2)}</div>
            <div style="font-size:12px;color:#666">基于比赛成绩计算</div>
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

/* =========== 表现分计算函数 =========== */
/**
 * 比赛含金量配置
 */
const CONTEST_VALUE_MAP = {
  'CSP-S1': 1,
  'CSP-S2': 1.5,
  'NOIP': 4,
  '省选': 0,
  'NOI': 8,
  'CTS': 0,
  'CTT': 0,
  'IOI': 16
};

/**
 * 计算单个学生在某场比赛的贡献值
 * @param {Object} entry - 学生比赛记录
 * @param {string} contestName - 比赛名称
 * @returns {number} - 贡献值
 */
function calculateStudentContribution(entry, contestName) {
  // 如果学生未参加比赛，贡献为0
  if (entry.eligible === false || !entry.score && entry.score !== 0) {
    return 0;
  }
  
  // 获取比赛含金量
  const contestValue = CONTEST_VALUE_MAP[contestName] || 0;
  if (contestValue === 0) {
    return 0; // 省选、CTS、CTT等比赛不计分
  }
  
  // 获取分数（优先使用total，其次score）
  let score = entry.total != null ? entry.total : (entry.score != null ? entry.score : 0);
  score = Number(score);
  
  // 对分数进行对数缩放（避免多个低分大于单个高分）
  // 使用 log(score + 1) 避免log(0)的问题
  // 为了让分数更有区分度，使用 log10(score + 10)
  const logScore = Math.log10(Math.max(1, score + 10));
  
  // 计算贡献值 = 对数分数 × 比赛含金量
  const contribution = logScore * contestValue;
  
  return contribution;
}

/**
 * 计算某场比赛的总表现分
 * @param {Object} contestRecord - 比赛记录
 * @returns {number} - 该场比赛的表现分
 */
function calculateContestPerformanceScore(contestRecord) {
  if (!contestRecord || !contestRecord.entries || !Array.isArray(contestRecord.entries)) {
    return 0;
  }
  
  let totalScore = 0;
  for (let entry of contestRecord.entries) {
    totalScore += calculateStudentContribution(entry, contestRecord.name);
  }
  
  return totalScore;
}

/**
 * 计算整个生涯的表现分
 * @param {Object} gameData - 游戏数据
 * @returns {Object} - { totalScore: number, byContest: Array }
 */
function calculatePerformanceScore(gameData) {
  const result = {
    totalScore: 0,
    byContest: []
  };
  
  if (!gameData || !gameData.careerCompetitions || !Array.isArray(gameData.careerCompetitions)) {
    return result;
  }
  
  for (let contestRecord of gameData.careerCompetitions) {
    const contestScore = calculateContestPerformanceScore(contestRecord);
    result.totalScore += contestScore;
    result.byContest.push({
      name: contestRecord.name,
      week: contestRecord.week,
      score: contestScore
    });
  }
  
  return result;
}

function calculateFinalEnding(gameData, endingReason) {
  try {
    const activeStudents = (gameData.students || []).filter(s => s && s.active !== false).length;
    
    const norm = normalizeEndingReason(endingReason);
    
    if(norm === 'AKIOI'){
      return "👑 AKIOI";
    }
    
    if(norm === '顶尖结局'){
      return "🌟 顶尖结局";
    }
    
    if (gameData.inNationalTeam === true) {
      return "🌟 荣耀结局";
    }
    
    if (gameData.budget <= 0) {
      return "💸 经费耗尽结局";
    }
    
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

function outingTrainingUI() {
    showModal(`<h3>外出集训</h3>
      <label class="block">难度</label>
      <select id="out-diff"><option value="1">基础班</option><option value="2">提高班</option><option value="3">冲刺班</option></select>
      <label class="block">地点</label>
      <div id="out-prov-grid" class="prov-grid"></div>
      <label class="block">选择学生（点击卡片选择参加）</label>
      <div id="out-student-grid" class="student-grid" style="max-height:180px;overflow:auto;border:1px solid #eee;padding:6px;margin-bottom:8px"></div>
      
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
    if(outGrid.firstChild) outGrid.firstChild.classList.add('selected');
    
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
    
    const outStudentGrid = document.getElementById('out-student-grid');
    const activeStudents = game.students.filter(s=>s && s.active);
    activeStudents.forEach(s => {
      // 获取学生的晋级状态
      const qualificationInfo = getStudentQualificationStatus(s);
      
      const card = document.createElement('div');
      card.className = 'student-card';
      card.style.cssText = 'display:inline-block;padding:6px;margin:4px;border:1px solid #ddd;border-radius:6px;cursor:pointer;min-width:120px;text-align:left;font-size:13px;opacity:0.45';
      card.dataset.name = s.name;
      card.dataset.selected = '0';
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
      card.innerHTML = `<strong style="display:block">${s.name} ${qualificationInfo.html}</strong>
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
    function updateOutingCostPreview(){
      const selectedCount = Array.from(document.querySelectorAll('#out-student-grid .student-card')).filter(c=>c.dataset.selected==='1').length || 0;
      const d = parseInt($('out-diff').value);
      const p = parseInt(document.querySelector('#out-prov-grid .prov-btn.selected').dataset.val);
      const baseCost = computeOutingCostQuadratic(d, p, selectedCount);
      
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
    document.getElementById('out-diff').onchange = updateOutingCostPreview;
    Array.from(document.querySelectorAll('#out-prov-grid .prov-btn')).forEach(b => { b.onclick = (ev) => { document.querySelectorAll('#out-prov-grid .prov-btn').forEach(bb => bb.classList.remove('selected')); b.classList.add('selected'); updateOutingCostPreview(); }; });
    updateOutingCostPreview();
    $('out-go').onclick = () => {
      const d = parseInt($('out-diff').value);
      const p = parseInt(document.querySelector('#out-prov-grid .prov-btn.selected').dataset.val);
      const selectedNames = Array.from(document.querySelectorAll('#out-student-grid .student-card')).filter(c=>c.dataset.selected==='1').map(c=>c.dataset.name);
      if(!selectedNames || selectedNames.length === 0){ alert('请至少选择一名学生参加集训！'); return; }
      
      const selectedTalents = Array.from(document.querySelectorAll('#out-talent-grid .talent-card')).filter(c=>c.dataset.selected==='1').map(c=>c.dataset.talent);
      
      closeModal();
      outingTrainingWithSelection(d, p, selectedNames, selectedTalents);
      safeWeeklyUpdate(1);
      renderAll();
    };
}
