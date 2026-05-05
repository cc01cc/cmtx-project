import { parseFrontmatter, parseYamlFrontmatter } from "@cmtx/core";
import type { Rule, RuleContext, RuleResult } from "../rule-types.js";

interface FmValidateConfig {
    key: string;
    pattern?: string;
    required?: boolean;
}

export const fmValidateRule: Rule = {
    id: "fm-validate",
    name: "Front Matter 字段校验",
    description: "校验 front matter 字段格式，不修改文档内容",

    execute(context: RuleContext, config?: FmValidateConfig): RuleResult {
        if (!config?.key) {
            return {
                content: context.document,
                modified: false,
                messages: ["fm-validate: missing 'key' config"],
            };
        }

        const parsed = parseFrontmatter(context.document);
        const fm = parsed.hasFrontmatter ? parseYamlFrontmatter(parsed.data) : {};
        const fieldValue = fm?.[config.key];
        const required = config.required !== false;

        if (fieldValue === undefined || fieldValue === null) {
            if (!required) {
                return {
                    content: context.document,
                    modified: false,
                    messages: [`fm-validate: '${config.key}' missing (optional, skipped)`],
                };
            }
            throw new Error(
                `fm-validate: required field '${config.key}' is missing in front matter`,
            );
        }

        const strValue = String(fieldValue).trim();
        if (config.pattern) {
            const regex = new RegExp(config.pattern);
            if (!regex.test(strValue)) {
                throw new Error(
                    `fm-validate: '${config.key}' value '${strValue}' does not match pattern '${config.pattern}'`,
                );
            }
        }

        return {
            content: context.document,
            modified: false,
            messages: [`fm-validate: '${config.key}' OK`],
        };
    },
};
