import { parseFrontmatter, parseYamlFrontmatter, upsertFrontmatterFields } from "@cmtx/core";
import type { Rule, RuleContext, RuleResult } from "../rule-types.js";

interface FieldMapping {
    from: string;
    to: string;
    transform?: Record<string, string>;
}

interface FrontmatterMapConfig {
    mappings?: FieldMapping[];
    add?: Record<string, string>;
}

export const frontmatterMapRule: Rule = {
    id: "frontmatter-map",
    name: "Front Matter 字段映射",
    description: "字段重命名/转换/新增",

    execute(context: RuleContext, config?: FrontmatterMapConfig): RuleResult {
        const document = context.document;
        const parsed = parseFrontmatter(document);
        const fm = parsed.hasFrontmatter ? parseYamlFrontmatter(parsed.data) : {};
        const fields: Record<string, string> = {};
        const messages: string[] = [];

        if (config?.mappings) {
            for (const mapping of config.mappings) {
                const val = fm[mapping.from];
                if (val === undefined || val === null) {
                    continue;
                }
                let strVal = Array.isArray(val) ? val.join(", ") : String(val);
                if (mapping.transform) {
                    strVal = mapping.transform[strVal] ?? strVal;
                }
                if (mapping.transform && mapping.transform[strVal] === "now") {
                    strVal = new Date().toISOString().split("T")[0];
                }
                fields[mapping.to] = strVal;
                messages.push(`frontmatter-map: ${mapping.from} -> ${mapping.to} = ${strVal}`);
            }
        }

        if (config?.add) {
            for (const [key, value] of Object.entries(config.add)) {
                if (fm?.[key] === undefined || fm?.[key] === null) {
                    fields[key] = value;
                    messages.push(`frontmatter-map: added ${key} = ${value}`);
                }
            }
        }

        if (Object.keys(fields).length === 0) {
            return {
                content: document,
                modified: false,
                messages: ["frontmatter-map: no changes"],
            };
        }

        const result = upsertFrontmatterFields(document, fields);
        return {
            content: result.markdown,
            modified: result.success && result.markdown !== document,
            messages,
        };
    },
};
