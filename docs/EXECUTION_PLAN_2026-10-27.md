# Platypus 执行方案（审计后）

**写于：** 2026-10-27（周二）
**依据：** `docs/AUDIT_2026-10-27.md`
**前提：** Juanxi 2026-10-27 的三个决定（见第 1 节）
**状态：** 待 Juanxi 确认后开始执行

---

## 第 1 节 · Juanxi 的三个回答，以及它们改变了什么

### 1.1 「我最怀念第二版的响应速度，真的很快，不需要等」

**→ 这条把性能从"以后再说"提到了第一优先级，而且找到了确切原因。**

审计报告第 9 节原本写着"`forecast.ts` 的 1000 次迭代当前规模下不是问题，现在优化是浪费时间"。**这个结论现在要修正**——它只对"机器算得快不快"成立，对"人觉得快不快"不成立。

已验证的两个原因：

**① 每次悬停都要等 300 毫秒**

```css
/* src/styles.css:471（悬停卡）和 :572（流程图节点卡）*/
transition: opacity .12s ease .3s, visibility 0s linear .42s;
                              ↑ 300ms 延迟
```

鼠标停上去 → **等 300ms** → 再花 120ms 淡入 → 总共 **420ms** 才看见东西。移开时还有 420ms 才消失。

而第二版（你喜欢的 v0.1）的全部过渡是 `.15s` / `.2s`，**一个延迟都没有**：

```
$ grep transition public/legacy/index.html
transition: background .15s
transition: opacity .2s, transform .2s
transition: transform .15s
transition: none
```

`git log -S` 确认：那个 300ms 延迟是 **`5bde479`「v1.1 简化改版」** 引入的——**正好是你开始不喜欢的那一版**。

**这是 1 行 CSS 的修复。**

**② 预测被重复计算 3–5 次**

```
src/pages/Today.tsx:19     useMemo(() => computeForecast(state), [state])
src/pages/Events.tsx:28    useMemo(() => computeForecast(state), [state])   ← 各自一份缓存
src/lib/aiContext.ts:18    computeForecast(s)        ← 每发一条 Ask 消息
src/lib/assistant.ts:72    computeForecast(s)        ← 同一次回答里
src/lib/assistant.ts:82    computeForecast(s)        ← 又一次
```

5 个调用点，互相不共享缓存。每次都要先跑一遍完整排程，再模拟 1000 次。**发一条 Ask 消息 = 3 次完整预测。** 加上 store 每次改动都要把整包数据 `JSON.stringify` 写进浏览器。

修法：收敛成一个 `useForecast()`，整个应用每次 state 变化只算一次。

### 1.2 「蓝框太引导性了，像引导式访问，先去掉」

**→ 2026-10-27 Juanxi 提供截图后已确认：那不是我们画的，是浏览器的原生焦点环。**

截图内容：Settings 页 `Submit budget request` 的数字输入框，获得焦点时外面有一圈亮蓝。

关键证据 —— **那个蓝不是本项目的颜色**：

```css
/* src/styles.css:53 —— 本项目唯一的焦点样式 */
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
/* --accent = #0f766e，青绿色，不是蓝色 */
```

而且已核实：**全仓库没有任何针对 input / select / textarea 的焦点样式，也没有任何处理
浏览器原生焦点环的代码**（`grep -n "webkit|focus-ring|outline: *none" src/styles.css`
只命中 `.task-detail h2:focus`、`.panel h2:focus` 和两条无关的 `-webkit-` 属性）。

→ 结论：那是浏览器自己给表单控件画的原生焦点环。Juanxi 说它是「苹果的」，很可能字面
  意义上就是 —— macOS / Safari 对表单控件有自己的蓝色焦点环，作者的 `outline` 盖不住它。

⚠️ **待确认：Juanxi 用的是 Safari 还是 Chrome。** 两者修法略有不同，S3 开工前要问。

### 这一条不能简单删掉

v0.1（含 `:focus-visible` 的写法）和今天完全相同，而 Juanxi 喜欢两者。而且：
- `:focus-visible` **只对键盘用户显示**，鼠标点击不触发（文本/数字输入框是例外，
  按规范它们点击时也匹配 —— 这正是截图里那一下）
- 它是 WCAG 2.4.7「焦点可见」的硬要求，删了 `e2e/a11y.spec.ts` 直接失败
- ASU 有无障碍政策，论文里不能写「我们删掉了键盘可见性」

### 正确改法

```css
/* 1. 关掉表单控件的原生环 */
input:focus, select:focus, textarea:focus { outline: none; }

/* 2. 换成我们自己的、低调的环（只对键盘和文本输入显示） */
input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--accent);   /* 青绿，不是蓝 */
  outline-offset: 1px;
}
```

Safari 还可能需要额外处理 `-webkit-appearance` / 数字输入框的 spinner。以 Juanxi 的
浏览器实测为准。

### 顺带要处理的「选中态」

v1.1 新增的这两条也偏重，和 Juanxi 要的「简洁、高级」相反：

| 位置 | 代码 | 问题 |
|---|---|---|
| `styles.css:560` | `.m-node.is-selected .m-dot { outline: 3px solid var(--accent); outline-offset: 3px }` | 20px 的圆点外面套 3px 粗、离 3px 远的环，环几乎和圆点一样大 |
| `styles.css:686` | `.heat-cell.all { outline: 2px solid var(--accent-ink); outline-offset: -1px }` | Team 热力图 |
| `styles.css:240` | `.flow-step.is-selected { box-shadow: ... }` | **死代码**（泳道图已删），直接删 |

→ 粗外环换成淡背景 + 1px 边框（Linear / Notion / monday 的做法）。

### 1.3 「用假数据，先不上 Supabase」

**→ D 线（数据层）整条取消。这省掉了大量工作，而且让 IRB 简单得多。** 这个决定是对的。

但有三个连带后果必须处理：

**① 浏览器数据保护的优先级上升了。** 既然 localStorage 是唯一的存储，审计报告 A7 那条（"改一次数据结构 = 所有用户数据无声清零"）就从"隐患"变成"参与者 60 分钟会话做的一切可能在你推一次代码后消失"。**A7 必须做，而且要在周四之前。**

**② 时钟问题不用修了。** 固定在 `2026-10-22` 的演示时钟原本是个问题，但你的计划里本来就写着"Phase 3 每位参与者看到同样的日期"（10/22 决定记录）。**所以这是 feature 不是 bug，保持不动。**（但 2027-05-08 的日历过期还是要补，半小时的事，而且现在补比以后补便宜。）

**③ 但你的 data governance 还是能拿到，而且不需要服务器。** 这是我新想到的办法：

在那个 reducer 切口上（`store.tsx:104-245`，一个 switch 覆盖全部 40 种操作）加一张**只追加的事件日志，写进同一个 localStorage**。会话结束时，参与者点一下「Export session」，把 JSON 交给你。

你就拿到了：谁、在第几秒、做了什么、改之前是什么值。**零服务器、零 Supabase、零数据库，但论文里"data governance 作为最底层"这个主张有了真实证据。**

⚠️ **这件事必须写进周四提交的 IRB 材料里。** 导出文件里不含真实姓名（参与者用你给的假信息），但"收集参与者的交互日志"本身就是在收集数据，protocol 里要有。**现在写进去是免费的；批准之后再加要走修改，会卡掉你 11/9 开始测试的计划。**

### 1.4【2026-10-27 更正】Juanxi 喜欢的是**现在这一版**，不是旧版

Juanxi 发来一张他说「我喜欢的就是这个版本」的截图。逐项核对，那是 **v1.2（main 上现在
跑的版本）的深色模式**：

| 截图里的元素 | 代码位置 | 引入版本 |
|---|---|---|
| 右栏 `Ask \| Details` 两标签、"Looking at: Today ×" | `src/components/rail/AskPanel.tsx` | v1.1 |
| Plan/Prep/Money/Promo/Run/Wrap 圆点链 | `Chain`（`ui/index.tsx`）| v1.1 |
| "Waiting" 紫 / "Not claimed" 灰 | `ui/statusDefaults.ts` 的 6 色 | v1.1 |
| "Demo · Thu, Oct 22" 药丸 | `DemoMenu` | v1.1 |
| Rules 与 Settings 之间那条横线 | `Layout.tsx:79` 的空分组 div | v1.1 |
| Semester goals 圆环 | `Ring`（`ui/index.tsx`）| v1.1 |

v0.1 和 WP0–WP5 那两代都**没有**右栏、Chain、StatusPill，所以可以排除。

**→ 审计报告第 7.4 节的推断（「他怀念的是第二版有标题有解释文字的卡片布局」）被否定了。**
那一条在报告里标的是「推断」，现在有反证，按反证走。

### 这改变了什么

| 原计划 | 改成 | 理由 |
|---|---|---|
| C4 导航改回动作导向 | ❌ **删除** | 他喜欢现在的导航 |
| C5 恢复甘特图 | ❌ **删除** | 他从未要求过 |
| C1 Behind-the-scenes 开关 | ✅ 保留，**换理由** | 不再是「找回怀念的东西」，而是①论文可解释性论证 ②触屏用户看不到悬停卡内容 |
| C2 问题变可见副标题 | ⚠️ **降级为先问 Juanxi** | 他没抱怨过看不懂，这是改进不是修 bug |
| S5 的定位 | ⚠️ **从「建立设计系统」改为「把现在的样子固定下来」** | 见下 |

### S5 定位的改变（重要）

Juanxi 可以**喜欢这个深绿色的样子**，同时代码底下**确实是乱的** —— 这两件事不冲突。

23 种字号、4 套配色、19.7% 死 CSS 不是「看起来丑」的问题，是「没人能安全地改它」的问题。

**所以 S5 要做的不是重新设计，是把现在这个样子用一套规则重新表达一遍。做完之后界面应该
看起来几乎一模一样**，只是从「23 种随机字号」变成「6 个档位」。S5 的提示词里必须写死
这一条，否则 Opus 会忍不住「改进」视觉。

### 因此升级的优先级：深色模式

Juanxi 用的是**深色模式**。而审计第 8.2 节发现 **6 个状态色没有深色变体**，在深色背景上
对 surface 只有 2.96–3.65:1；`--line` 对 surface 只有 1.30:1。

→ S5 必须把深色模式当第一现场，不是「顺带也看一下」。

---

---

## 第 2 节 · 新时间表

