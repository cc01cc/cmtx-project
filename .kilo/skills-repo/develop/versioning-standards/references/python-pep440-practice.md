# Python PEP 440 Practice

面向 Python 包发布与依赖解析的离线摘要。

## Canonical Public Version

`[N!]N(.N)*[{a|b|rc}N][.postN][.devN]`

- `N!`：epoch（可选）
- `N(.N)*`：发布段
- `a|b|rc`：预发布段
- `.postN`：后发布
- `.devN`：开发发布

## Ordering (High Level)

同一发布段内通常顺序为：

`.devN < aN < bN < rcN < final < .postN`

额外规则：

- 未显式 epoch 视为 `0`
- 需要切换版本体系时可用 epoch（如 `1!1.0`）
- 本地版本 `+local` 主要用于下游集成构建

## Normalization Highlights

- 大小写不敏感，规范形式为小写
- 允许前缀 `v`，比较时忽略（`v1.0` 等价 `1.0`）
- `alpha/beta/c/pre/preview` 会归一为 `a/b/rc`
- `post` 的 `rev/r` 也是等价写法

## Specifier Essentials

- `~=`：兼容发布（常用）
- `==`：严格匹配（发布依赖中一般不推荐滥用）
- `!=`：排除版本
- `>=`, `<=`, `>`, `<`：有序比较
- `===`：任意字符串精确匹配（逃生口，谨慎用）

## Practical Recommendations

- 发布依赖优先使用 `~=` + 必要排除（`!=`）
- 尽量避免在公开分发中使用本地版本标签
- 如需从日期版本切换到语义版本，优先考虑单调递增方案；确需时再使用 epoch

## Common Pitfalls

- 把 SemVer 的 `-alpha` 直接当作 PEP 440 公共版本（应改写）
- 对预发布的默认包含行为理解错误（解析器通常默认更保守）
- 在公共索引滥用本地版本标签
