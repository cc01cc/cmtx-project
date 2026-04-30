import * as vscode from "vscode";
import { getUnifiedLogger } from "./unified-logger.js";

/** 弹窗选项 */
export interface NotificationOptions {
    /** 自定义日志消息（如果不提供，使用弹窗消息） */
    logMessage?: string;
    /** 是否模态弹窗 */
    modal?: boolean;
}

/**
 * 显示错误弹窗（自动记录日志）
 *
 * 调用流程：
 * 1. 调用 UnifiedLogger.error() 记录日志
 * 2. 调用 VS Code showErrorMessage() 显示弹窗
 *
 * @param message - 弹窗消息
 * @param items - 按钮选项（字符串数组）
 * @param options - 弹窗选项
 * @returns 用户选择的按钮
 */
export async function showError(
    message: string,
    items?: string[],
    options?: NotificationOptions,
): Promise<string | undefined> {
    const logger = getUnifiedLogger();
    const logMsg = options?.logMessage ?? message;

    // 1. 记录日志到 UnifiedLogger（Output Channel + Debug Console + File Log）
    logger.error(logMsg);

    // 2. 显示 VS Code 弹窗
    const result = await vscode.window.showErrorMessage(
        message,
        { modal: options?.modal ?? false },
        ...(items ?? []),
    );

    return result;
}

/**
 * 显示警告弹窗（自动记录日志）
 *
 * 调用流程：
 * 1. 调用 UnifiedLogger.warn() 记录日志
 * 2. 调用 VS Code showWarningMessage() 显示弹窗
 */
export async function showWarning(
    message: string,
    items?: string[],
    options?: NotificationOptions,
): Promise<string | undefined> {
    const logger = getUnifiedLogger();
    const logMsg = options?.logMessage ?? message;

    // 1. 记录日志
    logger.warn(logMsg);

    // 2. 显示弹窗
    const result = await vscode.window.showWarningMessage(
        message,
        { modal: options?.modal ?? false },
        ...(items ?? []),
    );

    return result;
}

/**
 * 显示信息弹窗（自动记录日志）
 *
 * 调用流程：
 * 1. 调用 UnifiedLogger.info() 记录日志
 * 2. 调用 VS Code showInformationMessage() 显示弹窗
 */
export async function showInfo(
    message: string,
    items?: string[],
    options?: NotificationOptions,
): Promise<string | undefined> {
    const logger = getUnifiedLogger();
    const logMsg = options?.logMessage ?? message;

    // 1. 记录日志
    logger.info(logMsg);

    // 2. 显示弹窗
    const result = await vscode.window.showInformationMessage(
        message,
        { modal: options?.modal ?? false },
        ...(items ?? []),
    );

    return result;
}

/**
 * 显示确认弹窗（自动记录日志）
 *
 * 调用流程：
 * 1. 调用 UnifiedLogger.info() 记录日志
 * 2. 调用 VS Code showWarningMessage() 显示确认弹窗
 * 3. 记录用户选择结果
 *
 * @param message - 弹窗消息
 * @param confirmLabel - 确认按钮文本，默认 "Yes"
 * @param options - 弹窗选项
 * @returns 是否确认
 */
export async function confirm(
    message: string,
    confirmLabel = "Yes",
    options?: NotificationOptions,
): Promise<boolean> {
    const logger = getUnifiedLogger();
    const logMsg = options?.logMessage ?? message;

    // 1. 记录日志
    logger.info(logMsg);

    // 2. 显示确认弹窗
    const result = await vscode.window.showWarningMessage(
        message,
        { modal: options?.modal ?? false },
        confirmLabel,
        "Cancel",
    );

    // 3. 记录用户选择
    const confirmed = result === confirmLabel;
    logger.info(`User confirmed: ${confirmed}`);

    return confirmed;
}

/**
 * 显示快速选择弹窗（自动记录日志）
 *
 * 调用流程：
 * 1. 调用 UnifiedLogger.info() 记录日志
 * 2. 调用 VS Code showQuickPick() 显示选择弹窗
 * 3. 记录用户选择结果
 *
 * @param message - 弹窗消息（作为 placeHolder）
 * @param items - 选项数组
 * @param options - 弹窗选项
 * @returns 用户选择的项
 */
export async function showQuickPick(
    message: string,
    items: string[],
    options?: NotificationOptions,
): Promise<string | undefined> {
    const logger = getUnifiedLogger();
    const logMsg = options?.logMessage ?? message;

    // 1. 记录日志
    logger.info(logMsg);

    // 2. 显示快速选择弹窗
    const result = await vscode.window.showQuickPick(items, {
        placeHolder: message,
        ignoreFocusOut: true,
    });

    // 3. 记录用户选择
    logger.info(`User selected: ${result ?? "(cancelled)"}`);

    return result;
}
