/* task.js - 题目库系统 */
// 依赖：utils.js

/* 题目定义
 * 每道题目包含：
 * - name: 题目名称
 * - difficulty: 难度值（0-100）
 * - boosts: 知识点提升数组，每项包含 {type: '知识点类型', amount: 增幅值}
 *   最多3个知识点，类型可选：'数据结构', '图论', '字符串', '数学', 'DP'
 */

const TASK_POOL = [ {name: '[NOI2024] 幻境奔跑', difficulty: 146, boosts: [{type: '图论', amount: 22}, {type: '数学', amount: 7}]}, {name: '[IOI2015] Garden Quest', difficulty: 95, boosts: [{type: '动态规划', amount: 22}, {type: '数学', amount: 8}]}, {name: '[CF] Simple Sample A', difficulty: 12, boosts: [{type: '数学', amount: 4}]}, {name: '[CF] River Ledger', difficulty: 58, boosts: [{type: '图论', amount: 13}, {type: '数据结构', amount: 7}]}, {name: '[AtCoder] Morning Market', difficulty: 12, boosts: [{type: '数学', amount: 3}]}, {name: '[JOI2021] 松风谧语', difficulty: 79, boosts: [{type: '图论', amount: 16}, {type: '数据结构', amount: 7}]}, {name: '[NOIP2023] 数位之旅', difficulty: 53, boosts: [{type: '动态规划', amount: 12}, {type: '数学', amount: 4}]}, {name: '[CF] Paper Bridges', difficulty: 70, boosts: [{type: '图论', amount: 18}, {type: '数学', amount: 6}]}, {name: '[IOI2018] 河川工程', difficulty: 118, boosts: [{type: '图论', amount: 26}, {type: '数学', amount: 10}]}, {name: '[USACO Gold] 星辰捕手', difficulty: 78, boosts: [{type: '动态规划', amount: 18}, {type: '数据结构', amount: 6}]}, {name: '[POJ] 影子匹配', difficulty: 34, boosts: [{type: '字符串', amount: 11}]}, {name: '[POJ] 曙光索引', difficulty: 66, boosts: [{type: '字符串', amount: 15}, {type: '数学', amount: 4}]}, {name: '[CF] Stack & Greed', difficulty: 41, boosts: [{type: '数据结构', amount: 11}]}, {name: '[AtCoder] Crescent Isle', difficulty: 60, boosts: [{type: '图论', amount: 13}]}, {name: '[NOI2019] 流域工程', difficulty: 101, boosts: [{type: '图论', amount: 22}, {type: '数学', amount: 7}]}, {name: '[IOI2002] Hidden Treasure', difficulty: 110, boosts: [{type: '动态规划', amount: 23}, {type: '图论', amount: 9}]}, {name: '[CF] Two Pointers Warmup', difficulty: 18, boosts: [{type: '数据结构', amount: 5}]}, {name: '[CF] Twin Oaks', difficulty: 74, boosts: [{type: '图论', amount: 16}, {type: '动态规划', amount: 7}]}, {name: '[NOI2020] 数学之钥', difficulty: 58, boosts: [{type: '数学', amount: 14}]}, {name: '[AtCoder] Harbor Daybreak', difficulty: 36, boosts: [{type: '数学', amount: 9}]}, {name: '[CF] Shortest Tales', difficulty: 78, boosts: [{type: '图论', amount: 18}, {type: '数学', amount: 6}]}, {name: '[JOI2019] 字母迷航', difficulty: 52, boosts: [{type: '字符串', amount: 13}]}, {name: '[NOIP] 练习·贪心日记', difficulty: 50, boosts: [{type: '数据结构', amount: 12}, {type: '数学', amount: 4}]}, {name: '[IOI2012] 秘宝守护', difficulty: 90, boosts: [{type: '动态规划', amount: 20}, {type: '图论', amount: 7}]}, {name: '[CF] Union Grove', difficulty: 31, boosts: [{type: '图论', amount: 9}, {type: '数据结构', amount: 7}]}, {name: '[AtCoder DP] Mountain Relay', difficulty: 91, boosts: [{type: '动态规划', amount: 21}, {type: '数学', amount: 6}]}, {name: '[NOI2011] 幽径筑路', difficulty: 73, boosts: [{type: '图论', amount: 16}]}, {name: '[POJ] 片段之树', difficulty: 59, boosts: [{type: '数据结构', amount: 14}]}, {name: '[CF] Hash Echo', difficulty: 46, boosts: [{type: '字符串', amount: 11}, {type: '数学', amount: 4}]}, {name: '[IOI2005] Deep Garden', difficulty: 113, boosts: [{type: '动态规划', amount: 24}, {type: '数学', amount: 9}]}, {name: '[USACO Silver] Field Sort', difficulty: 24, boosts: [{type: '数据结构', amount: 7}]}, {name: '[CF] Flowframe', difficulty: 71, boosts: [{type: '图论', amount: 17}, {type: '数学', amount: 5}]}, {name: '[AtCoder] Chance of Dawn', difficulty: 67, boosts: [{type: '图论', amount: 16}, {type: '数学', amount: 6}]}, {name: '[NOI2014] 区间秘语', difficulty: 83, boosts: [{type: '动态规划', amount: 19}, {type: '数据结构', amount: 7}]}, {name: '[CF] Greedy Proof', difficulty: 43, boosts: [{type: '数学', amount: 10}]}, {name: '[POJ] 祖先之问', difficulty: 54, boosts: [{type: '图论', amount: 12}, {type: '数据结构', amount: 4}]}, {name: '[CF] Counting Constellations', difficulty: 56, boosts: [{type: '数学', amount: 15}]}, {name: '[JOI2020] 最小代价局', difficulty: 71, boosts: [{type: '动态规划', amount: 15}, {type: '数学', amount: 4}]}, {name: '[IOI2017] Experimental Maze', difficulty: 116, boosts: [{type: '数学', amount: 28}, {type: '动态规划', amount: 11}]}, {name: '[NOI2008] 双生匹配', difficulty: 64, boosts: [{type: '图论', amount: 16}]}, {name: '[CF] Rotating Echo', difficulty: 38, boosts: [{type: '字符串', amount: 10}]}, {name: '[AtCoder] Linear Bloom', difficulty: 88, boosts: [{type: '数学', amount: 20}]}, {name: '[POJ] 视域线', difficulty: 64, boosts: [{type: '数据结构', amount: 13}, {type: '数学', amount: 4}]}, {name: '[CF] Nim Intro', difficulty: 34, boosts: [{type: '数学', amount: 9}]}, {name: '[USACO Gold] Border Tale', difficulty: 97, boosts: [{type: '图论', amount: 21}, {type: '动态规划', amount: 11}]}, {name: '[NOIP] 基础·贪心札记', difficulty: 19, boosts: [{type: '数学', amount: 4}]}, {name: '[CF] Combinatoric Bits', difficulty: 48, boosts: [{type: '数学', amount: 13}]}, {name: '[AtCoder] Harbor Tales', difficulty: 26, boosts: [{type: '数学', amount: 3}]}, {name: '[IOI2013] Twilight Fields', difficulty: 112, boosts: [{type: '动态规划', amount: 25}, {type: '数学', amount: 8}]}, {name: '[CF] Interval Weave', difficulty: 58, boosts: [{type: '数据结构', amount: 15}]}, {name: '[POJ] 二分之境', difficulty: 20, boosts: [{type: '数学', amount: 6}]}, {name: '[NOI2010] 引水图记', difficulty: 65, boosts: [{type: '图论', amount: 16}, {type: '数学', amount: 4}]}, {name: '[CF] Monotone Optim', difficulty: 76, boosts: [{type: '动态规划', amount: 7}, {type: '数据结构', amount: 28}]}, {name: '[AGC] Silent Summit', difficulty: 102, boosts: [{type: '数学', amount: 22}, {type: '动态规划', amount: 9}]}, {name: '[JOI2017] 区域棋盘', difficulty: 82, boosts: [{type: '动态规划', amount: 19}]}, {name: '[IOI2004] City Tales', difficulty: 91, boosts: [{type: '图论', amount: 21}, {type: '动态规划', amount: 7}]}, {name: '[CF] Whisper Array', difficulty: 74, boosts: [{type: '字符串', amount: 18}, {type: '数学', amount: 4}]}, {name: '[NOI2015] 最远追寻', difficulty: 92, boosts: [{type: '图论', amount: 20}, {type: '动态规划', amount: 9}]}, {name: '[POJ] 微光表示', difficulty: 40, boosts: [{type: '字符串', amount: 10}]}, {name: '[AtCoder DP] Crestline', difficulty: 85, boosts: [{type: '动态规划', amount: 20}, {type: '数学', amount: 6}]}, {name: '[CF] Parallel Binaries', difficulty: 46, boosts: [{type: '数据结构', amount: 11}, {type: '数学', amount: 4}]}, {name: '[USACO Bronze] Trough Tidy', difficulty: 14, boosts: [{type: '数学', amount: 3}]}, {name: '[JOI2015] 合流序章', difficulty: 72, boosts: [{type: '动态规划', amount: 16}]}, {name: '[IOI2010] Roadblock Tales', difficulty: 88, boosts: [{type: '图论', amount: 20}, {type: '数学', amount: 6}]}, {name: '[CF] Modular Night', difficulty: 53, boosts: [{type: '数学', amount: 14}]}, {name: '[AtCoder] Suffix Meadow', difficulty: 82, boosts: [{type: '字符串', amount: 18}, {type: '数据结构', amount: 6}]}, {name: '[NOI2007] 结构之试', difficulty: 57, boosts: [{type: '数据结构', amount: 15}]}, {name: '[CF] Color Loom', difficulty: 62, boosts: [{type: '图论', amount: 14}, {type: '数学', amount: 4}]}, {name: '[POJ] 基调DP', difficulty: 58, boosts: [{type: '动态规划', amount: 13}, {type: '数学', amount: 4}]}, {name: '[USACO Gold] Partition Promise', difficulty: 95, boosts: [{type: '动态规划', amount: 20}, {type: '数据结构', amount: 7}]}, {name: '[CF] Sliding Window Intro', difficulty: 25, boosts: [{type: '数据结构', amount: 7}]}, {name: '[AtCoder] Distant Roads', difficulty: 74, boosts: [{type: '图论', amount: 16}]}, {name: '[IOI2001] Legacy Riddle', difficulty: 89, boosts: [{type: '数学', amount: 22}, {type: '动态规划', amount: 8}]}, {name: '[NOI2012] 区域镶嵌', difficulty: 85, boosts: [{type: '数据结构', amount: 19}]}, {name: '[CF] LCS Variant', difficulty: 66, boosts: [{type: '字符串', amount: 15}, {type: '数据结构', amount: 5}]}, {name: '[JOI2012] 山间议事', difficulty: 84, boosts: [{type: '图论', amount: 18}, {type: '动态规划', amount: 9}]}, {name: '[POJ] 最小割典藏', difficulty: 96, boosts: [{type: '图论', amount: 21}, {type: '数学', amount: 6}]}, {name: '[CF] Counting Paths', difficulty: 47, boosts: [{type: '数学', amount: 12}]}, {name: '[AtCoder] Meadow Greed', difficulty: 30, boosts: [{type: '数学', amount: 7}]}, {name: '[IOI2008] Planet M', difficulty: 82, boosts: [{type: '动态规划', amount: 22}, {type: '图论', amount: 8}]}, {name: '[NOI2006] 约束之书', difficulty: 82, boosts: [{type: '图论', amount: 18}, {type: '数学', amount: 6}]}, {name: '[CF] Fenwick Tales', difficulty: 44, boosts: [{type: '数据结构', amount: 11}]}, {name: '[POJ] 线性基札记', difficulty: 73, boosts: [{type: '数学', amount: 16}]}, {name: '[AtCoder] FFT Grove', difficulty: 103, boosts: [{type: '数学', amount: 22}]}, {name: '[USACO Silver] DP Basics', difficulty: 35, boosts: [{type: '动态规划', amount: 10}]}, {name: '[CF] Random Strings', difficulty: 35, boosts: [{type: '字符串', amount: 9}, {type: '数学', amount: 3}]}, {name: '[IOI2014] Challenge Heights', difficulty: 119, boosts: [{type: '数学', amount: 29}, {type: '动态规划', amount: 13}]}, {name: '[NOI2013] 区段迷踪', difficulty: 64, boosts: [{type: '动态规划', amount: 15}, {type: '数据结构', amount: 5}]}, {name: '[CF] Twin Trees', difficulty: 86, boosts: [{type: '图论', amount: 19}, {type: '动态规划', amount: 10}]}, {name: '[AtCoder] Suffix Bloom', difficulty: 83, boosts: [{type: '字符串', amount: 18}]}, {name: '[POJ] 背包札记', difficulty: 46, boosts: [{type: '动态规划', amount: 12}]}, {name: '[USACO Gold] River Network', difficulty: 100, boosts: [{type: '图论', amount: 21}, {type: '数学', amount: 7}]}, {name: '[CF] Dynamic Range', difficulty: 65, boosts: [{type: '数据结构', amount: 15}]}, {name: '[IOI2008] Matrix Mirth', difficulty: 87, boosts: [{type: '动态规划', amount: 20}, {type: '图论', amount: 7}]}, {name: '[NOIP] 数论札记', difficulty: 49, boosts: [{type: '数学', amount: 13}]}, {name: '[AtCoder] ABC Easy', difficulty: 18, boosts: [{type: '数学', amount: 4}]}, {name: '[CF] Hash & Union', difficulty: 43, boosts: [{type: '数据结构', amount: 11}, {type: '图论', amount: 4}]}, {name: '[POJ] LIS Grove', difficulty: 32, boosts: [{type: '动态规划', amount: 10}]}, {name: '[JOI2018] 构造之道', difficulty: 90, boosts: [{type: '数学', amount: 20}]}, {name: '[IOI2000] Ancient Puzzle', difficulty: 108, boosts: [{type: '数学', amount: 24}, {type: '图论', amount: 7}]}, {name: '[NOI2016] 树影', difficulty: 63, boosts: [{type: '图论', amount: 15}, {type: '数据结构', amount: 5}]}, {name: '[CF] Bitmasked DP', difficulty: 94, boosts: [{type: '动态规划', amount: 21}, {type: '数学', amount: 7}]}, {name: '[AtCoder] Craft Count', difficulty: 96, boosts: [{type: '数学', amount: 22}]}, {name: '[POJ] 跳跃篇', difficulty: 43, boosts: [{type: '数据结构', amount: 11}, {type: '图论', amount: 4}]}, {name: '[USACO Gold] Range Quilt', difficulty: 59, boosts: [{type: '数据结构', amount: 14}, {type: '数学', amount: 4}]}, {name: '[CF] Bridges & Cuts', difficulty: 50, boosts: [{type: '图论', amount: 13}]}, {name: '[IOI2006] Planet Quest', difficulty: 112, boosts: [{type: '图论', amount: 23}, {type: '数学', amount: 8}]}, {name: '[NOIP2021] 双分匹配', difficulty: 47, boosts: [{type: '图论', amount: 12}]}, {name: '[AtCoder DP] Twilight Task', difficulty: 84, boosts: [{type: '动态规划', amount: 20}, {type: '数学', amount: 6}]}, {name: '[CF] Combinatorics Core', difficulty: 55, boosts: [{type: '数学', amount: 14}]}, {name: '[POJ] 回文之歌', difficulty: 82, boosts: [{type: '字符串', amount: 18}]}, {name: '[USACO Silver] Greedy Day', difficulty: 31, boosts: [{type: '数学', amount: 7}]}, {name: '[IOI2016] Split Shores', difficulty: 116, boosts: [{type: '动态规划', amount: 25}, {type: '数学', amount: 10}]}, {name: '[AtCoder] ABC Math', difficulty: 42, boosts: [{type: '数学', amount: 11}]}, {name: '[CF] Trie Ensemble', difficulty: 72, boosts: [{type: '字符串', amount: 15}, {type: '数据结构', amount: 11}]}, {name: '[NOI2005] 最短余波', difficulty: 65, boosts: [{type: '图论', amount: 16}, {type: '数学', amount: 4}]}, {name: '[POJ] 区块DP', difficulty: 68, boosts: [{type: '动态规划', amount: 16}]}, {name: '[USACO Gold] Lane Locks', difficulty: 82, boosts: [{type: '图论', amount: 19}, {type: '动态规划', amount: 6}]}, {name: '[CF] Counting DP', difficulty: 59, boosts: [{type: '动态规划', amount: 14}, {type: '数学', amount: 4}]}, {name: '[AtCoder] String Merge', difficulty: 49, boosts: [{type: '字符串', amount: 12}, {type: '动态规划', amount: 4}]}, {name: '[JOI2014] Forest Search', difficulty: 70, boosts: [{type: '图论', amount: 15}]}, {name: '[IOI2009] Labyrinth', difficulty: 110, boosts: [{type: '动态规划', amount: 23}, {type: '数据结构', amount: 8}]}, {name: '[NOI2017] 挑战', difficulty: 91, boosts: [{type: '数据结构', amount: 31}]}, {name: '[CF] Minimal Rotate', difficulty: 36, boosts: [{type: '字符串', amount: 9}]}, {name: '[POJ] 后缀森林', difficulty: 84, boosts: [{type: '字符串', amount: 19}, {type: '数据结构', amount: 4}]}, {name: '[USACO Platinum] Pinnacle DP', difficulty: 106, boosts: [{type: '动态规划', amount: 23}, {type: '数据结构', amount: 16}]}, {name: '[AGC] Silent Construct', difficulty: 108, boosts: [{type: '数学', amount: 24}]}, {name: '[CF] Binary Jump', difficulty: 53, boosts: [{type: '数据结构', amount: 13}]}, {name: '[IOI2003] Ancient Lab', difficulty: 91, boosts: [{type: '数学', amount: 21}, {type: '图论', amount: 6}]}, {name: '[NOI2018] 构造赛道', difficulty: 47, boosts: [{type: '数学', amount: 11}]}, {name: '[POJ] Scanline Merge', difficulty: 74, boosts: [{type: '数据结构', amount: 16}, {type: '数学', amount: 6}]}, {name: '[CF] Mask DP', difficulty: 73, boosts: [{type: '动态规划', amount: 18}]}, {name: '[AtCoder] String Merge 2', difficulty: 77, boosts: [{type: '字符串', amount: 16}, {type: '动态规划', amount: 6}]}, {name: '[USACO Gold] Clique Test', difficulty: 85, boosts: [{type: '数学', amount: 19}, {type: '图论', amount: 7}]}, {name: '[IOI2019] Ultimate Hard', difficulty: 120, boosts: [{type: '数学', amount: 31}, {type: '动态规划', amount: 13}]} ];

