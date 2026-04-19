/**
 * 示例: 从目录中批量筛选图片
 * 运行: pnpm exec tsx examples/image-find-all.ts
 *
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterImagesFromDirectory } from '../src';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    await import('./scripts/gen-demo-data.js').then((mod) => mod.main());

    const docsDir = resolve(__dirname, 'demo-data/docs');

    // 筛选所有本地图片
    const localImages = await filterImagesFromDirectory(docsDir, {
        mode: 'sourceType',
        value: 'local',
    });

    console.log(`找到 ${localImages.length} 个本地图片`);

    // 筛选所有 Web 图片
    const webImages = await filterImagesFromDirectory(docsDir, {
        mode: 'sourceType',
        value: 'web',
    });

    console.log(`找到 ${webImages.length} 个 Web 图片`);

    console.log(
        JSON.stringify(
            {
                localImages,
                webImages,
            },
            null,
            2
        )
    );
}

main();
