# 知识点判定机制修复 - 数值平衡补丁

## 问题描述
原系统中，比赛/模拟赛的知识点判定过于宽松，导致学生即使在某个知识点很薄弱的情况下，仅凭高思维/代码能力就能轻松通过相关题目。这违背了知识点作为**必要条件**的设计理念。

## 修复内容

### 1. 新增知识点门槛机制 (`lib/competitions.js`)

#### 1.1 知识点需求计算
```javascript
// 知识点需求为题目难度的 35%（最低15点）
const knowledgeRequirement = Math.max(15, taskThinkingDifficulty * 0.35);
```

#### 1.2 知识点惩罚系数
当学生知识点不足时，采用**指数衰减惩罚**：
```javascript
if(knowledge < knowledgeRequirement){
  const knowledgeGap = knowledgeRequirement - knowledge;
  // 每差10点知识，通过率降低约40%
  knowledgePenalty = Math.exp(-knowledgeGap / 15.0);
  // 最低保留5%的通过可能
  knowledgePenalty = Math.max(0.05, knowledgePenalty);
}
```

**惩罚力度示例：**
- 知识差距10点：通过率降至 ~51%
- 知识差距20点：通过率降至 ~26%
- 知识差距30点：通过率降至 ~13%
- 知识差距40点：通过率降至 ~7%
- 知识差距50+点：通过率降至 5%（下限）

### 2. 降低知识点的直接加成

#### 2.1 思维判定 (attemptSubtask)
```javascript
// 修改前：thinkingBase = thinking + knowledge * 2.0
// 修改后：thinkingBase = thinking + knowledge * 0.5
// 降幅：75% (从2.0倍降至0.5倍)
```

#### 2.2 代码判定 (attemptSubtask)
```javascript
// 修改前：codingBase = coding + knowledge * 0.8
// 修改后：codingBase = coding + knowledge * 0.3
// 降幅：62.5% (从0.8倍降至0.3倍)
```

#### 2.3 选题权重 (selectProblem)
```javascript
// 修改前：baseScore = knowledge * 3 + ability - ...
// 修改后：baseScore = knowledge * 1.0 + ability - ...
// 降幅：66.7% (从3倍降至1倍)
```

#### 2.4 跳题判断 (shouldSkipProblem)
```javascript
// 修改前：effectiveAbility = ability + knowledge * 2.0
// 修改后：effectiveAbility = ability + knowledge * 0.5
// 降幅：75% (从2.0倍降至0.5倍)
```

#### 2.5 难度压制 (attemptSubtask 内部)
```javascript
// 修改前：effectiveAbility = ability + knowledge * 2.0
// 修改后：effectiveAbility = ability + knowledge * 0.5
// 降幅：75% (从2.0倍降至0.5倍)
```

### 3. 新增日志信息

现在当知识点惩罚生效时（<95%），会在日志中显示：
```
学生 尝试 T1 档位：思维通过 true (65.3%)，代码通过 false (45.2%)，知识点惩罚 38.3% (知识18.5/需求35.7)
```

## 设计理念

### 知识点的角色转变
- **修改前**：知识点是"加分项"，思维/代码足够高就能弥补知识不足
- **修改后**：知识点是"门槛"，缺乏知识会被**乘性惩罚**，无法靠能力硬补

### 机制组合效果
1. **直接加成降低**：知识点不再提供大量数值加成
2. **门槛惩罚**：知识不足时，通过率被乘以惩罚系数（0.05-1.0）
3. **双重判定**：思维和代码都需要通过，两者都受知识点惩罚影响

### 实际影响示例

假设某题思维难度80，学生思维能力70：

**场景1：知识点充足 (knowledge=40)**
- 知识需求：80 * 0.35 = 28
- 知识充足，无惩罚 (penalty=1.0)
- 思维基础：70 + 40*0.5 = 90
- 思维通过率：~85% (高)

**场景2：知识点不足 (knowledge=15)**
- 知识需求：28
- 知识差距：28-15=13
- 知识惩罚：exp(-13/15) ≈ 0.42
- 思维基础：70 + 15*0.5 = 77.5
- 思维通过率（惩罚前）：~60%
- 思维通过率（惩罚后）：60% * 0.42 ≈ **25%**

**场景3：知识点严重不足 (knowledge=5)**
- 知识需求：28
- 知识差距：28-5=23
- 知识惩罚：exp(-23/15) ≈ 0.21
- 思维基础：70 + 5*0.5 = 72.5
- 思维通过率（惩罚前）：~50%
- 思维通过率（惩罚后）：50% * 0.21 ≈ **10.5%**

## 数值调参建议

如需进一步调整知识点影响力度，可修改以下参数：

### 知识点需求比例
```javascript
// 当前：35% (0.35)
// 提高：学生需要更高的知识储备
// 降低：学生可以用更少的知识通过
const knowledgeRequirement = Math.max(15, taskThinkingDifficulty * 0.35);
```

### 惩罚衰减速率
```javascript
// 当前：15.0 (差10点降约40%)
// 提高（如20.0）：惩罚更温和
// 降低（如10.0）：惩罚更严厉
knowledgePenalty = Math.exp(-knowledgeGap / 15.0);
```

### 最低通过率
```javascript
// 当前：5% (0.05)
// 提高：给知识不足的学生更多机会
// 降低：知识不足几乎无法通过
knowledgePenalty = Math.max(0.05, knowledgePenalty);
```

### 知识点加成倍率
```javascript
// 思维加成：0.5倍
// 代码加成：0.3倍
// 可根据实际测试效果微调
```

## 兼容性说明

- ✅ 新比赛引擎 (`lib/competitions.js`) - **已修复**
- ✅ 旧比赛系统 (`getPerformanceScore` in `models.js`) - **已修复**
- ✅ 模拟赛系统 - 使用新引擎，自动生效
- ✅ 天赋系统 - 不受影响，仍可通过天赋效果修改知识点

### 旧系统修复详情 (`models.js`)

旧版 `getPerformanceScore` 函数同样应用了知识点门槛机制：

```javascript
// 1. 计算知识点需求
const knowledgeRequirement = Math.max(15, difficulty * 0.35);

// 2. 应用知识点惩罚
if(knowledge_value < knowledgeRequirement){
  const knowledgeGap = knowledgeRequirement - knowledge_value;
  knowledgePenalty = Math.exp(-knowledgeGap / 15.0);
  knowledgePenalty = Math.max(0.05, knowledgePenalty);
}

// 3. 降低知识直接加成（从2.0降至0.5）
knowledge_bonus = knowledge_value * 0.5;

// 4. 应用惩罚到通过率
performance_ratio = performance_ratio * knowledgePenalty;
```

这确保了无论使用新旧比赛系统，知识点判定逻辑都保持一致。

## 测试建议

1. **低知识高能力学生**：验证知识不足时通过率明显下降
2. **高知识低能力学生**：验证知识不能过度弥补能力不足
3. **平衡型学生**：验证正常难度下通过率合理
4. **极端难度题目**：验证难度压制机制仍正常工作

## 修改日期
2025年10月13日

## 修改人员
数值策划 (GitHub Copilot)