/**
 * 从题目池中随机抽取n道题目
 * @param {number} count - 要抽取的题目数量
 * @returns {Array} 抽取的题目数组
 */
function selectRandomTasks(count = 5) {
  if (count >= TASK_POOL.length) {
    // 如果要抽取的数量大于等于题目池大小，返回打乱的全部题目
    return shuffleArray([...TASK_POOL]).slice(0, count);
  }
  
  // 优化抽取逻辑：保证至少有 3 道题（当 count>=3 时）与当前所有学生平均能力匹配
  // 1) 计算当前学生的平均能力（思维 + 编码 平均）
  // 2) 根据 calculateBoostMultiplier 计算每道题对该平均能力的适合度 score
  // 3) 从得分最高的若干候选中随机抽取所需数量的“匹配题”（至少3道）
  // 4) 填充剩余题目为随机不重复题目

  // 计算学生平均能力（尝试从全局 game 中获取活跃学生）
  let avgAbility = 50; // 兜底值
  try {
    if (typeof window !== 'undefined' && window.game && Array.isArray(window.game.students) && window.game.students.length > 0) {
      const actives = window.game.students.filter(s => s && s.active !== false);
      if (actives.length > 0) {
        const sum = actives.reduce((acc, s) => {
          const th = Number(s.thinking || 0);
          const co = Number(s.coding || 0);
          return acc + (th + co) / 2.0;
        }, 0);
        avgAbility = sum / actives.length;
      }
    }
  } catch (e) {
    // ignore and use default
  }

  // 计算每道题的适合度分数
  const scored = TASK_POOL.map(task => ({ task: task, score: calculateBoostMultiplier(avgAbility, task.difficulty) }));
  // 按 score 降序排列
  scored.sort((a, b) => b.score - a.score);

  const selected = [];
  const usedNames = new Set();

  // 决定需要保证的匹配题数量（当 count < 3 时取 count）
  const mustMatch = Math.min(count, 3);

  // 从得分最高的前 N 个候选中随机选取 mustMatch 道题
  const topCandidateCount = Math.min(Math.max(mustMatch, 6), scored.length); // 在前6名中选择，保证一定多样性
  const topCandidates = scored.slice(0, topCandidateCount).map(x => x.task);
  // 随机打乱候选并选取
  const shuffledTop = shuffleArray([...topCandidates]);
  for (let i = 0; i < Math.min(mustMatch, shuffledTop.length); i++) {
    selected.push(shuffledTop[i]);
    usedNames.add(shuffledTop[i].name);
  }

  // 填充剩余题目为随机不重复题目
  const pool = shuffleArray([...TASK_POOL]);
  for (let i = 0; i < pool.length && selected.length < count; i++) {
    const t = pool[i];
    if (usedNames.has(t.name)) continue;
    selected.push(t);
    usedNames.add(t.name);
  }

  // 最终将选中的题目顺序打乱以避免固定位置
  return shuffleArray(selected).slice(0, count);
}

