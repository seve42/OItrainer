/* task.js - 题目库系统 */
// 依赖：utils.js

/* 题目定义
 * 每道题目包含：
 * - name: 题目名称
 * - difficulty: 难度值（0-100）
 * - boosts: 知识点提升数组，每项包含 {type: '知识点类型', amount: 增幅值}
 *   最多3个知识点，类型可选：'数据结构', '图论', '字符串', '数学', 'DP'
 */

const TASK_POOL = [
  { name: '[NOI2024] 幻境奔跑', difficulty: 146, boosts: [{ type: '图论', amount: 22 }, { type: '数学', amount: 7 }] },
  { name: '[IOI2015] Garden Quest', difficulty: 95, boosts: [{ type: '动态规划', amount: 22 }, { type: '数学', amount: 8 }] },
  { name: '[CF] Simple Sample A', difficulty: 12, boosts: [{ type: '数学', amount: 4 }] },
  { name: '[CF] River Ledger', difficulty: 58, boosts: [{ type: '图论', amount: 13 }, { type: '数据结构', amount: 7 }] },
  { name: '[AtCoder] Morning Market', difficulty: 12, boosts: [{ type: '数学', amount: 3 }] },
  { name: '[JOI2021] 松风谧语', difficulty: 79, boosts: [{ type: '图论', amount: 16 }, { type: '数据结构', amount: 7 }] },
  { name: '[NOIP2023] 数位之旅', difficulty: 53, boosts: [{ type: '动态规划', amount: 12 }, { type: '数学', amount: 4 }] },
  { name: '[CF] Paper Bridges', difficulty: 70, boosts: [{ type: '图论', amount: 18 }, { type: '数学', amount: 6 }] },
  { name: '[IOI2018] 河川工程', difficulty: 118, boosts: [{ type: '图论', amount: 26 }, { type: '数学', amount: 10 }] },
  { name: '[USACO Gold] 星辰捕手', difficulty: 78, boosts: [{ type: '动态规划', amount: 18 }, { type: '数据结构', amount: 6 }] },
  { name: '[POJ] 影子匹配', difficulty: 34, boosts: [{ type: '字符串', amount: 11 }] },
  { name: '[POJ] 曙光索引', difficulty: 66, boosts: [{ type: '字符串', amount: 15 }, { type: '数学', amount: 4 }] },
  { name: '[CF] Stack & Greed', difficulty: 41, boosts: [{ type: '数据结构', amount: 11 }] },
  { name: '[AtCoder] Crescent Isle', difficulty: 60, boosts: [{ type: '图论', amount: 13 }] },
  { name: '[NOI2019] 流域工程', difficulty: 101, boosts: [{ type: '图论', amount: 22 }, { type: '数学', amount: 7 }] },
  { name: '[IOI2002] Hidden Treasure', difficulty: 110, boosts: [{ type: '动态规划', amount: 23 }, { type: '图论', amount: 9 }] },
  { name: '[CF] Two Pointers Warmup', difficulty: 18, boosts: [{ type: '数据结构', amount: 5 }] },
  { name: '[CF] Twin Oaks', difficulty: 74, boosts: [{ type: '图论', amount: 16 }, { type: '动态规划', amount: 7 }] },
  { name: '[NOI2020] 数学之钥', difficulty: 58, boosts: [{ type: '数学', amount: 14 }] },
  { name: '[AtCoder] Harbor Daybreak', difficulty: 36, boosts: [{ type: '数学', amount: 9 }] },
  { name: '[CF] Shortest Tales', difficulty: 78, boosts: [{ type: '图论', amount: 18 }, { type: '数学', amount: 6 }] },
  { name: '[JOI2019] 字母迷航', difficulty: 52, boosts: [{ type: '字符串', amount: 13 }] },
  { name: '[NOIP] 练习·贪心日记', difficulty: 50, boosts: [{ type: '数据结构', amount: 12 }, { type: '数学', amount: 4 }] },
  { name: '[IOI2012] 秘宝守护', difficulty: 90, boosts: [{ type: '动态规划', amount: 20 }, { type: '图论', amount: 7 }] },
  { name: '[CF] Union Grove', difficulty: 31, boosts: [{ type: '图论', amount: 9 }, { type: '数据结构', amount: 7 }] },
  { name: '[AtCoder DP] Mountain Relay', difficulty: 91, boosts: [{ type: '动态规划', amount: 21 }, { type: '数学', amount: 6 }] },
  { name: '[NOI2011] 幽径筑路', difficulty: 73, boosts: [{ type: '图论', amount: 16 }] },
  { name: '[POJ] 片段之树', difficulty: 59, boosts: [{ type: '数据结构', amount: 14 }] },
  { name: '[CF] Hash Echo', difficulty: 46, boosts: [{ type: '字符串', amount: 11 }, { type: '数学', amount: 4 }] },
  { name: '[IOI2005] Deep Garden', difficulty: 113, boosts: [{ type: '动态规划', amount: 24 }, { type: '数学', amount: 9 }] },
  { name: '[USACO Silver] Field Sort', difficulty: 24, boosts: [{ type: '数据结构', amount: 7 }] },
  { name: '[CF] Flowframe', difficulty: 71, boosts: [{ type: '图论', amount: 17 }, { type: '数学', amount: 5 }] },
  { name: '[AtCoder] Chance of Dawn', difficulty: 67, boosts: [{ type: '图论', amount: 16 }, { type: '数学', amount: 6 }] },
  { name: '[NOI2014] 区间秘语', difficulty: 83, boosts: [{ type: '动态规划', amount: 19 }, { type: '数据结构', amount: 7 }] },
  { name: '[CF] Greedy Proof', difficulty: 43, boosts: [{ type: '数学', amount: 10 }] },
  { name: '[POJ] 祖先之问', difficulty: 54, boosts: [{ type: '图论', amount: 12 }, { type: '数据结构', amount: 4 }] },
  { name: '[CF] Counting Constellations', difficulty: 56, boosts: [{ type: '数学', amount: 15 }] },
  { name: '[JOI2020] 最小代价局', difficulty: 71, boosts: [{ type: '动态规划', amount: 15 }, { type: '数学', amount: 4 }] },
  { name: '[IOI2017] Experimental Maze', difficulty: 116, boosts: [{ type: '数学', amount: 28 }, { type: '动态规划', amount: 11 }] },
  { name: '[NOI2008] 双生匹配', difficulty: 64, boosts: [{ type: '图论', amount: 16 }] },
  { name: '[CF] Rotating Echo', difficulty: 38, boosts: [{ type: '字符串', amount: 10 }] },
  { name: '[AtCoder] Linear Bloom', difficulty: 88, boosts: [{ type: '数学', amount: 20 }] },
  { name: '[POJ] 视域线', difficulty: 64, boosts: [{ type: '数据结构', amount: 13 }, { type: '数学', amount: 4 }] },
  { name: '[CF] Nim Intro', difficulty: 34, boosts: [{ type: '数学', amount: 9 }] },
  { name: '[USACO Gold] Border Tale', difficulty: 97, boosts: [{ type: '图论', amount: 21 }, { type: '动态规划', amount: 11 }] },
  { name: '[NOIP] 基础·贪心札记', difficulty: 19, boosts: [{ type: '数学', amount: 4 }] },
  { name: '[CF] Combinatoric Bits', difficulty: 48, boosts: [{ type: '数学', amount: 13 }] },
  { name: '[AtCoder] Harbor Tales', difficulty: 26, boosts: [{ type: '数学', amount: 3 }] },
  { name: '[IOI2013] Twilight Fields', difficulty: 112, boosts: [{ type: '动态规划', amount: 25 }, { type: '数学', amount: 8 }] },
  { name: '[CF] Interval Weave', difficulty: 58, boosts: [{ type: '数据结构', amount: 15 }] },
  { name: '[POJ] 二分之境', difficulty: 20, boosts: [{ type: '数学', amount: 6 }] },
  { name: '[NOI2010] 引水图记', difficulty: 65, boosts: [{ type: '图论', amount: 16 }, { type: '数学', amount: 4 }] },
  { name: '[CF] Monotone Optim', difficulty: 76, boosts: [{ type: '动态规划', amount: 7 }, { type: '数据结构', amount: 28 }] },
  { name: '[AGC] Silent Summit', difficulty: 102, boosts: [{ type: '数学', amount: 22 }, { type: '动态规划', amount: 9 }] },
  { name: '[JOI2017] 区域棋盘', difficulty: 82, boosts: [{ type: '动态规划', amount: 19 }] },
  { name: '[IOI2004] City Tales', difficulty: 91, boosts: [{ type: '图论', amount: 21 }, { type: '动态规划', amount: 7 }] },
  { name: '[CF] Whisper Array', difficulty: 74, boosts: [{ type: '字符串', amount: 18 }, { type: '数学', amount: 4 }] },
  { name: '[NOI2015] 最远追寻', difficulty: 92, boosts: [{ type: '图论', amount: 20 }, { type: '动态规划', amount: 9 }] },
  { name: '[POJ] 微光表示', difficulty: 40, boosts: [{ type: '字符串', amount: 10 }] },
  { name: '[AtCoder DP] Crestline', difficulty: 85, boosts: [{ type: '动态规划', amount: 20 }, { type: '数学', amount: 6 }] },
  { name: '[CF] Parallel Binaries', difficulty: 46, boosts: [{ type: '数据结构', amount: 11 }, { type: '数学', amount: 4 }] },
  { name: '[USACO Bronze] Trough Tidy', difficulty: 14, boosts: [{ type: '数学', amount: 3 }] },
  { name: '[JOI2015] 合流序章', difficulty: 72, boosts: [{ type: '动态规划', amount: 16 }] },
  { name: '[IOI2010] Roadblock Tales', difficulty: 88, boosts: [{ type: '图论', amount: 20 }, { type: '数学', amount: 6 }] },
  { name: '[CF] Modular Night', difficulty: 53, boosts: [{ type: '数学', amount: 14 }] },
  { name: '[AtCoder] Suffix Meadow', difficulty: 82, boosts: [{ type: '字符串', amount: 18 }, { type: '数据结构', amount: 6 }] },
  { name: '[NOI2007] 结构之试', difficulty: 57, boosts: [{ type: '数据结构', amount: 15 }] },
  { name: '[CF] Color Loom', difficulty: 62, boosts: [{ type: '图论', amount: 14 }, { type: '数学', amount: 4 }] },
  { name: '[POJ] 基调DP', difficulty: 58, boosts: [{ type: '动态规划', amount: 13 }, { type: '数学', amount: 4 }] },
  { name: '[USACO Gold] Partition Promise', difficulty: 95, boosts: [{ type: '动态规划', amount: 20 }, { type: '数据结构', amount: 7 }] },
  { name: '[CF] Sliding Window Intro', difficulty: 25, boosts: [{ type: '数据结构', amount: 7 }] },
  { name: '[AtCoder] Distant Roads', difficulty: 74, boosts: [{ type: '图论', amount: 16 }] },
  { name: '[IOI2001] Legacy Riddle', difficulty: 89, boosts: [{ type: '数学', amount: 22 }, { type: '动态规划', amount: 8 }] },
  { name: '[NOI2012] 区域镶嵌', difficulty: 85, boosts: [{ type: '数据结构', amount: 19 }] },
  { name: '[CF] LCS Variant', difficulty: 66, boosts: [{ type: '字符串', amount: 15 }, { type: '数据结构', amount: 5 }] },
  { name: '[JOI2012] 山间议事', difficulty: 84, boosts: [{ type: '图论', amount: 18 }, { type: '动态规划', amount: 9 }] },
  { name: '[POJ] 最小割典藏', difficulty: 96, boosts: [{ type: '图论', amount: 21 }, { type: '数学', amount: 6 }] },
  { name: '[CF] Counting Paths', difficulty: 47, boosts: [{ type: '数学', amount: 12 }] },
  { name: '[AtCoder] Meadow Greed', difficulty: 30, boosts: [{ type: '数学', amount: 7 }] },
  { name: '[IOI2008] Planet M', difficulty: 82, boosts: [{ type: '动态规划', amount: 22 }, { type: '图论', amount: 8 }] },
  { name: '[NOI2006] 约束之书', difficulty: 82, boosts: [{ type: '图论', amount: 18 }, { type: '数学', amount: 6 }] },
  { name: '[CF] Fenwick Tales', difficulty: 44, boosts: [{ type: '数据结构', amount: 11 }] },
  { name: '[POJ] 线性基札记', difficulty: 73, boosts: [{ type: '数学', amount: 16 }] },
  { name: '[AtCoder] FFT Grove', difficulty: 103, boosts: [{ type: '数学', amount: 22 }] },
  { name: '[USACO Silver] DP Basics', difficulty: 35, boosts: [{ type: '动态规划', amount: 10 }] },
  { name: '[CF] Random Strings', difficulty: 35, boosts: [{ type: '字符串', amount: 9 }, { type: '数学', amount: 3 }] },
  { name: '[IOI2014] Challenge Heights', difficulty: 119, boosts: [{ type: '数学', amount: 29 }, { type: '动态规划', amount: 13 }] },
  { name: '[NOI2013] 区段迷踪', difficulty: 64, boosts: [{ type: '动态规划', amount: 15 }, { type: '数据结构', amount: 5 }] },
  { name: '[CF] Twin Trees', difficulty: 86, boosts: [{ type: '图论', amount: 19 }, { type: '动态规划', amount: 10 }] },
  { name: '[AtCoder] Suffix Bloom', difficulty: 83, boosts: [{ type: '字符串', amount: 18 }] },
  { name: '[POJ] 背包札记', difficulty: 46, boosts: [{ type: '动态规划', amount: 12 }] },
  { name: '[USACO Gold] River Network', difficulty: 100, boosts: [{ type: '图论', amount: 21 }, { type: '数学', amount: 7 }] },
  { name: '[CF] Dynamic Range', difficulty: 65, boosts: [{ type: '数据结构', amount: 15 }] },
  { name: '[IOI2008] Matrix Mirth', difficulty: 87, boosts: [{ type: '动态规划', amount: 20 }, { type: '图论', amount: 7 }] },
  { name: '[NOIP] 数论札记', difficulty: 49, boosts: [{ type: '数学', amount: 13 }] },
  { name: '[AtCoder] ABC Easy', difficulty: 18, boosts: [{ type: '数学', amount: 4 }] },
  { name: '[CF] Hash & Union', difficulty: 43, boosts: [{ type: '数据结构', amount: 11 }, { type: '图论', amount: 4 }] },
  { name: '[POJ] LIS Grove', difficulty: 32, boosts: [{ type: '动态规划', amount: 10 }] },
  { name: '[JOI2018] 构造之道', difficulty: 90, boosts: [{ type: '数学', amount: 20 }] },
  { name: '[IOI2000] Ancient Puzzle', difficulty: 108, boosts: [{ type: '数学', amount: 24 }, { type: '图论', amount: 7 }] },
  { name: '[NOI2016] 树影', difficulty: 63, boosts: [{ type: '图论', amount: 15 }, { type: '数据结构', amount: 5 }] },
  { name: '[CF] Bitmasked DP', difficulty: 94, boosts: [{ type: '动态规划', amount: 21 }, { type: '数学', amount: 7 }] },
  { name: '[AtCoder] Craft Count', difficulty: 96, boosts: [{ type: '数学', amount: 22 }] },
  { name: '[POJ] 跳跃篇', difficulty: 43, boosts: [{ type: '数据结构', amount: 11 }, { type: '图论', amount: 4 }] },
  { name: '[USACO Gold] Range Quilt', difficulty: 59, boosts: [{ type: '数据结构', amount: 14 }, { type: '数学', amount: 4 }] },
  { name: '[CF] Bridges & Cuts', difficulty: 50, boosts: [{ type: '图论', amount: 13 }] },
  { name: '[IOI2006] Planet Quest', difficulty: 112, boosts: [{ type: '图论', amount: 23 }, { type: '数学', amount: 8 }] },
  { name: '[NOIP2021] 双分匹配', difficulty: 47, boosts: [{ type: '图论', amount: 12 }] },
  { name: '[AtCoder DP] Twilight Task', difficulty: 84, boosts: [{ type: '动态规划', amount: 20 }, { type: '数学', amount: 6 }] },
  { name: '[CF] Combinatorics Core', difficulty: 55, boosts: [{ type: '数学', amount: 14 }] },
  { name: '[POJ] 回文之歌', difficulty: 82, boosts: [{ type: '字符串', amount: 18 }] },
  { name: '[USACO Silver] Greedy Day', difficulty: 31, boosts: [{ type: '数学', amount: 7 }] },
  { name: '[IOI2016] Split Shores', difficulty: 116, boosts: [{ type: '动态规划', amount: 25 }, { type: '数学', amount: 10 }] },
  { name: '[AtCoder] ABC Math', difficulty: 42, boosts: [{ type: '数学', amount: 11 }] },
  { name: '[CF] Trie Ensemble', difficulty: 72, boosts: [{ type: '字符串', amount: 15 }, { type: '数据结构', amount: 11 }] },
  { name: '[NOI2005] 最短余波', difficulty: 65, boosts: [{ type: '图论', amount: 16 }, { type: '数学', amount: 4 }] },
  { name: '[POJ] 区块DP', difficulty: 68, boosts: [{ type: '动态规划', amount: 16 }] },
  { name: '[USACO Gold] Lane Locks', difficulty: 82, boosts: [{ type: '图论', amount: 19 }, { type: '动态规划', amount: 6 }] },
  { name: '[CF] Counting DP', difficulty: 59, boosts: [{ type: '动态规划', amount: 14 }, { type: '数学', amount: 4 }] },
  { name: '[AtCoder] String Merge', difficulty: 49, boosts: [{ type: '字符串', amount: 12 }, { type: '动态规划', amount: 4 }] },
  { name: '[JOI2014] Forest Search', difficulty: 70, boosts: [{ type: '图论', amount: 15 }] },
  { name: '[IOI2009] Labyrinth', difficulty: 110, boosts: [{ type: '动态规划', amount: 23 }, { type: '数据结构', amount: 8 }] },
  { name: '[NOI2017] 挑战', difficulty: 91, boosts: [{ type: '数据结构', amount: 31 }] },
  { name: '[CF] Minimal Rotate', difficulty: 36, boosts: [{ type: '字符串', amount: 9 }] },
  { name: '[POJ] 后缀森林', difficulty: 84, boosts: [{ type: '字符串', amount: 19 }, { type: '数据结构', amount: 4 }] },
  { name: '[USACO Platinum] Pinnacle DP', difficulty: 106, boosts: [{ type: '动态规划', amount: 23 }, { type: '数据结构', amount: 16 }] },
  { name: '[AGC] Silent Construct', difficulty: 108, boosts: [{ type: '数学', amount: 24 }] },
  { name: '[CF] Binary Jump', difficulty: 53, boosts: [{ type: '数据结构', amount: 13 }] },
  { name: '[IOI2003] Ancient Lab', difficulty: 91, boosts: [{ type: '数学', amount: 21 }, { type: '图论', amount: 6 }] },
  { name: '[NOI2018] 构造赛道', difficulty: 47, boosts: [{ type: '数学', amount: 11 }] },
  { name: '[POJ] Scanline Merge', difficulty: 74, boosts: [{ type: '数据结构', amount: 16 }, { type: '数学', amount: 6 }] },
  { name: '[CF] Mask DP', difficulty: 73, boosts: [{ type: '动态规划', amount: 18 }] },
  { name: '[AtCoder] String Merge 2', difficulty: 77, boosts: [{ type: '字符串', amount: 16 }, { type: '动态规划', amount: 6 }] },
  { name: '[USACO Gold] Clique Test', difficulty: 85, boosts: [{ type: '数学', amount: 19 }, { type: '图论', amount: 7 }] },
  { name: '[IOI2019] Ultimate Hard', difficulty: 120, boosts: [{ type: '数学', amount: 31 }, { type: '动态规划', amount: 13 }] },
   { name: "[CF] Shadow's Descent", difficulty: 110, boosts: [{ type: '图论', amount: 25 }, { type: '数学', amount: 10 }] },
  { name: '[USACO] Harvest Dawn', difficulty: 45, boosts: [{ type: '数据结构', amount: 11 }] },
  { name: '[AtCoder] Silent Citadel', difficulty: 68, boosts: [{ type: '数学', amount: 16 }, { type: '动态规划', amount: 5 }] },
  { name: '[JOI] さくらのきせつ', difficulty: 95, boosts: [{ type: '动态规划', amount: 21 }, { type: '数据结构', amount: 7 }] },
  { name: '[POJ] River of Memory', difficulty: 32, boosts: [{ type: '字符串', amount: 8 }, { type: '数学', amount: 3 }] },
  { name: '[NOI] 幻影流沙', difficulty: 125, boosts: [{ type: '图论', amount: 28 }, { type: '数学', amount: 12 }, { type: '动态规划', amount: 10 }] },
  { name: '[IOI] Starfall Echo', difficulty: 105, boosts: [{ type: '数据结构', amount: 23 }, { type: '动态规划', amount: 9 }] },
  { name: '[CF] Bluebell Grove', difficulty: 1, boosts: [{ type: '数学', amount: 1 }] },
  { name: '[AtCoder] Whispering Coast', difficulty: 77, boosts: [{ type: '图论', amount: 17 }, { type: '数学', amount: 6 }] },
  { name: '[USACO] Obsidian Peak', difficulty: 51, boosts: [{ type: '动态规划', amount: 12 }] },
  { name: '[POJ] Ancient Cipher', difficulty: 40, boosts: [{ type: '字符串', amount: 10 }] },
  { name: '[NOI] 银河拾穗', difficulty: 88, boosts: [{ type: '图论', amount: 19 }, { type: '动态规划', amount: 8 }] },
  { name: '[IOI] Sunken Temple', difficulty: 115, boosts: [{ type: '动态规划', amount: 25 }, { type: '数据结构', amount: 10 }] },
  { name: '[CF] Lunar Veil', difficulty: 23, boosts: [{ type: '数学', amount: 6 }] },
  { name: '[JOI] 雪のささやき', difficulty: 55, boosts: [{ type: '数据结构', amount: 13 }, { type: '动态规划', amount: 4 }] },
  { name: '[AtCoder] Crimson Trail', difficulty: 70, boosts: [{ type: '图论', amount: 15 }] },
  { name: '[USACO] Twilight Bloom', difficulty: 62, boosts: [{ type: '动态规划', amount: 14 }, { type: '图论', amount: 5 }] },
  { name: '[POJ] Lost Fragment', difficulty: 28, boosts: [{ type: '字符串', amount: 7 }] },
  { name: '[NOI] 暮光筑梦', difficulty: 130, boosts: [{ type: '数据结构', amount: 30 }, { type: '图论', amount: 12 }, { type: '数学', amount: 10 }] },
  { name: '[IOI] Void Walker', difficulty: 98, boosts: [{ type: '数学', amount: 22 }, { type: '动态规划', amount: 8 }] },
  { name: '[CF] Emerald Stream', difficulty: 15, boosts: [{ type: '数据结构', amount: 4 }] },
  { name: '[AtCoder] Mountain Whisper', difficulty: 50, boosts: [{ type: '动态规划', amount: 12 }, { type: '数学', amount: 4 }] },
  { name: '[USACO] Frontier Gate', difficulty: 79, boosts: [{ type: '字符串', amount: 18 }, { type: '数据结构', amount: 6 }] },
  { name: '[POJ] Ironclad Wall', difficulty: 60, boosts: [{ type: '图论', amount: 14 }] },
  { name: '[NOI] 寂静山谷', difficulty: 81, boosts: [{ type: '数学', amount: 18 }, { type: '动态规划', amount: 6 }] },
  { name: '[IOI] Clockwork City', difficulty: 107, boosts: [{ type: '数据结构', amount: 24 }, { type: '动态规划', amount: 9 }] },
  { name: '[CF] Pebble Game', difficulty: 8, boosts: [{ type: '数学', amount: 2 }] },
  { name: '[JOI] 夢のつづき', difficulty: 75, boosts: [{ type: '图论', amount: 17 }] },
  { name: '[AtCoder] Forgotten Mirror', difficulty: 49, boosts: [{ type: '数据结构', amount: 12 }] },
  { name: '[USACO] Windmill Fields', difficulty: 65, boosts: [{ type: '数学', amount: 15 }, { type: '动态规划', amount: 5 }] },
  { name: '[POJ] Starry Canvas', difficulty: 54, boosts: [{ type: '字符串', amount: 13 }, { type: '数据结构', amount: 4 }] },
  { name: '[NOI] 雾锁古城', difficulty: 128, boosts: [{ type: '图论', amount: 29 }, { type: '数据结构', amount: 12 }, { type: '动态规划', amount: 10 }] },
  { name: '[IOI] Serpent\'s Coil', difficulty: 103, boosts: [{ type: '动态规划', amount: 23 }, { type: '数学', amount: 8 }] },
  { name: '[CF] Forest Labyrinth', difficulty: 12, boosts: [{ type: '数学', amount: 3 }] },
  { name: '[JOI] 遠いひかり', difficulty: 83, boosts: [{ type: '图论', amount: 18 }, { type: '数据结构', amount: 7 }] },
  { name: '[AtCoder] Sunstone Ring', difficulty: 42, boosts: [{ type: '数学', amount: 10 }] },
  { name: '[USACO] Iron Bridge', difficulty: 92, boosts: [{ type: '数据结构', amount: 20 }, { type: '字符串', amount: 7 }] },
  { name: '[POJ] Golden Ratio', difficulty: 48, boosts: [{ type: '动态规划', amount: 12 }, { type: '数据结构', amount: 4 }] },
  { name: '[NOI] 浮生若梦', difficulty: 119, boosts: [{ type: '图论', amount: 27 }, { type: '动态规划', amount: 10 }] },
  { name: '[IOI] Cascade Falls', difficulty: 109, boosts: [{ type: '字符串', amount: 24 }, { type: '数据结构', amount: 9 }] },
  { name: '[CF] Canyon Road', difficulty: 18, boosts: [{ type: '数据结构', amount: 5 }] },
  { name: '[AtCoder] Crystal Bay', difficulty: 38, boosts: [{ type: '数学', amount: 9 }] },
  { name: '[USACO] Willow Branch', difficulty: 57, boosts: [{ type: '数学', amount: 14 }] },
  { name: "[POJ] Wind's Passage", difficulty: 36, boosts: [{ type: '动态规划', amount: 9 }] },
  { name: '[NOI] 飞鸟之境', difficulty: 122, boosts: [{ type: '图论', amount: 27 }, { type: '数学', amount: 11 }] },
  { name: '[IOI] The Alchemist', difficulty: 111, boosts: [{ type: '动态规划', amount: 24 }, { type: '数据结构', amount: 10 }] },
  { name: '[CF] Marble Garden', difficulty: 27, boosts: [{ type: '图论', amount: 7 }] },
  { name: '[JOI] 風のうた', difficulty: 94, boosts: [{ type: '图论', amount: 20 }, { type: '数据结构', amount: 8 }] },
  { name: '[AtCoder] Phantom Ship', difficulty: 56, boosts: [{ type: '数学', amount: 14 }] },
  { name: '[USACO] Stone Compass', difficulty: 69, boosts: [{ type: '图论', amount: 16 }] },
  { name: '[POJ] Hidden Village', difficulty: 80, boosts: [{ type: '动态规划', amount: 19 }, { type: '数学', amount: 6 }] },
  { name: '[NOI] 青石板路', difficulty: 104, boosts: [{ type: '字符串', amount: 23 }, { type: '数据结构', amount: 9 }] },
  { name: '[IOI] Astral Projection', difficulty: 117, boosts: [{ type: '数学', amount: 27 }, { type: '数据结构', amount: 11 }] },
  { name: '[CF] Cloud Ascent', difficulty: 20, boosts: [{ type: '数学', amount: 5 }] },
  { name: '[JOI] 青いそら', difficulty: 43, boosts: [{ type: '字符串', amount: 10 }] },
  { name: '[AtCoder] Solar Flare', difficulty: 33, boosts: [{ type: '图论', amount: 8 }] },
  { name: '[USACO] Ancient Scroll', difficulty: 71, boosts: [{ type: '动态规划', amount: 16 }, { type: '数据结构', amount: 5 }] },
  { name: '[POJ] Grand Canyon', difficulty: 67, boosts: [{ type: '图论', amount: 15 }] },
  { name: '[NOI] 远古回音', difficulty: 126, boosts: [{ type: '数学', amount: 29 }, { type: '动态规划', amount: 11 }, { type: '数据结构', amount: 10 }] },
  { name: '[IOI] Time Weaver', difficulty: 101, boosts: [{ type: '数据结构', amount: 22 }, { type: '数学', amount: 8 }] },
  { name: '[CF] Silent Fountain', difficulty: 10, boosts: [{ type: '数学', amount: 3 }] },
  { name: '[AtCoder] Golden Age', difficulty: 44, boosts: [{ type: '数据结构', amount: 11 }] },
  { name: '[USACO] Lost Constellation', difficulty: 52, boosts: [{ type: '图论', amount: 13 }] },
  { name: '[POJ] Secret Garden', difficulty: 61, boosts: [{ type: '字符串', amount: 14 }, { type: '动态规划', amount: 5 }] },
  { name: '[NOI] 晨曦微露', difficulty: 86, boosts: [{ type: '动态规划', amount: 20 }, { type: '数学', amount: 7 }] },
  { name: '[IOI] Deep Sea Current', difficulty: 121, boosts: [{ type: '图论', amount: 27 }, { type: '数学', amount: 11 }] },
  { name: '[CF] Crystal Lake', difficulty: 76, boosts: [{ type: '数据结构', amount: 17 }, { type: '图论', amount: 6 }] },
  { name: '[JOI] 森のめいろ', difficulty: 93, boosts: [{ type: '图论', amount: 20 }, { type: '动态规划', amount: 8 }] },
  { name: "[AtCoder] Winter's Edge", difficulty: 58, boosts: [{ type: '数学', amount: 14 }] },
  { name: '[USACO] Nexus Point', difficulty: 87, boosts: [{ type: '字符串', amount: 19 }] },
  { name: '[POJ] Copper Wire', difficulty: 57, boosts: [{ type: '动态规划', amount: 13 }, { type: '图论', amount: 4 }] },
  { name: '[NOI] 幽兰香径', difficulty: 114, boosts: [{ type: '数据结构', amount: 26 }, { type: '数学', amount: 9 }] },
  { name: '[IOI] Frozen Star', difficulty: 106, boosts: [{ type: '动态规划', amount: 23 }, { type: '数学', amount: 9 }] },
  { name: '[CF] Sunken Road', difficulty: 29, boosts: [{ type: '数学', amount: 7 }] },
  { name: '[AtCoder] Shadow Harbor', difficulty: 90, boosts: [{ type: '图论', amount: 20 }, { type: '数学', amount: 7 }] },
  { name: '[USACO] Trade Winds', difficulty: 63, boosts: [{ type: '数据结构', amount: 15 }] },
  { name: '[POJ] Ancient Relic', difficulty: 70, boosts: [{ type: '数学', amount: 16 }] },
  { name: '[NOI] 落日余晖', difficulty: 99, boosts: [{ type: '字符串', amount: 22 }, { type: '数据结构', amount: 8 }] },
  { name: '[IOI] Whispering Gate', difficulty: 96, boosts: [{ type: '动态规划', amount: 21 }, { type: '图论', amount: 8 }] },
  { name: '[CF] Stone Tablet', difficulty: 69, boosts: [{ type: '数据结构', amount: 16 }] },
  { name: '[JOI] 星のかけら', difficulty: 78, boosts: [{ type: '图论', amount: 17 }, { type: '动态规划', amount: 6 }] },
  { name: '[AtCoder] Forgotten Code', difficulty: 89, boosts: [{ type: '数学', amount: 20 }] },
  { name: '[USACO] Emerald City', difficulty: 85, boosts: [{ type: '动态规划', amount: 20 }, { type: '数学', amount: 7 }] },
  { name: '[POJ] Sky Bridge', difficulty: 55, boosts: [{ type: '字符串', amount: 13 }] },
  { name: '[NOI] 星辰大海', difficulty: 124, boosts: [{ type: '图论', amount: 28 }, { type: '数学', amount: 12 }] },
  { name: '[IOI] Secret Chamber', difficulty: 118, boosts: [{ type: '字符串', amount: 26 }, { type: '数据结构', amount: 11 }] },
  { name: '[CF] Azure Dream', difficulty: 16, boosts: [{ type: '数学', amount: 4 }] },
  { name: '[JOI] 秘密のいけ', difficulty: 72, boosts: [{ type: '数据结构', amount: 17 }] },
  { name: '[AtCoder] Iron Gate', difficulty: 64, boosts: [{ type: '数学', amount: 15 }] },
  { name: '[USACO] Lost Horizon', difficulty: 47, boosts: [{ type: '动态规划', amount: 11 }, { type: '字符串', amount: 4 }] },
  { name: '[POJ] Nexus of Worlds', difficulty: 68, boosts: [{ type: '图论', amount: 16 }] },
  { name: '[NOI] 琉璃之森', difficulty: 129, boosts: [{ type: '数学', amount: 30 }, { type: '数据结构', amount: 12 }, { type: '图论', amount: 10 }] },
  { name: '[IOI] Quantum Leap', difficulty: 113, boosts: [{ type: '动态规划', amount: 25 }, { type: '数学', amount: 10 }] },
  { name: '[CF] Winding Path', difficulty: 5, boosts: [{ type: '数学', amount: 2 }] },
  { name: '[AtCoder] Eternal Snow', difficulty: 82, boosts: [{ type: '图论', amount: 18 }, { type: '数学', amount: 7 }] },
  { name: '[USACO] Crimson Tide', difficulty: 59, boosts: [{ type: '数据结构', amount: 14 }] },
  { name: '[POJ] Shifting Sands', difficulty: 79, boosts: [{ type: '字符串', amount: 18 }] },
  { name: '[NOI] 迷失航线', difficulty: 108, boosts: [{ type: '数学', amount: 24 }, { type: '动态规划', amount: 9 }] },
  { name: '[IOI] The Navigator', difficulty: 123, boosts: [{ type: '图论', amount: 28 }, { type: '数据结构', amount: 11 }, { type: '动态规划', amount: 9 }] },
  { name: '[CF] Arcane Code', difficulty: 37, boosts: [{ type: '数学', amount: 9 }] },
  { name: '[JOI] 時のながれ', difficulty: 49, boosts: [{ type: '字符串', amount: 12 }, { type: '数据结构', amount: 4 }] },
  { name: '[AtCoder] Golden Locket', difficulty: 84, boosts: [{ type: '图论', amount: 19 }] },
  { name: '[USACO] Cloud Watcher', difficulty: 73, boosts: [{ type: '动态规划', amount: 17 }, { type: '数据结构', amount: 6 }] },
  { name: '[POJ] Desert Mirage', difficulty: 66, boosts: [{ type: '字符串', amount: 15 }] },
  { name: '[NOI] 时空碎片', difficulty: 112, boosts: [{ type: '图论', amount: 25 }, { type: '动态规划', amount: 10 }] },
  { name: '[IOI] Hidden Sanctuary', difficulty: 102, boosts: [{ type: '图论', amount: 23 }, { type: '动态规划', amount: 8 }] },
  { name: '[CF] Green Canopy', difficulty: 39, boosts: [{ type: '动态规划', amount: 9 }, { type: '图论', amount: 3 }] },
  { name: '[AtCoder] Horizon Gate', difficulty: 53, boosts: [{ type: '数学', amount: 13 }] },
  { name: '[USACO] Grand Divide', difficulty: 91, boosts: [{ type: '动态规划', amount: 21 }, { type: '数学', amount: 7 }] },
  { name: '[POJ] The Cartographer', difficulty: 83, boosts: [{ type: '字符串', amount: 19 }, { type: '数据结构', amount: 7 }] },
  { name: '[NOI] 尘封记忆', difficulty: 116, boosts: [{ type: '动态规划', amount: 26 }, { type: '数据结构', amount: 11 }] },
  { name: '[IOI] Silent Oath', difficulty: 127, boosts: [{ type: '图论', amount: 29 }, { type: '数学', amount: 12 }, { type: '动态规划', amount: 9 }] },
  { name: '[CF] Starlight Path', difficulty: 3, boosts: [{ type: '数学', amount: 1 }] },
  { name: '[JOI] 海のゆりかご', difficulty: 89, boosts: [{ type: '数据结构', amount: 20 }, { type: '数学', amount: 7 }] },
  { name: '[AtCoder] Shifting Tides', difficulty: 75, boosts: [{ type: '数学', amount: 17 }] },
  { name: '[USACO] Fading Light', difficulty: 51, boosts: [{ type: '动态规划', amount: 12 }, { type: '字符串', amount: 4 }] },
  { name: '[POJ] Mystic Key', difficulty: 77, boosts: [{ type: '图论', amount: 17 }] },
  { name: '[NOI] 绝壁天梯', difficulty: 97, boosts: [{ type: '图论', amount: 21 }, { type: '动态规划', amount: 8 }] },
  { name: '[IOI] Frozen River', difficulty: 100, boosts: [{ type: '数学', amount: 22 }, { type: '数据结构', amount: 8 }] },
  { name: '[CF] Whispering Woods', difficulty: 24, boosts: [{ type: '动态规划', amount: 6 }] },
  { name: '[JOI] 雨のしずく', difficulty: 41, boosts: [{ type: '图论', amount: 10 }] },
  { name: '[AtCoder] Lost Kingdom', difficulty: 45, boosts: [{ type: '动态规划', amount: 11 }, { type: '数学', amount: 4 }] },
  { name: '[USACO] Endless Field', difficulty: 66, boosts: [{ type: '数据结构', amount: 15 }, { type: '图论', amount: 5 }] },
  { name: '[POJ] Shadow Weave', difficulty: 94, boosts: [{ type: '字符串', amount: 21 }, { type: '数据结构', amount: 8 }] },
  { name: '[NOI] 镜中花影', difficulty: 105, boosts: [{ type: '数学', amount: 23 }, { type: '动态规划', amount: 9 }] },
  { name: '[IOI] Gilded Cage', difficulty: 120, boosts: [{ type: '图论', amount: 27 }, { type: '数据结构', amount: 11 }] },
  { name: '[CF] Twin Peaks', difficulty: 34, boosts: [{ type: '数学', amount: 8 }] },
  { name: "[AtCoder] Serpent's Tail", difficulty: 86, boosts: [{ type: '数据结构', amount: 19 }, { type: '动态规划', amount: 7 }] },
  { name: '[USACO] Iron Labyrinth', difficulty: 50, boosts: [{ type: '图论', amount: 12 }] },
  { name: '[POJ] Cloud Atlas', difficulty: 88, boosts: [{ type: '动态规划', amount: 20 }, { type: '数学', amount: 7 }] },
  { name: '[NOI] 夜的低语', difficulty: 67, boosts: [{ type: '字符串', amount: 15 }] },
  { name: '[IOI] Celestial Map', difficulty: 117, boosts: [{ type: '数学', amount: 26 }, { type: '数据结构', amount: 11 }] },
  { name: '[CF] Ember Glow', difficulty: 40, boosts: [{ type: '数学', amount: 10 }] },
  { name: '[JOI] 虹のアーチ', difficulty: 65, boosts: [{ type: '图论', amount: 15 }, { type: '数据结构', amount: 5 }] },
  { name: '[AtCoder] Eternal Flame', difficulty: 71, boosts: [{ type: '数学', amount: 16 }] },
  { name: '[USACO] Silver Stream', difficulty: 54, boosts: [{ type: '字符串', amount: 13 }] },
  { name: '[POJ] Lost City', difficulty: 48, boosts: [{ type: '图论', amount: 12 }] },
  { name: '[NOI] 天空之城', difficulty: 115, boosts: [{ type: '图论', amount: 26 }, { type: '数学', amount: 10 }] },
  { name: '[IOI] Hidden Compass', difficulty: 99, boosts: [{ type: '字符串', amount: 22 }, { type: '数据结构', amount: 8 }] },
  { name: '[CF] Silent Bell', difficulty: 28, boosts: [{ type: '动态规划', amount: 7 }] },
  { name: '[AtCoder] River Delta', difficulty: 90, boosts: [{ type: '动态规划', amount: 20 }, { type: '图论', amount: 7 }] },
  { name: '[USACO] Star Chart', difficulty: 84, boosts: [{ type: '数据结构', amount: 19 }, { type: '图论', amount: 7 }] },
  { name: '[POJ] Crystal Sphere', difficulty: 52, boosts: [{ type: '数学', amount: 13 }] },
  { name: '[NOI] 潮汐之歌', difficulty: 107, boosts: [{ type: '动态规划', amount: 24 }, { type: '数据结构', amount: 9 }] },
  { name: '[IOI] Iron Citadel', difficulty: 119, boosts: [{ type: '字符串', amount: 26 }, { type: '数据结构', amount: 11 }] },
  { name: '[CF] Willow Weep', difficulty: 7, boosts: [{ type: '数学', amount: 2 }] },
  { name: '[JOI] 夏の思い出', difficulty: 62, boosts: [{ type: '数据结构', amount: 15 }] },
  { name: '[AtCoder] Golden Ratio', difficulty: 46, boosts: [{ type: '数学', amount: 11 }] },
  { name: '[USACO] Twilight Garden', difficulty: 78, boosts: [{ type: '动态规划', amount: 18 }, { type: '数据结构', amount: 6 }] },
  { name: '[POJ] Cloud Fortress', difficulty: 76, boosts: [{ type: '图论', amount: 17 }] },
  { name: '[NOI] 永恒之光', difficulty: 111, boosts: [{ type: '动态规划', amount: 25 }, { type: '数学', amount: 10 }] },
  { name: '[IOI] Echoing Plain', difficulty: 114, boosts: [{ type: '字符串', amount: 25 }, { type: '数据结构', amount: 10 }] },
  { name: '[CF] Distant Shore', difficulty: 22, boosts: [{ type: '数学', amount: 6 }] },
  { name: '[JOI] 月のさか道', difficulty: 80, boosts: [{ type: '图论', amount: 18 }, { type: '动态规划', amount: 6 }] },
  { name: '[AtCoder] Secret Harbor', difficulty: 35, boosts: [{ type: '动态规划', amount: 9 }] },
  { name: '[USACO] Grand Labyrinth', difficulty: 109, boosts: [{ type: '数据结构', amount: 24 }, { type: '图论', amount: 9 }] },
  { name: '[POJ] Shadow Peak', difficulty: 64, boosts: [{ type: '字符串', amount: 15 }, { type: '数学', amount: 4 }] },
  { name: '[NOI] 命运交织', difficulty: 125, boosts: [{ type: '图论', amount: 28 }, { type: '动态规划', amount: 12 }, { type: '数学', amount: 10 }] },
  { name: '[IOI] Frozen Citadel', difficulty: 128, boosts: [{ type: '数学', amount: 29 }, { type: '数据结构', amount: 12 }, { type: '图论', amount: 10 }] },
  { name: '[CF] Endless Ocean', difficulty: 14, boosts: [{ type: '图论', amount: 4 }] },
  { name: '[JOI] 小さなせかい', difficulty: 58, boosts: [{ type: '数据结构', amount: 14 }] },
  { name: '[AtCoder] Clock Tower', difficulty: 60, boosts: [{ type: '动态规划', amount: 14 }, { type: '数学', amount: 4 }] },
  { name: '[USACO] Mystic Well', difficulty: 74, boosts: [{ type: '动态规划', amount: 17 }, { type: '图论', amount: 6 }] },
  { name: '[POJ] Woven Dreams', difficulty: 81, boosts: [{ type: '图论', amount: 18 }, { type: '动态规划', amount: 6 }] },
  { name: '[NOI] 边界迷雾', difficulty: 110, boosts: [{ type: '动态规划', amount: 25 }, { type: '数学', amount: 10 }] },
  { name: '[IOI] Cosmic Dust', difficulty: 122, boosts: [{ type: '数学', amount: 28 }, { type: '数据结构', amount: 11 }] },
  { name: '[CF] Green Valley', difficulty: 1, boosts: [{ type: '数学', amount: 1 }] },
  { name: '[AtCoder] The Cartel', difficulty: 87, boosts: [{ type: '图论', amount: 19 }, { type: '数据结构', amount: 7 }] },
  { name: '[USACO] Lost Path', difficulty: 95, boosts: [{ type: '字符串', amount: 21 }, { type: '数据结构', amount: 8 }] },
  { name: '[POJ] Time Warp', difficulty: 106, boosts: [{ type: '图论', amount: 24 }, { type: '动态规划', amount: 9 }] },
  { name: '[NOI] 星河漫游', difficulty: 126, boosts: [{ type: '图论', amount: 29 }, { type: '数据结构', amount: 12 }, { type: '动态规划', amount: 10 }] },
  { name: '[IOI] The Oracle', difficulty: 116, boosts: [{ type: '字符串', amount: 25 }, { type: '数据结构', amount: 11 }] },
  { name: '[CF] Silent Whisper', difficulty: 19, boosts: [{ type: '数学', amount: 5 }] },
  { name: '[JOI] 天の川', difficulty: 53, boosts: [{ type: '数据结构', amount: 13 }] },
  { name: '[AtCoder] The Nexus', difficulty: 70, boosts: [{ type: '数学', amount: 16 }] },
  { name: '[USACO] Hidden Chamber', difficulty: 61, boosts: [{ type: '动态规划', amount: 14 }, { type: '字符串', amount: 5 }] },
  { name: '[POJ] Ancient Ruins', difficulty: 85, boosts: [{ type: '图论', amount: 19 }, { type: '动态规划', amount: 7 }] },
  { name: '[NOI] 梦境回廊', difficulty: 118, boosts: [{ type: '数据结构', amount: 26 }, { type: '字符串', amount: 11 }] },
  { name: '[IOI] Parallel Worlds', difficulty: 103, boosts: [{ type: '数学', amount: 23 }, { type: '动态规划', amount: 9 }] },
  { name: '[CF] Golden Compass', difficulty: 43, boosts: [{ type: '动态规划', amount: 10 }, { type: '图论', amount: 4 }] },
  { name: '[AtCoder] Sunken Ship', difficulty: 68, boosts: [{ type: '数学', amount: 16 }] },
  { name: '[USACO] Void Tower', difficulty: 72, boosts: [{ type: '数学', amount: 17 }] },
  { name: '[POJ] The Lighthouse', difficulty: 56, boosts: [{ type: '动态规划', amount: 13 }, { type: '数据结构', amount: 4 }] },
  { name: '[NOI] 无尽沙海', difficulty: 98, boosts: [{ type: '图论', amount: 22 }, { type: '动态规划', amount: 8 }] },
  { name: '[IOI] Celestial Song', difficulty: 124, boosts: [{ type: '数学', amount: 28 }, { type: '动态规划', amount: 12 }] },
  { name: '[CF] Moonlit Path', difficulty: 11, boosts: [{ type: '数学', amount: 3 }] },
  { name: '[JOI] みずうみ', difficulty: 82, boosts: [{ type: '图论', amount: 18 }, { type: '数据结构', amount: 7 }] },
  { name: '[AtCoder] The Catalyst', difficulty: 93, boosts: [{ type: '数据结构', amount: 21 }, { type: '动态规划', amount: 8 }] },
  { name: '[USACO] Lost Amulet', difficulty: 88, boosts: [{ type: '动态规划', amount: 20 }, { type: '图论', amount: 7 }] },
  { name: '[POJ] Shadow Bloom', difficulty: 100, boosts: [{ type: '图论', amount: 22 }, { type: '数学', amount: 8 }] },
  { name: '[NOI] 千年之约', difficulty: 129, boosts: [{ type: '数学', amount: 30 }, { type: '动态规划', amount: 12 }, { type: '数据结构', amount: 10 }] },
  { name: '[IOI] Temporal Rift', difficulty: 115, boosts: [{ type: '图论', amount: 25 }, { type: '数据结构', amount: 10 }] },
  { name: '[CF] Iron Will', difficulty: 32, boosts: [{ type: '数学', amount: 8 }] },
  { name: '[JOI] ゆうやけ', difficulty: 91, boosts: [{ type: '字符串', amount: 20 }, { type: '数据结构', amount: 7 }] },
  { name: '[AtCoder] The Guardian', difficulty: 76, boosts: [{ type: '图论', amount: 17 }, { type: '动态规划', amount: 6 }] },
  { name: '[USACO] Aurora Borealis', difficulty: 105, boosts: [{ type: '图论', amount: 23 }, { type: '动态规划', amount: 9 }] },
  { name: '[POJ] Sky Labyrinth', difficulty: 117, boosts: [{ type: '数学', amount: 26 }, { type: '数据结构', amount: 11 }] },
  { name: '[NOI] 星座之谜', difficulty: 123, boosts: [{ type: '动态规划', amount: 28 }, { type: '数学', amount: 11 }] },
  { name: '[IOI] The Sentinel', difficulty: 126, boosts: [{ type: '动态规划', amount: 29 }, { type: '数学', amount: 12 }, { type: '数据结构', amount: 10 }] },
  { name: '[CF] Ocean Current', difficulty: 6, boosts: [{ type: '数学', amount: 2 }] },
  { name: '[JOI] ともだち', difficulty: 96, boosts: [{ type: '数据结构', amount: 21 }, { type: '数学', amount: 8 }] },
  { name: '[AtCoder] Firefly Field', difficulty: 81, boosts: [{ type: '图论', amount: 18 }, { type: '数学', amount: 7 }] },
  { name: '[USACO] Ancient Scroll II', difficulty: 113, boosts: [{ type: '字符串', amount: 25 }, { type: '数据结构', amount: 10 }] },
  { name: '[POJ] Whispering Citadel II', difficulty: 121, boosts: [{ type: '图论', amount: 27 }, { type: '数据结构', amount: 11 }, { type: '动态规划', amount: 9 }] },
  { name: '[NOI] 矩形 ', difficulty: 110, boosts: [{ type: '字符串', amount: 25 }, { type: '数据结构', amount: 10 }] },
  { name: '[IOI] Complex Labyrinth', difficulty: 127, boosts: [{ type: '动态规划', amount: 30 }, { type: '图论', amount: 12 }, { type: '数学', amount: 10 }] },
  { name: "[CF] Shadow's Veil", difficulty: 30, boosts: [{ type: '图论', amount: 7 }] },
  { name: '[JOI] こもれび', difficulty: 74, boosts: [{ type: '数据结构', amount: 17 }, { type: '动态规划', amount: 6 }] },
  { name: '[AtCoder] Golden Ratio II', difficulty: 92, boosts: [{ type: '图论', amount: 20 }, { type: '数学', amount: 8 }] },
  { name: '[USACO] Obsidian Peak II', difficulty: 99, boosts: [{ type: '动态规划', amount: 22 }, { type: '数学', amount: 8 }] },
  { name: '[POJ] Temporal Gate', difficulty: 120, boosts: [{ type: '数学', amount: 27 }, { type: '数据结构', amount: 11 }] },
  { name: '[NOI] 高级打字机', difficulty: 114, boosts: [{ type: '数学', amount: 26 }, { type: '动态规划', amount: 10 }] },
  { name: '[IOI] Starfall Echo II', difficulty: 118, boosts: [{ type: '图论', amount: 26 }, { type: '数据结构', amount: 11 }, { type: '动态规划', amount: 9 }] },
  { name: '[CF] Crystal Path', difficulty: 25, boosts: [{ type: '数学', amount: 7 }] },
  { name: '[JOI] ゆめ', difficulty: 70, boosts: [{ type: '图论', amount: 16 }, { type: '动态规划', amount: 5 }] },
  { name: '[AtCoder] Crimson Trail II', difficulty: 54, boosts: [{ type: '数学', amount: 13 }] },
  { name: '[USACO] Willow Branch II', difficulty: 94, boosts: [{ type: '动态规划', amount: 21 }, { type: '数学', amount: 8 }] },
  { name: "[POJ] Wind's Passage II", difficulty: 86, boosts: [{ type: '字符串', amount: 19 }, { type: '数据结构', amount: 7 }] },
  { name: '[NOI] 公约数的和', difficulty: 128, boosts: [{ type: '图论', amount: 29 }, { type: '数据结构', amount: 12 }, { type: '动态规划', amount: 10 }] },
  { name: '[IOI] Void Walker II', difficulty: 108, boosts: [{ type: '数学', amount: 24 }, { type: '数据结构', amount: 9 }] },
  { name: '[CF] Bluebell Grove II', difficulty: 9, boosts: [{ type: '数学', amount: 2 }] },
  { name: '[JOI] ほし', difficulty: 60, boosts: [{ type: '数据结构', amount: 14 }, { type: '动态规划', amount: 4 }] },
  { name: '[AtCoder] Mountain Whisper II', difficulty: 80, boosts: [{ type: '动态规划', amount: 18 }, { type: '数学', amount: 6 }] },
  { name: '[USACO] Iron Bridge II', difficulty: 83, boosts: [{ type: '动态规划', amount: 19 }, { type: '图论', amount: 7 }] },
  { name: '[POJ] Ancient Cipher II', difficulty: 91, boosts: [{ type: '图论', amount: 20 }, { type: '动态规划', amount: 7 }] },
  { name: '[NOI] 山上的国度', difficulty: 119, boosts: [{ type: '动态规划', amount: 27 }, { type: '数学', amount: 11 }] },
  { name: '[IOI] Frozen Citadel II', difficulty: 130, boosts: [{ type: '数学', amount: 30 }, { type: '数据结构', amount: 13 }, { type: '图论', amount: 10 }] },
  { name: '[CF] Emerald Stream II', difficulty: 36, boosts: [{ type: '图论', amount: 9 }] },
  { name: '[JOI] ふゆ', difficulty: 79, boosts: [{ type: '数据结构', amount: 18 }, { type: '动态规划', amount: 7 }] },
  { name: '[AtCoder] Sunstone Ring II', difficulty: 95, boosts: [{ type: '图论', amount: 21 }, { type: '数学', amount: 8 }] },
  { name: '[USACO] Frontier Gate II', difficulty: 102, boosts: [{ type: '动态规划', amount: 23 }, { type: '数学', amount: 9 }] },
  { name: '[POJ] River of Memory II', difficulty: 124, boosts: [{ type: '数学', amount: 28 }, { type: '数据结构', amount: 12 }] },
  { name: '[NOI] 命运交织 II', difficulty: 118, boosts: [{ type: '数学', amount: 26 }, { type: '动态规划', amount: 11 }] },
  { name: '[IOI] Temporal Rift II', difficulty: 122, boosts: [{ type: '图论', amount: 27 }, { type: '数据结构', amount: 11 }, { type: '动态规划', amount: 9 }] },
  { name: '[CF] Lunar Veil II', difficulty: 29, boosts: [{ type: '数学', amount: 7 }] },
  { name: '[JOI] はる', difficulty: 85, boosts: [{ type: '图论', amount: 19 }, { type: '动态规划', amount: 7 }] },
  { name: '[AtCoder] Crystal Bay II', difficulty: 61, boosts: [{ type: '数学', amount: 14 }] },
  { name: '[USACO] Willow Branch III', difficulty: 97, boosts: [{ type: '动态规划', amount: 22 }, { type: '数学', amount: 8 }] },
  { name: '[POJ] Ancient Cipher III', difficulty: 90, boosts: [{ type: '字符串', amount: 20 }, { type: '数据结构', amount: 7 }] },
  { name: '[NOI] 尘封记忆 II', difficulty: 130, boosts: [{ type: '图论', amount: 30 }, { type: '数据结构', amount: 13 }, { type: '动态规划', amount: 10 }] },
  { name: '[IOI] Parallel Worlds II', difficulty: 112, boosts: [{ type: '数学', amount: 25 }, { type: '数据结构', amount: 10 }] },
  { name: '[CF] happiness', difficulty: 13, boosts: [{ type: '数学', amount: 3 }] },
  { name: '[JOI] なつ', difficulty: 64, boosts: [{ type: '数据结构', amount: 15 }, { type: '动态规划', amount: 5 }] },
  { name: '[AtCoder] Shadow Harbor II', difficulty: 84, boosts: [{ type: '动态规划', amount: 19 }, { type: '数学', amount: 7 }] },
  { name: '[USACO] Iron Bridge III', difficulty: 87, boosts: [{ type: '动态规划', amount: 20 }, { type: '图论', amount: 7 }] },
  { name: '[POJ] River of Memory III', difficulty: 93, boosts: [{ type: '图论', amount: 21 }, { type: '动态规划', amount: 8 }] },
  { name: '[NOI] 种树', difficulty: 121, boosts: [{ type: '动态规划', amount: 27 }, { type: '数学', amount: 11 }] },
  { name: '[IOI] The Sentinel II', difficulty: 129, boosts: [{ type: '数学', amount: 30 }, { type: '数据结构', amount: 12 }, { type: '图论', amount: 10 }] },
  { name: '[CF] Forest Labyrinth II', difficulty: 38, boosts: [{ type: '图论', amount: 9 }] },
  { name: '[JOI] あき', difficulty: 81, boosts: [{ type: '数据结构', amount: 18 }, { type: '动态规划', amount: 7 }] },
  { name: '[AtCoder] Horizon Gate II', difficulty: 97, boosts: [{ type: '图论', amount: 21 }, { type: '数学', amount: 8 }] },
  { name: '[USACO] Teleportation B', difficulty: 104, boosts: [{ type: '动态规划', amount: 23 }, { type: '数学', amount: 9 }] },
  { name: '[POJ] Lost Fragment II', difficulty: 126, boosts: [{ type: '数学', amount: 29 }, { type: '数据结构', amount: 12 }] },
  { name: '[NOI] 租用游艇', difficulty: 120, boosts: [{ type: '数学', amount: 27 }, { type: '动态规划', amount: 11 }] },
  { name: '[IOI] Temporal Rift III', difficulty: 124, boosts: [{ type: '图论', amount: 28 }, { type: '数据结构', amount: 12 }, { type: '动态规划', amount: 9 }] },
  { name: '[CF] Bluebell Grove III', difficulty: 31, boosts: [{ type: '数学', amount: 8 }] },
  { name: '[JOI] かぜ', difficulty: 88, boosts: [{ type: '图论', amount: 20 }, { type: '动态规划', amount: 7 }] },
  { name: '[AtCoder] Sunken Ship II', difficulty: 63, boosts: [{ type: '数学', amount: 15 }] },
  { name: '[USACO] Fair Shuttle G', difficulty: 99, boosts: [{ type: '动态规划', amount: 22 }, { type: '数学', amount: 8 }] },
  { name: '[POJ] Obstacle Course', difficulty: 92, boosts: [{ type: '字符串', amount: 20 }, { type: '数据结构', amount: 7 }] },
  { name: '[NOI] 庆典', difficulty: 130, boosts: [{ type: '图论', amount: 30 }, { type: '数据结构', amount: 13 }, { type: '动态规划', amount: 10 }] }
];

