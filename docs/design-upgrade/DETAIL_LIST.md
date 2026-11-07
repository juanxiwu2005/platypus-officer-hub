# 细节清单

每条都写明：**现状**（怎么知道的）、**建议**、**依据**、**归哪个工作包**。
"证据"一栏说明可信程度：**量到** = 在浏览器里量到的数字；**看到** = 截图里看到；**读到** = 读代码读到；**待实测** = 没验证，执行 agent 要先实测再动手。
依据缩写：`Apple` = apple-design-skill（Apple HIG 页面，引用 `references/hig/<页面>.md`）；`Emil` = emilkowalski/skills 的 apple-design（章节号）；`判断` = 我的判断，没有 Skill 条文支持。

> 更正：我上一轮说"手机内容要到约 370px、占 44%"，**错了**——那是把 2 倍截图的像素当成了页面像素。**量到**的正确数字是：顶栏 185px、导航条到 247px，正文从 **271px** 开始，约占屏幕高度的 32%（D23）。

## A. 反馈与手感

| ID | 位置 | 现状 | 建议 | 依据 | 包 |
| --- | --- | --- | --- | --- | --- |
| D01 | 所有按钮、chip、导航项 | 按下没有任何变化。**量到**：`.btn`、`.sidenav a`、`.card`、`.pill` 的 transition 都是 `all 0s`；样式表里没有给这些元素写 `:active` | 按下立刻轻微缩小（`scale(.97)`，≤100ms），松手回弹；文字型按钮用透明度 | Emil §1 "Respond on pointer-down"；Apple `motion.md › Providing feedback`："Aim for brevity and precision" | DX-03 |
| D02 | 悬停颜色 | `.btn:hover`、`.sidenav a:hover`、`.row-btn` 的背景是瞬间跳变 | 加 100–150ms 的背景过渡，只在真正有鼠标的设备上（`@media (hover: hover)`）| 判断 + Emil §1 | DX-03 |
| D03 | Ask 圆形按钮（手机、平板） | 没有悬停、没有按下状态，出现和消失都是瞬间 | 按下缩小；和右栏联动进出 | Emil §1、§7 | DX-09 |
| D04 | 手机点击区 | **量到**：`.icon-btn` 高 32px；代码推算 `.btn` 约 33px、`.chip` 约 28px。Apple 移动端默认 44、最小 28 | 在 `(pointer: coarse)` 下，主要控件最小高 44px；表格内小控件不低于 32px；相邻控件间距 ≥8px。桌面完全不变 | Apple `accessibility.md`（控件尺寸与间距）| DX-04 |
| D05 | 极小控件 | `.swatch` 20px、`.owner-chip button` 24px、`.info` 16px（外加 2px 热区）| 触屏下把热区扩到至少 32px（不改外观，用透明伪元素）| 同上 | DX-04 |
| D06 | 手机点击高亮 | 没有设置 `-webkit-tap-highlight-color`，也没有 `touch-action: manipulation` | 有了按下反馈（DX-03）之后，去掉系统灰色高亮，并避免双击缩放延迟 | Emil §1 "audit … the ~300ms tap delay" | DX-07 |

## B. 容器的进出（空间感）

