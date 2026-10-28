# IRB 交接包 · 2026-10-28

给另一个对话用的核对材料。研究编号 STUDY00024727，Platypus Phase 3 prototype 测试。

**这份文件里的每一条都在仓库里核对过**，核对时的分支是 `feat/ai-night-mode`
（提交 `55949b8`），和 `main` 在这些方面没有差异。下面每条都写了来源文件和行号，
另一个对话可以自己去查。

**最后一节「我无法核对的事」必须读。** 有一件事只有 Juanxi 本人能确认。

---

## 1. 收集什么数据（要写进 Protocol）

参与者在原型里的每一步操作都会被记下来。这是研究数据，Protocol 必须写。

**可以直接粘进 IRB 表格的英文：**

> Participant interaction logs are recorded locally in the participant's own
> browser using browser localStorage, capped at 2,000 entries (oldest dropped
> first). Each entry records: a sequence number; the real wall-clock timestamp
> of the action; which person the application was set to act as; the action
> type; the action's arguments with long text truncated; and, for actions that
> modify existing data, the field values as they were before the change; and
> whether the application accepted or rejected the action.
>
> Participants export these logs themselves using the "Export my data" button
> on the Settings page, which downloads a single JSON file containing their
> club data and their ordered record of actions. The participant hands that
> file to the researcher. Nothing is transmitted automatically.
>
> The logs contain operational records only. Participants work with fictional
> organization and member information supplied by the researcher, so no real
> names, real contact details, or real organizational records are captured.

**来源（另一个对话可以核对）：**

| 事实 | 文件 | 位置 |
| --- | --- | --- |
| 日志字段结构 | `src/data/types.ts` | 第 367 行 `interface LogEntry` |
| 上限 2000 条 | `src/data/store.tsx` | 第 252 行 `LOG_LIMIT = 2000` |
| 存在 localStorage | `src/data/store.tsx` | 第 261 行 `const store = () => window.localStorage` |
| 导出按钮 | `src/pages/Settings.tsx` | 第 109 行 `data-testid="export-data"` |

字段逐条（`LogEntry`，源文件里的注释原文）：

- `seq` —— 1, 2, 3 … 不复用；开头有缺口说明最旧的几条在 2000 上限处被丢掉了
- `at` —— 动作被派发的真实时间，1970 以来的毫秒数（`Date.now()`）
- `actor` —— 动作执行时 app 的「View as」设成了谁
- `type` —— 动作类型，例如 `updateNode`、`moveTask`
- `payload` —— 动作的参数，已缩短（长文本截断，密钥和臃肿对象不收）
- `before` —— 动作之前那些字段的值，只对「改动已存在的东西」的动作记录
- `applied` —— `false` 表示 app 忽略了这个动作（没权限、无效、或没东西可改）

**对 IRB 有意义的一点：** `before` 字段意味着日志能还原「参与者把什么改成了什么」，
不只是「参与者点了什么」。这比一般的点击流更细，Protocol 里最好写明，不要含糊成
"usage analytics"。

---

## 2. 不要写「服务器端存储组织配置」

Protocol 里**不要**出现服务器保存组织配置这件事。它在 M1（2026-10-27）被彻底关掉了，
研究用的构建不会启用。写了反而会让 IRB 追问数据保留期和删除流程，而那套流程没有东西要管。

**关掉的程度（有测试守着）：**

`ORG_SETUP_ENABLED` 不等于字符串 `"true"` 时，下面 7 个端点全部返回 404，
且存储层 `getStore` 的调用次数为 0：

```
/api/org/setup              /api/org/archive
/api/org/ai                 /api/org/ai-run
/api/workspace              /api/workspace/assistant
/api/workspace/assistant-run
```

- 开关逻辑：`vite.config.ts` 第 11 行，`process.env.ORG_SETUP_ENABLED === "true"`
- 前端侧：`src/phase1/serverStorage.ts` —— 用到存储的画面在**构建时**就被排除，不是运行时隐藏
- 守着它的测试：`src/test/serverStorageHidden.test.ts`
  - 7 个端点各自断言 404 + `getStore` 零调用
  - 专门有一条断言只有**精确的字符串 `"true"`** 能打开它（`""`、`"false"`、`"1"`、`"TRUE"`、`"yes"` 全部仍是 404）
  - 还有一条反向对照：打开后同样的请求**确实**会到存储层，证明这个测试不是空转
- e2e 侧还有一条断言整轮访问产生 0 个存储请求

**如果 IRB 问「原型会不会把数据存到服务器」**，准确的回答是：
研究用的构建里不会，有自动化测试每次 CI 都在验证这一点；代码里存在这条路径，
但在未启用的状态下，相关端点返回 404、相关界面不被打包进去。

---

## 3. AI 供应商（这一节容易写错）

**要写的：** 所有 AI 调用都走 **ASU AIR**（学校内部网关）。路由 v3：

