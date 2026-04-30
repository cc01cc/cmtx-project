import { beforeAll } from "vitest";
import { loadWASM } from "@cmtx/fpe-wasm";

beforeAll(async () => {
    await loadWASM();
});
