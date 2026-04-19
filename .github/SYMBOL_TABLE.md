# 纯 ASCII 艺术符号清单

## 1. 概述

这份清单只包含 7-bit ASCII 字符，保证在任何等宽字体、任何终端、任何平台上都等宽且渲染一致。不使用 Unicode 字符或 Emoji，100% 兼容所有系统。按用途分组，便于直接拷贝到 CLI、日志、Markdown、README、diff 或代码注释中使用。

## 2. 常用映射表

- **Markdown 兼容性优先**：符号选择优先与 Markdown 语法保持一致（如 `-` 用于无序列表、`1.` 用于有序列表）
- **解析冲突规避**：确保符号在 Markdown 解析中不会产生歧义（树形等复杂结构在代码块中使用的除外）
- **语义唯一性原则**：每个符号只承载单一明确的含义，杜绝多重解释
- **视觉对称统一**：方向性符号采用对称设计（如 `->` 与 `<-`、`/\` 与 `\/`）

| 含义          |       ASCII 表示 | 说明              |
| ------------- | ---------------: | ----------------- |
| 未选中        |            `[ ]` | 任务列表、复选框  |
| 选中          |            `[x]` | 任务完成标记      |
| 半选/中间态   |            `[~]` | 部分完成          |
| 当前项/活动项 |            `[*]` | 焦点项            |
| 展开状态      |            `[+]` |                   |
| 折叠状态      |            `[-]` |                   |
| 成功/通过     |           `[OK]` | 任务完成          |
| 失败/错误     |         `[FAIL]` | 任务失败          |
| 警告          |         `[WARN]` | 需要注意          |
| 信息          |         `[INFO]` | 提示信息          |
| 进行中        |           `[>>]` | 正在处理          |
| 待处理        |            `[?]` | 需要检查          |
| 跳过          |         `[SKIP]` | 已跳过            |
| 列表项        |              `-` | 无序列表          |
| 有序列表      |   `1.` `2.` `3.` | 有序列表          |
| 子项/缩进     |              `+` | 缩进表示层级      |
| 树分支        |     `\|` `+` `-` | 纯 ASCII 树结构   |
| 箭头右        |             `->` | 流程或导航        |
| 箭头左        |             `<-` | 反向流程          |
| 箭头上        |             `/\` | 向上              |
| 箭头下        |             `\/` | 向下              |
| 双向箭头      |            `<->` | 双向流程          |
| 分隔线        |          `-----` | 区块分隔          |
| 标题下划线    |          `=====` | Markdown 样式     |
| 表格边框      |         `+ - \|` | 经典 ASCII 表格   |
| 进度条        | `[====>    ]60%` | 用 `=` 和空格填充 |
| 块填充/像素   |              `@` | 深色填充          |
| 点阵/阴影     |  `.` `:` `,` `o` | 细节效果          |
| 强调          |            `!!!` | 视觉强调          |
| 竖线          |             `\|` | 垂直分隔          |
| 斜线          |          `/` `\` | 对角线            |

## 3. 状态标记应用示例

```
[ ] Write tests
[x] Implement feature A
[-] Review PR #42
[*] Current task
[>] In progress task
[SKIP] Skip this test
```

---

## 4. 树状结构

```
root
+-- src
|   +-- index.js
|   +-- utils.js
|   \-- config.json
+-- test
|   +-- main.test.js
\-- README.md
```

---

## 5. 流程与连接示例

```
Request -> Process -> Response
   ^                    |
   |____________________|

[Input] --> [Filter] --> [Output]
              |
              v
            [Log]

Start
  |--> Path A (success)
  \--> Path B (error)
```

---

## 6. ASCII 表格示例

```
+----+----------+-------+
| ID | Name     | Size  |
+----+----------+-------+
| 1  | alpha    | 12KB  |
| 2  | beta     | 8KB   |
| 3  | gamma    | 15KB  |
+----+----------+-------+
```

---

## 7. 进度条示例

```
Progress: [###########       ] 55%
Loading:  [######            ] 30%
Complete: [###################] 100%
```

---

## 8. 几何形状

```
Diamond:
   /\
  /  \
  \  /
   \/

Triangle:
    ^
   / \
  /   \
 /_____\
```

---

## 9. 实用示例

### 9.1. 日志输出

```
[INFO] Application started
[OK] Configuration loaded
[WARN] Low disk space
[FAIL] Connection timeout
[>] Processing request...
[x] Task completed
```

### 9.2. Git diff / patch 风格

```
--- old_file.txt
+++ new_file.txt
@@ -1,5 +1,6 @@
 Context line
-Removed line
+Added line
 Context line
```

### 9.3. 测试报告

```
[x] Test 1: Basic functionality
[x] Test 2: Error handling
[-] Test 3: Performance (partial)
[ ] Test 4: Edge cases (not started)
[FAIL] Test 5: Regression

Summary: 2/5 passed, 2/5 pending, 1/5 failed
```

### 9.4. 菜单

```
=== Main Menu ===
[*] Start
[ ] Settings
[ ] Exit
Press [1-3]:
```

---

## 10. 总结

**使用纯 ASCII 的优势：**

[OK] 100% 兼容所有平台、终端、编辑器  
[OK] 等宽一致，不会破坏对齐  
[OK] 无 Emoji fallback，无格式化风险  
[OK] 代码易于解析和检查  
[OK] Git diff / patch 显示清晰  
[OK] 支持所有编码（UTF-8/ASCII/Latin-1）  

**一句话：当有疑问时，用 `[ ] [x] [OK] [FAIL]` 就对了！**
