## Config Model Template

### 配置类别

| Category | Fields | Required | Sensitive | Source |
| --- | --- | --- | --- | --- |

### 优先级规则

1. Runtime explicit values
2. Entry-specific env vars
3. Shared env vars
4. Config template resolved values
5. Config plaintext values
6. Safe defaults

### 模板替换规则

| Rule | Behavior |
| --- | --- |
| Syntax | `${VAR_NAME}` |
| Missing var | error/warn/keep literal |
| Empty string | explicit handling |
| Verbose diagnostics | enabled/disabled |

### 错误信息样例

- Missing required field with checked sources.
- Invalid value with accepted range.

## Validation Checklist

- [ ] 优先级规则已写死并可解释。
- [ ] 模板替换未命中行为已定义。
- [ ] 缺失字段报错可行动。
- [ ] 明文凭证策略和安全建议已给出。
- [ ] 跨入口行为一致性已验证。
