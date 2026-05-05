import { ensureWasmLoaded } from "../src/metadata/fpe-ff1.js";

beforeAll(async () => {
    await ensureWasmLoaded();
});