/**
 * 从题目池中随机抽取n道题目
 * @param {number} count - 要抽取的题目数量
 * @returns {Array} 抽取的题目数组
 */
function selectRandomTasks(count = 5) {
  // 按年-周持久化：避免刷新或重开页面后本周抽题变化
  try{
    if(typeof window !== 'undefined' && window.localStorage){
      // 计算 year-week 标识：优先使用 game.week（周数），并使用当前年份
      const wk = (typeof window.currWeek === 'function') ? window.currWeek() : (window.game && window.game.week) || 0;
      const now = new Date();
      const year = now.getFullYear();
      const weekKey = `${year}-W${String(wk).padStart(2,'0')}`;
      const storageKey = `weekly_tasks::${weekKey}::${count}`;
      const raw = window.localStorage.getItem(storageKey);
      if(raw){
        try{
          const names = JSON.parse(raw);
          if(Array.isArray(names) && names.length > 0){
            // 将存储的题目名称映射回 TASK_POOL 中的对象（保留原对象引用）
            const mapped = names.map(n => TASK_POOL.find(t => t.name === n)).filter(x => !!x);
            if(mapped.length >= Math.min(count, names.length)){
              return mapped.slice(0, count);
            }
          }
        }catch(e){ /* ignore parse errors and fallthrough to reselection */ }
      }
      // 如果没有命中持久化抽题，继续执行抽题逻辑，并在之后保存（保存名称数组）
    }
  }catch(e){ /* ignore storage issues */ }
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
  const final = shuffleArray(selected).slice(0, count);

  // 尝试保存到 localStorage（按年-周键）以便本周重用同一组选题
  try{
    if(typeof window !== 'undefined' && window.localStorage){
      const wk = (typeof window.currWeek === 'function') ? window.currWeek() : (window.game && window.game.week) || 0;
      const now = new Date();
      const year = now.getFullYear();
      const weekKey = `${year}-W${String(wk).padStart(2,'0')}`;
      const storageKey = `weekly_tasks::${weekKey}::${count}`;
      const names = final.map(t => t.name);
      window.localStorage.setItem(storageKey, JSON.stringify(names));
    }
  }catch(e){ /* ignore storage write errors */ }

  return final;
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
  
  // 应用全局题目难度增幅
  const difficultyMult = (typeof DIFFICULTY_MULTIPLIER !== 'undefined' ? DIFFICULTY_MULTIPLIER : 1.0);
  const effectiveDifficulty = taskDifficulty * difficultyMult;
  
  const diff = studentAbility - effectiveDifficulty;
  
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


