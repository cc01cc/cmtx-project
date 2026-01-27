# @cmtx/core Changelog

## 0.1.1 - 2026-01-22

### Fixed

- 修复 `replaceImageInFiles` 返回的 `relativePath` 计算错误（之前返回文件名，现在返回从搜索目录的相对路径）
- 修正 `replaceImageInFileInternal` 函数签名，添加 `searchDirAbsPath` 参数以正确计算相对路径

### Added

- 添加可选的 `logger` 回调支持，用于调试和错误跟踪（`LoggerCallback` 类型）
- 为所有 Options 接口添加 `logger?: LoggerCallback` 可选参数
- 在 API 层添加输入验证：空字符串检测、负数 depth 检测、特殊字符检测
- 添加 `validatePath` 和 `validateDepth` 内部验证函数

### Changed

- API 层函数现在会在参数无效时抛出明确的错误（TypeError, RangeError）
- 改进了错误消息的可读性和调试体验

- 初始发布：Markdown 图片提取、引用检查、位置详情、递归扫描、替换/删除
- ESM / TypeScript NodeNext，零依赖
- TypeDoc 文档输出至 docs/api
