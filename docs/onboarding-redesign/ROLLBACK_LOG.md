# Onboarding 回滚记录

| 包 | 合并提交 | 回滚方式 |
| --- | --- | --- |
| OB-01 | `a3e3c16` | `git revert -m 1 a3e3c16` |
| OB-02 | `0452655` | `git revert -m 1 0452655` |
| OB-03 | `d9b302c` | `git revert -m 1 d9b302c` |
| 阶段 0 补齐（OB-01/03 的修复） | 见 `git log` 中 `[OB-01/03][Claude] 补齐阶段 0` | **先撤它**，再撤 OB-03、OB-01；`git revert <SHA>` |
| OB-07 | `18e8d0a`（另有修复提交：示例提醒去掉写死的日期，撤包前**先撤它**） | `git revert -m 1 18e8d0a` |
