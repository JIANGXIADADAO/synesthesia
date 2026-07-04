# CLAUDE.md — Synesthesia（通感）

> 跨感官色彩翻译平台 Web App。已建成展示版，可部署。

## 启动

```bash
npm install && npm run db:seed && npm run dev
# → http://localhost:3457（主页）/ http://localhost:3457/studio（声音编辑器）
```

## 项目状态

| 组件 | 状态 | 说明 |
|------|------|------|
| 主产品页 `/` | ✅ 已完成 | 语音搜索 + 8 色卡片 + 详情 + 回答 + 投票 + 感官播放 |
| 声音编辑器 `/studio` | ✅ 已完成 | 直觉式 UI：质感/空间/呼吸/纹理 + 音符试听 + 振动预设 |
| 感官引擎 | ✅ 已完成 | 共识文本 → 关键词 → Tone.js 参数 |
| API (4 个) | ✅ 已完成 | `GET /api/colors` `GET /api/colors/[slug]` `POST /api/answers` `POST /api/answers/[id]/vote` |
| E2E 测试 | ✅ 已完成 | 45/45 通过 |
| DIY 预设 | ✅ | `synesthesia-presets-diy1.json` — Studio 导出，seed 优先读取 |
| 部署 | ✅ 就绪 | `netlify.toml` 已配置，拖文件夹到 Netlify 即部署 |

## 技术栈

- **前端**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **音频**: Tone.js v15（AMSynth / FMSynth / Synth / 混响 / 延迟 / LFO）
- **振动**: Navigator.vibrate()（手机端），视觉脉动降级（桌面端）
- **语音**: Web Speech API (SpeechRecognition)，仅 Chrome/Safari
- **数据库**: Node.js 内置 `node:sqlite`（v22.5+），零外部依赖
- **部署**: Netlify，DB 在 `/tmp/` 自动播种

## 目录

```
src/
├── app/
│   ├── api/colors/              ← GET 颜色列表 + [slug] 详情
│   ├── api/answers/             ← POST 回答 + [id]/vote 投票
│   ├── page.tsx                 ← 主产品（盲人入口 + 明眼人回答流）
│   ├── studio/page.tsx          ← 声音设计工具
│   ├── layout.tsx + globals.css
├── db/index.ts                  ← SQLite 连接，首次请求自动播种
├── db/seed.ts                   ← 8 色 + 社区回答，DIY 预设优先
├── lib/sensory-engine.ts        ← 关键词 → Tone.js 参数映射
├── types/index.ts + global.d.ts
synesthesia-presets-diy1.json    ← DIY 感官预设（seed 读取）
```

## API 数据流

```
用户问颜色 → GET /api/colors?q=紫色 → 匹配 slug → 返回颜色 + 最高赞回答 + sensory 参数
                                                     ↓
用户写回答 → POST /api/answers → 感官引擎编译 → 存入 answers 表 + 更新颜色统计
                                                     ↓
用户投票   → POST /api/answers/:id/vote → toggle 投票 → ≥50 自动标记共识
                                                     ↓
前端"感受" → 读取 sensory 缓存 → Tone.js 播放音景 + navigator.vibrate 振动
```

## DIY 预设工作流

```
/studio 编辑 → 💾 保存 → 📥 导出 JSON
    → 替换 synesthesia-presets-diy1.json
    → npm run db:seed（本地）/ 删 DB 重播（生产自动）
    → 产品生效
```

## 振动/音景设计规则

- 振动模式周期性循环，总长 4-10 秒
- 音景使用 Tone.js 合成，带混响 + 延迟 + LFO 调制
- 桌面端无振动 → 按钮脉动视觉反馈
- 所有参数来自 `synesthesia-presets-diy1.json`（社区共识编译），非硬编码

## 部署 (Netlify)

1. 确保 `NODE_VERSION = 22`（Netlify 环境变量）
2. 拖整个文件夹（不含 node_modules / .next / synesthesia.db）
3. Netlify 自动跑 `next build`
4. 首次 API 请求 → `db/index.ts` 检测空库 → 自动播种
