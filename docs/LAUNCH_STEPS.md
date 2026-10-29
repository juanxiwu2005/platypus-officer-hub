# 上线步骤（v1.0）— 点哪里

写给 Juanxi。只有你在对话里明确说「批准合并」之后，才会进入第 4 步。第 1–3 步现在就可以做，不影响线上。

> 我（Claude）从云端环境访问不到 Netlify 预览和正式站（返回 401：访问保护），所以**下面第 1–3 步我没有亲自验证过**，需要你来点、来确认。

## 1. Netlify 环境变量（在 3 个范围里都要有）

1. 打开 https://app.netlify.com ，点进站点 `platypus-officer-hub`。
2. 左边点 **Site configuration** → **Environment variables**。
3. 找 `AI_API_KEY`，点它右边的 **Options → Edit**。
4. 看 **Scopes / Values**：Production、Deploy Previews、Branch deploys 三项都要有值（可以是同一把 key）。没有的范围，点 **Add a different value for each deploy context** 补上。
5. 找 `AI_PRESET`：
   - 不存在 → 正好，默认就是 ASU AIR。
   - 存在且是 `asu_air` → 可以保留。
   - 存在且是 `deepseek` → **删掉**（Options → Delete）。代码里 DeepSeek 已移除，留着会让 AI 直接拒绝工作。
6. 如果还有 DeepSeek 的旧 key（变量名带 `DEEPSEEK`），也删掉。
7. 找 `ORG_SETUP_ENABLED`：**必须不存在，或者不是 `true`**。（IRB 要求服务器不存任何资料。）如果是 `true`，删掉。
8. 改完后，**Deploys → Trigger deploy → Deploy site** 重新部署一次，环境变量才会生效。

## 2. 用虚构数据做一次小的 AI 冒烟测试（预览站）

打开预览：https://deploy-preview-8--platypus-officer-hub.netlify.app （如果要求登录，用你的 Netlify 账号）。

只用虚构数据，不要输入真实姓名或研究资料。在 Ask 里依次试三件事：

1. 问一条规则，例如：`Can we order food from an outside caterer?` → 应该给出带出处的回答。
2. 说：`Create an executable task: print flyers, owner Alex` → 应该出现任务表单，不是活动。
3. 说：`Plan a new event called Spring Mixer` → 应该出现活动表单。

三次都有合理回复就算通过。**这只是 3 次调用，花不了多少额度。**

**40 道规则评估（`docs/AI_TESTS.md`）会花较多额度。要不要跑，由你决定；你说「跑」我才会准备命令。** 没跑之前，文档里不会写"真实 AI 验收通过"。

## 3. 确认限流有效，之后才能关访问保护

站点现在有 Netlify 访问保护（所以外人和我都打不开）。上线给社团用之前要关掉，但关掉之前先确认限流在工作：

- 限流规则：每个 IP 每分钟 60 次、每小时 600 次；全站每小时 3000 次。
- 它是**每个函数实例各算各的**（存在内存里），所以是"挡住滥用"，不是精确计数。
- 确认方法：在预览站打开浏览器开发者工具（Chrome：F12 → Network），连续快速刷新触发 Ask 超过 60 次，应该出现状态码 **429**。如果你不想这样试，告诉我，我写成一个脚本给你。
- 看到 429 之后，再去 **Site configuration → Access & security → Visitor access**，把保护关掉（只在你确定要公开时）。

## 4. 合并后（只有你说「批准合并」才做）

我会：合并 `integration/v1.0` 到 `main` → 打 `v1.0` 标签 → 等 Netlify 部署完。然后你确认：

1. 打开 https://platypus-officer-hub.netlify.app 能进入 Today 页。
2. 打开 https://platypus-officer-hub.netlify.app/api/health ，应该看到 provider 是 **ASU AIR**（不是 deepseek），且没有出现 org 存储相关内容。
3. 在正式站再做一遍第 2 步的三件事。

出问题时回退：Netlify → **Deploys** → 选上一个绿色部署 → **Publish deploy**。

## 5. 合并后可以关闭的 PR 和可以删的分支

先关 PR，再删分支（AGENTS.md §8.2）。**我不会替你删。**

| PR | 处理 |
| --- | --- |
| #8 | 合并后自动完成 |
| #7（Night Mode + N1–N6） | 内容已在 v1.0 里，可以关闭 |
| #6（M2a/M2b） | 内容已在 v1.0 里，可以关闭 |
| #5、#4、#3、#2 | 旧的预览/集结，可以关闭 |

PR 全部关闭后，这些分支可以删：`feat/ai-night-mode`、`feat/m2b-ai-intake`、`feat/organization-setup-ai`、`feat/ai-native-phase1`、`integration/dp3-dp4-merge`、`integration/v1.1-fix`、`integration/v1.0`、`v1`。保留 `main`。

## 6. 之后要做的（v1.5）

见 `docs/PROGRESS.md` 最上面的 S9 一行和 `docs/M4_ONBOARDING_PLAN.md`。
