# Vibeboard — 设计稿

> 本文是网站设计的唯一事实来源。改视觉先改这里，再改代码。

## Category thesis

**The evidence wall of vibe coding.**

声称用 AI 做出了产品的人很多，真正把仓库公开的人很少。Vibeboard 只收录**开源的、vibe-coded 的真实产品**，排名只认 GitHub 公开数据。

## Worldview sequence

AI 让造产品变便宜 → 稀缺的是"证明真的做出来了" → 这个站是公开记分板，repo 链接就是质检报告。

与竞品的差异：不是"给 vibe coder 的工具目录"（Vibe Index 等已覆盖），而是"用 vibe coding 做出的**产品**的展示墙"——开源要求是可信度机制，不是门槛。

## 页面序列

worldview（一句话点题 + 实时统计）→ board（三块榜单）→ 领域工件（repo 行即证据）→ 方法说明 → 提交入口。

## 布局

```
┌─────────────────────────────────────────────────┐
│  VIBEBOARD          tracked N repos · ★M · upd  │  ← 顶栏：wordmark + 统计带
│  "Vibe coding 的证据墙"                          │  ← 一句话 thesis（不喊口号）
├─────────────────────────────────────────────────┤
│  [Trending 7d] [All-time] [New]   🔍 search     │  ← 榜单 tab + 搜索
│  All / Agents / Apps / Games / CLI / Sites …    │  ← 分类 chips
├─────────────────────────────────────────────────┤
│  01  owner/repo          ★12,340  +342/w  TS ↗  │
│  02  owner/repo          ★ 9,820  +210/w  PY ↗  │  ← 记分板行：大 mono 排名
│  …                                              │
├─────────────────────────────────────────────────┤
│  Methodology · Submit your repo → GitHub issue  │  ← 方法 + 提交
└─────────────────────────────────────────────────┘
```

- **行展开**：点击行展开 topics / license / homepage / pushed_at（accordion，ease-out 200ms）
- **行本身**：点击名称跳 GitHub，点击主页图标跳产品站

## Design tokens

```css
--paper:    #FAF6EF;   /* 暖纸底，避开 AI 暗色霓虹 */
--ink:      #17130B;   /* 近黑墨色 */
--ink-2:    #6B6257;   /* 次要文字 */
--hairline: #E3DBCB;   /* 行分隔线 */
--accent:   #E8500F;   /* 信号橙：记分板的能量 */
--accent-2: #1D6E4A;   /* 正增量绿（Δ7d） */
--surface:  #FFFFFF;   /* 行 hover 微亮 */
--mono:     ui-monospace, "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
--sans:     "Inter", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
```

## 视觉系统规则

- **记分板质感**：排名用超大 mono 等宽数字（`font-variant-numeric: tabular-nums`），行与行之间用 hairline 分隔，不用卡片
- **度量列对齐**：stars/Δ/lang 用固定 ch 宽 + 右对齐，保证跨行形成垂直列（记分板核心特征）
- **一个强调色**：橙只给排名 #1-3、当前 tab、CTA；Δ7d 增量用绿
- **零外部依赖**：不用 webfont/框架/CDN——系统字体栈，全站 < 60KB
- **唯一的"装饰"**：顶部一条 3px 橙色记分条（scoreboard stripe）+ 排名数字本身
- **动效**（emil 决策框架，全部有 purpose）：
  - 行入场 stagger 40ms（fade + translateY 6px）——一次性，建立秩序感
  - 行 hover：背景微亮 + 排名变橙——指示可点
  - 展开：ease-out 200ms
  - `prefers-reduced-motion`：全砍

## 反 AI slop 自查

- ❌ 无暗色渐变 hero、无玻璃卡片、无发光霓虹
- ❌ 不写 "AI-powered"、"revolutionary"、"supercharge"
- ✅ 数据说话：★ 数和 +Δ/w 是页面主角
- ✅ 方法公开：排序公式写进页脚 methodology

## 数据与排序（诚实声明，写进页脚）

- 数据源：GitHub REST API（topic 标签 + 关键词搜索），每日 Actions 刷新
- Trending = 近 7 天 WatchEvent 计数（仓库 public events feed，≤300 条窗口，热门仓库偏低估）；All-time = 总 stars；New = 60 天内创建按 stars
- 注：GitHub 已限制第三方仓库 stargazers 端点（404），故改用 events feed 估算
- 收录规则：public、非 fork、非 archived、有 LICENSE、有描述、非 awesome/教程/列表类
- 排序机制完全公开，不接受付费买排名（v1 无支付）

## 移动端

- 排名数字缩小一档，描述截断一行，Δ7d 保留（它是核心信号）
- 分类 chips 横向滚动
