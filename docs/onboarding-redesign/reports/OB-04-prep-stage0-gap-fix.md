# 阶段 0 补齐报告（OB-01 / OB-03 的缺口修复）

> 2026-11-02，Claude。Codex 在 11-01 交付了 OB-01、02、03 的骨架并合并；我对照 `WORK_PACKAGES.md` 和 `PROMPTS.md` 的说明书复核，发现骨架没达到验收门，补齐如下。**这是对 OB-01 和 OB-03 的修复，回滚时要先撤这一个修复提交，再撤 OB-01 / OB-03（见 ROLLBACK_LOG）。**

## 复核发现（用实际运行验证，不是看提交信息）

| # | 问题 | 证据 |
| --- | --- | --- |
| 1 | **入口网址不生效（最严重）：** 文档里给 Juanxi 的预览网址 `/?walkthrough=1#/` 触发不了欢迎页；只有 `/#/?walkthrough=1` 才行。应用是 HashRouter，代码只读 `#` 后面的参数。 | 本机开发服务器、新浏览器，三种网址各开一次：只有第二种进了欢迎页 |
| 2 | **Reset demo 后欢迎页不再出现。** 重置立刻把样例数据写回浏览器，而入口把"浏览器里有数据"当成"不是第一次"。 | 新测试在修复前失败（桌面和手机） |
| 3 | 草稿上下文只有 3 个字段，说明书要求把 `Setup.tsx` 的全部状态一次给全（否则后面并行的包没法改它）。 | 读 `draft.tsx` |
| 4 | 没有进度链、Demo 条；文案表 1 行；`ob-04…09` 的样式空文件和 `@import` 没建；没有 `e2e/ob-helpers.ts`、没有任何 `e2e/ob-*` 页面测试。 | 文件清单；Codex 的三份报告也写了"完整浏览器流程未验证" |
| 5 | "Replay walkthrough" 不记录；选 Start 后不标"已看过"（中途刷新会被弹回欢迎页）；步骤引擎没有接记录。 | 读代码 |
| 6 | 外壳套着旧 Join 页会出现两个 `<main>`。 | 读代码；新测试覆盖 |
| 7 | 样式用了不存在的 token（`--space-4`，靠回退值才没坏）。 | `grep` |

## 做了什么

- **OB-01：** `draft.tsx` 补全为完整的社长草稿（俱乐部、章程、AI 阅读状态、岗位触碰标记、工作流、缓冲、第一场活动、确认、邀请码、跳过列表；用单独的 IndexedDB 键 `onboarding-draft` 保存 7 天，不覆盖旧页面的 `setup-draft`）；`engine/flows.ts`（两条流程的步骤表和路由映射）、`engine/useFlow.ts`（由路由驱动的步骤机：next/back/skip/exit，跳过列表进草稿，事件发给记录）；进度链 `ProgressChain`（线用 `scaleX` 生长，跳过是虚线空心点，减少动效下直接出现）；`DemoStrip`；外壳加 Save & exit；`copy.ts` 补全文案表；`ob-04…ob-09` 样式空文件和 `@import`；`e2e/ob-helpers.ts`。
- **OB-03：** 入口同时读 `#` 前后的参数（`enabled.ts`，有单元测试）；新增 `/welcome/start` 作为"开始一次受记录的 walkthrough"的唯一入口，欢迎页的 Start 和 Demo 菜单的 Replay walkthrough 都走它，选 Start 即标记已看过；`target.ts` 里一个常量 `FOUNDER_START` 决定去哪（OB-10 才切到新流程）；**重置后重新亮起**（`isRearmed()`，记录模块新增一个标记，不删记录）；欢迎页补上隐私一句话。
- **测试（新增）：** `src/test/onboardingGate.test.ts`、`onboardingRecord.test.ts` 加一条；`e2e/ob-01-shell.spec.ts`、`e2e/ob-03-gate.spec.ts`，桌面 + 手机各 14 条，含：两种网址、关着时零变化、Explore 记住、Start 只记一次、Save & exit、Reset 重新亮起且记录保留、Replay 新记录、Export 带 `onboarding` 且不含输入文字、axe 无障碍。

## 没改的

旧 `Setup.tsx`、`Join.tsx`、`store.tsx`（只用了 Codex 已改的两处）、`styles.css`、旧测试（一条都没动）。

## 没验证的

真机手指、Safari；`/welcome/classic` 里旧设立页走到最后一步的完整流程（沿用旧页面，没改）；深色和"减少透明度"下的外壳（只有 axe 的静态检查）；进度链动画只在减少动效模式下测过结构，没有逐帧采样（OB-04 起的屏有动效时再补）；入口"开关默认关闭"靠新测试证明，Netlify 上的环境变量 `VITE_ONBOARDING_WALKTHROUGH` 没有设置过。

## 回滚

先 `git revert` 本修复提交，再按 `ROLLBACK_LOG.md` 撤 OB-03、OB-01、OB-02。R1：不设开关即可让全站回到今天的样子。
