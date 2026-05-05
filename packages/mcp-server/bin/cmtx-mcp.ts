#!/usr/bin/env node

import { startServer } from "../src/server.js";

void startServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(
        `${JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message } })}\n`,
    );
    process.exit(1);
});
