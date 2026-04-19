import yaml from 'js-yaml';
import type { AdaptConfig } from '../types.js';
import { validateAdaptConfig } from './validate.js';

/**
 * 解析并校验 YAML 规则配置文本。
 *
 * @public
 */
export function parseAdaptConfig(
    yamlText: string,
    sourceName = 'inline adapt config'
): AdaptConfig {
    let raw: unknown;

    try {
        raw = yaml.load(yamlText);
    } catch (error) {
        throw new Error(`${sourceName}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return validateAdaptConfig(raw, sourceName);
}
