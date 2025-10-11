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
    
    const activeStudents = game.students.filter(s => s && s.active);
    
    if(activeStudents.length === 0){
      console.warn('No active students found. Total students:', game.students.length);
      alert('没有可参赛的学生！');
      return;
    }

    // 构建比赛配置（包含题目、部分分等）
    const contestConfig = window.CompetitionEngine.buildContestConfig(comp);
    
    // 创建模拟器
    const simulator = new window.CompetitionEngine.ContestSimulator(
      contestConfig,
      activeStudents,
      game
    );

    // 显示实时比赛界面
    window.ContestUI.showContestLiveModal(simulator, (studentStates, config) => {
      // 比赛结束回调：处理结果、晋级、奖励等
      handleCompetitionResults(studentStates, config, comp);
    });

    // 启动模拟
    simulator.start();
  }

  /**
   * 处理比赛结果
   */
  function handleCompetitionResults(studentStates, config, originalComp){
    const game = window.game;
    
    // 计算晋级线等逻辑（保持与原系统一致）
    const scores = studentStates.map(s => s.totalScore).sort((a,b) => b - a);
    const passRate = getPassRateForCompetition(originalComp.name);
    const passLine = calculatePassLine(scores, passRate);
      // determine total max score for this contest (used to compute extra pressure)
      const totalMax = (config && Array.isArray(config.problems)) ? config.problems.reduce((sum, p) => sum + (p.maxScore || 0), 0) : (originalComp && originalComp.maxScore) || 0;
      const baseline = totalMax > 0 ? (totalMax / 2.0) : 0;
      const minScore = scores.length ? Math.min.apply(null, scores) : 0;

    // 统计晋级/获奖学生
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
        if((!passed || (baseline > 0 && (Number(score) || 0) < baseline) || (Number(score) || 0) === minScore) && extraPressure > 0){
          s.pressure = Math.min(100, Number(s.pressure || 0) + extraPressure);
          // store a remark on the state so UI can display it
          state._extraPressure = extraPressure;
          state._remark = `发挥不佳，压力 +${extraPressure}`;
        } else {
          state._extraPressure = 0;
          state._remark = '';
        }

        // record final result (after pressure updates)
        results.push({
          student: s,
          score: score,
          passed: passed,
          problems: state.problems,
          extraPressure: state._extraPressure || 0,
          remark: state._remark || ''
        });
      }

    // 处理晋级资格
    updateQualifications(results, originalComp.name);

    // 发放奖励
    const totalReward = distributeRewards(results, originalComp.name);

    // 显示详细结果弹窗
    showDetailedResults(results, config, passLine, totalReward);

    // 标记比赛完成 (与主脚本保持一致的键格式)
    if(!game.completedCompetitions) game.completedCompetitions = new Set();
    const halfIndex = (game.week > (window.WEEKS_PER_HALF || 13)) ? 1 : 0;
    const compKey = `${halfIndex}_${originalComp.name}_${originalComp.week}`;
    game.completedCompetitions.add(compKey);

    // 记录职业生涯
    if(!game.careerCompetitions) game.careerCompetitions = [];
    game.careerCompetitions.push({
      week: game.week,
      name: originalComp.name,
      passedCount: results.filter(r => r.passed).length,
      totalStudents: results.length
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
  function calculatePassLine(sortedScores, passRate){
    if(sortedScores.length === 0) return 0;
    const passCount = Math.max(1, Math.floor(sortedScores.length * passRate));
    return sortedScores[passCount - 1] || 0;
  }

  /**
   * 更新晋级资格
   */
  function updateQualifications(results, compName){
    const game = window.game;
    if(!game.qualification) return;

    const compOrder = window.COMPETITION_ORDER || ["CSP-S1","CSP-S2","NOIP","省选","NOI"];
    const currentIdx = compOrder.indexOf(compName);
    if(currentIdx < 0 || currentIdx >= compOrder.length - 1) return;

    const nextComp = compOrder[currentIdx + 1];
    const seasonIdx = Math.floor((game.week - 1) / (window.WEEKS_PER_HALF || 13));

    for(let r of results){
      if(r.passed){
        if(!game.qualification[seasonIdx]) game.qualification[seasonIdx] = {};
        if(!game.qualification[seasonIdx][nextComp]) game.qualification[seasonIdx][nextComp] = new Set();
        game.qualification[seasonIdx][nextComp].add(r.student.name);
      }
    }
  }

  /**
   * 发放奖励
   */
  function distributeRewards(results, compName){
    const game = window.game;
    let totalReward = 0;

    for(let r of results){
      if(!r.passed) continue;

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

    game.budget += totalReward;
    return totalReward;
  }

  /**
   * 显示详细结果
   */
  function showDetailedResults(results, config, passLine, totalReward){
    const game = window.game;
    const modalRoot = document.getElementById('modal-root');
    if(!modalRoot) return;

    // 生成题目信息表头
    let problemHeaders = '';
    if(config.problems && config.problems.length > 0){
      for(let prob of config.problems){
        const diffLabel = prob.difficulty || '?';
        const tagsLabel = (prob.tags && prob.tags.length > 0) ? prob.tags.join(',') : '';
        problemHeaders += `<th style="font-size:11px;">
          T${prob.id+1}<br/>
          <span style="color:#888;">${diffLabel}</span><br/>
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
      
      // 生成每题得分单元格
      let problemCells = '';
      for(let prob of r.problems){
  const scoreNum = Number(prob.maxScore || 0);
  const scoreDisplay = scoreNum > 0 ? scoreNum.toFixed(0) : '0';
        const acMark = prob.solved ? ' ✓' : '';
        const colorClass = prob.solved ? 'color:green;font-weight:bold;' : (prob.maxScore > 0 ? 'color:orange;' : 'color:gray;');
        problemCells += `<td style="${colorClass}">${scoreDisplay}${acMark}</td>`;
      }

        const resultText = r.passed ? '<span style="color:#38a169;font-weight:700">晋级</span>' : '<span style="color:#999">未晋级</span>';
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

    modalRoot.innerHTML = html;

    // 推送事件
    if(typeof window.pushEvent === 'function'){
      const passedCount = results.filter(r => r.passed).length;
      window.pushEvent({
        name: config.name + ' 结束',
        description: `${passedCount}/${results.length} 名学生晋级`,
        week: game.week
      });
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

      // 根据完成的题目获得知识
      for(let prob of state.problems){
        if(prob.maxScore > 0){
          const knowledgeGain = Math.floor((prob.maxScore / 100) * 2 * gainMultiplier);
          for(let tag of prob.tags){
            if(typeof s.addKnowledge === 'function'){
              s.addKnowledge(tag, knowledgeGain);
            } else {
              // 兼容：直接修改字段
              if(tag === '数据结构') s.knowledge_ds = (s.knowledge_ds || 0) + knowledgeGain;
              if(tag === '图论') s.knowledge_graph = (s.knowledge_graph || 0) + knowledgeGain;
              if(tag === '字符串') s.knowledge_string = (s.knowledge_string || 0) + knowledgeGain;
              if(tag === '数学') s.knowledge_math = (s.knowledge_math || 0) + knowledgeGain;
              if(tag === '动态规划' || tag === 'DP') s.knowledge_dp = (s.knowledge_dp || 0) + knowledgeGain;
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

      // 触发模拟赛结束特质
      if(typeof s.triggerTalents === 'function'){
        try{ s.triggerTalents('mock_contest_finish', { score: state.totalScore, performanceRatio: performanceRatio }); }catch(e){ console.error('mock_contest_finish error', e); }
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

    // 生成题目信息表头
    let problemHeaders = '';
    if(config.problems && config.problems.length > 0){
      for(let prob of config.problems){
        const diffLabel = prob.difficulty || '?';
        const tagsLabel = (prob.tags && prob.tags.length > 0) ? prob.tags.join(',') : '';
        problemHeaders += `<th style="font-size:11px;">
          T${prob.id+1}<br/>
          <span style="color:#888;">${diffLabel}</span><br/>
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

    modalRoot.innerHTML = html;
  }

  /* ========== 导出到全局 ========== */
  if(typeof window !== 'undefined'){
    window.holdCompetitionModalNew = holdCompetitionModalNew;
    window.holdMockContestModalNew = holdMockContestModalNew;
  }

})(window);