| ID | 位置 | 现状 | 建议 | 依据 | 包 |
| --- | --- | --- | --- | --- | --- |
| D07 | 右栏 Ask / Details | **读到**：`Layout.tsx` 里 `{rail.open && <Rail/>}`，直接挂载和卸载。小于 1200px 时是固定浮层，没有任何滑动 | 从右侧滑入，原路滑出；中途再点能反向，从当前位置走；桌面并排模式做淡入 + 小位移 | Emil §3（可打断）、§7（进出同一路径）；Apple `motion.md`："if someone reveals a view by sliding it down from the top, they don't expect to dismiss the view by sliding it to the side" | DX-09 |
| D08 | 右栏的"对话框"高度 | **读到**：`.rail { height: calc(100vh - …) }`，手机浏览器地址栏伸缩时会错位 | 改成 `100dvh` | 判断 | DX-09 |
| D09 | 圆形 Ask 按钮位置 | **读到**：`bottom: 18px`，没考虑 iPhone 底部横条（`viewport-fit=cover` 已开）| `calc(18px + env(safe-area-inset-bottom))` | Apple `layout.md`（安全区）| DX-09 |
| D10 | Demo 菜单、铃铛菜单 | **读到**：用 `hidden` 属性切换，没有退场；也不从触发它的按钮长出来 | 淡入 + 轻微缩放，`transform-origin` 设在按钮上；退场更快（100ms）| Emil §7 "Anchor interactions to their source" | DX-10 |
| D11 | Toast（"Demo data reset"）| **读到**：固定在底部中间，出现和消失都是瞬间；底部没考虑安全区 | 从下方 8px 升起并淡入，淡出；`aria` 行为不变 | Emil §7；Apple `layout.md` | DX-11 |
| D12 | 手机上点开的悬停卡（底部弹层）| **读到**：`data-open` 一变就出现，没有动画 | 从下方滑入、淡入；点别处/Escape 反向收回。**不加遮罩**（它是说明，不是模态）| Emil §12 "Dim to focus, separate to keep flow" | DX-12 |
| D13 | 折叠区 `<details>` | **读到**：至少 11 个文件在用（TaskDetail、Settings、Handoff 等），展开是瞬间 | 用 `::details-content` 做高度过渡，浏览器不支持时保持现状（渐进增强）| 判断 | DX-13 |
| D14 | 页面切换 | 无过渡 | 只做 140ms 淡入，**不做滑动、不做退场**（不拖慢操作）| Apple `motion.md`："avoid adding motion to UI interactions that occur frequently" | DX-19 |
| D15 | 右栏详情切换（点另一个任务）| **读到**：`DetailView` 的内容整块替换 | 120ms 交叉淡入，不动布局 | Emil §3 | DX-19 |
| D16 | 懒加载时的占位 | **读到**：`RouteLoading` 只有一行文字 "Loading…" | 150ms 以内不显示（避免闪一下），之后显示和页面结构相似的骨架；文字保留给读屏 | Apple `loading.md`；Emil §1 | DX-14 |
| D17 | Ask 里新消息 | 气泡出现无动画；AI 等待卡片直接出现 | 新气泡 6px 升起 + 淡入（只对新消息，重新打开面板不重播）| 判断 | DX-17 |

## C. 版面与信息

| ID | 位置 | 现状 | 建议 | 依据 | 包 |
| --- | --- | --- | --- | --- | --- |
| D18 | Events 页 1440px、右栏打开 | **看到**：四列并排（导航 196 + 活动列表 220 + 内容 + 右栏 380），流程图只剩约 550px，右侧标签被切（"Mod…"）| **保留**活动列表（你 10-31 的要求）。把列表在右栏打开时收窄到约 168px；流程图加"还有更多"的边缘渐隐提示 | Apple `layout.md`；Emil §12 "Scroll edge effects" | DX-15 |
| D19 | Events 页流程图上方的空白 | **看到**：切换条和图之间约 58px，图内顶部还有一大块空白。**读到** PROGRESS 2026-10-31：顶部留白是为悬停卡专门留的 | **不能直接删**。agent 先实测：悬停卡弹出时需要多高，再把多余的收掉 | 判断 | DX-15 |
| D20 | Tasks 看板 | **看到**：1440 + 右栏打开时，第 6 列（Done）被挤出屏幕，用户看不到最有成就感的一列；"My tasks"下大部分列是空的，下面一大片空白 | 空列收成窄条（点击、拖到上面、键盘聚焦时展开）；列最小高度让拖放目标足够大 | Apple `layout.md`（让重要内容更突出）| DX-16 |
| D21 | 看板卡片 | 只有 `cursor: grab`，鼠标移上去没有任何变化 | 悬停时边框变成强调色，提示可拖动 | 判断 | DX-16 |
| D22 | 看板列头 | **看到**：6 条饱和色块（灰、蓝、橙、紫、红、绿）横在页面顶部，和"地铁线"招牌抢戏 | 改成淡底 + 彩色圆点 + 深色字。状态色块（StatusPill）在别处保持不变。深色模式下要重新算对比度（见 DX-21）| Apple `color.md`；Craft 透镜"勇气只花在一处" | DX-21 |
| D23 | 手机顶栏 | **量到**：顶栏 185px + 导航条，正文从 271px 开始（32%）。顶栏塞了品牌、Demo 小标、View as、AI 开关、铃铛 | 顶栏收成一行（约 56px），把 Demo、View as、AI 开关收进"⋯"菜单（20a）。导航放到底部拇指够得到的位置（20b，**需要 Juanxi 批准**）| Apple `layout.md`；Apple `tab-bars.md`（网页只借原则）| DX-20 |
| D24 | Ask 右栏空状态 | **看到**：问候语沉在面板底部，上面一大片空 | 问候和建议问题成组，垂直居中 | Apple `layout.md`（层级与留白）| DX-17 |
| D25 | 各页空状态 | 例如 Funding "Nothing needs action."、Partners "No contacts match."，只说状态，不说下一步 | 每条空状态说一句下一步，有动作的给一个链接（例如 "Clear filters"）。字数不增加 | Apple `writing.md`；`feedback.md` | DX-18 |
| D26 | Today 的风险点 | **看到**：红黄绿点只靠颜色区分（`RiskDot`）；活动行右边的点没有标签。悬停卡的内容在手机上要点一下才能看到 | 每种状态一个不同的形状（圆 / 三角 / 方），灰度下也能分；仍保留原颜色 | Apple Lens 1 "Nothing is conveyed by color alone" | DX-05 |
| D27 | 进度链里"有风险"的点 | **读到**：只比普通点多一圈红边、边更粗，色盲用户难分 | 在 DX-25 里一并加形状 | 同上 | DX-25 |

