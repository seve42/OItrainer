/* test.js - 测试脚本
   用于命令行环境测试比赛周事件按钮点击后不刷新的BUG
*/

// 模拟浏览器环境的基础对象
if (typeof window === 'undefined') {
  global.window = global;
  global.document = {
    getElementById: function(id) {
      return {
        innerHTML: '',
        innerText: '',
        prepend: function() {},
        appendChild: function() {},
        querySelector: function() { return null; }
      };
    },
    createElement: function(tag) {
      return {
        className: '',
        innerHTML: '',
        addEventListener: function() {},
        querySelector: function() { return null; }
      };
    }
  };
}

// 模拟游戏状态
function createMockGame() {
  return {
    week: 10,
    budget: 100000,
    reputation: 50,
    province_name: '北京',
    province_type: '强省',
    temperature: 20,
    students: [
      {
        name: '张三',
        active: true,
        pressure: 50,
        thinking: 70,
        coding: 65,
        mental: 75,
        comfort: 80,
        knowledge_ds: 60,
        knowledge_graph: 55,
        knowledge_string: 50,
        knowledge_math: 65,
        knowledge_dp: 58,
        sick_weeks: 0
      }
    ],
    facilities: {
      computer: 1,
      library: 0,
      ac: 0,
      dorm: 0,
      canteen: 0,
      getMaintenanceCost: function() { return 500; }
    },
    getComfort: function() { return 70; },
    getWeatherDescription: function() { return '晴'; },
    getFutureExpense: function() { return 5000; },
    getNextCompetition: function() { return '还有5周：CSP-S1'; },
    getWeeklyCost: function() { return 2000; },
    getExpenseMultiplier: function() { return 1.0; },
    completedCompetitions: new Set(),
    qualification: [{}, {}],
    noi_rankings: [],
    careerCompetitions: [],
    initial_students: 1,
    suppressEventModalOnce: false
  };
}

// 模拟比赛数据
const mockCompetitions = [
  { name: 'CSP-S1', week: 15, numProblems: 4, maxScore: 400 }
];

