# DX-02 把 `Layout.tsx` 拆成独立文件（纯搬家）

- 阶段 0　大小 M　风险 中　R 级 R2　依赖：无　并行伙伴：DX-01
- 分支：`design/dx-02-split-layout`　对应细节：D52

## 为什么
`Layout.tsx` 里同时有顶栏、Demo 菜单、铃铛、Toast、导航、右栏挂载和圆形按钮。后面至少 6 个包要改它的不同部分，不拆开就会撞车。**只搬家，不改任何行为。**

## 要做的事
把下面这些内容搬到新文件，`Layout.tsx` 里只留"组合"：
- `src/components/chrome/TopBar.tsx`：`<header className="topbar">…</header>` 整块（品牌 + 控件区）。需要的数据通过 props 传入。
- `src/components/chrome/SideNav.tsx`：`<nav className="sidenav">…</nav>`，包括 Tasks 的未读数。
- `src/components/chrome/DemoMenu.tsx`：原来的 `DemoMenu` 函数，原样搬。
- `src/components/chrome/Bell.tsx`：原来的 `Bell` 函数，原样搬。
- `src/components/chrome/Toast.tsx`：导出 `useToast()`，返回 `[toastNode, showToast]`；计时（2400ms）和 `role="status"` 的标记原样保留。
- `Layout.tsx` 保留：`Layout`、`Frame`、右栏的挂载和圆形 Ask 按钮、"换页时右栏收起"的那段 effect。

## 可以改的文件
`src/components/Layout.tsx`、`src/components/chrome/*`（新）。
**不准碰**：任何样式文件；任何 `data-testid`、`aria-label`、`className`；任何文字。

## 验收
- `npm run lint`、`build`、`test` 全绿；`e2e/smoke.spec.ts`、`today.spec.ts`、`touch.spec.ts`、`a11y.spec.ts`、`feel.spec.ts` 在桌面和手机项目都绿。
- `dx-shots`（DX-01 的脚本，如果还没合并就在 worktree 里手动对比 `npm run build` 前后的 `dist` 渲染）改动前后 PNG 字节一致。
- `git diff --stat` 里，所有新文件的内容几乎都是从 `Layout.tsx` 剪切过来的；报告里写出"没有任何行为变化"的证据（例如用 `git diff --color-moved` 看到的搬家比例）。

## 回滚
R2。依赖它的包要先撤（见依赖表）。

## 注意
- 不要顺手"优化"代码。顺手改的东西会让回滚和审阅都变难。
- Demo 菜单里 `armed` 的 3 秒超时、点击外部关闭、Escape 关闭、`platypus:reset` 事件，都要原样保留。
