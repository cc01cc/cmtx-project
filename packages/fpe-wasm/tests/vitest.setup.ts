import { beforeAll } from 'vitest';
import { loadWASM } from '../src/index.js';

beforeAll(async () => {
    await loadWASM();
});
