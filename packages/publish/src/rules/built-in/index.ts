/**
 * 内置 Rules
 *
 * @module built-in
 * @description
 * 导出所有内置 Rules。
 */

import { autocorrectRule } from './autocorrect-rule.js';
import { imageRules } from './image-rules.js';
import { metadataRules } from './metadata-rules.js';
import { sectionRules } from './section-rules.js';
import { textRules } from './text-rules.js';

/**
 * 所有内置 Rules
 */
export const builtInRules = [
    ...textRules,
    ...imageRules,
    ...metadataRules,
    ...sectionRules,
    autocorrectRule,
];

// 导出分类 Rules
export { autocorrectRule } from './autocorrect-rule.js';
export {
    convertImagesRule,
    imageRules,
    uploadImagesRule,
} from './image-rules.js';
export {
    frontmatterDateRule,
    frontmatterIdRule,
    frontmatterTitleRule,
    frontmatterUpdatedRule,
    metadataRules,
} from './metadata-rules.js';
// 导出具体 Rules
export {
    addSectionNumbersRule,
    removeSectionNumbersRule,
    sectionRules,
} from './section-rules.js';
export {
    promoteHeadingsRule,
    stripFrontmatterRule,
    textReplaceRule,
    textRules,
} from './text-rules.js';
