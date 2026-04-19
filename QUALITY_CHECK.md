# 代码质量检查指南

本文档介绍如何使用项目的代码质量检查工具。

## 快速开始

### 运行完整质量检查

```bash
# 方式 1：使用脚本
./scripts/quality-check.sh

# 方式 2：使用 npm script
pnpm run quality:check
```

## 检查流程

质量检查脚本会依次运行以下检查：

### 1. Biome 检查（快速）

**速度：** ~50ms
**检查内容：**
- 代码格式化
- 导入排序
- 基础 lint（风格、语法、基础安全）
- 代码复杂度
- 性能问题

**命令：**
```bash
# 只运行 Biome 检查
pnpm run lint:format

# 自动修复可修复的问题
pnpm run lint:format:write
```

### 2. TypeScript 类型检查

**速度：** ~5-10 秒
**检查内容：**
- 类型错误
- 接口不匹配
- 未使用的类型

**命令：**
```bash
pnpm run typecheck
```

### 3. Opengrep 深度扫描（可选）

**速度：** ~30 秒
**检查内容：**
- 安全漏洞（XXE、ReDoS、eval 等）
- 代码异味
- 最佳实践
- 1000+ 社区规则

**安装 Opengrep：**
```bash
curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | bash
```

**手动运行：**
```bash
export PATH='/home/node/.opengrep/cli/latest':$PATH
export PYTHONIOENCODING=utf-8
export LC_ALL=C.UTF-8

# 扫描项目
opengrep scan --config auto

# 使用配置文件
opengrep scan --config .opengrep.yml

# 输出 JSON 格式
opengrep scan --json > results.json
```

## 配置文件

### Biome 配置

编辑 `biome.json` 自定义 Biome 规则。

当前启用的额外规则：
- `noExcessiveCognitiveComplexity` - 认知复杂度检查
- `noUselessFragments` - 无用的代码片段
- `noUselessStringConcat` - 无用的字符串拼接
- `noGlobalEval` - 安全的 eval 使用
- `noDelete` - 性能问题
- `noAccumulatingSpread` - 性能问题

### Opengrep 配置

编辑 `.opengrep.yml` 自定义 Opengrep 规则。

当前规则：
- `no-console-log-in-production` - 禁止 console.log
- `no-debugger-statement` - 禁止 debugger
- `no-var-use-let-const` - 使用 let/const
- `no-eval` - 禁止 eval
- `too-many-parameters` - 函数参数过多检查

### 忽略文件

编辑 `.opengrepignore` 定义 Opengrep 忽略的文件。

默认忽略：
- `node_modules/`
- `dist/`
- `**/*.test.ts`
- `**/*.spec.ts`
- `coverage/`

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Quality Check
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run quality check
        run: ./scripts/quality-check.sh
```

### Opengrep SARIF 集成

```yaml
name: Opengrep Scan
on: [pull_request]
jobs:
  opengrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Opengrep
        run: |
          curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | bash
      
      - name: Run Scan
        run: |
          export PATH='/home/node/.opengrep/cli/latest':$PATH
          opengrep scan --sarif > results.sarif
      
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

## 常见问题

### Q: Opengrep 安装失败

**A:** 尝试设置环境变量：
```bash
export PYTHONIOENCODING=utf-8
export LC_ALL=C.UTF-8
```

### Q: 如何忽略某些规则？

**A:** 编辑 `.opengrep.yml` 或 `.opengrepignore`。

### Q: 检查太慢怎么办？

**A:** 
1. Opengrep 可以跳过：`--max-target-bytes` 限制扫描大小
2. 使用 `--exclude` 排除目录
3. 考虑只扫描变更文件

### Q: 如何查看详细的检查结果？

**A:** 使用 `--verbose` 参数：
```bash
opengrep scan --verbose
```

## 最佳实践

1. **本地开发**：运行完整的 `./scripts/quality-check.sh`
2. **提交前**：至少运行 `pnpm run lint:format`
3. **CI/CD**：在 PR 中自动运行质量检查
4. **定期审查**：定期查看 Opengrep 发现的安全问题

## 参考资料

- [Biome 文档](https://biomejs.dev/)
- [Opengrep 文档](https://github.com/opengrep/opengrep)
- [Semgrep 规则库](https://semgrep.dev/explore)
