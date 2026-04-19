# Shell 命令与路径规范

生成 shell 命令时，必须遵循以下**强制约束**：

1. **不在路径中添加无必要空格**：`cd /path/to/dir` ✅，`cd /path / to / dir` ❌
2. **含有空格的路径必须用引号**：`cd "/my project"` ✅，`cd /my project` ❌
3. **路径变量用双引号**：`find "$path" -name "*.js"` ✅，`find $path -name "*.js"` ❌
4. **包名无空格**：`pnpm -F @cmtx/core build` ✅，`pnpm -F @cmtx / core build` ❌

详见 skill：`shell-commands-best-practices` 
