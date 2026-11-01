# 界面与动效升级计划（design-upgrade）

> **状态：Juanxi 已于 2026-11-01 批准**（见 `docs/PROGRESS.md` 决定记录）。集成分支 `claude/determined-johnson-yrdxwf` 已建。批准范围不含：合并到 `main`、DX-20 的 20b、DX-27 的"合并小样式文件"。
> 来源：2026-11-01 对 `main@c3c9394` 的审阅（用 Apple Design 两个 Skill：`dickwu/apple-design-skill` 和 `emilkowalski/skills` 里的 `apple-design`）。
> 依据：真实截图（桌面 1440、手机 390、深色）、浏览器里量到的计算样式、对 `src/styles.css` 和相关组件的逐行阅读。

## 当前分支现状（2026-11-01，Juanxi 决定）

- **集成分支 = `claude/determined-johnson-yrdxwf`**（不是 `integration/v1.6`）。原因：这个会话的 git 凭证只能推这个分支，推其他分支和所有标签都返回 403（见 `ROLLBACK_LOG.md` 的"为什么推不了"）。Juanxi 同意直接用它做 v1.6 预览。这违反 `AGENTS.md` 8.1 的"分支名不带 AI 名字"，已记入决定记录。
- 预览是 **PR #10**（`claude/determined-johnson-yrdxwf` → `main`，Draft）。PR #9（`integration/v1.6`）已关闭，GitHub 不能删除 PR，也不能复用号码。
- 因为只能推这一个分支，**工作包分支（`design/dx-NN-…`）只存在于做事的 worktree 里**。它们的提交通过 `--no-ff` 合并提交进入 `claude/determined-johnson-yrdxwf`，所以 GitHub 上有完整历史，随时可以 `git revert -m 1 <合并提交>`。想让 GitHub 上也出现这些分支名和 `dx/*` 标签，用有权限的账号执行 `ROLLBACK_LOG.md` 里的"补建命令"。
- 下文凡是写"集成分支"，现在都指这个分支。

## 先看哪个文件

| 文件 | 内容 |
| --- | --- |
| `DETAIL_LIST.md` | 全部细节清单（58 条，每条写明现状、证据、建议、归哪个工作包）|
| `PHASES.md` | 7 个阶段、27 个工作包、依赖关系、文件归属表、每个阶段的"启动口令" |
| `work-packages/DX-NN-*.md` | 每个工作包一份说明（agent 只读自己这一份 + 本文件）|
| `ROLLBACK_LOG.md` | 回滚登记表：每合并一个工作包就登记一行 |
| `reports/` | 每个工作包做完后由执行 agent 写一份短报告（做了什么、证据、已知问题）|

## 一句话方案

1. 先做**地基**（阶段 0）：把样式拆成"每个工作包一个小文件"，把 `Layout.tsx` 拆开，改好测试端口。做完以后，后面的工作包基本不会改同一个文件，多个 agent 可以在各自的 git worktree 里同时开工。
2. 再按阶段推进：**手感 → 空间感 → 版面 → 手机外壳 → 材质与手势 → 收口**。每个阶段里的工作包彼此独立，可以一次发起。
3. 每个工作包都能**单独回滚**，不影响其他工作包。

## 硬性规则（继承 `AGENTS.md`，在这里再强调一遍）

1. 不碰 `main`。不推送、不合并 `main`。只有 Juanxi 说"批准合并"才合。
2. 界面文字用英文，文档用中文。不放密钥、研究数据、真实成员数据。
3. **颜色、字号、圆角、层级只能用 token**（`docs/DESIGN_TOKENS.md`）。新增的动效时长和曲线也只能用阶段 0 加的 `--dur-*`、`--ease-*`、`--spring-*` token，CSS 里不准写裸的毫秒数。
4. **不改数据结构**：不动 `SCHEMA_VERSION`、不动 localStorage 的键。这样回滚永远不会让浏览器里的旧数据出问题。如果某个工作包真的需要改，必须先停下来问 Juanxi。
5. 不超 `npm run words` 的字数上限。不靠藏文字过线。
6. 不碰 `src/organization/`、`src/phase1/`、`src/workspace/`（旧代码，样式检查不管它们）。
7. 悬停卡在桌面上**保持零延迟**（S3 决定，`e2e/feel.spec.ts` 守着）。Events 左侧的活动名称列表**保留**（Juanxi 2026-10-31 要求）。
8. 只用 `transform` 和 `opacity` 做动画。不做会无限循环的动画（已有的加载点除外，且要有"减少动效"版本）。
9. 每个会动的东西都要有"减少动效"版本：位移和缩放换成淡入淡出，或者直接不动。
10. 动画必须能被打断：用户在动画中途再点一下，要从当前位置走，不能先播完。

