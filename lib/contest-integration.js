/* contest-integration.js - 将新比赛引擎集成到主游戏脚本
   提供替换旧 holdCompetitionModal 和 holdMockContestModal 的新函数
*/

(function(global){
  'use strict';

  /**
   * 举办正式比赛（使用新的模拟引擎）
   * @param {Object} comp - 比赛定义 {name, difficulty, maxScore, numProblems, week}
   */
  function holdCompetitionModalNew(comp){
    if(!window.game || !window.CompetitionEngine || !window.ContestUI){
      console.error('Required modules not loaded');
      return;
    }

    const game = window.game;
    
    // 健壮的学生列表获取
    if(!game.students || !Array.isArray(game.students)){
      console.error('game.students is not defined or not an array:', game.students);
      alert('游戏数据异常：学生列表未初始化！');
      return;
    }
    
    // 晋级链检查：为每个学生单独计算晋级情况
    const compOrder = window.COMPETITION_ORDER || ["CSP-S1","CSP-S2","NOIP","省选","NOI"];
    const currentIdx = compOrder.indexOf(comp.name);
    const halfIndex = (game.week > (window.WEEKS_PER_HALF || 13)) ? 1 : 0;
    
    // 初始化晋级资格数据结构
    if(!game.qualification) game.qualification = {};
    if(!game.qualification[halfIndex]) game.qualification[halfIndex] = {};
    
    // 筛选活跃学生并检查晋级资格
    let eligibleStudents = [];
    let ineligibleStudents = [];
    
    console.log(`[比赛开始] ${comp.name}, 赛季 ${halfIndex}, 第 ${game.week} 周`);
    
    // 显示当前赛季的晋级资格状态
    if(game.qualification && game.qualification[halfIndex]){
      console.log(`[当前赛季晋级状态]`, game.qualification[halfIndex]);
    } else {
      console.log(`[当前赛季晋级状态] 无晋级记录`);
    }
    
    for(let s of game.students){
      if(!s || !s.active) continue;
      
      let isEligible = true;
      
      // 如果不是第一场比赛，需要检查上一场比赛的晋级资格
      if(currentIdx > 0){
        const prevComp = compOrder[currentIdx - 1];
        const hasQualification = game.qualification[halfIndex] && 
                                 game.qualification[halfIndex][prevComp] && 
                                 game.qualification[halfIndex][prevComp].has(s.name);
        
        if(!hasQualification){
          isEligible = false;
          console.log(`[晋级检查] ❌ ${s.name} 未晋级 ${prevComp}，无法参加 ${comp.name}`);
        } else {
          console.log(`[晋级检查] ✅ ${s.name} 已晋级 ${prevComp}，可以参加 ${comp.name}`);
        }
      } else {
        console.log(`[晋级检查] ✅ ${s.name} 可以参加 ${comp.name}（首场比赛）`);
      }
      
      if(isEligible){
        eligibleStudents.push(s);
      } else {
        ineligibleStudents.push(s);
      }
    }
    
    console.log(`[参赛统计] ${comp.name}: 有资格 ${eligibleStudents.length} 人, 无资格 ${ineligibleStudents.length} 人`);
    
    // 如果没有学生有资格参赛
    if(eligibleStudents.length === 0){
      console.warn('No eligible students for competition:', comp.name);
      
      // 无论哪个赛季，都先跳过比赛，在结算时再判断是否触发结局
      if(typeof window.pushEvent === 'function'){
        window.pushEvent({
          name: comp.name + ' 跳过',
          description: '没有学生有资格参赛，比赛自动跳过',
          week: game.week
        });
      }
      
      // 标记比赛已完成（避免重复触发）
      if(!game.completedCompetitions) game.completedCompetitions = new Set();
      const compKey = `${halfIndex}_${comp.name}_${comp.week}`;
      game.completedCompetitions.add(compKey);
      
      // 记录到生涯（全员未参加）
      if(!game.careerCompetitions) game.careerCompetitions = [];
      game.careerCompetitions.push({
        week: game.week,
        name: comp.name,
        passedCount: 0,
        totalStudents: 0,
        entries: game.students.filter(s => s.active).map(s => ({
          name: s.name,
          rank: null,
          score: null,
          passed: false,
          eligible: false,
          remark: '未晋级，未参加'
        }))
      });
      
      if(typeof window.renderAll === 'function'){
        window.renderAll();
      }
      return;
    }

    // 构建比赛配置（包含题目、部分分等）
    const contestConfig = window.CompetitionEngine.buildContestConfig(comp);
    
    // 创建模拟器（只包含有资格的学生）
    const simulator = new window.CompetitionEngine.ContestSimulator(
      contestConfig,
      eligibleStudents,
      game
    );

    // 显示实时比赛界面
    window.ContestUI.showContestLiveModal(simulator, (studentStates, config) => {
      // 比赛结束回调：处理结果、晋级、奖励等
      handleCompetitionResults(studentStates, config, comp, ineligibleStudents);
    });

    // 启动模拟
    // 触发模拟赛开始相关天赋（如 原题机（伪））
    for(const s of eligibleStudents){
      try{ if(typeof s.triggerTalents === 'function') s.triggerTalents('mock_start', { contestName: '模拟赛' }); }catch(e){ console.error('triggerTalents mock_start', e); }
    }
    simulator.start();
  }

  /**
   * 处理比赛结果
   * @param {Array} ineligibleStudents - 没有晋级资格的学生列表
   */
  function handleCompetitionResults(studentStates, config, originalComp, ineligibleStudents){
    const game = window.game;
    ineligibleStudents = ineligibleStudents || [];
    
    // 计算晋级线等逻辑（保持与原系统一致）
    const scores = studentStates.map(s => s.totalScore).sort((a,b) => b - a);
    const passRate = getPassRateForCompetition(originalComp.name);
      // determine total max score for this contest (used to compute extra pressure and pass line bounds)
      const totalMax = (config && Array.isArray(config.problems)) ? config.problems.reduce((sum, p) => sum + (p.maxScore || 0), 0) : (originalComp && originalComp.maxScore) || 0;
    const passLine = calculatePassLine(scores, passRate, totalMax, originalComp.name);
      const baseline = totalMax > 0 ? (totalMax / 2.0) : 0;
      const minScore = scores.length ? Math.min.apply(null, scores) : 0;

    // 统计晋级/获奖学生（参赛学生）
    const results = [];
      for(let state of studentStates){
        const s = state.student;
        const score = state.totalScore;
        const passed = score >= passLine;

        // trigger talents for contest finish
        if(typeof s.triggerTalents === 'function'){
          s.triggerTalents('contest_finish', {
            contestName: config.name,
            score: score,
            passed: passed,
            passLine: passLine
          });
        }

        // update base pressure/mental for pass/fail
        if(passed){
          s.pressure = Math.max(0, Number(s.pressure || 0) - 10);
          s.mental = Math.min(100, Number(s.mental || 0) + 3);
        } else {
          s.pressure = Math.min(100, Number(s.pressure || 0) + 15);
          s.mental = Math.max(0, Number(s.mental || 0) - 5);
        }

        // 额外处理：当成绩远离中点/发挥不佳或处于最后一名时，按差距增加额外压力（最大 +15）
        // 计算规则：以 totalMax 的一小块作为单位 (总分/20)，每差一个单位增加 1 点额外压力，最多 15
        let extraPressure = 0;
        if(totalMax > 0){
          const scoreBelow = Math.max(0, baseline - (Number(score) || 0));
          const unit = Math.max(1, totalMax / 20.0);
          extraPressure = Math.min(15, Math.ceil(scoreBelow / unit));
        }
        // 触发条件：未通过 或 成绩低于中点 或 最后一名
        // 只记录额外压力与备注（用于在排行榜中以红色显示），实际的压力增加将在构建完所有结果后统一应用一次并乘以 2
        if((!passed || (baseline > 0 && (Number(score) || 0) < baseline) || (Number(score) || 0) === minScore) && extraPressure > 0){
          // do NOT apply here: s.pressure = ... (we'll apply later once)
          state._extraPressure = extraPressure;
          state._remark = `发挥不佳，压力 +${extraPressure}`;
        } else {
          state._extraPressure = 0;
          state._remark = '';
        }

        // record final result (after pressure updates)
        // medal field: 'gold'|'silver'|'bronze'|null - only used for NOI
        let medal = null;
        if(originalComp && originalComp.name === 'NOI'){
          // medal thresholds are based on the passLine: 100%, 70%, 50% of passLine
          try{
            const pl = Number(state.passLine || passLine || 0);
            const scoreNum = Number(score) || 0;
            if(scoreNum >= pl * 1.0) medal = 'gold';
            else if(scoreNum >= pl * 0.7) medal = 'silver';
            else if(scoreNum >= pl * 0.5) medal = 'bronze';
            else medal = null;
          } catch(e){ medal = null; }
        }

        results.push({
          student: s,
          score: score,
          passed: passed,
          medal: medal,
          problems: state.problems,
          extraPressure: state._extraPressure || 0,
          remark: state._remark || ''
        });
      }

    // 添加未参赛学生到结果（显示为"未参加"，不计算压力）
    for(let s of ineligibleStudents){
      results.push({
        student: s,
        score: null,
        passed: false,
        medal: null,
        problems: null,
        extraPressure: 0,
        remark: '未晋级，未参加',
        notParticipated: true // 标记为未参赛
      });
    }

    // 处理晋级资格（只对参赛学生）
    updateQualifications(results, originalComp.name);

    // 检查晋级人数，如果在第二轮赛季且无人晋级，触发坏结局
    const halfIndex = (game.week > (window.WEEKS_PER_HALF || 13)) ? 1 : 0;
    const passedCount = results.filter(r => !r.notParticipated && r.passed).length;
    
    if(halfIndex === 1 && passedCount === 0){
      // 第二轮赛季且无人晋级，触发晋级链断裂结局
      if(typeof window.pushEvent === 'function'){
        window.pushEvent({
          name: '晋级链断裂',
          description: `${originalComp.name}：没有学生晋级，游戏结束`,
          week: game.week
        });
      }
      
      // 标记赛季结束
      game.seasonEndTriggered = true;
      
      // 保存完整的游戏状态并触发结局
      const ending = "💔 晋级链断裂";
      try{
        // 确保保存完整的游戏对象，包含所有必要字段
        localStorage.setItem('oi_coach_save', JSON.stringify(game));
        localStorage.setItem('oi_coach_ending', ending);
        console.log('[晋级链断裂] 游戏状态已保存，结局：', ending);
      } catch(e){ 
        console.error('Failed to save settlement:', e); 
      }
      
      // 跳转到结算页面
      if(typeof window.showModal === 'function' && typeof window.closeModal === 'function'){
        window.showModal(`<h3>晋级链断裂</h3><div class="small">第二轮赛季${originalComp.name}无学生晋级，游戏结束。</div><div class="modal-actions" style="margin-top:8px"><button class="btn" onclick="(function(){ closeModal(); window.location.href='end.html'; })()">查看结算页面</button></div>`);
      } else {
        alert('晋级链断裂：第二轮赛季无学生晋级，游戏结束。');
        window.location.href = 'end.html';
      }
      return; // 直接返回，不继续后续处理
    }

    // 将记录的 extraPressure 统一应用：实际增加的压力 = 记录值 * 2（只对参赛学生）
    for(let r of results){
      // 跳过未参赛学生
      if(r.notParticipated) continue;
      
      try{
        const ep = Number(r.extraPressure || 0);
        if(ep > 0){
          const s = r.student;
          const applied = Math.min(100, Number(s.pressure || 0) + ep * 2) - Number(s.pressure || 0);
          s.pressure = Math.min(100, Number(s.pressure || 0) + ep * 2);
          // write to game log so pressure increases are visible
          try{ if(typeof log === 'function') log(`[比赛惩罚] ${s.name} 额外压力 +${applied} (记录 ${ep})`); }catch(e){}
        }
      }catch(e){ /* ignore */ }
    }

    // 发放奖励
    const totalReward = distributeRewards(results, originalComp.name);

    // 显示详细结果弹窗
    showDetailedResults(results, config, passLine, totalReward);

    // 标记比赛完成 (与主脚本保持一致的键格式)
    if(!game.completedCompetitions) game.completedCompetitions = new Set();
    const compKey = `${halfIndex}_${originalComp.name}_${originalComp.week}`;
    game.completedCompetitions.add(compKey);

    // 记录职业生涯（只计算参赛学生）
    if(!game.careerCompetitions) game.careerCompetitions = [];
    const participantCount = results.filter(r => !r.notParticipated).length;
    game.careerCompetitions.push({
      week: game.week,
      name: originalComp.name,
      passedCount: passedCount,
      totalStudents: participantCount,
      entries: results.filter(r => !r.notParticipated).map((r, idx) => ({
        name: r.student.name,
        rank: idx + 1,
        score: r.score,
        passed: r.passed,
        medal: r.medal || null,
        remark: r.remark || ''
      }))
    });

    // 刷新UI
    if(typeof window.renderAll === 'function'){
      window.renderAll();
    }
  }

  /**
   * 获取比赛晋级率
   */
  function getPassRateForCompetition(compName){
    const game = window.game;
    let baseRate = 0.5;
    
    if(game.province_type === '强省'){
      baseRate = window.STRONG_PROVINCE_BASE_PASS_RATE || 0.65;
    } else if(game.province_type === '弱省'){
      baseRate = window.WEAK_PROVINCE_BASE_PASS_RATE || 0.4;
    } else {
      baseRate = window.NORMAL_PROVINCE_BASE_PASS_RATE || 0.5;
    }

    // 省选额外加成
    if(compName === '省选'){
      baseRate += (window.PROVINCIAL_SELECTION_BONUS || 0.2);
    }

    return baseRate;
  }

  /**
   * 计算晋级线
   */
  function calculatePassLine(sortedScores, passRate, totalMax, compName){
    // sortedScores: descending order
    if(sortedScores.length === 0) return 0;
    const passCount = Math.max(1, Math.floor(sortedScores.length * passRate));
    let baseLine = sortedScores[passCount - 1] || 0;

    // apply contest-specific minimum/maximum bounds based on totalMax
    if(totalMax && isFinite(totalMax) && totalMax > 0){
      if(compName === 'NOI'){
        // NOI 晋级线最低为总分的80%
        const minLine = totalMax * 0.8;
        baseLine = Math.max(baseLine, minLine);
      } else {
        // 其他比赛晋级线最低为总分30%，最高为总分90%
        const minLine = totalMax * 0.3;
        const maxLine = totalMax * 0.9;
        baseLine = Math.max(baseLine, minLine);
        baseLine = Math.min(baseLine, maxLine);
      }
    }

    return baseLine;
  }

  /**
   * 更新晋级资格
   * 记录：谁晋级了当前比赛（而不是记录到下一场比赛）
   */
  function updateQualifications(results, compName){
    const game = window.game;
    if(!game.qualification) return;

    const compOrder = window.COMPETITION_ORDER || ["CSP-S1","CSP-S2","NOIP","省选","NOI"];
    const currentIdx = compOrder.indexOf(compName);
    if(currentIdx < 0) return;

    // 使用与 holdCompetitionModalNew 一致的赛季索引计算方式
    const seasonIdx = (game.week > (window.WEEKS_PER_HALF || 13)) ? 1 : 0;

    // 记录晋级了当前比赛的学生
    if(!game.qualification[seasonIdx]) game.qualification[seasonIdx] = {};
    if(!game.qualification[seasonIdx][compName]) game.qualification[seasonIdx][compName] = new Set();

    for(let r of results){
      // 只处理参赛且晋级的学生
      if(r.passed && !r.notParticipated){
        game.qualification[seasonIdx][compName].add(r.student.name);
        
        // 日志输出晋级资格记录
        console.log(`[晋级资格记录] 赛季${seasonIdx} ${compName}: ${r.student.name} 晋级`);
      }
    }
    
    // 日志输出当前比赛的晋级人数
    console.log(`[晋级资格汇总] 赛季${seasonIdx} ${compName} 晋级人数: ${game.qualification[seasonIdx][compName].size}`);
    
    // 如果有下一场比赛，显示有多少人有资格参加
    if(currentIdx < compOrder.length - 1){
      const nextComp = compOrder[currentIdx + 1];
      console.log(`[晋级链] ${game.qualification[seasonIdx][compName].size} 人有资格参加 ${nextComp}`);
    }
  }

  /**
   * 发放奖励
   */
  function distributeRewards(results, compName){
    const game = window.game;
    let totalReward = 0;

    // ensure funding is only issued once per competition-week
    try{
      const halfIndex = (game.week > (window.WEEKS_PER_HALF || 13)) ? 1 : 0;
      const fundingKey = `${halfIndex}_${compName}_${game.week}`;
      if(!game.fundingIssued) game.fundingIssued = new Set();
      if(game.fundingIssued.has(fundingKey)){
        console.log('[distributeRewards] funding already issued for', fundingKey);
        return 0;
      }
    }catch(e){ /* ignore and continue */ }

    for(let r of results){
      if(!r.passed || r.notParticipated) continue;

      let reward = 0;
      if(compName === 'NOI'){
        reward = window.uniformInt ? 
          window.uniformInt(window.NOI_REWARD_MIN || 30000, window.NOI_REWARD_MAX || 50000) : 40000;
      } else if(compName === 'NOIP'){
        reward = window.uniformInt ? 
          window.uniformInt(window.NOIP_REWARD_MIN || 10000, window.NOIP_REWARD_MAX || 20000) : 15000;
      } else if(compName === 'CSP-S2'){
        reward = window.uniformInt ? 
          window.uniformInt(window.CSP_S2_REWARD_MIN || 4000, window.CSP_S2_REWARD_MAX || 8000) : 6000;
      } else if(compName === 'CSP-S1'){
        reward = window.uniformInt ? 
          window.uniformInt(window.CSP_S1_REWARD_MIN || 2000, window.CSP_S1_REWARD_MAX || 5000) : 3000;
      }

      totalReward += reward;
    }

    if(totalReward > 0){
      game.budget += totalReward;
      
      // 添加拨款日志
      if(typeof window.log === 'function'){
        window.log(`拨款：${compName} 奖励 ¥${totalReward}`);
      }
      // also push an event so the event/card UI shows the funding information
      try{
        if(typeof window.pushEvent === 'function'){
          window.pushEvent({ name: '拨款', description: `${compName} 奖励 ¥${totalReward}`, week: game.week });
        }
      }catch(e){ /* ignore */ }

      // mark funding as issued for this competition-week
      try{
        const halfIndex = (game.week > (window.WEEKS_PER_HALF || 13)) ? 1 : 0;
        const fundingKey = `${halfIndex}_${compName}_${game.week}`;
        if(!game.fundingIssued) game.fundingIssued = new Set();
        game.fundingIssued.add(fundingKey);
      }catch(e){ /* ignore */ }
    }
    
    return totalReward;
  }

  /**
   * 显示详细结果
   */
  function showDetailedResults(results, config, passLine, totalReward){
    const game = window.game;
    const modalRoot = document.getElementById('modal-root');
      if(!modalRoot) return;
      
      // 防止重复弹窗：检查是否已经显示过该比赛的结果
      const resultKey = `${config.name}_${game.week}`;
      if(!window._shownContestResults) window._shownContestResults = new Set();
      if(window._shownContestResults.has(resultKey)){
        console.warn('Contest result modal already shown for:', resultKey);
        return;
      }
      window._shownContestResults.add(resultKey);
      
      // 如果已有模态存在，则避免再次打开比赛结果（防止重复弹窗）
      try{
        if(modalRoot.children && modalRoot.children.length > 0){
          // already a modal open; skip showing duplicate detailed results
          console.warn('Detailed contest results suppressed because a modal is already open');
          // 移除标记，允许稍后重试
          window._shownContestResults.delete(resultKey);
          return;
        }
      }catch(e){ /* ignore and continue */ }

    // 生成题目信息表头
    let problemHeaders = '';
    if(config.problems && config.problems.length > 0){
      for(let prob of config.problems){
  // 显示为两个维度的难度：思维难度 / 代码难度（使用该题最后一档的值代表题目总体难度）
        const tagsLabel = (prob.tags && prob.tags.length > 0) ? prob.tags.join(',') : '';
        let thinking = '?';
        let tcoding = '?';
        try{
          const last = Array.isArray(prob.subtasks) && prob.subtasks.length ? prob.subtasks[prob.subtasks.length - 1] : null;
          if(last){
            if(typeof last.thinkingDifficulty === 'number') thinking = last.thinkingDifficulty;
            else if(typeof prob.thinkingDifficulty === 'number') thinking = prob.thinkingDifficulty;
            if(typeof last.codingDifficulty === 'number') tcoding = last.codingDifficulty;
            else if(typeof prob.codingDifficulty === 'number') tcoding = prob.codingDifficulty;
          }
        }catch(e){ /* ignore */ }
        problemHeaders += `<th style="font-size:11px;">
          T${prob.id+1}<br/>
          <span style="color:#888;">思维:${thinking} / 代码:${tcoding}</span><br/>
          <span style="color:#666;font-size:10px;">${tagsLabel}</span>
        </th>`;
      }
    }

    let html = `<div class="modal"><div class="dialog" style="max-width:90%;max-height:90%;overflow:auto;">
      <h2>${config.name} - 比赛结果</h2>
      <p>晋级线：<strong>${passLine.toFixed(1)}</strong> 分</p>
      <table class="result-table" style="font-size:13px;">
        <thead>
          <tr>
            <th>学生</th>
            ${problemHeaders}
            <th>总分</th>
            <th>结果</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>`;

    for(let r of results){
      const s = r.student;
      
      // 处理未参赛学生
      if(r.notParticipated){
        let emptyProblemCells = '';
        if(config.problems && config.problems.length > 0){
          for(let i = 0; i < config.problems.length; i++){
            emptyProblemCells += `<td style="color:#ccc;text-align:center;">-</td>`;
          }
        }
        
        html += `<tr style="background-color:#f5f5f5;">
          <td><strong>${s.name}</strong></td>
          ${emptyProblemCells}
          <td style="color:#999;text-align:center;">-</td>
          <td><span style="color:#999">未参加</span></td>
          <td><span style="color:#999">${r.remark}</span></td>
        </tr>`;
        continue;
      }
      
      // 生成每题得分单元格（参赛学生）
      let problemCells = '';
      for(let prob of r.problems){
  const scoreNum = Number(prob.maxScore || 0);
  const scoreDisplay = scoreNum > 0 ? scoreNum.toFixed(0) : '0';
        const acMark = prob.solved ? ' ✓' : '';
        const colorClass = prob.solved ? 'color:green;font-weight:bold;' : (prob.maxScore > 0 ? 'color:orange;' : 'color:gray;');
        problemCells += `<td style="${colorClass}">${scoreDisplay}${acMark}</td>`;
      }

        let resultText = '';
        if(config && config.name === 'NOI'){
          if(r.medal === 'gold') resultText = '<span style="color:#e6b422;font-weight:700">🥇 金牌</span>';
          else if(r.medal === 'silver') resultText = '<span style="color:#b0b0b0;font-weight:700">🥈 银牌</span>';
          else if(r.medal === 'bronze') resultText = '<span style="color:#cd7f32;font-weight:700">🥉 铜牌</span>';
          else resultText = '<span style="color:#999">未获得奖牌</span>';
        } else {
          resultText = r.passed ? '<span style="color:#38a169;font-weight:700">晋级</span>' : '<span style="color:#999">未晋级</span>';
        }
        const remarkText = r.remark ? `<span style="color:#d32f2f">${r.remark}</span>` : '';

      html += `<tr>
        <td><strong>${s.name}</strong></td>
        ${problemCells}
  <td style="font-size:14px;font-weight:bold;">${(isFinite(Number(r.score)) ? Number(r.score).toFixed(1) : '0.0')}</td>
        <td>${resultText}</td>
          <td>${remarkText}</td>
      </tr>`;
    }

    html += `</tbody></table>`;

    if(totalReward > 0){
      html += `<p style="margin-top:12px">获得奖励：<strong>¥${totalReward}</strong></p>`;
    }

    html += `<button onclick="closeModal()" class="btn">确定</button></div></div>`;

    // 防止快速点击导致的重复处理
    let modalClosed = false;
    
    modalRoot.innerHTML = html;

    // 包装 closeModal 函数，确保只执行一次清理逻辑
    try{
      if(typeof window.closeModal === 'function'){
        const origClose = window.closeModal;
        window.closeModal = function(){
          if(modalClosed) return; // 防止重复调用
          modalClosed = true;
          
          try{ origClose(); }catch(e){ /* ignore */ }
          try{ if(typeof window.renderAll === 'function') window.renderAll(); }catch(e){}
          
          // 清理结果显示标记（延迟清理，避免立即重复弹窗）
          setTimeout(() => {
            try{
              if(window._shownContestResults && resultKey){
                window._shownContestResults.delete(resultKey);
              }
            }catch(e){ /* ignore */ }
          }, 500);
          
          // restore original closeModal
          try{ window.closeModal = origClose; }catch(e){}
        };
      }
    }catch(e){ /* ignore */ }

    // 推送事件
    if(typeof window.pushEvent === 'function'){
      if(config && config.name === 'NOI'){
        const gold = results.filter(r => !r.notParticipated && r.medal === 'gold').length;
        const silver = results.filter(r => !r.notParticipated && r.medal === 'silver').length;
        const bronze = results.filter(r => !r.notParticipated && r.medal === 'bronze').length;
        window.pushEvent({
          name: config.name + ' 结束',
          description: `奖牌：🥇${gold} / 🥈${silver} / 🥉${bronze}`,
          week: game.week
        });
      } else {
        const participantCount = results.filter(r => !r.notParticipated).length;
        const passedCount = results.filter(r => !r.notParticipated && r.passed).length;
        window.pushEvent({
          name: config.name + ' 结束',
          description: `${passedCount}/${participantCount} 名学生晋级`,
          week: game.week
        });
      }
    }
  }

  /**
   * 举办模拟赛（使用新的模拟引擎）
   * @param {boolean} isPurchased - 是否购买题目
   * @param {number} diffIdx - 难度索引 (0-4)
   * @param {Array} questionTagsArray - 每题的标签数组 [[tag1,tag2], [tag3], ...]
   */
  function holdMockContestModalNew(isPurchased, diffIdx, questionTagsArray){
    if(!window.game || !window.CompetitionEngine || !window.ContestUI){
      console.error('Required modules not loaded');
      return;
    }

    const game = window.game;
    
    // 健壮的学生列表获取
    if(!game.students || !Array.isArray(game.students)){
      console.error('game.students is not defined or not an array:', game.students);
      alert('游戏数据异常：学生列表未初始化！');
      return;
    }
    
    const activeStudents = game.students.filter(s => s && s.active);
    
    if(activeStudents.length === 0){
      console.warn('No active students found. Total students:', game.students.length);
      alert('没有可参赛的学生！');
      return;
    }

    // 构建模拟赛配置
    const difficulty = (window.MOCK_CONTEST_DIFF_VALUES || [30,50,120,360,420])[diffIdx] || 100;
    const numProblems = questionTagsArray.length;
    const maxScore = numProblems * 100;

    const mockDef = {
      name: '模拟赛',
      difficulty: difficulty,
      maxScore: maxScore,
      numProblems: numProblems,
      tags: questionTagsArray
    };

    const contestConfig = window.CompetitionEngine.buildContestConfig(mockDef);
    
    // 模拟赛时长：默认240分钟
    contestConfig.duration = 240;

    const simulator = new window.CompetitionEngine.ContestSimulator(
      contestConfig,
      activeStudents,
      game
    );

    // 显示实时界面
    window.ContestUI.showContestLiveModal(simulator, (studentStates, config) => {
      handleMockContestResults(studentStates, config, isPurchased, diffIdx);
    });

    simulator.start();
  }

  /**
   * 处理模拟赛结果
   */
  function handleMockContestResults(studentStates, config, isPurchased, diffIdx){
    const game = window.game;
    
    // 模拟赛后学生获得知识/能力提升
    const gainMultiplier = isPurchased ? (window.MOCK_CONTEST_GAIN_MULTIPLIER_PURCHASED || 1.8) : 1.0;

    for(let state of studentStates){
      const s = state.student;

      // 记录变化前的快照
      const before = {
        thinking: Number(s.thinking || 0),
        coding: Number(s.coding || 0),
        mental: Number(s.mental || 0),
        pressure: Number(s.pressure || 0),
        knowledge_ds: Number(s.knowledge_ds || 0),
        knowledge_graph: Number(s.knowledge_graph || 0),
        knowledge_string: Number(s.knowledge_string || 0),
        knowledge_math: Number(s.knowledge_math || 0),
        knowledge_dp: Number(s.knowledge_dp || 0)
      };

      // 根据完成的题目获得知识（改为按题目标签均摊：每个标签获得 floor(knowledgeGain / count)）
      for(let prob of state.problems){
        if(prob.maxScore > 0){
          const knowledgeGain = Math.floor((prob.maxScore / 100) * 1.0 * gainMultiplier);
          const tags = Array.isArray(prob.tags) ? prob.tags.slice() : [];
          const tagCount = Math.max(1, tags.length);
          const perTagGain = Math.floor(knowledgeGain / tagCount);

          // 如果 perTagGain 为 0，则跳过（避免无意义的循环）
          if(perTagGain <= 0) continue;

          for(let tag of tags){
            if(typeof s.addKnowledge === 'function'){
              s.addKnowledge(tag, perTagGain);
            } else {
              // 兼容：直接修改字段
              if(tag === '数据结构') s.knowledge_ds = (s.knowledge_ds || 0) + perTagGain;
              if(tag === '图论') s.knowledge_graph = (s.knowledge_graph || 0) + perTagGain;
              if(tag === '字符串') s.knowledge_string = (s.knowledge_string || 0) + perTagGain;
              if(tag === '数学') s.knowledge_math = (s.knowledge_math || 0) + perTagGain;
              if(tag === '动态规划' || tag === 'DP') s.knowledge_dp = (s.knowledge_dp || 0) + perTagGain;
            }
          }
        }
      }

      // 心理/压力变化
      const totalMax = config.problems.reduce((sum, p) => sum + (p.maxScore || 0), 0) || 1;
      const performanceRatio = Number(state.totalScore || 0) / totalMax;
      // 计算本次队伍中的最低分（用于判断是否为最后一名）
      const minScore = (Array.isArray(studentStates) && studentStates.length) ? Math.min.apply(null, studentStates.map(st => Number(st.totalScore || 0))) : 0;
      if(performanceRatio >= 0.7){
        s.mental = Math.min(100, Number(s.mental || 0) + 2);
        s.pressure = Math.max(0, Number(s.pressure || 0) - 3);
      } else if(performanceRatio < 0.5 || Number(state.totalScore || 0) === minScore){
        // 新规则：如果分数低于 50% 或 为当前队伍最低分（最后一名），初始压力从 +5 提升为 +20
        s.pressure = Math.min(100, Number(s.pressure || 0) + 20);
      }

      // 触发模拟赛结束特质（包括 mock_end / mock_contest_finish）并允许天赋清理或要求清零模拟赛收益
      if(typeof s.triggerTalents === 'function'){
        try{
          const res1 = s.triggerTalents('mock_contest_finish', { score: state.totalScore, performanceRatio: performanceRatio }) || [];
          const res2 = s.triggerTalents('mock_end', { score: state.totalScore, performanceRatio: performanceRatio }) || [];
          const merged = (res1 || []).concat(res2 || []);
          // 如果天赋要求清零模拟赛收益（action === 'mock_cleanup'），我们需要撤销刚刚应用的知识/能力变更
          let needCleanup = false;
          for(const r of merged){ if(r && r.result && typeof r.result === 'object' && r.result.action === 'mock_cleanup'){ needCleanup = true; break; } }
          if(needCleanup){
            // 将学生恢复到 before 快照
            s.thinking = before.thinking; s.coding = before.coding; s.mental = before.mental;
            s.knowledge_ds = before.knowledge_ds; s.knowledge_graph = before.knowledge_graph; s.knowledge_string = before.knowledge_string; s.knowledge_math = before.knowledge_math; s.knowledge_dp = before.knowledge_dp;
            s.pressure = before.pressure;
            if(typeof log === 'function') log(`${s.name} 的模拟赛效果被天赋清零`);
          }
        }catch(e){ console.error('mock_contest_finish error', e); }
      }

      // 记录变化后快照，并将差值格式化为描述
      const after = {
        thinking: Number(s.thinking || 0),
        coding: Number(s.coding || 0),
        mental: Number(s.mental || 0),
        pressure: Number(s.pressure || 0),
        knowledge_ds: Number(s.knowledge_ds || 0),
        knowledge_graph: Number(s.knowledge_graph || 0),
        knowledge_string: Number(s.knowledge_string || 0),
        knowledge_math: Number(s.knowledge_math || 0),
        knowledge_dp: Number(s.knowledge_dp || 0)
      };

      const deltas = [];
      if(after.thinking !== before.thinking) deltas.push(`思维 ${after.thinking - before.thinking > 0 ? '+' : ''}${(after.thinking - before.thinking).toFixed(0)}`);
      if(after.coding !== before.coding) deltas.push(`编码 ${after.coding - before.coding > 0 ? '+' : ''}${(after.coding - before.coding).toFixed(0)}`);
      if(after.mental !== before.mental) deltas.push(`心理 ${after.mental - before.mental > 0 ? '+' : ''}${(after.mental - before.mental).toFixed(0)}`);
      if(after.pressure !== before.pressure) deltas.push(`压力 ${after.pressure - before.pressure > 0 ? '+' : ''}${(after.pressure - before.pressure).toFixed(0)}`);
      // knowledge deltas by topic
      const kDs = after.knowledge_ds - before.knowledge_ds; if(kDs) deltas.push(`数据结构 ${kDs>0?'+':''}${kDs}`);
      const kG = after.knowledge_graph - before.knowledge_graph; if(kG) deltas.push(`图论 ${kG>0?'+':''}${kG}`);
      const kS = after.knowledge_string - before.knowledge_string; if(kS) deltas.push(`字符串 ${kS>0?'+':''}${kS}`);
      const kM = after.knowledge_math - before.knowledge_math; if(kM) deltas.push(`数学 ${kM>0?'+':''}${kM}`);
      const kD = after.knowledge_dp - before.knowledge_dp; if(kD) deltas.push(`动态规划 ${kD>0?'+':''}${kD}`);

      const desc = deltas.length ? `${s.name}：${deltas.join('，')}` : `${s.name}：无显著变化`;
      // 收集每位学生的描述，稍后一次性推送为汇总卡片
      if(!handleMockContestResults._collectedDescs) handleMockContestResults._collectedDescs = [];
      handleMockContestResults._collectedDescs.push(desc);
    }

    // 显示结果
    showMockContestResults(studentStates, config);

    // 推送汇总事件：将所有学生的变化合并到一个卡片中
    if(typeof window.pushEvent === 'function'){
      const collected = handleMockContestResults._collectedDescs || [];
      const description = `完成了一场${(window.MOCK_CONTEST_DIFFICULTIES||[])[diffIdx]||''}模拟赛\n` + collected.join('\n');
      window.pushEvent({
        name: '模拟赛（汇总）',
        description: description,
        week: game.week
      });
      // 清理临时收集
      handleMockContestResults._collectedDescs = [];
    }

    // 刷新UI
    if(typeof window.renderAll === 'function'){
      window.renderAll();
    }
  }

  /**
   * 显示模拟赛结果（详细版：包含题目难度、标签、每题得分）
   */
  function showMockContestResults(studentStates, config){
    const modalRoot = document.getElementById('modal-root');
    if(!modalRoot) return;

    // 防止重复弹窗：检查是否已经显示过该模拟赛的结果
    const resultKey = `mock_${window.game ? window.game.week : 0}`;
    if(!window._shownMockResults) window._shownMockResults = new Set();
    if(window._shownMockResults.has(resultKey)){
      console.warn('Mock contest result modal already shown for:', resultKey);
      return;
    }
    window._shownMockResults.add(resultKey);

    // 生成题目信息表头
    let problemHeaders = '';
    if(config.problems && config.problems.length > 0){
      for(let prob of config.problems){
        const tagsLabel = (prob.tags && prob.tags.length > 0) ? prob.tags.join(',') : '';
        let thinking = '?';
        let tcoding = '?';
        try{
          const last = Array.isArray(prob.subtasks) && prob.subtasks.length ? prob.subtasks[prob.subtasks.length - 1] : null;
          if(last){
            if(typeof last.thinkingDifficulty === 'number') thinking = last.thinkingDifficulty;
            else if(typeof prob.thinkingDifficulty === 'number') thinking = prob.thinkingDifficulty;
            if(typeof last.codingDifficulty === 'number') tcoding = last.codingDifficulty;
            else if(typeof prob.codingDifficulty === 'number') tcoding = prob.codingDifficulty;
          }
        }catch(e){ /* ignore */ }
        problemHeaders += `<th style="font-size:11px;">
          T${prob.id+1}<br/>
          <span style="color:#888;">思维:${thinking} / 代码:${tcoding}</span><br/>
          <span style="color:#666;font-size:10px;">${tagsLabel}</span>
        </th>`;
      }
    }

    let html = `<div class="modal"><div class="dialog" style="max-width:90%;max-height:90%;overflow:auto;">
      <h2>模拟赛结果 - ${config.name || ''}</h2>
      <table class="result-table" style="font-size:13px;">
        <thead>
          <tr>
            <th>学生</th>
            ${problemHeaders}
            <th>总分</th>
          </tr>
        </thead>
        <tbody>`;

    for(let state of studentStates){
      const s = state.student;
      
      // 生成每题得分单元格
      let problemCells = '';
      for(let prob of state.problems){
        const scoreDisplay = prob.maxScore > 0 ? prob.maxScore.toFixed(0) : '0';
        const acMark = prob.solved ? ' ✓' : '';
        const colorClass = prob.solved ? 'color:green;font-weight:bold;' : (prob.maxScore > 0 ? 'color:orange;' : 'color:gray;');
        problemCells += `<td style="${colorClass}">${scoreDisplay}${acMark}</td>`;
      }

      html += `<tr>
        <td><strong>${s.name}</strong></td>
        ${problemCells}
        <td style="font-size:14px;font-weight:bold;">${state.totalScore.toFixed(1)}</td>
      </tr>`;
    }

    html += `</tbody></table>
      <button onclick="closeModal()" class="btn">确定</button></div></div>`;

    // 防止快速点击导致的重复处理
    let modalClosed = false;
    
    modalRoot.innerHTML = html;
    
    // 包装 closeModal 函数，确保只执行一次清理逻辑
    try{
      if(typeof window.closeModal === 'function'){
        const origClose = window.closeModal;
        window.closeModal = function(){
          if(modalClosed) return; // 防止重复调用
          modalClosed = true;
          
          try{ origClose(); }catch(e){ /* ignore */ }
          
          // 清理结果显示标记（延迟清理，避免立即重复弹窗）
          setTimeout(() => {
            try{
              if(window._shownMockResults && resultKey){
                window._shownMockResults.delete(resultKey);
              }
            }catch(e){ /* ignore */ }
          }, 500);
          
          // restore original closeModal
          try{ window.closeModal = origClose; }catch(e){}
        };
      }
    }catch(e){ /* ignore */ }
  }

  /* ========== 导出到全局 ========== */
  if(typeof window !== 'undefined'){
    window.holdCompetitionModalNew = holdCompetitionModalNew;
    window.holdMockContestModalNew = holdMockContestModalNew;
  }

})(window);
