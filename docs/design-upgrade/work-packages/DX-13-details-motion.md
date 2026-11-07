# DX-13 折叠区展开动画

- 阶段 2　大小 S　风险 低　R 级 **R1 可用**　依赖：DX-01　并行伙伴：DX-09～12、14
- 分支：`design/dx-13-details-motion`　样式文件：`src/styles/dx-13-details-motion.css`　对应细节：D13

## 要做的事
1. 先清点：`<details>` 目前出现在 `ChangeCard`、`NudgeComposer`、`OrgDetail`、`ContactDetail`、`FollowupPanel`、`SettingsForms`、`NodePanel`、`TaskDetail`、`Handoff`、`Setup`、`Funding` 里；把每个的 class 列在报告里。
2. 渐进增强（`@supports (selector(details::details-content))`）：
   - `details::details-content { block-size: 0; overflow: clip; transition: block-size var(--dur-base) var(--ease-out), content-visibility var(--dur-base) allow-discrete; }`
   - `details[open]::details-content { block-size: auto; }`，并设 `interpolate-size: allow-keywords`。
   - 不支持的浏览器保持现在的"瞬间展开"，不报错。
3. 展开时标题（`summary`）旁的小箭头旋转 90°（如果它是用伪元素画的；如果是浏览器自带的三角形就不动）。
4. 减少动效：不做高度过渡。

## 可以改的文件
只有 `src/styles/dx-13-details-motion.css`。不改任何 `.tsx`。

## 验收
- 打开折叠区的测试（`events`、`today`、`m2b`、`bts` 里的 "More"）桌面 + 手机绿。
- 在支持的浏览器里（Playwright 自带 Chromium）：展开瞬间 `::details-content` 的 `block-size` 在过渡中。
- Juanxi 怎么验：Events 里点一个步骤，右栏里的 "More" 点开，内容平滑展开。

## 回滚
R1 或 R2。
