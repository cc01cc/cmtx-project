/**
 * 事件触发工具函数
 */

import type {
  AnalyzeOptions,
  UploadSingleImageOptions,
  UploadMultiImagesOptions,
  UploadEvent,
} from "../types.js";

/**
 * 触发事件（如果有回调）
 */
export function emitEvent(
  options:
    | AnalyzeOptions
    | UploadSingleImageOptions
    | UploadMultiImagesOptions,
  type: UploadEvent["type"],
  data?: UploadEvent["data"],
): void {
  const onEvent = options.hooks?.onEvent;
  if (!onEvent) return;

  onEvent({
    type,
    timestamp: Date.now(),
    data,
  });
}
