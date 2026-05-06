# @cmtx/ai 更新日志 / Changelog

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
