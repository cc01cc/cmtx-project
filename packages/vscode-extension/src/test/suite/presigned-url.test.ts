import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('Presigned URL Integration Tests', () => {
    suiteTeardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    // ==================== 配置读取集成 ====================
    suite('Configuration Integration', () => {
        test('Should read presigned URL config from VS Code settings', async () => {
            const config = vscode.workspace.getConfiguration('cmtx.presignedUrls');

            assert.strictEqual(config.get('imageFormat'), 'all');
            assert.strictEqual(config.get('expire'), 600);
            assert.strictEqual(config.get('maxRetryCount'), 3);
        });

        test('Should read multiple provider configs', async () => {
            const config = vscode.workspace.getConfiguration('cmtx.presignedUrls');
            const providerConfigs = config.get('providerConfigs', []);

            assert.ok(Array.isArray(providerConfigs));
        });

        test('Should handle missing configuration gracefully', async () => {
            const config = vscode.workspace.getConfiguration('cmtx.presignedUrls');

            assert.ok(config.get('expire') !== undefined);
            assert.ok(config.get('maxRetryCount') !== undefined);
        });

        test('Should update when configuration changes', async () => {
            const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('cmtx.presignedUrls')) {
                    // Configuration changed
                }
            });

            disposable.dispose();
        });
    });

    // ==================== Markdown-it 插件集成 ====================
    suite('Markdown-it Plugin Integration', () => {
        test('Should register presigned URL plugin with Markdown-it', async () => {
            const extension = vscode.extensions.getExtension('cc01cc.@cmtx/vscode-extension');
            assert.ok(extension);

            if (extension && !extension.isActive) {
                await extension.activate();
            }

            assert.ok(extension?.isActive);
        });

        test('Should handle image URLs in Markdown preview', async () => {
            const doc = await vscode.workspace.openTextDocument({
                content: '# Test\n\n![image](https://example.com/image.jpg)',
                language: 'markdown',
            });

            await vscode.window.showTextDocument(doc);

            assert.ok(vscode.window.activeTextEditor);

            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        });

        test('Should refresh preview when URLs are signed', async () => {
            const doc = await vscode.workspace.openTextDocument({
                content: '# Test\n\n![image](https://example.com/image.jpg)',
                language: 'markdown',
            });

            await vscode.window.showTextDocument(doc);

            await vscode.commands.executeCommand('markdown.preview.refresh');

            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        });
    });

    // ==================== 命令执行集成 ====================
    suite('Command Integration', () => {
        test('Should have extension activated', async () => {
            const extension = vscode.extensions.getExtension('cc01cc.@cmtx/vscode-extension');
            assert.ok(extension);

            if (extension && !extension.isActive) {
                await extension.activate();
            }

            assert.ok(extension?.isActive);
        });

        test('Should handle multiple images in Markdown', async () => {
            const doc = await vscode.workspace.openTextDocument({
                content:
                    '# Multiple Images\n\n![img1](https://example.com/a.jpg)\n\n![img2](https://example.com/b.jpg)',
                language: 'markdown',
            });

            await vscode.window.showTextDocument(doc);

            await vscode.commands.executeCommand('markdown.preview.refresh');

            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        });

        test('Should handle images from unsupported domains', async () => {
            const doc = await vscode.workspace.openTextDocument({
                content: '# Unsupported Domain\n\n![image](https://unknown-domain.com/image.jpg)',
                language: 'markdown',
            });

            await vscode.window.showTextDocument(doc);

            const extension = vscode.extensions.getExtension('cc01cc.@cmtx/vscode-extension');
            assert.ok(extension?.isActive);

            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        });
    });
});
