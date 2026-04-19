import { type CmtxLogger, getLogger as getBaseLogger } from '@cmtx/core';
import type * as vscode from 'vscode';

let _outputChannel: vscode.OutputChannel | null = null;

type LogMethod = 'debug' | 'info' | 'warn' | 'error';

const LOG_METHODS = new Set<string>(['debug', 'info', 'warn', 'error']);

function isLogMethod(value: string): value is LogMethod {
    return LOG_METHODS.has(value);
}

function stringifyLogArg(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    if (value instanceof Error) {
        return value.stack ?? value.message;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function formatLogMessage(
    level: LogMethod,
    moduleName: string | undefined,
    args: unknown[]
): string {
    const scope = moduleName ? `[${moduleName}]` : '';
    const rendered = args.map((arg) => stringifyLogArg(arg)).join(' ');
    return `[CMTX] ${scope} ${level.toUpperCase()}: ${rendered}`.trim();
}

function appendToOutputChannel(
    level: LogMethod,
    moduleName: string | undefined,
    args: unknown[]
): void {
    if (!_outputChannel) {
        return;
    }

    const message = formatLogMessage(level, moduleName, args);
    _outputChannel.appendLine(message);
}

export function setOutputChannel(channel: vscode.OutputChannel): void {
    _outputChannel = channel;
}

export function getLogger(moduleName?: string): CmtxLogger {
    const baseLogger = getBaseLogger(moduleName);

    // 由于 @cmtx/core 的 logger 默认静默，我们需要包装它以添加 Output Channel 输出
    // Debug Console 输出由 @cmtx/core 的 logger 处理（当 silent: false 时）
    return new Proxy(baseLogger, {
        get(target, prop, receiver) {
            if (typeof prop === 'string' && isLogMethod(prop)) {
                const method = Reflect.get(target, prop, receiver);
                if (typeof method === 'function') {
                    const logMethod = method as (...args: unknown[]) => unknown;
                    return (...args: unknown[]) => {
                        // 输出到 OutputChannel（用户可见）
                        appendToOutputChannel(prop, moduleName, args);
                        // 调用原始方法（输出到文件和 Debug Console）
                        return logMethod.apply(target, args);
                    };
                }
            }

            return Reflect.get(target, prop, receiver);
        },
    });
}
