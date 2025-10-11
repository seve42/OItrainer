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
    clear(){ this._events = []; },
    // ctx: {game, PROVINCES, constants: {...}, utils: {...}, log}
    registerDefaultEvents(ctx){
      this.clear();
      this._ctx = ctx || {};
      const {game, PROVINCES, constants, utils, log} = ctx;
      if(!game || !utils) return;

      // 台风（沿海）
      this.register({
        id: 'typhoon', name: '台风', description: '沿海省份夏秋季台风，影响舒适度/压力/经费',
        check: (c) => {
          const coastalProvinces = ["广东","浙江","上海","福建","江苏","山东","辽宁","海南","天津"];
          if(!coastalProvinces.includes(c.game.province_name)) return false;
          const w = c.game.week;
          let typhoonProb = 0;
          if (w >= 20 && w <= 39) typhoonProb = 0.08;
          else if (w >= 14 && w <= 19) typhoonProb = 0.03;
          else if (w >= 40 && w <= 45) typhoonProb = 0.03;
          return Math.random() < typhoonProb;
        },
        run: (c) => {
          for(let s of c.game.students){ if(!s.active) continue; s.pressure = Math.min(100, s.pressure + 15); s.comfort = Math.max(0, s.comfort - 10); }
          const loss = utils.uniformInt(10000, 20000);
          c.game.budget = Math.max(0, c.game.budget - loss);
          c.log && c.log(`[台风] 台风来袭，训练受阻，学生压力上升，舒适度下降，经费损失¥${loss}`);
        }
      });

      // 感冒（生病）
      this.register({
        id: 'sickness', name: '感冒', description: '天气/舒适度导致学生生病',
        check: (c) => {
          // check per-student later in run; here we just return true to indicate sickness logic should be evaluated
          return true;
        },
        run: (c) => {
          const {BASE_SICK_PROB, SICK_PROB_FROM_COLD_HOT, EXTREME_COLD_THRESHOLD, EXTREME_HOT_THRESHOLD} = c.constants;
          const difficulty_mod = c.game.getDifficultyModifier ? c.game.getDifficultyModifier() : 1.0;
          const comfort = c.game.getComfort ? c.game.getComfort() : (c.game.base_comfort || 50);
          for(let s of c.game.students){
            if(!s.active || s.sick_weeks > 0) continue;
            let sick_prob = BASE_SICK_PROB + Math.max(0.0, (30 - comfort)/50.0);
            if(c.game.temperature < EXTREME_COLD_THRESHOLD || c.game.temperature > EXTREME_HOT_THRESHOLD) sick_prob += SICK_PROB_FROM_COLD_HOT;
            sick_prob *= difficulty_mod;
            if(Math.random() < sick_prob){ s.sick_weeks = utils.uniformInt(1,2); c.log && c.log(`[事件] ${s.name} 感冒了`); }
          }
        }
      });

      // 压力过高导致退队
      this.register({
        id: 'burnout', name: '退队/倦怠', description: '压力累计导致学生退队',
        check: (c) => true,
        run: (c) => {
          const {QUIT_PROB_BASE, QUIT_PROB_PER_EXTRA_PRESSURE} = c.constants;
          for(let s of c.game.students){
            if(!s.active) continue;
            if(s.pressure >= 90){
              s.burnout_weeks = (s.burnout_weeks||0) + 1;
              if(s.burnout_weeks >= 3){
                let quit_prob = QUIT_PROB_BASE + QUIT_PROB_PER_EXTRA_PRESSURE * (s.pressure - 90);
                if(Math.random() < quit_prob){ s.active = false; c.game.quit_students = (c.game.quit_students||0)+1; c.game.reputation = (c.game.reputation||0)-10; c.log && c.log(`[事件] ${s.name} 退队`); }
              }
            } else {
              s.burnout_weeks = 0;
            }
          }
        }
      });
    },

    // 主调度：逐个事件执行 check/run
    checkRandomEvents(game){
      const ctx = this._ctx || {};
      // Provide a convenient context to handlers
      const c = {
        game: game,
        PROVINCES: ctx.PROVINCES || window.PROVINCES,
        constants: Object.assign({}, ctx.constants || {}, {
          BASE_SICK_PROB: window.BASE_SICK_PROB,
          SICK_PROB_FROM_COLD_HOT: window.SICK_PROB_FROM_COLD_HOT,
          QUIT_PROB_BASE: window.QUIT_PROB_BASE,
          QUIT_PROB_PER_EXTRA_PRESSURE: window.QUIT_PROB_PER_EXTRA_PRESSURE,
          EXTREME_COLD_THRESHOLD: window.EXTREME_COLD_THRESHOLD,
          EXTREME_HOT_THRESHOLD: window.EXTREME_HOT_THRESHOLD
        }),
        utils: ctx.utils || {
          uniform: window.uniform, uniformInt: window.uniformInt, normal: window.normal, clamp: window.clamp, clampInt: window.clampInt
        },
        log: ctx.log || window.log
      };

      for(let evt of this._events.slice()){ // iterate copy so handlers can register/unregister
        try{
          if(evt.check && evt.check(c)){
            evt.run && evt.run(c);
          }
        }catch(e){ console.error('EventManager error in event', evt.id, e); }
      }
    }
  };

  global.EventManager = EventManager;
})(window);
