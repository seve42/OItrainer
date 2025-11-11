/*
    debug.js: 调试代码
    包含用于开发和测试的辅助函数。
*/

/**
 * 调试函数：生成超强学生并跳转到第二年NOI
 * 使用方法：在浏览器控制台中输入 debugzak() 即可
 */
function debugzak() {
  if(typeof game === 'undefined' || !game) {
    console.error('游戏未初始化，请先开始游戏');
    alert('请先开始游戏再使用调试功能');
    return;
  }
  
  console.log('🔧 [调试] 开始生成超强学生并跳转到NOI...');
  
  game.students = [];
  
  const superStudent = new Student('zak', 500, 500, 500);
  superStudent.knowledge_ds = 500;
  superStudent.knowledge_graph = 500;
  superStudent.knowledge_string = 500;
  superStudent.knowledge_math = 500;
  superStudent.knowledge_dp = 500;
  superStudent.pressure = 0;
  superStudent.comfort = 100;
  superStudent.sick_weeks = 0;
  superStudent.active = true;
  
  game.students.push(superStudent);
  console.log('✅ [调试] 已创建超强学生：', superStudent.name);
  
  game.budget = 1000000;
  console.log('✅ [调试] 已设置经费：¥1,000,000');
  
  const secondYearNOI = competitions.find(c => c.name === 'NOI' && c.week > WEEKS_PER_HALF);
  const targetWeek = secondYearNOI ? secondYearNOI.week - 1 : 27;
  
  if(game.week < targetWeek) {
    const weeksToJump = targetWeek - game.week;
    console.log(`⏭️ [调试] 从第${game.week}周跳转到第${targetWeek}周（跳过${weeksToJump}周）...`);
    game.week = targetWeek;
  }
  
  const halfIndex = 1;
  if(!game.qualification[halfIndex]) {
    game.qualification[halfIndex] = {};
  }
  
  for(let compName of COMPETITION_ORDER) {
    if(!game.qualification[halfIndex][compName]) {
      game.qualification[halfIndex][compName] = new Set();
    }
    game.qualification[halfIndex][compName].add(superStudent.name);
  }
  console.log('✅ [调试] 已授予所有比赛晋级资格');
  
  if(!game.completedCompetitions) {
    game.completedCompetitions = new Set();
  }
  
  for(let comp of competitions) {
    if(comp.week < targetWeek && comp.week > WEEKS_PER_HALF) {
      const key = `${halfIndex}_${comp.name}_${comp.week}`;
      game.completedCompetitions.add(key);
    }
  }
  console.log('✅ [调试] 已标记完成前序比赛');
  
  game.updateWeather();
  
  if(typeof renderAll === 'function') {
    renderAll();
  }
  
  
  alert(`🔧 已创建"${superStudent.name}"\n 已跳转到第${game.week}周\n 已授予所有晋级资格\n`);
}
