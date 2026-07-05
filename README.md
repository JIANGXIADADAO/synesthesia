# Synesthesia 通感

> 不是要代替光，是用剩下的所有感官，把光重构一遍。

**跨感官色彩翻译平台** — 盲人语音问颜色，社区用触觉、听觉、温度回答。投票汇聚共识，共识编译为振动和音景。

🌐 **[synesthesia-three.vercel.app](https://synesthesia-three.vercel.app/)**

---

## 这是什么

App 里只有两种人。一种按住屏幕问颜色。一种闭上眼写感受。中间夹着一层投票。够多人觉得这个感受对了，它就是对的。

APP 只做了一件事：把"颜色是共识"这句话，从一个哲学命题，变成了一个能跑在手机上的东西。

## 本地运行

```bash
npm install
npm run dev
# → http://localhost:3000
```

## 声音编辑器

```bash
npm run dev
# → http://localhost:3000/studio
```

直觉式声音设计工具。不需要乐理知识——选择质感、空间、呼吸、纹理，点击音符试听，导出 JSON 预设。

## 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **音频**: Tone.js v15（合成器 + 混响 + 延迟 + LFO 调制）
- **振动**: Navigator.vibrate()（手机端）/ 视觉脉动降级（桌面端）
- **语音**: Web Speech API
- **数据库**: Node.js 内置 SQLite（开发环境）/ 静态数据导出（生产环境）
- **部署**: Vercel 静态导出

## 部署

Vercel 静态导出：`vercel --prod` 或连接 GitHub 自动部署。
