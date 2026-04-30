import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    UnifiedLogger,
    ModuleLogger,
    getUnifiedLogger,
    getModuleLogger,
} from "../../../src/infra/unified-logger";

describe("UnifiedLogger", () => {
    let logger: UnifiedLogger;
    let mockOutputChannel: { appendLine: ReturnType<typeof vi.fn> };
    let mockConsole: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        logger = new UnifiedLogger();
        mockOutputChannel = { appendLine: vi.fn() };
        logger.setOutputChannel(mockOutputChannel as any);

        // Mock console methods
        mockConsole = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
        vi.spyOn(console, "debug").mockImplementation(mockConsole.debug);
        vi.spyOn(console, "info").mockImplementation(mockConsole.info);
        vi.spyOn(console, "warn").mockImplementation(mockConsole.warn);
        vi.spyOn(console, "error").mockImplementation(mockConsole.error);
    });

    describe("format", () => {
        it("should format message with [CMTX] prefix", () => {
            logger.info("Test message");

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining("[CMTX]"),
            );
            expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining("[CMTX]"));
        });

        it("should format message with level", () => {
            logger.info("Test message");

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining("INFO:"),
            );
        });

        it("should format message with module name", () => {
            const moduleLogger = logger.forModule("test-module");
            moduleLogger.info("Test message");

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining("[test-module]"),
            );
        });

        it("should format message with arguments", () => {
            logger.info("Hello", "World", 123);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining("Hello World 123"),
            );
        });
    });

    describe("dual output", () => {
        it("should output to both OutputChannel and Console", () => {
            logger.info("Test message");

            expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1);
            expect(mockConsole.info).toHaveBeenCalledTimes(1);
        });

        it("should output same message to both targets", () => {
            logger.info("Test message");

            const outputMessage = mockOutputChannel.appendLine.mock.calls[0][0];
            const consoleMessage = mockConsole.info.mock.calls[0][0];

            expect(outputMessage).toBe(consoleMessage);
        });
    });

    describe("log levels", () => {
        it("should use console.debug for debug level", () => {
            logger.debug("Debug message");
            expect(mockConsole.debug).toHaveBeenCalled();
        });

        it("should use console.info for info level", () => {
            logger.info("Info message");
            expect(mockConsole.info).toHaveBeenCalled();
        });

        it("should use console.warn for warn level", () => {
            logger.warn("Warn message");
            expect(mockConsole.warn).toHaveBeenCalled();
        });

        it("should use console.error for error level", () => {
            logger.error("Error message");
            expect(mockConsole.error).toHaveBeenCalled();
        });
    });

    describe("ModuleLogger", () => {
        it("should include module name in log message", () => {
            const moduleLogger = logger.forModule("upload");
            moduleLogger.info("Starting upload");

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining("[upload]"),
            );
        });

        it("should output to both targets", () => {
            const moduleLogger = logger.forModule("upload");
            moduleLogger.info("Starting upload");

            expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1);
            expect(mockConsole.info).toHaveBeenCalledTimes(1);
        });
    });

    describe("singleton", () => {
        it("getUnifiedLogger should return same instance", () => {
            const logger1 = getUnifiedLogger();
            const logger2 = getUnifiedLogger();
            expect(logger1).toBe(logger2);
        });

        it("getModuleLogger should return ModuleLogger with correct module", () => {
            const moduleLogger = getModuleLogger("test");
            expect(moduleLogger).toBeInstanceOf(ModuleLogger);
        });
    });

    describe("edge cases", () => {
        it("should handle Error objects", () => {
            const error = new Error("Test error");
            logger.error("Failed", error);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining("Error: Test error"),
            );
        });

        it("should handle non-string arguments", () => {
            logger.info("Count:", 42, { key: "value" });

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining("Count: 42"),
            );
        });

        it("should work without output channel", () => {
            const loggerWithoutChannel = new UnifiedLogger();
            vi.spyOn(console, "info").mockImplementation(vi.fn());

            // Should not throw
            expect(() => loggerWithoutChannel.info("Test")).not.toThrow();
        });
    });
});
