---
trigger: model_decision
description: 设计文档编辑场景
---
# 文档标准 (模型决策)

## 生效场景

生成 API 文档、编写 README、创建示例代码时自动应用

## TypeDoc 注释规范

### 基本原则

- 使用标准的 JSDoc/TypeDoc 注释格式
- 注释应简洁明了，重点描述功能和参数
- API 文档通过 TypeDoc 自动生成，无需在 README 中重复详细说明
- 重点关注函数/类的核心功能描述和使用场景
- **避免冗余**：不重复已有的公共概念和说明，保持文档精简

### 注释示例

```typescript
/**
 * 解析 Markdown 文本中的图片引用
 * @param content - 要解析的 Markdown 内容
 * @param options - 解析选项配置
 * @returns 解析出的图片信息数组
 */

/**
 * 图片上传配置管理器
 * 负责处理上传相关的配置选项
 */

interface UploadResult {
  /** 操作是否成功 */
  success: boolean;
  /** 成功上传的文件数量 */
  uploaded: number;
  /** 成功替换的引用数量 */  
  replaced: number;
}
```

## README 编写规范

- 使用清晰的标题层级
- 提供快速开始示例
- API 详情请参考自动生成的 TypeDoc 文档
- 列出常见问题解答
- 维护更新日志

## 示例代码标准

- 提供完整可运行的示例
- 包含必要的导入语句
- 添加适当的注释说明
- 展示典型使用场景
