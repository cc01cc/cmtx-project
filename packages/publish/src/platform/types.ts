import type { AdaptResult, AdaptRule, RenderResult } from '../types.js';

export interface PlatformAdapter {
    name: string;
    rules: AdaptRule[];
    validate(markdown: string): ValidationIssue[];
    adapt(markdown: string): AdaptResult;
    render?(markdown: string): RenderResult;
}

export type AdaptPlatform = 'wechat' | 'zhihu' | 'csdn';

export type ValidationLevel = 'error' | 'warning' | 'info';

export interface ValidationIssue {
    code: string;
    level: ValidationLevel;
    message: string;
    line?: number;
    column?: number;
    fixable?: boolean;
}
