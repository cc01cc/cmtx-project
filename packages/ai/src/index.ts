export type { AIProvider, AIModelConfig, AIConfig } from "./config/types.js";
export type { GenerateOptions } from "./providers/vercel-adapter.js";
export { generateWithModel } from "./providers/vercel-adapter.js";
export type { SlugOptions } from "./slug/generator.js";
export { generateSlug, SLUG_PROMPT_TEMPLATE } from "./slug/generator.js";