## D. 字体与数字

| ID | 位置 | 现状 | 建议 | 依据 | 包 |
| --- | --- | --- | --- | --- | --- |
| D28 | 标题字距 | **读到**：h1/h2/h3 统一 `letter-spacing: -.01em` | 按字号分：26px 标题约 `-.02em`，18px 约 `-.015em`，15px 用 `0` | Emil §15；Apple `typography.md`（字距随字号变化）| DX-06 |
| D29 | 日期和金额的数字宽度 | `.num`（等宽数字）只用在部分元素上 | 全站日期、金额、计数一律等宽数字，列才会对齐 | Emil §15 | DX-06 |
| D30 | 12–13px 小字 | `--fs-xs` 12px、`--fs-sm` 13px 用在进度链标签、图表刻度、小色块。你们自己的目标是 ≥14px（`AGENTS.md` 7.4）| 手机上把进度链标签、图表标签提到 `--fs-md`。**只用 token**（样式检查不允许写裸像素）| Apple `typography.md`（最小字号）| DX-06 |
| D31 | 段落折行 | 标题已用 `text-wrap: balance` | 正文和小字加 `text-wrap: pretty`，减少孤行 | 判断 | DX-06 |
| D32 | h1 的文档与代码不一致 | `docs/DESIGN_TOKENS.md` 写 h1 是 `clamp(26px, 3.2vw, 34px)`；**读到** `styles.css` 里实际是固定 `var(--fs-2xl)` 26px | 默认**只改文档**（不改画面）。是否真的要让大屏标题变大，等 Juanxi 决定 | 判断 | DX-27 |
| D33 | 衬线字体的平台差异 | `--serif: ui-serif, "New York", …, Georgia`：Mac 上是 New York，Windows/安卓上变成 Georgia/Times，个性会不一样 | **不排期**。如果以后在意，再评估自托管字体（要加载、要体积、要授权）| 判断 | 待决定 |

## E. 材质与层次

| ID | 位置 | 现状 | 建议 | 依据 | 包 |
| --- | --- | --- | --- | --- | --- |
| D34 | 顶栏 | **读到**：实心 `--surface` + 1px 底线 | 半透明 + 模糊，内容从下面滑过；滚动之后才出现底线。浮层之间**不叠**半透明 | Emil §12 "Build nav/toolbars/sheets as translucent layers"；Apple `materials.md` | DX-23 |
| D35 | 阴影 | **读到**：至少 6 种手写的 rgba 阴影（面板、菜单、悬停卡、Ask 按钮、列表、toast）；只有一个 `--shadow` token | 建 3 档层级 token：`--elev-1/2/3`，大面积更深 | Emil §12 "Bigger surfaces should read as thicker" | DX-23 |
| D36 | 减少透明度、增强对比度 | **读到**：没有任何 `prefers-reduced-transparency` 或 `prefers-contrast` 处理 | 半透明层在这两种设置下变成实心 + 明显边框；不支持 `backdrop-filter` 的浏览器也回退成实心 | Emil §14 | DX-23 |

## F. 无障碍与动效保护

