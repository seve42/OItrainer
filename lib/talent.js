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
      // kind: 'positive' | 'negative' (default positive for backward compatibility)
      const def = Object.assign({ description: '', color: '#2b6cb0', prob: 0.0, handler: null, kind: 'positive' }, talentDef);
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
      // 为每个学生最多分配 4 个天赋（正面天赋另有最多 2 个的限制）
      for(const name of this.getRegistered()){
        if(student.talents && student.talents.size >= 4) break;
        const t = this.getTalent(name);
        if(!t) continue;
        const p = Number(t.prob) || 0;
        if(p <= 0) continue;
        // 若为正面天赋，检查学生已拥有的正面天赋数量
        if(t.kind === 'positive'){
          let posCount = 0;
          if(student.talents){
            for(const tn of Array.from(student.talents)){
              const tt = this.getTalent(tn);
              if(tt && tt.kind === 'positive') posCount++;
            }
          }
          if(posCount >= 2) continue; // 跳过，已达到正面天赋上限
        }
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
        prob: 0.10,
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
        prob: 0.05,
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
        prob: 0.05,
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
        prob: 0.10,
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
        prob: 0.03,
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

        // 新增天赋：数据结构狂热者
        this.registerTalent({
          name: '数据结构狂热者',
          description: "若选中题标签含 '数据结构'，在模拟赛中本题临时使 数据结构能力 翻倍（x2）。",
          color: '#00BCD4',
          prob: 0.08,
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_select_problem') return null;
              // 仅在模拟赛生效
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              const state = ctx.state;
              const pid = ctx.problemId;
              if(!state) return null;
              const probObj = state.getProblem(pid);
              if(!probObj || !probObj.tags) return null;
              if(!probObj.tags.includes('数据结构')) return null;
              // 确保不会重复备份
              if(!student._talent_backup['数据结构狂热者']){
                student._talent_backup['数据结构狂热者'] = { knowledge_ds: Number(student.knowledge_ds || 0) };
                student.knowledge_ds = Number(student.knowledge_ds || 0) * 2.0;
                student._talent_state['数据结构狂热者'] = true;
                return '数据结构狂热者发动：本题 数据结构能力 翻倍（本题临时）';
              }
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
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_select_problem') return null;
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              const state = ctx.state;
              const pid = ctx.problemId;
              if(!state) return null;
              const probObj = state.getProblem(pid);
              if(!probObj || !probObj.tags) return null;
              if(!probObj.tags.includes('图论')) return null;
              if(Math.random() < 0.30){
                if(!student._talent_backup['图论直觉']){
                  student._talent_backup['图论直觉'] = { knowledge_graph: Number(student.knowledge_graph || 0), thinking: Number(student.thinking || 0) };
                  student.knowledge_graph = Number(student.knowledge_graph || 0) * 1.6;
                  student.thinking = clamp(Number(student.thinking || 0) * 1.2);
                  student._talent_state['图论直觉'] = true;
                  return '图论直觉发动：图论知识 +60%，思维 +20%（本题临时）';
                }
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
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              // 仅在模拟赛生效
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              const state = ctx.state;
              // 在比赛开始时记录半数分界点
              if(eventName === 'contest_start'){
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
                if(pid < half && !student._talent_backup['赛场狂热_first']){
                  student._talent_backup['赛场狂热_first'] = { thinking: Number(student.thinking || 0) };
                  student.thinking = clamp(Number(student.thinking || 0) * 1.25);
                  student._talent_state._赛场狂热_appliedFirst = true;
                  return '赛场狂热（前半段）发动：思维 +25%（赛中临时）';
                }
                // 后半段：心理素质（per-contest constmental）衰减至 0.8 倍（只需第一次进入后半段时应用）
                if(pid >= half && !student._talent_backup['赛场狂热_second']){
                  student._talent_backup['赛场狂热_second'] = { constmental: student._talent_state && student._talent_state.constmental };
                  student._talent_state.constmental = clamp(Number(student._talent_state.constmental || student.mental || 50) * 0.8);
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
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_select_problem') return null;
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              const state = ctx.state;
              if(!state || !Array.isArray(state.problems)) return null;
              const remaining = state.problems.filter(p => !p.solved).length;
              if(remaining <= 1){
                if(!student._talent_backup['最后一搏']){
                  student._talent_backup['最后一搏'] = {
                    knowledge_ds: Number(student.knowledge_ds || 0), knowledge_graph: Number(student.knowledge_graph || 0),
                    knowledge_string: Number(student.knowledge_string || 0), knowledge_math: Number(student.knowledge_math || 0),
                    knowledge_dp: Number(student.knowledge_dp || 0)
                  };
                  student.knowledge_ds = Number(student.knowledge_ds || 0) * 2.0;
                  student.knowledge_graph = Number(student.knowledge_graph || 0) * 2.0;
                  student.knowledge_string = Number(student.knowledge_string || 0) * 2.0;
                  student.knowledge_math = Number(student.knowledge_math || 0) * 2.0;
                  student.knowledge_dp = Number(student.knowledge_dp || 0) * 2.0;
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
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_skip_problem') return null;
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              // layers tracked in _talent_state._jump_layers
              const layers = student._talent_state._jump_layers || 0;
              if(layers >= 3) return null;
              // backup initial thinking once
              if(!student._talent_backup['跳跃思维']){
                student._talent_backup['跳跃思维'] = { thinking: Number(student.thinking || 0) };
              }
              const newLayers = Math.min(3, layers + 1);
              student._talent_state._jump_layers = newLayers;
              // apply multiplier: each层 +10% 叠加
              student.thinking = clamp(Number(student._talent_backup['跳跃思维'].thinking || student.thinking || 0) * Math.pow(1.1, newLayers));
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
          handler: function(student, eventName, ctx){
            try{
              ensureTemp(student);
              if(eventName !== 'contest_thinking') return null;
              if(!ctx || ctx.contestName !== '模拟赛') return null;
              // Small trigger chance per thinking tick
              //if(Math.random() >= 0.05) return null;
              if(student._talent_backup['偏科']) return null; // only once per contest
              const keys = ['knowledge_ds','knowledge_graph','knowledge_string','knowledge_math','knowledge_dp'];
              // pick two distinct indices
              const i = Math.floor(Math.random() * keys.length);
              let j = Math.floor(Math.random() * keys.length);
              while(j === i) j = Math.floor(Math.random() * keys.length);
              const up = keys[i], down = keys[j];
              student._talent_backup['偏科'] = {};
              student._talent_backup['偏科'][up] = Number(student[up] || 0);
              student._talent_backup['偏科'][down] = Number(student[down] || 0);
              // apply changes
              student[up] = Number(student[up] || 0) * 3.0; // +200% -> x3
              student[down] = Number(student[down] || 0) * 0.5; // -50% -> x0.5
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
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'pressure_change') return null;
              if(!ctx || ctx.source !== 'training') return null;
              const intensity = Number(ctx.intensity) || 1;
              // 把 intensity===3 视为强度>80
              if(intensity < 3) return null;
              if(Math.random() < 0.5){
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
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'vacation_end' && eventName !== 'entertain_end') return null;
              if(Math.random() < 0.30){
                const keys = ['knowledge_ds','knowledge_graph','knowledge_string','knowledge_math','knowledge_dp'];
                const idx = Math.floor(Math.random() * keys.length);
                const key = keys[idx];
                if(typeof student[key] === 'number'){
                  student[key] += 2;
                }
                return { action: 'vacation_half_minus5', message: '睡觉也在想题：知识+2，压力-5' };
              }
            }catch(e){ console.error('睡觉也在想题 天赋错误', e); }
            return null;
          }
        });

        // 高原反应：外出集训时（outing -> province）若去青海/西藏/云南则压力翻倍
        this.registerTalent({
          name: '高原反应',
          description: '在前往高原地区集训时压力翻倍。',
        color: '#795548',
        prob: 0.05,
        kind: 'negative',
          handler: function(student, eventName, ctx){
            try{
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
          description: '打CS时，如果压力过大将直接退队去学电竞。',
        color: '#F57C00',
        prob: 0.02,
        kind: 'negative',
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'entertainment_end') return null;
              if(!ctx || ctx.activity !== 'CS') return null;
              if(Number(student.pressure || 0) > 50){
                student.active = false;
                student._quit_for_esports = true;
                return { action: 'quit_for_esports', message: '电竞选手：直接退队去学电竞' };
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
          handler: function(student, eventName, ctx){
            try{
              if(eventName === 'mock_start'){
                student._talent_backup = student._talent_backup || {};
                if(!student._talent_backup['原题机（伪）']){
                  student._talent_backup['原题机（伪）'] = { thinking: student.thinking, coding: student.coding, mental: student.mental };
                  student.thinking = Number(student.thinking || 0) * 2.0;
                  student.coding = Number(student.coding || 0) * 2.0;
                  student.mental = Number(student.mental || 0) * 2.0;
                  student._talent_state = student._talent_state || {};
                  student._talent_state['原题机（伪）'] = true;
                  return { action: 'mock_boost', message: '原题机（伪）：模拟赛能力临时+100%' };
                }
              }
              if(eventName === 'mock_end'){
                if(student._talent_backup && student._talent_backup['原题机（伪）']){
                  const bak = student._talent_backup['原题机（伪）'];
                  student.thinking = bak.thinking; student.coding = bak.coding; student.mental = bak.mental;
                  delete student._talent_backup['原题机（伪）'];
                  if(student._talent_state) student._talent_state['原题机（伪）'] = false;
                  return { action: 'mock_cleanup', message: '原题機（伪）：模拟赛效果清零并还原能力' };
                }
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
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'contest_thinking' && eventName !== 'contest_select_problem') return null;
              if(!ctx || !ctx.state) return null;
              const pid = ctx.problemId;
              const probObj = ctx.state.getProblem(pid);
              if(!probObj) return null;
              if(probObj.maxScore > 70){
                if(Math.random() < 0.30){
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
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'week_end' && eventName !== 'turn_end') return null;
              student.sick_weeks = (student.sick_weeks || 0) + 1;
              return { action: 'get_sick', message: '林黛玉：获得生病状态' };
            }catch(e){ console.error('林黛玉 天赋错误', e); }
            return null;
          }
        });

        // 风神：事件 台风 时 100% 触发，效果压力清零
        this.registerTalent({
          name: '风神',
          description: '台风时压力清零',
        color: '#03A9F4',
        prob: 0.03,
        kind: 'positive',
          handler: function(student, eventName, ctx){
            try{
              if(eventName !== 'pressure_change') return null;
              if(!ctx || ctx.source !== 'typhoon') return null;
              student.pressure = 0;
              return { action: 'clear_pressure', message: '风神：压力清零' };
            }catch(e){ console.error('风神 天赋错误', e); }
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
