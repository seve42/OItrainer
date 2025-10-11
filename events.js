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
        check: c => {
          // 仅当有学生压力过高时才激活此事件
          return c.game.students.some(s => s.active && s.pressure >= 90);
        },
        run: c => {
          const {QUIT_PROB_BASE, QUIT_PROB_PER_EXTRA_PRESSURE} = c.constants;
          const quitList = [];
          // 从后往前遍历，以便安全地从数组中移除学生
          for(let i = c.game.students.length - 1; i >= 0; i--){
            const s = c.game.students[i];
            if(!s.active) continue;
            if(s.pressure >= 90){
              s.burnout_weeks = (s.burnout_weeks || 0) + 1;
              if(s.burnout_weeks >= 3){
                const prob = QUIT_PROB_BASE + QUIT_PROB_PER_EXTRA_PRESSURE * (s.pressure - 90);
                if(Math.random() < prob){
                  quitList.push(s.name);
                  c.game.students.splice(i, 1); // 直接从数组中移除学生，与劝退逻辑一致
                  c.game.quit_students = (c.game.quit_students||0) + 1;
                  c.game.reputation = Math.max(0, c.game.reputation - 10);
                }
              }
            } else {
              s.burnout_weeks = 0;
            }
          }
          // 如果有学生退队，则统一记录日志和事件
          if(quitList.length){
            const msg = `${quitList.join('、')} 因压力过大退队`;
            log && log(`[事件] ${msg}`);
            window.pushEvent && window.pushEvent({ name:'退队', description: msg, week: c.game.week });
            // 刷新 UI 以移除学生
            window.renderAll && window.renderAll();
            return msg; // 返回具体消息
          }
          return null; // 没有学生退队，返回 null
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