| 日期 | 星期 | 事件 | 要完成什么 |
|---|---|---|---|
| **10/27** | 周二 | 今天 | 确认本方案；提交审计报告到 GitHub |
| 10/28 | 周三 | 执行 | **第一阶段**（3 个会话并行） |
| **10/29** | **周四** | **提交 IRB** | 功能完整、无明显 bug、响应快。**IRB 材料里写上交互日志导出** |
| 10/30–11/1 | 五六日 | IRB 等待 | **第二阶段**（设计系统，顺序执行） |
| **11/2–11/3** | 周一二 | IRB 批准 | 第二阶段继续 |
| **11/4** | **周三** | 发招募邮件 | 关掉 Netlify 访问保护（**必须先做完限流**）|
| 11/5–11/8 | 四五六日 | 收尾 | **第三阶段**（可解释性）+ 定版 |
| **11/9** | **周一** | 开始真实测试 | v1.0 冻结、打标签 |

**三个阶段的分界线是硬的：**

- **第一阶段（今天 → 周四）＝ 能用、不丢数据、感觉快。** 不碰视觉系统。
- **第二阶段（周四 → 周日）＝ 设计系统。** 这阶段只改 CSS 和 lint 配置，不加功能。
- **第三阶段（11/5 → 11/8）＝ 把"看得懂"拿回来。** 最有论文价值的部分放最后，因为它建立在前两阶段之上。

**11/4 有一个硬依赖：** 发招募邮件意味着要关掉 Netlify 访问保护，而那一刻你的 AI key 就暴露在公网。**所以 A8（限流 + 删掉多余端点）必须在 11/4 之前完成**，不能拖。

---

## 第 3 节 · 会话清单（9 个会话）

### 回答「预计需要开多少个对话」：**9 个**，分三批。

| # | 会话名 | 阶段 | 模型 | 分支 | 能否并行 | 独占的文件 |
|---|---|---|---|---|---|---|
| **S1** | 权限与入口修复 | 一 | **Sonnet 5.5** | `fix/s1-ux-bugs` | ✅ 与 S2/S3 并行 | `NodePanel.tsx` `Tasks.tsx` `board.ts` `Layout.tsx` `main.tsx` `TaskDetail.tsx` |
| **S2** | 安全、引擎、数据保护 | 一 | **Sonnet 5.5** | `fix/s2-safety` | ✅ 与 S1/S3 并行 | `netlify/**` `calendar.ts` `schedule.ts` `store.tsx` `seed.ts` `public/legacy/` |
| **S3** | 响应速度与质感 | 一 | **Opus 5.5** | `fix/s3-perf` | ✅ 与 S1/S2 并行 | `styles.css` `Today.tsx` `Events.tsx` `aiContext.ts` `assistant.ts` `forecast.ts` |
| **S4** | 删死代码 | 二 | **Sonnet 5.5** | `design/s4-deadcode` | ❌ 必须在 S3 合并后 | `styles.css` `helpers.tsx` |
| **S5** | Token 表（设计系统） | 二 | **Opus 5.5** | `design/s5-tokens` | ❌ 必须在 S4 之后 | `styles.css` `statusDefaults.ts` `MetroChart.tsx` `Handoff.tsx` |
| **S6** | 护栏（lint + CI + 无障碍） | 二 | **Sonnet 5.5** | `design/s6-guardrails` | ❌ 必须在 S5 之后 | `package.json` `.stylelintrc` `.eslintrc` `ci.yml` `a11y.spec.ts` `word-count.mjs` |
| **S7** | 可解释性开关 + 可见副标题 | 三 | **Opus 5.5** | `feat/s7-explain` | ❌ 必须在 S6 之后 | `Page.tsx` `Layout.tsx` `routes.ts` + 各 page 的注释点 |
| **S8** | 触屏降级 + 导航重组 | 三 | **Sonnet 5.5** | `feat/s8-touch-nav` | ❌ 必须在 S7 之后 | `ui/index.tsx` `Layout.tsx` `styles.css` |
| **S9** | 定版、文档、合并上线 | 三 | **Opus 5.5** | `release/v1.0` | ❌ 最后 | `README.md` `AGENTS.md` `PROGRESS.md` `PRODUCT_PLAN.md` |

### 为什么是这个分法

**S1/S2/S3 可以并行，是因为它们的文件集合经过核对、完全不重叠。** 这不是猜的——我逐个列了独占文件清单，提示词里会写明"不要碰别人的文件"。唯一的交叉点是 `styles.css`：**只有 S3 可以改它**，所以 S1 加新按钮时必须复用现有的 `.btn .btn-primary`，不准写新样式。

**S4 必须在 S5 之前，这一点和审计报告的顺序相反——我改了。** 原报告写 B1（token）→ B2（删死代码）。**先删后建更省事**：删掉 19.7% 的死 CSS 之后，S5 要映射的字号/间距会少掉一大块，而且审计发现的 23 处"重复声明冲突"里大部分重复的那一半本来就是死的——先删掉，冲突自己就消失了。

**第二、三阶段不并行，是因为它们全都要动 `styles.css`。** 两个 agent 同时改同一个 714 行的 CSS 文件 = 必然的合并冲突，而你不写代码，解决不了冲突。**串行比并行安全得多。**

### 回答「用哪个模型」

原则：**按任务性质选，不是按"越贵越好"选。**

- **Opus 5.5 用在需要判断的地方**（S3 S5 S7 S9）：
  - S3 要判断"哪个框才是他说的蓝框"、"怎么改才叫简洁高级"——这是审美和权衡
  - S5 要把 23 种字号映射进 6 个档位，每一个都是判断题（这个 13px 该归 xs 还是 sm？）
  - S7 是从零设计一个新交互
  - S9 要决定能不能上线
- **Sonnet 5.5 用在规格明确的地方**（S1 S2 S4 S6 S8）：有确切的文件、行号、验收标准，照做就行
- **Haiku** 这些任务都偏重，不建议用

---

## 第 4 节 · 回答「怎么用 git worktree」

### 先说一个能帮你省事的判断

**如果你是在网页上开新对话（claude.ai/code 这种云端会话），你不需要 worktree。**

云端会话每次都会开一个全新的容器、重新 clone 一份代码。**隔离已经是免费的了**——两个会话物理上不可能互相覆盖文件。worktree 解决的是"同一台机器上多个 agent 抢同一个文件夹"，而你没有这个问题。

**所以你只需要分支，不需要 worktree。** 每个会话一开始检出自己的分支就行。你不用学 worktree 是什么。

### 方案 A（推荐）· 云端会话 + 分支

一次性准备（今天做）：

```bash
git checkout main && git pull
git checkout -b integration/v1.1-fix
git push -u origin integration/v1.1-fix
```

`integration/v1.1-fix` 是**集结地**。所有会话的成果先合并到这里，**只在周四和 11/9 两个节点才合并到 `main`**（遵守 AGENTS.md 第 3 节规则 4：main 就是正式网站，需要你批准）。

每个会话的第一句（提示词里已经写好了）：

```bash
git fetch origin
git checkout -b fix/s1-ux-bugs origin/integration/v1.1-fix
```

每个会话的最后：推自己的分支，**不要自己合并**。你在 GitHub 上看一眼再按合并按钮。

合并顺序（**一次只合一个，合完等 CI 绿灯再合下一个**）：

```
S1 → S2 → S3  →  合并 integration/v1.1-fix 到 main（周四，你批准）
S4 → S5 → S6
S7 → S8
S9                →  合并到 main + 打 v1.0 标签（11/9，你批准）
```

### 方案 B · 如果你在自己 Mac 上跑本地 Claude Code

这时候 worktree 才有意义——它让三个 agent 各有一个独立的工作目录，但共享同一个 `.git`，所以互不干扰又不用 clone 三份：

```bash
cd ~/platypus-officer-hub
git fetch origin && git checkout -b integration/v1.1-fix origin/main && git push -u origin integration/v1.1-fix

# 给第一阶段的三个会话各开一个工作目录
git worktree add ../pl-s1 -b fix/s1-ux-bugs integration/v1.1-fix
git worktree add ../pl-s2 -b fix/s2-safety  integration/v1.1-fix
git worktree add ../pl-s3 -b fix/s3-perf    integration/v1.1-fix

# 每个目录要各自装一次依赖（node_modules 不共享）
cd ../pl-s1 && npm ci
cd ../pl-s2 && npm ci
cd ../pl-s3 && npm ci
```

然后在三个终端里分别 `cd ../pl-s1` 再启动 Claude Code。

做完回收：

```bash
git worktree remove ../pl-s1    # 要先提交或丢弃改动
git worktree list               # 看还剩哪些
```

**两个坑：**
1. `node_modules` 不共享，每个 worktree 要单独 `npm ci`（三份依赖，占磁盘）
2. 同一个分支不能在两个 worktree 里同时检出，git 会直接拒绝

**我的建议：用方案 A。** 你不写代码，worktree 的收益（省一次 clone）远小于它的认知成本。

---

## 第 5 节 · 九个提示词（可直接复制）

> 用法：开一个新对话 → 确认模型 → 把下面对应的整段粘进去。每段都已经包含了分支操作、文件边界、验收标准和交接要求，你不用额外补充。

---

### S1 · 权限与入口修复 ｜ Sonnet 5.5 ｜ 可与 S2/S3 并行

