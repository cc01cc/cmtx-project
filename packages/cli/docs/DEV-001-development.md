# DEV-001: 开发指南

## 开发期调用

在 monorepo 中开发时，无需全局安装即可调用 CLI：

```bash
# 方式 1: node 直接运行
node packages/cli/dist/cli.mjs analyze ./docs

# 方式 2: pnpm exec
pnpm -F @cmtx/cli exec -- cmtx image analyze ./docs

cmtx image analyze ./docs
```

开发模式（自动重新构建）：

```bash
pnpm -F @cmtx/cli dev
```

## CLI 参数命名与格式规范

所有 CLI 命令的参数命名和格式必须遵循以下规则。

### 命名一致性

CLI 参数名（kebab-case）与 YAML 配置字段名（camelCase）必须满足可逆映射：**去掉所有连字符后得到的单词序列与 YAML 字段名一致**。

```yaml
# YAML 配置字段 (camelCase)
upload:
  conflictStrategy: skip    # camelCase 复合词
  prefix: ""                # 单字

# CLI 参数 (kebab-case)
--conflict-strategy skip    # 去掉连字符 = conflictStrategy ✅
--prefix ""                 # 单字，直接一致
```

| CLI（kebab-case） | YAML 字段（camelCase） | 关系 |
|---|---|---|
| `--prefix` | `prefix` | 完全一致 |
| `--conflict-strategy` | `conflictStrategy` | kebab→camel 转换 |
| `--output` | `output` | 完全一致 |

### 参数归属分层

| 归属层 | 判定标准 | 示例 |
|--------|----------|------|
| CLI 参数 | "每次运行可能不同"（运行时决策 + 高频切换） | `--provider`, `--bucket`, `--region`, `--prefix`, `--conflict-strategy` |
| YAML 配置 | "一设不改"（项目级约定、结构性参数） | `namingTemplate`, `replace.fields`, `imageFormat`, `delete` |

禁止将配置级参数扁平化为 CLI 参数以保持 CLI 简洁。

### 参数格式

| 规则 | 示例 |
|------|------|
| 使用 `--long-option` 长格式，非单字母短格式是默认形式 | `--conflict-strategy` |
| 短别名（alias）可选，用单个字母 | `-c` 对于 `--config` |
| 值类型显式声明：string / boolean / number / choice | `--provider aliyun-oss` |
| 布尔型参数用 `--flag` 形式（不存在 `--no-flag` 在 CLI 层） | `--verbose` |

### 移除废弃参数

删除参数时，同时从 builder、handler、类型定义、文档中移除。废弃参数不允许长期存留在 builder 中（避免误用和代码臃肿）。

### 示例：upload 命令参数表

```bash
cmtx upload <filePath> [options]
```

| 参数 | 别名 | 类型 | 对应 YAML 字段 | 说明 |
|------|------|------|----------------|------|
| `--config` | `-c` | string | 无 | 配置文件路径 |
| `--provider` | `-p` | string | `storages.xxx.provider` | 云存储提供商 |
| `--region` | | string | `storages.xxx.config.region` | 存储区域 |
| `--bucket` | | string | `storages.xxx.config.bucket` | 存储桶 |
| `--prefix` | | string | `upload.prefix` | 远程路径前缀 |
| `--conflict-strategy` | | string | `upload.conflictStrategy` | 冲突处理策略 |
| `--verbose` | `-v` | boolean | 无 | 详细输出 |
