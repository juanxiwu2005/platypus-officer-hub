# Night Mode V1

Night Mode 让 ASU AIR Agent 在 `feat/ai-night-mode` 上完成一个批准过的任务，并用真实测试、独立 Review 和 GitHub CI 检查结果。它不会合并 `main`，也不会部署 Production。

## 安全边界

- 只允许仓库 `juanxiwu2005/platypus-officer-hub`。
- 只允许分支 `feat/ai-night-mode`。
- 开始时工作区必须干净，而且必须已有一个指向 `main` 的 Draft PR。
- OpenCode 只能自动运行构建、单元测试、Playwright 和只读 Git 命令。
- Agent 不能访问项目外目录、密钥、`.env`、依赖文件、GitHub Actions、Netlify 设置或 Night Mode 自身文件。
- 控制脚本而不是 Agent 负责 commit、push 和读取 CI。
- 本地测试或 GitHub CI 失败时最多返工 3 轮，之后停止。
- 只有本地检查、独立 Critic 和 GitHub CI 全部通过，才在 Draft PR 写入 `READY_FOR_CLAUDE`。
- 永远不自动 merge，不修改 `main`，不触发 Production 部署。

## 每次运行

先在仓库目录创建任务文件：

```bash
mkdir -p .nightmode
nano .nightmode/TASK.md
```

任务应写清楚 Goal、Files、Constraints 和 Done means。不能包含 API Key、研究资料或参与者信息。

先运行只读自检：

```bash
node scripts/night-mode.mjs --doctor
```

看到 `DOCTOR PASS` 后再开始：

```bash
node scripts/night-mode.mjs --task-file .nightmode/TASK.md
```

运行完成后只会得到三种结果：

1. `READY_FOR_CLAUDE`：本地测试、Critic 和 GitHub CI 全部通过，等待 Claude 与人类检查。
2. `NIGHT MODE STOPPED`：三轮内没有通过，停止并保留错误日志。
3. 安全检查失败：分支、仓库、Draft PR、权限或工作区不符合要求，没有开始编码。

## 当前不包含

- Claude 自动 Review。
- 自动创建或合并 PR。
- 自动 Production 部署。
- 自动安装或升级依赖。
- 修改 GitHub Secrets、Netlify 环境变量或系统设置。
