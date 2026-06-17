# 开发规范

## Git 工作流

```
main (保护)  ← 仅管理员合并
  └── dev     ← 开发主分支
       ├── feat/xxx  功能分支
       ├── fix/xxx   修复分支
       └── ...       其他分支
```

### 规则

1. **`master` 分支受保护** — 禁止直接推送。只有项目管理员（@CrazySpottedDove）可通过 PR 合并 `dev` → `master`。
2. **所有开发在 `dev` 分支进行** — 从 `dev` 切出功能分支，完成后 PR → `dev`。
3. **PR 审阅** — 每个 PR 至少需要 1 人审阅后方可合并到 `dev`。
4. **Commit 信息** — 使用中文或英文，简明扼要，前缀标识类型：
   ```
   feat: 添加 Wiki 系统
   fix: 修复移动端导航栏样式
   refactor: 重构插件商店数据流
   chore: 更新依赖
   docs: 补充部署文档
   ```
5. **CI** — PR 到 `dev` 时自动运行 `npm run build`，确保构建通过。
6. **管理员合并 `dev` → `master`** — 由 @CrazySpottedDove 审阅后合并并部署。

### 快速开始

```bash
git clone <repo-url>
git checkout dev
git checkout -b feat/my-feature
# ... 开发 ...
git add -A && git commit -m "feat: 我的功能"
git push origin feat/my-feature
# 在 GitHub 创建 PR → dev
```