```
你在 Platypus Officer Hub 仓库里做一个界定清楚的修复工作包。这是 ASU 荣誉论文的
Phase 3 原型，项目负责人 Juanxi 不写代码。

先读（按顺序，必读）：
1. AGENTS.md —— 对所有 AI 都适用的硬规则，特别是第 3 节和第 7 节
2. docs/AUDIT_2026-10-27.md —— 代码审计报告，你要修的问题全在第 5、6 节
3. docs/EXECUTION_PLAN_2026-10-27.md 第 3 节 —— 你是 S1

开始前：
  git fetch origin
  git checkout -b fix/s1-ux-bugs origin/integration/v1.1-fix
  npm ci

## 你要做的六件事

A1. src/styles.css:472 —— 悬停卡显示时没有恢复 pointer-events，导致悬停卡里的
    按钮鼠标点不到、键盘也到不了。src/pages/Team.tsx:39 的贡献榜下钻功能因此
    100% 不可用。
    ⚠️ 例外：styles.css 由 S3 独占，你不能改它。
    → 请改成在 TSX 层面解决，或者把这一条写进交接记录交给 S3，并在
      e2e 里加一个会失败的测试标记（test.fixme）把问题钉住。二选一，说明理由。

A2. src/components/NodePanel.tsx:52,62,85,92,96,103,105,106 —— 这些编辑控件对
    所有人都渲染，但 src/data/store.tsx:155 的 updateNode 在 !canLead(state) 时
    直接 return state。用户改了没反应、也没有任何提示。
    → 改成 disabled={!canLead(state)}，并在面板里加一句说明。
    → 文案和交互必须和 src/components/rail/ChangeCard.tsx:111-113 完全一致
      （那是全仓库唯一做对的地方，照它抄）。
    ⚠️ 不要改 store.tsx（S2 独占），只改 NodePanel.tsx。

A3. src/pages/Tasks.tsx:28-32 —— 全站唯一的「+ Add task」按钮在 :125，只存在于
    Board 视图每一列的最底部。默认视图是 Table（:20），所以用户打开 Tasks 看不到
    任何新建入口，会以为自己没权限。
    → 在 PageHead 的 actions 里加一个「+ New task」主按钮，三个视图都显示。
    → 复用现有的 dispatch({ type: "addTask", title, status })。
    → 注意 src/data/board.ts:60-71 的 addBoardTask 本来就不检查权限，所以这个
      按钮对所有角色都应该可用。
    ⚠️ 必须复用现有的 .btn .btn-primary 类，不准新增任何 CSS。

A4. src/data/board.ts:64-67 —— 两个 bug：
    (a) 非 lead 在 "Not claimed" 列点新建，卡片会静默出现在 "To do" 列。
        → 改成显式提示用户发生了什么（文案用英文，界面文字一律英文，见 AGENTS.md §7）。
    (b) :69 在 "Done" 列新建会直接产生 status=done 且 completedOn=today 的任务，
        任何干部都能凭空造一个「已完成」，而 canMoveTask(:22) 却规定重开已完成
        任务要社长批准 —— 审批模型被创建路径绕过了。
        → 堵掉。新建的任务不允许直接是 done。
    → 两条都要补单元测试。

A5. src/components/Layout.tsx:123 —— Reset demo 一键清空全部数据，没有任何确认，
    而它就在顶栏菜单里紧挨着 "+1 day / +3 days / +10 days"。全仓库 0 处 confirm()。
    → 加一次确认。不要用原生 confirm()（会被 Playwright 和手机浏览器挡），用
      一个两步点击（第一次点变成 "Click again to reset"，3 秒后复原）。
    → 更新受影响的 e2e 测试。

A6. src/main.tsx —— 全仓库 0 处 ErrorBoundary。任何渲染错误 = 整个应用白屏，而
    localStorage 里损坏的数据会导致每次刷新都白屏。参与者会直接卡死。
    → 加一个 ErrorBoundary，包住 App。
    → 出错时显示：一句英文说明 + 两个按钮（Reload / Reset demo data）。
    → Reset 按钮要能在 store 已经坏掉的情况下工作（直接清 localStorage，
      不要走 store 的 action）。

## 文件边界（硬性）

你只能改：
  src/components/NodePanel.tsx
  src/components/TaskDetail.tsx
  src/pages/Tasks.tsx
  src/data/board.ts
  src/components/Layout.tsx
  src/main.tsx
  src/test/** 和 e2e/** 里对应的测试
  docs/PROGRESS.md（只加交接记录）

你绝对不能改：
  src/styles.css        ← S3 独占
  src/data/store.tsx    ← S2 独占
  netlify/**            ← S2 独占
  src/engine/**         ← S2/S3 独占
  src/lib/assistant.ts, src/lib/aiContext.ts, src/pages/Today.tsx,
  src/pages/Events.tsx  ← S3 独占

如果某件事必须改到别人的文件，不要改 —— 写进 docs/PROGRESS.md 的交接记录，
说明「S1 发现 X，需要 S3/S2 在 <文件> 做 Y」。

## 验收

- npm run check 全绿（tsc + vitest + playwright）
- 原有测试一条都不能删、不能改宽松。如果某个测试因为你的改动而理应变化，
  在交接记录里逐条说明为什么。
- 新行为都要有测试
- 不要改 AGENTS.md、PRODUCT_PLAN.md、RULES.md

## 结束时

1. 在 docs/PROGRESS.md 的交接记录最上面加一行，格式照既有的写：
   做完了什么 / 还剩什么 / 怎么验收（点哪里）/ 已知问题 / 交接给谁
2. 提交信息格式：[S1][Claude] 简短说明
3. git push -u origin fix/s1-ux-bugs
4. 不要合并到任何分支。不要碰 main。Juanxi 会自己在 GitHub 上合并。
5. 最后用简单中文向 Juanxi 汇报：改了什么、他该点哪里验收、有什么没做完。
   一次只讲一步，不要用术语。
```

---

### S2 · 安全、引擎、数据保护 ｜ Sonnet 5.5 ｜ 可与 S1/S3 并行

```
你在 Platypus Officer Hub 仓库里做一个界定清楚的修复工作包。这是 ASU 荣誉论文的
Phase 3 原型，项目负责人 Juanxi 不写代码。

先读（按顺序，必读）：
1. AGENTS.md —— 特别是第 3 节硬性规则
2. docs/AUDIT_2026-10-27.md —— 你要修的在第 3 节（三件紧急事）和第 10 节
3. docs/EXECUTION_PLAN_2026-10-27.md 第 1.3 节和第 3 节 —— 你是 S2

重要背景：Juanxi 已决定 Phase 3 不上 Supabase，参与者使用我们提供的虚构信息。
所以 localStorage 是唯一的存储，数据保护（A7）的优先级因此上升。

开始前：
  git fetch origin
  git checkout -b fix/s2-safety origin/integration/v1.1-fix
  npm ci

## 你要做的四件事

A7【最重要】数据保护。src/data/store.tsx:247-258：
    schemaVersion 不等就直接 seedDemo()，没有迁移、没有备份、没有提示、没有导出。
    这个版本号已经被改过 3 次（3→4→5），每次都意味着所有用户输入无声消失。
    同一个 catch（:254-256）还把 JSON 解析失败也吞掉。
    :260-266 的保存失败（QuotaExceededError）也是静默的。
    → (a) 版本不匹配时，把旧数据原样另存到一个带版本号的 key，不要丢。
    → (b) 保存失败时在界面上显式提示（不能静默）。
    → (c) 加一个「Export my data」按钮，把当前状态下载成 JSON。
         放在 Settings 页，不要放顶栏。

A7b【新增，Juanxi 2026-10-27 决定】交互日志。
    src/data/store.tsx:104-245 是一个 switch，覆盖全部约 40 种操作，是唯一的写入点。
    → 在这里加一张只追加的事件日志，写进同一个 localStorage：
      { seq, at (真实时间戳 Date.now()), actor (viewerId), type (action 类型),
        payload (精简后的参数), before (被改字段的旧值，只对有旧值的操作) }
    → 注意：这是全仓库唯一可以用真实时钟的地方。界面上显示的日期仍然必须走
      state.today（固定演示时钟），不要混。
    → 上限：保留最近 2000 条，超了丢最旧的（localStorage 配额有限）。
    → 让上面 A7(c) 的 Export 按钮把这份日志一起导出。
    → 这是 Juanxi 论文里 data governance 的证据，所以字段要完整、要能重建顺序。
    → 补单元测试：做 5 个不同操作，断言日志有 5 条、顺序对、before 值对。

A8 服务器端收口。11/4 要关掉 Netlify 访问保护发招募邮件，那一刻 /api/* 就暴露在
    公网，而现在它无鉴权、无限流、单请求可塞 400KB。
    → (a) netlify/functions/chat.mts:29 的 body 上限 400_000 → 40_000
    → (b) 删掉这四个端点：netlify/functions/pool.mts（完全死代码，SPA 从不调用）、
          parse-brief.mts、plan-draft.mts、classify.mts（只被废弃的 /legacy/ 调用）
    → (c) 删掉 public/legacy/ 整个目录。它已经半坏了（在调 6 个根本不存在的端点），
          但仍公开可访问且会烧同一把 AI key。
          ⚠️ 删之前先确认：git log 里它的历史完整保留（Juanxi 可能要参考 v0.1 的设计，
          S7 会用到）。在交接记录里写明「v0.1 的代码可以用
          `git show 49b0b89:public/index.html` 取回」并核实这个命令真的能跑。
    → (d) 加按 IP 的限流。优先用 Netlify 自带的能力（在 netlify.toml 里声明）；
          如果当前方案不支持，就在 netlify/lib/http.mts 里加一个进程内的简单限流，
          并在交接记录里诚实说明它的局限（函数实例重启就清零）。
    → (e) 在 netlify/lib/ai.mts 里给每次调用记一行用量日志：
          provider / model / 输入输出 token（如果供应商返回）/ 耗时 / 端点名。
          ai.mts:110,118,131 已经在算耗时了。
          ⚠️ 日志里绝对不能出现 key、token、用户内容。

A9 日历过期。src/engine/calendar.ts:15-60 的 ASU 学年数据只到 2027-05-08。
    用完之后 studentOffReason(:80-86) 会把每一天都判成「学期之间」，于是倒推日期
    一路往前跳。已复算验证：2027-10-15 的活动倒推 14 个学生工作日会算出
    2027-04-13（正确答案 2027-09-27，错了整整 6 个月），而且不报任何错。
    → (a) 补 2027–2028 学年的 TERMS / FINALS / HOLIDAYS / BREAKS。
          每一条都要有官方来源 URL，并同步更新 docs/RULES.md 末尾的日历来源段
          （AGENTS.md 第 4 节要求规则和文档同改）。
          如果查不到官方 2027-2028 日历，不要编 —— 只做 (b)，并在交接记录里说明。
    → (b)【必做】在 src/engine/schedule.ts 的 issue 列表（:290-324、:326-343）里
          加一个新的 error 级 issue：任何计算涉及到已知日历范围之外的日期时，
          明确报错。让它坏得明显，而不是坏得安静。
    → (c) 补单元测试：把日期推到已知日历之外，断言 issue 出现。

## 文件边界（硬性）

你只能改：
  src/data/store.tsx, src/data/seed.ts, src/data/types.ts
  src/engine/calendar.ts, src/engine/schedule.ts
  netlify/**
  netlify.toml
  public/legacy/（删除）
  src/pages/Settings.tsx（只为加 Export 按钮；复用现有 .btn 类，不写新 CSS）
  docs/RULES.md（只改日历来源段）
  src/test/** 和 e2e/** 里对应的测试
  docs/PROGRESS.md（只加交接记录）

你绝对不能改：
  src/styles.css           ← S3 独占
  src/components/**        ← S1 独占（Settings.tsx 的按钮是例外，但只准加按钮）
  src/pages/Tasks.tsx, src/data/board.ts, src/main.tsx  ← S1 独占
  src/lib/assistant.ts, src/lib/aiContext.ts, src/engine/forecast.ts,
  src/pages/Today.tsx, src/pages/Events.tsx             ← S3 独占

## 验收

- npm run check 全绿
- 原有测试一条都不能删、不能改宽松
- A7 的测试要包含：版本不匹配时旧数据被保留、保存失败时有提示
- A9(b) 的测试要包含：超出日历范围时报错
- 删端点之后，e2e 里如果有测试引用它们，一起清掉并说明

## 结束时

1. docs/PROGRESS.md 交接记录加一行（做完什么 / 还剩什么 / 怎么验收 / 已知问题）
2. 提交信息：[S2][Claude] 简短说明
3. git push -u origin fix/s2-safety
4. 不要合并。不要碰 main。
5. 用简单中文向 Juanxi 汇报。特别要说清楚两件事：
   (a) 交互日志导出的格式长什么样（他要写进周四的 IRB 材料）
   (b) 限流实际做到了什么程度、局限是什么
```

