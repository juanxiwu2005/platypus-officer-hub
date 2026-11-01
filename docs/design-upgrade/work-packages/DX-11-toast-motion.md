# DX-11 Toast 进出

- 阶段 2　大小 S　风险 低　R 级 R2　依赖：DX-01、DX-02　并行伙伴：DX-09、10、12～14
- 分支：`design/dx-11-toast-motion`　样式文件：`src/styles/dx-11-toast-motion.css`　对应细节：D11

## 要做的事
1. `src/components/chrome/Toast.tsx`（DX-02 做的 `useToast`）：改成"显示 → 停留 2400ms → 退场 150ms → 卸载"。新的 toast 在旧的还没消失时到来，要重置计时，不要叠两个。
2. 样式：进入 `translateY(8px)→0` + 淡入（`var(--dur-fast)`、`var(--ease-out)`）；退场淡出。`bottom: calc(20px + env(safe-area-inset-bottom))`。
3. 手机：最大宽度 `calc(100vw - 96px)`，避免盖住右下角的圆形按钮（52px + 18px 边距）。
4. 检查 `--z-toast: 50` 和 `--z-rail: 55`：手机上右栏全屏时 toast 会被盖住。如果会发生（例如在右栏里触发 toast），在报告里说明并交给整合人决定，**不要**改 z-index token。
5. 保持：`role="status"`、文案、2400ms 的停留时间。

## 可以改的文件
`src/components/chrome/Toast.tsx`、`src/styles/dx-11-toast-motion.css`。`.toast` 只归这个包。

## 验收
- `smoke.spec.ts`（Reset demo 之后断言 "Demo data reset"）桌面 + 手机绿。
- 新测试 `e2e/dx-11-toast.spec.ts`：toast 出现时 `opacity` 在过渡中；2.4s 之后再过 200ms 它不在 DOM 里；连续触发两次只有一个 toast。
- Juanxi 怎么验：Demo 菜单里 Reset demo，底部的提示条升起再淡出。

## 回滚
R2。
