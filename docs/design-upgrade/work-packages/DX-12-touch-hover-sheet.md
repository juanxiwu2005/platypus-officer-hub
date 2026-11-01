# DX-12 手机悬停卡底部弹层动画

- 阶段 2　大小 S　风险 低　R 级 **R1 可用**　依赖：DX-01　并行伙伴：DX-09～11、13、14
- 分支：`design/dx-12-touch-hover-sheet`　样式文件：`src/styles/dx-12-touch-hover-sheet.css`　对应细节：D12

## 为什么
手机上点开悬停卡，它以底部弹层出现（S8），但是"啪"一下。**桌面上的悬停卡不能动**：S3（2026-10-27）已经决定零延迟，`e2e/feel.spec.ts` 守着。

## 要做的事
1. **只在 `@media (hover: none)` 里**给 `.hover[data-open="true"] > .hover-card` 加进入动画：`translateY(12px)→0` + 淡入，`var(--dur-fast)`、`var(--ease-out)`；退场反向。
2. 不加遮罩（它是说明，不是模态；Emil §12 "separate to keep flow"）。
3. 减少动效：只淡入淡出。
4. 不改 `Hover` 组件的逻辑（`ui/index.tsx`）。如果必须改（比如要让退场能播），把需求写进报告交给整合人，不要自己动。

## 可以改的文件
只有 `src/styles/dx-12-touch-hover-sheet.css`。

## 验收
- `touch.spec.ts`（手机）、`feel.spec.ts`（桌面，尤其是"悬停卡无延迟"）、`bts.spec.ts` 绿。
- 桌面项目里 `.hover-card` 的计算 `transition-delay` 仍是 `0s, 0s`。
- Juanxi 怎么验：手机上点进度链的小圆点，说明卡从屏幕底部滑上来。

## 回滚
R1 或 R2。
