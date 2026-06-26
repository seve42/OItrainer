# OI Trainer 接口总结文档

## 核心类

### Student (models.js)
学生对象，包含所有学生属性和方法。

**属性：**
- `name` - 学生名字
- `thinking` - 思维能力
- `coding` - 编码能力
- `mental` - 心理素质
- `pressure` - 压力值
- `comfort` - 舒适度
- `knowledge_ds` - 数据结构知识
- `knowledge_graph` - 图论知识
- `knowledge_string` - 字符串知识
- `knowledge_math` - 数学知识
- `knowledge_dp` - 动态规划知识
- `active` - 是否在队（布尔值）
- `talents` - 天赋集合（Set）
- `sick_weeks` - 生病周数
- `burnout_weeks` - 倦怠周数
- `_talent_state` - 天赋临时状态（用于比赛中的临时加成）

**方法：**
- `getAbilityAvg()` - 获取能力平均值（思维+编码+心理）/3
- `getKnowledgeTotal()` - 获取知识点平均值
- `getComprehensiveAbility()` - 获取综合能力（能力*权重 + 知识*权重）
- `getMentalIndex()` - 获取心理指数（考虑压力、舒适度和噪声）
- `getPerformanceScore(difficulty, maxScore, knowledge_value)` - 计算比赛表现分数
- `calculateKnowledgeGain(base_gain, facility_bonus, sick_penalty)` - 计算知识增益
- `getKnowledgeByType(type)` - 根据类型获取知识点值
- `addKnowledge(type, amount)` - 增加指定类型的知识点
- `addThinking(amount)` - 增加思维能力（带衰减）
- `addCoding(amount)` - 增加编码能力（带衰减）
- `addTalent(talentName)` - 添加天赋
- `removeTalent(talentName)` - 移除天赋
- `hasTalent(talentName)` - 检查是否拥有天赋
- `triggerTalents(eventName, ctx)` - 触发天赋效果

### Facilities (models.js)
设施管理对象。

**属性：**
- `computer` - 机房等级
- `ac` - 空调等级
- `dorm` - 宿舍等级
- `library` - 资料库等级
- `canteen` - 食堂等级

**方法：**
- `getComputerEfficiency()` - 获取机房效率加成
- `getLibraryEfficiency()` - 获取资料库效率加成
- `getCanteenPressureReduction()` - 获取食堂压力降低系数
- `getDormComfortBonus()` - 获取宿舍舒适度加成
- `getUpgradeCost(fac)` - 获取设施升级费用
- `getMaxLevel(fac)` - 获取设施最大等级
- `getCurrentLevel(fac)` - 获取设施当前等级
- `upgrade(fac)` - 升级设施
- `getMaintenanceCost()` - 获取维护费用

### GameState (models.js)
游戏状态对象。

**属性：**
- `students` - 学生数组
- `facilities` - 设施对象
- `budget` - 经费
- `week` - 当前周数
- `reputation` - 声誉
- `temperature` - 温度
- `weather` - 天气
- `province_name` - 省份名称
- `province_type` - 省份类型
- `is_north` - 是否北方
- `difficulty` - 难度
- `base_comfort` - 基础舒适度
- `initial_students` - 初始学生数
- `quit_students` - 退队学生数
- `qualification` - 晋级资格（二维数组）
- `careerCompetitions` - 比赛生涯记录
- `totalExpenses` - 累计消费

**方法：**
- `getWeatherFactor()` - 获取天气影响系数
- `getComfort()` - 获取当前舒适度
- `getWeeklyCost()` - 获取每周开销
- `getDifficultyModifier()` - 获取难度修正系数
- `getNextCompetition()` - 获取下一场比赛信息
- `updateWeather()` - 更新天气
- `getFutureExpense()` - 预测未来开销
- `getExpenseMultiplier()` - 获取消费倍数
- `getWeatherDescription()` - 获取天气描述
- `recordExpense(amount, description)` - 记录消费

## 天赋系统 (talent.js)

### TalentManager
天赋管理器，负责注册、触发和管理所有天赋。

**方法：**
- `registerTalent(talentDef)` - 注册天赋
  - `talentDef` 对象包含：
    - `name` - 天赋名称
    - `description` - 天赋描述
    - `color` - 显示颜色
    - `prob` - 获得概率（0-1）
    - `beneficial` - 是否为正面天赋
    - `handler(student, eventName, ctx)` - 触发逻辑
- `clearTalents()` - 清除所有天赋
- `getRegistered()` - 获取已注册天赋名称列表
- `getTalent(name)` - 获取天赋定义
- `getTalentInfo(name)` - 获取天赋显示信息
- `handleStudentEvent(student, eventName, ctx)` - 处理学生事件（触发天赋）
- `tryAcquireTalent(student, multiplier)` - 尝试获得新天赋
- `assignTalentsToStudent(student, multiplier)` - 为学生分配天赋（初始化用）
- `assignInitialTalent(student)` - 为初始学生强制分配一个天赋
- `checkAndHandleTalentLoss(student)` - 检查并处理天赋丧失
- `registerDefaultTalents(game, utils)` - 注册默认天赋集合

