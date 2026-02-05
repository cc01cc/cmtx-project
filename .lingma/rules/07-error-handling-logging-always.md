---
trigger: always_on
---
# 错误处理和日志规范 (始终生效)

## 错误分类体系

### 错误类型定义

```typescript
// 解析错误
class ParseError extends Error {
  constructor(message: string, public readonly position?: { line: number; column: number }) {
    super(message);
    this.name = 'ParseError';
  }
}

// 配置错误
class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

// 网络错误
class NetworkError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

## 日志级别规范

- error: 严重错误，需要立即处理
- warn: 警告信息，可能影响功能
- info: 一般信息，记录操作流程
- debug: 调试信息，开发时使用

## 日志格式标准

```typescript
// 标准日志格式
logger('info', '开始处理文件', { 
  filePath: '/path/to/file.md',
  timestamp: new Date().toISOString()
});

// 错误日志格式
logger('error', '文件处理失败', {
  filePath: '/path/to/file.md',
  error: error.message,
  stack: error.stack
});
```

## 异常处理最佳实践

- 使用 try-catch 包装异步操作
- 提供有意义的错误消息
- 记录完整的错误上下文
- 实现优雅的错误恢复
- 避免静默失败
