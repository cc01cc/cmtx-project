export interface TemplateContext {
    rule: {
        target: Record<string, string>;
        source: Record<string, string>;
    };
    input: Record<string, string>;
    env: NodeJS.ProcessEnv;
}

export function resolveTemplate(template: string, contexts: TemplateContext): string {
    return template.replace(/\$\{([^}]+)\}/g, (_match, path: string) => {
        const parts = path.split(".");
        let value: unknown = contexts;

        for (const part of parts) {
            if (value === null || value === undefined) {
                return _match;
            }
            if (typeof value === "object") {
                value = (value as Record<string, unknown>)[part];
            } else {
                return _match;
            }
        }

        if (value === null || value === undefined) {
            return _match;
        }
        return String(value);
    });
}
