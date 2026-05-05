import { createDefaultRuleEngine } from "../rules/index.js";
import type { PresetConfig, SimplePreset } from "../rules/rule-types.js";
import type { ServiceRegistry } from "../rules/service-registry.js";
import type { AdaptResult, RenderResult, ValidationIssue } from "../types.js";
import { renderWechatMarkdown } from "./wechat/render.js";

const emptyServiceRegistry: ServiceRegistry = {
    register(): void {},
    get(): undefined {
        return undefined;
    },
    has(): boolean {
        return false;
    },
    getAllIds(): string[] {
        return [];
    },
};

interface PresetEntry {
    preset: PresetConfig | SimplePreset;
    validator?: (markdown: string) => ValidationIssue[];
}

const presetRegistry = new Map<string, PresetEntry>();

export function registerPreset(
    name: string,
    preset: PresetConfig | SimplePreset,
    validator?: (markdown: string) => ValidationIssue[],
): void {
    presetRegistry.set(name, { preset, validator });
}

export function unregisterPreset(name: string): void {
    presetRegistry.delete(name);
}

export function getRegisteredPresets(): string[] {
    return [...presetRegistry.keys()];
}

export async function adaptMarkdown(content: string, presetName: string): Promise<AdaptResult> {
    const entry = presetRegistry.get(presetName);
    if (!entry) {
        throw new Error(
            `Preset '${presetName}' is not registered. Use registerPreset() to register.`,
        );
    }

    const engine = createDefaultRuleEngine();
    const result = await engine.executePreset(entry.preset, {
        document: content,
        filePath: "",
        services: emptyServiceRegistry,
    });

    return {
        content: result.content,
        changed: result.results.some((r) => r.result.modified),
        appliedRuleNames: result.results.map((r) => r.ruleId),
    };
}

export async function validateMarkdown(
    content: string,
    presetName: string,
): Promise<ValidationIssue[]> {
    const entry = presetRegistry.get(presetName);
    if (!entry) {
        throw new Error(
            `Preset '${presetName}' is not registered. Use registerPreset() to register.`,
        );
    }

    return entry.validator?.(content) ?? [];
}

export async function renderMarkdown(content: string, presetName: string): Promise<RenderResult> {
    const entry = presetRegistry.get(presetName);
    if (!entry) {
        throw new Error(
            `Preset '${presetName}' is not registered. Use registerPreset() to register.`,
        );
    }

    const engine = createDefaultRuleEngine();
    const result = await engine.executePreset(entry.preset, {
        document: content,
        filePath: "",
        services: emptyServiceRegistry,
    });

    // TODO: 未来应重构为 convert-md-to-html rule
    //   设计：convert-md-to-html 规则接受一个主题配置文件参数
    //   此规则将 markdown 渲染为 html（使用参数中的主题样式）
    if (presetName === "wechat") {
        return renderWechatMarkdown(result.content);
    }

    return {
        content: result.content,
        format: "markdown",
        platform: presetName,
    };
}
