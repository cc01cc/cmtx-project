# @cmtx/ai 更新日志 / Changelog

## [0.1.0-alpha.2] - 2026-05-17

### Changed

- **AI 配置类型迁移**: `AIConfig` / `AIModelConfig` / `AIProvider` 移至 `@cmtx/asset`
- **Service Import 更新**: 更新 Service 重命名后的 import 路径

### Fixed

- **SLUG_PROMPT_TEMPLATE**: 标记 `@internal`，停止公开导出

---

### Changed

- **AI Config Migration**: `AIConfig`, `AIModelConfig`, `AIProvider` moved to `@cmtx/asset`
- **Service Import Update**: Updated import paths after Service renaming

### Fixed

- **SLUG_PROMPT_TEMPLATE**: Marked `@internal`, stopped public export

## [0.1.0-alpha.1] - 2026-05-06

### Added

- **AI Slug Generation**: 新增 `@cmtx/ai` 包，提供 AI 驱动的 slug 生成能力
  - 实现三种 slug 生成策略：transform（转换）、extract（提取）、ai（AI 生成）
  - 集成 Vercel AI SDK，支持 DeepSeek、OpenAI 等 Provider
  - 新增 `generateSlug()` API，支持自定义模型和 Provider 配置
  - 支持 CJS 和 ESM 双格式构建

---

### Added

- **AI Slug Generation**: New `@cmtx/ai` package for AI-powered slug generation
  - Three strategies: transform, extract, and AI generation
  - Integrated with Vercel AI SDK, supporting DeepSeek, OpenAI, and other providers
  - New `generateSlug()` API with custom model and provider configuration
  - Supports CJS and ESM dual-format builds
