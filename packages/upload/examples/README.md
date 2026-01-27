# @cmtx/upload 示例

本目录包含 @cmtx/upload 的使用示例。

## 示例列表

1. **1-analyze-images.ts** - 分析本地图片引用
2. **2-upload-single.ts** - 上传单个图片
3. **3-batch-upload.ts** - 批量上传所有本地图片
4. **4-with-ali-oss.ts** - 使用阿里云 OSS 适配器

## 运行示例

首先安装依赖：

```bash
pnpm install
```

生成本地 demo 数据（包含占位图片与 Markdown）：

```bash
pnpm exec tsx examples/scripts/gen-demo-data.ts
```

然后运行任意示例：

```bash
# 使用 tsx 运行 TypeScript（推荐）
pnpm exec tsx examples/1-analyze-images.ts
pnpm exec tsx examples/2-upload-single.ts
pnpm exec tsx examples/3-batch-upload.ts
pnpm exec tsx examples/4-with-ali-oss.ts

# 或先编译再运行
pnpm build
node dist/examples/1-analyze-images.js
```

## 注意事项

- 默认 maxFileSize 为 10MB，生成的 demo 数据包含更大的占位文件，如需测试大文件请在示例中调高 `maxFileSize`。
- 示例不会自动生成 demo 数据，如缺少 `examples/demo-data`，请先运行生成命令。

### 阿里云 OSS 配置

**4-with-ali-oss.ts** 需要配置阿里云 OSS 凭证：

#### 方式 1：使用 .env 文件（推荐）

```bash
# 复制环境变量模板
cp examples/.env.example examples/.env

# 编辑 .env 填入真实凭证
# ALIYUN_OSS_REGION=oss-cn-hangzhou
# ALIYUN_OSS_ACCESS_KEY_ID=your-key
# ALIYUN_OSS_ACCESS_KEY_SECRET=your-secret
# ALIYUN_OSS_BUCKET=your-bucket

# 在示例脚本顶部添加（需安装 dotenv）
# import 'dotenv/config';
```

#### 方式 2：手动设置环境变量

```bash
# PowerShell
$env:ALIYUN_OSS_REGION="oss-cn-hangzhou"
$env:ALIYUN_OSS_ACCESS_KEY_ID="your-key"
$env:ALIYUN_OSS_ACCESS_KEY_SECRET="your-secret"
$env:ALIYUN_OSS_BUCKET="your-bucket"
pnpm exec tsx examples/4-with-ali-oss.ts

# Bash
export ALIYUN_OSS_REGION=oss-cn-hangzhou
export ALIYUN_OSS_ACCESS_KEY_ID=your-key
export ALIYUN_OSS_ACCESS_KEY_SECRET=your-secret
export ALIYUN_OSS_BUCKET=your-bucket
pnpm exec tsx examples/4-with-ali-oss.ts
```
