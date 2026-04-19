import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import * as vscode from 'vscode';
import {
    type CmtxConfig,
    ensureCmtxConfig,
    getConfigDirPath,
    getConfigFilePath,
    getCurrentWorkspaceFolder,
    saveCmtxConfig,
} from '../infra/cmtx-config';

export async function initConfig(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a workspace folder first');
        return;
    }

    const configDir = getConfigDirPath(workspaceFolder);
    const configPath = getConfigFilePath(workspaceFolder);

    // Check if config already exists
    if (existsSync(configPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `Configuration file already exists at ${configPath}`,
            'Overwrite',
            'Cancel'
        );

        if (overwrite !== 'Overwrite') {
            return;
        }
    }

    const configContent = `# CMTX Configuration
# See https://github.com/cc01cc/cmtx-project for documentation

version: v2

# Upload configuration
upload:
  imageFormat: markdown  # markdown | html
  batchLimit: 5
  imageAltTemplate: ""
  namingTemplate: "{name}.{ext}"
  auto: false
  keepLocalImages: true

# Storage configuration
# Environment Variable Syntax:
# - Must use double quotes: "\${VAR_NAME}" (Docker Compose standard)
# - Supports default values: "\${VAR_NAME:-default_value}"
# - Example: "\${CMTX_ALIYUN_BUCKET:-my-default-bucket}"
storage:
  adapter: aliyun-oss
  config:
    region: oss-cn-hangzhou
    # Use environment variables for sensitive data (recommended)
    bucket: "\${CMTX_ALIYUN_BUCKET}"
    accessKeyId: "\${CMTX_ALIYUN_ACCESS_KEY_ID}"
    accessKeySecret: "\${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
    # Or use plaintext (not recommended for sensitive data)
    # bucket: my-bucket
    # accessKeyId: your-access-key-id
    # accessKeySecret: your-access-key-secret
  prefix: blog/
  namingPattern: "{date}_{md5_8}{ext}"

# Presigned URL configuration
presignedUrls:
  expire: 600
  maxRetryCount: 3
  imageFormat: all  # markdown | html | all
  domains:
    - domain: my-bucket.oss-cn-hangzhou.aliyuncs.com
      provider: aliyun-oss
      bucket: my-bucket
      region: oss-cn-hangzhou
      # Use environment variables for credentials (recommended)
      accessKeyId: "\${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "\${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
      # Or use plaintext (not recommended)
      # accessKeyId: your-access-key-id
      # accessKeySecret: your-access-key-secret
      # Optional settings
      # path: images/
      # forceHttps: true

# Image resize configuration
resize:
  widths: [360, 480, 640, 800, 960, 1200]
  domains:
    - domain: my-bucket.oss-cn-hangzhou.aliyuncs.com
      provider: aliyun-oss

# Global rules configuration
# Rules 用于配置各处理模块的默认参数
# 注意：Rule 是否执行由 preset 控制，此处仅配置默认参数
rules:
  # 文本处理 Rules
  # [常用] 移除文档开头的 YAML frontmatter，发布到不支持 frontmatter 的平台时使用
  strip-frontmatter: {}

  # [常用] 提升标题层级，如 H2->H1, H3->H2
  promote-headings:
    levels: 1  # 提升的级数

  # [可选] 通用文本替换，使用正则表达式
  text-replace:
    match: 'TODO:\\s*(.+)'     # 正则表达式（使用单引号避免转义问题）
    replace: '[TODO] $1'      # 替换字符串，支持捕获组 $1, $2...
    flags: 'gm'              # 正则标志：g(全局), m(多行), i(忽略大小写)

  # 图片处理 Rules
  # [可选] 将 Markdown 图片语法转换为 HTML <img> 标签（微信公众号需要）
  convert-images:
    convertToHtml: false

  # [常用] 上传本地图片到云端存储
  upload-images:
    width: 800  # 指定图片宽度（可选）

  # 章节编号 Rules
  # [常用] 为标题添加层级编号，如 "1.1. 标题"
  # 注意：默认从 H2 开始编号，配合 promote-headings 使用时建议改为 1
  add-section-numbers:
    minLevel: 2      # 最小标题等级（从 H2 开始编号）
    maxLevel: 6      # 最大标题等级
    startLevel: 2    # 起始层级
    separator: "."   # 分隔符

  # [可选] 移除标题中的章节编号
  remove-section-numbers: {}

  # Frontmatter 处理 Rules
  # [可选] 将指定级别的标题提取到 frontmatter 的 title 字段
  frontmatter-title:
    headingLevel: 1

  # [可选] 在 frontmatter 中添加 date 字段（当前日期）
  frontmatter-date: {}

  # [可选] 在 frontmatter 中添加/更新 updated 字段
  frontmatter-updated: {}

  # [可选] 在 frontmatter 中生成加密的唯一 ID
  frontmatter-id:
    encryptionKey: ""  # 加密密钥（必填）

  # 文案纠正 Rules
  # [可选] 自动纠正 CJK 文案中的空格、标点符号
  # 基于 https://github.com/huacnlee/autocorrect
  autocorrect:
    configPath: ".autocorrectrc"  # AutoCorrect 配置文件路径（可选）
    strict: false                 # 是否启用严格模式

# Presets (rule collections) for different platforms
# Presets 是 Rule 的组合，应用时会按顺序执行
# 可以使用字符串数组（引用 Rule ID）或对象形式（带自定义配置）
presets:
  # 知乎 - 适合知乎专栏发布
  zhihu:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - upload-images
    - frontmatter-id
    - frontmatter-date

  # 微信公众号 - 需要 HTML 图片格式
  wechat:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - convert-images
    - upload-images
    - frontmatter-id
    - frontmatter-date

  # CSDN - 简洁配置
  csdn:
    - strip-frontmatter
    - add-section-numbers
    - upload-images
    - frontmatter-date

  # 掘金 - 适合掘金社区
  juejin:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - upload-images
    - frontmatter-date

  # 博客园 - 适合博客园发布
  cnblogs:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - upload-images
    - frontmatter-id
    - frontmatter-date

  # 完整示例 - 使用对象形式自定义配置
  custom-example:
    - id: strip-frontmatter
    - id: promote-headings
      config:
        levels: 1
    - id: add-section-numbers
      config:
        minLevel: 2
        maxLevel: 4
    - id: text-replace
      config:
        match: '[s*]'
        replace: '[ ]'
        flags: 'g'
    - id: upload-images
      config:
        width: 1200
`;

    try {
        // Create .cmtx directory if it doesn't exist
        if (!existsSync(configDir)) {
            await mkdir(configDir, { recursive: true });
        }

        await writeFile(configPath, configContent, 'utf-8');

        const open = await vscode.window.showInformationMessage(
            `Configuration file created at ${configPath}`,
            'Open File'
        );

        if (open === 'Open File') {
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to create configuration: ${message}`);
    }
}

export async function editConfig(): Promise<void> {
    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a workspace folder first');
        return;
    }

    const configPath = getConfigFilePath(workspaceFolder);

    // Ensure config exists
    await ensureCmtxConfig(workspaceFolder);

    // Open config file
    const document = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(document);
}

export async function openConfigUI(): Promise<void> {
    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a workspace folder first');
        return;
    }

    const config = await ensureCmtxConfig(workspaceFolder);

    // Provide config options
    const items = [
        { label: 'Upload Settings', description: 'Configure upload behavior', category: 'upload' },
        {
            label: 'Resize Settings',
            description: 'Configure image resize widths',
            category: 'resize',
        },
        {
            label: 'Presigned URL Settings',
            description: 'Configure presigned URL settings',
            category: 'presignedUrls',
        },
        { label: 'Storage Settings', description: 'Configure cloud storage', category: 'storage' },
        {
            label: 'Open Config File',
            description: 'Edit configuration file directly',
            category: 'file',
        },
    ];

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select configuration category',
    });

    if (!selected) {
        return;
    }

    if (selected.category === 'file') {
        await editConfig();
        return;
    }

    // Edit specific config category
    await editSpecificConfig(selected.category, config, workspaceFolder);
}

async function editSpecificConfig(
    category: string,
    config: CmtxConfig,
    workspaceFolder: vscode.WorkspaceFolder
): Promise<void> {
    switch (category) {
        case 'upload':
            await editUploadConfig(config, workspaceFolder);
            break;

        case 'resize':
            await editResizeConfig(config, workspaceFolder);
            break;

        case 'presignedUrls':
            await editPresignedUrlsConfig(config, workspaceFolder);
            break;

        case 'storage':
            // For complex configurations, open the file directly
            vscode.window.showInformationMessage(
                'Please edit this configuration in the config file'
            );
            await editConfig();
            break;
    }
}

/**
 * 编辑上传配置
 */
async function editUploadConfig(
    config: CmtxConfig,
    workspaceFolder: vscode.WorkspaceFolder
): Promise<void> {
    const imageFormat = await vscode.window.showQuickPick(
        [
            { label: 'Markdown', value: 'markdown' },
            { label: 'HTML', value: 'html' },
        ],
        {
            placeHolder: 'Select image format after upload',
        }
    );

    if (imageFormat) {
        config.upload = config.upload ?? {};
        config.upload.imageFormat = imageFormat.value as 'markdown' | 'html';
    }

    const batchLimit = await vscode.window.showInputBox({
        prompt: 'Enter batch upload limit',
        value: String(config.upload?.batchLimit ?? 5),
        validateInput: (value) => {
            const num = parseInt(value, 10);
            if (Number.isNaN(num) || num < 1) {
                return 'Please enter a positive number';
            }
            return undefined;
        },
    });

    if (batchLimit !== undefined) {
        config.upload = config.upload ?? {};
        config.upload.batchLimit = parseInt(batchLimit, 10);
    }

    const auto = await vscode.window.showQuickPick(
        [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
        ],
        {
            placeHolder: 'Enable auto upload after paste?',
        }
    );

    if (auto) {
        config.upload = config.upload ?? {};
        config.upload.auto = auto.value;
    }

    await saveCmtxConfig(workspaceFolder, config);
    vscode.window.showInformationMessage('Upload settings saved');
}

/**
 * 编辑 Resize 配置
 */
async function editResizeConfig(
    config: CmtxConfig,
    workspaceFolder: vscode.WorkspaceFolder
): Promise<void> {
    const widthsInput = await vscode.window.showInputBox({
        prompt: 'Enter image widths (comma-separated)',
        value: (config.resize?.widths ?? [360, 480, 640, 800, 960, 1200]).join(', '),
        validateInput: (value) => {
            const widths = value.split(',').map((w) => parseInt(w.trim(), 10));
            if (widths.some((w) => Number.isNaN(w) || w < 1)) {
                return 'Please enter valid positive numbers separated by commas';
            }
            return undefined;
        },
    });

    if (widthsInput !== undefined) {
        config.resize = config.resize ?? {};
        config.resize.widths = widthsInput.split(',').map((w) => parseInt(w.trim(), 10));
        await saveCmtxConfig(workspaceFolder, config);
        vscode.window.showInformationMessage('Resize settings saved');
    }
}

/**
 * 编辑 Presigned URLs 配置
 */
async function editPresignedUrlsConfig(
    config: CmtxConfig,
    workspaceFolder: vscode.WorkspaceFolder
): Promise<void> {
    const expire = await vscode.window.showInputBox({
        prompt: 'Enter presigned URL expiration time (seconds)',
        value: String(config.presignedUrls?.expire ?? 600),
        validateInput: (value) => {
            const num = parseInt(value, 10);
            if (Number.isNaN(num) || num < 60) {
                return 'Please enter a number >= 60';
            }
            return undefined;
        },
    });

    if (expire !== undefined) {
        config.presignedUrls = config.presignedUrls ?? {};
        config.presignedUrls.expire = parseInt(expire, 10);
    }

    const maxRetry = await vscode.window.showInputBox({
        prompt: 'Enter max retry count',
        value: String(config.presignedUrls?.maxRetryCount ?? 3),
        validateInput: (value) => {
            const num = parseInt(value, 10);
            if (Number.isNaN(num) || num < 0) {
                return 'Please enter a non-negative number';
            }
            return undefined;
        },
    });

    if (maxRetry !== undefined) {
        config.presignedUrls = config.presignedUrls ?? {};
        config.presignedUrls.maxRetryCount = parseInt(maxRetry, 10);
    }

    const imageFormat = await vscode.window.showQuickPick(
        [
            { label: 'All', value: 'all' },
            { label: 'Markdown', value: 'markdown' },
            { label: 'HTML', value: 'html' },
        ],
        {
            placeHolder: 'Select image format for presigned URLs',
        }
    );

    if (imageFormat) {
        config.presignedUrls = config.presignedUrls ?? {};
        config.presignedUrls.imageFormat = imageFormat.value as 'markdown' | 'html' | 'all';
    }

    await saveCmtxConfig(workspaceFolder, config);
    vscode.window.showInformationMessage('Presigned URL settings saved');
}
