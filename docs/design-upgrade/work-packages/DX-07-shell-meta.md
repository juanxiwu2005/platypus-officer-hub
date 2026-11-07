# DX-07 页面元信息、点击高亮、滚动穿透

- 阶段 1　大小 S　风险 低　R 级 R2　依赖：DX-01、**DX-03**（先有按下反馈，才能去掉系统高亮）　并行伙伴：DX-04～06、08
- 分支：`design/dx-07-shell-meta`　样式文件：`src/styles/dx-07-shell-meta.css`　对应细节：D06 D41 D42

## 要做的事
1. `index.html`：加 `<meta name="color-scheme" content="light dark">`；加两条 `<meta name="theme-color">`，带 `media="(prefers-color-scheme: light)"` 和 `dark`，颜色**等于** `--bg` 的浅色 #fbfaf7 和深色 #0f1312（`index.html` 不在样式检查范围，可以写 hex）。
2. 单元测试 `src/test/dx-07-meta.test.ts`：读 `index.html` 和 `src/styles.css`，断言两个 `theme-color` 和两个 `--bg` 值一致。以后谁改了 `--bg` 而忘了改这里，测试会红。
3. 小样式文件：
   - `html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }`
   - `button, a, [role="tab"], select, summary { touch-action: manipulation; }`
   - `-webkit-tap-highlight-color: transparent`（只给有按下反馈的那些：同 DX-03 的清单）。
   - `.ask-list, .detail-scroll, .menu.wide, .m-menu { overscroll-behavior: contain; }`

## 可以改的文件
`index.html`、`src/styles/dx-07-shell-meta.css`、`src/test/dx-07-meta.test.ts`（新）。

## 验收
- `npm test` 里新测试绿；`smoke.spec.ts`、`touch.spec.ts` 绿。
- 在深色系统设置下打开预览，手机浏览器顶部颜色和页面底色一致。
- Juanxi 怎么验：手机打开，点按钮没有灰色闪框；深色模式不再有白色闪屏。

## 回滚
R2（改了 `index.html`，不能只靠注释样式）。

## 注意
- 如果 DX-03 被回滚了，先把这个包也撤掉，否则点击会"没感觉"。
