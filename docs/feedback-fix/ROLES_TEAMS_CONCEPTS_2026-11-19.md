# Settings → Roles & teams 四个静态方案（Juanxi 选 C，已实现，待验收）

2026-11-19，Claude。只有静态图，没有改产品代码。数据是虚构演示社团（Desert Founders Society）。

## 为什么要改

Workflow 的团队分支（Operations、Finance、Marketing、Club leadership）现在来自 `org.workflowTeams`，岗位和团队的对应（`org.workflowRoleTeams`）只能在 Workflow → More → Teams 的小面板里改。Roles 页面完全看不到团队，所以“谁在哪个团队、这个团队负责哪些步骤”要在两处来回找。四个方案都把 Roles 页改名为 **Roles & teams**，团队颜色和 Workflow 画布一致；数据结构不用变（每个岗位属于一个团队）。

## 四个方案

| 方案 | 图 | 做法 | 好处 | 代价 |
| --- | --- | --- | --- | --- |
| A 按团队分组的表格 | [A-table-grouped.png](../prototypes/roles-teams-concepts/A-table-grouped.png) | 现在的表格加 Team 列，按团队分组，每组一行标题（几个岗位、负责几个步骤、Rename、Open in Workflow）；组织图按团队上色 | 改动最小，联系方式一眼都在 | 团队仍然像表格里的一个字段 |
| B 团队看板 | [B-team-board.png](../prototypes/roles-teams-concepts/B-team-board.png) | 每个团队一张彩色卡片，把岗位卡片拖进团队；底部 “Not in a team”；联系方式表格折叠 | 分配团队最直观，新岗位不会漏 | 看不到汇报关系；手机上要改成竖排 |
| C 组织图 + 团队区域 | [C-chart-zones.png](../prototypes/roles-teams-concepts/C-chart-zones.png) | 汇报线照旧，团队变成彩色底块包住岗位；点岗位在右侧面板改负责人、汇报对象、团队、联系方式、职责；可切到 Contact list | 汇报关系和团队同时看；右侧面板和 Workflow Details 用法一致 | 团队和汇报线不一致时（如跨团队汇报）图会复杂 |
| D 团队列表 + 团队详情 | [D-team-detail.png](../prototypes/roles-teams-concepts/D-team-detail.png) | 左边团队列表，右边选中团队的成员、职责、在各个 Workflow 模板里负责的步骤（小泳道）和 Open in Workflow | 团队成为一等对象，和 Workflow、换届（步骤跟岗位走）连得最紧 | 看全体联系方式要切到 All roles；改动最大 |

## 建议

这一轮建议 **C**：保留社长已经熟悉的组织图，团队用和 Workflow 一样的颜色块显示，编辑都在右侧面板（和 Workflow 的 Details 一样）。以后社团有多个模板时，再把 D 的“团队负责哪些步骤”放进 C 的右侧面板。

## 源文件

`docs/prototypes/roles-teams-concepts/source/`（`gen.py` 生成 HTML，`snap.cjs` 用 Playwright 截图，1440 宽、2 倍像素）。

## 方案 C 实现（2026-11-19，worktree Agent E）

- Settings 的 “Roles” 改名 **Roles & teams**。Chart 视图：汇报线 + 团队色块（颜色与 Workflow 画布同一套，抽到 `src/styles/fb-10-team-tones.css`，Workflow 画布像素不变），标签 “<Team> · N steps”（默认模板的步骤数），没有团队的岗位放在 “Not in a team”。
- 右侧面板：点岗位改 Title / Officer name / Reports to / Team / Email / Phone / ASU ID / Duties，显示 “Owns N steps in <模板>” 和 Open in Workflow；改团队立即保存（`saveWorkflowTeams`），可 Undo。点团队标签改团队名、看岗位、Delete team（有岗位、任何模板版本或草稿在用、预设团队、最后一个团队时不能删，并写原因）。
- `+ Role`、`+ Team`；`Contact list` 是原来的表格，多一列 Team 标签；Closed roles、Invite officers 在下方。Workflow → More → Teams 继续可用，并能跳到 Roles & teams（`#/settings?tab=roles`）。
- 在这一页右侧 Ask 面板默认收起（和 Workflow 页一样），平板和手机上右侧面板排到组织图下面。
- 代码：`src/engine/teamOrgChart.ts`、`src/components/settings/{TeamOrgChart,RolesTeams,RolesTable}.tsx`、`src/data/roleEdits.ts`、`src/data/workflowTeamSettings.ts`。schema 不变。
- 验证：lint、build 通过；单元 2120 项中 2118 过（2 项旧失败）；新 `e2e/settings-roles-teams.spec.ts` 桌面+手机 10/10，和 Workflow 两份页面测试合并复验 28/28；Settings 字数 146/150。Agent 另跑的 handoff / setup-team / a11y / m4-setup 中 8 项失败，在改动前的代码上同样失败（之前也记录过），与本次无关。
- 截图：`C-implemented-desktop.png`、`C-implemented-team.png`、`C-implemented-phone.png`。
- 验收：preview14 → Settings → Roles & teams；点 Secretary，把 Team 改成 Marketing，看色块变化，再点 Undo；点 Finance 标签看团队详情；切到 Contact list。
