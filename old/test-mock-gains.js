/**
 * 模拟赛知识增幅测试脚本
 * 使用方法：在浏览器控制台中运行此脚本，然后进行一场模拟赛
 */

(function(){
  'use strict';
  
  console.log('=== 模拟赛知识增幅调试模式已启用 ===');
  console.log('说明：');
  console.log('1. 启用详细日志记录');
  console.log('2. 在每次模拟赛后显示知识增幅统计');
  console.log('3. 验证增幅是否在合理范围内');
  console.log('');
  
  // 启用调试标志
  window.__OI_DEBUG_MOCK_GAINS = true;
  
  // 记录原始的 handleMockContestResults 函数
  const originalHandleMockContestResults = window.handleMockContestResults;
  
  if(!originalHandleMockContestResults){
    console.error('❌ 找不到 handleMockContestResults 函数，请确保已加载 contest-integration.js');
    return;
  }
  
  // 包装函数以添加额外的统计
  window.handleMockContestResults = function(studentStates, config, isPurchased, diffIdx){
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║       模拟赛知识增幅测试 - 开始                 ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    // 记录每个学生的知识点快照
    const beforeSnapshots = {};
    for(let state of studentStates){
      const s = state.student;
      beforeSnapshots[s.name] = {
        knowledge_ds: Number(s.knowledge_ds || 0),
        knowledge_graph: Number(s.knowledge_graph || 0),
        knowledge_string: Number(s.knowledge_string || 0),
        knowledge_math: Number(s.knowledge_math || 0),
        knowledge_dp: Number(s.knowledge_dp || 0)
      };
    }
    
    // 调用原始函数
    const result = originalHandleMockContestResults.apply(this, arguments);
    
    // 统计增幅
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║       模拟赛知识增幅统计报告                    ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    let hasAbnormal = false;
    
    for(let state of studentStates){
      const s = state.student;
      const before = beforeSnapshots[s.name];
      const after = {
        knowledge_ds: Number(s.knowledge_ds || 0),
        knowledge_graph: Number(s.knowledge_graph || 0),
        knowledge_string: Number(s.knowledge_string || 0),
        knowledge_math: Number(s.knowledge_math || 0),
        knowledge_dp: Number(s.knowledge_dp || 0)
      };
      
      const deltas = {
        ds: after.knowledge_ds - before.knowledge_ds,
        graph: after.knowledge_graph - before.knowledge_graph,
        string: after.knowledge_string - before.knowledge_string,
        math: after.knowledge_math - before.knowledge_math,
        dp: after.knowledge_dp - before.knowledge_dp
      };
      
      const totalDelta = deltas.ds + deltas.graph + deltas.string + deltas.math + deltas.dp;
      
      // 判断是否异常（超过预期上限的2倍）
      const expectedMax = 30; // 正常情况下单次模拟赛不应超过30
      const isAbnormal = totalDelta > expectedMax;
      
      if(isAbnormal) hasAbnormal = true;
      
      const marker = isAbnormal ? '⚠️ ' : '✓ ';
      console.log(`${marker} ${s.name}:`);
      console.log(`   总分: ${state.totalScore.toFixed(1)}`);
      console.log(`   知识增幅总计: ${totalDelta.toFixed(2)} ${isAbnormal ? '(异常！)' : ''}`);
      console.log(`   详细: 数据结构+${deltas.ds} | 图论+${deltas.graph} | 字符串+${deltas.string} | 数学+${deltas.math} | DP+${deltas.dp}`);
      console.log('');
    }
    
    if(hasAbnormal){
      console.warn('╔═══════════════════════════════════════════╗');
      console.warn('║   ⚠️  检测到异常的知识增幅！          ║');
      console.warn('║   请查看上方日志了解详细信息          ║');
      console.warn('╚═══════════════════════════════════════════╝');
    } else {
      console.log('╔═══════════════════════════════════════════╗');
      console.log('║   ✓ 所有知识增幅在正常范围内          ║');
      console.log('╚═══════════════════════════════════════════╝');
    }
    
    console.log('\n比赛类型:', isPurchased ? '付费模拟赛' : '免费模拟赛');
    console.log('难度索引:', diffIdx);
    console.log('题目数量:', config.problems ? config.problems.length : 0);
    console.log('\n');
    
    return result;
  };
  
  console.log('✓ 测试脚本加载完成');
  console.log('✓ 现在可以进行模拟赛了，结果会自动显示统计信息');
  console.log('');
  console.log('提示：要禁用调试模式，运行: window.__OI_DEBUG_MOCK_GAINS = false');
  
})();
