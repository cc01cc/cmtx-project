import { describe, expect, it, vi } from "vitest";
import { warnAndCleanUnresolved } from "../src/upload/naming-handler.js";

describe("warnAndCleanUnresolved", () => {
    it("应保留无占位符的字符串不变", () => {
        const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const result = warnAndCleanUnresolved("photo.png", logger);
        expect(result).toBe("photo.png");
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("应替换未知变量并输出警告", () => {
        const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const result = warnAndCleanUnresolved("photo_{typo}.png", logger);
        expect(result).toBe("photo_.png");
        expect(logger.warn).toHaveBeenCalledWith("[NamingHandler] 未知变量: {typo}");
    });

    it("不传 logger 时不抛出异常", () => {
        const result = warnAndCleanUnresolved("photo_{typo}.png");
        expect(result).toBe("photo_.png");
    });

    it("应替换多个未知变量", () => {
        const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const result = warnAndCleanUnresolved("{a}_{b}.png", logger);
        expect(result).toBe("_.png");
        expect(logger.warn).toHaveBeenCalledTimes(2);
    });
});
