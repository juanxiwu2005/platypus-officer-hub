# Phase 3 测试当天步骤（给 Juanxi）

每一场都按这份走。依据：IRB 协议 HRP-503A Part 3（第 6 节步骤 1–6、第 11.4 节）。字段说明见 `PHASE3_DATA_DICTIONARY.md`。

## 测试前（每天一次）

1. 打开 https://platypus-officer-hub.netlify.app/api/health ，确认写着 `"provider": "ASU AIR"` 和 `"configured": true`。不是的话先别开始。
2. 自己用无痕窗口走一遍测试链接，确认能直接进 "Name your club"。

## 测试中

1. **先确认资格、签同意书、给 study ID（E01、E02…）。** 这些都在网站外面做。
2. **让参与者打开一个无痕窗口**（Chrome：Incognito；Safari：Private）。在线测试时，请他只共享这个浏览器窗口。
3. **发测试链接：** `https://platypus-officer-hub.netlify.app/#/start`
   - 打开后直接进 setup，不经过欢迎页。
   - 同一个窗口里**不要再打开一次这个链接**，否则会开始新的一次记录、重新从空白开始。
   - 不小心刷新没关系，填的内容会留着。
4. **任务 (f)：setup。** 让他按组织卡片填一个虚构社团。First event 那一屏可以计划一场，也可以按 "Skip for now" 跳过；这是观察点，不要提示他选哪个。
5. Start workspace 之后，社团里会有他计划的活动（如果有）加上三个示例活动（Networking Night、Spring Speaker Night、Founder Dinner）和示例任务。接着做任务卡片 (a)–(e)。
6. **提醒参与者：** 写提醒、邀请时可以点 Gmail / WhatsApp 看看草稿，**但不要真的发出去**。
7. 最后引导他用右边 Ask 新建一个活动（例如点 "Plan a new event"）。

## 结束时

1. 参与者点 **Settings → My preferences → Export my data**，浏览器会下载一个 `platypus-export-….json` 文件。
   - 当面测试：文件直接存在你的电脑上。
   - 在线测试：请他把文件发到你的 ASU 邮箱。发完后他可以删掉自己那份。
   - 他不愿意交文件也可以，这场就只用评分表和录像。
2. **关掉无痕窗口。** 网站在这个浏览器里的数据就全部清掉了（协议第 6 步要求当着参与者的面清掉）。
3. 你把文件改名为只带 study ID（例如 `E01.json`），存到 ASU 的存储里，再删掉邮件里的那份。
4. 想把文件转成表格：`node scripts/export-to-csv.mjs E01.json`，会生成 `E01.csv`，可以直接用 Excel 打开。

## 万一

- **AI 没反应或出错：** 网站会自动改用内置的回答，答案旁边会写 "AI unavailable"。在评分表上记一下，继续做下一项。
- **参与者用手机：** 也能用，但优先用电脑。
- **Demo 菜单里的 Test Onboarding 按钮：** 那是给你自己测试用的，不会写记录，不要让参与者用。
