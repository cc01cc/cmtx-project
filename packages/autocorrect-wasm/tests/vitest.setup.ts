import { loadWASM } from "../src/index.js";

// 自动加载 WASM，确保测试运行时已初始化
await loadWASM();