| ID | 位置 | 现状 | 建议 | 依据 | 包 |
| --- | --- | --- | --- | --- | --- |
| D37 | `.typing i`、`.ai-wait-mark i` | **读到**：`blink` 无限循环，**没有**"减少动效"保护。主样式表里只有 2 处 `prefers-reduced-motion`（`.spin`、`.m-node`）| 减少动效时停成静态；加一个测试：此模式下页面里不能有无限循环的动画 | Apple `accessibility.md › Be cautious with fast-moving and blinking animations`；Emil §14 | DX-08 |
| D38 | 测试环境 | **读到**：`playwright.config.ts` 没有设 `reducedMotion`。加动画后，测试会因为"元素还在动"变得不稳定 | 默认 `reducedMotion: "reduce"`；动效另有专门测试 | 判断 | DX-01 |
| D39 | 并行测试端口 | **读到**：Playwright 固定 4173/4174，`reuseExistingServer` 在非 CI 下为真；`words` 脚本固定 4177。**多个 worktree 同时跑会复用别人的服务，测到别人的代码** | 端口改成环境变量，默认值不变（CI 不受影响）| 判断 | DX-01 |
| D40 | 动效时长 | 现有 transition 的时长是各处手写（.1s、.12s、.15s、.3s）| 建 token：`--dur-press/fast/base/slow`、`--ease-out`、`--spring-ui`、`--spring-pop`；加样式检查，新文件里不准写裸毫秒 | 判断 | DX-01 |
| D41 | 页面元信息 | **读到**：`index.html` 没有 `color-scheme` 和 `theme-color`，深色模式下浏览器顶部颜色和刷新瞬间可能是白的 | 加两者，颜色值和 `--bg` 保持一致，并写一个单元测试守着一致 | 判断 | DX-07 |
| D42 | 滚动穿透 | 右栏里的滚动区（`.ask-list`、`.detail-scroll`）滚到头会带动后面的页面 | `overscroll-behavior: contain` | 判断 | DX-07 |

## G. 手势与拖拽

| ID | 位置 | 现状 | 建议 | 依据 | 包 |
| --- | --- | --- | --- | --- | --- |
| D43 | 任务看板拖拽 | **读到**：浏览器自带的拖放（`draggable`），只有一个半透明虚影，落下去没有动画，其他卡片不让位；手机上是否能用**待实测** | 改成指针事件：卡片 1:1 跟手并记住抓取点；8px 才算拖动；其他卡片让位；落位用弹簧；Esc 取消；边缘自动滚动；触屏用长按；键盘 Alt+方向键 | Emil §2、§10；Apple `gestures.md` | DX-24 |
| D44 | 看板键盘操作 | 目前拖拽只有鼠标可用（状态按钮是另一条路）| 补键盘移动，并用 `aria-live` 报"Moved X to Y" | Apple Lens 1（键盘可用）| DX-24 |
| D45 | Partners 看板拖拽 | **读到**：同样的浏览器自带拖放，且没有放置高亮 | 沿用 DX-24 做好的拖拽工具 | 同上 | DX-26 |
| D46 | 流程图节点移动 | **读到**：`.metro .m-node { transition: left .3s ease, top .3s ease }`——用的是会触发重新布局的属性，用的是普通缓动；而连线是直接跳的，两者不同步 | 节点改用 `transform`，落位用弹簧，连线短暂淡入淡出以保持一致 | Emil §11（只动 transform/opacity）、§3 | DX-22 |
| D47 | 流程图已有的优点 | **读到**：已用 `setPointerCapture`、6px 起拖阈值、边缘自动滚动、Alt+方向键、右键菜单、撤销 | **保留**，不要重写 | Emil §2、§10 | — |

## H. 惊喜（只做一处）

| ID | 位置 | 现状 | 建议 | 依据 | 包 |
| --- | --- | --- | --- | --- | --- |
| D48 | 任务完成的那一刻 | 没有任何反馈，只是颜色变绿 | 进度链那一段从左向右"长出来"，圆点弹一下（只在本次会话里真正发生变化时播放，页面刚加载时不播）| Apple `design-principles.md`（Delight）；Emil §4 | DX-25 |
| D49 | 进度环 `Ring` | 数值变化时直接跳 | 变化时 400ms 过渡，首次渲染不动 | 判断 | DX-25 |
| D50 | 导航栏的 Tasks 角标 | 数字变化时直接换 | 变化时轻轻"弹"一下 | 判断 | DX-25 |

## I. 工程与文档

