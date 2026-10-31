# WP09 — 初始包体与路由懒加载

## Agent 提示词

你负责降低初始 JS 包体并引入安全的路由/功能级懒加载。开始前读取 `AGENTS.md`、README、manifest，fetch 最新阶段基线并报告 SHA。不得使用 `main`。

### 审核基线

- 主入口 JS 约 722.65 kB（gzip 约 222.23 kB）。
- `src/App.tsx` 同步导入大型 PhaseOne。
- PDF 读取代码形成大型 chunk。

### 要求

- 对 PhaseOne、组织设置、PDF 读取等非首屏功能实施路由级或功能级 lazy loading。
- 提供可访问的 Suspense/loading UI，避免白屏和明显布局跳变。
- Hash route、直接访问、刷新、Back/Forward 和未保存数据保护必须正常。
- 不得通过提高 `chunkSizeWarningLimit` 隐藏问题。
- 使用 manualChunks 时避免循环依赖和加载顺序问题。
- 不延迟首页必要交互。

### 验收标准

1. 主入口 chunk 低于 500 kB 未压缩，并报告优化前后大小。
2. 首屏不下载 PhaseOne/PDF 实现 chunk。
3. `npm run build`、`npm run lint`、`npm test`、`git diff --check` 通过。
4. smoke、phase1、organization setup 的关键 Playwright 测试通过。
5. 直接访问和刷新 `/#/phase1` 正常，加载状态可访问且无白屏。
6. 创建一个 `[RR-WP09][Codex]` 提交。