---

### S3 · 响应速度与质感 ｜ Opus 5.5 ｜ 可与 S1/S2 并行

```
你在 Platypus Officer Hub 仓库里负责一个有判断成分的工作包：让界面"感觉快"，
并处理项目负责人 Juanxi 明确提出的一个视觉要求。Juanxi 不写代码。

先读（按顺序，必读）：
1. AGENTS.md —— 特别是第 7 节界面规则
2. docs/AUDIT_2026-10-27.md —— 全文，重点第 4、8 节
3. docs/EXECUTION_PLAN_2026-10-27.md 第 1.1 和 1.2 节 —— 那是 Juanxi 的原话和
   已经核实过的证据。你是 S3。

Juanxi 的原话：「我最怀念第二版的响应速度，真的很快，不需要等。」
以及：「蓝框太引导性了，感觉像引导式访问或者辅助功能，先去掉。我更需要简洁、
高级、不出错。」

开始前：
  git fetch origin
  git checkout -b fix/s3-perf origin/integration/v1.1-fix
  npm ci

## P1 · 去掉 300 毫秒的悬停延迟【确定要做，1 行】

src/styles.css:471 和 :572：
  transition: opacity .12s ease .3s, visibility 0s linear .42s;
鼠标停上去要等 300ms 才开始淡入，总共 420ms 才看见。移开也要 420ms。

已验证：v0.1（Juanxi 喜欢的那版）的全部过渡是 .15s / .2s，一个延迟都没有。
git log -S 确认这个延迟是 5bde479「v1.1 简化改版」引入的 —— 正好是他开始不喜欢
的那一版。

→ 延迟改成 0 或极短（≤80ms，防误触），淡入时间对齐 v0.1 的 .15s。
→ 同时检查全仓库还有没有别的 transition-delay 或过长的动画，一并处理。
→ 注意 e2e 里有悬停测试，它们可能依赖这个延迟（等待时间写死）。一起改。

## P2 · 预测只算一次【确定要做】

computeForecast 有 5 个互不共享缓存的调用点：
  src/pages/Today.tsx:19     useMemo(..., [state])
  src/pages/Events.tsx:28    useMemo(..., [state])
  src/lib/aiContext.ts:18
  src/lib/assistant.ts:72
  src/lib/assistant.ts:82    ← 同一次 AI 回答里算了两次
每次都要先跑一遍完整的 computeSchedule，再模拟 1000 次。发一条 Ask 消息 = 3 次。

→ 收敛成一个单一来源（建议：挂在 store 的 context 上，按 state 记忆化一次）。
→ 对纯函数调用点（assistant.ts / aiContext.ts 不在 React 树里）也要能复用同一份
  结果，不要只修 React 那两处。
→ 顺手量一下 store 每次改动的 JSON.stringify 开销（store.tsx:262,278 全量序列化）。
  如果明显，做节流（但不能丢数据 —— 页面关闭前必须落盘）。
→ ⚠️ forecast.ts 是固定种子的纯函数，输出必须和现在逐位相同。
  src/test/forecast.test.ts 的确定性断言必须继续通过。不要改算法，只改调用方式。
→ 加一个测试证明一次 state 变化只触发一次 computeForecast（可以用 spy 计数）。

## P3 · 蓝框【Juanxi 已提供截图，已定位】

截图内容：Settings 页 `Submit budget request` 的数字输入框，获得焦点时外面一圈亮蓝。

⚠️ 已核实的事实，必须读懂再动手：

**那个蓝不是本项目的颜色。**
  src/styles.css:53 是本项目唯一的焦点样式：
    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
  --accent = #0f766e，青绿色，不是蓝色。
  而且全仓库没有任何针对 input / select / textarea 的焦点样式，也没有任何处理
  浏览器原生焦点环的代码（grep webkit|focus-ring|outline: *none 只命中两处 h2:focus）。

→ 所以那是**浏览器自己给表单控件画的原生焦点环**。Juanxi 说它是「苹果的」，很可能
  字面意义上就是 —— macOS / Safari 对表单控件有自己的蓝色焦点环，作者的 outline
  盖不住它。

**第一件事：问 Juanxi 用的是 Safari 还是 Chrome。** 两者修法不同。

### 不能简单删掉焦点样式

- :focus-visible 只对键盘用户显示，鼠标点击不触发（文本/数字输入框是规范里的例外，
  它们点击时也匹配 —— 这正是截图里那一下）
- 它是 WCAG 2.4.7 的硬要求，删了 e2e/a11y.spec.ts 直接失败
- ASU 有无障碍政策，论文里不能写「我们删掉了键盘可见性」

### 改法

  /* 1. 关掉表单控件的原生环 */
  input:focus, select:focus, textarea:focus { outline: none; }

  /* 2. 换成我们自己的、低调的环 */
  input:focus-visible, select:focus-visible, textarea:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

Safari 可能还需要处理 -webkit-appearance / 数字输入框 spinner。以 Juanxi 的浏览器
实测为准 —— 改完请他在自己的浏览器里再点一次那个输入框确认。

### 顺带处理偏重的「选中态」

  styles.css:560  .m-node.is-selected .m-dot { outline: 3px solid var(--accent); outline-offset: 3px }
                  ← 20px 的圆点套 3px 粗、离 3px 远的环，环几乎和圆点一样大
  styles.css:686  .heat-cell.all { outline: 2px solid var(--accent-ink); outline-offset: -1px }
  styles.css:240  .flow-step.is-selected { box-shadow: ... }   ← 死代码（泳道图已删），直接删

→ 粗外环换成淡背景 + 1px 边框（Linear / Notion / monday 的做法）。

### 验证（必做）

改完只用键盘 Tab 走一遍 Today / Tasks / Events / Settings，每一步都要能看出焦点在哪。
看不出来就是改坏了。然后重跑 e2e/a11y.spec.ts。

## P4 · 顺手的质感问题（在上面三条做完之后，有余力再做）

- styles.css:340 有一条死代码 .forecast { margin: .5rem 0 }，来自已删除的组件，
  导致今天每个风险圆点都背着 8px 上下外边距。删掉。
- styles.css:489 引用了一个全仓库从未定义过的变量 --st-now，所以流程图的"当前"
  圆点永远落回硬编码的蓝色，Settings 里改颜色不生效。
  ⚠️ 这一条的正式修复属于 S5（token 表）。你只要在交接记录里写清楚，不要动。

## 文件边界（硬性）

你独占 src/styles.css —— S1 和 S2 都被禁止改它。如果他们在交接记录里留了
styles.css 的需求（比如 S1 的 A1 pointer-events），你负责接手。

你只能改：
  src/styles.css
  src/pages/Today.tsx, src/pages/Events.tsx
  src/lib/assistant.ts, src/lib/aiContext.ts
  src/engine/forecast.ts（只改调用方式/记忆化，不改算法）
  src/data/store.tsx 里和 forecast context 相关的部分
    ⚠️ store.tsx 由 S2 独占。如果你必须改它，先看 S2 有没有推送；
       冲突就写进交接记录，让 Juanxi 安排顺序，不要强行改。
  src/test/** 和 e2e/** 里对应的测试
  docs/PROGRESS.md（只加交接记录）

你绝对不能改：
  src/components/NodePanel.tsx, src/pages/Tasks.tsx, src/data/board.ts,
  src/components/Layout.tsx, src/main.tsx   ← S1 独占
  netlify/**, src/engine/calendar.ts, src/engine/schedule.ts  ← S2 独占
  src/components/ui/statusDefaults.ts        ← S5 独占（token 归一）

## 验收

- npm run check 全绿
- forecast 的确定性测试必须逐位通过
- 新增一个测试证明 forecast 每次 state 变化只算一次
- 人工：桌面和手机各走一遍 Today / Events / Tasks，悬停要立刻有反应
- ⚠️ Juanxi 日常用的是**深色模式**，所有人工检查都要在深色模式下做一遍
- 键盘 Tab 全程焦点可见

## 结束时

1. docs/PROGRESS.md 交接记录加一行
2. 提交信息：[S3][Claude] 简短说明
3. git push -u origin fix/s3-perf
4. 不要合并。不要碰 main。
5. 用简单中文向 Juanxi 汇报。特别说清楚：
   (a) 现在悬停/点击比之前快了多少（给具体毫秒数）
   (b) 蓝框那件事你查到了什么、你改了哪个、为什么没有删 :focus-visible
```

---

### S4 · 删死代码 ｜ Sonnet 5.5 ｜ 必须在 S3 合并之后

