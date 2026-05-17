import { loadWASM } from "@cmtx/fpe-wasm";

beforeAll(async () => {
    await loadWASM();
});
