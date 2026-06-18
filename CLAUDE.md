# CLAUDE.md — Synesthesia（通感）

> 项目级指令。Cub 和所有 Worker 启动后先读此文件定位全局上下文。

## 产品信息

- **产品名**：Synesthesia（通感）
- **一句话**：跨感官色彩翻译平台——用触觉、听觉、温度把颜色翻译给盲人
- **目标用户**：盲人社群 / 无障碍开发者 / 博物馆·美术馆·盲校
- **定价锚点**：社区免费，企业 API 按调用量计费

## 产品周期阶段

```
Scout  →  Designer  →  Builder  →  Tester  →  Seller  →  Cub 用户模拟  →  发布
```

| 阶段 | Worker | 状态 | 产出 |
|------|--------|------|------|
| 找方向+验证 | Scout | ⏳ 待激活 | `briefs/scout→designer.md` |
| 设计 | Designer | ⏳ 待激活 | `briefs/designer→builder.md` |
| 开发 | Builder | ⏳ 待激活 | `src/` + `briefs/builder→tester.md` + CLI 参考 |
| 测试 | Tester | ⏳ 待激活 | `src/tests/e2e.test.js` + 示例用法 |
| 封版+文档 | Seller | ⏳ 待激活 | README（中英、保姆级、场景路径）/ Landing Page / 打包 |
| 用户模拟 | Cub | ⏳ 待激活 | 模拟测试报告 → 修复 → 通过 |
| 分发运营 | Seller | ⏳ 待激活 | ProductHunt / Reddit / HN / 知乎 / 掘金 / V2EX |

### Cub 用户模拟测试

**时机**：Seller 完成 README 后、正式分发前。

**Cub 做什么**：
1. 假装自己是第一次用的新用户。删掉所有配置、token、缓存
2. 打开 README，从 Quick Start 第一步开始逐条执行
3. 每条路径都走：零配置路径 → 有 API key 路径 → 有 GitHub PR 路径 → 发布路径
4. 需要 token 时找用户要（不自己造）
5. 每一步记录：命令是否成功、输出是否符合预期、有没有困惑

**判定标准**：
- 每条 README 中的命令都能成功执行
- 每个"你会看到"的输出和实际一致（格式、关键字段）
- 任何降级/跳过/失败都有明确提示告诉用户发生了什么
- 新手按 README 操作无需任何额外知识

**发现问题 →** 回传对应 Worker 修复，修完 Cub 再测。全部通过 → 绿灯发布。

## 项目背景

本项目源自 2026 杭州 Adventure-X 黑客松。核心命题：

> **"不是要代替光，是用剩下的所有感官，把光重构一遍。"**

我们不帮盲人"看见"。我们帮他们**站在颜色里**。

### 五个产品方向（漏斗式推进）

```
         ┌──────────────────────┐
         │  通感词典（小程序）     │  ← 先做：验证需求，积累内容和用户
         │  2周 MVP，零成本        │
         ├──────────────────────┤
         │  Synesthesia API      │  ← 再做：结构化数据，开放生态
         │  词典里的数据反向训练    │
         ├──────────────────────┤
         │  ColourScape 硬件      │  ← 终极形态：用剩下的感官重构光
         │  或 感官房间            │
         └──────────────────────┘
```

### 黑客松 MVP 目标

一个 **Web App**：
- 盲人用户语音输入："紫色是什么感觉？"
- 社区用非视觉比喻回答（触觉、听觉、嗅觉、温度）
- 点赞汇聚共识，形成色彩通感词典
- 调用 API 实时生成该颜色的多感官体验（振动模式 + 音景 + 温度提示）

### 不可变来源

- `raw/通感产品灵感.md` — 五个产品方向完整推演
- `raw/黑客松问卷-项目思路.md` — 黑客松问卷 + 问题洞察 + 解决方案 + 技术路径

## 目录结构

```
projects/synesthesia/
├── CLAUDE.md                     ← 本文件
├── .gitignore                    ← Worker 目录 + 临时文件忽略
├── .claude/
│   └── settings.json             ← PostToolUse auto-commit hook
├── briefs/
│   ├── scout→designer.md         ← Scout 写 → Designer/Seller 读
│   ├── designer→builder.md       ← Designer 写 → Builder/Tester 读
│   └── builder→tester.md         ← Builder 写 → Tester 读
├── raw/                          ← 不可变原始来源
│   ├── 通感产品灵感.md
│   └── 黑客松问卷-项目思路.md
├── scout/CLAUDE.md
├── designer/CLAUDE.md
├── builder/CLAUDE.md
├── tester/CLAUDE.md
├── seller/CLAUDE.md
└── src/
    ├── tests/                    ← Tester 唯一可写
    └── ...
```

## 硬约束（所有 Worker 通用）

- `wiki/`：所有 Worker 只读。Cub 是唯一维护者
- `inboxes/`：每个 Worker 只能写自己的文件
- Worker 之间不直接通信——通过 briefs/ 和用户传递信息
- 同项目其他 Worker 的子目录：只读（自己的目录除外）

## 共享记忆

- 导航：`../../wiki/index.md`
- 模板来源：`../../agents/templates/`
- 踩坑上报：`../../inboxes/<role>.md`
- 公司工具：`../../tools/README.md`

## 断点规则

- 存档：每个 Worker 在自己 CLAUDE.md 末尾写入 `<!-- ROLE:RESUME -->` 标记块
- 恢复：下次启动时检测标记块 → 读出 → 删除 → 继续
- 关键：读后即删，避免过期断点残留

## Git 与操作日志

本项目使用 Git 作为操作日志引擎。每步重要产出自动或手动 commit：

- **自动**：`.claude/settings.json` 的 PostToolUse hook，每次 Write/Edit 自动 `[auto]` commit
- **语义**：Worker 完成交付时手动 `git commit -m "[scout] 竞品深挖完成"` ——用于 Dashboard 操作日志面板展示

### Commit 标签约定

| 标签 | 使用角色 |
|------|---------|
| `[scout]` | Scout 交付 |
| `[designer]` | Designer 交付 |
| `[builder]` | Builder 功能完成 |
| `[tester]` | Tester 测试完成 |
| `[seller]` | Seller 发布完成 |

### 新项目初始化

```bash
mkdir -p projects/新项目/src
cp agents/templates/project.template.md projects/新项目/CLAUDE.md
cp agents/templates/.gitignore projects/新项目/.gitignore
mkdir -p projects/新项目/.claude
cp agents/templates/settings.json projects/新项目/.claude/settings.json
cd projects/新项目
git init                                    ← 项目级 Git，Dashboard 依赖
git add -A && git commit -m "[init] 项目创建"
# 编辑 CLAUDE.md，填入项目信息
```

> **项目级 Git**：每个项目独立的 `.git/`，不会和公司根仓库冲突。git 在工作目录内自动使用最近的 `.git/`。Dashboard 只读项目级 git log。