**天赋触发事件名：**
- `'contest_start'` - 比赛开始
- `'problem_start'` - 开始做题
- `'problem_switch'` - 换题
- `'problem_solved'` - 解题成功
- `'thinking_phase'` - 思考阶段
- `'pressure_change'` - 压力变化
- `'sickness'` - 生病
- `'quit'` - 退队

## 事件系统 (events.js)

### EventManager
事件管理器，负责注册和触发随机事件。

**方法：**
- `register(evt)` - 注册事件
  - `evt` 对象包含：
    - `id` - 事件唯一标识
    - `name` - 事件名称
    - `description` - 事件描述
    - `check(ctx)` - 检查是否触发（返回布尔值）
    - `run(ctx)` - 执行事件（返回消息或null）
- `clear()` - 清除所有事件
- `registerDefaultEvents(ctx)` - 注册默认事件集合
  - `ctx` 包含：`game`, `PROVINCES`, `constants`, `utils`, `log`
- `checkRandomEvents(game)` - 检查并触发随机事件

**已实现的事件类型：**
- 台风（沿海省份）
- 感冒（天气/舒适度影响）
- 退队/倦怠（压力过高）
- 企业赞助
- 金牌教练来访
- 发现优质网课
- 构造题忘放checker
- 上级拨款
- 机房设备故障
- 团队内部矛盾
- 经费审计
- 食堂卫生问题
- 友校交流邀请（选择事件）
- 学生自荐（选择事件）
- 媒体采访请求（选择事件）
- 参加商业活动（选择事件）
- 跨省挖人邀请（选择事件）
- 天赋获得/丧失
- 学生日常活动（多个）

## 题目系统 (task.js)

### 题目相关函数

**主要函数：**
- `selectRandomTasks(count)` - 从题目池随机抽取题目（带智能匹配）
- `calculateBoostMultiplier(studentAbility, taskDifficulty)` - 计算做题增幅倍数
- `applyTaskBoosts(student, task)` - 应用题目对学生的知识提升

**题目对象结构：**
```javascript
{
  name: '题目名称',
  difficulty: 难度值(0-150),
  boosts: [
    { type: '知识点类型', amount: 增幅值 }
  ]
}
```

**知识点类型：**
- `'数据结构'`
- `'图论'`
- `'字符串'`
- `'数学'`
- `'动态规划'` 或 `'DP'`

## 比赛系统 (competitions.js, contest-integration.js, contest-ui.js)

### CompetitionEngine (competitions.js)
比赛模拟引擎。

**核心类：**

#### ContestSimulator
比赛模拟器。

**构造函数：**
- `new ContestSimulator(config, students, game)`

**方法：**
- `start()` - 开始模拟
- `pause()` - 暂停
- `finish()` - 结束比赛
- `onTick(callback)` - 注册tick回调
- `onLog(callback)` - 注册日志回调
- `onFinish(callback)` - 注册完成回调

**配置对象（config）：**
```javascript
{
  name: '比赛名称',
  difficulty: 难度,
  duration: 时长(分钟),
  maxScore: 总分,
  numProblems: 题目数,
  problems: [...] // 题目数组
}
```

### 比赛UI组件 (contest-ui.js)

**方法：**
- `showContestLiveModal(simulator, onFinish)` - 显示实时比赛弹窗
- `renderStudentPanels(simulator)` - 渲染学生面板
- `updateStudentPanels(students, simulator)` - 更新学生面板
- `updateContestProgress(tick, maxTicks, simulator)` - 更新比赛进度
- `addLogEntry(log)` - 添加日志条目

### 比赛集成函数 (contest-integration.js)

**主要函数：**
- `holdCompetitionModalNew(comp)` - 举办正式比赛（新引擎）
- `holdMockContestModalNew(isPurchased, difficultyConfig, questionTagsArray)` - 举办模拟赛
- `generateInternationalStudents(chineseStudents)` - 生成IOI国际选手
- `distributeContestGains(totalGainCap, problems, gainType)` - 分配比赛增幅

## 分享系统 (share.js)

### ShareManager
结算结果分享管理器。

**方法：**
- `generateShareLink()` - 生成分享链接
- `parseSharedData()` - 从URL解析分享数据
- `showShareDialog()` - 显示分享对话框
- `copyToClipboard(text)` - 复制到剪贴板

## 工具函数 (utils.js)

