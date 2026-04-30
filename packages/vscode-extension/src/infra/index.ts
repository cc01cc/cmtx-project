export type { CmtxConfig } from "@cmtx/asset/config";
export {
    ensureCmtxConfig,
    getAddSectionNumbersConfig,
    loadCmtxConfig,
    setupConfigListener,
} from "./cmtx-config.js";
export type { ConfigValidationError } from "@cmtx/asset/config";
export {
    formatValidationErrors,
    showConfigValidationErrors,
    validateConfig,
} from "./config-validator.js";
export { setOutputChannel as setConfigWatcherOutputChannel } from "./config-watcher.js";
export {
    applyDocumentChanges,
    applyEditsIfNeeded,
    validateEditor,
    validateMarkdownEditor,
} from "./editor.js";
export {
    confirm,
    type NotificationOptions,
    showInfo,
    showError,
    showQuickPick,
    showWarning,
} from "./notification.js";
export {
    type FileLogOptions,
    getModuleLogger,
    getUnifiedLogger,
    initFileLogging,
    ModuleLogger,
    UnifiedLogger,
} from "./unified-logger.js";
