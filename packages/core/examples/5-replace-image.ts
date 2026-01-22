/**
 * 示例 5: 替换图片引用
 * 运行: pnpm exec tsx examples/5-replace-image.ts
 * 
 * 这个示例会在操作前备份文件,操作后恢复,确保非幂等操作不会破坏演示环境
 */

import { replaceImageInFiles } from "../src";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// 备份和恢复演示数据的工具函数
async function backupMarkdownFiles(dir: string): Promise<Map<string, string>> {
  const backup = new Map<string, string>();
  const docDir = resolve(dir);
  
  if (existsSync(docDir)) {
    const { readdirSync } = await import("node:fs");
    const files = readdirSync(docDir);
    
    for (const file of files) {
      if (file.endsWith(".md")) {
        const path = resolve(docDir, file);
        try {
          const content = await readFile(path, "utf-8");
          backup.set(path, content);
        } catch {
          // 忽略读取错误
        }
      }
    }
  }
  
  return backup;
}

async function restoreMarkdownFiles(backup: Map<string, string>): Promise<void> {
  for (const [path, content] of backup.entries()) {
    try {
      await writeFile(path, content, "utf-8");
    } catch {
      // 忽略恢复错误
    }
  }
}

async function main() {
  const docsDir = "examples/demo-data/docs";
  
  // 备份演示文件
  const backup = await backupMarkdownFiles(docsDir);
  
  try {
    // 配置选项（完整参数）
    const options = {
      depth: "all" as const,           // 递归扫描所有子目录
      projectRoot: process.cwd()       // 项目根目录
    };

    console.log("\n=== 场景1: 替换图片源 (src) ===");
    // 将 banner.png 替换为 logo.png
    const result1 = await replaceImageInFiles(
      "examples/demo-data/images/banner.png",
      docsDir,
      {
        newSrc: "examples/demo-data/images/logo.png",
        ...options
      }
    );

    console.log(`处理了 ${result1.length} 个文件`);
    result1.forEach(file => {
      if (file.replacements.length > 0) {
        console.log(`\n文件: ${file.relativePath}`);
        console.log(`  替换次数: ${file.replacements.length}`);
        file.replacements.forEach((repl, idx) => {
          console.log(`  第 ${idx + 1} 处: 行号 ${repl.line}, 列号 ${repl.column}`);
          console.log(`    原: ${repl.oldText}`);
          console.log(`    新: ${repl.newText}`);
        });
      }
    });

    console.log("\n=== 场景2: 替换 alt 文本 ===");
    // 替换 alt 文本
    const result2 = await replaceImageInFiles(
      "examples/demo-data/images/banner.png",
      docsDir,
      {
        newAlt: "页面横幅图",
        ...options
      }
    );

    console.log(`处理了 ${result2.length} 个文件`);
    let totalReplacements = 0;
    result2.forEach(file => {
      if (file.replacements.length > 0) {
        totalReplacements += file.replacements.length;
        console.log(`\n文件: ${file.relativePath}`);
        console.log(`  替换次数: ${file.replacements.length}`);
        file.replacements.forEach(repl => {
          console.log(`    原: ${repl.oldText}`);
          console.log(`    新: ${repl.newText}`);
        });
      }
    });
    console.log(`\n总替换次数: ${totalReplacements}`);

    console.log("\n=== 场景3: 同时替换 src 和 alt ===");
    // 同时替换 src 和 alt
    const result3 = await replaceImageInFiles(
      "examples/demo-data/images/logo.png",
      docsDir,
      {
        newSrc: "https://cdn.example.com/logo.png",
        newAlt: "应用Logo",
        ...options
      }
    );

    console.log(`处理了 ${result3.length} 个文件`);
    result3.forEach(file => {
      if (file.replacements.length > 0) {
        console.log(`\n文件: ${file.relativePath}`);
        file.replacements.forEach(repl => {
          console.log(`  替换类型: ${repl.type}`);
          console.log(`    原: ${repl.oldText}`);
          console.log(`    新: ${repl.newText}`);
        });
      }
    });

    console.log("\n✅ 所有演示完成！");
  } finally {
    // 恢复演示文件
    console.log("\n⏮️ 恢复演示文件...");
    await restoreMarkdownFiles(backup);
    console.log("✓ 演示文件已恢复");
  }
}

main();