## 第 0 步：建集成分支（批准之后，只做一次）

这份计划的文档目前在分支 `claude/determined-johnson-yrdxwf` 上（= `main` 加上这些文档，没有任何代码改动）。批准后，让一个 session 这样建集成分支：

```bash
git fetch origin
git switch -c claude/determined-johnson-yrdxwf origin/claude/determined-johnson-yrdxwf
git merge origin/main        # main 常有新提交（演示数据等），先合进来
npm ci && npm run check      # 起点必须全绿
git tag dx/baseline
git push -u origin claude/determined-johnson-yrdxwf --tags
```

之后所有工作包都从 `origin/claude/determined-johnson-yrdxwf` 开出。**不要**在 `claude/determined-johnson-yrdxwf` 上做执行工作。`main` 一直不动。

## 分支与 worktree 约定

- 集成分支：`claude/determined-johnson-yrdxwf`（从 `origin/main` 开出，**不是** `main`）。
- 每个工作包一个分支，从集成分支开出：`design/dx-NN-<英文短名>`。全小写，不带 AI 名字，不带随机串（`AGENTS.md` 第 8 节）。
- 每个工作包一个 worktree，目录放在仓库旁边：

```bash
git fetch origin
git worktree add ../platypus-dx-03 -b design/dx-03-press-feedback origin/claude/determined-johnson-yrdxwf
cd ../platypus-dx-03
npm ci
```

- **端口要错开**（阶段 0 的 DX-01 做好环境变量之后）：每个 worktree 用不同的端口，否则 Playwright 会"复用"别人的服务，测到别人的代码。

```bash
# 例：DX-03 用 5103 起头
PW_PORT=5103 PW_STORAGE_PORT=5203 WORDS_PORT=5303 npx playwright test e2e/feel.spec.ts --project=desktop
npx vite --port 5103   # 手动看页面时
```

- 没有预装浏览器时用 `PW_CHROMIUM=<chromium 路径>`。
- 工作包 agent **只跑**：`npm run lint`、`npm run build`、`npm test`，再加这个工作包说明里列出的几个页面测试。完整的 `npm run check` 由整合人在每个阶段结束时跑一次。
- **并行 agent 不改这些文件**（会冲突）：`docs/PROGRESS.md`、`AGENTS.md`、`docs/DESIGN_TOKENS.md`、`src/styles.css`、`src/styles/index.css`。进度和交接由整合人统一写。

## 样式怎么放（DX-01 之后）

- 每个工作包的样式写在**自己的小文件**里：`src/styles/dx-NN-<名字>.css`（DX-01 会提前建好空文件）。
- 这些文件由 `src/styles/index.css` 按编号顺序引入，在 `src/styles.css` **之后**加载，所以可以覆盖旧规则。
- **不要改 `src/styles.css`**。要改旧规则，就在自己的小文件里用同样的选择器覆盖。这样回滚就是"删掉这个小文件的内容"。
- 同一个选择器可以被不同工作包写**不同的属性**，但**同一个属性只归一个工作包**（归属表在 `PHASES.md`）。
- 验收通过之后，DX-27 可以（经 Juanxi 同意）把小文件合回主文件，画面必须逐像素一致。

## 回滚（最重要）

### 合并方式（让每个工作包都能单独回滚）

整合人把工作包合进集成分支时，**必须**这样做：

```bash
git switch claude/determined-johnson-yrdxwf
git tag dx/phase-N-before            # 阶段开始前打一次，N 是阶段号
git merge --no-ff design/dx-NN-xxx -m "[DX-NN][整合] 合并 xxx"
git tag dx/dx-NN-merged              # 指向这次合并提交
git push origin claude/determined-johnson-yrdxwf --tags
```

- `--no-ff` 会留下一个"合并提交"，回滚时撤掉它就等于撤掉整个工作包。
- 之后在 `ROLLBACK_LOG.md` 登记一行（工作包、合并提交、tag、日期）。
- 集成分支合到 `main` 时，Juanxi 在 GitHub 上选 **Create a merge commit**，**不要选 Squash**。Squash 会把所有工作包压成一个提交，就没法单独回滚了。

### Juanxi 只需要说一句话

> "回滚 DX-12"　或　"回滚阶段 2"　或　"整套都不要，回到改之前"

agent 照下面执行（Juanxi 不需要懂这些命令）。

