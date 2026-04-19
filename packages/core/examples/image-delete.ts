/**
 * 示例: 图片删除功能综合演示
 * 运行: pnpm exec tsx examples/image-delete.ts
 *
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteLocalImage, deleteLocalImageSafely } from '../src';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    await import('./scripts/gen-demo-data.js').then((mod) => mod.main());

    const demoDir = resolve(__dirname, 'demo-data');
    const trashDir = resolve(demoDir, '.trash');

    // * Scene 1: Safe delete unused image
    console.log('=== 场景 1: 安全删除未被引用的图片 ===');
    const unusedImagePath = resolve(demoDir, 'images/unused.png');
    const safeResult1 = await deleteLocalImageSafely(unusedImagePath, demoDir, {
        strategy: 'trash',
        trashDir,
    });

    console.log(JSON.stringify(safeResult1, null, 2));

    // * Scene 2: Safe delete referenced image
    console.log('\n=== 场景 2: 安全删除被引用的图片 ===');
    const logoPath = resolve(demoDir, 'images/logo.png');
    const safeResult2 = await deleteLocalImageSafely(logoPath, demoDir, {
        strategy: 'trash',
        trashDir,
    });
    // Should indicate that the image is still referenced and not delete it
    console.log(JSON.stringify(safeResult2, null, 2));

    // * Scene 3: Direct delete (trash 策略)
    console.log('\n=== 场景 3: 直接删除 (trash 策略) ===');
    const test1Path = resolve(demoDir, 'images/to-be-deleted-1.png');
    const directResult1 = await deleteLocalImage(test1Path, {
        strategy: 'trash',
        trashDir,
        maxRetries: 3,
    });

    console.log(JSON.stringify(directResult1, null, 2));

    // * Scene 4: Direct delete (move 策略)
    console.log('\n=== 场景 4: 直接删除 (move 策略) ===');
    const test2Path = resolve(demoDir, 'images/to-be-deleted-2.png');
    const directResult2 = await deleteLocalImage(test2Path, {
        strategy: 'move',
        trashDir,
        maxRetries: 3,
    });

    console.log(JSON.stringify(directResult2, null, 2));

    console.log('\n删除测试完成！');
}

main();