/**
 * 洗牌函数 - Fisher-Yates算法
 * @param {Array} array - 要打乱的数组
 * @returns {Array} 打乱后的数组
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = uniformInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * 计算做题增幅的二次函数
 * 当学生能力（思维和编码平均）等于难度时，增幅 = 1.0（即100%）
 * 能力过高或过低时，增幅都会降低
 * 
 * 使用二次函数: multiplier = 1 - k * (ability - difficulty)^2
 * 当 ability = difficulty 时，multiplier = 1
 * 
 * @param {number} studentAbility - 学生能力（思维和编码平均值）
 * @param {number} taskDifficulty - 题目难度
 * @returns {number} 增幅倍数（0-1之间）
 */
function calculateBoostMultiplier(studentAbility, taskDifficulty) {
  // 二次函数系数，控制曲线的"宽度"
  // k 越大，曲线越窄，对能力-难度差异越敏感
  const k = 0.0003; // 调整这个值可以改变敏感度
  
  const diff = studentAbility - taskDifficulty;
  
  // 二次函数: 1 - k * diff^2
  let multiplier = 1.0 - k * diff * diff;
  
  // 确保倍数在合理范围内（最低10%，最高100%）
  multiplier = clamp(multiplier, 0.1, 1.0);
  
  return multiplier;
}

