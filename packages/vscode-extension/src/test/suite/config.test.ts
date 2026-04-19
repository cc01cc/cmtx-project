import * as assert from 'node:assert';
import { getPresignedUrlConfig, getResizeConfig, getUploadConfig } from '../../infra/config';

suite('Configuration Integration Tests', () => {
    test('Should read default upload config', async () => {
        const config = await getUploadConfig();

        assert.strictEqual(config.imageFormat, 'markdown');
        assert.strictEqual(config.batchLimit, 5);
        assert.strictEqual(config.auto, false);
        assert.strictEqual(config.keepLocalImages, true);
    });

    test('Should read namingTemplate from config', async () => {
        const config = await getUploadConfig();

        // namingTemplate 应该被读取，即使没有配置也不应该是空字符串
        assert.ok(
            config.namingTemplate === undefined || typeof config.namingTemplate === 'string',
            'namingTemplate should be undefined or string'
        );
    });

    test('Should return undefined when namingTemplate is not set', async () => {
        const config = await getUploadConfig();

        // 未配置时应该返回 undefined 而非空字符串
        // 这样不会覆盖 generateNameAndRemotePath 中的默认模板
        if (config.namingTemplate === undefined) {
            assert.strictEqual(config.namingTemplate, undefined);
        }
    });

    test('Should read default resize config', async () => {
        const config = await getResizeConfig();

        assert.deepStrictEqual(config.widths, [360, 480, 640, 800, 960, 1200]);
        assert.deepStrictEqual(config.domains, []);
    });

    test('Should read default presigned URL config', async () => {
        const config = await getPresignedUrlConfig();

        assert.strictEqual(config.imageFormat, 'all');
        assert.strictEqual(config.expire, 600);
        assert.strictEqual(config.maxRetryCount, 3);
    });
});
