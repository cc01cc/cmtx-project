# Lingma 规则使用说明

## 规则概览

本项目共包含 10 个 Lingma 规则，按类型分类如下：

### 始终生效 (Always) - 4个
1. **typescript-monorepo-always.txt** - TypeScript Monorepo 开发规范
2. **testing-best-practices-always.txt** - 测试最佳实践
3. **error-handling-logging-always.txt** - 错误处理和日志规范
4. **security-coding-standards-always.txt** - 安全编码规范

### 模型决策 (Model Decision) - 3个
1. **cmtx-core-development-model-decision.txt** - @cmtx/core 核心库开发规则
2. **documentation-standards-model-decision.txt** - 文档标准
3. **performance-optimization-model-decision.txt** - 性能优化指导

### 指定文件生效 (Specific Files) - 1个
1. **cmtx-upload-patterns-specific-files.txt** - @cmtx/upload 上传模块规则

### 手动引入 (Manual) - 2个
1. **cli-tool-conventions-manual.txt** - @cmtx/cli 命令行工具规则
2. **code-review-checklist-manual.txt** - 代码审查清单

## 使用方法

### VS Code / JetBrains IDE
1. 在智能会话中输入 `#rule` 或 `@rule` 唤起规则列表
2. 选择需要的规则进行应用

### Lingma IDE
1. 个人设置 → 规则
2. 选择相应的规则类型和内容

## 规则维护

### 添加新规则
1. 在 `.lingma/rules/` 目录下创建新的 Markdown 文件
2. 文件名格式：`序号-规则名称-规则类型.md`
3. 遵循现有的结构和格式规范

### 修改现有规则
1. 直接编辑对应的规则文件
2. 保持语言简洁明确
3. 提供具体的示例代码
4. 使用结构化的表达方式

### 规则版本控制
- 规则文件随项目代码一同通过 Git 管理
- 团队成员可以共享和同步规则配置
- 如需个人专用规则，可将 `.lingma/rules` 添加到 `.gitignore`

## 最佳实践

1. **保持规则简洁**：每个规则专注于特定领域
2. **提供具体示例**：用实际代码示例说明规范
3. **定期审查更新**：随着项目发展及时调整规则
4. **团队共识**：确保团队成员理解和认同规则内容
5. **渐进式应用**：可以从核心规则开始，逐步完善规则体系

## 故障排除

### 规则不生效
- 检查规则文件格式是否正确
- 确认规则类型设置是否匹配使用场景
- 验证文件路径是否符合指定文件规则的要求

### 规则冲突
- 当规则和记忆存在冲突时，优先遵循规则执行
- 可以通过调整规则优先级或修改冲突内容来解决

### 性能问题
- 避免创建过于复杂的规则
- 合理使用指定文件生效类型减少不必要的规则加载
- 定期清理不再需要的旧规则