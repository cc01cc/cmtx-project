# @cmtx/storage

[![npm version](https://img.shields.io/npm/v/@cmtx/storage.svg)](https://www.npmjs.com/package/@cmtx/storage)
[![License](https://img.shields.io/npm/l/@cmtx/storage.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

对象存储适配器，提供统一的存储服务接口和多种云存储实现。

## 1. 功能特性

- **统一接口**：`IStorageAdapter` 接口支持多种存储服务
- **阿里云 OSS**：内置阿里云 OSS 适配器
- **腾讯云 COS**：内置腾讯云 COS 适配器
- **工厂函数**：`createAdapter` 根据 provider 自动创建适配器
- **可扩展**：易于添加新的存储服务适配器
- **TypeScript**：完整的类型支持

## 2. 支持的存储服务

- [x] 阿里云 OSS
- [x] 腾讯云 COS
- [ ] AWS S3（计划中）

## 3. 安装

```bash
pnpm add @cmtx/storage

# 如果使用阿里云 OSS
pnpm add ali-oss

# 如果使用腾讯云 COS
pnpm add cos-nodejs-sdk-v5
```

## 4. 官方资源

### 4.1. 阿里云 OSS

| 资源         | 链接                                                  |
| ------------ | ----------------------------------------------------- |
| 产品文档     | <https://help.aliyun.com/zh/oss/>                     |
| 控制台       | <https://oss.console.aliyun.com/>                     |
| RAM 用户管理 | <https://ram.console.aliyun.com/users>                |
| SDK 文档     | <https://help.aliyun.com/zh/oss/developer-reference/> |

### 4.2. 腾讯云 COS

| 资源       | 链接                                                   |
| ---------- | ------------------------------------------------------ |
| 产品文档   | <https://cloud.tencent.com/document/product/436>       |
| 控制台     | <https://console.cloud.tencent.com/cos>                |
| 子用户管理 | <https://console.cloud.tencent.com/cam>                |
| SDK 文档   | <https://cloud.tencent.com/document/product/436/35151> |

## 5. 快速开始

### 5.1. 使用工厂函数（推荐）

```typescript
import { createAdapter } from "@cmtx/storage/adapters/factory";

// 阿里云 OSS
const ossAdapter = await createAdapter({
    provider: "aliyun-oss",
    accessKeyId: "your-access-key-id",
    accessKeySecret: "your-access-key-secret",
    region: "oss-cn-hangzhou",
    bucket: "your-bucket-name",
});

// 腾讯云 COS
const cosAdapter = await createAdapter({
    provider: "tencent-cos",
    secretId: "your-secret-id",
    secretKey: "your-secret-key",
    region: "ap-guangzhou",
    bucket: "your-bucket-1250000000", // 格式：bucketname-appid
});

// 上传文件
const result = await ossAdapter.upload("/path/to/local/file.png", "images/file.png");
console.log(result.url);
```

### 5.2. 阿里云 OSS

```typescript
import { AliOSSAdapter } from "@cmtx/storage/adapters/ali-oss";
import OSS from "ali-oss";

// 1. 配置 OSS 客户端
const client = new OSS({
    region: "oss-cn-hangzhou",
    accessKeyId: "your-access-key-id",
    accessKeySecret: "your-access-key-secret",
    bucket: "your-bucket-name",
});

// 2. 创建适配器
const adapter = new AliOSSAdapter(client);

// 3. 上传文件
const result = await adapter.upload("/path/to/local/file.png", "images/file.png");
console.log(result.url); // https://your-bucket.oss-cn-hangzhou.aliyuncs.com/images/file.png
```

### 5.3. 腾讯云 COS

```typescript
import { TencentCOSAdapter } from "@cmtx/storage/adapters/tencent-cos";
import COS from "cos-nodejs-sdk-v5";

// 1. 配置 COS 客户端
const cos = new COS({
    SecretId: "your-secret-id",
    SecretKey: "your-secret-key",
});

// 2. 创建适配器（需要传入 Bucket 和 Region）
const adapter = new TencentCOSAdapter(cos, {
    Bucket: "your-bucket-1250000000", // 格式：bucketname-appid
    Region: "ap-guangzhou",
});

// 3. 上传文件
const result = await adapter.upload("/path/to/local/file.png", "images/file.png");
console.log(result.url); // https://your-bucket-1250000000.cos.ap-guangzhou.myqcloud.com/images/file.png
```

### 5.4. 生成预签名 URL

```typescript
// 生成有效期为 1 小时的预签名 URL
const signedUrl = await adapter.getSignedUrl("images/file.png", 3600);
console.log(signedUrl);
```

### 5.5. 从 Buffer 上传

```typescript
const buffer = fs.readFileSync("/path/to/file.png");
const result = await adapter.uploadBuffer("images/file.png", buffer, {
    contentType: "image/png",
    forbidOverwrite: true,
});
```

## 6. 凭证类型

### 6.1. 阿里云凭证

> 💡 **获取方式**：
>
> 1. 登录 [RAM 用户管理](https://ram.console.aliyun.com/users) 创建 RAM 用户
> 2. 为 RAM 用户配置 OSS 权限（如 `AliyunOSSFullAccess` 或自定义策略）
> 3. 在 RAM 用户详情页创建 AccessKey

> ⚠️ **安全提示**：请勿使用阿里云主账号 AccessKey，建议使用 RAM 用户实现最小权限原则。

```typescript
interface AliyunCredentials {
    provider: "aliyun-oss";
    accessKeyId: string;
    accessKeySecret: string;
    region: string; // 如：oss-cn-hangzhou
    bucket: string;
    stsToken?: string; // 可选：STS 临时凭证
}
```

### 6.2. 腾讯云凭证

> 💡 **获取方式**：
>
> 1. 登录 [访问管理 - 用户列表](https://console.cloud.tencent.com/cam) 创建子用户
> 2. 为子用户配置 COS 权限（如 `QcloudCOSFullAccess` 或自定义策略）
> 3. 在子用户详情页获取 SecretId 和 SecretKey

> ⚠️ **安全提示**：请勿使用腾讯云主账号密钥，建议使用子用户实现最小权限原则。

```typescript
interface TencentCredentials {
    provider: "tencent-cos";
    secretId: string;
    secretKey: string;
    region: string; // 如：ap-guangzhou
    bucket: string; // 格式：bucketname-appid
    sessionToken?: string; // 可选：STS 临时凭证
}
```

## 7. 权限配置指南

本节说明集成测试所需的权限，请在云平台控制台为子账号配置相应权限。

### 7.1. 阿里云 OSS 权限配置

在 [RAM 控制台](https://ram.console.aliyun.com/users) 为 RAM 用户配置以下权限：

#### 7.1.1. 测试所需权限

| 操作                   | 所需权限           | 说明                   |
| ---------------------- | ------------------ | ---------------------- |
| upload / uploadBuffer  | `oss:PutObject`    | 上传文件               |
| downloadToFile         | `oss:GetObject`    | 下载文件               |
| getObjectMeta / exists | `oss:GetObject`    | 获取元数据、检查存在性 |
| delete                 | `oss:DeleteObject` | 删除对象               |
| getSignedUrl           | 无需配置           | SDK 本地生成签名       |

#### 7.1.2. 配置方式

**方式一：使用系统策略**（推荐用于测试）

- `AliyunOSSFullAccess` - 完全访问权限
- `AliyunOSSReadOnlyAccess` - 只读访问权限

**方式二：自定义策略**
在 RAM 控制台创建自定义策略，添加上述权限，并限制资源范围到测试 Bucket。

> 📖 详细配置请参考：[通过 RAM Policy 设置授权策略](https://help.aliyun.com/zh/oss/user-guide/ram-policy/)

### 7.2. 腾讯云 COS 权限配置

在 [CAM 用户管理](https://console.cloud.tencent.com/cam) 为子用户配置以下权限：

#### 7.2.1. 测试所需权限

| 操作                  | 所需权限           | 说明             |
| --------------------- | ------------------ | ---------------- |
| upload / uploadBuffer | `cos:PutObject`    | 上传对象         |
| downloadToFile        | `cos:GetObject`    | 下载对象         |
| getObjectMeta         | `cos:HeadObject`   | 查询对象元数据   |
| exists                | `cos:HeadObject`   | 检查存在性       |
| delete                | `cos:DeleteObject` | 删除对象         |
| getSignedUrl          | 无需配置           | SDK 本地生成签名 |

#### 7.2.2. 配置方式

**方式一：使用预设策略**（推荐用于测试）

- `QcloudCOSFullAccess` - 完全访问权限
- `QcloudCOSReadOnlyAccess` - 只读访问权限

**方式二：自定义策略**
在 CAM 控制台创建自定义策略，添加上述权限，并限制资源范围到测试 Bucket。

> 📖 详细配置请参考：[COS API 授权策略使用指引](https://cloud.tencent.com/document/product/436/31923)

## 8. 自定义存储适配器

实现 `IStorageAdapter` 接口以支持其他云存储服务：

```typescript
import type { IStorageAdapter, AdapterUploadResult } from "@cmtx/storage";

class MyStorageAdapter implements IStorageAdapter {
    async upload(localPath: string, remotePath: string): Promise<AdapterUploadResult> {
        // 实现上传逻辑
        return {
            name: remotePath,
            url: `https://my-cdn.com/${remotePath}`,
        };
    }

    async getSignedUrl(remotePath: string, expires: number): Promise<string> {
        // 实现预签名 URL 生成
        return `https://my-cdn.com/${remotePath}?token=xxx`;
    }
}
```

## 9. 类型定义

```typescript
interface AdapterUploadResult {
    name: string; // 远程文件名
    url: string; // 可访问的 URL
}

interface UploadBufferOptions {
    forbidOverwrite?: boolean; // 禁止覆盖
    contentType?: string; // 内容类型
    metadata?: Record<string, string>; // 自定义元数据
}

type CloudCredentials = AliyunCredentials | TencentCredentials;
```

## 10. 测试

本包包含两类测试：单元测试（mock）和集成测试（真实云环境）。

### 10.1. 单元测试

使用 Vitest 和 mock 进行快速单元测试，不依赖真实云服务：

```bash
pnpm -F @cmtx/storage test
```

### 10.2. 集成测试

使用真实云服务进行集成测试，验证与阿里云 OSS 和腾讯云 COS 的实际交互。

#### 10.2.1. 配置步骤

1. **复制配置模板**

```bash
cp packages/storage/tests/integration/test-config.example.json \
   packages/storage/tests/integration/test-config.json
```

1. **编辑配置文件**

在 `test-config.json` 中填入真实云服务凭证：

```json
{
    "aliyun": {
        "enabled": true,
        "region": "oss-cn-hangzhou",
        "accessKeyId": "YOUR_ACCESS_KEY_ID",
        "accessKeySecret": "YOUR_ACCESS_KEY_SECRET",
        "bucket": "your-test-bucket",
        "testPrefix": "integration-test/"
    },
    "tencent": {
        "enabled": true,
        "secretId": "YOUR_SECRET_ID",
        "secretKey": "YOUR_SECRET_KEY",
        "region": "ap-guangzhou",
        "bucket": "your-test-bucket-1250000000",
        "testPrefix": "integration-test/"
    }
}
```

> 💡 **获取凭证**（建议使用子账号）：
>
> - 阿里云：[RAM 用户管理](https://ram.console.aliyun.com/users) → 创建用户并授权 OSS 权限
> - 腾讯云：[子用户管理](https://console.cloud.tencent.com/cam) → 创建子用户并授权 COS 权限

> ⚠️ **安全提示**：
>
> - 请勿使用主账号凭证，建议使用子账号并配置最小权限
> - `test-config.json` 已添加到 `.gitignore`，请勿提交到版本控制

#### 10.2.2. 运行测试

```bash
# 运行所有集成测试
pnpm -F @cmtx/storage test:integration

# 单独运行 OSS 集成测试
pnpm -F @cmtx/storage test:integration:oss

# 单独运行 COS 集成测试
pnpm -F @cmtx/storage test:integration:cos
```

#### 10.2.3. 测试内容

| 功能           | OSS  | COS  | 测试内容                  |
| -------------- | ---- | ---- | ------------------------- |
| upload         | [OK] | [OK] | 上传本地文件              |
| uploadBuffer   | [OK] | [OK] | Buffer 直接上传           |
| getSignedUrl   | [OK] | [OK] | 预签名 URL 生成与访问验证 |
| downloadToFile | [OK] | [OK] | 下载到本地文件            |
| getObjectMeta  | [OK] | [OK] | 获取元数据                |
| exists         | [OK] | [OK] | 存在性检查                |
| delete         | [OK] | [OK] | 删除对象                  |

#### 10.2.4. 测试数据管理

- 每次测试使用唯一路径前缀（时间戳 + 随机字符串）
- 测试完成后自动清理云端文件
- 使用小文件测试（< 1MB），控制费用

#### 10.2.5. 测试隔离建议

建议使用专用的测试 bucket，或通过 `testPrefix` 路径前缀隔离测试数据。

## 11. 许可证

Apache-2.0

## 12. 相关包

- [@cmtx/asset](../asset) - Markdown 图片处理工具集
- [@cmtx/core](../core) - 核心功能
