/* talent.js - 学生特质（talent）管理器
   目的：提供一个集中注册/触发学生特质的管理器（TalentManager），便于扩展特质逻辑并在事件或比赛中调用。
   使用说明：在页面中先于 `script.js` 加载本文件，或者确保在触发 student.triggerTalents 之前 window.TalentManager 已就绪。
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
      const def = Object.assign({ description: '', color: '#2b6cb0', prob: 0.0, handler: null }, talentDef);
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

    // 按概率为单个学生分配天赋
    // 策略：对每个已注册天赋，独立以 prob 概率赋予学生（便于组合）
    assignTalentsToStudent(student){
      if(!student) return;
      // 为每个学生最多分配 4 个天赋
      for(const name of this.getRegistered()){
        if(student.talents && student.talents.size >= 4) break;
        const t = this.getTalent(name);
        if(!t) continue;
        const p = Number(t.prob) || 0;
        if(p <= 0) continue;
        // 随机判断
        if(Math.random() < p){
          if(typeof student.addTalent === 'function') student.addTalent(name);
          else if(student.talents) student.talents.add(name);
        }
      }
    },

    // 旧兼容：提供 register / setTalentInfo 接口，但它们会映射到新的数据结构
    register(name, handler){
      // 注册仅逻辑处理器，显示信息需通过 setTalentInfo 单独设置
      if(!name || typeof handler !== 'function') throw new Error('invalid talent register');
      if(!this._talents[name]) this._talents[name] = { name, description: '', color: '#2b6cb0', prob: 0.0, handler };
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

      // helper: ensure per-contest temporary storage on student
      function ensureTemp(student){
        student._talent_backup = student._talent_backup || {};
        student._talent_state = student._talent_state || {};
        // initialize per-contest constmental copy if not present
        if(typeof student._talent_state.constmental === 'undefined'){
          student._talent_state.constmental = Number(student.mental || 50);
        }
      }

      // 冷静：比赛开始触发，临时提升所有能力 20%
      this.registerTalent({
        name: '冷静',
        description: '比赛开始时有较高概率在比赛中保持冷静，所有能力临时+20%。',
        color: '#4CAF50',
        prob: 0.30,
        handler: function(student, eventName, ctx){
          try{
            ensureTemp(student);
            if(eventName !== 'contest_start') return null;
            // 触发概率基础 60%，赛前压力>=60 每超 10 点额外 +10%
            let base = 0.6;
            const pressure = Number(student.pressure) || 0;
            if(pressure >= 60){
              base += Math.floor((pressure - 60) / 10) * 0.1;
            }
            if(Math.random() < base){
              // 备份并放大
              if(!student._talent_backup['冷静']){
                // backup raw original values (avoid forcing fallback to 0 which may mask bugs)
                student._talent_backup['冷静'] = { thinking: student.thinking, coding: student.coding, constmental: (student._talent_state && student._talent_state.constmental) || student.mental };
                student.thinking = clamp(Number(student.thinking||0) * 1.2);
                student.coding = clamp(Number(student.coding||0) * 1.2);
                // adjust the per-contest constmental rather than the base mental
                student._talent_state.constmental = clamp(Number(student._talent_state.constmental||student.mental||50) * 1.2);
                student._talent_state['冷静'] = true;
                return '冷静发动：全能力 +20%（赛中临时）';
              }
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
        prob: 0.10,
        handler: function(student, eventName, ctx){
          try{
            ensureTemp(student);
            if(eventName !== 'contest_select_problem') return null;
            const state = ctx && ctx.state;
            const pid = ctx && (ctx.problemId || ctx.problemId === 0 ? ctx.problemId : ctx.problemId);
            if(!state) return null;
            const probObj = state.getProblem(pid);
            if(!probObj || !probObj.tags) return null;
            if(!probObj.tags.includes('数学')) return null;
            if(Math.random() < 0.25){
              // 备份并放大
              if(!student._talent_backup['伽罗瓦']){
                student._talent_backup['伽罗瓦'] = { thinking: student.thinking, knowledge_math: student.knowledge_math };
                student.thinking = clamp(Number(student.thinking||0) * 1.5);
                student.knowledge_math = Number(student.knowledge_math||0) * 1.5;
                student._talent_state['伽罗瓦'] = true;
                return '伽罗瓦发动：数学与思维能力 +50%（本题临时）';
              }
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
        prob: 0.10,
        handler: function(student, eventName, ctx){
          try{
            ensureTemp(student);
            // track skips on student._talent_state._skipCount
            if(eventName === 'contest_skip_problem'){
              student._talent_state._skipCount = (student._talent_state._skipCount || 0) + 1;
              return null;
            }
            if(eventName === 'contest_select_problem'){
              const cnt = student._talent_state._skipCount || 0;
              // 如果累计 2 次以上跳题，则有50%概率发动
              student._talent_state._skipCount = 0; // 重置计数
              if(cnt >= 2 && Math.random() < 0.5){
                if(!student._talent_backup['爆发型']){
                  student._talent_backup['爆发型'] = {
                    thinking: student.thinking,
                    knowledge_ds: student.knowledge_ds,
                    knowledge_graph: student.knowledge_graph,
                    knowledge_string: student.knowledge_string,
                    knowledge_math: student.knowledge_math,
                    knowledge_dp: student.knowledge_dp
                  };
                  student.thinking = clamp(Number(student.thinking||0) * 2.0);
                  student.knowledge_ds = Number(student.knowledge_ds||0) * 2.0;
                  student.knowledge_graph = Number(student.knowledge_graph||0) * 2.0;
                  student.knowledge_string = Number(student.knowledge_string||0) * 2.0;
                  student.knowledge_math = Number(student.knowledge_math||0) * 2.0;
                  student.knowledge_dp = Number(student.knowledge_dp||0) * 2.0;
                  student._talent_state['爆发型'] = true;
                  return '爆发型发动：所有知识点与思维能力翻倍（本题临时）';
                }
              }
            }
            // reset on solve
            if(eventName === 'contest_solve_problem' || eventName === 'contest_pass_subtask'){
              student._talent_state._skipCount = 0;
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
        prob: 0.30,
        handler: function(student, eventName, ctx){
          try{
            ensureTemp(student);
            if(eventName !== 'contest_solve_problem') return null;
            const state = ctx && ctx.state;
            if(!state) return null;
            const solvedCount = state.problems.filter(p => p.solved).length;
            if(solvedCount >= 3){
              if(!student._talent_backup['心态稳定']){
                student._talent_backup['心态稳定'] = { constmental: (student._talent_state && student._talent_state.constmental) || student.mental };
                student._talent_state.constmental = clamp(Number(student._talent_state.constmental||student.mental||0) * 1.5);
                student._talent_state['心态稳定'] = true;
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
        prob: 0.05,
        handler: function(student, eventName, ctx){
          try{
            if(eventName !== 'contest_thinking') return null;
            // 触发概率 1%
            if(Math.random() < 0.01){
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
        prob: 0.10,
        handler: function(student, eventName, ctx){
          // 此天赋主要由 ContestSimulator.selectProblem 检查，无需在事件中处理
          return null;
        }
      });

      // 激进：思维能力 +100%，心理素质 -50%，只尝试当前题目的最后一档
      this.registerTalent({
        name: '激进',
        description: '激进做题风格：思维能力大幅提升但心理素质下降，只尝试最后一档部分分。',
        color: '#F44336',
        prob: 0.10,
        handler: function(student, eventName, ctx){
          try{
            ensureTemp(student);
            // 在比赛开始时立即应用效果（永久到本场比赛结束）
            if(eventName === 'contest_start'){
                if(!student._talent_backup['激进']){
                student._talent_backup['激进'] = { thinking: student.thinking, constmental: (student._talent_state && student._talent_state.constmental) || student.mental };
                student.thinking = clamp(Number(student.thinking||0) * 2.0);
                // reduce per-contest constmental, not base mental
                student._talent_state.constmental = clamp(Number(student._talent_state.constmental||student.mental||0) * 0.5);
                student._talent_state['激进'] = true;
                // 标记为激进以便模拟器在尝试档位时只尝试最后一档
                student._talent_state._aggressive = true;
                return '激进风格：思维能力翻倍，心理素质减半（本场临时）';
              }
            }
          }catch(e){ console.error('激进 天赋错误', e); }
          return null;
        }
      });

      // 清理逻辑：当比赛结束时，恢复所有被天赋临时修改过的属性
      // 监听 contest_finish 事件
      this.registerTalent({
        name: '__talent_cleanup__',
        description: '内部：清理临时天赋效果',
        color: '#9E9E9E',
        prob: 0.0,
        handler: function(student, eventName, ctx){
          if(eventName !== 'contest_finish' && eventName !== 'mock_contest_finish') return null;
          try{
            if(student._talent_backup){
              for(const k of Object.keys(student._talent_backup)){
                const backup = student._talent_backup[k];
                if(!backup) continue;
                // 恢复尽可能存在的字段，但不要把 per-contest constmental 赋回到 student 顶层属性
                for(const field of Object.keys(backup)){
                  try{
                    if(field === 'constmental'){
                      // constmental 属于 student._talent_state 并且为赛中临时副本，清理时不需要恢复到顶层
                      continue;
                    }
                    const val = backup[field];
                    // Only restore finite numeric values or non-null/undefined values to avoid
                    // overwriting valid properties with undefined/NaN.
                    if(typeof val === 'number'){
                      if(isFinite(val)) student[field] = val;
                    } else {
                      if(typeof val !== 'undefined' && val !== null) student[field] = val;
                    }
                  }catch(e){ /* ignore field restore errors */ }
                }
              }
            }
            // 清空临时存储
            student._talent_backup = {};
            student._talent_state = {};
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
