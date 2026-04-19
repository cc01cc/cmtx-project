import type { AdaptConfig, AdaptRule } from '../types.js';

function validateRule(rule: AdaptRule, index: number, sourceName: string): void {
    if (typeof rule.match !== 'string' || rule.match.length === 0) {
        throw new TypeError(
            `${sourceName}: rule #${index + 1} is missing "match" (non-empty string)`
        );
    }

    if (typeof rule.replace !== 'string') {
        throw new TypeError(`${sourceName}: rule #${index + 1} is missing "replace" (string)`);
    }

    try {
        new RegExp(rule.match, rule.flags ?? 'gm');
    } catch {
        throw new Error(
            `${sourceName}: rule #${index + 1} "${rule.name ?? rule.match}" has an invalid regex: ${rule.match}`
        );
    }
}

/**
 * 校验适配规则配置，失败时抛出 Error。
 *
 * @public
 */
export function validateAdaptConfig(rawConfig: unknown, sourceName = 'adapt config'): AdaptConfig {
    if (!rawConfig || typeof rawConfig !== 'object') {
        throw new TypeError(`${sourceName} is not a valid object`);
    }

    const config = rawConfig as AdaptConfig;

    if (!Array.isArray(config.rules)) {
        throw new TypeError(`${sourceName} must contain a top-level "rules" array`);
    }

    config.rules.forEach((rule, index) => {
        validateRule(rule, index, sourceName);
    });

    return config;
}
