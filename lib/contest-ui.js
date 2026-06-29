/* contest-ui.js - 比赛模拟GUI组件
   提供实时比赛进度显示、学生状态监控等UI功能
*/

(function(global){
  'use strict';

  // 简单 HTML 转义，避免日志内容破坏布局或注入
  function escapeHtml(str){
    if(typeof str !== 'string') return String(str||'');
    return str.replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[ch];
    });
  }

  /**
   * 创建比赛实时监控弹窗
   * @param {ContestSimulator} simulator - 比赛模拟器实例
   * @param {Function} onFinish - 比赛结束后的回调
   */
  function showContestLiveModal(simulator, onFinish){
    const modalRoot = document.getElementById('modal-root');
    if(!modalRoot) {
      console.error('Modal root element not found');
      return;
    }

    // 清理旧的弹窗内容以释放内存
    const oldModal = modalRoot.querySelector('.modal');
    if(oldModal){
      // 移除所有事件监听器
      const oldButtons = oldModal.querySelectorAll('button');
      oldButtons.forEach(btn => {
        const clone = btn.cloneNode(true);
        if(btn.parentNode) btn.parentNode.replaceChild(clone, btn);
      });
      modalRoot.innerHTML = '';
    }

    const html = `
      <div class="modal" style="z-index:2000"> <!-- contest modal priority -->
        <div class="dialog" style="max-width:95%;max-height:95%;">
          <div class="contest-live-container" style="display:flex;gap:15px;">
            
            <!-- 左侧：学生状态面板 -->
            <div style="flex:2;">
              <h2>${simulator.config.name} - 实时模拟</h2>
              
              <div class="contest-header">
                <div class="time-info">
                  <span id="contest-current-time">0</span> / ${simulator.config.duration} 分钟
                </div>
                <div class="progress-bar-container">
                  <div id="contest-progress-bar" class="progress-bar" style="width: 0%"></div>
                </div>
              </div>

              <div class="student-panels" id="student-panels">
                <!-- 学生面板将动态生成 -->
              </div>

              <div class="contest-controls">
                <button id="contest-pause-btn" class="btn">暂停</button>
                <button id="contest-resume-btn" class="btn" style="display:none">继续</button>
                <button id="contest-skip-btn" class="btn">跳过 (快进10轮)</button>
                <button id="contest-finish-btn" class="btn" style="display:none">结束比赛</button>
              </div>
            </div>

            <!-- 右侧：比赛日志面板 -->
            <div style="flex:1;display:flex;flex-direction:column;">
              <h3 style="margin:0 0 10px 0;">比赛日志</h3>
              <div id="contest-log-panel" style="
                flex:1;
                background:#f9f9f9;
                border:1px solid #ddd;
                border-radius:4px;
                padding:10px;
                overflow-y:auto;
                max-height:600px;
                font-size:12px;
                font-family:monospace;
              ">
                <!-- 日志条目将动态添加 -->
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    modalRoot.innerHTML = html;

  // 抑制事件弹窗在比赛实时弹窗打开时打断（备份并覆盖 showEventModal）
  const originalShowEventModal = window.showEventModal;
  window.__contest_live_modal_active = true;
  window.showEventModal = function(evt){ try{ if(window.pushEvent) window.pushEvent(evt); }catch(e){} };

    // 初始化学生面板
    renderStudentPanels(simulator);

    // 绑定控制按钮
    const pauseBtn = document.getElementById('contest-pause-btn');
    const resumeBtn = document.getElementById('contest-resume-btn');
    const skipBtn = document.getElementById('contest-skip-btn');
    const finishBtn = document.getElementById('contest-finish-btn');

    pauseBtn.addEventListener('click', () => {
      simulator.pause();
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'inline-block';
    });

    resumeBtn.addEventListener('click', () => {
      resumeBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-block';
      simulator.isRunning = true;
      setTimeout(() => simulator.runTick(), 1000);
    });

    skipBtn.addEventListener('click', () => {
      // 快进10轮（如果剩余不足10轮则为剩余轮数）
      const remaining = simulator.maxTicks - simulator.currentTick;
      const skipCount = Math.min(10, remaining);
      
      if(skipCount > 0 && simulator.isRunning){
        // 快速执行多轮，不等待动画
        for(let i = 0; i < skipCount; i++){
          // 对每个学生进行一次模拟
          for(let state of simulator.students){
            simulator.simulateStudentTick(state);
          }
          simulator.currentTick++;
          
          // 更新UI（仅最后一次）
          if(i === skipCount - 1){
            for(let cb of simulator.tickCallbacks){
              try{
                cb(simulator.currentTick, simulator.maxTicks, simulator.students);
              }catch(e){
                console.error('Tick callback error:', e);
              }
            }
          }
        }
        
        // 检查是否结束
        if(simulator.currentTick >= simulator.maxTicks){
          simulator.finish();
        }
      }
    });

    finishBtn.addEventListener('click', () => {
      simulator.finish();
    });

    // 注册tick更新回调
    simulator.onTick((tick, maxTicks, students) => {
      updateContestProgress(tick, maxTicks, simulator);
      updateStudentPanels(students, simulator);
    });

    // 注册日志回调 - 实时显示日志
    simulator.onLog((log) => {
      addLogEntry(log);
    });

    // 注册完成回调
    simulator.onFinish((students, config) => {
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'none';
      finishBtn.style.display = 'inline-block';
      
      // 防止重复触发完成回调
      if(simulator._finishCallbackTriggered){
        console.warn('Contest finish callback already triggered, skipping');
        return;
      }
      simulator._finishCallbackTriggered = true;
      
      // 添加比赛结束提示，但不自动关闭弹窗
      const logContainer = document.getElementById('contest-log');
      if(logContainer){
        const endMsg = document.createElement('div');
        endMsg.className = 'log-entry log-info';
        endMsg.innerHTML = '<strong style="color: #2563eb; font-size: 16px;">🏁 比赛结束！您可以继续查看日志，点击"查看成绩"按钮继续。</strong>';
        logContainer.appendChild(endMsg);
        logContainer.scrollTop = logContainer.scrollHeight;
      }
      
      // 修改"查看成绩"按钮的行为：点击时才关闭弹窗并显示成绩
      finishBtn.onclick = () => {
        const modalRoot = document.getElementById('modal-root');
        
        // 清理所有回调以释放内存
        try{
          simulator.tickCallbacks = [];
          simulator.logCallbacks = [];
          simulator.finishCallbacks = [];
        }catch(e){}
        
        // 清理DOM
        if(modalRoot){
          // 移除所有事件监听器
          const allButtons = modalRoot.querySelectorAll('button');
          allButtons.forEach(btn => {
            const clone = btn.cloneNode(true);
            if(btn.parentNode) btn.parentNode.replaceChild(clone, btn);
          });
          modalRoot.innerHTML = '';
        }
        
        // 恢复事件弹窗函数
        try{ window.showEventModal = originalShowEventModal; }catch(e){}
        // mark modal as inactive before flushing deferred weeks
        window.__contest_live_modal_active = false;

        // If any weekly advances were deferred while the contest modal was active,
        // flush them now so that week-dependent events and UI updates run.
        try{
          const deferred = window.__deferred_week_advances || 0;
          if(deferred && typeof safeWeeklyUpdate === 'function'){
            // consume and clear
            window.__deferred_week_advances = 0;
            console.log('Flushing deferred weekly advances after contest:', deferred);
            // advance weeks and render
            try{ safeWeeklyUpdate(deferred); }catch(e){ console.error('Error flushing deferred weeks', e); }
          }
        }catch(e){ /* ignore */ }

        // finally refresh UI and call onFinish
        try{ window.renderAll(); }catch(e){}
        if(typeof onFinish === 'function'){
          onFinish(students, config);
        }
      };
    });
  }

  /**
   * 渲染学生面板
   */
  function renderStudentPanels(simulator){
    const container = document.getElementById('student-panels');
    if(!container) return;

    // 按得分降序排序
    const sortedStudents = [...simulator.students].sort((a, b) => b.totalScore - a.totalScore);

    let html = '';
    for(let i = 0; i < sortedStudents.length; i++){
      const state = sortedStudents[i];
      const s = state.student;
      html += `
        <div class="student-panel" id="student-panel-${s.name}" data-rank="${i + 1}" data-score="${state.totalScore}">
          <div class="student-name">${s.name}</div>
          <div class="student-score">总分: <span id="score-${s.name}">0</span></div>
          <div class="student-current-problem">
            当前: <span id="current-${s.name}">未选题</span>
          </div>
          <div class="student-problems" id="problems-${s.name}">
            <!-- 题目状态 -->
          </div>
        </div>
      `;
    }
    container.innerHTML = html;

    // 初始化题目状态
    for(let state of sortedStudents){
      renderProblemStatus(state);
    }
  }

  /**
   * 渲染单个学生的题目状态
   */
  function renderProblemStatus(state){
    const container = document.getElementById(`problems-${state.student.name}`);
    if(!container) return;

    let html = '<div class="problem-grid">';
    for(let prob of state.problems){
      const statusClass = prob.solved ? 'solved' : (prob.maxScore > 0 ? 'partial' : 'unattempted');
      html += `
        <div class="problem-item ${statusClass}" id="prob-${state.student.name}-${prob.id}">
          <div class="problem-id">T${prob.id + 1}</div>
          <div class="problem-score">${prob.maxScore}</div>
        </div>
      `;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * 更新比赛进度条
   */
  function updateContestProgress(tick, maxTicks, simulator){
    const currentTimeEl = document.getElementById('contest-current-time');
    const progressBar = document.getElementById('contest-progress-bar');

    if(currentTimeEl){
      // tick may be 0..maxTicks; simulator.TICK_INTERVAL is defined in competitions.js as constant
      const interval = (typeof simulator.constructor.TICK_INTERVAL !== 'undefined') ? simulator.constructor.TICK_INTERVAL : 10;
      const minutes = Number(tick) * Number(interval);
      currentTimeEl.textContent = isFinite(minutes) ? Math.floor(minutes) : 0;
    }

    if(progressBar){
      const safeTick = Math.max(0, Math.min(Number(tick), Number(maxTicks) || 1));
      const safeMax = (Number(maxTicks) > 0) ? Number(maxTicks) : 1;
      const progress = (safeTick / safeMax) * 100;
      progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
  }

  /**
   * 更新学生面板（带滚榜动画效果）
   */
  function updateStudentPanels(students, simulator){
    const container = document.getElementById('student-panels');
    if(!container) return;

    // 按分数降序排列
    const sortedStudents = [...students].sort((a, b) => {
      if(b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.student.name.localeCompare(b.student.name);
    });

    // 记录旧位置
    const currentPositions = new Map();
    for(const state of students){
      const panel = document.getElementById(`student-panel-${state.student.name}`);
      if(panel){
        const rect = panel.getBoundingClientRect();
        currentPositions.set(state.student.name, { top: rect.top, panel });
      }
    }

    // 计算新排名
    const newRankings = new Map();
    sortedStudents.forEach((state, index) => newRankings.set(state.student.name, index + 1));

    // 更新每个学生的分数、当前题目和题目状态（DOM 内容更新，不引发重新排序）
    for(const state of students){
      const s = state.student;
      const panel = document.getElementById(`student-panel-${s.name}`);
      if(!panel) continue;

      // 更新分数
      const scoreEl = document.getElementById(`score-${s.name}`);
      if(scoreEl) scoreEl.textContent = String(state.totalScore);

      // 更新当前题目显示
      const currentEl = document.getElementById(`current-${s.name}`);
      if(currentEl){
        if(state.currentTarget !== null){
          const prob = state.getProblem(state.currentTarget);
          const thinking = Math.floor(state.thinkingTime);
          currentEl.textContent = `T${state.currentTarget + 1} (${thinking}分)`;
        } else {
          currentEl.textContent = '未选题';
        }
      }

      // 更新题目状态
      for(const prob of state.problems){
        const probEl = document.getElementById(`prob-${s.name}-${prob.id}`);
        if(!probEl) continue;
        const oldClass = probEl.className;
        const newClass = 'problem-item ' + (prob.solved ? 'solved' : (prob.maxScore > 0 ? 'partial' : 'unattempted'));
        if(oldClass !== newClass){
          probEl.className = newClass;
          probEl.classList.add('problem-update-animation');
          setTimeout(() => probEl.classList.remove('problem-update-animation'), 600);
        }
        const scoreSpan = probEl.querySelector('.problem-score');
        if(scoreSpan) scoreSpan.textContent = String(prob.maxScore);
      }

      // 记录新属性用于后续比较（但不要在此处改变 DOM 顺序）
      const oldRank = parseInt(panel.getAttribute('data-rank')) || 0;
      const newRank = newRankings.get(s.name);
      panel.setAttribute('data-rank-before-update', String(oldRank));
      panel.setAttribute('data-rank', String(newRank));
      panel.setAttribute('data-score', String(state.totalScore));
    }

    // ========== 优化的 FLIP 动画实现 ==========
    const ANIM_MS = 350;

    // 锁定容器高度，避免在重排期间出现折叠空白
    const containerHeight = container.offsetHeight;
    if(containerHeight) container.style.minHeight = containerHeight + 'px';

    // 先按新顺序将面板重新挂回容器（禁用过渡）
    const panels = [];
    for(const state of sortedStudents){
      const panel = document.getElementById(`student-panel-${state.student.name}`);
      if(panel){ panel.style.transition = 'none'; panels.push(panel); container.appendChild(panel); }
    }

    // 强制重排以获得新位置
    container.offsetHeight;

    // 计算新位置并设置初始 transform
    const newPositions = new Map();
    for(const panel of panels){
      const rect = panel.getBoundingClientRect();
      const name = panel.id.replace(/^student-panel-/, '');
      newPositions.set(name, rect.top);
    }

    for(const panel of panels){
      const name = panel.id.replace(/^student-panel-/, '');
      const old = currentPositions.get(name);
      const newTop = newPositions.get(name);
      if(old && typeof newTop === 'number'){
        const delta = old.top - newTop;
        if(Math.abs(delta) > 1){
          panel.style.transform = `translate3d(0, ${delta}px, 0)`;
          // Ensure the panel is on its own composite layer
          panel.style.willChange = 'transform';
        } else {
          panel.style.transform = '';
        }
      }
    }

    // 双重 rAF 启动动画：第二帧开启过渡并回到 0
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        for(const panel of panels){
          panel.style.transition = `transform ${ANIM_MS}ms cubic-bezier(.2,.8,.2,1), box-shadow ${Math.min(200, ANIM_MS)}ms ease`;
          panel.style.transform = 'translate3d(0,0,0)';

          const oldRankB = parseInt(panel.getAttribute('data-rank-before-update')) || 0;
          const newRankB = parseInt(panel.getAttribute('data-rank')) || 0;
          if(oldRankB > 0 && newRankB < oldRankB){
            panel.style.boxShadow = '0 6px 22px rgba(34, 197, 94, 0.38)';
            setTimeout(() => { panel.style.boxShadow = ''; }, ANIM_MS + 30);
          }
        }

        // 清理：在动画后移除临时样式并允许容器收缩
        setTimeout(() => {
          for(const panel of panels){
            try{ panel.style.transition = ''; panel.style.transform = ''; panel.style.willChange = ''; }catch(e){}
          }
          container.style.minHeight = '';
        }, ANIM_MS + 60);
      });
    });
  }

  /**
   * 添加日志条目到日志面板（带限制以防止内存泄漏）
   */
  function addLogEntry(log){
    const logPanel = document.getElementById('contest-log-panel');
    if(!logPanel) return;

    // 限制日志条目数量，超过300条时移除最旧的
    const MAX_LOG_ENTRIES = 300;
    if(logPanel.childElementCount >= MAX_LOG_ENTRIES){
      // 移除最旧的50条日志
      for(let i = 0; i < 50 && logPanel.firstChild; i++){
        logPanel.removeChild(logPanel.firstChild);
      }
    }

    // 根据日志类型设置颜色
    let color = '#333';
    let icon = '•';
    switch(log.type){
      case 'talent':
        color = '#d946ef'; // 紫色 - 天赋触发
        icon = '✦';
        break;
      case 'solve':
        color = '#22c55e'; // 绿色 - AC
        icon = '✓';
        break;
      case 'select':
        color = '#3b82f6'; // 蓝色 - 选题
        icon = '→';
        break;
      case 'skip':
        color = '#f59e0b'; // 橙色 - 跳题
        icon = '↷';
        break;
      case 'info':
      default:
        color = '#666';
        icon = '•';
        break;
    }

    const timeStr = `${Math.floor(log.time)}分`;
    const entry = document.createElement('div');
    entry.style.cssText = `
      margin-bottom:4px;
      padding:4px 6px;
      border-left:3px solid ${color};
      background:${log.type === 'talent' ? '#faf5ff' : '#fff'};
      border-radius:2px;
    `;
    // 如果是天赋日志并提供了 studentName，则前置发动者名
    let messageHtml = '';
    if(log.type === 'talent' && log.studentName){
      // 尝试基于天赋名获取颜色（message 可能包含天赋名或 TalentManager 可被查询）
      let talentColor = color;
      try{
        // 如果 message 包含天赋名的关键字（常见格式如 '激进风格：'），不强求；优先使用 TalentManager 提供的颜色
        if(window.TalentManager && typeof window.TalentManager.getTalentInfo === 'function'){
          // 找到第一个该学生所持有的天赋并使用其颜色（更准确的做法需要在 log 中存储天赋名）
          const s = window.game && window.game.students && window.game.students.find(st => st.name === log.studentName);
          if(s && s.talents && s.talents.size > 0){
            const first = Array.from(s.talents)[0];
            const info = window.TalentManager.getTalentInfo(first);
            if(info && info.color) talentColor = info.color;
          }
        }
      }catch(e){/* ignore */}

      messageHtml = `<strong style="color:${talentColor};margin-right:6px">${log.studentName}：</strong>${escapeHtml(log.message)}`;
    } else {
      messageHtml = escapeHtml(log.message);
    }

    entry.innerHTML = `
      <span style="color:${color};font-weight:bold;margin-right:4px;">${icon}</span>
      <span style="color:#999;font-size:10px;margin-right:6px;">[${timeStr}]</span>
      <span style="color:${color};">${messageHtml}</span>
    `;

    logPanel.appendChild(entry);
    
    // 智能自动滚动：仅当用户已在底部附近时才自动滚到底部
    // 如果用户手动向上滚动了，则不强制滚动，允许自由查看历史日志
    const isNearBottom = logPanel.scrollHeight - logPanel.scrollTop - logPanel.clientHeight < 50;
    if(isNearBottom){
      logPanel.scrollTop = logPanel.scrollHeight;
    }
  }

  /* ========== 导出到全局 ========== */
  const ContestUI = {
    showContestLiveModal,
    renderStudentPanels,
    updateStudentPanels,
    updateContestProgress,
    addLogEntry
  };

  if(typeof window !== 'undefined'){
    window.ContestUI = ContestUI;
  }

  global.ContestUI = ContestUI;

})(window);
