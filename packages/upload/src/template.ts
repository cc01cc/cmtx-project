/**
 * 简单模板渲染模块
 */

export function renderTemplateSimple(template: string, context: Record<string, string>): string {
    return template.replaceAll(/\{([^}]+)\}/g, (match, key) => {
        return context[key] || match;
    });
}

export function createTemplateContext(
    localPath: string,
    cloudUrl: string,
    originalValue?: string
): Record<string, string> {
    const ext = localPath.split('.').pop() || '';
    const name = localPath.split('/').pop()?.split('.')[0] || 'image';
    
    return {
        localPath,
        cloudUrl,
        originalValue: originalValue || '',
        ext: ext ? `.${ext}` : '',
        name
    };
}