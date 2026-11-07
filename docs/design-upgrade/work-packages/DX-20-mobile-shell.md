# DX-20 手机顶栏瘦身（20a）+ 底部导航（20b，需批准）

- 阶段 4　大小 L　风险 **高**　R 级 R2　依赖：DX-02、DX-09、DX-10　并行伙伴：DX-21、22
- 分支：`design/dx-20-mobile-shell`　样式文件：`src/styles/dx-20-mobile-shell.css`　对应细节：D23
- **20a 和 20b 是两个独立的提交**，可以单独撤销。**20b 默认不做**，只有 Juanxi 明确批准才开始。

## 为什么
**量到**：390×844 手机上，顶栏 185px，加上导航条到 247px，正文要到 271px 才开始（占屏幕 32%）。顶栏里塞着品牌、Demo 小标、View as、AI 开关、铃铛。

## 20a：顶栏瘦身（默认做）
1. 只在 `max-width: 860px`：顶栏收成一行（约 `var(--topbar-h)` 56px）——左边品牌（Logo + 社团名，过长省略），右边铃铛 + "⋯"（"More"）按钮。
2. "⋯"打开的菜单（沿用 `.menu` 的样式和 DX-10 的进出动画）里放：Demo 小标的内容（日期、时钟、Replay setup、Behind the scenes、Reset demo）、**View as**、**AI features** 开关。
3. **所有 `data-testid` 保持不变**（`demo-menu`、`view-as`、`ask-toggle`…）。需要两步才能到（先开"⋯"再选）的，更新 `e2e/helpers.ts` 里的 `openDemoMenu`，并让用到 `view-as` 的测试通过一个新助手 `openViewAs(page)`；测试的断言一个字都不能放宽。
4. 桌面（>860px）**完全不变**。
5. 现有的横向导航条保留（20b 不批准时仍用它）。

## 20b：底部导航（需要 Juanxi 批准，默认不做）
1. 手机底部固定一条导航：Today、Events、Tasks、Team、More（More 里放 Handoff、Partners、Rules、Settings、Help）。
2. 尊重安全区；圆形 Ask 按钮上移到导航条之上；`body` 底部留出导航条高度。
3. 当前页高亮，Tasks 的未读数保留；每项点击区 ≥44px。
4. 手机上去掉顶部的横向导航条，避免两套导航。
5. 如果 Juanxi 没批准，**不要写任何 20b 的代码**。

## 可以改的文件
`src/components/Layout.tsx`、`src/components/chrome/TopBar.tsx`、`DemoMenu.tsx`、`SideNav.tsx`、`src/styles/dx-20-mobile-shell.css`、`e2e/helpers.ts`（只加/改助手）及用到它们的测试的**调用方式**。

## 验收
- 完整手机项目回归（`smoke`、`today`、`tasks`、`events`、`touch`、`a11y`、`recovery`、`m2b`、`wp5`）绿；桌面项目 `dx-shots` 前后字节一致。
- 量：390×844，20a 之后正文起点 ≤ 130px（现状 271px）；写进报告。
- Juanxi 怎么验：手机上顶部只剩一行，点"⋯"能找到 View as 和 AI 开关；（20b）底部有导航栏。

## 回滚
R2：先撤 20b 的提交（如果有），再撤 20a，或直接撤整个合并。DX-23 依赖 20b 的底栏部分。
