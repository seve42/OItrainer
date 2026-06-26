/* talent.js - 学生特质（talent）管理器
   目的：提供一个集中注册/触发学生特质的管理器（TalentManager），便于扩展特质逻辑并在事件或比赛中调用。
   使用说明：在页面中先于 `game.js` 加载本文件，或者确保在触发 student.triggerTalents 之前 window.TalentManager 已就绪。
   API:
     - register(name, handler): 注册特质处理器。handler(student, eventName, ctx) -> 可修改学生/游戏状态，返回可选描述字符串。
     - clear(): 清除所有已注册特质
     - handleStudentEvent(student, eventName, ctx): 对单个学生按其特质逐一调用已注册 handler
     - registerDefaultTalents(game, utils): 注册一些示例特质（可选）
     - getTalentInfo(name): 获取天赋的描述信息（用于UI显示）
     - setTalentInfo(name, info): 设置天赋的描述信息
*/
(function(global){
  const TalentManager = {
    // talents: { name -> { name, description, color, prob, handler } }
    _talents: {},

    // 注册单个天赋 (完整定义对象)
    // talentDef: { name, description, color?, prob?: 0.0-1.0, handler?: function }
    registerTalent(talentDef){
      if(!talentDef || !talentDef.name) throw new Error('invalid talent definition');
      // kind: 'positive' | 'negative' (default positive for backward compatibility)
      const def = Object.assign({ description: '', color: '#2b6cb0', prob: 0.0, handler: null, kind: 'positive' }, talentDef);
      // beneficial 表示是否为正面天赋，优先使用显式字段，否则根据 kind 推断
      def.beneficial = (typeof def.beneficial !== 'undefined') ? Boolean(def.beneficial) : (def.kind !== 'negative');
      // 同步一个首字母大写的别名以兼容可能的外部使用（用户要求字段名为 Beneficial）
      def.Beneficial = def.beneficial;
      this._talents[def.name] = def;
    },

    // 清除所有天赋定义
    clearTalents(){ this._talents = {}; },

    // 获取已注册天赋名列表
    getRegistered(){ return Object.keys(this._talents); },

    // 获取天赋定义
    getTalent(name){ return this._talents[name]; },

    // 获取天赋显示信息（兼容旧 API）
    getTalentInfo(name){
      const t = this.getTalent(name);
      if(!t) return { name, description: '暂无描述', color: '#2b6cb0' };
      return { name: t.name, description: t.description, color: t.color };
    },

    // 触发某学生的天赋事件（遍历学生天赋并调用 handler）
    handleStudentEvent(student, eventName, ctx){
      // Allow event handling even if student has no talents registered.
      if(!student) return [];
      const results = [];

      // First, call handlers for talents the student actually has.
      if(student.talents){
        for(const tName of Array.from(student.talents)){
          const t = this.getTalent(tName);
          if(t && typeof t.handler === 'function'){
            try{
              const res = t.handler(student, eventName, ctx || {});
              if(res) results.push({ talent: tName, result: res });
            }catch(e){ console.error('talent handler error', tName, e); }
          }
        }
      }

      // Then, always invoke an internal cleanup handler (if registered).
      // Some talents apply temporary modifications for the duration of a contest
      // and expect a global cleanup step to restore original values. Registering
      // that cleanup as a normal talent ("__talent_cleanup__") is convenient,
      // but it shouldn't require the student to actually possess that talent.
      // Call it unconditionally so temporary boosts are reliably reverted.
      try{
        const internal = this.getTalent('__talent_cleanup__');
        if(internal && typeof internal.handler === 'function'){
          const res = internal.handler(student, eventName, ctx || {});
          if(res) results.push({ talent: '__talent_cleanup__', result: res });
        }
      }catch(e){ console.error('internal talent handler error', '__talent_cleanup__', e); }

      return results;
    },

    // 尝试为学生获取新天赋（每名学生最多可拥有 MAX_TALENTS 个天赋）
    // 修改后的机制：只会获得正面天赋，同时有相同概率移除负面天赋
    tryAcquireTalent(student, multiplier = 1.0) {
      if (!student || !student.active) return;
      if (!(student.talents instanceof Set)) {
        student.talents = new Set();
      }

      // 检查是否有"庸才"天赋，如果有则无法获得新天赋
      if (student.talents.has('庸才')) {
        return;
      }

      const MAX_TALENTS = 4;

      // 全局概率门槛：每次训练/外出集训后，学生只有一定概率有机会获得天赋（最多1个）
      let globalGetTalentProb;
      try{
        globalGetTalentProb = (typeof GET_TALENT_Probability !== 'undefined') ? Number(GET_TALENT_Probability) : (typeof window !== 'undefined' && typeof window.GET_TALENT_Probability !== 'undefined' ? Number(window.GET_TALENT_Probability) : 0.5);
        // 若当前为简单难度（game.difficulty === 1），则将总体获得天赋概率翻倍（上限 1.0）
        try{
          if(typeof window !== 'undefined' && window.game && Number(window.game.difficulty) === 1){
            globalGetTalentProb = Math.min(1.0, (isFinite(globalGetTalentProb) ? globalGetTalentProb : 0.5) * 2.0);
          }
        }catch(e){}
        if(getRandom() >= (isFinite(globalGetTalentProb) ? globalGetTalentProb : 0.5)){
          return; // 未通过总体概率门槛，无机会获得天赋
        }
      }catch(e){ 
        globalGetTalentProb = 0.5;
      }

      // 从已注册天赋中遍历（this._talents 存储实际定义）
      const registered = Object.values(this._talents || {});
      
      // 第一步：尝试获得正面天赋（只考虑未达到上限的情况）
      if (student.talents.size < MAX_TALENTS) {
        for (const tDef of registered) {
          if (!tDef || !tDef.name) continue;
          // 只处理正面天赋（beneficial === true）
          if (!tDef.beneficial) continue;
          // 如果学生已有此天赋则跳过
          if (student.talents.has(tDef.name)) continue;
          const prob = Number(tDef.prob || 0) || 0;
          if (prob <= 0) continue;
          if (getRandom() < prob * multiplier) {
            student.talents.add(tDef.name);
            // 优先将天赋获得作为事件卡片推送到事件面板；若无 pushEvent，再回退到旧的 showEventModal
            try{ if(window.pushEvent) window.pushEvent({ name: '天赋获得', description: `${student.name} 在训练中激发了新的潜能，获得了天赋：【${tDef.name}】！`, week: window.game ? window.game.week : undefined }); }catch(e){}
            //try{ if(window.showEventModal) window.showEventModal && window.showEventModal({ name: '天赋获得1', description: `${student.name} 在训练中激发了新的潜能，获得了天赋：【${tDef.name}】！`, week: window.game ? window.game.week : undefined }); }catch(e){}
            // 获得天赋后不立即返回，继续尝试移除负面天赋
            break;
          }
        }
      }

      // 第二步：尝试移除负面天赋（概率与获得天赋相同）
      // 收集学生当前拥有的负面天赋
      const negativeTalents = Array.from(student.talents).filter(tName => {
        const tDef = this.getTalent(tName);
        return tDef && tDef.beneficial === false;
      });
      
      if (negativeTalents.length > 0) {
        // 使用相同的全局概率判断是否有机会移除负面天赋
        if (getRandom() < (isFinite(globalGetTalentProb) ? globalGetTalentProb : 0.5)) {
          // 随机选择一个负面天赋移除
          const removedTalentName = negativeTalents[Math.floor(getRandom() * negativeTalents.length)];
          student.talents.delete(removedTalentName);
          try{ 
            if(window.showEventModal) {
              window.showEventModal({ 
                name: '负面天赋消除', 
                description: `${student.name} 通过不断的努力和训练，成功克服了负面状态，消除了天赋：【${removedTalentName}】！`, 
                week: window.game ? window.game.week : undefined 
              });
            }
          }catch(e){}
        }
      }
    },

    // 为学生分配天赋（用于初始分配/招募时调用）
    // 此方法与 tryAcquireTalent 类似，但为静默分配（不弹出事件模态），便于初始化流程使用。
    // 修改后：只会分配正面天赋
    assignTalentsToStudent(student, multiplier = 1.0) {
      if (!student) return;
      if (!(student.talents instanceof Set)) student.talents = new Set();
      // 如果标记为庸才，跳过分配
      if (student.talents.has('庸才')) return;
      const MAX_TALENTS = 4;
      if (student.talents.size >= MAX_TALENTS) return;
      const registered = Object.values(this._talents || {});
      // 全局概率门槛：初始分配/招募时也适用（决定是否有机会在该时刻获得任何天赋）
      try{
        let globalGetTalentProb = (typeof GET_TALENT_Probability !== 'undefined') ? Number(GET_TALENT_Probability) : (typeof window !== 'undefined' && typeof window.GET_TALENT_Probability !== 'undefined' ? Number(window.GET_TALENT_Probability) : 0.5);
        // 简单难度下翻倍（上限 1.0）
        try{
          if(typeof window !== 'undefined' && window.game && Number(window.game.difficulty) === 1){
            globalGetTalentProb = Math.min(1.0, (isFinite(globalGetTalentProb) ? globalGetTalentProb : 0.5) * 2.0);
          }
        }catch(e){}
        if(getRandom() >= (isFinite(globalGetTalentProb) ? globalGetTalentProb : 0.5)){
          return; // 未通过总体概率门槛
        }
      }catch(e){ /* ignore and proceed */ }
      // 只遍历正面天赋进行分配
      for (const tDef of registered) {
        if (!tDef || !tDef.name) continue;
        // 只处理正面天赋（beneficial === true）
        if (!tDef.beneficial) continue;
        if (student.talents.has(tDef.name)) continue;
        const prob = Number(tDef.prob || 0) || 0;
        if (prob <= 0) continue;
        try{
          if (getRandom() < prob * multiplier) {
            student.talents.add(tDef.name);
            // 每次 assign 调用最多添加一个天赋
            return;
          }
        }catch(e){ console.error('assignTalentsToStudent error', e); }
      }
    },

    // 为初始学生强制分配且仅分配一个天赋（用于游戏开始时的初始名册）
    // 要求：每名初始学生必须至少拥有一个天赋；选择逻辑为按各天赋的 prob 字段作为权重随机选择（包含正/负面天赋）
    assignInitialTalent(student){
      try{
        if(!student) return;
        if(!(student.talents instanceof Set)) student.talents = new Set();
        // 如果学生已有任意天赋（例如对点招生时带来的），则不覆盖
        if(student.talents.size > 0) return;

        const registered = Object.values(this._talents || {});
        const candidates = registered.filter(t => t && t.name);
        if(candidates.length === 0) return;

        // 使用 prob 作为权重进行加权随机选择；若所有 prob 为 0 则回退为均匀选择
        let total = 0;
        for(const c of candidates){ total += Number(c.prob || 0); }

        let chosen = null;
        if(total > 0){
          let r = getRandom() * total;
          for(const c of candidates){
            const w = Number(c.prob || 0);
            if(r < w){ chosen = c; break; }
            r -= w;
          }
          if(!chosen) chosen = candidates[candidates.length - 1];
        } else {
          chosen = candidates[Math.floor(getRandom() * candidates.length)];
        }

        if(chosen){
          student.talents.add(chosen.name);
          // 初始分配不强制弹窗，但保留事件卡记录以便玩家查看
          //try{ if(window && window.pushEvent) window.pushEvent({ name: '初始天赋分配', description: `${student.name} 初始获得天赋：【${chosen.name}】`, week: window.game ? window.game.week : undefined }); }catch(e){}
        }
      }catch(e){ console.error('assignInitialTalent error', e); }
    },

  // 检查并处理天赋丧失
  // 修改后的机制：只会丧失正面天赋，同时有相同概率获得负面天赋
  checkAndHandleTalentLoss(student) {
    if (!student || !student.active || !student.talents || student.talents.size === 0) {
      return;
    }

    const TALENT_LOSS_THRESHOLD = TALENT_LOST_VALUE; // 丧失天赋的压力阈值
    const TALENT_LOSS_PROB = 0.1;    // 丧失天赋的基础概率

    if (Number(student.pressure || 0) >= TALENT_LOSS_THRESHOLD) {
      if (getRandom() < TALENT_LOSS_PROB) {
        // 第一步：只从正面天赋中选择进行丧失
        const positiveTalents = Array.from(student.talents).filter(tName => {
          const tDef = this.getTalent(tName);
          return tDef && tDef.beneficial === true;
        });

        if (positiveTalents.length > 0) {
          const lostTalentIndex = Math.floor(getRandom() * positiveTalents.length);
          const lostTalentName = positiveTalents[lostTalentIndex];
          // 从Set中移除该天赋名
          student.talents.delete(lostTalentName);
          const tDef = this.getTalent(lostTalentName);
          const displayName = (tDef && tDef.name) ? tDef.name : lostTalentName;

          // 将天赋丧失作为事件卡片推送；兼容旧 modal 接口
          try{ if(window.pushEvent) window.pushEvent({ name: '天赋丧失', description: `由于长期处于高压状态，${student.name} 感到身心俱疲，不幸丧失了天赋：【${displayName}】！`, week: window.game ? window.game.week : undefined }); }catch(e){}
          //try{ if(window.showEventModal) window.showEventModal && window.showEventModal({ name: '天赋丧失', description: `由于长期处于高压状态，${student.name} 感到身心俱疲，不幸丧失了天赋：【${displayName}】！`, week: window.game ? window.game.week : undefined }); }catch(e){}
        }

        // 第二步：尝试获得负面天赋（概率与丧失天赋相同）
        if (getRandom() < TALENT_LOSS_PROB) {
          const MAX_TALENTS = 4;
          // 只有未达到上限时才能获得负面天赋
          if (student.talents.size < MAX_TALENTS) {
            const registered = Object.values(this._talents || {});
            // 遍历所有负面天赋
            for (const tDef of registered) {
              if (!tDef || !tDef.name) continue;
              // 只处理负面天赋（beneficial === false）
              if (tDef.beneficial !== false) continue;
              // 如果学生已有此天赋则跳过
              if (student.talents.has(tDef.name)) continue;
              const prob = Number(tDef.prob || 0) || 0;
              if (prob <= 0) continue;
              // 使用天赋自身的概率判断是否获得
              if (getRandom() < prob) {
                student.talents.add(tDef.name);
                try{ 
                  if(window.showEventModal) {
                    window.showEventModal({ 
                      name: '负面天赋获得', 
                      description: `由于长期处于高压状态，${student.name} 产生了负面心理，获得了负面天赋：【${tDef.name}】！`, 
                      week: window.game ? window.game.week : undefined 
                    });
                  }
                }catch(e){}
                // 获得第一个负面天赋后立即返回（限制每次最多1个）
                return;
              }
            }
          }
        }
      }
    }
  },

    // 旧兼容：提供 register / setTalentInfo 接口，但它们会映射到新的数据结构
    register(name, handler){
      // 注册仅逻辑处理器，显示信息需通过 setTalentInfo 单独设置
      if(!name || typeof handler !== 'function') throw new Error('invalid talent register');
      if(!this._talents[name]) this._talents[name] = { name, description: '', color: '#2b6cb0', prob: 0.0, handler, kind: 'positive', beneficial: true, Beneficial: true };
      else this._talents[name].handler = handler;
    },
    clear(){ this.clearTalents(); },
    setTalentInfo(name, info){
      if(!this._talents[name]) this._talents[name] = { name, description: '', color: '#2b6cb0', prob: 0.0, handler: null };
      Object.assign(this._talents[name], info);
    },

    // 注册默认天赋（此处保持空实现，调用者可自行添加）
    registerDefaultTalents(game, utils){
      // 注册请求中的天赋实现（有概率分配 + 事件触发效果）
      // utils: { uniform, uniformInt, normal, clamp }
      // Provide a safe clamp wrapper: when called with one argument, return the numeric value;
      // when called with min/max, forward to utils.clamp. This avoids accidental NaN when
      // existing code calls clamp(x) but utils.clamp expects (val,min,max).
      let clamp;
      if(utils && typeof utils.clamp === 'function'){
        clamp = function(val, min, max){
          if(typeof min === 'undefined' && typeof max === 'undefined'){
            const n = Number(val);
            return isFinite(n) ? n : 0;
          }
          return utils.clamp(val, min, max);
        };
      } else {
        clamp = function(val){ const n = Number(val); return isFinite(n) ? n : 0; };
      }

      // helper: 临时增益系统已集成到 Student 类中，不再需要单独初始化
      // 保留空函数以兼容旧代码
      function ensureTemp(student){
        // 空实现 - 临时增益系统已内置
      }

      // 冷静：比赛开始触发，临时提升所有能力 20%
      this.registerTalent({
        name: '冷静',
        description: '比赛开始时有较高概率在比赛中保持冷静，所有能力临时+20%。',
        color: '#4CAF50',
        prob: 0.10,
        beneficial: true,
        handler: function(student, eventName, ctx){
          try{
            // 支持正式比赛和模拟赛
            if(eventName !== 'contest_start' && eventName !== 'mock_start') return null;
            // 触发概率基础 60%，赛前压力>=60 每超 10 点额外 +10%
            let base = 0.6;
            const pressure = Number(student.pressure) || 0;
            if(pressure >= 60){
              base += Math.floor((pressure - 60) / 10) * 0.1;
            }
            if(getRandom() < base){
              // 使用临时增益系统：基础值 × 20%
              const thinkingBonus = student._base_thinking * 0.2;
              const codingBonus = student._base_coding * 0.2;
              const mentalBonus = student._base_mental * 0.2;
              
              student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingBonus);
              student.applyTempModifier('coding', student.getTempModifier('coding') + codingBonus);
              student.applyTempModifier('mental', student.getTempModifier('mental') + mentalBonus);
              student.applyTempModifier('constmental', student.getTempModifier('constmental') + mentalBonus);
              
              return '冷静发动：全能力 +20%（赛中临时）';
            }
          }catch(e){ console.error('冷静 天赋错误', e); }
          return null;
        }
      });

      // 伽罗瓦：遇到数学题时可能触发，数学知识与思维能力 +50%
      this.registerTalent({
        name: '伽罗瓦',
        description: '遇到数学题时有概率爆发，数学知识与思维能力临时+50%。',
        color: '#FF9800',
        prob: 0.05,
        beneficial: true,
        handler: function(student, eventName, ctx){
          try{
            if(eventName !== 'contest_select_problem') return null;
            const state = ctx && ctx.state;
            const pid = ctx && (ctx.problemId || ctx.problemId === 0 ? ctx.problemId : ctx.problemId);
            if(!state) return null;
            const probObj = state.getProblem(pid);
            if(!probObj || !probObj.tags) return null;
            if(!probObj.tags.includes('数学')) return null;
            if(getRandom() < 0.25){
              // 使用临时增益系统
              const thinkingBonus = student._base_thinking * 0.5;
              const mathBonus = student.knowledge_math * 0.5;
              
              student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingBonus);
              student.applyTempModifier('knowledge_math', student.getTempModifier('knowledge_math') + mathBonus);
              
              return '伽罗瓦发动：数学与思维能力 +50%（本题临时）';
            }
          }catch(e){ console.error('伽罗瓦 天赋错误', e); }
          return null;
        }
      });

      // 爆发型：连续换题 2 次后下一题发动，所有知识点与思维能力提高100%
      this.registerTalent({
        name: '爆发型',
        description: '连续换题两次后，下一题有较大概率爆发，知识点与思维能力临时翻倍。',
        color: '#E91E63',
        prob: 0.05,
        beneficial: true,
        handler: function(student, eventName, ctx){
          try{
            // track skips on student._talent_state._skipCount
            if(eventName === 'contest_skip_problem'){
              student._talent_state = student._talent_state || {};
              student._talent_state._skipCount = (student._talent_state._skipCount || 0) + 1;
              return null;
            }
            if(eventName === 'contest_select_problem'){
              student._talent_state = student._talent_state || {};
              const cnt = student._talent_state._skipCount || 0;
              // 如果累计 2 次以上跳题，则有50%概率发动
              student._talent_state._skipCount = 0; // 重置计数
              if(cnt >= 2 && getRandom() < 0.5){
                // 使用临时增益系统
                const thinkingBonus = student._base_thinking;
                const dsBonus = student.knowledge_ds;
                const graphBonus = student.knowledge_graph;
                const stringBonus = student.knowledge_string;
                const mathBonus = student.knowledge_math;
                const dpBonus = student.knowledge_dp;
                
                student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingBonus);
                student.applyTempModifier('knowledge_ds', student.getTempModifier('knowledge_ds') + dsBonus);
                student.applyTempModifier('knowledge_graph', student.getTempModifier('knowledge_graph') + graphBonus);
                student.applyTempModifier('knowledge_string', student.getTempModifier('knowledge_string') + stringBonus);
                student.applyTempModifier('knowledge_math', student.getTempModifier('knowledge_math') + mathBonus);
                student.applyTempModifier('knowledge_dp', student.getTempModifier('knowledge_dp') + dpBonus);
                
                return '爆发型发动：所有知识点与思维能力翻倍（本题临时）';
              }
            }
            // reset on solve
            if(eventName === 'contest_solve_problem' || eventName === 'contest_pass_subtask'){
              if(student._talent_state) student._talent_state._skipCount = 0;
            }
          }catch(e){ console.error('爆发型 天赋错误', e); }
          return null;
        }
      });

      // 心态稳定：已解题数 >=3 时心理素质提高50%
      this.registerTalent({
        name: '心态稳定',
        description: '比赛中解题数达到 3 题后，心理素质提升 50%。',
        color: '#2196F3',
        prob: 0.10,
        beneficial: true,
        handler: function(student, eventName, ctx){
          try{
            if(eventName !== 'contest_solve_problem') return null;
            const state = ctx && ctx.state;
            if(!state) return null;
            const solvedCount = state.problems.filter(p => p.solved).length;
            if(solvedCount >= 3){
              // 检查是否已经触发过（避免重复触发）
              student._talent_state = student._talent_state || {};
              if(!student._talent_state['心态稳定_triggered']){
                // 使用临时增益系统
                const mentalBonus = student._base_mental * 0.5;
                student.applyTempModifier('mental', student.getTempModifier('mental') + mentalBonus);
                student.applyTempModifier('constmental', student.getTempModifier('constmental') + mentalBonus);
                student._talent_state['心态稳定_triggered'] = true;
                return '心态稳定发动：心理素质 +50%（赛中临时）';
              }
            }
          }catch(e){ console.error('心态稳定 天赋错误', e); }
          return null;
        }
      });

      // Ad-hoc 大师：极低概率直接通过当前题目的最后一档（即直接得满分）
      this.registerTalent({
        name: 'Ad-hoc大师',
        description: '思考阶段有小概率直接通过当前题目的最后一档部分分（即直接得满分）。',
        color: '#9C27B0',
        prob: 0.03,
        beneficial: true,
        handler: function(student, eventName, ctx){
          try{
            if(eventName !== 'contest_thinking') return null;
            // 触发概率 1%
            if(getRandom() < 0.01){
              const state = ctx && ctx.state;
              const pid = ctx && (ctx.problemId || ctx.problemId === 0 ? ctx.problemId : ctx.problemId);
              if(!state) return null;
              const probObj = state.getProblem(pid);
              if(!probObj) return null;
              const lastIdx = probObj.subtasks.length - 1;
              if(lastIdx < 0) return null;
              const lastSub = probObj.subtasks[lastIdx];
              if(!lastSub) return null;
              // 直接通过最后一档（满分）
              state.updateScore(pid, lastSub.score);
              // 将 currentSubtask 移动到末尾，标记为已尝试
              probObj.currentSubtask = probObj.subtasks.length;
              if(probObj.solved){
                return `Ad-hoc大师发动：直接 AC 了 T${pid+1}（满分 ${lastSub.score}）`;
              }
              return `Ad-hoc大师发动：直接通过了 T${pid+1} 的最后一档，得分 ${lastSub.score}`;
            }
          }catch(e){ console.error('Ad-hoc大师 天赋错误', e); }
          return null;
        }
      });

      // 稳扎稳打：完全顺序开题（在选题阶段由选择逻辑遵守）
      this.registerTalent({
        name: '稳扎稳打',
        description: '只按题目顺序从前到后做题（不会跳到靠后的题目）。',
        color: '#795548',
        prob: 0.30,
        beneficial: true,
        handler: function(student, eventName, ctx){
          // 此天赋主要由 ContestSimulator.selectProblem 检查，无需在事件中处理
          return null;
        }
      });

      // 激进：思维能力 +40%，心理素质 -50%，只尝试当前题目的最后一档
      this.registerTalent({
        name: '激进',
        description: '激进做题风格：思维能力大幅提升但心理素质下降，只尝试最后一档部分分。',
        color: '#F44336',
        prob: 0.05,
        beneficial: true,
        handler: function(student, eventName, ctx){
          try{
            // 在比赛开始时立即应用效果（永久到本场比赛结束）
            // 支持正式比赛(contest_start)和模拟赛(mock_start)
            if(eventName === 'contest_start' || eventName === 'mock_start'){
              // 使用临时增益系统：基础值 × 40%，心理 × -50%
              const thinkingBonus = student._base_thinking * 0.4;
              const mentalPenalty = -student._base_mental * 0.5;
              
              student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingBonus);
              student.applyTempModifier('mental', student.getTempModifier('mental') + mentalPenalty);
              student.applyTempModifier('constmental', student.getTempModifier('constmental') + mentalPenalty);
              
              // 标记为激进以便模拟器在尝试档位时只尝试最后一档
              student._talent_state = student._talent_state || {};
              student._talent_state._aggressive = true;
              
              return '激进风格：思维能力大幅提升，心理素质减半（本场临时）';
            }
          }catch(e){ console.error('激进 天赋错误', e); }
          return null;
        }
      });

        // 新增天赋：数据结构狂热者
        this.registerTalent({
          name: '数据结构狂热者',
          description: "若选中题标签含 '数据结构'，在模拟赛中本题临时使 数据结构能力 翻倍（x2）。",
          color: '#00BCD4',
          prob: 0.08,
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'contest_select_problem') return null;
              // 仅在模拟赛生效
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              const state = ctx.state;
              const pid = ctx.problemId;
              if(!state) return null;
              const probObj = state.getProblem(pid);
              if(!probObj || !probObj.tags) return null;
              if(!probObj.tags.includes('数据结构')) return null;
              
              // 使用临时增益系统
              const dsBonus = student.knowledge_ds;
              student.applyTempModifier('knowledge_ds', student.getTempModifier('knowledge_ds') + dsBonus);
              
              return '数据结构狂热者发动：本题 数据结构能力 翻倍（本题临时）';
            }catch(e){ console.error('数据结构狂热者 天赋错误', e); }
            return null;
          }
        });

        // 新增天赋：图论直觉
        this.registerTalent({
          name: '图论直觉',
          description: "在模拟赛选题时若题目含 '图论' 标签，有 30% 概率临时增加 图论 +60% 和 思维 +20%。",
          color: '#3F51B5',
          prob: 0.05,
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'contest_select_problem') return null;
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              const state = ctx.state;
              const pid = ctx.problemId;
              if(!state) return null;
              const probObj = state.getProblem(pid);
              if(!probObj || !probObj.tags) return null;
              if(!probObj.tags.includes('图论')) return null;
              if(getRandom() < 0.30){
                // 使用临时增益系统
                const graphBonus = student.knowledge_graph * 0.6;
                const thinkingBonus = student._base_thinking * 0.2;
                
                student.applyTempModifier('knowledge_graph', student.getTempModifier('knowledge_graph') + graphBonus);
                student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingBonus);
                
                return '图论直觉发动：图论知识 +60%，思维 +20%（本题临时）';
              }
            }catch(e){ console.error('图论直觉 天赋错误', e); }
            return null;
          }
        });

        // 新增天赋：赛场狂热
        this.registerTalent({
          name: '赛场狂热',
          description: '比赛前半段（前 50% 题目）思维 +25%，后半段心理素质 constmental 衰减至 0.8 倍。',
          color: '#FF5722',
          prob: 0.08,
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              // 仅在模拟赛生效
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              const state = ctx.state;
              // 在比赛开始时记录半数分界点（支持正式比赛和模拟赛）
              if(eventName === 'contest_start' || eventName === 'mock_start'){
                if(state && Array.isArray(state.problems)){
                  student._talent_state._赛场狂热_half = Math.ceil(state.problems.length / 2);
                  student._talent_state._赛场狂热_appliedFirst = false;
                  student._talent_state._赛场狂热_appliedSecond = false;
                }
                return null;
              }
              // 在选题阶段根据题号判断属于前半段或后半段并应用对应临时调整
              if(eventName === 'contest_select_problem'){
                const pid = ctx.problemId;
                const half = Number(student._talent_state._赛场狂热_half || 0);
                if(typeof pid === 'undefined' || !half) return null;
                // 前半段：思维 +25%（只需第一次进入前半段时应用）
                if(pid < half && !student._talent_state._赛场狂热_appliedFirst){
                  const bonus = student._base_thinking * 0.25;
                  student.applyTempModifier('thinking', student.getTempModifier('thinking') + bonus);
                  student._talent_state._赛场狂热_appliedFirst = true;
                  return '赛场狂热（前半段）发动：思维 +25%（赛中临时）';
                }
                // 后半段：心理素质（per-contest constmental）衰减至 0.8 倍（只需第一次进入后半段时应用）
                if(pid >= half && !student._talent_state._赛场狂热_appliedSecond){
                  const baseMental = student._talent_state.constmental || student._base_mental || 50;
                  student._talent_state.constmental = clamp(baseMental * 0.8);
                  student._talent_state._赛场狂热_appliedSecond = true;
                  return '赛场狂热（后半段）发动：心理素质下降至 80%（赛中临时）';
                }
              }
            }catch(e){ console.error('赛场狂热 天赋错误', e); }
            return null;
          }
        });

        // 新增天赋：最后一搏
        this.registerTalent({
          name: '最后一搏',
          description: '在比赛最后一题触发，临时提升所有 knowledge +100%（模拟赛中生效）。',
          color: '#CDDC39',
          prob: 0.05,
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_select_problem') return null;
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              const state = ctx.state;
              if(!state || !Array.isArray(state.problems)) return null;
              const remaining = state.problems.filter(p => !p.solved).length;
              if(remaining <= 1){
                if(!student._talent_state['最后一搏']){
                  const keys = ['knowledge_ds', 'knowledge_graph', 'knowledge_string', 'knowledge_math', 'knowledge_dp'];
                  keys.forEach(k => {
                    const base = student['_base_' + k] || 0;
                    const bonus = base * 1.0; // +100%
                    student.applyTempModifier(k, student.getTempModifier(k) + bonus);
                  });
                  student._talent_state['最后一搏'] = true;
                  return '最后一搏发动：所有知识 +100%（赛中临时）';
                }
              }
            }catch(e){ console.error('最后一搏 天赋错误', e); }
            return null;
          }
        });

        // 新增天赋：跳跃思维
        this.registerTalent({
          name: '跳跃思维',
          description: '每跳题一次，思维 +10%，可叠加（最多 3 层，模拟赛中临时生效）。',
          color: '#009688',
          prob: 0.08,
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_skip_problem') return null;
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              // layers tracked in _talent_state._jump_layers
              const layers = student._talent_state._jump_layers || 0;
              if(layers >= 3) return null;
              const newLayers = Math.min(3, layers + 1);
              student._talent_state._jump_layers = newLayers;
              // Remove old modifier and apply new one: each层 +10% 叠加
              const oldBonus = student._base_thinking * (Math.pow(1.1, layers) - 1);
              const newBonus = student._base_thinking * (Math.pow(1.1, newLayers) - 1);
              student.applyTempModifier('thinking', student.getTempModifier('thinking') - oldBonus + newBonus);
              student._talent_state['跳跃思维'] = true;
              return `跳跃思维发动：跳题次数增加至 ${newLayers} 层，思维 +${(newLayers*10)}%（赛中临时）`;
            }catch(e){ console.error('跳跃思维 天赋错误', e); }
            return null;
          }
        });

        // 新增天赋：偏科
        this.registerTalent({
          name: '偏科',
          description: '比赛中偏科：随机将一个知识点 +200%，另一个 -50%。',
          color: '#673AB7',
          prob: 0.04,
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_thinking') return null;
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              // Small trigger chance per thinking tick
              //if(getRandom() >= 0.05) return null;
              if(student._talent_state['偏科']) return null; // only once per contest
              const keys = ['knowledge_ds','knowledge_graph','knowledge_string','knowledge_math','knowledge_dp'];
              // pick two distinct indices
              const i = Math.floor(getRandom() * keys.length);
              let j = Math.floor(getRandom() * keys.length);
              while(j === i) j = Math.floor(getRandom() * keys.length);
              const up = keys[i], down = keys[j];
              // apply changes using temp modifiers
              const baseUp = student['_base_' + up] || 0;
              const baseDown = student['_base_' + down] || 0;
              student.applyTempModifier(up, student.getTempModifier(up) + baseUp * 2.0); // +200%
              student.applyTempModifier(down, student.getTempModifier(down) - baseDown * 0.5); // -50%
              student._talent_state['偏科'] = { up: up, down: down };
              return `偏科发动：${up.replace('knowledge_','')} +200%，${down.replace('knowledge_','')} -50%（本场临时）`;
            }catch(e){ console.error('偏科 天赋错误', e); }
            return null;
          }
        });

        // ========== 新增天赋集合 (根据用户要求) ==========
        // 摸鱼大师：训练后，当强度高于 80 时（在现有代码中以 intensity===3 视为高强度），50%概率取消本次压力增加，但知识增益减少30%
        this.registerTalent({
          name: '摸鱼大师',
          description: '训练强度>80 时有50%概率触发：取消本次压力增加，但知识增益减少30%。',
        color: '#607D8B',
        prob: 0.15,
        kind: 'negative',
        beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'pressure_change') return null;
              if(!ctx) return null;
              // Accept different training-related sources (legacy: 'task_training', 'training', etc.)
              const src = ctx.source || '';
              if(!(src === 'training' || src === 'task_training' || (typeof src === 'string' && src.indexOf('train') === 0))) return null;
              const intensity = Number(ctx.intensity) || 1;
              // 把 intensity===3 视为强度>80
              if(intensity < 3) return null;
              if(getRandom() < 0.5){
                return { action: 'moyu_cancel_pressure', reduceKnowledgeRatio: 0.30, message: '摸鱼大师：本次训练压力取消，知识增益-30%'};
              }
            }catch(e){ console.error('摸鱼大师 天赋错误', e); }
            return null;
          }
        });

        // 抗压奇才：压力增加后，当增幅超过 10 时触发，将本次压力增幅减半
        this.registerTalent({
          name: '抗压奇才',
          description: '当压力增加超过10时自动触发：将本次压力增幅减半。',
        color: '#009688',
        prob: 0.12,
        kind: 'positive',
        beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'pressure_change') return null;
              if(!ctx || typeof ctx.amount === 'undefined') return null;
              const amt = Number(ctx.amount) || 0;
              if(amt > 10){
                return { action: 'halve_pressure', message: '抗压奇才：本次压力增幅减半' };
              }
            }catch(e){ console.error('抗压奇才 天赋错误', e); }
            return null;
          }
        });

        // 睡觉也在想题：放假/娱乐结束时触发，30%概率随机提升一项知识+2，同时压力-5
        this.registerTalent({
          name: '睡觉也在想题',
          description: '放假结束时概率触发：随机提升一项知识点，同时压力-5。',
        color: '#3F51B5',
        prob: 0.07,
        kind: 'positive',
        beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'vacation_end' && eventName !== 'entertainment_finished') return null;
              if(getRandom() < 0.30){
                const keys = ['knowledge_ds','knowledge_graph','knowledge_string','knowledge_math','knowledge_dp'];
                const idx = Math.floor(getRandom() * keys.length);
                const key = keys[idx];
                if(typeof student[key] === 'number'){
                  student[key] += 2;
                }
                student.pressure = Math.max(0, Number(student.pressure || 0) - 5);
                return '睡觉也在想题：知识+2，压力-5';
              }
            }catch(e){ console.error('睡觉也在想题 天赋错误', e); }
            return null;
          }
        });

        // 高原反应：外出集训时（outing -> province）若去青海/西藏/云南则压力翻倍
        // 当游戏地区本身就在高原地区（青海/西藏/云南）时，该天赋自动消除
        this.registerTalent({
          name: '高原反应',
          description: '在前往高原地区集训时压力翻倍。',
        color: '#795548',
        prob: 0.05,
        kind: 'negative',
        beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              if(eventName === 'week_start' || eventName === 'game_start'){
                if(typeof window !== 'undefined' && window.game && window.game.province_name){
                  const currentProvince = window.game.province_name;
                  if(currentProvince.indexOf('青海') !== -1 || currentProvince.indexOf('西藏') !== -1 || currentProvince.indexOf('云南') !== -1){
                    if(student.talents && student.talents.has('高原反应')){
                      student.talents.delete('高原反应');
                    }
                  }
                }
                return null;
              }
              
              // 外出集训时的压力翻倍效果
              if(eventName !== 'pressure_change') return null;
              if(!ctx || ctx.source !== 'outing') return null;
              const prov = (ctx.province || ctx.province_name || ctx.provinceName || '') + '';
              if(!prov) return null;
              if(prov.indexOf('青海') !== -1 || prov.indexOf('西藏') !== -1 || prov.indexOf('云南') !== -1){
                return { action: 'double_pressure', message: '高原反应：本次集训压力翻倍' };
              }
            }catch(e){ console.error('高原反应 天赋错误', e); }
            return null;
          }
        });

        // 电竞选手：娱乐活动-打CS 时，如果压力>50 则直接退队去学电竞
        this.registerTalent({
          name: '电竞选手',
          description: '打游戲时，如果压力过大将直接退队去学电竞。',
        color: '#F57C00',
        prob: 0.02,
        kind: 'negative',
        beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'entertainment_finished') return null;
              if(!ctx || !ctx.entertainmentName || ctx.entertainmentName.indexOf('CS') === -1) return null;
              if(Number(student.pressure || 0) > 50){
                student.active = false;
                student._quit_for_esports = true;
                return '电竞选手：直接退队去学电竞';
              }
            }catch(e){ console.error('电竞选手 天赋错误', e); }
            return null;
          }
        });

        // 原题机（伪）：模拟赛开始时能力+100%，模拟赛结束时还原并清零模拟赛收益（外部需处理收益清零）
        this.registerTalent({
          name: '原题机（伪）',
          description: '模拟赛时所有能力巨幅提升，但是模拟赛效果归零',
        color: '#8BC34A',
        prob: 0.05,
        kind: 'negative',
        beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              if(eventName === 'mock_start'){
                // 使用临时增益系统：在当前临时增益基础上再翻倍
                // 注意：这里使用当前的显示值（包括激进等其他天赋的增益）
                const currentThinking = student.thinking; // 这会获取 base + temp
                const currentCoding = student.coding;
                const currentMental = student.mental;
                
                // 计算需要额外增加的量（当前值的100%）
                const thinkingBonus = currentThinking;
                const codingBonus = currentCoding;
                const mentalBonus = currentMental;
                
                student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingBonus);
                student.applyTempModifier('coding', student.getTempModifier('coding') + codingBonus);
                student.applyTempModifier('mental', student.getTempModifier('mental') + mentalBonus);
                student.applyTempModifier('constmental', student.getTempModifier('constmental') + mentalBonus);
                
                return { action: 'mock_boost', message: '原题机（伪）：模拟赛能力临时+100%' };
              }
              if(eventName === 'mock_end' || eventName === 'mock_contest_finish'){
                // 清空所有临时增益，返回 mock_cleanup 通知外部清零知识收益
                student.clearTempModifiers();
                return { action: 'mock_cleanup', message: '原题机（伪）：模拟赛效果清零，所有能力恢复到模拟赛前' };
              }
            }catch(e){ console.error('原题机（伪） 天赋错误', e); }
            return null;
          }
        });

        // 卡卡就过了：比赛时已通过当前题得分大于70，有30%概率直接通过此题
        this.registerTalent({
          name: '卡卡就过了',
          description: '比赛时已取得本题得分>70分时，一定概率直接通过此题',
        color: '#FFC107',
        prob: 0.03,
        kind: 'positive',
        beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'contest_thinking' && eventName !== 'contest_select_problem') return null;
              if(!ctx || !ctx.state) return null;
              const pid = ctx.problemId;
              const probObj = ctx.state.getProblem(pid);
              if(!probObj) return null;
              if(probObj.maxScore > 70){
                if(getRandom() < 0.30){
                  return { action: 'auto_pass_problem', message: '卡卡就过了：直接通过此题' };
                }
              }
            }catch(e){ console.error('卡卡就过了 天赋错误', e); }
            return null;
          }
        });

        // 林黛玉：每回合结束 100% 触发，获得生病状态
        this.registerTalent({
          name: '林黛玉',
          description: '一直生病',
        color: '#E91E63',
        prob: 0.01,
        kind: 'negative',
        beneficial: false,
          handler: function(student, eventName, ctx){
            try{
                // 仅在每周结算时触发，避免与回合级别事件重复
                if(eventName !== 'week_end') return null;
                student.sick_weeks = (student.sick_weeks || 0) + 1;
                return { action: 'get_sick', message: '林黛玉：获得生病状态' };
              }catch(e){ console.error('林黛玉 天赋错误', e); }
            return null;
          }
        });

        // 追风者：事件 台风 时 100% 触发，效果压力清零
        this.registerTalent({
          name: '追风者',
          description: '台风时压力清零',
        color: '#03A9F4',
        prob: 0.03,
        kind: 'positive',
        beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'pressure_change') return null;
              if(!ctx || ctx.source !== 'typhoon') return null;
              student.pressure = 0;
              return { action: 'clear_pressure', message: '追风者：压力清零' };
            }catch(e){ console.error('追风者 天赋错误', e); }
            return null;
          }
        });

        // ========== 新增天赋集合 (第二批) ==========
        
        // 慢热：比赛前半场降低能力，后半场提升能力
        this.registerTalent({
          name: '慢热',
          description: '比赛初期能力受限，但随着时间推移逐渐进入状态。前半场思维与编程-20%，后半场+20%。',
          color: '#90A4AE',
          prob: 0.08,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              // 支持正式比赛和模拟赛
              if(eventName === 'contest_start' || eventName === 'mock_start'){
                // 记录比赛开始时间和总时长以便计算半场
                if(ctx && ctx.state){
                  student._talent_state._慢热_startTick = ctx.state.tick || 0;
                  student._talent_state._慢热_totalTicks = ctx.state.totalTicks || 180;
                  student._talent_state._慢热_phase = 'first';
                }
                // 前半场：降低 20%
                if(!student._talent_state._慢热_appliedFirst){
                  const thinkingPenalty = student._base_thinking * (-0.2);
                  const codingPenalty = student._base_coding * (-0.2);
                  student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingPenalty);
                  student.applyTempModifier('coding', student.getTempModifier('coding') + codingPenalty);
                  student._talent_state._慢热_appliedFirst = true;
                  return '慢热（前半场）：思维与编程-20%';
                }
              }
              // 在比赛进行中检查是否进入后半场
              if(eventName === 'contest_thinking' || eventName === 'contest_select_problem'){
                if(!ctx || !ctx.state) return null;
                const currentTick = ctx.state.tick || 0;
                const startTick = student._talent_state._慢热_startTick || 0;
                const totalTicks = student._talent_state._慢热_totalTicks || 180;
                const halfTick = startTick + Math.floor(totalTicks / 2);
                
                // 如果已进入后半场且尚未切换
                if(currentTick >= halfTick && student._talent_state._慢热_phase === 'first'){
                  student._talent_state._慢热_phase = 'second';
                  // 移除前半场的降低，应用后半场提升
                  const thinkingChange = student._base_thinking * 0.4; // 从-20%变为+20%，共+40%
                  const codingChange = student._base_coding * 0.4;
                  student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingChange);
                  student.applyTempModifier('coding', student.getTempModifier('coding') + codingChange);
                  return '慢热（后半场）：思维与编程+20%';
                }
              }
            }catch(e){ console.error('慢热 天赋错误', e); }
            return null;
          }
        });

        // 虎头蛇尾：比赛前半场提升能力，后半场降低能力
        this.registerTalent({
          name: '虎头蛇尾',
          description: '比赛开始时状态极佳，但耐力不足。前半场思维与心理+30%，后半场所有能力-20%。',
          color: '#FF6F00',
          prob: 0.08,
          kind: 'negative',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              // 支持正式比赛和模拟赛
              if(eventName === 'contest_start' || eventName === 'mock_start'){
                if(ctx && ctx.state){
                  student._talent_state._虎头蛇尾_startTick = ctx.state.tick || 0;
                  student._talent_state._虎头蛇尾_totalTicks = ctx.state.totalTicks || 180;
                  student._talent_state._虎头蛇尾_phase = 'first';
                }
                // 前半场：提升 30%
                if(!student._talent_state._虎头蛇尾_appliedFirst){
                  const thinkingBonus = student._base_thinking * 0.3;
                  student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingBonus);
                  const baseMental = (student._talent_state && student._talent_state.constmental) || student._base_mental || 50;
                  student._talent_state.constmental = clamp(baseMental * 1.3);
                  student._talent_state._虎头蛇尾_appliedFirst = true;
                  return '虎头蛇尾（前半场）：思维与心理+30%';
                }
              }
              if(eventName === 'contest_thinking' || eventName === 'contest_select_problem'){
                if(!ctx || !ctx.state) return null;
                const currentTick = ctx.state.tick || 0;
                const startTick = student._talent_state._虎头蛇尾_startTick || 0;
                const totalTicks = student._talent_state._虎头蛇尾_totalTicks || 180;
                const halfTick = startTick + Math.floor(totalTicks / 2);
                
                if(currentTick >= halfTick && student._talent_state._虎头蛇尾_phase === 'first'){
                  student._talent_state._虎头蛇尾_phase = 'second';
                  // 移除前半场的+30%，应用后半场-20%，等于从+30%变为-20%
                  const thinkingChange = student._base_thinking * (-0.5); // +30% -> -20%, 共-50%
                  const codingChange = student._base_coding * (-0.2); // 0 -> -20%
                  student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingChange);
                  student.applyTempModifier('coding', student.getTempModifier('coding') + codingChange);
                  const baseMental = student._base_mental || 50;
                  student._talent_state.constmental = clamp(baseMental * 0.8); // 从1.3变为0.8
                  return '虎头蛇尾（后半场）：所有能力-20%';
                }
              }
            }catch(e){ console.error('虎头蛇尾 天赋错误', e); }
            return null;
          }
        });

        // 完美主义：比赛满分则压力清零，否则压力增加
        this.registerTalent({
          name: '完美主义',
          description: '若比赛满分，则压力清零；否则压力增加。',
          color: '#9C27B0',
          prob: 0.05,
          kind: 'positive',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'contest_finish') return null;
              if(!ctx || !ctx.state) return null;
              const state = ctx.state;
              // 使用 state.totalScore 获取学生的实际总分
              const totalScore = state.totalScore || 0;
              const maxPossible = state.problems.reduce((sum, p) => {
                const subtasks = p.subtasks || [];
                return sum + subtasks.reduce((s, sub) => s + (sub.score || 0), 0);
              }, 0);
              
              if(totalScore >= maxPossible && maxPossible > 0){
                // 满分：压力清零
                student.pressure = 0;
                return { action: 'perfect_clear_pressure', message: '完美主义：满分！压力清零' };
              } else {
                // 未满分：标记压力惩罚翻倍
                student.pressure += 15;
                return { action: 'perfect_double_penalty', message: '完美主义：未满分，压力增加' };
              }
            }catch(e){ console.error('完美主义 天赋错误', e); }
            return null;
          }
        });

        // 绝境逢生：比赛过半且得分为0时有概率爆发
        this.registerTalent({
          name: '绝境逢生',
          description: '在比赛过半但得分仍为0时，有概率爆发，短时大幅提升能力。',
          color: '#D32F2F',
          prob: 0.04,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName === 'contest_thinking' || eventName === 'contest_select_problem'){
                if(!ctx || !ctx.state) return null;
                const state = ctx.state;
                const currentTick = state.tick || 0;
                const totalTicks = state.totalTicks || 180;
                const halfTick = Math.floor(totalTicks / 2);
                
                // 检查是否过半且得分为0
                if(currentTick >= halfTick){
                  const totalScore = state.problems.reduce((sum, p) => sum + (p.maxScore || 0), 0);
                  if(totalScore === 0 && !student._talent_state._绝境逢生_triggered){
                    if(getRandom() < 0.5){
                      student._talent_state._绝境逢生_triggered = true;
                      // currentTick 单位为 tick（每 tick = 10 分钟），持续 30 分钟 => 3 ticks
                      student._talent_state._绝境逢生_endTick = currentTick + 3;
                      
                      if(!student._talent_state._绝境逢生_active){
                        const thinkingBonus = student._base_thinking * 1.0; // +100%
                        const codingBonus = student._base_coding * 1.0;
                        student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingBonus);
                        student.applyTempModifier('coding', student.getTempModifier('coding') + codingBonus);
                        student._talent_state._绝境逢生_active = true;
                        return '绝境逢生发动：思维与编程翻倍（30分钟）';
                      }
                    }
                  }
                }
                
                // 检查效果是否到期
                const endTick = student._talent_state._绝境逢生_endTick || 0;
                if(endTick > 0 && currentTick >= endTick && student._talent_state._绝境逢生_active){
                  // 移除临时增益
                  const thinkingBonus = student._base_thinking * 1.0;
                  const codingBonus = student._base_coding * 1.0;
                  student.applyTempModifier('thinking', student.getTempModifier('thinking') - thinkingBonus);
                  student.applyTempModifier('coding', student.getTempModifier('coding') - codingBonus);
                  student._talent_state._绝境逢生_active = false;
                  student._talent_state._绝境逢生_endTick = 0;
                  return '绝境逢生效果结束';
                }
              }
            }catch(e){ console.error('绝境逢生 天赋错误', e); }
            return null;
          }
        });


        // 遇强则强：面对高难度题目时能力提升
        this.registerTalent({
          name: '遇强则强',
          description: '挑战远超自己能力的题目时，反而会更兴奋。',
          color: '#1976D2',
          prob: 0.06,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'contest_check_subtask') return null;
              if(!ctx || typeof ctx.difficulty === 'undefined') return null;
              const diff = Number(ctx.difficulty) || 0;
              const ability = Number(ctx.checkType === 'thinking' ? student.thinking : student.coding) || 0;
              
              // 难度高于能力30%以上
              if(diff > ability * 1.3){
                return { action: 'boost_ability', amount: 0.25, message: '遇强则强：能力临时+25%' };
              }
            }catch(e){ console.error('遇强则强 天赋错误', e); }
            return null;
          }
        });

        // 遇弱则弱：面对简单题目时容易粗心
        this.registerTalent({
          name: '遇弱则弱',
          description: '面对简单题目时容易粗心，导致发挥失常。',
          color: '#757575',
          prob: 0.06,
          kind: 'negative',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'contest_check_subtask') return null;
              if(!ctx || typeof ctx.difficulty === 'undefined') return null;
              const diff = Number(ctx.difficulty) || 0;
              const ability = Number(ctx.checkType === 'thinking' ? student.thinking : student.coding) || 0;
              
              // 难度低于能力50%
              if(diff < ability * 0.5){
                return { action: 'reduce_ability', amount: 0.30, message: '遇弱则弱：粗心大意，能力-30%' };
              }
            }catch(e){ console.error('遇弱则弱 天赋错误', e); }
            return null;
          }
        });

        // 读题专家：降低思维难度
        this.registerTalent({
          name: '读题专家',
          description: '擅长理解题意，在思维检定上占有优势。',
          color: '#00897B',
          prob: 0.10,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'contest_check_subtask') return null;
              if(!ctx || ctx.checkType !== 'thinking') return null;
              return { action: 'reduce_difficulty', amount: 0.10, message: '读题专家：思维难度-10%' };
            }catch(e){ console.error('读题专家 天赋错误', e); }
            return null;
          }
        });

        // 键盘侠：降低代码难度
        this.registerTalent({
          name: '键盘侠',
          description: '编码速度极快，在代码检定上占有优势。',
          color: '#5E35B1',
          prob: 0.10,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'contest_check_subtask') return null;
              if(!ctx || ctx.checkType !== 'coding') return null;
              return { action: 'reduce_difficulty', amount: 0.10, message: '键盘侠：代码难度-10%' };
            }catch(e){ console.error('键盘侠 天赋错误', e); }
            return null;
          }
        });

        // 字符串魔法师：字符串题目能力提升
        this.registerTalent({
          name: '字符串魔法师',
          description: '对字符串处理有特殊技巧，编码能力和相关知识提升。',
          color: '#C2185B',
          prob: 0.05,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_select_problem') return null;
              const state = ctx && ctx.state;
              const pid = ctx && ctx.problemId;
              if(!state) return null;
              const probObj = state.getProblem(pid);
              if(!probObj || !probObj.tags || !probObj.tags.includes('字符串')) return null;
              
              if(getRandom() < 0.30){
                if(!student._talent_state['字符串魔法师']){
                  const stringBonus = student._base_knowledge_string * 0.6; // +60%
                  const codingBonus = student._base_coding * 0.6;
                  student.applyTempModifier('knowledge_string', student.getTempModifier('knowledge_string') + stringBonus);
                  student.applyTempModifier('coding', student.getTempModifier('coding') + codingBonus);
                  student._talent_state['字符串魔法师'] = true;
                  return '字符串魔法师发动：字符串知识与编程+60%';
                }
              }
            }catch(e){ console.error('字符串魔法师 天赋错误', e); }
            return null;
          }
        });

        // 知识熔炉：解题后可能提升其他知识点
        this.registerTalent({
          name: '知识熔炉',
          description: '在比赛中解决题目时，可能触类旁通，临时提升其他知识点。',
          color: '#F4511E',
          prob: 0.04,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_pass_subtask') return null;
              if(getRandom() < 0.10){
                const allKnowledge = ['knowledge_ds','knowledge_graph','knowledge_string','knowledge_math','knowledge_dp'];
                // 获取当前题目的知识点（如果有）
                const currentKnowledge = ctx && ctx.knowledgeType;
                const others = allKnowledge.filter(k => k !== currentKnowledge);
                if(others.length > 0){
                  const randomK = others[Math.floor(getRandom() * others.length)];
                  const base = student['_base_' + randomK] || 0;
                  const bonus = base * 0.2; // +20%
                  student.applyTempModifier(randomK, student.getTempModifier(randomK) + bonus);
                  student._talent_state['知识熔炉'] = true;
                  return `知识熔炉发动：${randomK.replace('knowledge_','')}知识+20%`;
                }
              }
            }catch(e){ console.error('知识熔炉 天赋错误', e); }
            return null;
          }
        });

        // 举一反三：训练时其他知识点也微小增长（监听 pressure_change 事件并检查 source）
        this.registerTalent({
          name: '举一反三',
          description: '训练时效率更高，训练主知识点时，其他知识点也可能微小增长。',
          color: '#7CB342',
          prob: 0.08,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              // 需要监听训练相关事件
              if(eventName !== 'pressure_change') return null;
              if(!ctx) return null;
              const src = ctx.source || '';
              if(!(src === 'training' || src === 'task_training' || (typeof src === 'string' && src.indexOf('train') === 0))) return null;
              // 避免重复触发
              if(student._talent_state && student._talent_state._举一反三_triggered) return null;
              if(getRandom() < 0.20){
                // 获取训练的目标知识点（优先 ctx.topic，其次尝试 ctx.task.type）
                const topic = ctx.topic || (ctx.task && (ctx.task.type || ctx.task.topic));
                const allKnowledge = ['knowledge_ds','knowledge_graph','knowledge_string','knowledge_math','knowledge_dp'];
                // 根据 topic 确定主练知识点
                let mainKnowledge = null;
                if(topic === '数据结构') mainKnowledge = 'knowledge_ds';
                else if(topic === '图论') mainKnowledge = 'knowledge_graph';
                else if(topic === '字符串') mainKnowledge = 'knowledge_string';
                else if(topic === '数学') mainKnowledge = 'knowledge_math';
                else if(topic === 'DP') mainKnowledge = 'knowledge_dp';
                
                // 如果有主练知识点，则其他知识点额外增长
                if(mainKnowledge){
                  const others = allKnowledge.filter(k => k !== mainKnowledge);
                  // 假设主练知识点本次增长了某个值，其他知识点增长 10%（需外部系统配合）
                  // 这里我们直接给其他知识点加少量值
                  for(const k of others){
                    student[k] = Number(student[k] || 0) + 0.5; // 小幅增长
                  }
                  if(!student._talent_state) student._talent_state = {};
                  student._talent_state._举一反三_triggered = true;
                  return '举一反三：其他知识点也有所增长';
                }
              }
            }catch(e){ console.error('举一反三 天赋错误', e); }
            return null;
          }
        });


        // 注意力涣散：训练效果降低（需要外部训练系统配合处理）
        this.registerTalent({
          name: '注意力涣散',
          description: '学习效率低下，训练效果打折扣。',
          color: '#616161',
          prob: 0.05,
          kind: 'negative',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'pressure_change') return null;
              if(!ctx) return null;
              const src = ctx.source || '';
              if(!(src === 'training' || src === 'task_training' || (typeof src === 'string' && src.indexOf('train') === 0))) return null;
              return { action: 'reduce_all_gain', amount: 0.20, message: '注意力涣散：所有训练增益-20%' };
            }catch(e){ console.error('注意力涣散 天赋错误', e); }
            return null;
          }
        });

        // 好奇宝宝：训练时可能学别的
        this.registerTalent({
          name: '好奇宝宝',
          description: '训练时有概率"走神"去学别的，随机提升一项非目标知识。',
          color: '#26C6DA',
          prob: 0.06,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'pressure_change') return null;
              if(!ctx) return null;
              const src = ctx.source || '';
              if(!(src === 'training' || src === 'task_training' || (typeof src === 'string' && src.indexOf('train') === 0))) return null;
              if(student._talent_state && student._talent_state._好奇宝宝_triggered) return null;
              
              if(getRandom() < 0.5){
                // 兼容不同的训练触发源，并从 ctx.task 回退获取 topic
                const topic = ctx.topic || (ctx.task && (ctx.task.type || ctx.task.topic));
                const allKnowledge = ['knowledge_ds','knowledge_graph','knowledge_string','knowledge_math','knowledge_dp'];
                let mainKnowledge = null;
                if(topic === '数据结构') mainKnowledge = 'knowledge_ds';
                else if(topic === '图论') mainKnowledge = 'knowledge_graph';
                else if(topic === '字符串') mainKnowledge = 'knowledge_string';
                else if(topic === '数学') mainKnowledge = 'knowledge_math';
                else if(topic === 'DP') mainKnowledge = 'knowledge_dp';
                
                if(mainKnowledge){
                  const others = allKnowledge.filter(k => k !== mainKnowledge);
                  const randomK = others[Math.floor(getRandom() * others.length)];
                  // 减少目标知识增长，增加随机知识
                  const mainVal = Number(student[mainKnowledge] || 0);
                  student[mainKnowledge] = Math.max(0, mainVal * 0.5);
                  student[randomK] = Number(student[randomK] || 0) + mainVal * 0.5;
                  
                  if(!student._talent_state) student._talent_state = {};
                  student._talent_state._好奇宝宝_triggered = true;
                  return `好奇宝宝：走神了，${randomK.replace('knowledge_','')}增长`;
                }
              }
            }catch(e){ console.error('好奇宝宝 天赋错误', e); }
            return null;
          }
        });

        // 专注：高强度训练压力减少，低强度压力增加
        this.registerTalent({
          name: '专注',
          description: '适合高强度训练，高强度下压力增长减缓；但讨厌低强度训练。',
          color: '#5C6BC0',
          prob: 0.07,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'pressure_change') return null;
              if(!ctx || ctx.source !== 'training') return null;
              const intensity = Number(ctx.intensity) || 1;
              if(intensity >= 3){
                // 在原有压力变化基础上减少 30%
                return { action: 'reduce_pressure', amount: 0.30, message: '专注：高强度训练压力-30%' };
              } else if(intensity <= 1){
                return { action: 'increase_pressure', amount: 0.30, message: '专注：低强度训练压力+30%' };
              }
            }catch(e){ console.error('专注 天赋错误', e); }
            return null;
          }
        });

        // 劳逸结合：娱乐效果翻倍
        this.registerTalent({
          name: '劳逸结合',
          description: '"娱乐"行动的效果翻倍。',
          color: '#66BB6A',
          prob: 0.10,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'entertainment_finished') return null;
              // 直接增加额外的压力恢复（娱乐通常减压，这里再减一次）
              const baseCost = Number(ctx && ctx.cost) || 10;
              // 娱乐通常恢复压力，这里额外恢复相同数值
              student.pressure = Math.max(0, Number(student.pressure || 0) - baseCost);
              return '劳逸结合：娱乐压力恢复翻倍';
            }catch(e){ console.error('劳逸结合 天赋错误', e); }
            return null;
          }
        });

        // 厌学：高压力时训练可能无效
        this.registerTalent({
          name: '厌学',
          description: '压力较高时，训练可能完全无效并导致压力剧增。',
          color: '#6D4C41',
          prob: 0.04,
          kind: 'negative',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'pressure_change') return null;
              if(!ctx || ctx.source !== 'training') return null;
              if(student._talent_state && student._talent_state._厌学_triggered) return null;
              
              if(Number(student.pressure || 0) > 60){
                if(getRandom() < 0.25){
                  // 清空本次训练的知识增益（需要外部系统配合）
                  // 这里直接增加额外压力
                  student.pressure = Math.min(100, Number(student.pressure || 0) + 15);
                  if(!student._talent_state) student._talent_state = {};
                  student._talent_state._厌学_triggered = true;
                  return { action: 'reject_training', message: '厌学：训练无效，压力+15' };
                }
              }
            }catch(e){ console.error('厌学 天赋错误', e); }
            return null;
          }
        });


        // 水土不服：外出集训效果下降
        this.registerTalent({
          name: '水土不服',
          description: '"外出集训"时容易不适应，效果下降且压力增加更多。',
          color: '#8D6E63',
          prob: 0.06,
          kind: 'negative',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'outing_finished' && eventName !== 'pressure_change') return null;
              // 如果有高原反应则不触发
              if(student.talents && student.talents.has('高原反应')) return null;
              
              if(eventName === 'outing_finished'){
                // 减少知识增益
                if(ctx && ctx.knowledge_gain){
                  const reduction = ctx.knowledge_gain * 0.20;
                  const allKnowledge = ['knowledge_ds','knowledge_graph','knowledge_string','knowledge_math','knowledge_dp'];
                  const randomK = allKnowledge[Math.floor(getRandom() * allKnowledge.length)];
                  student[randomK] = Math.max(0, Number(student[randomK] || 0) - reduction);
                }
                return '水土不服：集训增益-20%';
              }
              
              if(eventName === 'pressure_change' && ctx && ctx.source === 'outing'){
                // 增加额外压力
                student.pressure = Math.min(100, Number(student.pressure || 0) + ctx.amount * 0.30);
                return '水土不服：压力额外+30%';
              }
            }catch(e){ console.error('水土不服 天赋错误', e); }
            return null;
          }
        });

        // 乐天派：每周压力恢复增加，燃尽概率降低（需要在每周结算时处理）
        this.registerTalent({
          name: '乐天派',
          description: '天性乐观，每周压力自动恢复量增加，且不易"燃尽"。',
          color: '#FFA726',
          prob: 0.12,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              // 这个天赋主要在游戏逻辑中每周结算时检测并应用
              // 在这里不做处理，返回标记即可
              if(eventName === 'week_end'){
                // 直接应用额外压力恢复
                student.pressure = Math.max(0, Number(student.pressure || 0) - 3);
                return '乐天派：额外压力恢复+3';
              }
            }catch(e){ console.error('乐天派 天赋错误', e); }
            return null;
          }
        });

        // 悲观主义：比赛失利压力加倍
        this.registerTalent({
          name: '悲观主义',
          description: '容易积累压力，比赛失利（未晋级）时压力惩罚加倍。',
          color: '#455A64',
          prob: 0.08,
          kind: 'negative',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              // 监听比赛结束事件
              if(eventName !== 'contest_finish') return null;
              if(!ctx) return null;
              // If passed is explicitly provided, only trigger on failure
              if(typeof ctx.passed !== 'undefined'){
                if(ctx.passed) return null;
              } else {
                // Try to infer failure from provided state: if any problem.solved exists, consider it not a loss
                const state = ctx.state;
                if(state && Array.isArray(state.problems)){
                  const solvedCount = state.problems.filter(p => p && p.solved).length;
                  if(solvedCount > 0) return null; // had at least one AC -> not considered失利
                } else {
                  // Cannot determine pass/fail; do not trigger to avoid false positives
                  return null;
                }
              }
              // 增加额外压力
              student.pressure = Math.min(100, Number(student.pressure || 0) + 15);
              return '悲观主义：失利压力翻倍';
            }catch(e){ console.error('悲观主义 天赋错误', e); }
            return null;
          }
        });

        // 铁人：生病概率降低（需要在生病检测逻辑中处理）
        this.registerTalent({
          name: '铁人',
          description: '体质强健，因天气或高压导致生病的概率大幅降低。',
          color: '#78909C',
          prob: 0.10,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              // 这个天赋主要在生病检测逻辑中起作用
              // 在这里返回标记供外部系统识别
              return null; // 被动天赋，无需主动触发
            }catch(e){ console.error('铁人 天赋错误', e); }
            return null;
          }
        });

        // 自愈：生病恢复加快（需要在每周结算中检测）
        this.registerTalent({
          name: '自愈',
          description: '生病时恢复速度加快。',
          color: '#81C784',
          prob: 0.08,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              // 这个天赋需要在游戏主循环每周结算时检测
              // 在这里返回被动标记
              return null; // 被动天赋，在外部系统中处理
            }catch(e){ console.error('自愈 天赋错误', e); }
            return null;
          }
        });

        // 压力转化：压力越高思维越强但心理越弱
        this.registerTalent({
          name: '压力转化',
          description: '压力越高，比赛中思维越活跃，但心理稳定性越差。',
          color: '#AB47BC',
          prob: 0.04,
          kind: 'positive',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              // 支持正式比赛和模拟赛
              if(eventName !== 'contest_start' && eventName !== 'mock_start') return null;
              const pressure = Number(student.pressure || 0);
              if(pressure > 50){
                const layers = Math.floor((pressure - 50) / 10);
                if(layers > 0 && !student._talent_state['压力转化']){
                  const thinkingBonus = student._base_thinking * (Math.pow(1.1, layers) - 1);
                  student.applyTempModifier('thinking', student.getTempModifier('thinking') + thinkingBonus);
                  const baseMental = (student._talent_state && student._talent_state.constmental) || student._base_mental || 50;
                  student._talent_state.constmental = clamp(baseMental * Math.pow(0.85, layers));
                  student._talent_state['压力转化'] = true;
                  return `压力转化：思维+${layers*10}%，心理-${Math.round((1-Math.pow(0.85,layers))*100)}%`;
                }
              }
            }catch(e){ console.error('压力转化 天赋错误', e); }
            return null;
          }
        });

        // 扫把星：增加负面事件概率（被动天赋，在事件系统中检测）
        this.registerTalent({
          name: '扫把星',
          description: '运气不佳，更容易触发负面的团队运营事件。',
          color: '#424242',
          prob: 0.05,
          kind: 'negative',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              // 被动天赋，在事件触发概率计算时检测
              return null;
            }catch(e){ console.error('扫把星 天赋错误', e); }
            return null;
          }
        });

        // 省钱大师：外出集训（outing）开支减免（被动天赋，外部花费逻辑需检测返回的 action）
        this.registerTalent({
          name: '省钱大师',
          description: '规划开支能手：若学生参加外出集训，则本次集训开支直接减少 5000。',
          color: '#43A047',
          prob: 0.06,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              // 被动天赋：当外出集训结算时（事件 outing_finished 或类似），返回一个标准 action
              // 外部系统应检测到 action === 'reduce_outing_cost' 并将金额从本次集训支出中减去 amount
              if(eventName === 'outing_finished' || eventName === 'outing_cost_calculate'){
                // 直接给出固定减免金额，概率触发可按需修改为固定必定触发或保留概率
                // 这里按需求改为固定生效（如果需要概率，可改为 getRandom() < 0.2）
                return { action: 'reduce_outing_cost', amount: 5000, message: '省钱大师：集训开支减5000' };
              }
            }catch(e){ console.error('省钱大师 天赋错误', e); }
            return null;
          }
        });

        // 氪金玩家：付费模拟效果提升
        this.registerTalent({
          name: '氪金玩家',
          description: '坚信付费的力量，"付费模拟赛"的效果显著提升。',
          color: '#FFD700',
          prob: 0.04,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              // 监听模拟赛结束事件
              // 注意：知识增幅已在 contest-integration.js 中应用，此处仅作为日志记录
              if(eventName === 'mock_contest_finish' || eventName === 'mock_end'){
                // 计算本次获得的知识增幅总和（仅用于日志显示）
                const allKnowledge = ['knowledge_ds','knowledge_graph','knowledge_string','knowledge_math','knowledge_dp'];
                let totalKnowledgeIncrease = 0;
                for(const k of allKnowledge){
                  // 注意：此时知识值已是最终值，包含50%加成
                  // 为了显示实际增加的知识量，我们只是记录而不再修改
                }
                return '氪金玩家：付费模拟赛知识+50%';
              }
            }catch(e){ console.error('氪金玩家 天赋错误', e); }
            return null;
          }
        });

        // 天气敏感：天气影响翻倍（被动天赋，在舒适度计算中检测）
        this.registerTalent({
          name: '天气敏感',
          description: '舒适度受天气影响剧烈，极端天气惩罚和良好天气增益都会加倍。',
          color: '#80DEEA',
          prob: 0.07,
          kind: 'negative',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              // 被动天赋，在舒适度计算逻辑中检测
              return null;
            }catch(e){ console.error('天气敏感 天赋错误', e); }
            return null;
          }
        });

        // 美食家：食堂影响翻倍（被动天赋，在舒适度和压力恢复计算中检测）
        this.registerTalent({
          name: '美食家',
          description: '对食物异常执着，"食堂"设施等级对舒适度和压力恢复的影响翻倍。',
          color: '#FF8A65',
          prob: 0.08,
          kind: 'positive',
          beneficial: true,
          handler: function(student, eventName, ctx){
            try{
              // 被动天赋，在食堂效果计算时检测
              return null;
            }catch(e){ console.error('美食家 天赋错误', e); }
            return null;
          }
        });



        // 庸才：无法习得新天赋（被动天赋，在 tryAcquireTalent 中检测）
        this.registerTalent({
          name: '庸才',
          description: '资质平平，在训练中无法领悟任何新的天赋。',
          color: '#9E9E9E',
          prob: 0.03,
          kind: 'negative',
          beneficial: false,
          handler: function(student, eventName, ctx){
            try{
              // 被动天赋，在 tryAcquireTalent 逻辑中检测
              // 如果学生有"庸才"天赋，则直接返回不获得新天赋
              return null;
            }catch(e){ console.error('庸才 天赋错误', e); }
            return null;
          }
        });

      // 清理逻辑：当比赛结束时，清空所有临时增益
      // 监听 contest_finish / mock_contest_finish / mock_end 事件
      this.registerTalent({
        name: '__talent_cleanup__',
        description: '内部：清理临时天赋效果',
        color: '#9E9E9E',
        prob: 0.0,
        handler: function(student, eventName, ctx){
          // 支持正式比赛结束(contest_finish)、模拟赛结束(mock_contest_finish)和模拟赛结束(mock_end)
          if(eventName !== 'contest_finish' && eventName !== 'mock_contest_finish' && eventName !== 'mock_end') return null;
          try{
            // 使用新的临时增益系统：直接清空所有临时增益
            // 注意：原题机伪会在自己的handler中处理清理，这里作为兜底
            if(student.clearTempModifiers){
              student.clearTempModifiers();
            }
            return null;
          }catch(e){ console.error('talent cleanup error', e); }
          return null;
        }
      });
    }
  };

  // 兼容旧的简单全局处理方式
  if(typeof window !== 'undefined'){
    window.TalentManager = TalentManager;
    // 旧兼容：保留一个全局 handler 映射，供旧代码直接使用（但优先使用 TalentManager）
    window._talentHandlers = window._talentHandlers || {};
  }

  global.TalentManager = TalentManager;
})(window);
