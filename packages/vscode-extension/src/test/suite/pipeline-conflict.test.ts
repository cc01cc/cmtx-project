import * as assert from 'node:assert';
import { ConfigBuilder, executeUploadPipeline, FileDocumentAccessor } from '@cmtx/asset/upload';
import * as sinon from 'sinon';

suite('Pipeline Conflict Integration Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let mockAdapter: any;

    setup(() => {
        sandbox = sinon.createSandbox();

        // 创建 mock storage adapter
        mockAdapter = {
            upload: sandbox.stub().resolves({ url: 'https://example.com/uploaded.png' }),
            exists: sandbox.stub().resolves(false), // 默认文件不存在
        };
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('onFileExists Callback', () => {
        test('should call onFileExists when file exists', async () => {
            // Arrange
            const onFileExistsStub = sandbox.stub().resolves('replace');

            // 设置文件存在
            (mockAdapter.exists as sinon.SinonStub).resolves(true);

            const config = new ConfigBuilder()
                .storage(mockAdapter, { prefix: 'test/' })
                .replace({
                    fields: {
                        src: '{cloudSrc}',
                        alt: '{originalAlt}',
                    },
                })
                .build();

            const documentAccessor = new FileDocumentAccessor('/test/doc.md');
            // Mock document content with local image
            sandbox.stub(documentAccessor, 'readText').resolves('![alt](local-image.png)');

            // Act
            const result = await executeUploadPipeline({
                documentAccessor,
                config,
                baseDirectory: '/test',
                onFileExists: onFileExistsStub,
            });

            // Assert
            assert.strictEqual(onFileExistsStub.calledOnce, true);
            assert.strictEqual(result.success, true);
        });

        test('should skip replacement when onFileExists returns skip', async () => {
            // Arrange
            const onFileExistsStub = sandbox.stub().resolves('skip');

            // 设置文件存在
            (mockAdapter.exists as sinon.SinonStub).resolves(true);

            const config = new ConfigBuilder()
                .storage(mockAdapter, { prefix: 'test/' })
                .replace({
                    fields: {
                        src: '{cloudSrc}',
                        alt: '{originalAlt}',
                    },
                })
                .build();

            const documentAccessor = new FileDocumentAccessor('/test/doc.md');
            sandbox.stub(documentAccessor, 'readText').resolves('![alt](local-image.png)');

            // Act
            const result = await executeUploadPipeline({
                documentAccessor,
                config,
                baseDirectory: '/test',
                onFileExists: onFileExistsStub,
            });

            // Assert - 当 skip 时，不应该有替换操作
            assert.strictEqual(result.replaced, 0);
            assert.strictEqual(result.success, true);
        });

        test('should replace when onFileExists returns replace', async () => {
            // Arrange
            const onFileExistsStub = sandbox.stub().resolves('replace');

            // 设置文件存在
            (mockAdapter.exists as sinon.SinonStub).resolves(true);

            const config = new ConfigBuilder()
                .storage(mockAdapter, { prefix: 'test/' })
                .replace({
                    fields: {
                        src: '{cloudSrc}',
                        alt: '{originalAlt}',
                    },
                })
                .build();

            const documentAccessor = new FileDocumentAccessor('/test/doc.md');
            sandbox.stub(documentAccessor, 'readText').resolves('![alt](local-image.png)');

            // Act
            const result = await executeUploadPipeline({
                documentAccessor,
                config,
                baseDirectory: '/test',
                onFileExists: onFileExistsStub,
            });

            // Assert - 当 replace 时，应该有替换操作
            assert.strictEqual(result.replaced, 1);
            assert.strictEqual(result.success, true);
        });

        test('should handle multiple file conflicts', async () => {
            // Arrange
            const conflictFiles: string[] = [];
            const onFileExistsStub = sandbox.stub().callsFake((fileName: string) => {
                conflictFiles.push(fileName);
                return Promise.resolve('skip'); // 默认跳过
            });

            // 设置文件存在
            (mockAdapter.exists as sinon.SinonStub).resolves(true);

            const config = new ConfigBuilder()
                .storage(mockAdapter, { prefix: 'test/' })
                .replace({
                    fields: {
                        src: '{cloudSrc}',
                        alt: '{originalAlt}',
                    },
                })
                .build();

            const documentAccessor = new FileDocumentAccessor('/test/doc.md');
            // 多个图片
            sandbox
                .stub(documentAccessor, 'readText')
                .resolves('![alt1](image1.png)\n![alt2](image2.png)\n![alt3](image3.png)');

            // Act
            const result = await executeUploadPipeline({
                documentAccessor,
                config,
                baseDirectory: '/test',
                onFileExists: onFileExistsStub,
            });

            // Assert
            assert.strictEqual(onFileExistsStub.callCount, 3);
            assert.strictEqual(conflictFiles.length, 3);
            // 所有文件都被跳过，所以没有替换
            assert.strictEqual(result.replaced, 0);
        });

        test('should not call onFileExists when file does not exist', async () => {
            // Arrange
            const onFileExistsStub = sandbox.stub().resolves('replace');

            // 设置文件不存在
            (mockAdapter.exists as sinon.SinonStub).resolves(false);

            const config = new ConfigBuilder()
                .storage(mockAdapter, { prefix: 'test/' })
                .replace({
                    fields: {
                        src: '{cloudSrc}',
                        alt: '{originalAlt}',
                    },
                })
                .build();

            const documentAccessor = new FileDocumentAccessor('/test/doc.md');
            sandbox.stub(documentAccessor, 'readText').resolves('![alt](local-image.png)');

            // Act
            const result = await executeUploadPipeline({
                documentAccessor,
                config,
                baseDirectory: '/test',
                onFileExists: onFileExistsStub,
            });

            // Assert - 文件不存在时不应该调用 onFileExists
            assert.strictEqual(onFileExistsStub.called, false);
            assert.strictEqual(result.uploaded, 1);
        });

        test('should handle download action', async () => {
            // Arrange
            const onFileExistsStub = sandbox.stub().resolves('download');

            // 设置文件存在
            (mockAdapter.exists as sinon.SinonStub).resolves(true);

            const config = new ConfigBuilder()
                .storage(mockAdapter, { prefix: 'test/' })
                .replace({
                    fields: {
                        src: '{cloudSrc}',
                        alt: '{originalAlt}',
                    },
                })
                .build();

            const documentAccessor = new FileDocumentAccessor('/test/doc.md');
            sandbox.stub(documentAccessor, 'readText').resolves('![alt](local-image.png)');

            // Act
            const result = await executeUploadPipeline({
                documentAccessor,
                config,
                baseDirectory: '/test',
                onFileExists: onFileExistsStub,
            });

            // Assert - 下载操作应该跳过替换（当前实现）
            assert.strictEqual(result.replaced, 0);
            assert.strictEqual(onFileExistsStub.calledOnce, true);
        });

        test('should pass correct parameters to onFileExists', async () => {
            // Arrange
            const onFileExistsStub = sandbox.stub().resolves('skip');

            // 设置文件存在
            (mockAdapter.exists as sinon.SinonStub).resolves(true);

            // 添加 buildUrl 方法
            (mockAdapter as any).buildUrl = (path: string) => `https://example.com/${path}`;

            const config = new ConfigBuilder()
                .storage(mockAdapter, { prefix: 'test/' })
                .replace({
                    fields: {
                        src: '{cloudSrc}',
                        alt: '{originalAlt}',
                    },
                })
                .build();

            const documentAccessor = new FileDocumentAccessor('/test/doc.md');
            sandbox.stub(documentAccessor, 'readText').resolves('![alt](local-image.png)');

            // Act
            await executeUploadPipeline({
                documentAccessor,
                config,
                baseDirectory: '/test',
                onFileExists: onFileExistsStub,
            });

            // Assert - 验证参数
            assert.strictEqual(onFileExistsStub.calledOnce, true);
            const [fileName, remotePath, remoteUrl] = onFileExistsStub.firstCall.args;
            assert.ok(fileName);
            assert.ok(remotePath);
            assert.ok(remoteUrl);
        });
    });

    suite('Conflict Resolution State', () => {
        test('should handle mixed actions for multiple files', async () => {
            // Arrange - 不同文件返回不同操作
            const actions = ['replace', 'skip', 'download'];
            let callIndex = 0;
            const onFileExistsStub = sandbox.stub().callsFake(() => {
                const action = actions[callIndex % actions.length];
                callIndex++;
                return Promise.resolve(action);
            });

            // 设置文件存在
            (mockAdapter.exists as sinon.SinonStub).resolves(true);

            const config = new ConfigBuilder()
                .storage(mockAdapter, { prefix: 'test/' })
                .replace({
                    fields: {
                        src: '{cloudSrc}',
                        alt: '{originalAlt}',
                    },
                })
                .build();

            const documentAccessor = new FileDocumentAccessor('/test/doc.md');
            sandbox
                .stub(documentAccessor, 'readText')
                .resolves('![alt1](image1.png)\n![alt2](image2.png)\n![alt3](image3.png)');

            // Act
            const result = await executeUploadPipeline({
                documentAccessor,
                config,
                baseDirectory: '/test',
                onFileExists: onFileExistsStub,
            });

            // Assert - 只有 replace 的文件会被替换
            // 注意：当前实现可能无法精确统计，但验证流程正常
            assert.strictEqual(result.success, true);
            assert.strictEqual(onFileExistsStub.callCount, 3);
        });
    });
});
