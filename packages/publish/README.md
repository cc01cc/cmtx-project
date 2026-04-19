# @cmtx/publish

Markdown 多平台适配领域包，负责规则解析、文本改写、平台校验和 Node 环境下的批处理能力。

当前阶段提供的能力：

- 解析 `.adapt.yaml` 规则文件
- 校验规则配置结构和正则表达式
- 依次执行文本替换规则
- 提供 `wechat`、`zhihu`、`csdn` 三个平台的内置规则集
- 提供平台内容校验接口，供 CLI、MCP 和后续 VS Code 扩展复用
- 提供微信公众号场景的 Markdown -> HTML 渲染能力
- 在 Node.js 环境下处理单文件和目录批量改写
- **图片处理**：Markdown img → HTML img、尺寸调整、上传到云端
- **发布格式化**：图片处理 + 添加 YAML front matter、标题转换

## 1. 安装

```bash
pnpm add @cmtx/publish
```

## 2. 核心用法

```ts
import { applyAdaptRules, parseAdaptConfig } from "@cmtx/publish";

const config = parseAdaptConfig(`
rules:
  - match: "^## (.+)$"
    replace: "# $1"
    flags: "gm"
`);

const result = applyAdaptRules("## Hello", config.rules);
console.log(result.content);
```

## 3. 平台内置规则

```ts
import { adaptMarkdown, renderMarkdown, validateMarkdown } from "@cmtx/publish";

const adapted = adaptMarkdown("## Section\n#### Deep", "zhihu");
const issues = validateMarkdown("# Title\n[link](https://example.com)", "wechat");
const rendered = renderMarkdown("# Title\n\nText", "wechat");

console.log(adapted.content);
console.log(issues);
console.log(rendered.content);
```

## 4. 图片处理

### 4.1. processImagesForPublish

处理 Markdown 文件中的图片以准备发布，支持：

1. Markdown img → HTML img 转换
2. 调整 HTML img 尺寸
3. 上传本地图片到云端

```ts
import { processImagesForPublish } from '@cmtx/publish';
import { ConfigBuilder } from '@cmtx/asset/upload';

const uploadConfig = new ConfigBuilder()
  .storage(adapter, { prefix: 'blog/images/' })
  .build();

const result = await processImagesForPublish('./article.md', {
  convertToHtml: true,
  width: '480',
  upload: uploadConfig,
});

console.log(result.content);  // 处理后的内容
console.log(result.stats);    // { converted: 2, resized: 1, uploaded: 3 }
```

### 4.2. formatForPublish

在 `processImagesForPublish` 基础上增加 front matter 处理：
4. 将一级标题转换为 front matter 的 title 字段
5. 添加/更新其他 front matter 字段

```ts
import { formatForPublish } from '@cmtx/publish';

// 仅转换标题
const result = await formatForPublish('./article.md', {
  convertToHtml: true,
  convertTitle: true,
});

// 转换标题 + 添加其他字段
const result = await formatForPublish('./article.md', {
  convertTitle: true,
  frontmatter: {
    date: '2026-04-05',
    tags: ['blog', 'tech'],
  },
});

// 仅添加 front matter，不转换标题
const result = await formatForPublish('./article.md', {
  frontmatter: {
    title: '自定义标题',
    date: '2026-04-05',
  },
});
```

**选项：**

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `convertToHtml` | boolean | 是否将 Markdown 图片转为 HTML img |
| `width` | string | HTML img width 属性 |
| `height` | string | HTML img height 属性 |
| `upload` | UploadConfig | 上传配置（复用 asset 的类型） |
| `dryRun` | boolean | 预览模式，不实际执行 |
| `convertTitle` | boolean | 是否将一级标题转为 front matter title |
| `frontmatter` | Record<string, string \| string[]> | 要添加/更新的 front matter 字段 |

## 5. Node.js 批处理

```ts
import {
  adaptDirectory,
  loadAdaptConfigFromFile,
  renderFile,
  validateFile,
} from "@cmtx/publish/node";

const config = await loadAdaptConfigFromFile("./wechat.adapt.yaml");
const result = await adaptDirectory("./docs", {
    outDir: "./output/wechat",
    rules: config.rules,
});

const html = await renderFile("./article.md", {
  platform: "wechat",
  outFile: "./output/article.html",
});

const validation = await validateFile("./article.md", {
  platform: "wechat",
});

console.log(result.files.length);
console.log(html.format);
console.log(validation.issues.length);
```

## 6. FF1 格式保留 ID 生成

### 6.1. IdGenerator

提供多种 ID 生成策略，包括符合 NIST 标准的 FF1 格式保留加密：

```ts
import { IdGenerator } from '@cmtx/publish';

const generator = new IdGenerator();

// FF1 格式保留加密（同步）
const id = generator.encryptFF1('ABC123', 'your-32-byte-secret-key!!');
// 输出：X7K9M2（输入 6 位，输出 6 位）

// 带校验码
const id2 = generator.encryptFF1('ABC123', 'your-32-byte-secret-key!!', { withChecksum: true });
// 输出：X7K9M2P（输入 6 位 + 1 位校验 = 7 位）

// 不同长度输入
generator.encryptFF1('ABCD', 'key');      // 输入 4 位 → 输出 4 位
generator.encryptFF1('ABCDEFGH', 'key');  // 输入 8 位 → 输出 8 位

// 解密
const decrypted = generator.decryptFF1('X7K9M2', 'your-32-byte-secret-key!!');
// 返回：ABC123

// 其他策略
generator.generate('uuid');           // UUID
generator.generate('slug', 'Title');  // slug
generator.generate('md5', 'content'); // MD5 hash
generator.generate('ff1', 'ABC123', { encryptionKey: 'key' }); // FF1 via generate
```

### 6.2. FF1 特性

- **格式保留**：输入几位，输出几位（核心特性）
- **可逆**：可解密还原原始字符串
- **安全**：NIST SP 800-38G FF1 标准，AES-256
- **校验**：可选 Luhn 校验码（会使输出长度 +1）

### 6.3. API 说明

**encryptFF1(plaintext, encryptionKey, options?)** - FF1 加密

| 参数 | 类型 | 说明 |
|------|------|------|
| `plaintext` | string | 要加密的字符串（radix-36: 0-9, A-Z） |
| `encryptionKey` | string \| Buffer | 32 字节 AES-256 密钥 |
| `options.radix` | number | 进制基数，默认 36 |
| `options.withChecksum` | boolean | 是否追加 Luhn 校验码，默认 false |

**decryptFF1(ciphertext, encryptionKey, options?)** - FF1 解密

| 参数 | 类型 | 说明 |
|------|------|------|
| `ciphertext` | string | 加密的字符串 |
| `encryptionKey` | string \| Buffer | 32 字节 AES-256 密钥 |
| `options.radix` | number | 进制基数，默认 36 |
| `options.withChecksum` | boolean | 是否包含 Luhn 校验码，默认 false |

### 6.4. formatForPublish 集成

```ts
import { formatForPublish } from '@cmtx/publish';

const result = await formatForPublish('./article.md', {
    autoMetadata: {
        generateId: true,
        idOptions: {
            encryptionKey: 'your-32-byte-secret-key!!',
            plaintext: 'ABC123',  // 用户自行决定 ID 来源
        },
        autoDate: true,
        autoUpdated: true,
    },
});
```

## 7. 当前范围

本包当前已完成规则引擎抽离、平台规则注册、基础平台校验和微信 HTML 渲染。
更细粒度的诊断规则、主题系统和更多平台渲染仍在后续阶段实现。
