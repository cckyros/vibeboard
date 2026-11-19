# Vibeboard — 设计稿（v2：Liquid Glass）

> 本文是网站设计的唯一事实来源。改视觉先改这里，再改代码。
> v2 替换 v1 的"纸墨记分板"世界：产品事实（thesis/worldview/方法/数据口径）不变，视觉世界整体换成 iOS 式玻璃拟态。

## Category thesis（不变）

**The evidence wall of vibe coding.**

声称用 AI 做出产品的人很多，真正把仓库公开的人很少。Vibeboard 只收开源的、vibe-coded 的真实产品，排名只认 GitHub 公开数据。

## Worldview sequence（不变）

AI 让造产品变便宜 → 稀缺的是"证明真的做出来了" → 这个站是公开记分板，repo 链接就是质检报告。

## 视觉母题

**玻璃板上的证据墙。** 底层是一块缓慢流动的彩色渐变场（live mesh gradient，像 iOS 壁纸），所有信息层都是悬浮其上的磨砂玻璃——iOS Control Center 浮在墙纸上的关系。玻璃不是装饰点缀，是这个世界的唯一材质：导航、分段控件、搜索、chips、行卡片、方法论，全部同一种玻璃配方。

## Design tokens

```css
--bg:        #EEF0F6;   /* 底色（渐变场画在其上） */
--ink:       #1C1C1E;   /* iOS label */
--ink-2:     #6E6E73;   /* iOS secondary label */
--ink-3:     #8E8E93;   /* iOS tertiary label / placeholder */
--accent:    #007AFF;   /* iOS systemBlue */
--up:        #248A3D;   /* +/w 正增量（深于 systemGreen 保证对比度） */
--top3:      #FF9F0A;   /* iOS systemOrange，仅 rank 1-3 */
--glass:     rgba(255, 255, 255, 0.58);  /* 玻璃面 */
--glass-2:   rgba(255, 255, 255, 0.72);  /* 文字密集处的加厚玻璃 */
--edge:      rgba(255, 255, 255, 0.65);  /* 玻璃顶缘高光 */
--stroke:    rgba(60, 60, 67, 0.10);     /* 玻璃描边 */
--shadow:    0 8px 32px rgba(31, 38, 135, 0.10), 0 1px 2px rgba(31, 38, 135, 0.06);
--mono:      ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
--sans:      -apple-system, "SF Pro Text", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
--ease:      cubic-bezier(0.32, 0.72, 0, 1);      /* iOS 弹簧感 */
--press:     cubic-bezier(0.28, 0.11, 0.32, 1);
```

## 玻璃配方（全站唯一材质）

```css
background: var(--glass)（文字密集区用 --glass-2）;
backdrop-filter: blur(24px) saturate(180%);
border: 1px solid var(--stroke);
box-shadow: var(--shadow), inset 0 1px 0 var(--edge); /* 顶缘一道高光 */
border-radius: 16px（行卡片）/ 12px（控件）/ 999px（胶囊）;
```

## 布局

```
┌─ live 渐变场（canvas，fixed，CSS blur 70px）────────────┐
│ [VIBEBOARD ⌄      tracked N · ★M · upd]  ← 浮动玻璃胶囊顶栏（sticky）
│  The evidence wall of vibe coding.       ← thesis 直接坐在渐变上
│  Open-source products only…
│  ┌玻璃面板───────────────────────────────────────────┐
│  │ (● Trending 7d) (All-time) (New)   🔍 search    │  ← iOS 分段控件 + 玻璃搜索框
│  │ [All tags ▾]  chip chip chip …                   │
│  ├───────────────────────────────────────────────── │
│  │ ┌glass card─┐ ┌glass card─┐ ┌glass card─┐ …      │  ← 行=玻璃卡片，gaps 8px
│  │ │ 01 repo ★ │ │ 02 repo ★ │ │ 03 repo ★ │        │
│  └───────────────────────────────────────────────── │
│  ▸ Methodology   source · Built in the open          ← 玻璃 details 卡
└─────────────────────────────────────────────────────┘
```

- 行展开保留 accordion（grid-rows 0fr→1fr），点行名仍跳 GitHub。
- 顶栏、分段控件、搜索、select、chips、行卡片、methodology 全用同一玻璃配方，只靠透明度和半径分级。

## 视觉系统规则

- **记分板质感不变**：排名大号 mono、★/+w/lang 右对齐定宽列（tabular-nums），数据列对齐是核心特征。
- **配色纪律**：蓝只给交互（选中 tab、chip 选中、链接、focus ring）；橙只给 rank 1-3；绿只给 +/w 正增量。其余一律 ink 灰阶。
- **文字可读性**：正文/placeholder 所在面一律 ≥ --glass-2 透明度；彩色渐变场上的文字必须有玻璃托底。
- **分段控件**：tabs 改 iOS segmented——胶囊轨道 + 选中项白色 thumb（JS 测量位移滑动）。
- **浏览器表面**：focus ring = 2px accent + 2px offset；::selection 用 accent 淡色；scrollbar/chips 轨道细发丝。

## Three.js 渐变场（唯一 3D 用途）

- `#bg3d` canvas：5-6 个无光照大球体（MeshBasicMaterial，蜡笔色粉彩：粉/蓝/紫/青/橙），慢速漂移+呼吸缩放；canvas 上叠 `filter: blur(70px) saturate(1.15)` → 实况 mesh gradient。
- **永远有静态兜底**：canvas 下方先画 CSS radial-gradient 版同款渐变，JS 失败/reduced-motion/窄屏/无 WebGL 时 3D 不初始化，视觉不缺失。
- `prefers-reduced-motion`、viewport < 820px、`document.hidden` → 不渲染/暂停；aria-hidden。
- vendor：`vendor/three.module.min.js`（自包含，无 CDN 依赖）。

## 动效清单（每条都有 purpose）

- 行入场：stagger 36ms fade+translateY(10px)，一次性建立秩序感。
- 按压：`:active` scale(.98)（按钮/行/chip）——iOS 按压反馈。
- hover（仅 `@media (hover:hover)`）：行卡 translateY(-2px)+shadow 加深，指示可点。
- 分段控件 thumb：位移滑动 200ms var(--ease)。
- 展开：grid-rows 弹簧 240ms；chevron 旋转。
- `prefers-reduced-motion`：全砍，包括 3D。

## 反 slop 自查（继承 v1，按新世界改写）

- ✗ 无 kicker/eyebrow、无渐变文字、无发光霓虹描边、无假数据/假背书。
- ✓ 玻璃是用户指定的世界材质，全站统一配方，不是单点装饰。
- ✓ 数据说话：★ 数和 +/w 仍是页面主角；方法公开写进页脚 methodology。
