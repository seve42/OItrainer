/* contest-integration.js - 将新比赛引擎集成到主游戏脚本
   提供替换旧 holdCompetitionModal 和 holdMockContestModal 的新函数
*/

(function(global){
  'use strict';

  /**
   * 生成IOI国际选手
   * @param {Array} chineseStudents - 中国队选手列表
   * @returns {Array} - 国际选手列表
   */
  function generateInternationalStudents(chineseStudents){
    // 使用用户提供的国家（地区）中文列表（去重）
    const countries = [
      '中国','韩国','罗马尼亚','美国','加拿大','保加利亚','新加坡','越南','匈牙利','伊朗','日本','波兰','马来西亚','中国台湾','哈萨克斯坦','埃及','克罗地亚','澳大利亚','印度尼西亚','塞尔维亚','瑞士','土耳其','乌兹别克斯坦','荷兰','北马其顿','新西兰','吉尔吉斯斯坦','斯洛伐克','亚美尼亚','巴西','法国','印度','泰国','意大利','巴基斯坦','瑞典','比利时','菲律宾','墨西哥','澳门','德国','奥地利','古巴','格鲁吉亚','哥斯达黎加','爱尔兰','立陶宛','捷克共和国','爱沙尼亚','沙特阿拉伯','摩洛哥','波黑','斯洛文尼亚','挪威','智利','秘鲁','突尼斯','厄瓜多尔','萨尔瓦多','多米尼加共和国','卢旺达','加纳','尼日利亚'
    ];

    // 国家中文名 -> 旗帜 emoji 映射（尽量覆盖列表中的国家/地区）
    const countryFlagMap = {
      '中国': '🇨🇳',
      '韩国': '🇰🇷',
      '罗马尼亚': '🇷🇴',
      '美国': '🇺🇸',
      '加拿大': '🇨🇦',
      '保加利亚': '🇧🇬',
      '新加坡': '🇸🇬',
      '越南': '🇻🇳',
      '匈牙利': '🇭🇺',
      '伊朗': '🇮🇷',
      '日本': '🇯🇵',
      '波兰': '🇵🇱',
      '马来西亚': '🇲🇾',
      '中国台湾': '[]',
      '哈萨克斯坦': '🇰🇿',
      '埃及': '🇪🇬',
      '克罗地亚': '🇭🇷',
      '澳大利亚': '🇦🇺',
      '印度尼西亚': '🇮🇩',
      '塞尔维亚': '🇷🇸',
      '瑞士': '🇨🇭',
      '土耳其': '🇹🇷',
      '乌兹别克斯坦': '🇺🇿',
      '荷兰': '🇳🇱',
      '北马其顿': '🇲🇰',
      '新西兰': '🇳🇿',
      '吉尔吉斯斯坦': '🇰🇬',
      '斯洛伐克': '🇸🇰',
      '亚美尼亚': '🇦🇲',
      '巴西': '🇧🇷',
      '法国': '🇫🇷',
      '印度': '🇮🇳',
      '泰国': '🇹🇭',
      '意大利': '🇮🇹',
      '巴基斯坦': '🇵🇰',
      '瑞典': '🇸🇪',
      '比利时': '🇧🇪',
      '菲律宾': '🇵🇭',
      '墨西哥': '🇲🇽',
      '澳门': '🇲🇴',
      '德国': '🇩🇪',
      '奥地利': '🇦🇹',
      '古巴': '🇨🇺',
      '格鲁吉亚': '🇬🇪',
      '哥斯达黎加': '🇨🇷',
      '爱尔兰': '🇮🇪',
      '立陶宛': '🇱🇹',
      '捷克共和国': '🇨🇿',
      '爱沙尼亚': '🇪🇪',
      '沙特阿拉伯': '🇸🇦',
      '摩洛哥': '🇲🇦',
      '波黑': '🇧🇦',
      '斯洛文尼亚': '🇸🇮',
      '挪威': '🇳🇴',
      '智利': '🇨🇱',
      '秘鲁': '🇵🇪',
      '突尼斯': '🇹🇳',
      '厄瓜多尔': '🇪🇨',
      '萨尔瓦多': '🇸🇻',
      '多米尼加共和国': '🇩🇴',
      '卢旺达': '🇷🇼',
      '加纳': '🇬🇭',
      '尼日利亚': '🇳🇬'
    };

    function getFlagForCountry(name){
      if(!name) return '';
      // 直接映射
      if(countryFlagMap[name]) return countryFlagMap[name];
      // 常见别名处理
      const normalized = name.replace(/\s|省|地区/g, '').toLowerCase();
      for(const k in countryFlagMap){
        if(k.replace(/\s|省|地区/g, '').toLowerCase() === normalized) return countryFlagMap[k];
      }
      return '';
    }

    // 计算中国队参赛选手的平均维度（ability/thinking/coding）以及各知识点平均
    let avgAbility = 0, avgThinking = 0, avgCoding = 0;
    const knowledgeAvg = { '数据结构':0,'图论':0,'字符串':0,'数学':0,'DP':0 };
    let chinaCount = 0;
    for(const s of (chineseStudents || [])){
      if(!s) continue;
      chinaCount++;
      avgAbility += Number(s.ability || 50);
      avgThinking += Number(s.thinking || 50);
      avgCoding += Number(s.coding || 50);
      for(const k in knowledgeAvg){
        try{ knowledgeAvg[k] += Number((s.getKnowledgeByType && s.getKnowledgeByType(k)) || 50); }catch(e){ knowledgeAvg[k] += 50; }
      }
    }
    if(chinaCount > 0){
      avgAbility = Math.round(avgAbility / chinaCount);
      avgThinking = Math.round(avgThinking / chinaCount);
      avgCoding = Math.round(avgCoding / chinaCount);
      for(const k in knowledgeAvg) knowledgeAvg[k] = Math.round(knowledgeAvg[k] / chinaCount);
    } else {
      avgAbility = avgThinking = avgCoding = 60;
      for(const k in knowledgeAvg) knowledgeAvg[k] = 60;
    }

    const internationalStudents = [];

    // 获取游戏难度（1=简单, 2=普通, 3=专家）
    const game = (typeof window !== 'undefined' && window.game) ? window.game : null;
    const gameDifficulty = (game && typeof game.difficulty === 'number') ? game.difficulty : 2;
    
    // 根据难度确定能力范围和天赋数量
    let minRatio, maxRatio, talentCount;
    if(gameDifficulty === 1){
      // 简单模式：60%-70%，3个天赋
      minRatio = 0.60;
      maxRatio = 0.70;
      talentCount = 3;
    } else if(gameDifficulty === 3){
      // 专家模式：80%-95%，5个天赋
      minRatio = 0.80;
      maxRatio = 0.95;
      talentCount = 5;
    } else {
      // 普通模式：70%-80%，5个天赋
      minRatio = 0.70;
      maxRatio = 0.80;
      talentCount = 5;
    }
    
    console.log(`[IOI国际赛] 难度模式: ${gameDifficulty===1?'简单':gameDifficulty===3?'专家':'普通'}, 能力范围: ${(minRatio*100).toFixed(0)}%-${(maxRatio*100).toFixed(0)}%, 天赋数量: ${talentCount}`);

    // 获取已注册的天赋列表（优先使用正面天赋）
    const registeredTalents = (window.TalentManager && typeof window.TalentManager.getRegistered === 'function') ? window.TalentManager.getRegistered() : [];
    const beneficialTalents = [];
    for(const tName of registeredTalents){
      try{
        const tDef = window.TalentManager.getTalent(tName);
        if(tDef && tDef.beneficial !== false) beneficialTalents.push(tName);
      }catch(e){}
    }

    // helper: pick N distinct talents, if insufficient, register placeholder talents
    function pickTalents(n, student){
      // 优先使用 TalentManager 的静默分配接口
      try{
        if(window.TalentManager && typeof window.TalentManager.assignTalentsToStudent === 'function'){
          if(!(student.talents instanceof Set)) student.talents = new Set();
          // 调用多次以确保至多 n 个（assignTalentsToStudent 只分配一个）
          for(let i=0;i<n;i++){
            window.TalentManager.assignTalentsToStudent(student, 2.0); // 增大倍率提高命中率
          }
          return Array.from(student.talents).slice(0,n);
        }
      }catch(e){ console.error('assignTalentsToStudent failed', e); }

      // 回退：直接选已注册的正面天赋
      const picked = [];
      for(const t of beneficialTalents){ if(picked.length < n) picked.push(t); else break; }
      // if not enough, add placeholders
      let idx = 1;
      while(picked.length < n){
        const name = `天赋${idx}`;
        if(window.TalentManager && !window.TalentManager.getTalent(name)){
          try{ window.TalentManager.registerTalent({ name, description: '自动生成的国际天赋', color: '#6b7280', prob: 1.0, beneficial: true, handler: function(){ return null; } }); }catch(e){}
        }
        if(!picked.includes(name)) picked.push(name);
        idx++;
      }
      return picked.slice(0,n);
    }

    // 为每个国家生成 1-2 名选手（跳过中国，因为中国选手由 eligibleStudents 提供）
    for(const country of countries){
      if(country === '中国') continue; // 跳过中国
      const count = (typeof window.uniformInt === 'function') ? window.uniformInt(1,2) : (Math.random() < 0.5 ? 1 : 2);
      for(let i=0;i<count;i++){
        // 在范围内随机一个比例
        const ratio = minRatio + Math.random() * (maxRatio - minRatio);
        
        // 确保各维度至少为中国平均的设定比例且不低于60
        const ability = Math.max(OTHER_CONTRY_MIN_ABILITY, Math.floor(avgAbility * ratio));
        const thinking = Math.max(OTHER_CONTRY_MIN_ABILITY, Math.floor(avgThinking * ratio));
        const coding = Math.max(OTHER_CONTRY_MIN_ABILITY, Math.floor(avgCoding * ratio));

        const flag = getFlagForCountry(country) || '';
        const student = {
          name: `${flag}${flag ? ' ' : ''}${country}-选手${i+1}`,
          ability,
          thinking,
          coding,
          knowledge: {},
          pressure: Math.random() * 20,
          mental: 70 + Math.random() * 20,
          active: true,
          isInternational: true,
          // methods expected by simulator
          getKnowledgeByType: function(type){ 
            // 使用相同的比例计算知识点
            const baseKnowledge = knowledgeAvg[type] || 60;
            return this.knowledge[type] || Math.max(60, Math.floor(baseKnowledge * ratio)); 
          },
          getPerformanceScore: function(difficulty, maxScore, avgKnowledge){
            const knowledge = avgKnowledge || 60;
            const abilityScore = (this.ability || 60) * (typeof ABILITY_WEIGHT !== 'undefined' ? ABILITY_WEIGHT : 0.4);
            const knowledgeScore = knowledge * (typeof KNOWLEDGE_WEIGHT !== 'undefined' ? KNOWLEDGE_WEIGHT : 0.6);
            const combined = abilityScore + knowledgeScore;
            const pressureFactor = 1 - (this.pressure || 0) / 200;
            const mentalFactor = (this.mental || 80) / 100;
            const performance = combined * pressureFactor * mentalFactor;
            const difficultyRatio = Math.max(0, Math.min(1, performance / (difficulty || 100)));
            return Math.floor(difficultyRatio * (maxScore || 100));
          },
          triggerTalents: function(eventName, ctx){ try{ if(window.TalentManager) return window.TalentManager.handleStudentEvent(this, eventName, ctx); }catch(e){} }
        };

        // 初始化知识点，使用相同的比例，确保不低于 60
        for(const k in knowledgeAvg){ 
          student.knowledge[k] = Math.max(60, Math.floor(knowledgeAvg[k] * ratio)); 
        }

        // 根据难度分配天赋（简单1个，普通和专家2个）
        const talents = pickTalents(talentCount, student);
        if(!(student.talents instanceof Set)) student.talents = new Set();
        for(const t of talents) student.talents.add(t);

        internationalStudents.push(student);
      }
    }

    console.log(`[IOI国际赛] 生成了 ${internationalStudents.length} 名国际选手，覆盖国家数: ${countries.length-1}`);
    return internationalStudents;
  }

  /**
   * 分配比赛增幅：根据总增幅上限和题目得分比例，计算每题应获得的增幅
   * @param {number} totalGainCap - 总增幅上限
   * @param {Array} problems - 题目数组 [{maxScore, actualScore, difficulty, ...}, ...]
   * @param {string} gainType - 增幅类型: 'knowledge'|'thinking'|'coding'
   * @returns {Array} - 每题分配的增幅 [gain1, gain2, ...]
   */
  function distributeContestGains(totalGainCap, problems, gainType = 'knowledge'){
    if(!problems || problems.length === 0) return [];
    
    // 计算每题的权重：(实际得分 / 满分) * (难度系数)
    // 难度系数：使用题目的 thinkingBase 或 codingBase 作为难度参考（值越大难度越高）
    const weights = problems.map(prob => {
      const scoreRatio = prob.actualScore > 0 ? (prob.actualScore / Math.max(1, prob.maxScore)) : 0;
      // 使用 thinkingBase 作为难度参考（通常 thinkingBase 和 codingBase 接近）
      const difficultyFactor = Math.max(1, prob.thinkingBase || prob.codingBase || 50);
      return scoreRatio * difficultyFactor;
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    if(totalWeight === 0){
      // 所有题目0分，不分配增幅
      return problems.map(() => 0);
    }
    
    // 按权重比例分配总增幅
    const gains = weights.map(w => {
      const rawGain = (w / totalWeight) * totalGainCap;
      // 知识增幅向下取整，能力增幅保留1位小数
      return gainType === 'knowledge' ? Math.floor(rawGain) : Math.round(rawGain * 10) / 10;
    });
    
    // 补偿因取整损失的总增幅：将剩余部分分配给得分最高的题目
    if(gainType === 'knowledge'){
      const actualTotal = gains.reduce((sum, g) => sum + g, 0);
      const deficit = Math.floor(totalGainCap) - actualTotal;
      if(deficit > 0){
        // 找到得分最高的题目索引
        let maxScoreIdx = 0;
        let maxScore = problems[0].actualScore || 0;
        for(let i = 1; i < problems.length; i++){
          if((problems[i].actualScore || 0) > maxScore){
            maxScore = problems[i].actualScore || 0;
            maxScoreIdx = i;
          }
        }
        gains[maxScoreIdx] += deficit;
      }
    }
    
    return gains;
  }

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
  // 统一半季边界计算：优先使用全局 WEEKS_PER_HALF（在 models.js 中声明），
  // 否则根据 SEASON_WEEKS 推导出默认半季长度，再保守向下取整。
  const halfBoundary = (typeof WEEKS_PER_HALF !== 'undefined') ? WEEKS_PER_HALF : Math.floor((typeof SEASON_WEEKS !== 'undefined' ? SEASON_WEEKS : 26) / 2);
  const halfIndex = (game.week > halfBoundary) ? 1 : 0;
    
    // 初始化晋级资格数据结构
    if(!game.qualification) game.qualification = {};
    if(!game.qualification[halfIndex]) game.qualification[halfIndex] = {};
    
    // IOI 特殊标记（后续资格检查中使用）
    const isIOI = comp.name === 'IOI' && comp.nationalTeam;
    
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
      if(!s || s.active === false) continue;
      
      let isEligible = true;
      
      // IOI 特殊处理：检查学生是否在 ioiQualified 列表中
      if(isIOI){
        // IOI 要求学生必须在 game.nationalTeamResults.ioiQualified 中
        const studentName = s.originalName || s.name; // originalName 用于处理重命名的情况
        const isInIOIList = game.nationalTeamResults && 
                           Array.isArray(game.nationalTeamResults.ioiQualified) && 
                           game.nationalTeamResults.ioiQualified.includes(studentName);
        
        if(!isInIOIList){
          isEligible = false;
          console.log(`[IOI资格检查] ❌ ${s.name} 未晋级IOI，无法参加 ${comp.name}`);
        } else {
          console.log(`[IOI资格检查] ✅ ${s.name} 已晋级IOI，可以参加 ${comp.name}`);
        }
      } 
      // 如果不是第一场比赛（且不是IOI），需要检查上一场比赛的晋级资格
      else if(currentIdx > 0){
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
    
    // IOI 特殊处理：添加国际选手
    let internationalStudents = [];
    if(comp.name === 'IOI' && comp.nationalTeam){
      // 调试日志：显示 IOI 晋级资格信息
      if(game.nationalTeamResults && game.nationalTeamResults.ioiQualified){
        console.log(`[IOI资格调试] ioiQualified列表:`, game.nationalTeamResults.ioiQualified);
      } else {
        console.log(`[IOI资格调试] 未找到ioiQualified列表`);
      }
      console.log(`[IOI资格调试] 参赛学生:`, eligibleStudents.map(s => s.name));
      console.log(`[IOI资格调试] 未参赛学生:`, ineligibleStudents.map(s => s.name));
      
      internationalStudents = generateInternationalStudents(eligibleStudents);
      console.log(`[IOI国际赛] 生成了 ${internationalStudents.length} 名国际选手`);
      
      // 为中国队选手更名
      for(let s of eligibleStudents){
        s.originalName = s.name; // 保存原始名字
        s.name = `🇨🇳 中国队-${s.originalName}`;
      }
    }
    
    // 如果没有学生有资格参赛
    if(eligibleStudents.length === 0){
      console.warn('No eligible students for competition:', comp.name);
      
      // 第二个赛季无人参赛，直接触发结局
      if(halfIndex === 1){
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
          entries: game.students.filter(s => s && s.active !== false).map(s => ({
            name: s.name,
            rank: null,
            score: null,
            passed: false,
            eligible: false,
            remark: '未晋级，未参加'
          }))
        });
        console.log('【DEBUG】 skip competition in season 2, triggering ending, careerCompetitions:', game.careerCompetitions);
        
        // 显示成绩汇总弹窗，在确认后再触发结局
        showCompetitionEndingSummary(comp, [], 0, 0, true, '晋级链断裂');
        return; // 直接返回，不继续后续处理
      }
      
      // 第一个赛季跳过比赛，记录事件但不触发结局
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
        entries: game.students.filter(s => s && s.active !== false).map(s => ({
          name: s.name,
          rank: null,
          score: null,
          passed: false,
          eligible: false,
          remark: '未晋级，未参加'
        }))
      });
      console.log('【DEBUG】 skip competition, careerCompetitions after push:', game.careerCompetitions);
      
      if(typeof window.renderAll === 'function'){
        window.renderAll();
      }
      return;
    }

    // 构建比赛配置（包含题目、部分分等）
    const contestConfig = window.CompetitionEngine.buildContestConfig(comp);
    
    // 合并参赛选手列表（中国队 + 国际选手）
    const allParticipants = eligibleStudents.concat(internationalStudents);
    
    // 创建模拟器（包含所有参赛选手）
    const simulator = new window.CompetitionEngine.ContestSimulator(
      contestConfig,
      allParticipants,
      game
    );

    // 显示实时比赛界面
    window.ContestUI.showContestLiveModal(simulator, (studentStates, config) => {
      // 比赛结束回调：处理结果、晋级、奖励等
      handleCompetitionResults(studentStates, config, comp, ineligibleStudents, internationalStudents);
    });

    // 启动模拟
    simulator.start();
  }

  /**
   * 处理比赛结果
   * @param {Array} ineligibleStudents - 没有晋级资格的学生列表
   * @param {Array} internationalStudents - 国际选手列表（仅IOI）
   */
  function handleCompetitionResults(studentStates, config, originalComp, ineligibleStudents, internationalStudents){
    const game = window.game;
    ineligibleStudents = ineligibleStudents || [];
    internationalStudents = internationalStudents || [];
    
    // IOI特殊处理：恢复中国队选手名字
    if(originalComp.name === 'IOI' && originalComp.nationalTeam){
      for(let state of studentStates){
        if(state.student.originalName){
          state.student.name = state.student.originalName;
          delete state.student.originalName;
        }
      }
    }
    
    // 计算晋级线等逻辑（保持与原系统一致）
    const scores = studentStates.map(s => s.totalScore).sort((a,b) => b - a);
    const passRate = getPassRateForCompetition(originalComp.name);
      // determine total max score for this contest (used to compute extra pressure and pass line bounds)
      const totalMax = (config && Array.isArray(config.problems)) ? config.problems.reduce((sum, p) => sum + (p.maxScore || 0), 0) : (originalComp && originalComp.maxScore) || 0;
    
    // IOI特殊处理：金牌线取前10%分数和原标准的最大值
    let passLine;
    if(originalComp.name === 'IOI' && originalComp.nationalTeam){
      const top10PercentIndex = Math.floor(scores.length * 0.1);
      const top10PercentScore = scores[top10PercentIndex] || 0;
      const standardPassLine = calculatePassLine(scores, passRate, totalMax, originalComp.name);
      passLine = Math.max(top10PercentScore, standardPassLine);
      console.log(`[IOI金牌线] 前10%分数: ${top10PercentScore}, 标准线: ${standardPassLine}, 最终金牌线: ${passLine}`);
    } else {
      passLine = calculatePassLine(scores, passRate, totalMax, originalComp.name);
    }
    
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
        // 应用全局压力增加量增幅（减压不受影响，只影响增加压力）
        const pressureMult = (typeof PRESSURE_INCREASE_MULTIPLIER !== 'undefined' ? PRESSURE_INCREASE_MULTIPLIER : 1.0);
        if(passed){
          s.pressure = Math.max(0, Number(s.pressure || 0) - 10);
          s.mental = Math.min(100, Number(s.mental || 0) + 3);
        } else {
          s.pressure = Math.min(100, Number(s.pressure || 0) + 15 * pressureMult);
          s.mental = Math.max(0, Number(s.mental || 0) - 5);
        }
        
        // 记录标志：用于比赛后统一计算声誉
        state._passedForReputation = passed;

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
        // medal field: 'gold'|'silver'|'bronze'|null - only used for NOI and IOI
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
          remark: state._remark || '',
          medalRank: null // 用于IOI按排名计算奖牌
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
        notParticipated: true, // 标记为未参赛
        medalRank: null
      });
    }

    // IOI奖牌计算：按排名百分比分配奖牌
    if(originalComp && originalComp.name === 'IOI' && originalComp.nationalTeam){
      try{
        // 只对参赛选手计算奖牌（包括国际选手）
        const participatedResults = results.filter(r => !r.notParticipated);
        
        // 按分数降序排序
        participatedResults.sort((a, b) => {
          if(b.score !== a.score) return b.score - a.score;
          return a.student.name.localeCompare(b.student.name);
        });
        
        const n = participatedResults.length;
        const goldMax = Math.floor(n * 0.10);   // 前10%为金牌
        const silverMax = Math.floor(n * 0.30); // 接下来30%为银牌
        const bronzeMax = Math.floor(n * 0.50); // 接下来50%为铜牌
        
        // 按排名分配奖牌
        for(let i = 0; i < participatedResults.length; i++){
          const r = participatedResults[i];
          r.medalRank = i + 1; // 记录排名
          
          if(i < goldMax){
            r.medal = 'gold';
          } else if(i < goldMax + silverMax){
            r.medal = 'silver';
          } else if(i < goldMax + silverMax + bronzeMax){
            r.medal = 'bronze';
          } else {
            r.medal = null;
          }
        }
        
        console.log(`[IOI奖牌分配] 参赛人数:${n}, 金牌:${goldMax}, 银牌:${silverMax}, 铜牌:${bronzeMax}`);
      }catch(e){
        console.error('[IOI奖牌分配] 错误:', e);
      }
    }

    // 处理晋级资格（只对参赛学生）
    updateQualifications(results, originalComp.name);

    // 检查晋级人数，如果在第二轮赛季且无人晋级，标记需要触发结局
  // 与上面保持一致的半季边界计算
  const halfBoundary_local = (typeof WEEKS_PER_HALF !== 'undefined') ? WEEKS_PER_HALF : Math.floor((typeof SEASON_WEEKS !== 'undefined' ? SEASON_WEEKS : 26) / 2);
  const halfIndex = (game.week > halfBoundary_local) ? 1 : 0;
    const passedCount = results.filter(r => !r.notParticipated && r.passed).length;
    
    // 根据比赛结果增加声誉
    let reputationGain = 0;
    const medalCount = {
      gold: results.filter(r => !r.notParticipated && r.medal === 'gold').length,
      silver: results.filter(r => !r.notParticipated && r.medal === 'silver').length,
      bronze: results.filter(r => !r.notParticipated && r.medal === 'bronze').length
    };
    
    // 根据比赛等级和成绩计算声誉增加
    if(originalComp.name === 'NOI'){
      // NOI：金牌+8，银牌+5，铜牌+3，晋级+1
      reputationGain = medalCount.gold * 8 + medalCount.silver * 5 + medalCount.bronze * 3 + passedCount * 1;
    } else if(originalComp.name === '省选'){
      // 省选：晋级+3
      reputationGain = passedCount * 3;
    } else if(originalComp.name === 'NOIP'){
      // NOIP：晋级+2
      reputationGain = passedCount * 2;
    } else if(originalComp.name === 'CSP-S2'){
      // CSP-S2：晋级+1
      reputationGain = passedCount * 1;
    } else if(originalComp.name === 'CSP-S1'){
      // CSP-S1：晋级+1（但系数较低）
      reputationGain = Math.floor(passedCount * 0.5);
    }
    
    // IOI 特殊处理：金牌+15，银牌+10，铜牌+5
    if(originalComp.name === 'IOI' && originalComp.nationalTeam){
      reputationGain = medalCount.gold * 15 + medalCount.silver * 10 + medalCount.bronze * 5;
    }
    
    // 应用声誉增加
    if(reputationGain > 0){
      game.reputation = Math.min(100, (game.reputation || 0) + reputationGain);
      // 设置标志用于触发相关事件
      game.recentSuccess = true;
      game.recentSuccessWeek = game.week;
      if(medalCount.gold > 0 || medalCount.silver > 0 || medalCount.bronze > 0){
        game.recentMedal = true;
      }
      
      // 记录声誉变化日志
      if(typeof window.log === 'function'){
        let desc = '';
        if(originalComp.name === 'NOI'){
          desc = `获得 🥇${medalCount.gold} 🥈${medalCount.silver} 🥉${medalCount.bronze}`;
        } else if(originalComp.name === 'IOI' && originalComp.nationalTeam){
          desc = `获得 🥇${medalCount.gold} 🥈${medalCount.silver} 🥉${medalCount.bronze}`;
        } else {
          desc = `${passedCount}人晋级`;
        }
        window.log(`[声誉提升] ${originalComp.name} ${desc}，声誉 +${reputationGain}`);
      }
    }
    
    let shouldTriggerEnding = false;
    let endingReason = '';
    
    // 检查是否为第二年NOI且有金牌
    let hasGoldMedal = false;
    if(originalComp && originalComp.name === 'NOI' && halfIndex === 1){
      const goldCount = results.filter(r => !r.notParticipated && r.medal === 'gold').length;
      hasGoldMedal = goldCount > 0;
      console.log(`[国家集训队检测] 第二年NOI，金牌数：${goldCount}`);
    }
    
    // 检查是否应触发晋级链断裂结局
    // 排除国家集训队比赛（CTT、CTS、IOI），这些比赛的结局由专门逻辑处理
    const isNationalTeamComp = originalComp && originalComp.nationalTeam;
    console.log(`[晋级检查] 比赛: ${originalComp.name}, 国家集训队比赛: ${isNationalTeamComp}, 晋级人数: ${passedCount}, 赛季: ${halfIndex}`);
    if(halfIndex === 1 && passedCount === 0 && !isNationalTeamComp){
      // 第二轮赛季且无人晋级，需要触发晋级链断裂结局
      shouldTriggerEnding = true;
      endingReason = '晋级链断裂';
      console.log(`[晋级检查] 触发结局: ${endingReason}`);
    }

    // 将记录的 extraPressure 统一应用：实际增加的压力 = 记录值 * 2（只对参赛学生）
    // 应用全局压力增加量增幅
    const pressureMult = (typeof PRESSURE_INCREASE_MULTIPLIER !== 'undefined' ? PRESSURE_INCREASE_MULTIPLIER : 1.0);
    for(let r of results){
      // 跳过未参赛学生
      if(r.notParticipated) continue;
      
      try{
        const ep = Number(r.extraPressure || 0);
        if(ep > 0){
          const s = r.student;
          const epApplied = ep * 2 * pressureMult;
          const applied = Math.min(100, Number(s.pressure || 0) + epApplied) - Number(s.pressure || 0);
          s.pressure = Math.min(100, Number(s.pressure || 0) + epApplied);
          // write to game log so pressure increases are visible
          try{ if(typeof log === 'function') log(`[比赛惩罚] ${s.name} 额外压力 +${applied.toFixed(1)} (记录 ${ep})`); }catch(e){}
        }
      }catch(e){ /* ignore */ }
    }

    // 发放奖励
    const totalReward = distributeRewards(results, originalComp.name);

    // 国家集训队比赛特殊处理
    if(game.inNationalTeam && originalComp.name){
      const compName = originalComp.name;
      
      // CTT 比赛：累计分数
      if(compName === 'CTT-day1-2' || compName === 'CTT-day3-4'){
        if(!game.nationalTeamResults) game.nationalTeamResults = { cttScores: [] };
        if(!game.nationalTeamResults.cttScores) game.nationalTeamResults.cttScores = [];
        
        // 记录所有参赛学生的成绩
        for(let r of results){
          if(!r.notParticipated){
            game.nationalTeamResults.cttScores.push({
              studentName: r.student.name,
              score: r.score,
              day: compName
            });
          }
        }
        console.log(`【国家集训队】${compName} 成绩已记录:`, game.nationalTeamResults.cttScores);
      }
      
      // CTS 比赛：记录成绩并计算IOI晋级
      else if(compName === 'CTS'){
        if(!game.nationalTeamResults) game.nationalTeamResults = { cttScores: [], ctsScores: [] };
        if(!game.nationalTeamResults.ctsScores) game.nationalTeamResults.ctsScores = [];
        
        // 记录CTS成绩
        for(let r of results){
          if(!r.notParticipated){
            game.nationalTeamResults.ctsScores.push({
              studentName: r.student.name,
              score: r.score
            });
          }
        }
        console.log('【国家集训队】CTS 成绩已记录:', game.nationalTeamResults.ctsScores);
        
        // 延迟计算晋级（在详细结果弹窗关闭后）
        // 这个标志会在showDetailedResults的关闭回调中被检测
        game.pendingIOIQualificationCheck = true;
      }
      
      // IOI 比赛：计算奖牌并触发结局
      else if(compName === 'IOI'){
        console.log('【国家集训队】IOI 比赛结束，准备计算奖牌和结局');
        // 延迟计算结局（在详细结果弹窗关闭后）
        game.pendingIOIResultsCheck = true;
      }
    }

    // 显示详细结果弹窗（传递结局触发信息和金牌检测信息）
    showDetailedResults(results, config, passLine, totalReward, shouldTriggerEnding, endingReason, hasGoldMedal, originalComp.maxScore || config.problems.reduce((sum, p) => sum + (p.maxScore || 0), 0), originalComp);

    // 如果是 IOI（国家集训队），保存所有参赛选手的成绩用于后续奖牌分配显示
    if(originalComp.name === 'IOI' && originalComp.nationalTeam){
      try{
        // 先按分数排序
        const sortedResults = results.filter(r => !r.notParticipated).sort((a, b) => {
          if(b.score !== a.score) return b.score - a.score;
          return a.student.name.localeCompare(b.student.name);
        });
        
        game.lastIOIAllResults = sortedResults.map((r, idx) => ({
          name: r.student.name,
          score: r.score,
          rank: idx + 1,
          isInternational: !!r.student.isInternational,
          nationality: r.student.isInternational ? (r.student.name.split('-')[0] || '国际') : '中国'
        }));
        console.log('【IOI】保存全部参赛选手成绩到 game.lastIOIAllResults, count=', game.lastIOIAllResults.length);
      }catch(e){ console.error('保存 IOI 全部成绩失败', e); }
    }

    // 标记比赛完成 (与主脚本保持一致的键格式)
    if(!game.completedCompetitions) game.completedCompetitions = new Set();
    const compKey = `${halfIndex}_${originalComp.name}_${originalComp.week}`;
    game.completedCompetitions.add(compKey);

    // 记录职业生涯（只计算参赛学生，IOI只记录中国队选手）
    if(!game.careerCompetitions) game.careerCompetitions = [];
    
    // 过滤掉国际选手（如果是IOI）
    const careerResults = results.filter(r => {
      if(r.notParticipated) return false;
      if(originalComp.name === 'IOI' && originalComp.nationalTeam && r.student.isInternational) return false;
      return true;
    });
    
    const participantCount = careerResults.length;
    game.careerCompetitions.push({
      week: game.week,
      name: originalComp.name,
      passedCount: passedCount,
      totalStudents: participantCount,
      entries: careerResults.map((r, idx) => ({
        name: r.student.name,
        rank: idx + 1,
        score: r.score,
        passed: r.passed,
        medal: r.medal || null,
        remark: r.remark || ''
      }))
    });
    console.log('【DEBUG】 handleCompetitionResults pushed record, careerCompetitions:', game.careerCompetitions);

    // 保存到 localStorage
    if(typeof window.saveGame === 'function') window.saveGame();
    console.log('【DEBUG】 after saveGame in handleCompetitionResults, localStorage oi_coach_save updated');

    // 刷新UI
    if(typeof window.renderAll === 'function'){
      window.renderAll();
    }
  }

  /**
   * 获取比赛晋级率（旧函数，保留用于兼容性）
   * @deprecated 使用 getCompetitionCutoff 替代
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
   * 获取比赛晋级线（基于省份强弱的固定分数线）
   * @param {string} compName - 比赛名称
   * @param {number} totalMax - 比赛总分
   * @returns {number} 晋级线分数
   */
  function getCompetitionCutoff(compName, totalMax){
    const game = window.game;
    if(!totalMax || totalMax <= 0) return 0;
    
    // 获取省份类型，默认为普通省
    const provinceType = game.province_type || '普通省';
    
    // 获取该比赛该省份的基准晋级线百分比
    const cutoffConfig = window.COMPETITION_BASE_CUTOFF || {};
    const compConfig = cutoffConfig[compName] || {};
    let basePercentage = compConfig[provinceType];
    
    // 调试日志
    console.log(`[晋级线计算] 比赛: ${compName}, 省份: ${provinceType}, 总分: ${totalMax}`);
    console.log(`[晋级线计算] cutoffConfig:`, cutoffConfig);
    console.log(`[晋级线计算] compConfig:`, compConfig);
    console.log(`[晋级线计算] basePercentage:`, basePercentage);
    
    // 如果没有配置，使用默认值
    if(typeof basePercentage !== 'number'){
      if(provinceType === '强省') basePercentage = 0.65;
      else if(provinceType === '弱省') basePercentage = 0.45;
      else basePercentage = 0.55;
      console.log(`[晋级线计算] 使用默认值: ${basePercentage}`);
    }
    
    // NOI的分数线没有浮动，其他比赛应用浮动（±5%）
    let cutoffPercentage = basePercentage;
    if(compName !== 'NOI'){
      const fluctuation = window.CUTOFF_FLUCTUATION || 0.05;
      const randomFactor = 1.0 + (Math.random() * 2 - 1) * fluctuation; // 0.95 ~ 1.05
      cutoffPercentage = basePercentage * randomFactor;
      console.log(`[晋级线计算] 应用浮动后: ${cutoffPercentage}`);
    } else {
      console.log(`[晋级线计算] NOI不应用浮动，保持: ${cutoffPercentage}`);
    }
    
    // 确保在合理范围内（0.2 ~ 0.95）
    cutoffPercentage = Math.max(0.2, Math.min(0.95, cutoffPercentage));
    
    // 计算实际分数线
    let cutoffScore = totalMax * cutoffPercentage;
    
    // 应用全局分数线增幅
    const passLineMult = (typeof PASS_LINE_MULTIPLIER !== 'undefined' ? PASS_LINE_MULTIPLIER : 1.0);
    cutoffScore = cutoffScore * passLineMult;
    
    console.log(`[晋级线计算] 最终分数线: ${Math.floor(cutoffScore)} (${(cutoffPercentage * 100).toFixed(1)}%)`);
    
    return Math.floor(cutoffScore);
  }

  /**
   * 计算晋级线（新版本：使用固定分数线而非排名）
   */
  function calculatePassLine(sortedScores, passRate, totalMax, compName){
    // 新逻辑：直接使用省份强弱决定的固定分数线
    return getCompetitionCutoff(compName, totalMax);
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
  // 优先使用全局 WEEKS_PER_HALF（在 models.js 中声明），否则根据 SEASON_WEEKS 推导
  const halfBoundary_for_update = (typeof WEEKS_PER_HALF !== 'undefined') ? WEEKS_PER_HALF : Math.floor((typeof SEASON_WEEKS !== 'undefined' ? SEASON_WEEKS : 26) / 2);
  const seasonIdx = (game.week > halfBoundary_for_update) ? 1 : 0;

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
    // 使用与 holdCompetitionModalNew 一致的赛季索引计算方式
    const halfBoundary_ui = (typeof WEEKS_PER_HALF !== 'undefined') ? WEEKS_PER_HALF : Math.floor((typeof SEASON_WEEKS !== 'undefined' ? SEASON_WEEKS : 26) / 2);
    const halfIndex = (game.week > halfBoundary_ui) ? 1 : 0;
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
      
      // 延迟弹出选择对话框，让玩家选择是否升级设施
      setTimeout(() => {
        const options = [
          { 
            label: '升级设施', 
            effect: () => {
              // 延迟打开设施升级界面，确保选择对话框先关闭
              setTimeout(() => {
                if(typeof window.showFacilityUpgradeModal === 'function'){
                  window.showFacilityUpgradeModal();
                }
              }, 300);
              // 推送事件卡
              if(typeof window.pushEvent === 'function'){
                window.pushEvent({ name: '拨款', description: `${compName} 奖励 ¥${totalReward}`, week: game.week });
              }
            }
          },
          { 
            label: '暂不升级', 
            effect: () => {
              // 推送事件卡
              if(typeof window.pushEvent === 'function'){
                window.pushEvent({ name: '拨款', description: `${compName} 奖励 ¥${totalReward}`, week: game.week });
              }
            }
          }
        ];
        
        // 显示选择对话框
        if(typeof window.showChoiceModal === 'function'){
          window.showChoiceModal({ 
            name: '拨款', 
            description: `${compName} 奖励 ¥${totalReward}<br><br>是否立即升级设施？`, 
            week: game.week, 
            options 
          });
        } else {
          // 如果没有选择对话框功能，直接推送事件
          if(typeof window.pushEvent === 'function'){
            window.pushEvent({ name: '拨款', description: `${compName} 奖励 ¥${totalReward}`, week: game.week });
          }
        }
      }, 500);

      // mark funding as issued for this competition-week
        try{
          // reuse halfBoundary_ui computed at the top of this function's try block
          const halfIndex = (game.week > halfBoundary_ui) ? 1 : 0;
          const fundingKey = `${halfIndex}_${compName}_${game.week}`;
          if(!game.fundingIssued) game.fundingIssued = new Set();
          game.fundingIssued.add(fundingKey);
        }catch(e){ /* ignore */ }
    }
    
    return totalReward;
  }

  /**
   * 显示详细结果
   * @param {boolean} shouldTriggerEnding - 是否需要触发游戏结局
   * @param {string} endingReason - 结局原因
   */
  function showDetailedResults(results, config, passLine, totalReward, shouldTriggerEnding, endingReason, hasGoldMedal, noiMaxScore, originalComp){
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
      <h2>${config.name} - 比赛结果</h2>`;
    
    // 国家集训队比赛的特殊说明
    if(originalComp && originalComp.nationalTeam){
      if(config.name === 'CTT-day1-2' || config.name === 'CTT-day3-4' || config.name === 'CTS'){
        html += `<p style="color:#666;">📊 本场成绩将计入总分，最终根据 CTT+CTS 总分决定IOI晋级</p>`;
      } else if(config.name === 'IOI'){
        html += `<p style="color:#666;">🌍 国际信息学奥林匹克竞赛 - 与各国选手同场竞技</p>`;
      }
    } else {
      html += `<p>晋级线：<strong>${passLine.toFixed(1)}</strong> 分</p>`;
    }
    
    html += `<table class="result-table" style="font-size:13px;">
        <thead>
          <tr>
            <th>排名</th>
            <th>学生</th>
            ${problemHeaders}
            <th>总分</th>
            <th>结果</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>`;

    // 将参赛学生和未参赛学生分开处理，并对参赛学生按分数排序
    const participatedResults = results.filter(r => !r.notParticipated);
    const notParticipatedResults = results.filter(r => r.notParticipated);
    
    // 按得分降序排序（同分按名字排序保证稳定性）
    participatedResults.sort((a, b) => {
      if(b.score !== a.score) return b.score - a.score;
      return a.student.name.localeCompare(b.student.name);
    });

    // 先显示参赛学生（按排名）
    participatedResults.forEach((r, index) => {
      const s = r.student;
      const rank = index + 1;
      
      // 生成每题得分单元格（参赛学生）
      let problemCells = '';
      for(let prob of r.problems){
        const scoreNum = Number(prob.maxScore || 0);
        const scoreDisplay = scoreNum > 0 ? scoreNum.toFixed(0) : '0';
        // 只有题目已通过且没有挂分时才显示打勾
        const hasMistake = prob.mistakePenalty && prob.mistakePenalty > 0;
        const acMark = (prob.solved && !hasMistake) ? ' ✓' : '';
        
        // 检查是否有失误
        let colorClass = '';
        let cellContent = scoreDisplay + acMark;
        let cellStyle = '';
        
        if(prob.mistakePenalty && prob.mistakePenalty > 0){
          // 失误题目：黄色背景，显示扣分
          colorClass = 'background:#fff3cd;color:#856404;font-weight:bold;';
          cellStyle = 'position:relative;padding:4px;';
          const originalScore = prob.originalScore || (scoreNum + prob.mistakePenalty);
          cellContent = `
            <div style="font-weight:bold;">${scoreDisplay}</div>
            <div style="font-size:10px;color:#d32f2f;margin-top:2px;">
              挂分:${prob.mistakePenalty}
            </div>
          `;
        } else if(prob.solved){
          colorClass = 'color:green;font-weight:bold;';
        } else if(prob.maxScore > 0){
          colorClass = 'color:orange;';
        } else {
          colorClass = 'color:gray;';
        }
        
        problemCells += `<td style="${colorClass}${cellStyle}">${cellContent}</td>`;
      }

        let resultText = '';
        // 对 NOI 及以上等级（NOI/NOIP/类似）不显示“晋级/未晋级”，而是显示奖牌或“未获得奖牌”。
        // IOI 仍按奖牌显示；若无奖牌则显示“未获得奖牌”。
        const compName = config && config.name ? String(config.name).toUpperCase() : '';
        const compNameOriginal = config && config.name ? String(config.name) : '';
        const isNOIOrAbove = compName === 'NOI' || compName === 'IOI';
        // 使用 originalComp 来检查 nationalTeam 属性
        const isNationalTeamSelection = originalComp && originalComp.nationalTeam && (compNameOriginal === 'CTT-day1-2' || compNameOriginal === 'CTT-day3-4' || compNameOriginal === 'CTS');
        
        console.log(`[结果显示] 比赛: ${compNameOriginal}, nationalTeam: ${originalComp?.nationalTeam}, isNationalTeamSelection: ${isNationalTeamSelection}`);
        
        if(isNOIOrAbove){
          // 优先显示奖牌（若有），否则显示统一的“未获得奖牌”提示（不再显示晋级/未晋级）
          if(r.medal === 'gold') resultText = '<span style="color:#e6b422;font-weight:700">🥇 金牌</span>';
          else if(r.medal === 'silver') resultText = '<span style="color:#b0b0b0;font-weight:700">🥈 银牌</span>';
          else if(r.medal === 'bronze') resultText = '<span style="color:#cd7f32;font-weight:700">🥉 铜牌</span>';
          else resultText = '<span style="color:#999">未获得奖牌</span>';
        } else if(isNationalTeamSelection){
          // CTT/CTS 只显示成绩已记录
          resultText = '<span style="color:#666">✓ 已记录</span>';
        } else {
          // 其他比赛保持原来的晋级显示
          resultText = r.passed ? '<span style="color:#38a169;font-weight:700">晋级</span>' : '<span style="color:#999">未晋级</span>';
        }
        const remarkText = r.remark ? `<span style="color:#d32f2f">${r.remark}</span>` : '';

      html += `<tr>
        <td style="font-weight:700;color:#3b82f6;text-align:center;">#${rank}</td>
        <td><strong>${s.name}</strong></td>
        ${problemCells}
  <td style="font-size:14px;font-weight:bold;">${(isFinite(Number(r.score)) ? Number(r.score).toFixed(1) : '0.0')}</td>
        <td>${resultText}</td>
          <td>${remarkText}</td>
      </tr>`;
    });

    // 再显示未参赛学生
    for(let r of notParticipatedResults){
      const s = r.student;
      
      let emptyProblemCells = '';
      if(config.problems && config.problems.length > 0){
        for(let i = 0; i < config.problems.length; i++){
          emptyProblemCells += `<td style="color:#ccc;text-align:center;">-</td>`;
        }
      }
      
      html += `<tr style="background-color:#f5f5f5;">
        <td style="color:#999;text-align:center;">-</td>
        <td><strong>${s.name}</strong></td>
        ${emptyProblemCells}
        <td style="color:#999;text-align:center;">-</td>
        <td><span style="color:#999">未参加</span></td>
        <td><span style="color:#999">${r.remark}</span></td>
      </tr>`;
    }

    html += `</tbody></table>`;

    // CTS 比赛特殊处理：显示CTT+CTS总成绩和晋级预览
    if(config.name === 'CTS' && originalComp && originalComp.nationalTeam){
      const game = window.game;
      if(game && game.nationalTeamResults){
        const cttScores = game.nationalTeamResults.cttScores || [];
        const ctsScores = game.nationalTeamResults.ctsScores || [];
        
        // 计算每个学生的总分
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
        let totalScores = [];
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
        
        // 计算晋级线
        const maxPossible = 600 + 600 + 800; // CTT-day1-2 + CTT-day3-4 + CTS
        const qualificationLine = maxPossible * 0.5;
        
        // 确定晋级名单（前2名且分数达标）
        let qualified = [];
        for(let i = 0; i < Math.min(2, totalScores.length); i++){
          if(totalScores[i].total >= qualificationLine){
            qualified.push(totalScores[i].name);
          }
        }
        
        // 显示总成绩统计
        html += `<div style="background:#f0f8ff;padding:12px;border-radius:5px;margin-top:16px;border:2px solid #2196f3;">`;
        html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#1976d2;">📊 国家集训队总成绩（CTT + CTS）</div>`;
        html += `<table style="width:100%;font-size:13px;"><thead><tr><th>排名</th><th>姓名</th><th>CTT总分</th><th>CTS</th><th>总分</th><th>状态</th></tr></thead><tbody>`;
        
        for(let i = 0; i < totalScores.length; i++){
          let s = totalScores[i];
          const isQualified = qualified.includes(s.name);
          const rowStyle = isQualified ? 'background:#e8f5e9;font-weight:bold;' : '';
          const statusText = isQualified ? '<span style="color:#2e7d32;">✅ 预计晋级IOI</span>' : '<span style="color:#999;">未晋级</span>';
          html += `<tr style="${rowStyle}"><td>${i+1}</td><td>${s.name}</td><td>${s.cttScore}</td><td>${s.ctsScore}</td><td><strong>${s.total}</strong></td><td>${statusText}</td></tr>`;
        }
        
        html += `</tbody></table>`;
        html += `<div style="margin-top:8px;font-size:13px;color:#666;">晋级线：${qualificationLine.toFixed(0)} </div>`;
        html += `</div>`;
      }
    }

    if(totalReward > 0){
      html += `<p style="margin-top:12px">获得奖励：<strong>¥${totalReward}</strong></p>`;
    }
    
    // 如果需要触发结局，显示提示
    if(shouldTriggerEnding){
      html += `<div style="background:#fff3e0;padding:10px;border-radius:5px;margin:12px 0;border:2px solid #ff9800;">`;
      html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#e65100;">⚠️ 游戏即将结束</div>`;
      html += `<div>结束原因：${endingReason}</div>`;
      html += `</div>`;
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
          
          // 检查国家集训队比赛后续流程
          if(game.inNationalTeam){
            // CTS 比赛结束后，计算IOI晋级
            if(game.pendingIOIQualificationCheck){
              game.pendingIOIQualificationCheck = false;
              try{
                console.log('【国家集训队】CTS 结束，开始计算IOI晋级');
                if(typeof window.calculateNationalTeamQualification === 'function'){
                  window.calculateNationalTeamQualification();
                }
              }catch(e){
                console.error('计算IOI晋级失败', e);
              }
              return; // 不继续处理其他逻辑
            }
            
            // IOI 比赛结束后，计算奖牌和结局
            if(game.pendingIOIResultsCheck){
              game.pendingIOIResultsCheck = false;
              try{
                console.log('【国家集训队】IOI 结束，开始计算奖牌和结局');
                if(typeof window.calculateIOIResults === 'function'){
                  window.calculateIOIResults();
                }
              }catch(e){
                console.error('计算IOI结果失败', e);
              }
              return; // 不继续处理其他逻辑
            }
          }
          
          // 检查是否为第二年NOI且有金牌，优先显示国家集训队选择
          if(hasGoldMedal && config && config.name === 'NOI'){
            try{
              console.log('[国家集训队检测] 第二年NOI有金牌，设置待选择标志并显示国家集训队选择弹窗');
              // 设置标志，防止周更新时触发赛季结束
              game.nationalTeamChoicePending = true;
              // 转换results格式为game.js期望的格式
              const noiResults = results.filter(r => !r.notParticipated).map(r => ({
                name: r.student.name,
                total: r.score,
                scores: r.problems ? r.problems.map(p => p.maxScore || 0) : [],
                eligible: true
              }));
              // 调用国家集训队选择弹窗
              if(typeof window.showNationalTeamChoice === 'function'){
                window.showNationalTeamChoice(noiResults, noiMaxScore || 700, passLine);
              }
            }catch(e){
              console.error('显示国家集训队选择弹窗失败', e);
            }
            return; // 不触发结局，由国家集训队流程控制
          }
          
          // 如果需要触发结局，现在执行
          if(shouldTriggerEnding){
            try{
              console.log('比赛结果确认后触发游戏结局：' + endingReason);
              if(typeof window.triggerGameEnding === 'function'){
                window.triggerGameEnding(endingReason);
              }
            }catch(e){
              console.error('触发游戏结局失败', e);
            }
          }
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
   * @param {Object} difficultyConfig - 难度配置对象 {type, difficulty, name, numProblems, onlineContestType?}
   * @param {Array} questionTagsArray - 每题的标签数组 [[tag1,tag2], [tag3], ...]
   */
  function holdMockContestModalNew(isPurchased, difficultyConfig, questionTagsArray){
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

    // 构建比赛配置
    const difficulty = difficultyConfig.difficulty;
    const numProblems = questionTagsArray.length;
    const maxScore = numProblems * 100;

    const mockDef = {
      name: difficultyConfig.name || '模拟赛',
      difficulty: difficulty,
      maxScore: maxScore,
      numProblems: numProblems,
      tags: questionTagsArray
    };
    
    // 如果是网赛，添加网赛标识
    if(difficultyConfig.type === 'online'){
      mockDef.contestType = 'online';
      mockDef.onlineContestType = difficultyConfig.onlineContestType;
    }

    const contestConfig = window.CompetitionEngine.buildContestConfig(mockDef);
    
    // 模拟赛时长：默认240分钟
    contestConfig.duration = 240;

    const simulator = new window.CompetitionEngine.ContestSimulator(
      contestConfig,
      activeStudents,
      game
    );

    // 在模拟赛开始前触发模拟赛开始相关天赋（仅用于模拟赛，例如 原题机（伪））
    for(const s of activeStudents){
      try{ if(typeof s.triggerTalents === 'function') s.triggerTalents('mock_start', { contestName: '模拟赛' }); }catch(e){ console.error('triggerTalents mock_start', e); }
    }

    // 显示实时界面
    window.ContestUI.showContestLiveModal(simulator, (studentStates, config) => {
      handleMockContestResults(studentStates, config, isPurchased, difficultyConfig);
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

      // 计算总增幅上限（基于比赛难度和类型）
      const CONTEST_MAX_TOTAL_KNOWLEDGE_GAIN = window.CONTEST_MAX_TOTAL_KNOWLEDGE_GAIN || 6;
      const CONTEST_MAX_TOTAL_THINKING_GAIN = window.CONTEST_MAX_TOTAL_THINKING_GAIN || 6;
      const CONTEST_MAX_TOTAL_CODING_GAIN = window.CONTEST_MAX_TOTAL_CODING_GAIN || 10.0;
      const CONTEST_GAIN_RATIOS = window.CONTEST_GAIN_RATIOS || {};
      
      // 确定增幅系数：网赛根据difficulty分档，付费比赛暂时使用中等难度
      let gainRatio = { knowledge: 0.6, thinking: 0.6, coding: 0.6 }; // 默认中等
      if(config.contestType === 'online'){
        const difficulty = config.difficulty || 0;
        if(difficulty < 150){
          gainRatio = CONTEST_GAIN_RATIOS['online_low'] || gainRatio;
        } else if(difficulty <= 300){
          gainRatio = CONTEST_GAIN_RATIOS['online_medium'] || gainRatio;
        } else {
          gainRatio = CONTEST_GAIN_RATIOS['online_high'] || gainRatio;
        }
      } else {
        // 付费比赛：根据 diffIdx 确定难度级别
        // diffIdx: 0-简单, 1-中等, 2-困难, 3-地狱
        if(diffIdx <= 0){
          gainRatio = CONTEST_GAIN_RATIOS['CSP-S1'] || gainRatio;
        } else if(diffIdx === 1){
          gainRatio = CONTEST_GAIN_RATIOS['CSP-S2'] || gainRatio;
        } else if(diffIdx === 2){
          gainRatio = CONTEST_GAIN_RATIOS['NOIP'] || gainRatio;
        } else {
          gainRatio = CONTEST_GAIN_RATIOS['省选'] || gainRatio;
        }
      }
      
      // 应用付费倍数到总增幅上限
      const knowledgeCap = CONTEST_MAX_TOTAL_KNOWLEDGE_GAIN * gainRatio.knowledge * gainMultiplier;
      const thinkingCap = CONTEST_MAX_TOTAL_THINKING_GAIN * gainRatio.thinking * gainMultiplier;
      const codingCap = CONTEST_MAX_TOTAL_CODING_GAIN * gainRatio.coding * gainMultiplier;

      // 准备题目数据：添加 actualScore 字段
      // 注意：StudentContestState 在模拟器中将已获得分数保存在 prob.maxScore 字段中，
      // 但旧逻辑/其他模块有时使用 prob.score。为兼容两者，优先使用 prob.score（当且仅当为数字时），
      // 否则使用 prob.maxScore（如果存在数字），否则返回 0。
      const problemsWithScores = state.problems.map(prob => {
        const actual = (typeof prob.score === 'number' && !isNaN(prob.score)) ? prob.score
                     : (typeof prob.maxScore === 'number' && !isNaN(prob.maxScore)) ? prob.maxScore
                     : 0;
        return Object.assign({}, prob, { actualScore: actual });
      });

      // 分配知识/思维/代码增幅
      const knowledgeGains = distributeContestGains(knowledgeCap, problemsWithScores, 'knowledge');
      const thinkingGains = distributeContestGains(thinkingCap, problemsWithScores, 'thinking');
      const codingGains = distributeContestGains(codingCap, problemsWithScores, 'coding');

      // 调试日志：记录增幅分配情况
      if(window.__OI_DEBUG_MOCK_GAINS){
        console.log(`[模拟赛增幅] 学生:${s.name}`);
        console.log(`  知识上限:${knowledgeCap.toFixed(2)}, 分配:`, knowledgeGains);
        console.log(`  思维上限:${thinkingCap.toFixed(2)}, 分配:`, thinkingGains);
        console.log(`  代码上限:${codingCap.toFixed(2)}, 分配:`, codingGains);
        console.log(`  题目信息:`, problemsWithScores.map(p => ({
          actualScore: p.actualScore,
          maxScore: p.maxScore,
          thinkingBase: p.thinkingBase,
          codingBase: p.codingBase,
          tags: p.tags
        })));
      }

      // 应用知识增幅（按题目标签均摊）
      // 检测"氪金玩家"天赋加成系数
      let knowledgeMultiplier = 1.0;
      if(s.talents && s.talents.has && s.talents.has('氪金玩家')){
        knowledgeMultiplier = 1.5; // 氪金玩家天赋提供50%加成
      }
      
      for(let i = 0; i < state.problems.length; i++){
        const prob = state.problems[i];
        const knowledgeGain = Math.floor(knowledgeGains[i] * knowledgeMultiplier) || 0;
        
        if(knowledgeGain <= 0) continue;
        
        const tags = Array.isArray(prob.tags) ? prob.tags.slice() : [];
        const tagCount = Math.max(1, tags.length);
        const perTagGain = Math.floor(knowledgeGain / tagCount);

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
      
      // 验证知识增幅是否超过上限，如果超过则按比例缩减
      // 注意：如果学生有"氪金玩家"天赋，实际增幅会超过 knowledgeCap，这是允许的
      let effectiveKnowledgeCap = knowledgeCap;
      if(s.talents && s.talents.has && s.talents.has('氪金玩家')){
        effectiveKnowledgeCap = knowledgeCap * 1.5; // 氪金玩家天赋提供50%加成
      }
      
      const actualKnowledgeGain = 
        (Number(s.knowledge_ds || 0) - before.knowledge_ds) +
        (Number(s.knowledge_graph || 0) - before.knowledge_graph) +
        (Number(s.knowledge_string || 0) - before.knowledge_string) +
        (Number(s.knowledge_math || 0) - before.knowledge_math) +
        (Number(s.knowledge_dp || 0) - before.knowledge_dp);
      
      if(actualKnowledgeGain > effectiveKnowledgeCap * 1.01){ // 允许1%的误差
        const scale = effectiveKnowledgeCap / actualKnowledgeGain;
        console.warn(`[模拟赛知识增幅超限] 学生:${s.name}, 上限:${effectiveKnowledgeCap.toFixed(2)}, 实际:${actualKnowledgeGain.toFixed(2)}, 缩减比例:${scale.toFixed(3)}`);
        
        s.knowledge_ds = before.knowledge_ds + Math.floor((s.knowledge_ds - before.knowledge_ds) * scale);
        s.knowledge_graph = before.knowledge_graph + Math.floor((s.knowledge_graph - before.knowledge_graph) * scale);
        s.knowledge_string = before.knowledge_string + Math.floor((s.knowledge_string - before.knowledge_string) * scale);
        s.knowledge_math = before.knowledge_math + Math.floor((s.knowledge_math - before.knowledge_math) * scale);
        s.knowledge_dp = before.knowledge_dp + Math.floor((s.knowledge_dp - before.knowledge_dp) * scale);
      }
      
      // 应用思维/代码增幅（总和）
      const totalThinkingGain = thinkingGains.reduce((sum, g) => sum + g, 0);
      const totalCodingGain = codingGains.reduce((sum, g) => sum + g, 0);
      
      if(totalThinkingGain > 0){
        s.thinking = Number(s.thinking || 0) + totalThinkingGain;
      }
      if(totalCodingGain > 0){
        s.coding = Number(s.coding || 0) + totalCodingGain;
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
            <th>排名</th>
            <th>学生</th>
            ${problemHeaders}
            <th>总分</th>
          </tr>
        </thead>
        <tbody>`;

    // 按得分降序排序（同分按名字排序保证稳定性）
    const sortedStates = [...studentStates].sort((a, b) => {
      if(b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.student.name.localeCompare(b.student.name);
    });

    sortedStates.forEach((state, index) => {
      const s = state.student;
      const rank = index + 1;
      
      // 生成每题得分单元格
      let problemCells = '';
      for(let prob of state.problems){
        const scoreDisplay = prob.maxScore > 0 ? prob.maxScore.toFixed(0) : '0';
        // 只有题目已通过且没有挂分时才显示打勾
        const hasMistake = prob.mistakePenalty && prob.mistakePenalty > 0;
        const acMark = (prob.solved && !hasMistake) ? ' ✓' : '';
        
        // 根据挂分情况调整颜色显示
        let colorClass;
        if(hasMistake){
          // 挂分题目：黄色/橙色，表示有问题
          colorClass = 'color:#856404;font-weight:bold;';
        } else if(prob.solved){
          // 正常AC：绿色加粗
          colorClass = 'color:green;font-weight:bold;';
        } else if(prob.maxScore > 0){
          // 部分分：橙色
          colorClass = 'color:orange;';
        } else {
          // 0分：灰色
          colorClass = 'color:gray;';
        }
        
        problemCells += `<td style="${colorClass}">${scoreDisplay}${acMark}</td>`;
      }

      html += `<tr>
        <td style="font-weight:700;color:#3b82f6;text-align:center;">#${rank}</td>
        <td><strong>${s.name}</strong></td>
        ${problemCells}
        <td style="font-size:14px;font-weight:bold;">${state.totalScore.toFixed(1)}</td>
      </tr>`;
    });

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

  /**
   * 显示比赛结束汇总弹窗（用于无人参赛等特殊情况）
   * @param {Object} comp - 比赛信息
   * @param {Array} results - 比赛结果（可能为空）
   * @param {number} passLine - 晋级线
   * @param {number} passCount - 晋级人数
   * @param {boolean} shouldTriggerEnding - 是否需要触发游戏结局
   * @param {string} endingReason - 结局原因
   */
  function showCompetitionEndingSummary(comp, results, passLine, passCount, shouldTriggerEnding, endingReason){
    const modalRoot = document.getElementById('modal-root');
    if(!modalRoot) return;
    
    let html = `<div class="modal"><div class="dialog" style="max-width:600px;">`;
    html += `<h3>${comp.name} - 比赛结果</h3>`;
    
    html += `<div style="background:#ffebee;padding:15px;border-radius:5px;margin:15px 0;">`;
    html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#c62828;">❌ 无人参赛</div>`;
    html += `<div>本场比赛无学生有资格参赛</div>`;
    html += `</div>`;
    
    // 如果需要触发结局，显示提示
    if(shouldTriggerEnding){
      html += `<div style="background:#fff3e0;padding:15px;border-radius:5px;margin:15px 0;border:2px solid #ff9800;">`;
      html += `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#e65100;">⚠️ 游戏即将结束</div>`;
      html += `<div>结束原因：${endingReason}</div>`;
      html += `</div>`;
    }
    
    html += `<button class="btn" id="ending-summary-confirm">确定</button>`;
    html += `</div></div>`;
    
    modalRoot.innerHTML = html;
    
    const confirmBtn = document.getElementById('ending-summary-confirm');
    if(confirmBtn){
      confirmBtn.onclick = function(){
        if(typeof window.closeModal === 'function'){
          window.closeModal();
        } else {
          modalRoot.innerHTML = '';
        }
        
        // 如果需要触发结局，现在执行
        if(shouldTriggerEnding){
          try{
            console.log('比赛结束确认后触发游戏结局：' + endingReason);
            if(typeof window.triggerGameEnding === 'function'){
              window.triggerGameEnding(endingReason);
            }
          }catch(e){
            console.error('触发游戏结局失败', e);
          }
        }
      };
    }
  }

  /* ========== 导出到全局 ========== */
  if(typeof window !== 'undefined'){
    window.holdCompetitionModalNew = holdCompetitionModalNew;
    window.holdMockContestModalNew = holdMockContestModalNew;
    window.showCompetitionEndingSummary = showCompetitionEndingSummary;
    window.getCompetitionCutoff = getCompetitionCutoff;
    window.getPassRateForCompetition = getPassRateForCompetition; // 兼容性保留
    window.calculatePassLine = calculatePassLine;
  }

})(window);