```
你在 Platypus Officer Hub 仓库里做一件纯粹的清理工作。这是 ASU 荣誉论文的 Phase 3
原型，项目负责人 Juanxi 不写代码。这个工作包不改变任何用户可见的行为。

先读：
1. AGENTS.md
2. docs/AUDIT_2026-10-27.md 第 4.1、4.2 节（死代码的完整清单）
3. docs/EXECUTION_PLAN_2026-10-27.md 第 3 节 —— 你是 S4

背景：src/styles.css 被 11 次提交写成，每一次的 diff 都是「+N / −0」，历史上从未
删除过任何一行 CSS。那次叫「简化改版」的提交（5bde479）加了 341 行、删了 0 行 ——
它删掉了泳道图和甘特图的 React 代码，但留下了它们全部的样式。

⚠️ 先确认 S3 的 fix/s3-perf 已经合并进 integration/v1.1-fix，否则你和它会在
styles.css 上冲突。没合并就停下来告诉 Juanxi。

开始前：
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # 确认有 [S3] 的提交
  git checkout -b design/s4-deadcode origin/integration/v1.1-fix
  npm ci

## 你要做的

1. 自己重新测一遍死代码，不要照抄审计报告的清单（代码可能已经被 S1-S3 改过）。
   方法：提取 src/styles.css 里所有 class 选择器，逐个在 src/**/*.{ts,tsx} 和
   public/**/*.html 里按词边界搜索。把脚本留在 scripts/ 下面，这样以后能重跑。

2. 删掉确认无引用的规则块。审计报告测到的是 62 个死 class / 84 条规则块 /
   329 条声明（约 16% 的 CSS），按代际分布：
     - v1 泳道图（flow-* / react-flow*，14 个）—— FlowChart.tsx 已删
     - v1 甘特图（gantt-*，10 个）—— Gantt.tsx 已删
     - v1 第一代状态色（st-*，9 个）—— 已被 StatusPill 取代
     - WP0/WP2 遗留（coming / demo-strip / step-strip / star-card 等，14 个）
     - WP3/WP4/WP5 遗留（task-list / board-column / funding-pipeline 等，12 个）
     - 其他 3 个
   ⚠️ 如果 Juanxi 后来说要恢复甘特图（执行方案 C5），gantt-* 的样式可能还有用。
     → 不要直接删 gantt-*，把它们整段移到文件末尾一个
       /* ---- 保留：甘特图样式，等 C5 决定 ---- */ 的注释块里，并在交接记录里说明。
     → 其余的照删。

3. 删掉 src/pages/helpers.tsx 里零引用的死导出：
   STATUS_LABEL(:6-13)、statusOf(:16)、statusClass(:21)、personName(:33)、
   initials(:35)。先各自 grep 确认真的零引用。
   注意 statusOf/statusClass 是「第二代状态语义」，删掉它们是在消除审计报告
   第 4.3 节那 4 套配色语言里的第 2 套。

4. 反向问题：有 7 个在 TSX 里写了但 CSS 里完全没有规则的 class：
   card-text（src/components/rail/AskPanel.tsx:123，AI 每条文字回复的容器，
   完全无样式）、nudge-panel、task-gantt、info-wrap、todo、m-start、m-end。
   → 逐个判断：是漏写样式（那就是 bug，记进交接记录给 S5），还是多余的 class
     （那就从 TSX 里删掉）。不要擅自加新样式 —— 那是 S5 的事。

5. src/components/ui/index.tsx:93 导出了一个 Empty 组件，但 16 个页面全在手写
   <p className="empty">。
   → 把这些手写的换成 <Empty>。位置：Today.tsx:41,81 / Tasks.tsx:70,136 /
     Events.tsx:34 / Funding.tsx:67,76 / Partners.tsx:58,68 / Rules.tsx:38 /
     Handoff.tsx:73 / Settings.tsx:126 / rail/Rail.tsx:61 / FollowupPanel.tsx:18 /
     BoardSettings.tsx:18
   → 只做这一个替换，不要顺手改别的。

## 硬性要求

- **不改变任何用户可见的行为。** 这是纯删除 + 一次等价替换。
- 每删一组，跑一次 npm run check。全绿再删下一组。
- 分多次提交，一组一个提交，这样出问题好回退。
- 删完后报告：styles.css 从 714 行降到多少行、消掉了多少处重复声明冲突
  （审计报告测到 23 处，其中重复的那一半大多是死的，应该会自动消掉一批）。
- ⚠️ 删之前跑一次 npm run build && npx playwright test，记下基线。删完对比。
- ⚠️ 视觉回归：这个项目没有视觉回归测试。所以你删完之后必须人工截图对比
  10 个页面（桌面 + 手机）。用 scripts/word-count.mjs:30 已有的截图能力，
  或自己写一个临时脚本（放 scratchpad，不要提交）。任何一处看起来变了就是删错了。

## 文件边界

你只能改：
  src/styles.css
  src/pages/helpers.tsx
  各 page 和 component 里把 <p className="empty"> 换成 <Empty> 的那几行
  被判定为多余 class 的那几行 TSX
  scripts/（加死代码检测脚本）
  docs/PROGRESS.md（只加交接记录）

不要改：任何逻辑、任何 netlify/**、任何 src/engine/**、任何测试的断言

## 结束时

1. docs/PROGRESS.md 交接记录加一行，必须包含：
   - 删了多少行、哪些代际
   - gantt-* 保留在哪里
   - 第 4 条发现的「漏写样式」清单（交给 S5）
2. 提交信息：[S4][Claude] 简短说明
3. git push -u origin design/s4-deadcode
4. 不要合并。不要碰 main。
5. 用简单中文向 Juanxi 汇报，重点说：界面应该看不出任何变化，如果他看出变化了
   就是我删错了，请他告诉我哪一页。
```

---

### S5 · Token 表（设计系统）｜ Opus 5.5 ｜ 必须在 S4 之后

```
你在 Platypus Officer Hub 仓库里补一份这个项目从来没有过的东西：设计系统的
最小交付物。这是 ASU 荣誉论文的 Phase 3 原型，项目负责人 Juanxi 不写代码，
也不懂设计术语。

先读（全部必读）：
1. AGENTS.md —— 特别是第 7 节界面规则
2. docs/AUDIT_2026-10-27.md —— 全文。第 4 节是你的工作说明书，第 8 节是对比度数据
3. docs/EXECUTION_PLAN_2026-10-27.md 第 1.2 节 —— Juanxi 对视觉的唯一明确要求
4. docs/PROGRESS.md 最上面 S4 的交接记录 —— 他给你留了一份「漏写样式」清单

## 为什么要做这件事

这个项目跳过了标准流程的第 3 步（视觉方向）和第 4 步（设计系统与组件规范）。
AGENTS.md 第 7 节那 6 条「界面规则」是 2026-10-23 在所有页面写完之后追认的，
它只有「三栏 / 5 个组件 / 字数上限」这种清单，没有任何色阶、字阶、间距阶、层级。

结果（审计实测）：23 种字号、22 种间距值、14 种圆角、14 个裸 z-index，
而字号、间距、层级的 token 一个都没有。同一份数据上跑着 4 套互不相通的状态配色。

Juanxi 说他「说不上哪里好也说不上哪里坏」—— 因为界面里确实没有任何一条可以被
陈述的规则。你的工作就是让它有。

Juanxi 对视觉的唯一明确要求：**简洁、高级、不出错。** 不要引导性太强的东西。

⚠️ 先确认 S4 的 design/s4-deadcode 已经合并进 integration/v1.1-fix。没合并就停下。
   先删死代码再建 token 能省掉一大半工作（19.7% 的 CSS 是死的，不用映射）。

开始前：
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # 确认有 [S4] 的提交
  git checkout -b design/s5-tokens origin/integration/v1.1-fix
  npm ci

## ⚠️ 最重要的一条约束：不要改变现在的样子

2026-10-27 Juanxi 发来截图确认：**他喜欢现在这一版的外观**（v1.2 深色模式）。
见本方案第 1.4 节。

所以你的任务**不是重新设计，是把现在这个样子用一套规则重新表达一遍**。
做完之后界面应该看起来**几乎一模一样**，只是从「23 种随机字号」变成「6 个档位」。

- 不要"改进"配色、不要调整布局密度、不要换字体、不要改圆角风格
- 每一次映射都应该是「最接近的那一档」，不是「我觉得更好的那一档」
- 唯一允许明显改变视觉的地方：对比度不合格的那几处（第 3 条），以及
  10px / 10.5px 这种过小的字号（AGENTS.md §7.4 要求不小于 14px，现在被违反得很厉害）
- 如果某个映射会让界面明显变样，**先截图问 Juanxi**，不要自己决定

## ⚠️ 第二条：深色模式是第一现场

Juanxi 日常用深色模式。而审计第 8.2 节发现 6 个状态色**没有深色变体**，在深色背景上
对 surface 只有 2.96–3.65:1；--line 对 surface 只有 1.30:1。

→ 每一组改动都要在深色模式下先看，再看浅色。不是「顺带也看一下」。

## 你要做的

### 1. 补齐缺失的三个阶 + 层级

现有 :root（styles.css:3-27 和 :357）已有 18 个颜色 token、3 个字体族、1 个阴影、
1 个圆角、3 个布局宽度。缺的是：

- **字阶 6 级**：--fs-xs:12 / --fs-sm:13 / --fs-base:15 / --fs-lg:17 / --fs-xl:20 / --fs-2xl:26
  把现有 23 种字号（10 / 10.5 / 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 /
  15 / 16 / 17 / 18 / 19 / 20 / 21 / 22 / 26 / 28px / clamp / .8rem / .95rem）
  逐个映射进去。每一个都是判断题，不要机械四舍五入 —— 10px 和 10.5px 这种
  本来就太小（AGENTS §7.4 要求字号不小于 14px，现在被违反得很厉害），
  往上提到 --fs-xs 而不是新开一档。
  ⚠️ 这一条会改变视觉。改完逐页截图给 Juanxi 看。

- **间距阶 6 级**：--s1:4 / --s2:8 / --s3:12 / --s4:16 / --s5:24 / --s6:32
  现有 22 种值（1,2,3,4,5,6,7,8,9,10,11,12,14,16,18,19,20,22,24,28,40,48）
  吸附到最近档位。5/7/9/11/19 这些破 4px 栅格的要特别注意。
  padding 有 69 种不同写法，gap 有 24 种 —— 一起收。

- **圆角 3 级**：--r-sm:8 / --r-md:12 / --r-lg:14（+ 999px 药丸 + 50% 圆）
  消掉 3/4/5/6/9/10px。现有唯一的 --radius token 只被用了 7 次，而 8px 被硬写
  16 次、10px 15 次。

- **层级 5 级**：--z-sticky:20 / --z-overlay:40 / --z-rail:55 / --z-menu:60 / --z-tip:70
  现有 14 个裸数字（0,1,2,3,4,5,6,20,40,45,50,55,60,70），靠人脑记。

### 2. 状态色归一【最重要的一条】

审计报告第 4.3 节：品牌 token 和状态色是两套无关的色系，有 3 对「同义不同色」：

| 含义 | 品牌 token | 状态色 |
|---|---|---|
| 迟了/卡住 | --late #b42318 | blocked #c0362f |
| 完成 | --good #1a7f37 | done #237a42 |
| 注意/进行中 | --warn #8f5206 | in_progress #b25c00 |
| 待办 | （不存在）| accepted #3a6fd8 ← 蓝色在整个 token 表里没有 |

而且 git show 3d68221 显示这 6 个状态色原本是 monday.com 的
#7d8682 #d97b06 #d23f37 #2b9550，2026-10-23 为了过对比度被逐个调暗成现在的值。
**它们是从外部产品照抄 + 事后微调出来的，从来没和本项目的色系（青绿 #0f766e）对齐过。**

→ (a) 消掉这 3 对重复：每个含义只留一个值。
   ⚠️ 不能简单取其一 —— 6 个状态色现在全部通过 WCAG AA（4.72–5.82:1，
   审计报告第 8.1 节有实测值），而品牌色那三个未必。改完每一个都要重算对比度
   并在交接记录里列出数字。低于 4.5:1 的不准用。
→ (b) 给蓝色补一个 token（--info 或类似），别让它继续是个游离的 #3a6fd8。
   同一个蓝现在被硬写在 4 处：statusDefaults.ts:7、styles.css:489、:554、:556。
→ (c) 给 6 个状态色各补一个深色模式变体。现在它们在深色界面上对 surface
   只有 2.96–3.65:1（审计第 8.2 节），是一组为白底设计的深色实心块。
→ (d) 定义 --st-now（styles.css:489 引用了它，但全仓库从未定义），并让
   src/components/flow/MetroChart.tsx 的圆点颜色走 useStatusStyles() 而不是 CSS。
   现在 Juanxi 在 Settings → Board 里改「To do」的颜色，Today 的进度链和流程图
   的圆点都不会跟着变 —— 这是个可演示的 bug。
→ (e) src/pages/Handoff.tsx:61 把 #237a42 / #3a6fd8 / #5f6763 硬编码进行内样式，
   所以改名改色不会同步到交接接力卡。改成走 token。

### 3. 修对比度不合格的地方

审计第 8.2 节实测，文字类有 1 处不合格：
  --good #1a7f37 on --good-soft #e3f4e7 = 4.44:1（差 0.06）
  用在 .tag.good（ChangeCard 的 "Approved" 标签）和 .save-status.ok
  styles.css:707 已经用硬编码 #146c2e 单独修了 .days.good 一个实例 ——
  **这正是 23 处重复声明的来源：修了症状没修 token。**
→ 改 token，然后删掉 :707 那个单点补丁。

非文字类（WCAG 1.4.11，要求 3:1）有 5 处不合格：
  黄色风险点 #e3a008 on 白 = 2.26:1   ← 三色风险系统里只有黄色不合格，
                                        而黄色是色弱用户最依赖的那一档
  Team 工作量中档条 = 1.74:1
  Metro 主线未完成段 = 1.85:1
  Chain/Metro 空心点边框 = 2.59:1
  全站 1px 边框 --line on 白 = 1.29:1
→ 前四个必须修到 ≥3:1。
→ 最后一个（--line）要谨慎：把它加深会让整个界面变"重"，和 Juanxi 要的
  「简洁、高级」相反。建议：边框保持淡，但凡是靠边框传达状态/可交互性的地方，
  额外加一个非颜色线索（粗细、背景、图标）。在交接记录里说明你的权衡。

### 4. 写一份人能读的 token 文档

新建 docs/DESIGN_TOKENS.md（中文，给 Juanxi 看的）：
- 每个阶有哪几档、什么时候用哪一档
- 6 个状态色的含义、色值、对比度数字
- 一句话规则：「新增任何样式只能用 token，不准写死数值」
这份文档就是这个项目缺失的「第 4 阶段交付物」。以后每个 AI 改界面前先读它。

## 硬性要求

- ⚠️ 这个工作包会改变视觉。**每改一组就逐页截图**（10 个页面 × 桌面/手机 ×
  浅色/深色），改完把前后对比交给 Juanxi。他是唯一的验收人。
- 原则上只改 CSS。例外是 statusDefaults.ts / MetroChart.tsx / Handoff.tsx 这三个
  为了让颜色走 token 必须动的地方。不要顺手重构别的 TSX。
- 不要改任何布局结构、不要动组件层级、不要改文案。
- npm run check 全绿，a11y 测试必须继续通过。
- 分多次提交：一个阶一个提交（字阶 / 间距阶 / 圆角 / 层级 / 状态色 / 对比度），
  这样出问题好回退。

## 文件边界

你只能改：
  src/styles.css
  src/components/ui/statusDefaults.ts
  src/components/flow/MetroChart.tsx（只改颜色来源）
  src/pages/Handoff.tsx（只改第 61 行那三个硬编码色）
  docs/DESIGN_TOKENS.md（新建）
  docs/PROGRESS.md（只加交接记录）
  S4 交接记录里点名的「漏写样式」（比如 AskPanel 的 card-text）

不要改：任何逻辑、netlify/**、src/engine/**、src/data/**、测试断言

## 结束时

1. docs/PROGRESS.md 交接记录加一行，必须包含：改完后的对比度数字表
2. 提交信息：[S5][Claude] 简短说明
3. git push -u origin design/s5-tokens
4. 不要合并。不要碰 main。
5. 用简单中文向 Juanxi 汇报，并且必须附上前后截图对比。问他一个具体问题：
   「现在看起来是更整齐了，还是只是变了？」—— 如果他说"只是变了"，说明映射
   做得不对，要回去调。
```