/**
 * 应用题目对学生知识点的提升
 * @param {Student} student - 学生对象
 * @param {Object} task - 题目对象
 * @returns {Object} 包含实际提升值的对象
 */
function applyTaskBoosts(student, task) {
  const studentAbility = (student.thinking + student.coding) / 2.0;
  const multiplier = calculateBoostMultiplier(studentAbility, task.difficulty);
  
  const results = {
    multiplier: multiplier,
    boosts: []
  };
  
  // 应用每个知识点的提升
  for (const boost of task.boosts) {
    const actualBoost = Math.floor(boost.amount * multiplier);
    
    // 根据类型增加对应知识点
    // 注意：这里使用的类型名要与 Student 类中的知识点对应
    let typeName = boost.type;
    
    student.addKnowledge(typeName, actualBoost);
    
    results.boosts.push({
      type: typeName,
      baseAmount: boost.amount,
      actualAmount: actualBoost
    });
  }
  
  return results;
}

/**
 * 获取题目的简短描述（用于UI显示）
 * @param {Object} task - 题目对象
 * @returns {string} 格式化的题目描述
 */
function getTaskDescription(task) {
  const boostStr = task.boosts.map(b => `${b.type}+${b.amount}`).join(' ');
  return `[${task.name}] [难度${task.difficulty}] [${boostStr}]`;
}