| ID | 位置 | 现状 | 建议 | 依据 | 包 |
| --- | --- | --- | --- | --- | --- |
| D51 | `src/styles.css` | 919 行单文件。多个 agent 同时改，一定冲突，回滚也没法按功能切 | 每个工作包一个小文件，主文件不动；样式检查范围扩到小文件 | 判断 | DX-01 |
| D52 | `Layout.tsx` | **读到**：同时包含顶栏、菜单、铃铛、Toast、右栏挂载、导航、圆形按钮 | 纯搬家，拆成 `chrome/TopBar.tsx`、`SideNav.tsx`、`DemoMenu.tsx`、`Bell.tsx`、`Toast.tsx`。行为和测试编号不变 | 判断 | DX-02 |
| D53 | `AGENTS.md` 第 0 节 | **读到**：写着 `main` 基线仍是 `4dc55ba`、v1.0 还没上线。**实际** `main` 已经包含 v1.0 发布合并（`5b0eb96`）和之后的演示数据提交（最新 `c3c9394`）| 由 DX-27 核实后更新（不在这个计划里直接改）| 判断 | DX-27 |
| D54 | `docs/DESIGN_TOKENS.md` | 没有动效 token、层级阴影 token | 补上，并注明小样式文件的结构 | 判断 | DX-27 |
| D55 | 动效规则 | `AGENTS.md` 第 7 节只管文字和组件，没有动效规则 | 加一小节：时长走 token、必须有降级、只动 transform/opacity、可被打断、常用操作不加动画 | 判断 | DX-27 |
| D56 | 样式守卫 | 没有任何工具阻止 `transition: all` 或裸毫秒数 | 小文件里禁止 `transition: all`、禁止对 left/top/width/height 做过渡、禁止裸时长 | 判断 | DX-01 |
| D57 | 截图对比 | 没有统一的"改前/改后"截图办法 | `scripts/dx-shots.mjs`：1440 / 390 × 浅 / 深 × 8 个页面 | 判断 | DX-01 |
| D58 | 回滚登记 | 没有 | `ROLLBACK_LOG.md` + `dx/*` 标签 | 判断 | DX-01 |

## J. 明确不做（以及为什么）

| 想法 | 为什么不做 |
| --- | --- |
| 桌面悬停卡加延迟 | **S3 已经决定零延迟**（`e2e/feel.spec.ts` 守着）。我上一条的建议作废 |
| 把 Events 左侧活动列表收成下拉 | **Juanxi 10-31 明确要求保留列表**。只会收窄，不会拿掉 |
| 页面之间滑动转场 | Apple `motion.md`：常用操作不要加动画。只做淡入 |
| 表格行、卡片入场动画 | 同上；每天看很多次 |
| "进行中"圆点一直脉动 | Apple `accessibility.md`：避免闪烁和重复动画；Emil §14：避免慢速循环 |
| 视差、整页动态背景 | Emil §14 |
| 声音、震动 | Apple `playing-haptics.md`：只给有意义的时刻。网页上 iOS Safari 不支持震动接口，收益低 |
| 手动深色模式开关 | Apple `dark-mode.md`：不要在 App 里单做外观开关。`DESIGN_TOKENS.md` 也已决定跟随系统 |
| 引入 `motion` / `framer-motion` 库 | 入口 JS 有体积门槛（约 364KB）。先用 CSS 的 `linear()` 弹簧。如果真不够用，再单独提出来，由 Juanxi 决定 |

## K. 需要 Juanxi 决定的事（默认值已写进工作包，不决定也能先做）

| # | 问题 | 默认 | 影响的包 |
| --- | --- | --- | --- |
| 1 | 手机底部导航栏要不要做？ | **不做**，DX-20 只做 20a（顶栏瘦身）。20b 要你批准才开 | DX-20 |
| 2 | 看板的空列要不要自动收窄？ | **做**（它同时解决 Done 列被挤出的问题）。不喜欢就回滚 DX-16 | DX-16 |
| 3 | Events 在窄屏时要不要让右栏默认收起？ | **不做**（动了你设计好的 AI 右栏）。只做收窄活动列表 | DX-15 |
| 4 | 大屏标题要不要变大（让代码符合文档的 clamp）？ | **不变**，只改文档 | DX-27 |
| 5 | 动效整体力度 | **克制**：只有反馈 + 容器进出 + 完成时刻三处 | 全部 |