---

### S6 · 护栏（lint + CI + 无障碍）｜ Sonnet 5.5 ｜ 必须在 S5 之后

```
你在 Platypus Officer Hub 仓库里装护栏。这是整个计划里最重要的一个工作包 ——
不是因为它改了什么，而是因为它防止下一个 AI 重复过去三天发生的事。

先读：
1. AGENTS.md
2. docs/AUDIT_2026-10-27.md 第 4.1 节（样式表的历史）和第 8.3、8.4 节
3. docs/DESIGN_TOKENS.md（S5 刚写的，这是你要强制执行的东西）
4. docs/EXECUTION_PLAN_2026-10-27.md 第 3 节 —— 你是 S6

## 为什么要做这件事

src/styles.css 被 11 次提交写成，每一次的 diff 都是「+N / −0」，从未删除过任何
一行。五个 AI 各自往文件尾部追加自己那一代的样式，靠「写在更下面」覆盖前一层。
结果是 23 个重复声明的选择器、62 个死 class、4 套配色语言。

S4 和 S5 刚把这些清理干净。**如果不装护栏，下一个 AI 会在一周内让它回到原样。**

而且现在的 CI 完全管不住这些：.github/workflows/ci.yml 只跑 build / test / e2e，
没有 ESLint、没有 Stylelint。GitHub Actions 和 Netlify 还是两条互不相干的流水线 ——
推 main 就上线，测试失败也不会阻止部署。

⚠️ 先确认 S5 的 design/s5-tokens 已经合并进 integration/v1.1-fix。
   没有 token 表，linter 规则无从写起。

开始前：
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # 确认有 [S5] 的提交
  git checkout -b design/s6-guardrails origin/integration/v1.1-fix
  npm ci

## 你要做的

### 1. Stylelint + 3 条规则

装 stylelint，配置至少这三条：
- font-size / border-radius / z-index **只能用 token**
  （declaration-property-value-allowed-list 或等价规则）
- 除 :root 之外**禁止 hex 颜色**（color-no-hex 加例外）
- **禁止重复选择器**（no-duplicate-selectors）—— 这一条直接防住那 23 处冲突回来

→ 先跑一遍看有多少违规。S5 做完应该已经很干净了；如果还有残留，修掉，
  不要用 ignore 绕过。
→ 实在有合理例外（比如数据驱动的内联变量），用行内 disable 注释并写明理由。

### 2. ESLint + 禁止行内 style

审计发现 21 处行内 style={{...}}，其中约 8 处是用来推翻前面 CSS 的临时补丁
（Help.tsx:23、NodePanel.tsx:125、AskPanel.tsx:144、TaskDetail.tsx:34、
Team.tsx:39、BoardSettings.tsx:27 等）。

→ 装 eslint + typescript-eslint + eslint-plugin-react
→ 禁止行内 style，**但放开合法的 CSS 变量注入**（--pill / --tag / --a / --label-w /
  数据驱动的 left/width 这些是正当用法，大约 10 处）
→ 剩下那 8 处临时补丁：改成真正的 class。
  ⚠️ 这需要动 styles.css，而 S5 刚立好 token。新加的 class 必须只用 token。

### 3. 字数上限变成真约束

scripts/word-count.mjs 不在 CI 里，所以 AGENTS.md §7.5 的字数上限现在没有任何
自动约束。

更要紧的是 scripts/word-count.mjs:13-15 明确写了「跳过隐藏的悬停卡和关闭的
details」。**也就是说那个「每页字数减 60%」的成绩有一部分是度量方式的产物 ——
信息量没减少，只是搬到了触屏用户看不到的地方。**

→ (a) 改掉这个跳过行为，统计全部文字
→ (b) 加进 npm run check 和 CI
→ (c) ⚠️ 改完之后字数几乎肯定会超过 AGENTS.md §7.5 的上限
      （Today ≤160 / Events ≤180 / Rules ≤170 / Tasks ≤130 / Team ≤130 /
       Settings 每块 ≤125）。
      **不要为了过线去删文字** —— 那正是当初把解释藏起来的原因，而 Juanxi 现在
      的抱怨就是「看不懂每一块是什么」。
      → 正确做法：把真实数字量出来，写进交接记录，建议 Juanxi 调高上限或
        改变度量口径。这是个产品决定，不是技术决定，让他定。

### 4. 无障碍检查补上盲区

e2e/a11y.spec.ts 现在有两个盲区：
- :7 只用了 wcag2a + wcag2aa 标签，**不含 wcag21aa**，所以「1.4.11 非文字对比度」
  和「2.5.8 目标尺寸」这两条规则从未运行 —— 审计发现的 5 个对比度失败和 6 个
  过小触摸目标全在这个盲区里
- :9 有 test.skip(project !== "desktop")，**移动端从未被扫过**，而移动端恰恰是
  hover 不可用、布局最容易出问题的地方

→ (a) 加 wcag21a / wcag21aa 标签
→ (b) 去掉移动端的 skip
→ (c) 修出来的问题。触摸目标至少要修这 6 个（都要 ≥24×24）：
      .m-dot 20×20（styles.css:552，Events 的主交互）
      .heat-cell 高 14px（:685，Team 热力图）
      .swatch 20×20（:615，60 个取色按钮）
      .move-menu max-width 26px（:605，键盘用户唯一的改状态方式）
      .info ≈20×20（:476）
      .chain .dot 16×16 / compact 12×12（:487,493）
      ⚠️ 放大视觉尺寸会和「简洁」冲突。优先用透明的点击区扩展
        （::after 伪元素 / padding + 负 margin），保持视觉小、命中区大。
→ (d) 键盘测试现在只验证了 3 件事（/ 聚焦 Ask、Enter 开节点、Escape 关闭）。
      补上：Tab 顺序、右栏打开时的焦点管理、看板的键盘改状态。
      ⚠️ 右栏的焦点管理现在是半成品（审计第 4 节）：7 种详情里只有 3 种会移动焦点，
        没有焦点陷阱、关闭后焦点不返回，而且 ≤1199px 时右栏是遮挡式浮层，
        键盘 Tab 会穿进被遮住的内容。**全部修好可能超出这个工作包的范围** ——
        先把测试写出来（失败的用 test.fixme 钉住），修能修的，剩下的写进交接记录。

### 5. CI 门禁

现在推 main → Netlify 立刻上线，GitHub Actions 并行跑测试，**失败也不阻止部署**。

→ 把 stylelint / eslint / word-count 都加进 npm run check 和 ci.yml
→ 在交接记录里写清楚给 Juanxi 的操作步骤：怎么在 GitHub 仓库设置里开
  branch protection + required status checks（他要自己点，你没有权限）。
  写成「点哪里」的一步一步，不要用术语。

## 硬性要求

- npm run check 全绿（现在应该包含 5 项）
- 不要用 ignore / disable 绕过真实问题。实在要例外，逐条写明理由
- 不要改任何逻辑或文案

## 文件边界

你只能改：
  package.json, package-lock.json
  .stylelintrc*, .eslintrc*（新建）
  .github/workflows/ci.yml
  scripts/word-count.mjs
  e2e/a11y.spec.ts 和其他 e2e 测试
  src/styles.css（只为把行内 style 换成 class、修触摸目标）
  那 8 处有临时行内 style 的组件（只删 style 属性、换成 class）
  docs/PROGRESS.md（只加交接记录）

不要改：任何业务逻辑、netlify/**、src/engine/**、src/data/**

## 结束时

1. docs/PROGRESS.md 交接记录加一行，必须包含：
   - 字数的真实数字 vs AGENTS.md §7.5 的上限，以及你建议怎么办
   - 右栏焦点管理里哪些修了、哪些用 test.fixme 钉住了
   - 给 Juanxi 的 branch protection 操作步骤
2. 提交信息：[S6][Claude] 简短说明
3. git push -u origin design/s6-guardrails
4. 不要合并。不要碰 main。
5. 用简单中文向 Juanxi 汇报。重点说：从现在起，任何 AI 想往 CSS 里写死一个
   数值或颜色，CI 会直接拦住。
```