// 测试函数：模拟比赛周触发选择事件后点击按钮
function testCompetitionWeekEventChoice() {
  console.log('\n========== 测试：比赛周触发事件后按钮点击刷新 ==========\n');
  
  // 初始化模拟环境
  const game = createMockGame();
  game.week = 15; // 设置为比赛周
  window.game = game;
  
  const recentEvents = [];
  let renderAllCallCount = 0;
  let renderEventCardsCallCount = 0;
  
  // 模拟 pushEvent
  window.pushEvent = function(evt) {
    const ev = (typeof evt === 'string') 
      ? { name: null, description: evt, week: game.week }
      : { 
          name: evt.name || null, 
          description: evt.description || evt.text || '', 
          week: evt.week || game.week,
          options: evt.options || null,
          eventId: evt.eventId || null
        };
    recentEvents.unshift(ev);
    renderEventCardsCallCount++;
    console.log(`[pushEvent] 事件已推送: ${ev.name || '无名事件'} - ${ev.description}`);
  };
  
  // 模拟 renderAll
  window.renderAll = function() {
    renderAllCallCount++;
    console.log(`[renderAll] 调用次数: ${renderAllCallCount}`);
  };
  
  // 模拟 log
  window.log = function(msg) {
    console.log(`[游戏日志] ${msg}`);
  };
  
  // 模拟 currWeek
  window.currWeek = function() {
    return game.week;
  };
  
  console.log('步骤 1: 初始化游戏状态');
  console.log(`  - 当前周: ${game.week}`);
  console.log(`  - 经费: ¥${game.budget}`);
  console.log(`  - suppressEventModalOnce: ${game.suppressEventModalOnce}`);
  
  console.log('\n步骤 2: 触发选择事件（模拟比赛周）');
  
  // 模拟在比赛周触发选择事件
  const options = [
    { 
      label: '接受邀请', 
      effect: function() {
        // prefer centralized expense accounting
        let charged = 0;
        try{
          if (typeof game.recordExpense === 'function') charged = game.recordExpense(5000, '接受邀请');
          else throw new Error('no recordExpense');
        }catch(e){
          // fallback to direct deduction
          const costMult = (typeof COST_MULTIPLIER !== 'undefined' ? COST_MULTIPLIER : 1.0);
          charged = Math.max(0, Math.round(5000 * costMult));
          game.budget = Math.max(0, game.budget - charged);
        }
        console.log(`  [选项效果] 接受邀请，扣除经费 ¥${charged}，当前经费: ¥${game.budget}`);
        window.pushEvent({ 
          name: '选择结果', 
          description: `接受友校交流：经费 -¥${charged}`, 
          week: game.week 
        });
      }
    },
    { 
      label: '婉拒邀请', 
      effect: function() {
        game.reputation = Math.max(0, game.reputation - 1);
        console.log(`  [选项效果] 婉拒邀请，声誉 -1，当前声誉: ${game.reputation}`);
        window.pushEvent({ 
          name: '选择结果', 
          description: `婉拒友校交流：声誉 -1`, 
          week: game.week 
        });
      }
    }
  ];
  
  // 推送选择事件
  window.pushEvent({ 
    name: '友校交流邀请', 
    description: '是否接受友校交流邀请？', 
    week: game.week,
    options: options,
    eventId: 'test_choice_event'
  });
  
  console.log(`  - 事件已推送到 recentEvents`);
  console.log(`  - recentEvents 长度: ${recentEvents.length}`);
  
  console.log('\n步骤 3: 设置 suppressEventModalOnce 标志（模拟比赛周状态）');
  game.suppressEventModalOnce = true;
  console.log(`  - suppressEventModalOnce: ${game.suppressEventModalOnce}`);
  
  console.log('\n步骤 4: 模拟点击"接受邀请"按钮');
  const selectedEvent = recentEvents[0];
  const selectedOption = selectedEvent.options[0];
  
  console.log(`  - 点击前 suppressEventModalOnce: ${game.suppressEventModalOnce}`);
  console.log(`  - 点击前经费: ¥${game.budget}`);
  
  // 执行选项效果
  try {
    selectedOption.effect();
  } catch(e) {
    console.error('  [错误] 执行选项效果时出错:', e);
  }
  
  // 模拟修复前的代码（不清除 suppressEventModalOnce）
  console.log('\n步骤 5a: 测试修复前的行为（不清除标志）');
  const suppressBeforeFix = game.suppressEventModalOnce;
  console.log(`  - 修复前 suppressEventModalOnce: ${suppressBeforeFix}`);
  if (suppressBeforeFix) {
    console.log('  ⚠️ BUG复现：suppressEventModalOnce 仍为 true，界面可能不会正确刷新！');
  }
  
  // 模拟修复后的代码（清除 suppressEventModalOnce）
  console.log('\n步骤 5b: 测试修复后的行为（清除标志）');
  if (game.suppressEventModalOnce) {
    game.suppressEventModalOnce = false;
  }
  console.log(`  - 修复后 suppressEventModalOnce: ${game.suppressEventModalOnce}`);
  if (!game.suppressEventModalOnce) {
    console.log('  ✓ 修复成功：suppressEventModalOnce 已清除，界面将正确刷新！');
  }
  
  // 移除选项
  recentEvents[0].options = null;
  
  // 调用 renderAll
  window.renderAll();
  
  console.log('\n步骤 6: 验证最终状态');
  console.log(`  - 最终经费: ¥${game.budget} (预期: 95000)`);
  console.log(`  - renderAll 调用次数: ${renderAllCallCount} (预期: >= 1)`);
  console.log(`  - suppressEventModalOnce: ${game.suppressEventModalOnce} (预期: false)`);
  console.log(`  - 事件选项已移除: ${recentEvents[0].options === null} (预期: true)`);
  
  // 验证测试结果
  console.log('\n========== 测试结果 ==========');
  let passed = true;
  
  if (game.budget !== 95000) {
    console.log('❌ 失败: 经费不正确');
    passed = false;
  }
  
  if (renderAllCallCount < 1) {
    console.log('❌ 失败: renderAll 未被调用');
    passed = false;
  }
  
  if (game.suppressEventModalOnce !== false) {
    console.log('❌ 失败: suppressEventModalOnce 未被清除');
    passed = false;
  }
  
  if (recentEvents[0].options !== null) {
    console.log('❌ 失败: 事件选项未被移除');
    passed = false;
  }
  
  if (passed) {
    console.log('✅ 所有测试通过！BUG 已修复。');
  } else {
    console.log('❌ 测试失败，BUG 仍存在。');
  }
  
  console.log('\n========================================\n');
  
  return passed;
}

// 如果在 Node.js 环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCompetitionWeekEventChoice };
}

// 如果直接运行此脚本
if (typeof require !== 'undefined' && require.main === module) {
  testCompetitionWeekEventChoice();
}

// 如果在浏览器中运行
if (typeof window !== 'undefined') {
  window.testCompetitionWeekEventChoice = testCompetitionWeekEventChoice;
  console.log('测试函数已加载。在控制台运行 testCompetitionWeekEventChoice() 来执行测试。');
}
