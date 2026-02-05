---
trigger: always_on
---
# 安全编码规范 (始终生效)

## 输入验证

### 路径安全

```typescript
// 防止路径遍历攻击
function sanitizePath(inputPath: string): string {
  // 移除危险字符
  const sanitized = inputPath.replace(/(\.\.[\/\\]*)+/g, '');
  
  // 确保路径在允许范围内
  const resolved = path.resolve(baseDir, sanitized);
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Path traversal detected');
  }
  
  return resolved;
}
```

### 文件操作安全

```typescript
// 验证文件类型和大小
async function validateFile(filePath: string): Promise<void> {
  const stats = await fs.stat(filePath);
  
  // 检查文件大小限制
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${stats.size} bytes`);
  }
  
  // 检查文件类型
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}
```

## 敏感信息处理

### 环境变量管理

```typescript
// 安全地处理敏感配置
class SecureConfig {
  private config: Map<string, string> = new Map();
  
  set(key: string, value: string): void {
    // 敏感信息不记录日志
    if (this.isSensitive(key)) {
      this.config.set(key, value);
    } else {
      logger('debug', `Setting config: ${key}=${value}`);
      this.config.set(key, value);
    }
  }
  
  get(key: string): string | undefined {
    return this.config.get(key);
  }
  
  private isSensitive(key: string): boolean {
    const sensitiveKeys = ['password', 'secret', 'token', 'key'];
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }
}
```

### 日志脱敏

```typescript
// 敏感信息脱敏
function maskSensitiveInfo(logMessage: string): string {
  return logMessage
    .replace(/(password|token|secret)["']?\s*[:=]\s*["']?([^"'\s]+)/gi, '$1: ***')
    .replace(/(accesskeyid|accesskeysecret)["']?\s*[:=]\s*["']?([^"'\s]+)/gi, '$1: ***');
}
```

## 权限控制

### 文件权限检查

```typescript
// 检查文件访问权限
async function checkFilePermissions(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
```

### 操作授权

```typescript
// 实现基本的权限检查
class PermissionChecker {
  private userRole: string;
  
  constructor(role: string) {
    this.userRole = role;
  }
  
  canPerform(operation: string, resource: string): boolean {
    const permissions = {
      'admin': ['read', 'write', 'delete', 'configure'],
      'user': ['read', 'write'],
      'guest': ['read']
    };
    
    const allowedOps = permissions[this.userRole] || [];
    return allowedOps.includes(operation);
  }
}
```