/**
 * 根据学生当前能力推荐合适难度的题目
 * @param {Student} student - 学生对象
 * @param {number} count - 推荐数量
 * @returns {Array} 推荐的题目数组
 */
function recommendTasksForStudent(student, count = 5) {
  const studentAbility = (student.thinking + student.coding) / 2.0;
  
  // 计算每道题的"适合度"分数
  const tasksWithScore = TASK_POOL.map(task => {
    const multiplier = calculateBoostMultiplier(studentAbility, task.difficulty);
    return {
      task: task,
      score: multiplier
    };
  });
  
  // 按适合度排序，取前count道
  tasksWithScore.sort((a, b) => b.score - a.score);
  
  return tasksWithScore.slice(0, count).map(item => item.task);
}

function handleSelfStudy(student, task, gameState) {
  const base_gain = task.base_gain;
  const facility_bonus = gameState.facilities.getLibraryEfficiency();
  const sick_penalty = student.sick_weeks > 0 ? 0.5 : 1.0;

  // 引入成长衰减：能力越高，从基础任务中获得的知识增益越少
  // 设计一个衰减因子，当综合能力为0时因子为1，当能力为200时因子约为0.5
  const comprehensiveAbility = student.getComprehensiveAbility();
  const decayFactor = Math.exp(-comprehensiveAbility / 250);

  let knowledge_gain = student.calculateKnowledgeGain(base_gain, facility_bonus, sick_penalty) * decayFactor;
  knowledge_gain = Math.max(1, Math.floor(knowledge_gain)); // 保证至少有1点收益
  student.addKnowledge(task.type, knowledge_gain);

  // 核心能力增长也加入衰减
  const abilityDecayFactor = Math.exp(-student.getAbilityAvg() / 300);
  const thinking_gain = Math.random() * 0.1 * Math.max(0, (100 - student.thinking)) / 100 * abilityDecayFactor;
  const coding_gain = Math.random() * 0.1 * Math.max(0, (100 - student.coding)) / 100 * abilityDecayFactor;
  student.thinking = (student.thinking || 0) + thinking_gain;
  student.coding = (student.coding || 0) + coding_gain;

  // 压力和舒适度调整
  student.pressure += task.pressure_change;
}
