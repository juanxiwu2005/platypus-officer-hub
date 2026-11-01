# v1.6 界面与动效升级：总结（27 个工作包）

- 日期：2026-11-01　整合分支：`claude/determined-johnson-yrdxwf`（PR #10，预览 https://deploy-preview-10--platypus-officer-hub.netlify.app ）
- **全部 27 个包的状态：26 个已合并；DX-20 只做了 20a，20b（手机底部导航）等 Juanxi 批准。** DX-27 的第 3 步（合并小样式文件）等 Juanxi 批准，未做。
- 所有包都没有改数据结构、没有改 `SCHEMA_VERSION`，回滚不会弄坏浏览器里的旧数据。**没有碰 `main`。**

## 每个包的状态

| 包 | 做了什么 | 合并提交 | 回滚 | 报告 |
| --- | --- | --- | --- | --- |
| DX-01 | 地基：样式分文件、动效 token、测试端口、截图脚本、样式守卫 | `9d5a9f0` | `git revert -m 1 dx/dx-01-merged` | `reports/DX-01.md` |
| DX-02 | `Layout.tsx` 拆文件（纯搬家）| `f1dbd24` | `git revert -m 1 dx/dx-02-merged` | `reports/DX-02.md` |
| DX-03 | 按下反馈与悬停过渡 | `055af30` | `git revert -m 1 dx/dx-03-merged` | `reports/DX-03.md` |
| DX-04 | 触屏点击区 ≥44px | `39aab5a` | `git revert -m 1 dx/dx-04-merged` | `reports/DX-04.md` |
| DX-05 | 风险点加形状（不只靠颜色）| `b5ee333` | `git revert -m 1 dx/dx-05-merged` | `reports/DX-05.md` |
| DX-06 | 字体细节 | `0187d36` | `git revert -m 1 dx/dx-06-merged` | `reports/DX-06.md` |
| DX-07 | 页面元信息、点击高亮、滚动穿透 | `775264a` | `git revert -m 1 dx/dx-07-merged` | `reports/DX-07.md` |
| DX-08 | 已有动画补"减少动效"保护 | `eb55e5a` | `git revert -m 1 dx/dx-08-merged` | `reports/DX-08.md` |
| DX-09 | 右栏滑入滑出、Ask 按钮、安全区、`dvh` | `d419447` | `git revert -m 1 dx/dx-09-merged` | `reports/DX-09.md` |
| DX-10 | 菜单进出（Demo 菜单、铃铛）| `5a32bf7` | **先** `git revert --no-edit 6f62b17`，再 `git revert -m 1 dx/dx-10-merged` | `reports/DX-10.md` |
| DX-11 | Toast 进出 | `b54de9b` | `git revert -m 1 dx/dx-11-merged` | `reports/DX-11.md` |
| DX-12 | 手机悬停卡底部弹层 | `e8ff3ec` | `git revert -m 1 dx/dx-12-merged` | `reports/DX-12.md` |
| DX-13 | 折叠区展开动画 | `4b118e7` | `git revert -m 1 dx/dx-13-merged` | `reports/DX-13.md` |
| DX-14 | 加载骨架 + 延迟显示 | `d83af1f` | `git revert -m 1 dx/dx-14-merged` | `reports/DX-14.md` |
| DX-15 | Events 版面 | `d89d959` | **先** `git revert --no-edit a8775e6`，再 `git revert -m 1 dx/dx-15-merged` | `reports/DX-15.md` |
| DX-16 | Tasks 看板版面 | `e6618b8` | **先** `3972412`、再 `a8775e6`，再 `git revert -m 1 dx/dx-16-merged` | `reports/DX-16.md` |
| DX-17 | Ask 面板 | `8613954` | `git revert -m 1 dx/dx-17-merged` | `reports/DX-17.md` |
| DX-18 | 空状态文案与下一步 | `12f079e` | `git revert -m 1 dx/dx-18-merged` | `reports/DX-18.md` |
| DX-19 | 详情切换交叉淡入 + 页面淡入 | `a5fcff5` | `git revert -m 1 dx/dx-19-merged` | `reports/DX-19.md` |
| DX-20 | **只有 20a**：手机顶栏瘦身（20b 底部导航未做，需批准）| `cc6a3d6` | `git revert -m 1 dx/dx-20-merged` | `reports/DX-20.md` |
| DX-21 | 看板列头减饱和 | `f6bd79a` | `git revert -m 1 dx/dx-21-merged` | `reports/DX-21.md` |
| DX-22 | 流程图节点改 `transform` + 弹簧 | `bfafc89` | **DX-24、DX-25 依赖它的 `src/lib/motion.ts`：先撤 DX-25、DX-24，再撤 DX-22** | `reports/DX-22.md` |
| DX-23 | 半透明顶栏 + 阴影层级 token | `0e93cd6` | `git revert -m 1 dx/dx-23-merged` | `reports/DX-23.md` |
| DX-24 | 看板指针拖拽 + 让位 + 弹簧 + 键盘 | `8ac5b82` | `git revert -m 1 dx/dx-24-merged`（**先撤 DX-26**，它用 `dragSort.ts`）| `reports/DX-24.md` |
| DX-25 | 完成时刻：进度链生长、圆点弹、环形进度、角标 | `7ef5a87` | `git revert -m 1 dx/dx-25-merged` | `reports/DX-25.md` |
| DX-26 | Partners 看板拖拽 | `255c009` | `git revert -m 1 dx/dx-26-merged` | `reports/DX-26.md` |
| DX-27 | 文档收口 + 样式守卫补全（第 3 步未做）| `7c27bea` | `git revert -m 1 dx/dx-27-merged` | `reports/DX-27.md` |