- Gemma 4 31B —— 较长的结构化设置任务
- Muse —— 短对话和编辑
- GLM 5.3 —— 只在用户主动要求 deeper review 时

**⚠️ 不要写 "DeepSeek has been removed"，那不是真的。**

仓库里**还有**一条 DeepSeek 的供应商代码路径，只是在研究用的配置下不会被选中。
有一条测试正在守着它的行为：

```
src/organization/adapter.test.ts
  → "AIR provider routing > keeps DeepSeek behavior unchanged when AIR is not selected"
```

**准确的英文写法：**

> All AI requests in the study configuration are routed to ASU's AIR gateway,
> which is operated by Arizona State University. No participant data is sent to
> any third-party AI provider during the study. The codebase retains an
> unselected legacy provider code path that the study configuration does not
> use.

**为什么这条重要：** 如果 Protocol 说 DeepSeek 已移除，而 IRB 或 IT 安全审查去看代码
发现它还在，那是一个事实错误，可能触发对整份 Protocol 可信度的质疑。
写「保留了一条未启用的旧路径」没有任何坏处，写「已移除」有。

把那条死代码彻底清掉这件事已经排进了后续任务，但**今天提交前来不及做**，
所以今天的 Protocol 要按现状写。

---

## 4. 参与者看到的数据

仓库里只有虚构的演示社团数据。参与者用研究者提供的虚构组织和成员信息操作。
真实姓名、真实联系方式、真实社团记录都不进入系统。

这条是仓库的硬规则（`AGENTS.md` 第 3 节第 1 条）：不提交问卷原始回答、访谈转写、
录音、参与者姓名或引语，也不把这些资料贴给任何 AI。

---

## 5. 参与者招募与分组（Juanxi 2026-10-27 的决定）

- **包含 B 组**，理由是需要观察参与者对 onboarding 过程本身的反馈
- 时间线：周四前后提交 IRB → 下周一或周二获批 → 周三发 recruitment email → 再下一周开始真正的原型测试

（这一节是 Juanxi 自己的安排，不是从代码核对出来的。另一个对话如果要核对，
应该问 Juanxi 本人或看 IRB 系统里的记录。）

---

## 6. 我无法核对的事 —— 需要 Juanxi 本人确认

**`ORG_SETUP_ENABLED` 在 Netlify 的环境变量里有没有被设成 `true`。**

`netlify.toml` 里没有设它，所以默认是关的。但 Netlify 的网站设置界面里也可以设环境变量，
那个界面我在这个会话里看不到。

**第 2 节的全部结论都建立在「它没有被设成 true」之上。**

请在提交前自己确认一次：

> Netlify → 选 platypus 这个站点 → Site configuration → Environment variables
> → 确认列表里**没有** `ORG_SETUP_ENABLED`，或者它的值不是 `true`

如果发现它被设成了 `true`，立刻告诉我，第 2 节要整段重写，
因为那意味着服务器存储是开着的，Protocol 必须写数据保留和删除流程。

---

## 7. 给另一个对话的核对清单

逐条过：

- [ ] Protocol 的数据收集一节有没有写交互日志，而且写法和第 1 节的英文一致
- [ ] 有没有写明日志是**参与者自己导出**交给研究者，不是自动上传
- [ ] 有没有写明日志含 `before` 值（能还原改动前后），不要含糊成 usage analytics
- [ ] Protocol 里**没有**服务器端存储组织配置的描述
- [ ] AI 供应商一节写的是 ASU AIR，三个模型的分工对得上
- [ ] AI 供应商一节**没有**声称 DeepSeek 已被移除
- [ ] 分组里包含 B 组
- [ ] Juanxi 已经确认过 Netlify 的 `ORG_SETUP_ENABLED`（第 6 节）
- [ ] 数据保留：日志在参与者自己的浏览器里，上限 2000 条，清浏览器数据即消失 —— Protocol 的保留期描述要和这个一致

---

## 8. 如果 IRB 回来追问

几个大概率会被问到的，和准确答案：

**「数据存在哪里，保存多久？」**
参与者自己的浏览器（localStorage），上限 2000 条最新记录。研究者手上的副本是参与者
主动导出并交付的 JSON 文件，保留期按 Protocol 里研究者承诺的期限。参与者清除浏览器
数据，本地那份就没了。

**「能不能撤回？」**
参与者在交出 JSON 文件之前，随时清掉浏览器数据即可，不留痕迹。交出之后按 Protocol
的撤回条款处理。

**「AI 会看到参与者数据吗？」**
会 —— 参与者在原型里输入的内容会发给 ASU AIR 网关以生成回应。那些内容是虚构的社团
信息。不经过任何第三方 AI 供应商。

**「有没有密钥泄露风险？」**
产品网站的 API key 只在 Netlify 的环境变量里，不在代码、文档、提示词或提交记录里
（`AGENTS.md` 第 3 节第 2 条）。
