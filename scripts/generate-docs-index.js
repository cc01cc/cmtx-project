#!/usr/bin/env node

/**
 * 自动生成文档索引页面
 * 从 pnpm-workspace.yaml 和各 package.json 读取信息，生成统一的 HTML 索引
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

/**
 * 读取 YAML 文件
 */
function readYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    console.error(`✗ 读取 YAML 失败：${filePath}`, error.message);
    return null;
  }
}

/**
 * 收集所有包的信息
 */
function collectPackages() {
  const workspaceFile = path.join(rootDir, 'pnpm-workspace.yaml');
  const workspaceConfig = readYaml(workspaceFile);

  if (!workspaceConfig || !workspaceConfig.packages) {
    console.error('✗ 无法读取 pnpm-workspace.yaml');
    process.exit(1);
  }

  const packages = [];

  for (const pattern of workspaceConfig.packages) {
    const dir = pattern.replace('/*', '');
    const fullDir = path.join(rootDir, dir);

    if (!fs.existsSync(fullDir)) {
      console.warn(`⚠ 目录不存在：${fullDir}`);
      continue;
    }

    const entries = fs.readdirSync(fullDir);

    for (const name of entries) {
      const pkgPath = path.join(fullDir, name, 'package.json');
      const docsPath = path.join(fullDir, name, 'docs', 'api');

      if (!fs.existsSync(pkgPath)) {
        continue;
      }

      // 检查是否有生成的文档
      if (!fs.existsSync(docsPath)) {
        console.warn(`⚠ 文档不存在：${docsPath}`);
        continue;
      }

      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

        // 跳过私有包或没有 description 的包
        if (pkg.private && !pkg.docsPublic) {
          console.log(`⊘ 跳过私有包：${pkg.name}`);
          continue;
        }

        packages.push({
          name: pkg.name,
          description: pkg.description || '暂无描述',
          version: pkg.version,
          directory: name,
          hasDocsApi: true,
        });
      } catch (error) {
        console.error(`✗ 解析 package.json 失败：${pkgPath}`, error.message);
      }
    }
  }

  return packages;
}

/**
 * 生成 HTML 索引页面
 */
function generateIndexHtml(packages) {
  const packageRows = packages
    .map(
      (pkg) => `
      <tr>
        <td class="name"><strong>${pkg.name}</strong></td>
        <td class="description">${pkg.description}</td>
        <td class="version"><code>${pkg.version}</code></td>
        <td class="action"><a href="./${pkg.directory}/">查看文档 →</a></td>
      </tr>
    `,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="CMTX 项目文档中心 - Markdown 图片处理工具链">
  <title>CMTX 文档 · Markdown 图片处理</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary: #0066cc;
      --primary-dark: #0052a3;
      --border: #e5e7eb;
      --text-primary: #1f2937;
      --text-secondary: #6b7280;
      --bg-light: #f9fafb;
      --bg-white: #ffffff;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 50%);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }

    /* Header */
    header {
      border-bottom: 1px solid var(--border);
      padding: 40px 0;
      background: var(--bg-white);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .logo {
      font-size: 24px;
    }

    .header-text h1 {
      font-size: 1.8rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .header-text p {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }

    /* Main Content */
    main {
      padding: 60px 0;
    }

    .section-title {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 24px;
      color: var(--text-primary);
    }

    .section-subtitle {
      color: var(--text-secondary);
      font-size: 0.95rem;
      margin-bottom: 32px;
    }

    /* Table */
    .packages-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-white);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .packages-table thead {
      background: var(--bg-light);
      border-bottom: 1px solid var(--border);
    }

    .packages-table th {
      padding: 16px;
      text-align: left;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .packages-table tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
    }

    .packages-table tbody tr:last-child {
      border-bottom: none;
    }

    .packages-table tbody tr:hover {
      background: var(--bg-light);
    }

    .packages-table td {
      padding: 20px 16px;
      vertical-align: middle;
    }

    .packages-table .name {
      font-weight: 600;
      color: var(--primary);
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 0.95rem;
    }

    .packages-table .description {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .packages-table .version {
      color: var(--text-secondary);
    }

    .packages-table code {
      background: var(--bg-light);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 0.85rem;
    }

    .packages-table .action a {
      display: inline-block;
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      padding: 6px 12px;
      border-radius: 4px;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .packages-table .action a:hover {
      background: var(--bg-light);
      border-color: var(--primary);
    }

    /* Footer */
    footer {
      border-top: 1px solid var(--border);
      padding: 40px 0;
      background: var(--bg-white);
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    footer a {
      color: var(--primary);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    footer a:hover {
      color: var(--primary-dark);
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .packages-table {
        font-size: 0.9rem;
      }

      .packages-table th,
      .packages-table td {
        padding: 12px 8px;
      }

      .packages-table .description {
        display: none;
      }

      main {
        padding: 40px 0;
      }

      header {
        padding: 24px 0;
      }
    }

    @media (max-width: 480px) {
      .section-title {
        font-size: 1.1rem;
      }

      .packages-table .version,
      .packages-table .action {
        display: none;
      }

      .packages-table th:nth-child(n+3),
      .packages-table td:nth-child(n+3) {
        display: none;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="header-content">
        <div class="logo">📚</div>
        <div class="header-text">
          <h1>CMTX 文档</h1>
          <p>Markdown 图片处理工具链</p>
        </div>
      </div>
    </div>
  </header>

  <main>
    <div class="container">
      <h2 class="section-title">文档包</h2>
      <p class="section-subtitle">点击"查看文档"访问各包的完整 API 文档</p>

      <table class="packages-table">
        <thead>
          <tr>
            <th>包名</th>
            <th>描述</th>
            <th>版本</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${packageRows}
        </tbody>
      </table>
    </div>
  </main>

  <footer>
    <div class="container">
      <p>
        © 2024 CMTX Project ·
        <a href="https://github.com/cc01cc/cmtx-project">GitHub</a> ·
        <a href="https://github.com/cc01cc/cmtx-project/issues">Issues</a>
      </p>
    </div>
  </footer>
</body>
</html>`;
}

/**
 * 主函数
 */
function main() {
  console.log('📖 开始生成文档索引...\n');

  const packages = collectPackages();

  if (packages.length === 0) {
    console.error('✗ 没有找到任何公开的文档包');
    process.exit(1);
  }

  console.log(`✓ 找到 ${packages.length} 个文档包:`);
  packages.forEach((pkg) => {
    console.log(`  - ${pkg.name} (${pkg.version})`);
  });
  console.log();

  const html = generateIndexHtml(packages);
  const outputPath = path.join(rootDir, 'docs-index.html');

  try {
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`✓ 索引页面已生成：${outputPath}`);
    console.log(
      `✓ 文件大小：${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`,
    );
  } catch (error) {
    console.error(`✗ 写入文件失败：${outputPath}`, error.message);
    process.exit(1);
  }
}

main();
