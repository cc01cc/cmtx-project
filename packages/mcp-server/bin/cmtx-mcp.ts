#!/usr/bin/env node

import { startServer } from "../src/server.js";

try {
    await startServer();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Emit a JSON-RPC error line to stdout for consistency
    process.stdout.write(
        `${JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message } })}\n`,
    );
    process.exit(1);
}
