# @cmtx/core NPM 发布指南

## 1. 前置要求

```bash
# 1. npm 账户必须有 @cmtx 作用域权限
npm login

# 2. git 工作目录必须干净
git status  # 应该是 clean

# 2. 创建版本标签（如未创建）
git tag @cmtx/core@0.2.0

# 3. 验证 npm 账户和权限
npm whoami
npm access list packages
```

## 2. 发布步骤

发布前务必检查：

- [ ] **版本号**：package.json 中的版本号
- [ ] **测试通过**：`pnpm -F @cmtx/core test` 成功
- [ ] **构建成功**：`pnpm -F @cmtx/core build` 无错误
- [ ] **dist 文件存在**：build 后 `dist/index.js` 和 `dist/index.d.ts`
- [ ] **CHANGELOG 完整**：包含 Unreleased 和 0.1.1 记录
- [ ] **README 准确**：版本正确，功能说明完整
- [ ] **git 干净**：`git status` 无未提交改动

```bash
# 1. 验证所有检查通过
pnpm -F @cmtx/core test    # 运行测试
pnpm -F @cmtx/core build   # 构建项目

# 2. 发布到 npm
pnpm publish --filter @cmtx/core

# 3. 验证发布成功
npm view @cmtx/core@0.2.0
npm info @cmtx/core
```

## 3. 验证包内容

```bash
# 在临时目录安装并测试
mkdir /tmp/test-cmtx
cd /tmp/test-cmtx
npm install @cmtx/core@0.2.0

# 检查类型定义
head -20 node_modules/@cmtx/core/dist/index.d.ts

# 验证导出
node -e "import('@cmtx/core').then(m => console.log(Object.keys(m)))"
```

**Q: 如何撤销发布？**

A: 在 24 小时内可撤销：

```bash
npm unpublish @cmtx/core@0.2.0
```

之后需要联系 npm support。

**Q: 发布失败？**

常见原因：

- 未登录或无权限：`npm login` 重新登录
- 版本已存在：升级 package.json 中的版本号
- 网络问题：检查网络连接，重试

## 4. 相关资源

- [npm 官方发布指南](https://docs.npmjs.com/cli/publish)
- [pnpm publish 文档](https://pnpm.io/cli/publish)
