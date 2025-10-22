# OItrainer — 信息学教练模拟器

这是一个基于浏览器的文字/策略模拟游戏，模拟信息教练训练选手从赛季训练到正式比赛的成长与抉择。项目由 HTML/JavaScript/CSS 构建，无需后端即可运行。

## 特色

- 赛季推进与比赛模拟：完整的赛季与周推进系统，包含 CSP、NOIP、省选、NOI 等赛事。
- 细化的学生模型：思维、编程、心理与五大知识分类，并考虑压力、舒适、天气与生病等状态。
- 多样训练与外出集训：提供多种选择提升选手能力
- 天赋与事件系统：提升趣味性与策略深度。
- 设施与预算管理：设施经费，集训经费等限制进一步加深决策复杂性
- 模拟赛与比赛评分：按时间节拍、题目子任务与知识门槛还原题目思考，实时滚榜，包含天赋与技能触发，还原真实比赛。

详细机制与玩法建议请参见项目内的 help.md 或游戏内帮助。


## 游玩

直接访问 [oi.seveoi.icu](https://oi.seveoi.icu) 即可。

## 开发

- 项目类型：前端静态页面（HTML + JavaScript + CSS）
- 主要目录：
  - `index.html`：主入口
  - `game.js`, `render.js`, `debug.js`, `lib/`：核心逻辑脚本（比赛模拟、天赋、事件、模型等）
  - `assets/`：图片/资源
  - 其他脚本`tutorial.js` 等

如果要修改并本地调试，建议使用带开发者工具的浏览器（Chrome/Edge/Firefox）。
(主要由AI完成，代码可能并不可读)

## 贡献

欢迎提出 Issue 与 Pull Request 来改进游戏。

## 许可

  Apache License

    Version 2.0, January 2004

  欢迎对该项目进行魔改/微调，但请保留原作者信息与许可声明。

## 致谢与联系方式

作者：seve42

luogu: seve_

邮箱: dreamer-seve@outlook.com 或 dreamersseve@gmail.com
