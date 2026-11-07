# DX-14 加载骨架 + 延迟显示

- 阶段 2　大小 S　风险 低　R 级 R2　依赖：DX-01　并行伙伴：DX-09～13
- 分支：`design/dx-14-loading-skeleton`　样式文件：`src/styles/dx-14-loading-skeleton.css`　对应细节：D16

## 要做的事
1. `src/components/RouteLoading.tsx`：
   - 加载不到 150ms 时什么都不显示（避免"闪一下"）；超过 150ms 才显示。
   - 显示的内容：和页面结构相似的灰色骨架块（一个标题条 + 3 张卡片条），不带文字。给读屏的 `role="status"` 文字（`label`）改成视觉隐藏（`.sr-only` 已存在），**读屏仍然能读到 "Loading…"**。
   - 骨架块是静态的（不做闪光扫过；Apple 提醒避免慢速循环）。想要一点生命感，只允许一个 ≥1.2s 周期的透明度变化，且减少动效时停止。
2. 保持：`fullPage` 参数、`aria-label`、两种用法（整页懒加载、右栏详情的 "Loading details…"）。

## 可以改的文件
`src/components/RouteLoading.tsx`、`src/styles/dx-14-loading-skeleton.css`。

## 验收
- `e2e/bundle-performance.spec.ts`、`e2e/bundle-organization-setup.spec.ts`（它们检查懒加载）桌面绿，先看里面有没有断言 "Loading…" 可见，如果有，按"读屏仍可读到"重写，**不要放宽别的断言**。
- 用网络节流（Playwright `route` 延迟 800ms）手动验证：先空白 150ms，再出现骨架；快速加载时不闪。
- Juanxi 怎么验：用手机网络（或浏览器节流）打开 Events，先出现灰色骨架，而不是一行文字。

## 回滚
R2。
