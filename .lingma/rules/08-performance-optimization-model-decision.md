---
trigger: always_on
---
# 性能优化指导 (模型决策)

## 适用场景

代码性能分析、算法优化、资源管理时自动生效

## 核心性能原则

### 算法复杂度

- 优先选择时间复杂度较低的算法
- 合理使用缓存减少重复计算
- 避免嵌套循环中的昂贵操作
- 使用适当的数据结构

### 内存管理

- 及时释放不需要的对象引用
- 使用 WeakMap/WeakSet 管理缓存
- 避免内存泄漏
- 合理设置缓存大小限制

### IO 优化

- 批量处理文件操作
- 使用流式处理大文件
- 实现连接池复用
- 合理设置超时时间

## 具体优化策略

### 正则表达式优化

```typescript
// 好的做法：预编译正则表达式
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

// 避免的做法：重复编译
function parseImage(text: string) {
  return text.match(/!\[([^\]]*)\]\(([^)]+)\)/g); // 每次都重新编译
}
```

### 文件处理优化

```typescript
// 好的做法：批量处理
async function processFiles(files: string[]) {
  const results = await Promise.all(
    files.map(file => processFile(file))
  );
  return results;
}

// 避免的做法：串行处理
async function processFilesSlow(files: string[]) {
  const results = [];
  for (const file of files) {
    results.push(await processFile(file));
  }
  return results;
}
```

### 缓存策略

```typescript
// 实现简单的内存缓存
class SimpleCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private ttl: number;

  constructor(ttlMs = 5 * 60 * 1000) { // 默认5分钟过期
    this.ttl = ttlMs;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }
}
```
