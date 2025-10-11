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
          const coastal = ["广东","浙江","上海","福建","江苏","山东","辽宁","海南","天津"];
          if(!coastal.includes(c.game.province_name)) return false;
          const w = c.game.week;
          let p = 0;
          if (w >= 20 && w <= 39) p = 0.08;
          else if ((w >= 14 && w <= 19) || (w >= 40 && w <= 45)) p = 0.03;
          return Math.random() < p;
        },
        run: c => {
          for(let s of c.game.students){
            if(!s.active) continue;
            s.pressure = Math.min(100, s.pressure + 15);
            s.comfort  = Math.max(0,   s.comfort  - 10);
          }
          const loss = utils.uniformInt(10000, 20000);
          c.game.budget = Math.max(0, c.game.budget - loss);
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
            if(!s.active || s.sick_weeks > 0) continue;
            let pr = BASE_SICK_PROB + Math.max(0, (30 - comfort)/50);
            if(c.game.temperature < EXTREME_COLD_THRESHOLD || c.game.temperature > EXTREME_HOT_THRESHOLD){
              pr += SICK_PROB_FROM_COLD_HOT;
            }
            if(Math.random() < pr){
              s.sick_weeks = utils.uniformInt(1,2);
              sickList.push(s.name);
            }
          }
          if(sickList.length){
            const msg = `${sickList.join('、')} 感冒了`;
            log && log(`[事件] ${msg}`);
            window.pushEvent && window.pushEvent({ name:'感冒', description: msg, week: c.game.week });
            return msg; // 返回具体消息以供调度器显示弹窗
          }
          return null;
        }
      });

      // 压力过高导致退队
      this.register({
        id: 'burnout',
        name: '退队/倦怠',
        description: '压力累计导致学生退队',
        check: c => c.game.students.some(s => s.active && s.pressure >= 90),
        run: c => {
          const {QUIT_PROB_BASE, QUIT_PROB_PER_EXTRA_PRESSURE} = c.constants;
          const quitList = [];
          for(let i = c.game.students.length - 1; i >= 0; i--){
            const s = c.game.students[i];
            if(!s.active) continue;
            if(s.pressure >= 90){
              s.burnout_weeks = (s.burnout_weeks || 0) + 1;
              if(s.burnout_weeks >= 3){
                const prob = QUIT_PROB_BASE + QUIT_PROB_PER_EXTRA_PRESSURE * (s.pressure - 90);
                if(Math.random() < prob){
                  quitList.push(s.name);
                  c.game.students.splice(i, 1);
                  c.game.quit_students = (c.game.quit_students||0) + 1;
                  c.game.reputation = Math.max(0, c.game.reputation - 10);
                }
              }
            } else {
              s.burnout_weeks = 0;
            }
          }
          if(quitList.length){
            const msg = `${quitList.join('、')} 因压力过大退队`;
            log && log(`[事件] ${msg}`);
            window.pushEvent && window.pushEvent({ name:'退队', description: msg, week: c.game.week });
            window.renderAll && window.renderAll();
            return msg;
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
        check: c => c.game.reputation > 60 && c.game.week >= 10 && c.game.week <= 20 && Math.random() < 0.03,
        run: c => {
          const gain = c.utils.uniformInt(20000, 50000);
          c.game.budget = (c.game.budget || 0) + gain;
          c.game.reputation = Math.min(100, c.game.reputation + 5);
          const msg = `获得企业赞助 ¥${gain}，声誉提升 +5`;
          c.log && c.log(`[企业赞助] ${msg}`);
          window.pushEvent && window.pushEvent({ name:'企业赞助', description: msg, week: c.game.week });
          return msg;
        }
      });
      // 金牌教练来访
      this.register({
        id: 'gold_coach_visit',
        name: '金牌教练来访',
  description: '知名教练莅临指导，教学点增加，学生能力微增，压力微降',
        check: c => c.game.reputation > 70 && ['北京','上海','江苏','浙江','广东','山东','天津'].includes(c.game.province_name) && Math.random() < 0.01,
        run: c => {
          c.game.teaching_points = (c.game.teaching_points || 0) + 10;
          for(const s of c.game.students){ if(!s.active) continue;
            s.thinking = Math.min(100, (s.thinking||0) + c.utils.uniformInt(1,3));
            s.coding   = Math.min(100, (s.coding  ||0) + c.utils.uniformInt(1,3));
            s.pressure = Math.max(0,   (s.pressure||0) - c.utils.uniformInt(1,3));
          }
          const msg = `金牌教练来访，教学点 +10，学生能力微增，压力微降`;
          c.log && c.log(`[金牌教练] ${msg}`);
          window.pushEvent && window.pushEvent({ name:'金牌教练来访', description: msg, week: c.game.week });
          return msg;
        }
      });
      // 发现优质网课
      this.register({
        id: 'quality_course_found',
        name: '发现优质网课',
        description: '资料库等级越高，越容易发现优质网课',
        check: c => Math.random() < 0.02 * (c.game.facilities.library || 1),
        run: c => {
          // 使用游戏中实际的知识类型
          const topics = ['数据结构','图论','字符串','数学','DP'];
          const topic = topics[c.utils.uniformInt(0, topics.length - 1)];
          for(const s of c.game.students){ if(!s.active) continue;
            s.knowledge = s.knowledge || {};
            s.knowledge[topic] = (s.knowledge[topic] || 0) + c.utils.uniformInt(1,5);
          }
          const msg = `在【${topic}】上获得少量提升`;
          c.log && c.log(`[优质网课] ${msg}`);
          window.pushEvent && window.pushEvent({ name:'优质网课', description: msg, week: c.game.week });
          return msg;
        }
      });
      // 上级拨款
      this.register({
        id: 'funding_allocation',
        name: '上级拨款',
        description: '比赛佳绩后获得额外经费与声誉提升',
        check: c => c.game.recentSuccess && (c.game.week - (c.game.recentSuccessWeek||0)) <= 2 && Math.random() < 0.5,
        run: c => {
          const gain = c.utils.uniformInt(10000, 30000);
          c.game.budget = (c.game.budget || 0) + gain;
          c.game.reputation = Math.min(100, c.game.reputation + 3);
          const msg = `收到上级拨款 ¥${gain}，声誉提升 +3`;
          c.log && c.log(`[上级拨款] ${msg}`);
          window.pushEvent && window.pushEvent({ name:'上级拨款', description: msg, week: c.game.week });
          return msg;
        }
      });
      // 负面事件：机房设备故障
      this.register({
        id: 'equipment_failure',
        name: '机房设备故障',
        description: '机房设备故障，产生维修费用或设置维修周数',
        check: c => Math.random() < 0.02 * (2 - (c.game.computer_level || 1)),
        run: c => {
          const cost = c.utils.uniformInt(5000, 20000);
          if (c.game.budget >= cost) {
            c.game.budget -= cost;
            c.game.computer_repair_weeks = 0;
            const msg = `设备故障，花费 ¥${cost} 维修`;
            c.log && c.log(`[设备故障] ${msg}`);
            window.pushEvent && window.pushEvent({ name: '机房设备故障', description: msg, week: c.game.week });
            return msg;
          } else {
            c.game.computer_repair_weeks = c.utils.uniformInt(1, 2);
            const msg = `设备故障，维修经费不足，影响训练 ${c.game.computer_repair_weeks} 周`;
            c.log && c.log(`[设备故障] ${msg}`);
            window.pushEvent && window.pushEvent({ name: '机房设备故障', description: msg, week: c.game.week });
            return msg;
          }
        }
      });
      // 负面事件：团队内部矛盾
      this.register({
        id: 'internal_conflict',
        name: '团队内部矛盾',
        description: '团队压力过高导致内部矛盾',
        check: c => {
          const active = c.game.students.filter(s => s.active);
          if (!active.length) return false;
          const avg = active.reduce((sum, s) => sum + s.pressure, 0) / active.length;
          return avg > 70 && Math.random() < 0.05;
        },
        run: c => {
          for (const s of c.game.students) {
            if (!s.active) continue;
            s.comfort = Math.max(0, s.comfort - c.utils.uniformInt(2, 5));
            s.mental = Math.max(0, (s.mental || 100) - c.utils.uniformInt(1, 3));
            s.pressure = Math.min(100, s.pressure + c.utils.uniformInt(1, 4));
          }
          const msg = '团队内部矛盾爆发，舒适度和心理素质下降，压力上升';
          c.log && c.log(`[内部矛盾] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '团队内部矛盾', description: msg, week: c.game.week });
          return msg;
        }
      });
      // 负面事件：经费审计
      this.register({
        id: 'funding_audit',
        name: '经费审计',
        description: '经费审计暂停高消费活动，并可能损失少量经费',
        check: c => c.game.budget > 200000 && Math.random() < 0.03,
        run: c => {
          const weeks = c.utils.uniformInt(1, 2);
          c.game.audit_weeks = weeks;
          const loss = c.utils.uniformInt(5000, 15000);
          c.game.budget = Math.max(0, c.game.budget - loss);
          const msg = `经费审计暂停高消费活动 ${weeks} 周，损失经费 ¥${loss}`;
          c.log && c.log(`[经费审计] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '经费审计', description: msg, week: c.game.week });
          return msg;
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
            if (!s.active) continue;
            s.comfort = Math.max(0, s.comfort - c.utils.uniformInt(2, 5));
          }
          const msg = `食堂卫生问题，接下来 ${weeks} 周学生生病概率上升，舒适度下降`;
          c.log && c.log(`[食堂卫生] ${msg}`);
          window.pushEvent && window.pushEvent({ name: '食堂卫生问题', description: msg, week: c.game.week });
          return msg;
        }
      });
      // 选择导向事件：友校交流邀请
      this.register({
        id: 'exchange_invite',
        name: '友校交流邀请',
        description: '接受或拒绝友校交流邀请',
        check: c => Math.random() < 0.02,
        run: c => {
          const options = [
            { label: '接受邀请', effect: () => {
                c.game.budget = Math.max(0, c.game.budget - 5000);
                for (const s of c.game.students) if (s.active) {
                  s.thinking = Math.min(100, s.thinking + 1);
                  s.coding = Math.min(100, s.coding + 1);
                  s.pressure = Math.min(100, s.pressure + 2);
                }
              }
            },
            { label: '婉拒邀请', effect: () => { c.game.reputation = Math.max(0, c.game.reputation - 1); } }
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
        check: c => c.game.reputation > 80 && Math.random() < 0.005,
        run: c => {
          const options = [
            { label: '接收', effect: () => {
                c.game.budget = Math.max(0, c.game.budget - c.utils.uniformInt(10000, 20000));
                c.game.students.push({ name: '新学生', active: true, thinking: 80, coding: 80, pressure: 30, comfort: 80 });
              }
            },
            { label: '拒绝', effect: () => {} }
          ];
          window.showChoiceModal && window.showChoiceModal({ name: '学生自荐', description: '一名学生想加入，是否接收？', week: c.game.week, options });
          return null;
        }
      });
      // 选择导向事件：媒体采访请求
      this.register({
        id: 'media_interview',
        name: '媒体采访请求',
        description: '采访后可选择高调或低调',
        check: c => c.game.recentMedal && Math.random() < 0.5,
        run: c => {
          const options = [
            { label: '高调宣传', effect: () => {
                c.game.reputation = Math.min(100, c.game.reputation + 10);
                for (const s of c.game.students) if (s.active) s.pressure = Math.min(100, s.pressure + 10);
              }
            },
            { label: '低调处理', effect: () => { c.game.reputation = Math.min(100, c.game.reputation + 2); } }
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
        check: c => c.game.week >= 10 && c.game.week <= 20 && Math.random() < 0.05,
        run: c => {
          const options = [
            { label: '参加', effect: () => {
                const gain = c.utils.uniformInt(20000, 50000);
                c.game.budget += gain;
                for (const s of c.game.students) if (s.active) {
                  s.pressure = Math.min(100, s.pressure + 10);
                  s.forget = (s.forget || 0) + 1;
                }
              }
            },
            { label: '拒绝', effect: () => {} }
          ];
          window.showChoiceModal && window.showChoiceModal({ name: '是否参加商业活动', description: '接受或拒绝商业活动？', week: c.game.week, options });
          return null;
        }
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
            const runResult = evt.run && evt.run(c);
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