| 想要 | 做法 | 谁能做 |
| --- | --- | --- |
| **R0 还没合并就不满意** | 不合并那个分支，直接丢掉 worktree：`git worktree remove ../platypus-dx-NN` | 整合人 |
| **R1 快速关掉（仅纯样式的工作包）** | 在 `src/styles/index.css` 里把对应那一行 `@import` 用 `/* ... */` 注释掉，提交推送。一行改动，页面立刻变回去。工作包说明里写了"R1 可用"才能用 | 整合人 |
| **R2 撤销一个工作包** | `git revert -m 1 dx/dx-NN-merged`，推送。这会生成一个新的"反向提交"，历史保留，随时能再撤销这次撤销 | 整合人 |
| **R3 撤销一个阶段** | 按**从后往前**的顺序，对本阶段每个 tag 做一次 R2 | 整合人 |
| **R4 整套回到改之前** | 对所有 `dx/dx-*-merged` 从后往前 R2；或者（需要 Juanxi 明确说"可以强制重置"）`git reset --hard dx/phase-1-before` 再 `git push --force-with-lease`。默认用 R2，不用重置 | 整合人 |
| **R5 线上救急（已经上线 `main` 之后）** | 在 Netlify 网页的 Deploys 里选改之前的那个版本，点 Publish deploy（需要 Juanxi 本人在 Netlify 里点；之后要把自动发布重新打开）。然后再用 R2 在代码里正式撤销 | Juanxi |

**依赖要先撤：** 撤一个工作包之前，先看 `PHASES.md` 的依赖表。如果别的工作包依赖它，要先撤那些（从后往前）。

**再做一遍：** 撤销之后又想要回来，对那个"反向提交"再 `git revert` 一次即可。

### 为什么回滚是安全的

- 所有工作包都不改数据结构（规则 4），所以回滚不会让用户浏览器里的旧数据出错。
- 每个阶段开始前有 `dx/phase-N-before` 标签，每个工作包合并后有 `dx/dx-NN-merged` 标签。
- 每个阶段结束时，整合人把"改之前 / 改之后"截图脚本的结果发给 Juanxi（`node scripts/dx-shots.mjs <标签> <网址>`，DX-01 提供），Juanxi 在预览网址上看。

## 每个工作包的通用验收（说明里不再重复）

1. `npm run lint`、`npm run build`、`npm test` 全绿。
2. 该工作包列出的页面测试全绿，**断言不能削弱**；需要改测试时，只能改成"同样严格地测新行为"，并在报告里写清楚。
3. 在 Playwright 默认的"减少动效"模式下，页面行为和以前完全一致（DX-01 会把它设为默认，所以旧测试不会因为动画变得不稳定）。
4. 另有一个专门的测试文件 `e2e/dx-NN-*.spec.ts`，用 `test.use({ reducedMotion: "no-preference" })` 验证动效**真的存在**；再用 `reduce` 验证**降级版本**。纯样式的小改动可以只测计算样式。
5. 桌面 1440、手机 390、浅色、深色，四种组合各截一张"前/后"图（`scripts/dx-shots.mjs`）。**判断"画面有没有变"看变化的像素数，不要只看字节是否一致**：同一个构建拍两次，手机图也会有最多约 9,500 像素（≈0.7%）的噪声，已见过的上限约 15,000 像素。要求"完全不变"的包，桌面图应当 0 张变化。
6. 轴向检查：`npm run words` 不增加；`e2e/a11y.spec.ts` 无新增违规；`noOverflow` 为 0（手机不出现横向滚动）。
7. 写 `reports/DX-NN.md`：改了什么、提交 SHA、测试结果（真实数字）、已知问题、怎么回滚（R 几）。

## 每个工作包 agent 的启动口令（模板）

```
你是 Platypus 仓库的执行 agent。工作包：DX-NN（<名称>）。
先读：AGENTS.md、docs/design-upgrade/README.md、docs/design-upgrade/work-packages/DX-NN-*.md。
你在自己的 git worktree 里，分支 design/dx-NN-<短名>（从 origin/claude/determined-johnson-yrdxwf 开出）。
只改工作包说明里"可以改的文件"。不碰 main，不改 docs/PROGRESS.md / AGENTS.md / src/styles.css。
做完：跑工作包列出的检查，写 docs/design-upgrade/reports/DX-NN.md，提交（格式 [DX-NN][Claude] 一句话），
推送你自己的分支，然后停下，把报告摘要和 R 级别回滚方式告诉整合人。不要合并，不要开 PR。
用简单的中文汇报。界面文字用英文。
```
