import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertHeadingToFrontmatter, upsertFrontmatterFields } from '@cmtx/core';
import { IdGenerator, MarkdownMetadataExtractor } from '@cmtx/publish';
import { renderTemplate } from '@cmtx/template';
import glob from 'fast-glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.resolve(__dirname, '.temp');

async function runNormalizationExample() {
    console.log('[INFO] Starting Multi-Package Normalization Example...');

    // Step 0: Run preprocessor to populate .temp directory
    console.log('[INFO] Step 0: Prepopulating .temp directory...');
    try {
        execSync('node examples/scripts/preprocess.js', { cwd: '/workspace', stdio: 'inherit' });
        console.log('[OK] Preprocessor completed.');
    } catch (error) {
        console.error('[WARN] Preprocessor failed, continuing with existing .temp:', error);
    }

    const idGen = new IdGenerator();
    const metadataExtractor = new MarkdownMetadataExtractor();
    const idList: string[] = [];

    // 1. Find all markdown files in the temp directory
    const files = await glob('**/*.md', { cwd: tempDir, absolute: true });
    console.log(`[INFO] Found ${files.length} files to process.`);

    const processingResults = [];

    for (const filePath of files) {
        try {
            const fileName = path.basename(filePath);
            console.log(`[PROCESS] ${fileName}`);

            // A. Read original content
            const originalContent = await fs.readFile(filePath, 'utf-8');

            // B. Convert # heading to Frontmatter (using fixed @cmtx/core utility)
            // This now removes the heading from the body and skips if FM already exists.
            const content = convertHeadingToFrontmatter(originalContent);

            // C. Extract metadata (to get ctime) using @cmtx/publish
            const fileMetadata = await metadataExtractor.extractFromFile(filePath);
            const ctimeStr =
                fileMetadata.ctime instanceof Date
                    ? fileMetadata.ctime.toISOString()
                    : new Date().toISOString();

            // D. Generate UUID using @cmtx/publish
            const uuid = idGen.generate('uuid');
            idList.push(uuid);

            // E. Add ID and CTime to Frontmatter using @cmtx/core
            const updateResult = upsertFrontmatterFields(content, {
                id: uuid,
                ctime: ctimeStr,
            });

            if (updateResult.success) {
                // F. Write back to file
                await fs.writeFile(filePath, updateResult.markdown, 'utf-8');

                processingResults.push({
                    file: fileName,
                    id: uuid,
                    status: 'OK',
                });
            } else {
                processingResults.push({
                    file: fileName,
                    status: 'FAILED',
                    reason: 'Frontmatter update failed',
                });
            }
        } catch (error: any) {
            console.error(`[ERROR] Failed to process ${filePath}:`, error.message);
        }
    }

    // G. Generate a summary using @cmtx/template
    const reportTemplate = `
Processing Summary:
-------------------
Total Files: {count}
Processed IDs:
{ids_list}
`;
    const report = renderTemplate(reportTemplate, {
        count: processingResults.length,
        ids_list: idList.map((id) => `- ${id}`).join('\n'),
    });

    console.log(report);

    // 2. Return the whole ID list (final requirement)
    console.log('\n[FINAL_ID_LIST]');
    console.log(JSON.stringify(idList, null, 2));

    return idList;
}

runNormalizationExample().catch((err) => {
    console.error('[FATAL]', err);
    process.exit(1);
});