### 随机数生成
- `setRandomSeed(seed)` - 设置随机种子
- `getRandom()` - 获取随机数(0-1)
- `uniform(min, max)` - 均匀分布随机数
- `uniformInt(min, max)` - 均匀分布整数
- `normal(mean, stddev)` - 正态分布随机数
- `clamp(val, min, max)` - 数值限制
- `clampInt(v, min, max)` - 整数限制
- `sigmoid(x)` - sigmoid函数

### 其他工具
- `getDailyChallengeParams()` - 获取每日挑战参数
- `getLetterGrade(val)` - 获取字母等级（E-SSS）
- `getLetterGradeAbility(val)` - 获取能力字母等级
- `generateName()` - 生成随机中文名字

## 主脚本接口 (game.js, render.js)

### UI相关函数
- `renderAll()` - 渲染主界面
- `showModal(html)` - 显示模态框
- `closeModal()` - 关闭模态框
- `pushEvent(evt)` - 推送事件到事件卡片
- `renderEventCards()` - 渲染事件卡片
- `showEventModal(evt)` - 显示事件弹窗
- `showChoiceModal(evt)` - 显示选择事件弹窗

### 游戏操作函数
- `trainStudentsWithTask(task, intensity)` - 使用题目训练学生
- `outingTrainingWithSelection(difficulty_choice, province_choice, selectedNames, inspireTalents)` - 外出集训
- `holdMockContestUI()` - 模拟赛UI
- `entertainmentUI()` - 娱乐UI
- `takeVacationUI()` - 放假UI
- `upgradeFacilitiesUI()` - 升级设施UI
- `rest1Week()` - 休息一周
- `weeklyUpdate(weeks)` - 周结算
- `safeWeeklyUpdate(weeks)` - 安全周更新（避免跳过比赛）
- `checkCompetitions()` - 检查比赛

### 游戏流程函数
- `initGame(difficulty, province_choice, student_count)` - 初始化游戏
- `saveGame(silent)` - 保存游戏
- `loadGame()` - 载入游戏
- `checkRandomEvents()` - 检查随机事件
- `triggerGameEnding(reason)` - 触发游戏结局
- `checkAndTriggerEnding()` - 检查并触发结局
- `calculateFinalEnding(gameData, endingReason)` - 计算最终结局

### 比赛相关函数
- `holdCompetitionModal(comp)` - 举办正式比赛（旧版）
- `showCompetitionSummary(comp, results, pass_line, pass_count, shouldTriggerEnding, endingReason)` - 显示比赛总结
- `showNationalTeamChoice(noiResults, noiMaxScore, passLine)` - 国家集训队选择
- `enterNationalTeam(goldStudents)` - 进入国家集训队
- `calculateNationalTeamQualification()` - 计算国家集训队晋级
- `calculateIOIResults()` - 计算IOI结果

### 辅助函数
- `renderDifficultyTag(diff)` - 渲染难度标签
- `scaledPassCount(n)` - 人数缩放函数
- `__createSnapshot()` - 创建状态快照
- `__summarizeSnapshot(before, after, title, opts)` - 汇总快照差异

## 常量 (constants.js)

**游戏参数常量（部分）：**
- `SEASON_WEEKS` - 赛季周数
- `WEEKS_PER_HALF` - 半季周数
- `ABILITY_WEIGHT` - 能力权重
- `KNOWLEDGE_WEIGHT` - 知识权重
- `EXTREME_COLD_THRESHOLD` - 极冷阈值
- `EXTREME_HOT_THRESHOLD` - 极热阈值
- `TALENT_LOST_VALUE` - 天赋丧失压力阈值
- `COST_MULTIPLIER` - 消费倍数
- `DIFFICULTY_MULTIPLIER` - 难度倍数

**比赛定义：**
- `COMPETITION_ORDER` - 比赛顺序数组
- `COMPETITION_SCHEDULE` - 比赛时间表
- `competitions` - 完整比赛列表（包含两赛季）

## 调试函数 (debug.js)

- `debugzak()` - 调试：生成超强学生并跳转到第二年NOI前

---

## 使用示例

### 创建学生
```javascript
const student = new Student('张三', 60, 65, 70);
student.addTalent('冷静');
student.addKnowledge('数据结构', 10);
```

### 注册天赋
```javascript
TalentManager.registerTalent({
  name: '天赋名',
  description: '天赋描述',
  color: '#4CAF50',
  prob: 0.10,
  beneficial: true,
  handler: function(student, eventName, ctx) {
    // 天赋逻辑
  }
});
```

### 注册事件
```javascript
EventManager.register({
  id: 'event_id',
  name: '事件名',
  description: '事件描述',
  check: (ctx) => {
    // 检查是否触发
    return true;
  },
  run: (ctx) => {
    // 执行事件
    return '事件消息';
  }
});
```

### 训练学生
```javascript
const task = selectRandomTasks(1)[0];
trainStudentsWithTask(task, 'high');
```

### 保存/载入
```javascript
saveGame();
loadGame();
```
