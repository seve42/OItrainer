/* events.js
   事件管理器：为项目提供可扩展的随机事件系统
   - Event structure: {id, name, check(ctx) => boolean, run(ctx) => void, description}
   - 使用 register/registerDefaultEvents/clear/checkRandomEvents
   - registerDefaultEvents 接受一个 ctx 对象（注入依赖：game, PROVINCES, 常量, utils, log）
*/
(function(global){
  const EventManager = {
    _events: [],
    _ctx: null,
    register(evt){
      if(!evt || !evt.id) throw new Error('event must have id');
      this._events.push(evt);
    },
    clear(){
      this._events = [];
    },
    registerDefaultEvents(ctx){
      this.clear();
      this._ctx = ctx || {};
      const {game, PROVINCES, constants, utils, log} = ctx;
      if(!game || !utils) return;

      // 台风（沿海）
      this.register({
        id: 'typhoon',
        name: '台风',
        description: '沿海省份夏秋季台风，影响舒适度/压力/经费',
        check: c => {
          // 规范化省份名称：支持 numeric id、去除常见后缀（省/市/自治区/特别行政区）并去除首尾空格
          const coastal = ["广东","浙江","上海","福建","江苏","山东","辽宁","海南","天津"];
          let prov = c.game.province_name;
          if (typeof prov === 'number' && c.PROVINCES && c.PROVINCES[prov]) prov = c.PROVINCES[prov].name;
          prov = (prov || '') + '';
          prov = prov.replace(/(省|市|自治区|特别行政区)/g, '').trim();
          if (!coastal.includes(prov)) return false;
          const w = c.game.week;
          let p = 0;
          if (w >= 20 && w <= 39) p = 0.08;
          else if ((w >= 14 && w <= 19) || (w >= 40 && w <= 45)) p = 0.03;
          return getRandom() < p;
        },
        run: c => {
          for(let s of c.game.students){
            if(!s || s.active === false) continue;
            // 使用 modifier 而不是直接修改
            s.pressure_modifier = (s.pressure_modifier || 0) + 15;
            s.comfort_modifier = (s.comfort_modifier || 0) - 10;
            // trigger talent: pressure change due to typhoon
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'typhoon', amount: 15 }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
          }
          const loss = utils.uniformInt(10000, 20000);
          c.game.recordExpense(loss, '台风损失');
          const msg = `台风来袭，经费损失 ¥${loss}`;
          log && log(`[台风] ${msg}`);
          window.pushEvent && window.pushEvent({ name:'台风', description: msg, week: c.game.week });
        }
      });

      // 感冒（生病）
      this.register({
        id: 'sickness',
        name: '感冒',
        description: '天气/舒适度导致学生生病',
        // 只有当存在尚未生病且处于 active 状态的学生时才进行检测
        check: c => c.game.students.some(s => s.active && (!s.sick_weeks || s.sick_weeks === 0)),
        run: c => {
          const {BASE_SICK_PROB, SICK_PROB_FROM_COLD_HOT, EXTREME_COLD_THRESHOLD, EXTREME_HOT_THRESHOLD} = c.constants;
          const comfort = c.game.getComfort();
          const sickList = [];
          for(let s of c.game.students){
            if(!s || s.active === false || s.sick_weeks > 0) continue;
            let pr = BASE_SICK_PROB + Math.max(0, (30 - comfort)/50);
            if(c.game.temperature < EXTREME_COLD_THRESHOLD || c.game.temperature > EXTREME_HOT_THRESHOLD){
              pr += SICK_PROB_FROM_COLD_HOT;
            }
            
            // 检测铁人天赋：生病概率降低50%
            if(s.talents && s.talents.has('铁人')){
              pr = pr * 0.5;
            }
            
            if(getRandom() < pr){
              s.sick_weeks = utils.uniformInt(1,2);
              sickList.push(s.name);
              // trigger talent: sickness event for this student
              try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('sickness', { weeks: s.sick_weeks }); } }catch(e){ console.error('triggerTalents sickness', e); }
            }
          }
          if(sickList.length){
            const msg = `${sickList.join('、')} 感冒了`;
            log && log(`[事件] ${msg}`);
            // 仅推送到信息卡片，不再返回字符串以触发弹窗
            window.pushEvent && window.pushEvent({ name:'感冒', description: msg, week: c.game.week });
            return null;
          }
          return null;
        }
      });

      // 压力过高导致退队
      this.register({
        id: 'burnout',
        name: '退队/倦怠',
        description: '压力累计导致学生退队',
        check: c => c.game.students.some(s => s.active && (s.pressure >= 90 || (s.quit_tendency_weeks && s.quit_tendency_weeks > 0))),
        run: c => {
          const {QUIT_PROB_BASE, QUIT_PROB_PER_EXTRA_PRESSURE} = c.constants;
          const quitList = [];
          const tendencyList = [];
          
          for(let i = c.game.students.length - 1; i >= 0; i--){
            const s = c.game.students[i];
            if(!s || s.active === false) continue;
            
            // 压力>=90时获得或持续退队倾向
            if(s.pressure >= 90){
              // 初始化退队倾向周数
              if(!s.quit_tendency_weeks) s.quit_tendency_weeks = 0;
              
              s.quit_tendency_weeks = (s.quit_tendency_weeks || 0) + 1;
              
              // 调试日志
              if(typeof console !== 'undefined' && console.log){
                console.log(`[退队检查] ${s.name}: 压力=${s.pressure}, quit_tendency_weeks=${s.quit_tendency_weeks}`);
              }
              
              // 如果退队倾向持续1周以上，则执行退队
              if(s.quit_tendency_weeks > 1){
                let prob = QUIT_PROB_BASE + QUIT_PROB_PER_EXTRA_PRESSURE * (s.pressure - 90);
                
                // 检测乐天派天赋：燃尽概率降低50%
                if(s.talents && s.talents.has('乐天派')){
                  prob = prob * 0.5;
                }
                
                if(getRandom() < prob){
                  quitList.push(s.name);
                  c.game.students.splice(i, 1);
                  c.game.quit_students = (c.game.quit_students||0) + 1;
                  c.game.reputation = Math.max(0, c.game.reputation - 10);
                  try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('quit', { reason: 'burnout' }); } }catch(e){ console.error('triggerTalents quit', e); }
                }
              } else if(s.quit_tendency_weeks === 1) {
                // 刚刚获得退队倾向
                tendencyList.push(s.name);
              }
            } else {
              // 压力降到90以下，清除退队倾向
              if(s.quit_tendency_weeks && s.quit_tendency_weeks > 0){
                // 调试日志
                if(typeof console !== 'undefined' && console.log){
                  console.log(`[退队清除] ${s.name}: 压力=${s.pressure}, 清除退队倾向`);
                }
                s.quit_tendency_weeks = 0;
              }
            }
          }
          
          // 显示退队倾向提示
          if(tendencyList.length){
            const msg = `${tendencyList.join('、')} 因压力过大产生退队倾向，如不缓解将在下周退队`;
            log && log(`[警告] ${msg}`);
            window.pushEvent && window.pushEvent({ name:'退队倾向', description: msg, week: c.game.week });
          }
          
          // 显示实际退队
          if(quitList.length){
            const msg = `${quitList.join('、')} 因压力过大退队，声誉-10`;
            log && log(`[事件] ${msg}`);
            window.pushEvent && window.pushEvent({ name:'退队', description: msg, week: c.game.week });
            window.renderAll && window.renderAll();
            try{ if(typeof window.checkAllQuitAndTriggerBadEnding === 'function') window.checkAllQuitAndTriggerBadEnding(); }catch(e){}
            return null;
          }
          return null;
        }
      });

      // -- 新增随机事件扩展 --
      // 企业赞助
      this.register({
        id: 'corporate_sponsorship',
        name: '企业赞助',
        description: '声誉良好时获得企业赞助资金与声誉提升',
        check: c => c.game.reputation >= 40 && c.game.week >= 10 && c.game.week <= 20 && getRandom() < 0.03,
        run: c => {
          const gain = c.utils.uniformInt(20000, 50000);
          c.game.budget = (c.game.budget || 0) + gain;
          c.game.reputation = Math.min(100, c.game.reputation + 5);
          const msg = `获得企业赞助 ¥${gain}，声誉提升 +5`;
          c.log && c.log(`[企业赞助] ${msg}`);
          window.pushEvent && window.pushEvent({ name:'企业赞助', description: msg, week: c.game.week });
          return null;
        }
      });

      
  // 金牌教练来访
  this.register({
    id: 'gold_coach_visit',
    name: '金牌教练来访',
  description: '知名教练莅临指导，学生能力提升，压力降低',
        check: c => {
          if (!(c.game && c.game.province_name)) return false;
          let prov = c.game.province_name;
          if (typeof prov === 'number' && c.PROVINCES && c.PROVINCES[prov]) prov = c.PROVINCES[prov].name;
          prov = (prov || '') + '';
          prov = prov.replace(/(省|市|自治区|特别行政区)/g, '').trim();
          return c.game.reputation >= 50 && ['北京','上海','江苏','浙江','广东','山东','天津'].includes(prov) && getRandom() < 0.03;
        },
        run: c => {
            for(const s of c.game.students){ if(!s || s.active === false) continue;
            const incT = c.utils.uniformInt(4,10);
            const incC = c.utils.uniformInt(4,10);
            if(typeof s.addThinking === 'function') s.addThinking(incT);
            else s.thinking = (s.thinking||0) + incT;
            if(typeof s.addCoding === 'function') s.addCoding(incC);
            else s.coding = (s.coding  ||0) + incC;
            // 使用 modifier
            const pressureDec = c.utils.uniformInt(20,50);
            s.pressure_modifier = (s.pressure_modifier || 0) - pressureDec;
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'coach_visit', amount: -pressureDec }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
          }
          const msg = `金牌教练来访，学生能力微增，压力微降`;
          c.log && c.log(`[金牌教练] ${msg}`);
          window.pushEvent && window.pushEvent({ name:'金牌教练来访', description: msg, week: c.game.week });
          return null;
        }
      });
      // 发现优质网课
      this.register({
        id: 'quality_course_found',
        name: '发现优质网课',
        description: '资料库等级越高，越容易发现优质网课',
        check: c => getRandom() < 0.02 * (c.game.facilities.library || 1),
        run: c => {
          // 使用游戏中实际的知识类型（与 Student.addKnowledge 接口对齐）
          const topics = ['数据结构','图论','字符串','数学','DP'];
          const topic = topics[c.utils.uniformInt(0, topics.length - 1)];
          
          // 资料库等级影响收益：等级越高，收益越大
          const libraryLevel = c.game.facilities.library || 1;
          const baseGain = c.utils.uniformInt(5, 10);
          const bonusGain = Math.floor(libraryLevel * 0.5); // 每级资料库额外+0.5倍基础收益
          const totalGain = baseGain + bonusGain;
          
          for(const s of c.game.students){ 
            if(!s || s.active === false) continue;
            
            // 直接调用 Student.addKnowledge 接口（已包含安全检查和fallback）
            if(typeof s.addKnowledge === 'function'){
              s.addKnowledge(topic, totalGain);
            } else {
              // 向后兼容：直接操作字段（仅在 addKnowledge 方法不存在时）
              console.warn(`[优质网课] 学生 ${s.name} 缺少 addKnowledge 方法，使用兼容模式`);
              if(topic === '数据结构') s.knowledge_ds = (s.knowledge_ds || 0) + totalGain;
              else if(topic === '图论') s.knowledge_graph = (s.knowledge_graph || 0) + totalGain;
              else if(topic === '字符串') s.knowledge_string = (s.knowledge_string || 0) + totalGain;
              else if(topic === '数学') s.knowledge_math = (s.knowledge_math || 0) + totalGain;
              else if(topic === 'DP') s.knowledge_dp = (s.knowledge_dp || 0) + totalGain;
            }
          }
          
          const msg = `在【${topic}】上获得 +${totalGain} 知识点（资料库 Lv.${libraryLevel}）`;
          c.log && c.log(`[优质网课] ${msg}`);
          window.pushEvent && window.pushEvent({ name:'优质网课', description: msg, week: c.game.week });
          return null;
        }
      });
      // 构造题忘放checker
      this.register({
        id: 'forgot_checker',
        name: '构造题忘放checker',
        description: '练习结束后资料库等级低时可能忘记放置checker',
        check: c => {
          // 仅在资料库等级较低且刚结束练习时才有可能触发
          const libraryLevel = (c.game.facilities && c.game.facilities.library) || 1;
          if (libraryLevel > 2) return false;
          // 依赖脚本在训练结束时设置的标志：lastTrainingFinishedWeek
          if (!c.game || typeof c.game.lastTrainingFinishedWeek !== 'number') return false;
          // 仅在训练刚结束的那一周触发一次
          if (c.game.lastTrainingFinishedWeek !== c.game.week) return false;
          // 20% 概率触发
          return getRandom() < 0.20;
        },
        run: c => {
          for(const s of c.game.students){
            if(!s || s.active === false) continue;
            // 使用 modifier
            s.pressure_modifier = (s.pressure_modifier || 0) + 20;
            try{ 
              if(typeof s.triggerTalents === 'function'){ 
                s.triggerTalents('pressure_change', { source: 'forgot_checker', amount: 20 }); 
              } 
            }catch(e){ 
              console.error('triggerTalents pressure_change', e); 
            }
          }
          const msg = `练习时构造题忘放checker，全体学生压力 +20`;
          c.log && c.log(`[构造题忘放checker] ${msg}`);
          window.pushEvent && window.pushEvent({ name:'构造题忘放checker', description: msg, week: c.game.week });
          // 清理训练结束标志，避免本事件在同一周再次触发
          try{ c.game.lastTrainingFinishedWeek = null; }catch(e){}
          return null;
        }
      });
      // 上级拨款
      this.register({
        id: 'funding_allocation',
        name: '上级拨款',
        description: '比赛佳绩后获得额外经费与声誉提升',
        check: c => c.game.recentSuccess && (c.game.week - (c.game.recentSuccessWeek||0)) <= 2 && getRandom() < 0.05,
        run: c => {
          const gain = c.utils.uniformInt(5000, 20000);
          c.game.budget = (c.game.budget || 0) + gain;
          c.game.reputation = Math.min(100, c.game.reputation + 3);
          const msg = `收到上级拨款 ¥${gain}，声誉提升 +3`;
          c.log && c.log(`[上级拨款] ${msg}`);
          
          // 创建选择选项
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
                window.pushEvent && window.pushEvent({ name: '上级拨款', description: `${msg}`, week: c.game.week });
              }
            },
            { 
              label: '暂不升级', 
              effect: () => {
                window.pushEvent && window.pushEvent({ name: '上级拨款', description: `${msg}`, week: c.game.week });
              }
            }
          ];
          
          // 显示选择对话框
          window.showChoiceModal && window.showChoiceModal({ 
            name: '上级拨款', 
            description: `${msg}  是否立即升级设施？`, 
            week: c.game.week, 
            options 
          });
          
          return null;
        }
      });
      // 负面事件：机房设备故障
      this.register({
        id: 'equipment_failure',
        name: '机房设备故障',
        description: '机房设备故障，产生维修费用或设置维修周数',
        check: c => {
          // base probability scales with computer level
          let base = 0.02 * (2 - (c.game.computer_level || 1));
          // if any active student has 扫把星, increase negative event probability
          try{
            const hasBadLuck = Array.isArray(c.game.students) && c.game.students.some(s => s && s.active !== false && s.talents && typeof s.talents.has === 'function' && s.talents.has('扫把星'));
            if(hasBadLuck) base = base * 1.5;
          }catch(e){ /* ignore talent checks */ }
          return getRandom() < base;
        },
        run: c => {
          const cost = c.utils.uniformInt(5000, 20000);
          if (c.game.budget >= cost) {
            c.game.recordExpense(cost, '设备故障维修');
            c.game.computer_repair_weeks = 0;
            const msg = `设备故障，花费 ¥${cost} 维修`;
            c.log && c.log(`[设备故障] ${msg}`);
            window.pushEvent && window.pushEvent({ name: '机房设备故障', description: msg, week: c.game.week });
            return null;
          } else {
            c.game.computer_repair_weeks = c.utils.uniformInt(1, 2);
            const msg = `设备故障，维修经费不足，影响训练 ${c.game.computer_repair_weeks} 周`;
            c.log && c.log(`[设备故障] ${msg}`);
            window.pushEvent && window.pushEvent({ name: '机房设备故障', description: msg, week: c.game.week });
            return null;
          }
        }
      });
      // 负面事件：团队内部矛盾
      this.register({
        id: 'internal_conflict',
        name: '团队内部矛盾',
        description: '团队压力过高导致内部矛盾',
        check: c => {
          const active = c.game.students.filter(s => s && s.active !== false);
          if (!active.length) return false;
          const avg = active.reduce((sum, s) => sum + s.pressure, 0) / active.length;
          if(!(avg > 70)) return false;
          // base probability
          let p = 0.05;
          try{
            const hasBadLuck = Array.isArray(c.game.students) && c.game.students.some(s => s && s.active !== false && s.talents && typeof s.talents.has === 'function' && s.talents.has('扫把星'));
            if(hasBadLuck) p = p * 1.5;
          }catch(e){ /* ignore talent checks */ }
          return getRandom() < p;
        },
        run: c => {
          for (const s of c.game.students) {
            if (s && s.active === false) continue;
            // 使用 modifier
            const comfortDec = c.utils.uniformInt(2, 5);
            const pressureInc = c.utils.uniformInt(1, 4);
            s.comfort_modifier = (s.comfort_modifier || 0) - comfortDec;
            s.pressure_modifier = (s.pressure_modifier || 0) + pressureInc;
            s.mental = Math.max(0, (s.mental || 100) - c.utils.uniformInt(1, 3));
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'internal_conflict', amount: pressureInc }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
          }
          const msg = '团队内部矛盾爆发，舒适度和心理素质下降，压力上升';
          c.log && c.log(`[内部矛盾] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '团队内部矛盾', description: msg, week: c.game.week });
          return null;
        }
      });
      // 负面事件：经费审计
      this.register({
        id: 'funding_audit',
        name: '经费审计',
        description: '经费审计暂停高消费活动，并可能损失少量经费',
        check: c => {
          if(!(c.game.budget > 200000)) return false;
          let p = 0.03;
          try{
            const hasBadLuck = Array.isArray(c.game.students) && c.game.students.some(s => s && s.active !== false && s.talents && typeof s.talents.has === 'function' && s.talents.has('扫把星'));
            if(hasBadLuck) p = p * 1.5;
          }catch(e){ }
          return getRandom() < p;
        },
        run: c => {
          const weeks = c.utils.uniformInt(1, 2);
          c.game.audit_weeks = weeks;
          const loss = c.utils.uniformInt(5000, 15000);
          c.game.recordExpense(loss, '经费审计');
          const msg = `经费审计暂停高消费活动 ${weeks} 周，损失经费 ¥${loss}`;
          c.log && c.log(`[经费审计] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '经费审计', description: msg, week: c.game.week });
          return null;
        }
      });
      // 负面事件：食堂卫生问题
      this.register({
        id: 'canteen_issue',
        name: '食堂卫生问题',
        description: '食堂卫生差，学生生病概率上升，舒适度下降',
        check: c => c.game.canteen_level === 1 && ['summer', 'autumn'].includes(c.game.season),
        run: c => {
          const weeks = c.utils.uniformInt(1, 2);
          c.game.food_sick_weeks = weeks;
          for (const s of c.game.students) {
            if (!s || s.active === false) continue;
            // 使用 modifier
            const comfortDec = c.utils.uniformInt(2, 5);
            s.comfort_modifier = (s.comfort_modifier || 0) - comfortDec;
          }
          const msg = `食堂卫生问题，接下来 ${weeks} 周学生生病概率上升，舒适度下降`;
          c.log && c.log(`[食堂卫生] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '食堂卫生问题', description: msg, week: c.game.week });
          return null;
        }
      });
      // 选择导向事件：友校交流邀请
      this.register({
        id: 'exchange_invite',
        name: '友校交流邀请',
        description: '接受或拒绝友校交流邀请',
        check: c => getRandom() < 0.02,
        run: c => {
          const options = [
            { label: '接受邀请', effect: () => {
                c.game.recordExpense(5000, '友校交流');
                for (const s of c.game.students) if (s.active) {
                  s.thinking = (s.thinking || 0) + 1;
                  s.coding = (s.coding || 0) + 1;
                  // 使用 modifier
                  s.pressure_modifier = (s.pressure_modifier || 0) + 2;
                  try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'exchange_invite', amount: 2 }); } }catch(e){ console.error('triggerTalents pressure_change', e); }
                }
                // 推送事件卡说明：显示选择结果和造成的影响
                const desc = `接受友校交流：经费 -¥5000，学生能力小幅提升，压力略增`;
                window.pushEvent && window.pushEvent({ name: '选择结果', description: desc, week: c.game.week });
              }
            },
            { label: '婉拒邀请', effect: () => { 
                c.game.reputation = Math.max(0, c.game.reputation - 1);
                const desc = `婉拒友校交流：声誉 -1`;
                window.pushEvent && window.pushEvent({ name: '选择结果', description: desc, week: c.game.week });
              }
            }
          ];

          window.showChoiceModal && window.showChoiceModal({ name: '友校交流邀请', description: '是否接受友校交流邀请？', week: c.game.week, options });
          return null;
        }
      });
      // 选择导向事件：天才学生自荐
      this.register({
        id: 'genius_apply',
        name: '学生自荐',
        description: '外省空降学生申请加入',
        check: c => {
          if(c.game.reputation < 45) return false;
          return getRandom() < 0.004;
        },
        run: c => {
          // 计算当前队内学生的最大能力值
          const activeStudents = c.game.students.filter(s => s && s.active !== false);
          let maxThinking = 0, maxCoding = 0, maxMental = 0;
          let maxKnowledgeDs = 0, maxKnowledgeGraph = 0, maxKnowledgeString = 0;
          let maxKnowledgeMath = 0, maxKnowledgeDp = 0;
          
          for(const s of activeStudents){
            if(!s) continue;
            maxThinking = Math.max(maxThinking, Number(s.thinking || 0));
            maxCoding = Math.max(maxCoding, Number(s.coding || 0));
            maxMental = Math.max(maxMental, Number(s.mental || 0));
            maxKnowledgeDs = Math.max(maxKnowledgeDs, Number(s.knowledge_ds || 0));
            maxKnowledgeGraph = Math.max(maxKnowledgeGraph, Number(s.knowledge_graph || 0));
            maxKnowledgeString = Math.max(maxKnowledgeString, Number(s.knowledge_string || 0));
            maxKnowledgeMath = Math.max(maxKnowledgeMath, Number(s.knowledge_math || 0));
            maxKnowledgeDp = Math.max(maxKnowledgeDp, Number(s.knowledge_dp || 0));
          }
          
          // 新学生能力为队内最大值的80%
          const newThinking = Math.floor(maxThinking * 0.8);
          const newCoding = Math.floor(maxCoding * 0.8);
          const newMental = Math.floor(maxMental * 0.8);
          const newKnowledgeDs = Math.floor(maxKnowledgeDs * 0.8);
          const newKnowledgeGraph = Math.floor(maxKnowledgeGraph * 0.8);
          const newKnowledgeString = Math.floor(maxKnowledgeString * 0.8);
          const newKnowledgeMath = Math.floor(maxKnowledgeMath * 0.8);
          const newKnowledgeDp = Math.floor(maxKnowledgeDp * 0.8);
          
          // 生成随机学生姓名（使用主逻辑中封装好的函数）
          let provForName = c.game && c.game.province_name ? c.game.province_name : null;
          if (typeof provForName === 'number' && c.PROVINCES && c.PROVINCES[provForName]) provForName = c.PROVINCES[provForName].name;
          provForName = (provForName || '') + '';
          
          // 获取当前所有学生的名字列表以避免重名
          const existingNames = c.game.students.map(s => s.name);
          let newStudentName;
          if (typeof window.generateUniqueName === 'function') {
            newStudentName = window.generateUniqueName({ region: provForName, existingNames: existingNames });
          } else if (typeof window.generateName === 'function') {
            newStudentName = window.generateName({ region: provForName });
          } else {
            newStudentName = '新学生';
          }
          
          const options = [
            { label: '接收', effect: () => {
                const cost = c.utils.uniformInt(10000, 20000);
                c.game.recordExpense(cost, '接收转学生');
                
                // 创建新学生实例
                try{
                  const s = new Student(newStudentName, newThinking, newCoding, newMental);
                  s.pressure = 30;
                  s.comfort = 80;
                  s.active = true;
                  
                  // 设置知识点
                  s.knowledge_ds = newKnowledgeDs;
                  s.knowledge_graph = newKnowledgeGraph;
                  s.knowledge_string = newKnowledgeString;
                  s.knowledge_math = newKnowledgeMath;
                  s.knowledge_dp = newKnowledgeDp;
                  
                  c.game.students.push(s);
                  
                  // 自动晋级下场比赛：将学生加入当前赛季所有已有晋级资格的比赛
                  try{
                    const halfBoundary = (typeof WEEKS_PER_HALF !== 'undefined') ? WEEKS_PER_HALF : Math.floor((typeof SEASON_WEEKS !== 'undefined' ? SEASON_WEEKS : 26) / 2);
                    const halfIndex = (c.game.week > halfBoundary) ? 1 : 0;
                    
                    if(c.game.qualification && c.game.qualification[halfIndex]){
                      const compOrder = window.COMPETITION_ORDER || ["CSP-S1","CSP-S2","NOIP","省选","NOI"];
                      // 找到下一场即将进行的比赛
                      const futureComps = (window.competitions || []).filter(comp => comp.week > c.game.week);
                      if(futureComps.length > 0){
                        const nextComp = futureComps.sort((a, b) => a.week - b.week)[0];
                        const nextCompIdx = compOrder.indexOf(nextComp.name);
                        
                        // 如果不是第一场比赛，需要给前一场比赛的晋级资格
                        if(nextCompIdx > 0){
                          const prevComp = compOrder[nextCompIdx - 1];
                          if(!c.game.qualification[halfIndex][prevComp]){
                            c.game.qualification[halfIndex][prevComp] = new Set();
                          }
                          c.game.qualification[halfIndex][prevComp].add(newStudentName);
                          console.log(`[学生自荐] ${newStudentName} 自动获得 ${prevComp} 晋级资格，可参加 ${nextComp.name}`);
                        }
                      }
                    }
                  }catch(e){ console.error('设置晋级资格失败', e); }
                  
                }catch(e){
                  console.error('创建学生失败', e);
                  // fallback to plain object if Student constructor unavailable
                  c.game.students.push({ 
                    name: newStudentName, 
                    active: true, 
                    thinking: newThinking, 
                    coding: newCoding, 
                    mental: newMental,
                    pressure: 30, 
                    comfort: 80,
                    knowledge_ds: newKnowledgeDs,
                    knowledge_graph: newKnowledgeGraph,
                    knowledge_string: newKnowledgeString,
                    knowledge_math: newKnowledgeMath,
                    knowledge_dp: newKnowledgeDp
                  });
                }
                
                const desc = `接收转学生 ${newStudentName}：经费 -¥${cost}，已自动晋级下场比赛`;
                window.pushEvent && window.pushEvent({ name: '选择结果', description: desc, week: c.game.week });
                try{ if(typeof window.renderAll === 'function') window.renderAll(); }catch(e){}
              }
            },
            { label: '拒绝', effect: () => {
                const desc = `拒绝转学生 ${newStudentName}：暂无即时影响`;
                window.pushEvent && window.pushEvent({ name: '选择结果', description: desc, week: c.game.week });
              }
            }
          ];

          const abilityDesc = `思维:${newThinking} 编码:${newCoding} 心理:${newMental}`;
          window.showChoiceModal && window.showChoiceModal({ 
            name: '学生自荐', 
            description: `外省转学生 ${newStudentName} 希望加入队伍，是否接收？`, 
            week: c.game.week, 
            options 
          });
          return null;
        }
      });
      // 选择导向事件：媒体采访请求
      this.register({
        id: 'media_interview',
        name: '媒体采访请求',
        description: '采访后可选择高调或低调',
        check: c => c.game.recentMedal && getRandom() < 0.5,
        run: c => {
          const options = [
            { label: '高调宣传', effect: () => {
                c.game.reputation = Math.min(100, c.game.reputation + 10);
                for (const s of c.game.students) if (s.active) {
                  // 使用 modifier
                  s.pressure_modifier = (s.pressure_modifier || 0) + 10;
                }
                // give a modest monetary boost scaled by reputation
                const baseGain = c.utils.uniformInt(2000, 8000);
                const rep = (c.game && typeof c.game.reputation === 'number') ? Math.max(0, Math.min(100, c.game.reputation)) : 0;
                const repBonus = (typeof MEDIA_REP_BONUS !== 'undefined') ? MEDIA_REP_BONUS : 0.4;
                const gain = Math.round(baseGain * (1.0 + (rep / 100.0) * repBonus));
                c.game.budget = (c.game.budget || 0) + gain;
                const desc = `高调宣传：声誉 +10，学生压力 +10，经费 +¥${gain}`;
                window.pushEvent && window.pushEvent({ name: '选择结果', description: desc, week: c.game.week });
              }
            },
            { label: '低调处理', effect: () => { 
                c.game.reputation = Math.min(100, c.game.reputation + 2);
                const desc = `低调处理：声誉 +2`;
                window.pushEvent && window.pushEvent({ name: '选择结果', description: desc, week: c.game.week });
              }
            }
          ];

          window.showChoiceModal && window.showChoiceModal({ name: '媒体采访请求', description: '是否高调宣传？', week: c.game.week, options });
          return null;
        }
      });
      // 选择导向事件：是否参加商业活动
      this.register({
        id: 'commercial_activity',
        name: '参加商业活动',
        description: '是否参加商业活动',
        check: c => c.game.week >= 10 && c.game.week <= 20 && getRandom() < 0.05,
        run: c => {
          const options = [
            { label: '参加', effect: () => {
                // commercial activity income scales with reputation: more rep -> higher payout
                const baseGain = c.utils.uniformInt(20000, 50000);
                const rep = (c.game && typeof c.game.reputation === 'number') ? Math.max(0, Math.min(100, c.game.reputation)) : 0;
                const repBonus = (typeof COMMERCIAL_REP_BONUS !== 'undefined') ? COMMERCIAL_REP_BONUS : 0.5;
                const gain = Math.round(baseGain * (1.0 + (rep / 100.0) * repBonus));
                c.game.budget += gain;
                for (const s of c.game.students) if (s.active) {
                  // 使用 modifier
                  s.pressure_modifier = (s.pressure_modifier || 0) + 10;
                }
                const desc = `参加商业活动：经费 +¥${gain}，学生压力 +10`;
                window.pushEvent && window.pushEvent({ name: '选择结果', description: desc, week: c.game.week });
              }
            },
            { label: '拒绝', effect: () => {
                const desc = `拒绝商业活动：保持现状`;
                window.pushEvent && window.pushEvent({ name: '选择结果', description: desc, week: c.game.week });
              }
            }
          ];

          window.showChoiceModal && window.showChoiceModal({ name: '是否参加商业活动', description: '接受或拒绝商业活动？', week: c.game.week, options });
          return null;
        }
      });

      // 选择导向事件：跨省挖人（poaching_offer）
      this.register({
        id: 'poaching_offer',
        name: '跨省挖人邀请',
        description: '当团队有优秀学生在重要比赛中取得高分，外省强校可能发来挖人邀请。',
        check: c => {
          try{
            if(!c.game || !Array.isArray(c.game.careerCompetitions) || !Array.isArray(c.game.students)) return false;
            
            // 只在高一（第一年）触发，高二不触发
            const weeksPerHalf = (typeof WEEKS_PER_HALF !== 'undefined') ? WEEKS_PER_HALF : 16;
            if(c.game.week > weeksPerHalf) return false;
            
            const recentWindow = Math.max(1, (c.game.week || 0) - 2); // 近期两周内的比赛成绩触发概率
            // find relevant competition records in recent weeks
            const relevant = c.game.careerCompetitions.filter(r => (r.name === 'NOIP' || r.name === '省选') && (typeof r.week === 'number' ? r.week >= recentWindow : true));
            if(!relevant || relevant.length === 0) return false;

            // get competition definitions to determine full score for NOIP
            const schedule = (window && window.COMPETITION_SCHEDULE) ? window.COMPETITION_SCHEDULE : null;
            const noipDef = schedule && schedule.find(x=>x.name === 'NOIP');
            const noipFull = (noipDef && typeof noipDef.maxScore === 'number') ? Number(noipDef.maxScore) : 400;

            for(const rec of relevant){
              if(!rec.entries || !Array.isArray(rec.entries)) continue;
              for(const e of rec.entries){
                if(!e || typeof e.score !== 'number') continue;
                // NOIP 满分 或 省选 > 500
                if(rec.name === 'NOIP' && e.score >= noipFull) return true;
                if(rec.name === '省选' && e.score > 500) return true;
              }
            }
          }catch(err){ console.error('poaching_offer check error', err); }
          return false;
        },
        run: c => {
          try{
            const schedule = (window && window.COMPETITION_SCHEDULE) ? window.COMPETITION_SCHEDULE : null;
            const noipDef = schedule && schedule.find(x=>x.name === 'NOIP');
            const noipFull = (noipDef && typeof noipDef.maxScore === 'number') ? Number(noipDef.maxScore) : 400;

            // find the most recent matching entry and corresponding student
            const recentWindow = Math.max(1, (c.game.week || 0) - 2);
            const records = (c.game.careerCompetitions || []).filter(r => (r.name === 'NOIP' || r.name === '省选') && (typeof r.week === 'number' ? r.week >= recentWindow : true));
            let targetEntry = null; let compName = null;
            outer: for(const rec of records){
              if(!rec.entries) continue;
              for(const e of rec.entries){
                if(!e || typeof e.score !== 'number') continue;
                if(rec.name === 'NOIP' && e.score >= noipFull){ targetEntry = e; compName = 'NOIP'; break outer; }
                if(rec.name === '省选' && e.score > 500){ targetEntry = e; compName = '省选'; break outer; }
              }
            }
            if(!targetEntry) return null;

            // find the student object by name and ensure active
            const stud = Array.isArray(c.game.students) ? c.game.students.find(s => s && s.name === targetEntry.name && s.active !== false) : null;
            if(!stud) return null;

            // avoid repeating in the same game (entire session)
            if(c.game._poaching_offer_triggered) return null;
            c.game._poaching_offer_triggered = true;

            // compute retention cost based on student ability (scale using getAbilityAvg)
            let abilityAvg = (typeof stud.getAbilityAvg === 'function') ? Number(stud.getAbilityAvg()) : (Number(stud.thinking||0) + Number(stud.coding||0))/2;
            abilityAvg = Math.max(0, Math.min(100, abilityAvg));
            const cost = Math.round(20000 + (abilityAvg/100.0) * 10000); // 50k - 100k

            // retention success probability depends on reputation and student's mental
            const rep = (c.game && typeof c.game.reputation === 'number') ? Math.max(0, Math.min(100, c.game.reputation)) : 50;
            const mental = Number(stud.mental || 50);
            let base = 0.25; // base chance
            const repFactor = (rep / 100.0) * 0.5; // up to +0.5
            const mentalFactor = (mental / 100.0) * 0.25; // up to +0.25
            let successProb = 1.01;//百分百挽留成功
            const options = [
              { label: `消耗 ¥${cost}，全力挽留`, effect: () => {
                  // charge cost (use game.recordExpense if available to apply COST_MULTIPLIER centrally)
                  let expense = 0;
                  try{
                    expense = c.game.recordExpense(cost, '挽留费用');
                  }catch(e){
                    // fallback: apply COST_MULTIPLIER once here (avoid double-multiplying)
                    const costMult = (typeof COST_MULTIPLIER !== 'undefined' ? COST_MULTIPLIER : 1.0);
                    expense = Math.max(0, Math.round(cost * costMult));
                    c.game.budget = Math.max(0, (c.game.budget||0) - expense);
                  }
                  // if budget insufficient, still perform (recordExpense caps at 0)
                  const roll = getRandom();
                  if(roll < successProb){
                    // success: student stays and mental +5
                    stud.mental = Math.min(100, Number(stud.mental || 0) + 5);
                    const msg = `${stud.name} 决定留下，心理素质提升 （已支付 ¥${expense}）`;
                    c.log && c.log(`[挽留成功] ${msg}`);
                    window.pushEvent && window.pushEvent({ name: '挽留成功', description: msg, week: c.game.week });
                  } else {
                    // failure: student leaves, reputation -20, other students pressure +10
                    try{ if(typeof stud.triggerTalents === 'function') stud.triggerTalents('quit', { reason: 'poached' }); }catch(e){}
                    for(let i = c.game.students.length - 1; i >= 0; i--){
                      if(c.game.students[i] && c.game.students[i].name === stud.name){ c.game.students.splice(i,1); break; }
                    }
                    c.game.quit_students = (c.game.quit_students || 0) + 1;
                    c.game.reputation = Math.max(0, (c.game.reputation || 0) - 20);
                    for(const s of c.game.students){ 
                      if(!s || s.active === false) continue; 
                      // 使用 modifier
                      s.pressure_modifier = (s.pressure_modifier || 0) + 10;
                    }
                    const msg = `${stud.name} 被挖走，声誉 -20，队内压力 +10`;
                    c.log && c.log(`[挽留失败] ${msg}`);
                    window.pushEvent && window.pushEvent({ name: '挽留失败', description: msg, week: c.game.week });
                  }
                  try{ if(typeof window.renderAll === 'function') window.renderAll(); }catch(e){}
                }
              },
              { label: '不作干涉，获得补偿', effect: () => {
                  // student leaves, receive compensation and reputation +5
                  const gain = c.utils.uniformInt(30000, 50000);
                  c.game.budget = (c.game.budget || 0) + gain;
                  c.game.reputation = Math.min(100, (c.game.reputation || 0) + 15);
                  try{ if(typeof stud.triggerTalents === 'function') stud.triggerTalents('quit', { reason: 'poached_grace' }); }catch(e){}
                  for(let i = c.game.students.length - 1; i >= 0; i--){ if(c.game.students[i] && c.game.students[i].name === stud.name){ c.game.students.splice(i,1); break; } }
                  c.game.quit_students = (c.game.quit_students || 0) + 1;
                  const msg = `${stud.name} 离队，获得补偿 ¥${gain}，声誉 +15`;
                  c.log && c.log(`[不做干涉] ${msg}`);
                  window.pushEvent && window.pushEvent({ name: '不做干涉', description: msg, week: c.game.week });
                  try{ if(typeof window.renderAll === 'function') window.renderAll(); }catch(e){}
                }
              }
            ];

            const desc = `${stud.name} 在 ${compName} 中获得了 ${targetEntry.score} 的高分。一所外省强校向${stud.name}发来邀请，并承诺了优厚的条件。是否挽留？`;
            window.showChoiceModal && window.showChoiceModal({ name: '跨省挖人', description: desc, week: c.game.week, options });
            return null;
          }catch(e){ console.error('poaching_offer run error', e); return null; }
        }
      });

      // 天赋获取事件
      this.register({
        id: 'talent_acquire',
        name: '天赋获得',
        description: '学生在训练中可能获得新天赋',
        check: c => {
          // 这个事件由其他逻辑手动触发，而不是随机检查
          return false; 
        },
        run: (c, student, talent) => {
          if (!student || !talent) return;
          const msg = `${student.name} 获得了天赋：【${talent.name}】！`;
          c.log && c.log(`[天赋] ${msg}`);
          //try{ if(window.pushEvent) window.pushEvent({ name: '天赋获得', description: msg, week: c.game.week }); }catch(e){}
          try{ if(window.showEventModal) window.showEventModal && window.showEventModal({ name: '天赋获得', description: msg, week: c.game.week }); }catch(e){}
        }
      });

      // 天赋丧失事件
      this.register({
        id: 'talent_loss',
        name: '天赋丧失',
        description: '压力过高可能导致学生丧失天赋',
        
        check: c => c.game.students.some(s => s.active && s.pressure >= TALENT_LOST_VALUE),
        run: c => {
          
          for (const s of c.game.students) {
            //alert("DEBUG: 天赋丧失事件" + s.name + " 压力 " + s.pressure);
            if (s && s.active && s.pressure >= TALENT_LOST_VALUE) {
              if (window.TalentManager && typeof window.TalentManager.checkAndHandleTalentLoss === 'function') {
                window.TalentManager.checkAndHandleTalentLoss(s);
              }
            }
          }
          return null; // 不产生全局弹窗，由 talent.js 自己处理
        }
      });

      // -- 学生日常活动事件（每学生1%概率）--
      // 工具：helper for per-student 1% rolls
      function perStudentRolls(game){
        return (game.students || []).filter(s => s && s.active !== false);
      }

      // 项目：学生写网页游戏
      this.register({
        id: 'web_game_project',
        name: '课余项目',
        description: '学生在课余时间写了一个网页游戏',
        check: function(c) {
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c) {
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered) {
            if (typeof s.addCoding === 'function') s.addCoding(10);
            else s.coding = (s.coding || 0) + 10;
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `${names} 写了一个网页游戏，代码能力 +10`;
          c.log && c.log(`[课余项目] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '课余项目', description: msg, week: c.game.week });
          return null;
        }
      });

      // 扑克牌：学生做扑克牌
      this.register({
        id: 'poker_cards',
        name: '扑克牌',
        description: '学生用草稿纸做了一副扑克牌',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered){
            // 使用 modifier
            s.pressure_modifier = (s.pressure_modifier || 0) - 5;
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'poker_cards', amount: -5 }); } }catch(e){}
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `${names} 用草稿纸做了一副扑克牌，压力 -5`;
          c.log && c.log(`[扑克牌] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '扑克牌', description: msg, week: c.game.week });
          return null;
        }
      });

      // 三国杀：学生做三国杀
      this.register({
        id: 'sanguosha',
        name: '三国杀',
        description: '学生做了猪国杀后用草稿纸做了一整套三国杀',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered){
            // 使用 modifier
            s.pressure_modifier = (s.pressure_modifier || 0) - 5;
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'sanguosha', amount: -5 }); } }catch(e){}
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `${names} 做了猪国杀后用草稿纸做了一整套三国杀，压力 -5`;
          c.log && c.log(`[三国杀] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '三国杀', description: msg, week: c.game.week });
          return null;
        }
      });

      // 臭水：学生养的臭水炸了
      this.register({
        id: 'stinky_water',
        name: '臭水',
        description: '学生在机房养的臭水炸了',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered){
            // 使用 modifier 而不是直接修改，这样修改会在下次训练/放假时生效
            s.pressure_modifier = (s.pressure_modifier || 0) - 10;
            s.comfort_modifier = (s.comfort_modifier || 0) - 5;
            
            // 仍然触发天赋事件
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'stinky_water', amount: -10 }); } }catch(e){}
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `${names} 在机房养的臭水炸了，压力 -10，舒适度 -5`;
          c.log && c.log(`[臭水] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '臭水', description: msg, week: c.game.week });
          return null;
        }
      });

      // WMC：学生用希沃白板打舞梦DX
      this.register({
        id: 'wmc_game',
        name: 'WMC',
        description: '学生用希沃白板打舞梦DX',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered){
            // 使用 modifier
            s.pressure_modifier = (s.pressure_modifier || 0) - 5;
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'wmc_game', amount: -5 }); } }catch(e){}
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `${names} 用希沃白板打舞梦DX，压力 -5`;
          c.log && c.log(`[WMC] ${msg}`);
          window.pushEvent && window.pushEvent({ name: 'WMC', description: msg, week: c.game.week });
          return null;
        }
      });

      // 蟋蟀：学生宿舍进了蛐蛐
      this.register({
        id: 'cricket',
        name: '蟋蟀',
        description: '学生的宿舍进了蛐蛐，叫了一晚上',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered){ 
            // 使用 modifier
            s.comfort_modifier = (s.comfort_modifier || 0) - 3;
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `${names} 的宿舍进了蛐蛐，叫了一晚上，舒适度 -3`;
          c.log && c.log(`[蟋蟀] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '蟋蟀', description: msg, week: c.game.week });
          return null;
        }
      });

      // florr：学生发现florr.io
      this.register({
        id: 'florr_game',
        name: 'florr',
        description: '学生发现了一款名为florr.io的游戏',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered){
            // 使用 modifier
            s.pressure_modifier = (s.pressure_modifier || 0) - 5;
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'florr_game', amount: -5 }); } }catch(e){}
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `${names} 发现了一款名为florr.io的游戏，压力 -5`;
          c.log && c.log(`[florr] ${msg}`);
          window.pushEvent && window.pushEvent({ name: 'florr', description: msg, week: c.game.week });
          return null;
        }
      });

      // 冰与火之舞：学生玩冰与火之舞
      this.register({
        id: 'ice_fire_dance',
        name: '冰与火之舞',
        description: '学生使用机械键盘大力游玩冰与火之舞',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered){
            // 使用 modifier
            s.pressure_modifier = (s.pressure_modifier || 0) - 5;
            s.comfort_modifier = (s.comfort_modifier || 0) - 3;
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'ice_fire_dance', amount: -5 }); } }catch(e){}
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `${names} 使用机械键盘大力游玩冰与火之舞，压力 -5，舒适度 -3`;
          c.log && c.log(`[冰与火之舞] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '冰与火之舞', description: msg, week: c.game.week });
          return null;
        }
      });

      // 约跑：学生晚上去操场跑步
      this.register({
        id: 'evening_run',
        name: '约跑',
        description: '学生晚上去操场跑步',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered){
            // 使用 modifier
            s.pressure_modifier = (s.pressure_modifier || 0) - 5;
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'evening_run', amount: -5 }); } }catch(e){}
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `${names} 晚上去操场跑步，压力 -5`;
          c.log && c.log(`[约跑] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '约跑', description: msg, week: c.game.week });
          return null;
        }
      });

      // 蓝色P站：学生访问
      this.register({
        id: 'blue_p_site',
        name: '蓝色P站',
        description: '发现学生的流量中有指向蓝色p站的',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          const names = triggered.map(s => s.name).join('、');
          const msg = `你发现 ${names} 的流量中有指向蓝色p站的`;
          c.log && c.log(`[蓝色P站] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '蓝色P站', description: msg, week: c.game.week });
          return null;
        }
      });

      // 橙色P站：学生访问...
      this.register({
        id: 'orange_p_site',
        name: '橙色P站',
        description: '发现学生访问了橙色p站',
        check: function(c){
          const active = perStudentRolls(c.game);
          this._pendingTriggered = active.filter(() => getRandom() < 0.003);
          return this._pendingTriggered.length > 0;
        },
        run: function(c){
          const triggered = this._pendingTriggered || [];
          this._pendingTriggered = null;
          if (!triggered.length) return null;
          for (const s of triggered){
            // 使用 modifier
            s.pressure_modifier = (s.pressure_modifier || 0) - 10;
            s.mental = Math.max(0, (s.mental || 100) - 5);
            try{ if(typeof s.triggerTalents === 'function'){ s.triggerTalents('pressure_change', { source: 'orange_p_site', amount: -10 }); } }catch(e){}
          }
          const names = triggered.map(s => s.name).join('、');
          const msg = `你发现 ${names} 的流量指向......（压力 -10，心理素质 -5）`;
          c.log && c.log(`[橙色P站] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '橙色P站', description: msg, week: c.game.week });
          return null;
        }
      });
      
      // 训话事件（含彩蛋图片预加载与调试日志）
      document.addEventListener('coach-speech', (e) => {
        const { text, hash } = e.detail || {};

  try{ if (log) log(`coach-speech received: text='${String(text).slice(0,200)}' hash='${String(hash)}'`); }catch(_){}

        // 目标哈希
        const RENLIANG1 = 'f86a5c0dbcc6d2cf0d0b162e6b84c5a54f1774e334128e8a3563bb6f3d3c695a'; // 
        const RENLIANG2 = '8d54515075dbd5891e00b96573b375f9e6cf8deee47e5c59fafeaa323903d66a'; //

        function fallbackPush(msg){
          try{
            // 记录训话次数（保存在 game 上，若不存在则退回到 window）
            try{
              if (game) {
                game._coach_speech_count = (game._coach_speech_count || 0) + 1;
              } else {
                window._coach_speech_count = (window._coach_speech_count || 0) + 1;
              }
            }catch(_){ /* ignore increment errors */ }

            const count = (game && game._coach_speech_count) || window._coach_speech_count || 0;
            const description = count > 5 ? '你发现训话一点用也没有，不如多放几天假。但是不是所有教练都是这样认为的。' : msg;

            window.pushEvent && window.pushEvent({ name: '训话', description: description, week: (game && game.week) || 0 });
          }catch(e){}
          try{ if (typeof window.renderAll === 'function') window.renderAll(); }catch(e){}
        }

        // 调试：打印选中的分支
        if (!hash) {
          fallbackPush(text || '(empty)');
          return;
        }

        const tryShowImage = (imgPath, altText) => {
          const img = new Image();
          img.onload = function(){
            const html = `<div style="text-align:center"><img src="${imgPath}" alt="${altText}" style="max-width:100%;height:auto;border-radius:6px;" /></div>`;
            try{
              if (typeof window.showEventModal === 'function') {
                window.showEventModal({ name: '彩蛋', description: html });
                // 一般 showEventModal 需要 renderAll 来保证 UI 更新
                try{ if (typeof window.renderAll === 'function') window.renderAll(); }catch(e){}
              } else {
                fallbackPush(`(彩蛋) ${altText}`);
              }
            }catch(err){
              fallbackPush(text || `(彩蛋) ${altText}`);
            }
          };
          img.onerror = function(){
            // 回退：推送文字事件
            fallbackPush(text || `(图片加载失败) ${altText}`);
          };
          // 开始加载
          img.src = imgPath;
        };

        if (hash === RENLIANG1) {
          tryShowImage('assets/renliang1.png', 'renliang1');
          return;
        }

        if (hash === RENLIANG2) {
          tryShowImage('assets/renliang2.png', 'renliang2');
          return;
        }

        // 未匹配：正常记录并展示训话事件卡片
        console.debug('[coach-speech] no match; pushing normal event');
        fallbackPush(text || '(empty)');
      });
      
    },

    // 主调度：逐个事件执行 check/run
    checkRandomEvents(game){
      const ctx = this._ctx || {};
      const c = {
        game,
        PROVINCES: ctx.PROVINCES || window.PROVINCES,
        // Use window defaults first, then override with ctx.constants if provided.
        // This prevents window.<CONST> being undefined (because `const` at top-level
        // doesn't always create window properties) from overwriting valid ctx values.
        constants: Object.assign({}, {
          BASE_SICK_PROB: window.BASE_SICK_PROB,
          SICK_PROB_FROM_COLD_HOT: window.SICK_PROB_FROM_COLD_HOT,
          QUIT_PROB_BASE: window.QUIT_PROB_BASE,
          QUIT_PROB_PER_EXTRA_PRESSURE: window.QUIT_PROB_PER_EXTRA_PRESSURE,
          EXTREME_COLD_THRESHOLD: window.EXTREME_COLD_THRESHOLD,
          EXTREME_HOT_THRESHOLD: window.EXTREME_HOT_THRESHOLD
        }, ctx.constants || {}),
        utils: ctx.utils || {
          uniform: window.uniform,
          uniformInt: window.uniformInt,
          normal: window.normal,
          clamp: window.clamp,
          clampInt: window.clampInt
        },
        log: ctx.log || window.log
      };
      for(let evt of this._events.slice()){
        try{
          if(evt.check(c)){
            // 尝试在事件执行前后创建快照（如果脚本中已定义相关工具）
            let beforeSnap = null;
            try{ if (typeof window.__createSnapshot === 'function') beforeSnap = window.__createSnapshot(); }catch(e){ beforeSnap = null; }

            const runResult = evt.run && evt.run(c);

            // 事件执行后尝试创建快照并调用汇总函数以生成简要日志（如果可用）
            try{
              if (typeof window.__createSnapshot === 'function' && typeof window.__summarizeSnapshot === 'function' && runResult !== null) {
                  const afterSnap = window.__createSnapshot();
                  try{ window.__summarizeSnapshot(beforeSnap, afterSnap, '事件：' + evt.name, { suppressPush: true }); }catch(e){ /* 忽略汇总内部错误 */ }
                }
            }catch(e){ /* 忽略快照/汇总错误 */ }

            // 如果 run 返回了具体的消息，则使用该消息，否则使用通用描述
            if (runResult !== null) { // 仅当事件实际发生时才显示弹窗
                const description = typeof runResult === 'string' ? runResult : evt.description;
                window.showEventModal && window.showEventModal({ name: evt.name, description: description, week: game.week });
            }
          }
        }catch(e){
          console.error('EventManager error', evt.id, e);
        }
      }
    }
  };

  global.EventManager = EventManager;
})(window);