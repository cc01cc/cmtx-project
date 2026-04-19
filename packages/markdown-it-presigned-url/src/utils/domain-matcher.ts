import type { Logger } from '../types.js';

/**
 * Domain matcher for URL validation
 * @public
 */
export class DomainMatcher {
    private domains: Set<string>;
    private logger?: Logger;

    constructor(domains: string[], logger?: Logger) {
        this.domains = new Set(domains);
        this.logger = logger;
        this.logger?.info(`初始化域名匹配器，配置的域名：${Array.from(this.domains).join(', ')}`);
    }

    matches(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            const hostname = parsedUrl.hostname;
            const matched = this.domains.has(hostname);
            this.logger?.debug(
                `匹配检查: URL=${url}, hostname=${hostname}, 配置域名=${Array.from(this.domains).join(', ')}, 匹配结果=${matched}`
            );
            return matched;
        } catch (e) {
            this.logger?.warn(`URL 解析失败: ${url}, 错误: ${e}`);
            return false;
        }
    }

    getDomains(): string[] {
        return Array.from(this.domains);
    }
}