阶段回滚：对该阶段的合并提交从后往前逐个 `git revert -m 1`；每个阶段的演练记录在 `ROLLBACK_LOG.md` 的"回滚演练记录"（阶段 0–5 都撤完后与 `dx/phase-N-before` **逐字一致**；阶段 6 的演练见下）。

## 已知问题和没验证的（如实）
1. **真实手机/真机手指**没测：触摸只用合成事件测了逻辑（DX-24/26 的拖拽、DX-12 的底部弹层、DX-04 的点击区）。
2. **Safari 和旧浏览器**：`@starting-style`、`::details-content`、滚动驱动的渐隐（DX-19/13/…）在不支持时退回"瞬间出现"，功能不受影响，但没有动画；没有在 Safari 实测。
3. **DX-22** 流程图节点的位置很少真的变（布局保留近似时间位置），所以平时几乎看不到弹簧；测试拆成"样式在"和"规则对"两部分。
4. **DX-25** "把步骤标 Done → 进度链生长"的整条流程没有录像，只测了各部分。
5. **DX-20b**（手机底部导航）没做，需要 Juanxi 批准。
6. **DX-27 第 3 步**（把 `dx-*.css` 合回 `styles.css`）没做，需要 Juanxi 批准；合并后 R1 快速关闭失效，只剩 R2。
7. `dx/*` 标签和 `design/dx-NN-*` 分支**只在本地**（这个会话的凭证推送会 403）。补建命令在 `ROLLBACK_LOG.md`；没有标签也能用合并提交的 SHA 回滚（上表第 3 列）。
8. 单元测试 `engine.test.ts` 在机器很忙时偶尔超过 5 秒（本来就有的脆弱点，不是本次引入；建议把超时调到 15 秒）。
9. 容器里 Playwright 浏览器路径变过：本地跑要设 `PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`。

## 要 Juanxi 决定的
- 要不要做 DX-20b（手机底部导航）？
- 要不要做 DX-27 第 3 步（合并小样式文件）？做了就不能再用"注释一行 `@import`"关掉某个包。
- 预览（PR #10）看完满意后，合并到 `main` 请选 **Create a merge commit**（不要 Squash），否则不能再按工作包回滚。合并只有 Juanxi 说"批准合并"才做。
- `integration/v1.0` 等旧分支能不能删：由 Juanxi 决定（这个会话没有权限）。

## 完整检查（阶段 6 合并后）
- Node 22，`npm run check`（lint + 构建 + 单元 + 页面 + 字数，单独跑、没有别的任务同时占用）：**839 个单元测试通过**（阶段 5 是 834，本阶段新增 5 个守卫测试）；**619 个页面测试通过 / 93 个按设计跳过 / 0 失败**（阶段 5 是 613 / 87；多出的 6 个是 DX-26 的桌面测试，手机上跳过 6 个）；字数全部在上限内。
- 画面对比（阶段 6 开始前的构建 vs 现在，64 张）：**62 张逐像素一致**；另外 2 张（`events-mobile-light-rail-open`、`team-mobile-light-rail-open`）有差异，但重拍后证明是随机噪声——同一份旧代码连拍 3 次，Team 那张自己就在 0 和 8,629 像素之间跳；同一份新代码连拍 3 次，Events 那张自己在 0 和 699 之间跳。两个差异都与本阶段改动无关（本阶段只改了 Partners 看板、文档和样式检查）。
- 回滚演练：见 `ROLLBACK_LOG.md` "回滚演练记录"最后一行（撤 DX-27、DX-26 后与阶段 6 开始前逐字一致）。