---

### S7 · 可解释性开关 + 可见副标题 ｜ Opus 5.5 ｜ 必须在 S6 之后

```
你在 Platypus Officer Hub 仓库里把这个项目最有论文价值的一个交互拿回来。
项目负责人 Juanxi 不写代码。

先读（全部必读）：
1. AGENTS.md
2. docs/AUDIT_2026-10-27.md 第 7.3、7.4 节 —— v0.1 有哪 3 个被丢掉的好设计
3. docs/DESIGN_TOKENS.md —— S5 立的 token 规则，你必须遵守
4. docs/EXECUTION_PLAN_2026-10-27.md —— 你是 S7

## 背景：你要恢复的是什么

v0.1 原型（Juanxi 最喜欢的那版）有一个全局开关叫 **"Behind the scenes"**
（旧代码：public/legacy/index.html 的 :396 输入框、:925 的 bts() helper、
:1669 的 html.show-bts 切换）。

打开它，界面上**每一个数字、每一个日期、每一个 AI 输出都就地标注它的来源**：

  "Rule engine / startBy = finish-by date minus 2–3 business days"
  "Computed / sum(task.minutes) for open tasks starting within 14 days"
  "AIR Verdicts / choice: done|waiting|help|other · POST /api/replies/classify"

今天这一个机制被拆散成了 15 个 details 折叠 + 几十张悬停卡 + 一个 Help 页。

**对一篇要论证 AI 可解释性的荣誉论文来说，丢掉的正是最有论文价值的那个交互。**

⚠️【2026-10-27 更正，必读】审计报告原本推断「Juanxi 怀念的是旧版的布局」。他后来
发来截图确认 **他喜欢的就是现在这一版**（见本方案第 1.4 节），所以那个推断被否定了。

→ 你做 C1 的理由因此改变：**不是「找回他怀念的东西」**，而是：
   ① 论文需要可解释性的证据
   ② 触屏用户看不到悬停卡里的内容（审计第 8.4 节，4 处 hover-only）
→ 所以 C1 是**增量添加**，不是回退。不要改动现有布局的任何视觉。

⚠️ public/legacy/ 可能已被 S2 删除。用 git 取回参考：
    git show 49b0b89:public/index.html > /tmp/v01-reference.html
  （先核实这个 commit 和路径是对的；如果不对，用 git log --all --oneline -- public/
   自己找。S2 的交接记录里应该写了正确的命令。）

## 好消息：素材全都在

今天的数据结构里已经有全部解释文字，不需要重新生成：
  node.why
  sched.nodes[id].explain.{latestStart, club, official}   ← schedule.ts:44，每个日期都带一句「为什么」
  forecast.reasons + FORECAST_ASSUMPTIONS（forecast.ts:6-12）
  change.source
  rule.sources + rule.checkedOn
  contribution 的来源
你只需要把它们就地显示出来。

开始前：
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # 确认有 [S6] 的提交
  git checkout -b feat/s7-explain origin/integration/v1.1-fix
  npm ci

## C1 · Behind-the-scenes 全局开关

→ 在顶栏加一个开关（src/components/Layout.tsx）。
  ⚠️ 顶栏已经有 5 个控件，其中 3 个是演示脚手架（Demo 菜单、View as、AI features），
    审计第 8.6 节指出「60% 的全局界面是演示工具」。不要让它变成第 6 个。
    建议：和 AI features 开关归进同一个菜单，或者放进 Demo 小标里。你判断。
→ 打开后，每个数字/日期/AI 输出旁边就地显示来源（来源 + 一行算法说明）。
  参考 v0.1 的 bts() 写法，但用今天的 token 和组件。
→ 关闭时完全不占空间，也不进 DOM（不要只是 visibility: hidden —— 那会让
  屏幕阅读器读到，也会被 word-count 统计到）。
→ 这个开关的状态存 localStorage，刷新后保持。

**这一条同时解决三个问题：**
1. 触屏用户看不到悬停卡里的内容（审计第 8.4 节，4 处 hover-only）
2. Juanxi 说「看不懂每一块是什么」
3. 论文的可解释性论点

## C2 · 把 10 个「问题」变成可见文字【降级：先问 Juanxi】

⚠️ Juanxi 从未抱怨过「看不懂页面」—— 这一条是审计员的改进建议，不是在修 bug。
而且他已确认喜欢现在的外观。

→ **做之前先问他**：给他看一张加了副标题的效果图（可以是手绘或改一页做示范），
  问他要不要。他说要再做，说不要就跳过，只做 C1。
→ 不要默认开工。

src/routes.ts:13-24 给每个页面定义了「这一页回答的那一个问题」，这是项目 IA 的骨架。
但 src/components/Page.tsx:4 的注释说「The page's question is the nav tooltip」，
src/components/Layout.tsx:75,81 把它放进 title={p.question} —— **浏览器原生 tooltip，
要悬停 1 秒才出现，触屏上完全不存在。**

IA 的骨架被降级成了一个看不见的属性。而 Page.tsx:9 只渲染一个词的页面标题。

→ 把 question 变成可见的副标题：PageHead 的标题下面一行。
→ 用 --fs-sm + --muted，不要抢主标题。
→ ⚠️ 这会增加字数，可能撞 S6 刚加进 CI 的字数上限。
  S6 的交接记录里应该有关于上限怎么调的建议。如果还没定，**停下来问 Juanxi**，
  不要自己改 AGENTS.md §7.5 的数字（那是他批准过的规则，改要他同意）。
→ 顺手修 IA 的一个问题：routes.ts 里有 3 页的「一个问题」其实是 2–3 个问题
  （/team「谁超载、谁该被认可、什么时候能开会」= 页面上 3 个无关卡片；
   /funding 和 /events 同样）。
  → 不要重构页面。只把问句改写成一句真正单一的话，并在交接记录里告诉 Juanxi
    这 3 页其实该拆，留给以后。

## 硬性要求

- 遵守 docs/DESIGN_TOKENS.md。不准写死任何数值或颜色（S6 的 stylelint 会拦你）
- npm run check 全绿，包括新加的 stylelint / eslint / word-count
- 新交互要有 e2e 测试：开关能开、能关、刷新后保持、关闭时内容不在 DOM 里
- a11y 测试继续通过，桌面和移动端都要
- 不要改 AGENTS.md / PRODUCT_PLAN.md / RULES.md（要改先问 Juanxi）

## 文件边界

你只能改：
  src/components/Layout.tsx, src/components/Page.tsx
  src/routes.ts
  src/styles.css（新增 bts 相关样式，只用 token）
  各 page / component 里加就地注释的那些行
  src/test/** 和 e2e/**
  docs/PROGRESS.md（只加交接记录）

不要改：netlify/**、src/engine/**（除了读 explain 字段）、src/data/** 的结构

## 结束时

1. docs/PROGRESS.md 交接记录加一行
2. 提交信息：[S7][Claude] 简短说明
3. git push -u origin feat/s7-explain
4. 不要合并。不要碰 main。
5. 用简单中文向 Juanxi 汇报，并告诉他：打开那个开关，然后看 Today 页 ——
   每个日期旁边都会告诉他这个日期是怎么算出来的。请他确认这是不是他怀念的
   那个感觉。
```

---

### S8 · 触屏降级 + 导航重组 ｜ Sonnet 5.5 ｜ 必须在 S7 之后

```
你在 Platypus Officer Hub 仓库里做两件收尾的交互改造。项目负责人 Juanxi 不写代码。

先读：
1. AGENTS.md —— 特别是第 7 节
2. docs/AUDIT_2026-10-27.md 第 8.4 节（hover-only 清单）和第 7.4 节（v0.1 的导航）
3. docs/DESIGN_TOKENS.md
4. docs/EXECUTION_PLAN_2026-10-27.md —— 你是 S8

开始前：
  git fetch origin
  git log origin/integration/v1.1-fix --oneline | head -20   # 确认有 [S7] 的提交
  git checkout -b feat/s8-touch-nav origin/integration/v1.1-fix
  npm ci

## C3 · 悬停卡在触屏上降级成可点展开

AGENTS.md §7.3 的「三级交互」是：看（颜色）→ 停（悬停卡）→ 点（右栏详情）。
**第 2 级在触屏上完全不存在**，因为触屏没有 hover。

能靠 :focus-within 救回来的前提是触发元素本身可聚焦。审计清点出 4 处连键盘
也到不了（纯 hover-only）：
  src/pages/Funding.tsx:54,60   6 站物流链 —— 无 onClick，渲染成 <span role="img">
                                 手机上是一排 6 个 12px 无标签圆点，没文字、
                                 没有可点的解释。**这是最糟的一处。**
  src/pages/Handoff.tsx:33-37,46  换届季进度链
  src/pages/Handoff.tsx:116       第一周清单来源
  src/pages/Funding.tsx:54        阶段 hint（showLabels={false} compact）

→ 在 @media (hover: none) 下，把 Hover 组件渲染成可点击展开的 disclosure。
→ ⚠️ S7 刚加了 Behind-the-scenes 开关，它用的是同一批解释文字。
  **复用 S7 的机制，不要再造第二套。** 先读 S7 的交接记录和代码。
→ Events 流程图还有一个相关问题（审计第 8.4 节）：触屏上 tap 立即打开右栏，
  悬停卡永远不出现，而悬停卡里独有的信息（ASU 官方截止日 + 规则 ID、
  调度冲突、等待对象）在右栏里被埋进了一个 details 折叠。
  → 手机用户要多点 2 次才能看到桌面用户悬停就能看到的东西。一起处理。

## C4 · 导航【2026-10-27 已取消，只保留一小项】

⚠️ **原计划的「导航改回动作导向」已取消。** Juanxi 2026-10-27 发来截图确认他喜欢
现在这一版，包括现在的导航（见本方案第 1.4 节）。**不要改任何导航标签。**

只保留两件无争议的小事：

→ (a) src/components/Layout.tsx:79 有一个空的、无标题的分组分隔线：
     <div className="group" aria-hidden="true" />
     而 styles.css 里 .sidenav .group 还保留着大写标签文字的样式，只是永远没内容。
     → 给它一个标题（比如 "Reference"，界面文字用英文）。这是把一个半成品补完，
       不是改设计。
     → ≤860px 时现在是 display:none，导航变成横向滚动的 pill 条 —— 保持现状，
       窄屏不显示分组标题是合理的。

→ (b) 恢复导航项的未读计数。v0.1 有，今天没有（styles.css 里连 .sidenav .count
     的样式都没有了）。数据源：当前角色的未读通知，Layout.tsx:132 已经在算了。
     → ⚠️ 这个会增加视觉元素。先做一个，截图问 Juanxi 要不要铺开到其他项。

**不要做**：改导航标签、改导航顺序、改导航图标、加二级导航。

## 硬性要求

- 遵守 docs/DESIGN_TOKENS.md
- npm run check 全绿（含 stylelint / eslint / word-count / a11y 桌面+移动）
- 触屏降级必须有移动端 e2e 测试
- 不要改 AGENTS.md / PRODUCT_PLAN.md（要改先问 Juanxi）

## 文件边界

你只能改：
  src/components/ui/index.tsx（Hover 组件）
  src/components/Layout.tsx
  src/components/flow/MetroChart.tsx
  src/pages/Funding.tsx, src/pages/Handoff.tsx
  src/styles.css（只用 token）
  src/test/** 和 e2e/**
  docs/PROGRESS.md（只加交接记录）

## 结束时

1. docs/PROGRESS.md 交接记录加一行
2. 提交信息：[S8][Claude] 简短说明
3. git push -u origin feat/s8-touch-nav
4. 不要合并。不要碰 main。
5. 用简单中文向 Juanxi 汇报，并附上导航标签的新旧对照表让他选。
   另外请他用手机打开 Funding 页确认：那 6 个圆点现在能点开看说明了。
```

