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
      
      // 延迟关闭弹窗，显示最终结果
      setTimeout(() => {
        const modalRoot = document.getElementById('modal-root');
        if(modalRoot) modalRoot.innerHTML = '';
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
      }, 2000);
    });
  }

  /**
   * 渲染学生面板
   */
  function renderStudentPanels(simulator){
    const container = document.getElementById('student-panels');
    if(!container) return;

    let html = '';
    for(let state of simulator.students){
      const s = state.student;
      html += `
        <div class="student-panel" id="student-panel-${s.name}">
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
    for(let state of simulator.students){
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
   * 更新学生面板
   */
  function updateStudentPanels(students, simulator){
    for(let state of students){
      const s = state.student;
      
      // 更新总分
      const scoreEl = document.getElementById(`score-${s.name}`);
      if(scoreEl){
        scoreEl.textContent = state.totalScore;
      }

      // 更新当前题目
      const currentEl = document.getElementById(`current-${s.name}`);
      if(currentEl){
        if(state.currentTarget !== null){
          const prob = state.getProblem(state.currentTarget);
          const thinking = Math.floor(state.thinkingTime);
          currentEl.textContent = `T${state.currentTarget + 1} (${thinking}分钟)`;
        } else {
          currentEl.textContent = '未选题';
        }
      }

      // 更新题目状态
      for(let prob of state.problems){
        const probEl = document.getElementById(`prob-${s.name}-${prob.id}`);
        if(probEl){
          probEl.className = 'problem-item ' + (prob.solved ? 'solved' : (prob.maxScore > 0 ? 'partial' : 'unattempted'));
          const scoreSpan = probEl.querySelector('.problem-score');
          if(scoreSpan){
            scoreSpan.textContent = prob.maxScore;
          }
        }
      }
    }
  }

  /**
   * 添加日志条目到日志面板
   */
  function addLogEntry(log){
    const logPanel = document.getElementById('contest-log-panel');
    if(!logPanel) return;

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
    
    // 自动滚动到底部
    logPanel.scrollTop = logPanel.scrollHeight;
  }

  /**
   * 显示比赛结果弹窗（简化版，详细结果由主脚本处理）
   */
  function showContestResultModal(students, config, game){
    const modalRoot = document.getElementById('modal-root');
    if(!modalRoot) return;

    let html = `<div class="modal"><div class="dialog"><h2>${config.name} - 比赛结果</h2><table class="result-table">
      <thead><tr><th>学生</th><th>总分</th><th>题目详情</th></tr></thead><tbody>`;

    for(let state of students){
      const s = state.student;
      let problemDetails = '';
      for(let prob of state.problems){
        const status = prob.solved ? '✓' : (prob.maxScore > 0 ? `${prob.maxScore}分` : '×');
        problemDetails += `T${prob.id+1}:${status} `;
      }

      html += `<tr>
        <td>${s.name}</td>
        <td>${state.totalScore}</td>
        <td>${problemDetails}</td>
      </tr>`;
    }

    html += `</tbody></table>
      <button onclick="closeModal()" class="btn">确定</button></div></div>`;

    modalRoot.innerHTML = html;
  }

  /* ========== 导出到全局 ========== */
  const ContestUI = {
    showContestLiveModal,
    showContestResultModal,
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
