/**
 * 内置 Rules
 *
 * @module built-in
 * @description
 * 导出所有内置 Rules。
 */

import { autocorrectRule } from "./autocorrect-rule.js";
import { directoryCreateRule } from "./directory-create-rule.js";
import { fileCopyRule } from "./file-copy-rule.js";
import { fmValidateRule } from "./fm-validate-rule.js";
import { frontmatterMapRule } from "./frontmatter-map-rule.js";
import { frontmatterSlugRule } from "./frontmatter-slug.js";
import { imageRules } from "./image-rules.js";
import { metadataRules } from "./metadata-rules.js";
import { sectionRules } from "./section-rules.js";
import { textRules } from "./text-rules.js";

/**
 * 所有内置 Rules
 *
 * @internal
 */
export const builtInRules = [
    ...textRules,
    ...imageRules,
    ...metadataRules,
    ...sectionRules,
    autocorrectRule,
    directoryCreateRule,
    fileCopyRule,
    fmValidateRule,
    frontmatterMapRule,
    frontmatterSlugRule,
];

// 注意：单独的 Rule 常量不再导出，请通过字符串 ID 使用 engine.executeRule("rule-id")