---

### S9 · 定版、文档、合并上线 ｜ Opus 5.5 ｜ 最后

```
你负责 Platypus v1.0 的定版。这是 ASU 荣誉论文 Phase 3 原型的最后一个工作包，
做完之后真实参与者会用它。项目负责人 Juanxi 不写代码。

先读（全部必读）：
1. AGENTS.md —— 全文
2. docs/AUDIT_2026-10-27.md —— 全文
3. docs/EXECUTION_PLAN_2026-10-27.md —— 全文
4. docs/PROGRESS.md —— S1 到 S8 的全部交接记录。这是你的检查清单。
5. docs/DESIGN_TOKENS.md

开始前：
  git fetch origin
  git checkout -b release/v1.0 origin/integration/v1.1-fix
  npm ci
  npm run check     # 必须全绿才继续

## 1. 核对 S1–S8 的交接记录

逐条过一遍，列出：
- 哪些事说要做但实际没做
- 哪些事被 test.fixme 钉住了
- 哪些事需要 Juanxi 决定但他还没定
把这份清单给 Juanxi，让他决定哪些必须在 Phase 3 之前解决、哪些可以留着。

## 2. 修文档（审计附录里的陈旧物）

- README.md:7 —— 仍在描述 v0.1（"the whole app in one file"、
  "Data storage is still in-memory"）。改成现在的真实情况。
- AGENTS.md:81 —— 仍写「正式网址仍是 v0.1」，而 v1 已于 10/23 合并上线。
- AGENTS.md:76 —— 说 Feedback 队列在 Rules 底部，实际已移到 Settings。
- AGENTS.md 第 6/6b 节 —— 整体过时（泳道图/甘特图已删、端点已删、新增了 token 表
  和 lint）。改成现在的代码地图。
- AGENTS.md 第 7 节 —— 加一条：「改界面前先读 docs/DESIGN_TOKENS.md，
  只能用 token」。
  ⚠️ AGENTS.md 是 Juanxi 批准过的规则文件。改它要先把 diff 给他看、他同意再改。
- docs/PRODUCT_PLAN.md —— 第 6 节的界面说明和第 11 节的架构图可能需要更新
  （数据层仍是 localStorage，Supabase 已被 Juanxi 2026-10-27 决定推迟）。
  同样要他同意。
- ⚠️ docs/PROGRESS.md 里引用的「253 个单元测试 + 107 个页面测试」等数字**未经实跑
  验证**（审计第 9 节附录）。实跑一次，用真实数字替换。
  **这些数字可能进论文，不能是估的。**

## 3. 清理遗留物

- 删 ax.tmp.mjs（仓库根目录，11 行调试临时文件，硬编码某台机器的浏览器路径，
  功能已被 e2e/a11y.spec.ts 覆盖）
- vite.config.ts:8 的 sourcemap: true —— 生产环境发布完整 source map。
  建议关掉（代码本身在公开仓库，不是漏洞，但属于默认不该开的配置）。
- id 用数组长度自增的那几处（store.tsx:107 的 report:${length}、
  taskWorkflow.ts:79、store.tsx:205）—— 将来支持删除就会撞 ID。改成稳定 id。
- 确认 netlify/lib/ai.mts 的 AI_TIMEOUT_MS 默认 25000ms 是否超过 Netlify 同步函数
  的执行上限（审计第 4.5 节标为推断，需实测）。超了就调。

## 4. 上线前的硬检查

- [ ] npm run check 全绿，记录真实的测试数量
- [ ] 人工走一遍：10 个页面 × 桌面/手机 × 浅色/深色
- [ ] 键盘走一遍：只用 Tab / Enter / Escape 完成「认领一个任务 → 改状态 → 完成」
- [ ] 参与者路径演练：Reset demo → 五步设置 → 建一个活动 → 建一个任务 →
      问 AI 一个规则问题 → 导出数据。全程不能卡、不能白屏。
- [ ] S2 的交互日志：做 10 个操作，导出，检查 JSON 里 10 条都在、顺序对
- [ ] S2 的限流：确认生效，并记录实际阈值
- [ ] 真实 DeepSeek 实测（不是模拟）：Ask 面板 + WP5 的 40 题规则评估。
      ⚠️ docs/AI_TESTS.md 明确规定：不能把模拟结果或本地回退说成是真实 AI 验收。
      如果因为访问保护跑不了，**如实记录为未完成**，不要含糊。

## 5. 关于 Netlify 访问保护（11/4 之前，需要 Juanxi 操作）

正式站现在整站 401，只有登录他 Netlify 账号的人能打开。发招募邮件之前必须关掉。
**但那一刻 /api/* 就暴露在公网。**

→ 确认 S2 的限流已经生效，再让他关。
→ 写一份「点哪里」的一步一步说明给他（你没有他的 Netlify 权限）。
→ 同时提醒他检查 AI_API_KEY 在 Production / Deploy Previews / Branch deploys
  三处都填了（docs/PROGRESS.md 记录过只填了 Production，导致预览一直是模拟回答）。

## 6. 合并与打标签（需要 Juanxi 明确说「批准合并」）

AGENTS.md 第 3 节规则 4：main 就是正式网站，只有 Juanxi 批准才能合并。

→ 把检查结果交给他
→ 他说「批准合并」之后：合并 release/v1.0 到 main，打 v1.0 标签
→ 确认 Netlify 部署成功、/api/health 显示真实供应商已接通
→ 在 docs/PROGRESS.md 写最终交接记录

## 结束时

用简单中文向 Juanxi 汇报：
- 哪些检查过了、哪些没过
- 他需要自己动手做哪几件事（Netlify 设置、branch protection），一步一步写清楚点哪里
- 论文里可以引用的真实数字（测试数量、对比度、性能）
- 还剩什么没做，建议留到 v1.5
```

---

## 第 6 节 · 你现在要做的事

### 今天（10/27，周二）

1. **确认这份方案**，特别是：会话划分合理吗？时间表跟得上吗？
2. **截一张能看到蓝框的图发我**（点流程图节点或看板卡片，截全屏）。S3 要靠它才能改对东西。
3. **把审计报告和这份方案提交到 GitHub**，否则后面 9 个会话读不到。
   两个文件都是纯文档，不影响网站。我可以帮你做，但按 AGENTS.md 规则 4 需要你说一句"可以"。
4. **建集结分支**（我可以帮你做）：
   ```
   git checkout -b integration/v1.1-fix main && git push -u origin integration/v1.1-fix
   ```

### 周三（10/28）

开 **S1 / S2 / S3** 三个会话（可以同时）。把第 5 节对应的提示词整段粘进去。

### 周四（10/29）· 提交 IRB

- 合并 S1 → S2 → S3 到 `integration/v1.1-fix`，再合并到 `main`
- **IRB 材料里加上"收集参与者交互日志并导出"**（见第 1.3 节③）。这件事现在写是免费的，批准之后再加要走修改，会卡掉你 11/9 的测试计划。

### 周四之后

按 S4 → S5 → S6 → S7 → S8 → S9 顺序来，一个一个开。**11/4 之前必须确认 S2 的限流生效**，然后才能关掉 Netlify 访问保护发招募邮件。

---

## 第 7 节 · 我对这个时间表的判断

说实话：**周四（2 天后）要"所有功能都能实现"，这个目标本身就要澄清。**

功能其实**已经全做完了**——WP0 到 WP5 五个工作包在 10/22 一天内全部完成。周四之前要做的不是"补功能"，而是**让已有功能不出丑**：按钮找得到、改了有反应、不白屏、数据不丢、点一下不用等。

这正好是 S1 + S2 + S3 的内容，**2 天做完是现实的**，因为三个会话可以并行，而且每一件事都有确切的文件和行号。

但要提醒你一件事：**真实 DeepSeek 从来没有被实测过。** `docs/PROGRESS.md` 和 `docs/AI_TESTS.md` 都明确记着这个缺口——Netlify 预览的 key 只填了 Production，所以预览里一直是模拟回答，40 题规则评估也只跑过模拟供应商。

如果 Phase 3 会话里 AI 要真的回答学生的问题，**这件事必须在 11/9 之前实测，而且不能用模拟结果冒充**（`AI_TESTS.md` 自己定了这条规矩）。我把它放在 S9 里，但**它可能需要单独一个会话**，因为它依赖你在 Netlify 上补填 key 并重新部署，而且可能会发现新问题。

→ 建议：**在 11/4 关掉访问保护之后立刻做真实 AI 实测**，不要留到 11/8。如果那时发现 AI 回答质量有问题，你还有 4 天可以调提示词。
